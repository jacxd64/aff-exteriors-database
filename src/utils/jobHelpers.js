// ===========================================================================
// Job-shape helpers: build a new job, derive search keywords, bucket for the
// dashboard, and compute "next action" urgency.
// ===========================================================================
import { DASHBOARD_BUCKETS, STATUS_NEXT_ACTION } from './constants';
import { fullName, formatPhone, toDate } from './format';

// Generate a stable-ish unique id without external deps.
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// The canonical empty job. Every field the app reads has a defined default so
// the UI never crashes on missing data.
export function emptyJob() {
  return {
    poNumber: '',
    jobType: 'retail',
    status: 'new-lead',
    priority: 'normal',
    assignedTo: '',
    trades: [],
    tags: [],
    customer: {
      firstName: '', lastName: '', phone: '', email: '',
      preferredContact: 'phone', notes: '',
    },
    address: { street: '', city: '', state: '', zip: '' },
    leadSource: { type: '', referrerName: '' },
    nextAction: { text: '', dueDate: '' },
    appointments: { initial: '', adjuster: '', followUp: '', notes: '' },
    insurance: {
      company: '', claimNumber: '',
      adjusterName: '', adjusterPhone: '', adjusterEmail: '',
      dateClaimOpened: '', scopeReceived: false, initialAmount: '',
      supplementNeeded: false, supplementSubmitted: false, supplementApproved: false,
      supplementNotes: '', recoverableDepreciation: '', nocSent: false, finalPaymentStatus: '',
    },
    contract: {
      signed: false, date: '', amount: '',
      downRequired: '', downReceived: false, downAmount: '',
      balanceRemaining: '', finalReceived: false, notes: '',
    },
    materials: {
      listNeeded: false, listComplete: false, supplier: '', status: 'not-ready',
      orderDate: '', deliveryDate: '', deliveryAddress: '',
      notes: '', missingNotes: '', pickupNeeded: false, pickupResponsible: '',
    },
  };
}

// Lowercased keyword array used for search (name, phone, address, claim, PO).
export function buildKeywords(job) {
  const parts = [
    job.poNumber,
    job.customer?.firstName,
    job.customer?.lastName,
    fullName(job.customer),
    job.customer?.phone,
    formatPhone(job.customer?.phone),
    String(job.customer?.phone || '').replace(/\D/g, ''),
    job.customer?.email,
    job.address?.street,
    job.address?.city,
    job.address?.state,
    job.address?.zip,
    job.insurance?.claimNumber,
    job.insurance?.company,
    job.assignedTo,
  ];
  return parts
    .filter(Boolean)
    .map((p) => String(p).toLowerCase().trim())
    .filter((p) => p.length > 0);
}

// Does a job match a free-text search query?
export function jobMatchesQuery(job, query) {
  if (!query) return true;
  const q = query.toLowerCase().trim();
  if (!q) return true;
  const keywords = job.keywords && job.keywords.length ? job.keywords : buildKeywords(job);
  return keywords.some((k) => k.includes(q));
}

// Which dashboard bucket(s) a job's status falls into.
export function bucketOf(statusKey) {
  return Object.entries(DASHBOARD_BUCKETS)
    .filter(([, keys]) => keys.includes(statusKey))
    .map(([bucket]) => bucket);
}

export function isInBucket(job, bucket) {
  const keys = DASHBOARD_BUCKETS[bucket] || [];
  return keys.includes(job.status);
}

// Next-action urgency for sorting / visual emphasis.
// Returns: 'overdue' | 'today' | 'soon' | 'later' | null
export function nextActionUrgency(job) {
  const due = job.nextAction?.dueDate;
  if (!due) return null;
  const d = toDate(due);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target - today) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'later';
}

// A local "YYYY-MM-DD" string `days` from today (matches <input type="date">).
export function dateInDays(days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Suggested next action when a job enters `statusKey`, or null. The dueDate is
// a local YYYY-MM-DD string ready for an <input type="date">.
export function suggestedNextAction(statusKey) {
  const s = STATUS_NEXT_ACTION[statusKey];
  if (!s) return null;
  return { text: s.text, dueDate: dateInDays(s.dueInDays ?? 0) };
}

// Default PO number suggestion = customer last name.
export function suggestPoNumber(job) {
  return (job.customer?.lastName || '').trim();
}
