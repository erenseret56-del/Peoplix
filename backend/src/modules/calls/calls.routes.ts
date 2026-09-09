import { FastifyInstance } from 'fastify';
import { ObjectId } from 'mongodb';
import { getCollection, Collections } from '../../infrastructure/database/index.js';
import { authenticateJWT } from '../../middleware/auth.js';
import { resolveTenant, getTenantId } from '../../middleware/tenant.js';
import { NotFoundError } from '../../middleware/errorHandler.js';
import { retellClient } from '../retell/retell.client.js';
import { retellService } from '../retell/retell.service.js';

export async function callsRoutes(fastify: FastifyInstance) {
  const preHandler = [authenticateJWT, resolveTenant];

  /**
   * GET /api/calls
   * List call logs for the company
   */
  fastify.get('/', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as any;
    const page = Math.max(1, parseInt(q.page) || 1);
    const limit = Math.min(100, parseInt(q.limit) || 20);
    const skip = (page - 1) * limit;

    const filter: any = { company_id: tenantId };
    if (q.status) filter.call_status = q.status;
    if (q.call_type) filter.call_type = q.call_type;

    const col = getCollection(Collections.CALL_LOGS);
    const [data, total] = await Promise.all([
      col.find(filter).sort({ started_at: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
    ]);
    const transcriptRows = await getCollection(Collections.CALL_TRANSCRIPTS).find({
      call_log_id: { $in: data.map((call) => call._id.toString()) },
    }).project({ call_log_id: 1, transcript: 1 }).toArray();
    const transcripts = new Map(transcriptRows.map((row) => [row.call_log_id, row.transcript || null]));

    return reply.send({
      success: true,
      data: data.map(c => ({
        id: c._id.toString(),
        call_id: c.retell_call_id,
        retell_call_id: c.retell_call_id,
        agent_id: c.retell_agent_id,
        caller_phone: c.caller_phone,
        call_type: c.call_type,
        direction: c.call_type,
        call_status: c.call_status,
        started_at: c.started_at,
        start_timestamp: c.started_at,
        ended_at: c.ended_at,
        end_timestamp: c.ended_at,
        duration_seconds: c.duration_seconds,
        duration_ms: c.duration_seconds ? c.duration_seconds * 1000 : null,
        recording_url: c.recording_url || null,
        transcript: transcripts.get(c._id.toString()) || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.post('/sync-retell', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const assignments = await getCollection(Collections.PHONE_ASSIGNMENTS)
      .find({ company_id: tenantId, status: 'assigned' })
      .project({ phone_number: 1 })
      .toArray();
    const assignedNumbers = new Set(assignments.map((assignment) => assignment.phone_number));
    const summaries = await retellClient.listCalls();
    let synced = 0;

    for (const summary of summaries) {
      if (!summary.to_number || !assignedNumbers.has(summary.to_number)) continue;
      const call = await retellClient.getCall(summary.call_id);
      const recordingUrl = call.recording_url || call.recording_multi_channel_url || call.scrubbed_recording_url;
      await retellService.handleCallEnded({
        call_id: call.call_id,
        agent_id: call.agent_id,
        from_number: call.from_number,
        to_number: call.to_number,
        call_type: call.call_type,
        started_at: call.start_timestamp ? new Date(call.start_timestamp).toISOString() : undefined,
        ended_at: call.end_timestamp ? new Date(call.end_timestamp).toISOString() : undefined,
        duration_ms: call.duration_ms,
        transcript: call.transcript,
        recording_url: recordingUrl,
        call_analysis: call.call_analysis,
        metadata: call.metadata,
      });
      synced += 1;
    }

    return reply.send({ success: true, data: { synced, checked: summaries.length } });
  });

  /**
   * GET /api/calls/:id
   */
  fastify.get('/phone-assignments', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const assignments = await getCollection(Collections.PHONE_ASSIGNMENTS)
      .find({ company_id: tenantId })
      .sort({ assigned_at: -1 })
      .toArray();

    const enriched = await Promise.all(assignments.map(async (assignment) => {
      const totalCalls = await getCollection(Collections.CALL_LOGS).countDocuments({
        company_id: tenantId,
        phone_assignment_id: assignment._id.toString(),
      });

      const recentCall = await getCollection(Collections.CALL_LOGS)
        .findOne(
          { company_id: tenantId, phone_assignment_id: assignment._id.toString() },
          { sort: { started_at: -1 } }
        );

      return {
        id: assignment._id.toString(),
        phone_number: assignment.phone_number,
        normalized_phone_number: assignment.normalized_phone_number,
        twilio_sid: assignment.twilio_sid,
        status: assignment.status,
        assigned_at: assignment.assigned_at,
        total_calls: totalCalls,
        latest_call_at: recentCall?.started_at || null,
      };
    }));

    return reply.send({ success: true, data: enriched });
  });

  fastify.get('/:id', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const { id } = request.params as { id: string };

    const col = getCollection(Collections.CALL_LOGS);
    const doc = await col.findOne({ _id: new ObjectId(id), company_id: tenantId });
    if (!doc) throw new NotFoundError('Call log not found');

    // Get transcript if exists
    const transcript = await getCollection(Collections.CALL_TRANSCRIPTS).findOne(
      { call_log_id: doc._id.toString() },
      { projection: { _id: 0, transcript: 1, summary: 1, sentiment: 1 } }
    );

    return reply.send({
      success: true,
      data: {
        id: doc._id.toString(),
        retell_call_id: doc.retell_call_id,
        caller_phone: doc.caller_phone,
        call_type: doc.call_type,
        call_status: doc.call_status,
        started_at: doc.started_at,
        ended_at: doc.ended_at,
        duration_seconds: doc.duration_seconds,
        metadata: doc.metadata,
        transcript: transcript || null,
      },
    });
  });

  /**
   * GET /api/calls/stats/summary
   * Dashboard stats for calls
   */
  fastify.get('/stats/summary', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const col = getCollection(Collections.CALL_LOGS);
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setHours(0, 0, 0, 0);
    currentStart.setDate(currentStart.getDate() - 6);
    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
    const currentFilter = { company_id: tenantId, started_at: { $gte: currentStart } };
    const previousFilter = { company_id: tenantId, started_at: { $gte: previousStart, $lt: currentStart } };
    const allTimeFilter = { company_id: tenantId };
    const [total, completed, missed, durationRows, previousTotal, seriesRows] = await Promise.all([
      col.countDocuments({ company_id: tenantId }),
      col.countDocuments({ ...allTimeFilter, call_status: 'completed' }),
      col.countDocuments({ ...allTimeFilter, call_status: { $in: ['failed', 'missed'] } }),
      col.aggregate([{ $match: { ...allTimeFilter, call_status: 'completed' } }, { $group: { _id: null, total: { $sum: '$duration_seconds' } } }]).toArray(),
      col.countDocuments(previousFilter),
      col.aggregate([
        { $match: currentFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$started_at' } }, total: { $sum: 1 }, answered: { $sum: { $cond: [{ $eq: ['$call_status', 'completed'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
      ]).toArray(),
    ]);
    const totalWeek = seriesRows.reduce((sum, row) => sum + row.total, 0);
    const totalDuration = durationRows[0]?.total || 0;
    const avgDuration = completed > 0 ? Math.round(totalDuration / completed) : 0;
    const seriesByDate = new Map(seriesRows.map((row) => [row._id, row]));
    const series = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(currentStart);
      date.setDate(currentStart.getDate() + index);
      const dateKey = date.toISOString().slice(0, 10);
      const row = seriesByDate.get(dateKey);
      return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), date: dateKey, total: row?.total || 0, answered: row?.answered || 0 };
    });
    const peak = series.reduce((best, item) => item.total > best.total ? item : best, series[0]);
    const trend = previousTotal === 0 ? (totalWeek > 0 ? 100 : 0) : Math.round(((totalWeek - previousTotal) / previousTotal) * 100);

    return reply.send({
      success: true,
      data: {
        kpis: {
          total_calls: { value: total, trend },
          answered_calls: { value: completed, trend: 0 },
          missed_calls: { value: missed, trend: 0 },
          avg_call_duration_seconds: { value: avgDuration, trend: 0 },
          total_talk_time_minutes: { value: Math.round(totalDuration / 60), trend: 0 },
          conversions: { value: 0, trend: 0 },
        },
        chart: {
          trend_percentage: trend,
          total_week: totalWeek,
          daily_average: Number((totalWeek / 7).toFixed(1)),
          peak_day: peak?.total ? peak.day : '--',
          series,
        },
      },
    });
  });

  fastify.get('/stats/agents', { preHandler }, async (request, reply) => {
    const tenantId = getTenantId(request);
    const rows = await getCollection(Collections.CALL_LOGS).aggregate([
      { $match: { company_id: tenantId } },
      { $group: { _id: '$retell_agent_id', total_calls: { $sum: 1 }, successful_calls: { $sum: { $cond: [{ $eq: ['$call_status', 'completed'] }, 1, 0] } } } },
      { $sort: { total_calls: -1 } },
      { $limit: 10 },
    ]).toArray();
    const agentIds = rows.map((row) => row._id).filter(Boolean);
    const objectIds = agentIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
    const agents = await getCollection(Collections.RETELL_AGENTS).find({ $or: [{ _id: { $in: objectIds } }, { retell_agent_id: { $in: agentIds } }] }).toArray();
    const names = new Map(agents.flatMap((agent) => [[agent._id!.toString(), agent.name || agent.retell_agent_id], [agent.retell_agent_id, agent.name || agent.retell_agent_id]]));
    return reply.send({ success: true, data: rows.filter((row) => row._id).map((row) => ({ agent_id: row._id, name: names.get(row._id) || row._id, total_calls: row.total_calls, success_rate: Math.round((row.successful_calls / row.total_calls) * 100), trend: row.successful_calls > 0 ? 'up' : 'down' })) });
  });
}
