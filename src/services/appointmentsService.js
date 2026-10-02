// ===========================================================================
// Appointments — a top-level collection so the calendar can read them all in
// one subscription. Each appointment optionally links to a job (jobId) and
// denormalizes the customer name for quick calendar display. `start` is a local
// "YYYY-MM-DDTHH:mm" string (same format as <input type=datetime-local>).
// ===========================================================================
import { db } from './db';
import { EVENT_TYPE_MAP } from '../utils/constants';
import { formatDateTime } from '../utils/format';

const COLLECTION = 'appointments';
const timelinePath = (jobId) => `jobs/${jobId}/timeline`;
const nowIso = () => new Date().toISOString();

async function bumpJob(jobId) {
  if (!jobId) return;
  try { await db.update('jobs', jobId, { updatedAt: nowIso() }); } catch { /* non-fatal */ }
}
async function logJob(jobId, text, user) {
  if (!jobId) return;
  try {
    await db.add(timelinePath(jobId), { at: nowIso(), type: 'schedule', text, user: user?.displayName || 'Unknown' });
  } catch { /* non-fatal */ }
}

const appointmentsService = {
  subscribeAll(cb) {
    return db.subscribe(COLLECTION, { orderBy: ['start', 'asc'] }, cb);
  },
  // All appointments for one job (filtered client-side to avoid composite indexes).
  subscribeByJob(jobId, cb) {
    return db.subscribe(COLLECTION, { orderBy: ['start', 'asc'] }, (list) => cb(list.filter((a) => a.jobId === jobId)));
  },

  async add(input, user) {
    const appt = {
      jobId: input.jobId || '',
      customerName: input.customerName || '',
      type: input.type || 'other',
      title: (input.title || '').trim(),
      start: input.start,
      durationMin: Number(input.durationMin) || 60,
      assignedTo: input.assignedTo || '',
      notes: input.notes || '',
      createdBy: user?.displayName || 'Unknown',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    const id = await db.add(COLLECTION, appt);
    const label = EVENT_TYPE_MAP[appt.type]?.label || 'Appointment';
    await logJob(appt.jobId, `Appointment scheduled: ${label} — ${formatDateTime(appt.start)}`, user);
    await bumpJob(appt.jobId);
    return id;
  },

  async update(id, patch, { user, jobId } = {}) {
    await db.update(COLLECTION, id, { ...patch, updatedAt: nowIso() });
    if (jobId && (patch.start || patch.type)) {
      const label = EVENT_TYPE_MAP[patch.type]?.label || 'Appointment';
      await logJob(jobId, `Appointment updated: ${label}${patch.start ? ` — ${formatDateTime(patch.start)}` : ''}`, user);
    }
    await bumpJob(jobId);
    return id;
  },

  async remove(id, { jobId, user } = {}) {
    await db.remove(COLLECTION, id);
    await logJob(jobId, 'Appointment removed', user);
    await bumpJob(jobId);
  },
};

export default appointmentsService;
