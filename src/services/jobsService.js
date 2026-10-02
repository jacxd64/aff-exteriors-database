// ===========================================================================
// Jobs domain service. All job reads/writes go through here. Handles search
// keyword maintenance, timestamps, and timeline/notes subcollections so the
// UI and hooks stay thin.
// ===========================================================================
import { db } from './db';
import { buildKeywords, emptyJob } from '../utils/jobHelpers';
import { statusLabel } from '../utils/constants';

const COLLECTION = 'jobs';
const timelinePath = (jobId) => `${COLLECTION}/${jobId}/timeline`;
const notesPath = (jobId) => `${COLLECTION}/${jobId}/notes`;

function nowIso() {
  return new Date().toISOString();
}

// Merge a patch over the current job just enough to recompute search keywords.
function mergeForKeywords(current, patch) {
  return {
    ...current,
    ...patch,
    customer: { ...current.customer, ...(patch.customer || {}) },
    address: { ...current.address, ...(patch.address || {}) },
    insurance: { ...current.insurance, ...(patch.insurance || {}) },
  };
}

const jobsService = {
  // Live list of all jobs (newest-updated first). Returns an unsubscribe fn.
  subscribeJobs(cb, options = {}) {
    return db.subscribe(COLLECTION, { orderBy: ['updatedAt', 'desc'], ...options }, cb);
  },

  async listJobs(options = {}) {
    return db.list(COLLECTION, { orderBy: ['updatedAt', 'desc'], ...options });
  },

  async getJob(id) {
    return db.get(COLLECTION, id);
  },

  subscribeJob(id, cb) {
    // No single-doc subscribe in the adapter surface; watch the collection and pick.
    return db.subscribe(COLLECTION, {}, (jobs) => cb(jobs.find((j) => j.id === id) || null));
  },

  async createJob(input, user) {
    const base = emptyJob();
    const job = {
      ...base,
      ...input,
      customer: { ...base.customer, ...(input.customer || {}) },
      address: { ...base.address, ...(input.address || {}) },
      leadSource: { ...base.leadSource, ...(input.leadSource || {}) },
      nextAction: { ...base.nextAction, ...(input.nextAction || {}) },
      appointments: { ...base.appointments, ...(input.appointments || {}) },
      insurance: { ...base.insurance, ...(input.insurance || {}) },
      contract: { ...base.contract, ...(input.contract || {}) },
      materials: { ...base.materials, ...(input.materials || {}) },
    };
    job.poNumber = (job.poNumber || job.customer.lastName || '').trim();
    job.keywords = buildKeywords(job);
    job.createdAt = nowIso();
    job.updatedAt = nowIso();
    job.createdBy = user?.displayName || 'Unknown';

    const id = await db.add(COLLECTION, job);
    await this.addTimeline(id, {
      type: 'created',
      text: 'Job file created.',
      user: user?.displayName || 'Unknown',
    });
    return id;
  },

  // Apply a partial update. `log` (optional) records a timeline entry.
  async updateJob(id, patch, { user, log } = {}) {
    const current = await db.get(COLLECTION, id);
    const merged = current ? mergeForKeywords(current, patch) : patch;
    const fullPatch = { ...patch, keywords: buildKeywords(merged), updatedAt: nowIso() };
    await db.update(COLLECTION, id, fullPatch);
    if (log) {
      await this.addTimeline(id, { type: 'update', text: log, user: user?.displayName || 'Unknown' });
    }
    return id;
  },

  // Status change with an automatic timeline entry.
  async changeStatus(id, newStatus, { user, oldStatus } = {}) {
    await db.update(COLLECTION, id, { status: newStatus, updatedAt: nowIso() });
    const fromTo = oldStatus
      ? `Status changed: ${statusLabel(oldStatus)} → ${statusLabel(newStatus)}`
      : `Status set to ${statusLabel(newStatus)}`;
    await this.addTimeline(id, { type: 'status', text: fromTo, user: user?.displayName || 'Unknown' });
  },

  async deleteJob(id) {
    await db.remove(COLLECTION, id);
  },

  // --- Timeline ------------------------------------------------------------
  subscribeTimeline(jobId, cb) {
    return db.subscribe(timelinePath(jobId), { orderBy: ['at', 'desc'] }, cb);
  },
  async addTimeline(jobId, entry) {
    return db.add(timelinePath(jobId), { at: nowIso(), ...entry });
  },

  // --- Notes ---------------------------------------------------------------
  subscribeNotes(jobId, cb) {
    return db.subscribe(notesPath(jobId), { orderBy: ['at', 'desc'] }, cb);
  },
  async addNote(jobId, { text, category = 'general', user }) {
    const id = await db.add(notesPath(jobId), {
      text,
      category,
      user: user?.displayName || 'Unknown',
      at: nowIso(),
    });
    await db.update(COLLECTION, jobId, { updatedAt: nowIso() });
    await this.addTimeline(jobId, { type: 'note', text: 'Note added.', user: user?.displayName || 'Unknown' });
    return id;
  },
  async deleteNote(jobId, noteId) {
    await db.remove(notesPath(jobId), noteId);
  },
};

export default jobsService;
