// ===========================================================================
// Role-based capabilities. Simple matrix now; easy to expand later. Admin can
// do everything. View-only can do nothing but read.
// ===========================================================================

// Capability keys used around the app.
export const CAP = {
  JOB_CREATE: 'job:create',
  JOB_EDIT: 'job:edit',
  JOB_DELETE: 'job:delete',
  NOTE_ADD: 'note:add',
  PHOTO_ADD: 'photo:add',
  MEASUREMENT_ADD: 'measurement:add',
  MATERIAL_EDIT: 'material:edit',
  SCHEDULE_EDIT: 'schedule:edit',
  INSTALLER_EDIT: 'installer:edit',
  DOCUMENT_ADD: 'document:add',
};

const MATRIX = {
  admin: 'ALL',
  office: [CAP.JOB_CREATE, CAP.JOB_EDIT, CAP.SCHEDULE_EDIT, CAP.DOCUMENT_ADD, CAP.NOTE_ADD, CAP.MATERIAL_EDIT, CAP.INSTALLER_EDIT],
  sales: [CAP.JOB_CREATE, CAP.JOB_EDIT, CAP.PHOTO_ADD, CAP.MEASUREMENT_ADD, CAP.NOTE_ADD],
  pm: [CAP.MATERIAL_EDIT, CAP.SCHEDULE_EDIT, CAP.NOTE_ADD, CAP.PHOTO_ADD, CAP.JOB_EDIT],
  viewer: [],
};

export function can(role, capability) {
  if (!role) return false;
  const allowed = MATRIX[role];
  if (allowed === 'ALL') return true;
  if (!allowed) return false;
  return allowed.includes(capability);
}
