// ===========================================================================
// Lightweight form validation. Returns an { field: message } errors object;
// empty object means valid.
// ===========================================================================

export function validateNewJob(job) {
  const errors = {};
  if (!job.customer?.firstName?.trim()) errors.firstName = 'First name is required';
  if (!job.customer?.lastName?.trim()) errors.lastName = 'Last name is required';

  const phoneDigits = String(job.customer?.phone || '').replace(/\D/g, '');
  if (!phoneDigits) errors.phone = 'Phone is required';
  else if (phoneDigits.length < 10) errors.phone = 'Enter a valid phone number';

  if (!job.address?.street?.trim()) errors.street = 'Street address is required';
  if (!job.jobType) errors.jobType = 'Choose a job type';
  if (!job.trades?.length) errors.trades = 'Select at least one trade';
  if (!job.leadSource?.type) errors.leadSource = 'Select a lead source';

  if (job.customer?.email && !isValidEmail(job.customer.email))
    errors.email = 'Enter a valid email';

  return errors;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}
