import { closeDatabaseConnection, Collections, connectDatabase, getDatabase } from './index.js';
import { ObjectId } from 'mongodb';

function normalizePhoneNumber(phone?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits || null;
}

function idVariants(id: unknown): unknown[] {
  if (!id) return [];
  return [String(id), id];
}

async function companyCandidatesForAssignment(assignmentId: unknown): Promise<Set<string>> {
  const database = getDatabase();
  const variants = idVariants(assignmentId);
  const candidates = new Set<string>();
  const [profiles, calls] = await Promise.all([
    database.collection(Collections.NUMBER_PROFILES).find({ phone_assignment_id: { $in: variants } }, { projection: { company_id: 1 } }).toArray(),
    database.collection(Collections.CALL_LOGS).find({ phone_assignment_id: { $in: variants } }, { projection: { company_id: 1 } }).toArray(),
  ]);
  for (const record of [...profiles, ...calls]) {
    if (record.company_id !== undefined && record.company_id !== null && String(record.company_id)) candidates.add(String(record.company_id));
  }
  const existingCompanies = new Set<string>();
  for (const candidate of candidates) {
    if (ObjectId.isValid(candidate) && await database.collection(Collections.COMPANIES).findOne({ _id: new ObjectId(candidate), deleted_at: null }, { projection: { _id: 1 } })) {
      existingCompanies.add(candidate);
    }
  }
  return existingCompanies;
}

type AssignmentRecord = Record<string, any>;

async function referencesForAssignment(assignmentId: unknown) {
  const database = getDatabase();
  const variants = idVariants(assignmentId);
  const [profiles, calls] = await Promise.all([
    database.collection(Collections.NUMBER_PROFILES)
      .find({ phone_assignment_id: { $in: variants } }, { projection: { _id: 1, company_id: 1 } })
      .toArray(),
    database.collection(Collections.CALL_LOGS)
      .find({ phone_assignment_id: { $in: variants } }, { projection: { _id: 1, company_id: 1 } })
      .toArray(),
  ]);
  return {
    numberProfiles: profiles,
    callLogs: calls,
    companyIds: [...new Set([...profiles, ...calls]
      .map((record) => record.company_id)
      .filter((companyId) => companyId !== undefined && companyId !== null)
      .map(String))],
  };
}

function recordDate(record: AssignmentRecord): number {
  return new Date(record.assigned_at || record.updated_at || record.created_at || 0).getTime();
}

function publicAssignment(record: AssignmentRecord, references?: { numberProfiles: AssignmentRecord[]; callLogs: AssignmentRecord[]; companyIds: string[] }) {
  return {
    id: String(record._id),
    status: record.status || null,
    company_id: record.company_id ?? null,
    phone_number: record.phone_number || null,
    normalized_phone_number: record.normalized_phone_number || null,
    twilio_sid: record.twilio_sid || null,
    assigned_at: record.assigned_at || null,
    released_at: record.released_at || null,
    created_at: record.created_at || null,
    updated_at: record.updated_at || null,
    references: references ? {
      number_profiles: references.numberProfiles.length,
      call_logs: references.callLogs.length,
      company_ids: references.companyIds,
    } : undefined,
  };
}

async function main() {
  const apply = process.argv.includes('--apply');
  await connectDatabase();
  try {
    const database = getDatabase();
    const collection = database.collection(Collections.PHONE_ASSIGNMENTS);
    const assignments = await collection.find({}).toArray();
    const normalizedGroups = new Map<string, typeof assignments>();
    const safeRepairs: Array<{ id: unknown; companyId?: string; normalized: string }> = [];
    const manualReview: Array<{ id: unknown; phoneNumber?: string; status?: string; candidates: string[]; reason: string }> = [];

    for (const assignment of assignments) {
      const normalized = normalizePhoneNumber(assignment.phone_number || assignment.normalized_phone_number);
      if (!normalized) {
        manualReview.push({ id: assignment._id, phoneNumber: assignment.phone_number, status: assignment.status, candidates: [], reason: 'No usable phone number' });
        continue;
      }
      const group = normalizedGroups.get(normalized) || [];
      group.push(assignment);
      normalizedGroups.set(normalized, group);

      const missingCompany = assignment.company_id === undefined || assignment.company_id === null || assignment.company_id === '';
      if (!missingCompany) {
        if (assignment.normalized_phone_number !== normalized) safeRepairs.push({ id: assignment._id, normalized });
        continue;
      }

      const candidates = assignment.status === 'assigned' ? [...await companyCandidatesForAssignment(assignment._id)] : [];
      if (assignment.status === 'assigned' && candidates.length === 1) {
        safeRepairs.push({ id: assignment._id, companyId: candidates[0], normalized });
      } else if (assignment.status === 'available') {
        // Available inventory intentionally has no tenant. Never guess one.
        safeRepairs.push({ id: assignment._id, normalized });
      } else {
        manualReview.push({ id: assignment._id, phoneNumber: assignment.phone_number, status: assignment.status, candidates, reason: candidates.length ? 'Ambiguous company relationship' : 'No company relationship found' });
      }
    }

    const duplicateGroups = [] as Array<{
      phone: string;
      records: AssignmentRecord[];
      winner?: AssignmentRecord;
      losers: AssignmentRecord[];
      references: Map<string, Awaited<ReturnType<typeof referencesForAssignment>>>;
      reason?: string;
    }>;

    for (const [phone, records] of normalizedGroups) {
      if (records.length < 2) continue;

      const references = new Map<string, Awaited<ReturnType<typeof referencesForAssignment>>>();
      for (const record of records) references.set(String(record._id), await referencesForAssignment(record._id));

      const active = records.filter((record) => record.status === 'assigned' && record.company_id);
      let winner: AssignmentRecord | undefined;
      let reason: string | undefined;
      if (active.length === 1) {
        winner = active[0];
        reason = 'exactly one active assignment; other records are stale or released';
      } else if (active.length > 1) {
        reason = 'multiple active assignments cannot be resolved automatically';
      } else if (records.every((record) => !record.company_id && record.status !== 'assigned')) {
        winner = [...records].sort((a, b) => recordDate(b) - recordDate(a))[0];
        reason = 'no active assignment; retain the newest inventory/history row';
      } else {
        reason = 'no single current assignment can be identified';
      }

      const losers = winner ? records.filter((record) => record._id !== winner?._id) : [];
      if (winner) {
        const winnerCompany = winner.company_id ? String(winner.company_id) : null;
        const unsafeLoser = losers.find((loser) => {
          const refs = references.get(String(loser._id))!;
          const loserCompany = loser.company_id ? String(loser.company_id) : null;
          return refs.numberProfiles.length > 0 || refs.callLogs.length > 0
            ? !winnerCompany || refs.companyIds.some((companyId) => companyId !== winnerCompany)
            : Boolean(loserCompany && loserCompany !== winnerCompany);
        });
        if (unsafeLoser) {
          winner = undefined;
          reason = 'stale record has references that cannot be safely reassigned to the retained tenant';
        }
      }

      duplicateGroups.push({ phone, records, winner, losers: winner ? losers : [], references, reason });
    }

    const duplicateReport = duplicateGroups.map((group) => ({
      phone: group.phone,
      retained: group.winner ? publicAssignment(group.winner, group.references.get(String(group.winner._id))) : null,
      records: group.records.map((record) => publicAssignment(record, group.references.get(String(record._id)))),
      action: group.winner ? `merge references to ${String(group.winner._id)} and remove stale duplicate rows` : 'manual review required',
      reason: group.reason,
    }));

    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      totalAssignments: assignments.length,
      duplicatePhoneGroups: duplicateReport,
      safeRepairs: safeRepairs.map((repair) => ({ ...repair, id: String(repair.id) })),
      manualReview: manualReview.map((record) => ({ ...record, id: String(record.id) })),
    }, null, 2));

    if (!apply) return;
    if (duplicateGroups.some((group) => !group.winner)) throw new Error('Migration stopped: one or more duplicate phone numbers require manual review. No records were changed.');
    if (manualReview.length) throw new Error('Migration stopped: ambiguous phone-assignment records require manual review. No records were changed.');

    for (const group of duplicateGroups) {
      const winner = group.winner!;
      const winnerId = winner._id;
      for (const loser of group.losers) {
        const refs = group.references.get(String(loser._id))!;
        if (refs.numberProfiles.length || refs.callLogs.length) {
          await database.collection(Collections.NUMBER_PROFILES).updateMany(
            { phone_assignment_id: { $in: idVariants(loser._id) } },
            { $set: { phone_assignment_id: String(winnerId), company_id: winner.company_id, updated_at: new Date() } },
          );
          await database.collection(Collections.CALL_LOGS).updateMany(
            { phone_assignment_id: { $in: idVariants(loser._id) } },
            { $set: { phone_assignment_id: String(winnerId), company_id: winner.company_id, updated_at: new Date() } },
          );
        }
        await collection.deleteOne({ _id: loser._id });
      }
      await collection.updateOne(
        { _id: winnerId },
        { $set: { normalized_phone_number: group.phone, updated_at: new Date() } },
      );
    }

    for (const repair of safeRepairs) {
      const update: Record<string, unknown> = { normalized_phone_number: repair.normalized, updated_at: new Date() };
      if (repair.companyId) update.company_id = repair.companyId;
      await collection.updateOne({ _id: new ObjectId(String(repair.id)) }, { $set: update });
    }
    await collection.createIndex({ normalized_phone_number: 1 }, { name: 'normalized_phone_number_1_unique', unique: true });
    console.log(`Applied ${safeRepairs.length} safe repairs and created the global phone-number unique index.`);
  } finally {
    await closeDatabaseConnection();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
