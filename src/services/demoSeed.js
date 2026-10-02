// ===========================================================================
// Optional demo-data seeding for a LIVE backend (Firebase). Triggered by an
// admin from the UI (see DemoDataControl) so a new project can be explored with
// realistic example jobs, then wiped clean. Works through the active `db`
// adapter, so it respects security rules (the admin must be signed in).
// Every record is tagged sampleData:true for clean removal.
// ===========================================================================
import { db } from './db';
import jobsService from './jobsService';
import { buildSampleJobs, buildSampleInstallers, buildSampleAppointments } from './db/sampleData';

// Insert (or overwrite) the sample jobs + installers. Returns the job count.
export async function seedDemoData(user) {
  const jobs = buildSampleJobs();
  for (const job of jobs) {
    await db.set('jobs', job.id, job);
    await jobsService.addTimeline(job.id, {
      type: 'created',
      user: user?.displayName || 'System',
      text: 'Job file created (sample data).',
      at: job.createdAt,
    });
  }
  for (const inst of buildSampleInstallers()) {
    await db.set('installers', inst.id, inst);
  }
  for (const appt of buildSampleAppointments()) {
    await db.set('appointments', appt.id, appt);
  }
  return jobs.length;
}

// Remove every sampleData:true record, including job timeline/notes
// subcollections (Firestore does not cascade deletes). Returns jobs removed.
export async function removeDemoData() {
  const jobs = await db.list('jobs').catch(() => []);
  const samples = jobs.filter((j) => j.sampleData);
  for (const job of samples) {
    for (const path of [`jobs/${job.id}/timeline`, `jobs/${job.id}/notes`]) {
      const subs = await db.list(path).catch(() => []);
      for (const s of subs) await db.remove(path, s.id);
    }
    await db.remove('jobs', job.id);
  }
  const installers = await db.list('installers').catch(() => []);
  for (const inst of installers.filter((i) => i.sampleData)) {
    await db.remove('installers', inst.id);
  }
  const appts = await db.list('appointments').catch(() => []);
  for (const a of appts.filter((x) => x.sampleData)) {
    await db.remove('appointments', a.id);
  }
  return samples.length;
}
