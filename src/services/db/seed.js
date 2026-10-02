// ===========================================================================
// Local-store demo seed. Populates the browser store once (guarded by a flag)
// so the app is useful the moment it loads in local mode. Never touches a real
// Firebase backend. Sample records come from the shared sampleData module.
// ===========================================================================
import localAdapter from './localAdapter';
import { buildSampleJobs, buildSampleInstallers, buildSampleAppointments } from './sampleData';

const SEED_FLAG = 'affdb:seeded:v1';

export async function ensureSeeded() {
  if (localStorage.getItem(SEED_FLAG)) return;
  for (const job of buildSampleJobs()) {
    await localAdapter.set('jobs', job.id, job);
    await localAdapter.add(`jobs/${job.id}/timeline`, {
      type: 'created', user: 'System', text: 'Job file created.', at: job.createdAt,
    });
  }
  for (const inst of buildSampleInstallers()) {
    await localAdapter.set('installers', inst.id, inst);
  }
  for (const appt of buildSampleAppointments()) {
    await localAdapter.set('appointments', appt.id, appt);
  }
  localStorage.setItem(SEED_FLAG, '1');
}
