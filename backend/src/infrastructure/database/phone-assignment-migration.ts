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

    const duplicateGroups = [...normalizedGroups.entries()].filter(([, records]) => records.length > 1);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      totalAssignments: assignments.length,
      duplicatePhoneGroups: duplicateGroups.map(([phone, records]) => ({ phone, ids: records.map((record) => String(record._id)), statuses: records.map((record) => record.status) })),
      safeRepairs: safeRepairs.map((repair) => ({ ...repair, id: String(repair.id) })),
      manualReview: manualReview.map((record) => ({ ...record, id: String(record.id) })),
    }, null, 2));

    if (!apply) return;
    if (duplicateGroups.length) throw new Error('Migration stopped: duplicate normalized phone numbers require manual review. No records were changed.');
    if (manualReview.length) throw new Error('Migration stopped: ambiguous phone-assignment records require manual review. No records were changed.');

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
