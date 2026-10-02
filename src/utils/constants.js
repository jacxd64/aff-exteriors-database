// ===========================================================================
// Domain vocabulary for the whole app. Statuses, trades, priorities, etc.
// Stored values are the stable `key` strings; labels are for display only.
// ===========================================================================

// --- Job types -------------------------------------------------------------
export const JOB_TYPES = [
  { key: 'retail', label: 'Retail' },
  { key: 'insurance', label: 'Insurance' },
];

// --- Trades ----------------------------------------------------------------
export const TRADES = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'soffit-fascia', label: 'Soffit / Fascia' },
  { key: 'patio-cover', label: 'Patio Cover' },
  { key: 'garage-door', label: 'Garage Door' },
  { key: 'chimney-chase', label: 'Chimney Chase' },
  { key: 'masonry', label: 'Masonry / Tuckpointing' },
  { key: 'painting', label: 'Painting' },
  { key: 'tree-trimming', label: 'Tree Trimming' },
  { key: 'other', label: 'Other' },
];

// --- Priorities ------------------------------------------------------------
export const PRIORITIES = [
  { key: 'urgent', label: 'Urgent', rank: 0, tagClass: 'tag-priority-urgent' },
  { key: 'high', label: 'High Priority', rank: 1, tagClass: 'tag-priority-high' },
  { key: 'normal', label: 'Normal', rank: 2, tagClass: '' },
  { key: 'low', label: 'Low Priority', rank: 3, tagClass: 'tag-priority-low' },
];

// --- Statuses --------------------------------------------------------------
// `badge` maps to a .badge-* class; `group` buckets the status for dashboards.
export const STATUSES = [
  { key: 'new-lead', label: 'New Lead', badge: 'info', group: 'lead' },
  { key: 'appointment-scheduled', label: 'Appointment Scheduled', badge: 'info', group: 'scheduled' },
  { key: 'estimate-needed', label: 'Estimate Needed', badge: 'warning', group: 'sales' },
  { key: 'proposal-sent', label: 'Proposal Sent', badge: 'info', group: 'sales' },
  { key: 'contract-signed', label: 'Contract Signed', badge: 'success', group: 'sales' },
  { key: 'waiting-customer', label: 'Waiting on Customer', badge: 'warning', group: 'waiting' },
  { key: 'waiting-insurance', label: 'Waiting on Insurance', badge: 'warning', group: 'insurance' },
  { key: 'waiting-adjuster', label: 'Waiting on Adjuster', badge: 'warning', group: 'insurance' },
  { key: 'scope-received', label: 'Scope Received', badge: 'info', group: 'insurance' },
  { key: 'supplement-needed', label: 'Supplement Needed', badge: 'warning', group: 'insurance' },
  { key: 'supplement-submitted', label: 'Supplement Submitted', badge: 'info', group: 'insurance' },
  { key: 'supplement-approved', label: 'Supplement Approved', badge: 'success', group: 'insurance' },
  { key: 'ready-for-materials', label: 'Ready for Materials', badge: 'info', group: 'materials' },
  { key: 'materials-ordered', label: 'Materials Ordered', badge: 'info', group: 'materials' },
  { key: 'materials-delivered', label: 'Materials Delivered', badge: 'success', group: 'schedule-ready' },
  { key: 'ready-to-schedule', label: 'Ready to Schedule', badge: 'info', group: 'schedule-ready' },
  { key: 'install-scheduled', label: 'Install Scheduled', badge: 'info', group: 'scheduled' },
  { key: 'in-progress', label: 'In Progress', badge: 'purple', group: 'active' },
  { key: 'work-complete', label: 'Work Complete', badge: 'success', group: 'completed' },
  { key: 'noc-sent', label: 'Notice of Completion Sent', badge: 'info', group: 'completed' },
  { key: 'waiting-final-payment', label: 'Waiting on Final Payment', badge: 'warning', group: 'payment' },
  { key: 'paid-closed', label: 'Paid / Closed', badge: 'neutral', group: 'closed' },
  { key: 'problem-blocked', label: 'Problem / Blocked', badge: 'danger', group: 'blocked' },
  { key: 'backlogged', label: 'Backlogged', badge: 'neutral', group: 'lead' },
];

// --- Suggested next action per status --------------------------------------
// When a job enters a status, the app proposes this as the next action (you can
// accept, edit, or skip). `dueInDays` seeds the due date relative to today.
// null = no suggestion (e.g. a closed job needs no next step).
export const STATUS_NEXT_ACTION = {
  'new-lead': { text: 'Call to schedule the estimate', dueInDays: 1 },
  'appointment-scheduled': { text: 'Confirm and attend the appointment', dueInDays: 1 },
  'estimate-needed': { text: 'Prepare and send the estimate', dueInDays: 2 },
  'proposal-sent': { text: 'Follow up on the proposal', dueInDays: 3 },
  'contract-signed': { text: 'Order materials / schedule measurements', dueInDays: 2 },
  'waiting-customer': { text: 'Follow up with the customer', dueInDays: 3 },
  'waiting-insurance': { text: 'Follow up with the insurance company', dueInDays: 3 },
  'waiting-adjuster': { text: 'Meet the adjuster at the property', dueInDays: 2 },
  'scope-received': { text: 'Review the scope and build the estimate', dueInDays: 2 },
  'supplement-needed': { text: 'Prepare and submit the supplement', dueInDays: 2 },
  'supplement-submitted': { text: 'Follow up on supplement approval', dueInDays: 4 },
  'supplement-approved': { text: 'Order materials', dueInDays: 2 },
  'ready-for-materials': { text: 'Build the material list and place the order', dueInDays: 1 },
  'materials-ordered': { text: 'Confirm the delivery date', dueInDays: 2 },
  'materials-delivered': { text: 'Schedule the install crew', dueInDays: 1 },
  'ready-to-schedule': { text: 'Schedule the install crew', dueInDays: 1 },
  'install-scheduled': { text: 'Confirm crew and materials for install day', dueInDays: 1 },
  'in-progress': { text: 'Check in with the crew on site', dueInDays: 1 },
  'work-complete': { text: 'Do the final walkthrough, then invoice', dueInDays: 2 },
  'noc-sent': { text: 'Follow up on final payment', dueInDays: 5 },
  'waiting-final-payment': { text: 'Collect the final payment', dueInDays: 5 },
  'paid-closed': null,
  'problem-blocked': { text: 'Resolve the blocker', dueInDays: 1 },
  'backlogged': { text: 'Revisit this lead', dueInDays: 14 },
};

// --- Lead sources ----------------------------------------------------------
export const LEAD_SOURCES = [
  { key: 'referral', label: 'Referral' },
  { key: 'previous-customer', label: 'Previous Customer' },
  { key: 'neighbor', label: 'Neighbor' },
  { key: 'google-reviews', label: 'Google / Reviews' },
  { key: 'cold-call', label: 'Cold Call' },
  { key: 'other', label: 'Other' },
];

// --- Preferred contact methods ---------------------------------------------
export const CONTACT_METHODS = [
  { key: 'phone', label: 'Phone Call' },
  { key: 'text', label: 'Text Message' },
  { key: 'email', label: 'Email' },
];

// --- Suppliers -------------------------------------------------------------
export const SUPPLIERS = [
  { key: 'abc', label: 'ABC Supply' },
  { key: 'home-depot', label: 'Home Depot' },
  { key: 'cardinal', label: 'Cardinal' },
  { key: 'other', label: 'Other' },
];

// --- Material statuses ------------------------------------------------------
export const MATERIAL_STATUSES = [
  { key: 'not-ready', label: 'Not Ready', badge: 'neutral' },
  { key: 'needs-list', label: 'Needs Material List', badge: 'warning' },
  { key: 'ready-to-order', label: 'Ready to Order', badge: 'info' },
  { key: 'ordered', label: 'Ordered', badge: 'info' },
  { key: 'delivered', label: 'Delivered', badge: 'success' },
  { key: 'missing-items', label: 'Missing Items', badge: 'danger' },
  { key: 'complete', label: 'Complete', badge: 'success' },
];

// --- Install statuses -------------------------------------------------------
export const INSTALL_STATUSES = [
  { key: 'not-ready', label: 'Not Ready to Schedule', badge: 'neutral' },
  { key: 'ready', label: 'Ready to Schedule', badge: 'info' },
  { key: 'scheduled', label: 'Scheduled', badge: 'info' },
  { key: 'in-progress', label: 'In Progress', badge: 'purple' },
  { key: 'complete', label: 'Complete', badge: 'success' },
  { key: 'return-trip', label: 'Needs Return Trip', badge: 'warning' },
  { key: 'blocked', label: 'Problem / Blocked', badge: 'danger' },
];

// --- Schedule event types ---------------------------------------------------
export const EVENT_TYPES = [
  { key: 'initial', label: 'Initial Appointment' },
  { key: 'adjuster', label: 'Adjuster Meeting' },
  { key: 'follow-up', label: 'Follow-up Appointment' },
  { key: 'delivery', label: 'Material Delivery' },
  { key: 'install', label: 'Install Date' },
  { key: 'inspection', label: 'Final Inspection' },
  { key: 'payment', label: 'Payment Follow-up' },
  { key: 'other', label: 'Other' },
];

// Calendar color per appointment/event type.
export const EVENT_TYPE_COLORS = {
  initial: '#2563eb',
  adjuster: '#d97706',
  'follow-up': '#0891b2',
  delivery: '#7c3aed',
  install: '#16a34a',
  inspection: '#4f46e5',
  payment: '#e11d48',
  other: '#64748b',
};

// --- Photo categories -------------------------------------------------------
export const PHOTO_CATEGORIES = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'soffit-fascia', label: 'Soffit / Fascia' },
  { key: 'patio-cover', label: 'Patio Cover' },
  { key: 'damage', label: 'Damage' },
  { key: 'insurance-evidence', label: 'Insurance Evidence' },
  { key: 'measurements', label: 'Measurements' },
  { key: 'completed-work', label: 'Completed Work' },
  { key: 'other', label: 'Other' },
];

// --- Document types ---------------------------------------------------------
export const DOCUMENT_TYPES = [
  { key: 'contract', label: 'Contract' },
  { key: 'scope', label: 'Insurance Scope' },
  { key: 'supplement', label: 'Supplement' },
  { key: 'material-order', label: 'Material Order' },
  { key: 'invoice', label: 'Invoice' },
  { key: 'noc', label: 'Notice of Completion' },
  { key: 'permit', label: 'Permit' },
  { key: 'work-order', label: 'Work Order' },
  { key: 'other', label: 'Other' },
];

// --- Measurement categories -------------------------------------------------
export const MEASUREMENT_CATEGORIES = [
  { key: 'roof', label: 'Roof' },
  { key: 'siding', label: 'Siding' },
  { key: 'gutters', label: 'Gutters' },
  { key: 'windows', label: 'Windows' },
  { key: 'soffit-fascia', label: 'Soffit / Fascia' },
  { key: 'patio-cover', label: 'Patio Cover' },
  { key: 'garage-door', label: 'Garage Door' },
  { key: 'chimney-chase', label: 'Chimney Chase' },
  { key: 'masonry', label: 'Masonry' },
  { key: 'other', label: 'Other' },
];

// --- User roles -------------------------------------------------------------
export const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'office', label: 'Office' },
  { key: 'sales', label: 'Sales / Field' },
  { key: 'pm', label: 'Project Manager' },
  { key: 'viewer', label: 'View Only' },
];

// --- Dashboard buckets: which statuses roll up into each dashboard widget ---
export const DASHBOARD_BUCKETS = {
  followUp: ['new-lead', 'estimate-needed', 'proposal-sent', 'waiting-customer', 'backlogged'],
  insurance: ['waiting-insurance', 'waiting-adjuster', 'scope-received', 'supplement-needed', 'supplement-submitted'],
  materials: ['ready-for-materials', 'materials-ordered'],
  readyToSchedule: ['materials-delivered', 'ready-to-schedule', 'supplement-approved'],
  scheduled: ['appointment-scheduled', 'install-scheduled', 'in-progress'],
  completed: ['work-complete', 'noc-sent', 'paid-closed'],
};

// ---------------------------------------------------------------------------
// Lookup helpers — turn stored keys into display labels / metadata safely.
// ---------------------------------------------------------------------------
const toMap = (arr) => arr.reduce((acc, item) => ((acc[item.key] = item), acc), {});

export const TRADE_MAP = toMap(TRADES);
export const STATUS_MAP = toMap(STATUSES);
export const PRIORITY_MAP = toMap(PRIORITIES);
export const JOB_TYPE_MAP = toMap(JOB_TYPES);
export const LEAD_SOURCE_MAP = toMap(LEAD_SOURCES);
export const CONTACT_METHOD_MAP = toMap(CONTACT_METHODS);
export const SUPPLIER_MAP = toMap(SUPPLIERS);
export const MATERIAL_STATUS_MAP = toMap(MATERIAL_STATUSES);
export const INSTALL_STATUS_MAP = toMap(INSTALL_STATUSES);
export const EVENT_TYPE_MAP = toMap(EVENT_TYPES);
export const PHOTO_CATEGORY_MAP = toMap(PHOTO_CATEGORIES);
export const DOCUMENT_TYPE_MAP = toMap(DOCUMENT_TYPES);
export const MEASUREMENT_CATEGORY_MAP = toMap(MEASUREMENT_CATEGORIES);
export const ROLE_MAP = toMap(ROLES);

export const labelFor = (map, key, fallback = '—') => (map[key] ? map[key].label : fallback);
export const tradeLabel = (key) => labelFor(TRADE_MAP, key);
export const statusLabel = (key) => labelFor(STATUS_MAP, key);
export const statusBadge = (key) => (STATUS_MAP[key] ? STATUS_MAP[key].badge : 'neutral');
export const priorityLabel = (key) => labelFor(PRIORITY_MAP, key, 'Normal');
