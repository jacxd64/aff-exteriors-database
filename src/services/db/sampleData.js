// ===========================================================================
// Shared sample/demo data. Used by the local-store auto-seed (seed.js) AND the
// optional, admin-triggered "Load sample data" action in Firebase mode
// (demoSeed.js). Every record is tagged `sampleData: true` and uses a stable id
// so it can be re-run without duplicating and cleanly removed later.
//
// Addresses are around St. Peters, MO (St. Charles County) — placeholder demo
// data only; replace with real jobs once you're live.
// ===========================================================================
import { emptyJob, buildKeywords } from '../../utils/jobHelpers';

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}
function daysAgo(n) {
  return daysFromNow(-n);
}
// Local "YYYY-MM-DDTHH:mm" for today + n days at h:m (for appointment start times).
function atDay(n, h, m = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(h)}:${pad(m)}`;
}

// Build a full job from a small partial, filling everything else with defaults.
function makeJob(partial) {
  const base = emptyJob();
  const job = {
    ...base,
    ...partial,
    customer: { ...base.customer, ...(partial.customer || {}) },
    address: { ...base.address, ...(partial.address || {}) },
    leadSource: { ...base.leadSource, ...(partial.leadSource || {}) },
    nextAction: { ...base.nextAction, ...(partial.nextAction || {}) },
    appointments: { ...base.appointments, ...(partial.appointments || {}) },
    insurance: { ...base.insurance, ...(partial.insurance || {}) },
    contract: { ...base.contract, ...(partial.contract || {}) },
    materials: { ...base.materials, ...(partial.materials || {}) },
    createdAt: partial.createdAt || daysAgo(10),
    updatedAt: partial.updatedAt || daysAgo(1),
    sampleData: true,
  };
  job.poNumber = job.poNumber || job.customer.lastName;
  job.keywords = buildKeywords(job);
  return job;
}

// Stable ids → re-running the seeder overwrites rather than duplicating.
export function buildSampleJobs() {
  return [
    makeJob({
      id: 'sample-gonzalez',
      customer: { firstName: 'Maria', lastName: 'Gonzalez', phone: '6365550142', email: 'maria.g@example.com', preferredContact: 'text' },
      address: { street: '4112 Mexico Rd', city: 'St. Peters', state: 'MO', zip: '63376' },
      jobType: 'insurance', status: 'waiting-adjuster', priority: 'high',
      trades: ['roof', 'gutters'], assignedTo: 'Dave',
      leadSource: { type: 'referral', referrerName: 'Tom Becker' },
      nextAction: { text: 'Meet adjuster at property', dueDate: daysFromNow(1) },
      appointments: { initial: daysAgo(6), adjuster: daysFromNow(1) },
      insurance: { company: 'State Farm', claimNumber: 'SF-884213', adjusterName: 'R. Klein', adjusterPhone: '6365557788', dateClaimOpened: daysAgo(8) },
      updatedAt: daysAgo(0),
    }),
    makeJob({
      id: 'sample-whitfield',
      customer: { firstName: 'James', lastName: 'Whitfield', phone: '6365550199', email: 'jwhit@example.com', preferredContact: 'phone' },
      address: { street: '215 Jungermann Rd', city: 'St. Peters', state: 'MO', zip: '63376' },
      jobType: 'retail', status: 'contract-signed', priority: 'normal',
      trades: ['siding', 'windows'], assignedTo: 'Dave',
      leadSource: { type: 'google-reviews' },
      nextAction: { text: 'Order materials from ABC', dueDate: daysFromNow(2) },
      contract: { signed: true, date: daysAgo(3), amount: 18400, downRequired: 6133, downReceived: true, downAmount: 6133, balanceRemaining: 12267 },
      updatedAt: daysAgo(1),
    }),
    makeJob({
      id: 'sample-osei',
      customer: { firstName: 'Linda', lastName: 'Osei', phone: '6365550110' },
      address: { street: '1290 Willott Rd', city: 'St. Peters', state: 'MO', zip: '63376' },
      jobType: 'retail', status: 'new-lead', priority: 'urgent',
      trades: ['gutters'], leadSource: { type: 'cold-call' },
      nextAction: { text: 'Call to schedule estimate', dueDate: daysAgo(1) },
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    }),
    makeJob({
      id: 'sample-pace',
      customer: { firstName: 'Robert', lastName: 'Pace', phone: '6365550173', email: 'rpace@example.com' },
      address: { street: '55 Bryan Rd', city: "O'Fallon", state: 'MO', zip: '63366' },
      jobType: 'insurance', status: 'supplement-submitted', priority: 'high',
      trades: ['roof', 'siding', 'soffit-fascia'], assignedTo: 'Dave',
      leadSource: { type: 'previous-customer' },
      nextAction: { text: 'Follow up on supplement approval', dueDate: daysFromNow(3) },
      insurance: { company: 'Allstate', claimNumber: 'AL-552901', adjusterName: 'P. Nunez', scopeReceived: true, initialAmount: 22150, supplementNeeded: true, supplementSubmitted: true, supplementNotes: 'Added drip edge + extra squares for steep pitch.' },
      updatedAt: daysAgo(2),
    }),
    makeJob({
      id: 'sample-reyes',
      customer: { firstName: 'Angela', lastName: 'Reyes', phone: '6365550188' },
      address: { street: '3401 Spencer Rd', city: 'St. Peters', state: 'MO', zip: '63376' },
      jobType: 'retail', status: 'ready-to-schedule', priority: 'normal',
      trades: ['windows'], assignedTo: 'Mike',
      leadSource: { type: 'neighbor' },
      nextAction: { text: 'Schedule install crew', dueDate: daysFromNow(0) },
      materials: { status: 'delivered', supplier: 'cardinal', deliveryDate: daysAgo(2), listComplete: true },
      contract: { signed: true, date: daysAgo(12), amount: 9600, downReceived: true, downAmount: 3200, balanceRemaining: 6400 },
      updatedAt: daysAgo(1),
    }),
    makeJob({
      id: 'sample-furst',
      customer: { firstName: 'Daniel', lastName: 'Furst', phone: '6365550155' },
      address: { street: '210 Heritage Crossing', city: 'Cottleville', state: 'MO', zip: '63304' },
      jobType: 'retail', status: 'in-progress', priority: 'normal',
      trades: ['roof'], assignedTo: 'Mike',
      nextAction: { text: 'Check in with crew on day 2', dueDate: daysFromNow(1) },
      leadSource: { type: 'referral', referrerName: 'Angela Reyes' },
      materials: { status: 'complete', supplier: 'abc' },
      contract: { signed: true, amount: 14250, downReceived: true, downAmount: 4750, balanceRemaining: 9500 },
      updatedAt: daysAgo(0),
    }),
    makeJob({
      id: 'sample-albright',
      customer: { firstName: 'Susan', lastName: 'Albright', phone: '6365550120', email: 'salbright@example.com' },
      address: { street: '9 Lake Saint Louis Blvd', city: 'Lake Saint Louis', state: 'MO', zip: '63367' },
      jobType: 'insurance', status: 'waiting-final-payment', priority: 'low',
      trades: ['roof', 'gutters', 'chimney-chase'], assignedTo: 'Dave',
      leadSource: { type: 'google-reviews' },
      nextAction: { text: 'Confirm recoverable depreciation received', dueDate: daysFromNow(7) },
      insurance: { company: 'Farmers', claimNumber: 'FM-330047', scopeReceived: true, initialAmount: 26800, supplementApproved: true, nocSent: true, recoverableDepreciation: 5360 },
      contract: { signed: true, amount: 32160, downReceived: true, balanceRemaining: 5360 },
      updatedAt: daysAgo(4),
    }),
    makeJob({
      id: 'sample-tran',
      customer: { firstName: 'Kevin', lastName: 'Tran', phone: '6365550161' },
      address: { street: '688 Feise Rd', city: 'Dardenne Prairie', state: 'MO', zip: '63368' },
      jobType: 'retail', status: 'paid-closed', priority: 'normal',
      trades: ['patio-cover'], assignedTo: 'Mike',
      leadSource: { type: 'other' },
      materials: { status: 'complete' },
      contract: { signed: true, amount: 7800, downReceived: true, finalReceived: true, balanceRemaining: 0 },
      createdAt: daysAgo(40), updatedAt: daysAgo(20),
    }),
  ];
}

export function buildSampleInstallers() {
  return [
    { id: 'sample-inst-gateway', name: 'Gateway Roofing Crew', phone: '6365552201', trades: ['roof', 'soffit-fascia'], active: true, notes: 'Preferred for steep pitches.', sampleData: true },
    { id: 'sample-inst-midwest', name: 'Midwest Siding & Windows', phone: '6365552240', trades: ['siding', 'windows'], active: true, notes: '', sampleData: true },
    { id: 'sample-inst-gutterpros', name: 'Gutter Pros STL', phone: '6365552288', trades: ['gutters', 'soffit-fascia'], active: true, notes: '', sampleData: true },
    { id: 'sample-inst-riverbend', name: 'Riverbend Masonry', phone: '6365552299', trades: ['masonry', 'chimney-chase'], active: false, notes: 'Seasonal availability.', sampleData: true },
  ];
}

export function buildSampleAppointments() {
  const mk = (o) => ({ title: '', durationMin: 60, notes: '', createdBy: 'System', sampleData: true, ...o });
  return [
    mk({ id: 'appt-osei-est', jobId: 'sample-osei', customerName: 'Linda Osei', type: 'initial', start: atDay(0, 16, 30), durationMin: 45, assignedTo: 'Dave', notes: 'Initial gutter estimate.' }),
    mk({ id: 'appt-gonzalez-adj', jobId: 'sample-gonzalez', customerName: 'Maria Gonzalez', type: 'adjuster', start: atDay(1, 9, 0), durationMin: 60, assignedTo: 'Dave', notes: 'Meet State Farm adjuster on site.' }),
    mk({ id: 'appt-furst-insp', jobId: 'sample-furst', customerName: 'Daniel Furst', type: 'inspection', start: atDay(1, 13, 0), durationMin: 60, assignedTo: 'Mike', notes: 'Final roof inspection.' }),
    mk({ id: 'appt-whitfield-fu', jobId: 'sample-whitfield', customerName: 'James Whitfield', type: 'follow-up', start: atDay(2, 14, 0), durationMin: 30, assignedTo: 'Dave', notes: 'Confirm material color choices.' }),
    mk({ id: 'appt-reyes-install', jobId: 'sample-reyes', customerName: 'Angela Reyes', type: 'install', start: atDay(3, 8, 0), durationMin: 240, assignedTo: 'Mike', notes: 'Window install crew.' }),
  ];
}
