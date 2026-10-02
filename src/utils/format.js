// ===========================================================================
// Display formatters. All tolerate null/undefined and return safe fallbacks.
// ===========================================================================

export function fullName(customer) {
  if (!customer) return 'Unnamed';
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
  return name || 'Unnamed';
}

export function initials(customer) {
  if (!customer) return '?';
  const f = (customer.firstName || '').trim()[0] || '';
  const l = (customer.lastName || '').trim()[0] || '';
  return (f + l).toUpperCase() || '?';
}

export function formatPhone(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits[0] === '1')
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return raw;
}

export function formatAddress(address) {
  if (!address) return '';
  const line1 = address.street || '';
  const line2 = [address.city, address.state].filter(Boolean).join(', ');
  const line2full = [line2, address.zip].filter(Boolean).join(' ');
  return [line1, line2full].filter(Boolean).join(', ');
}

export function formatCurrency(value) {
  if (value === '' || value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// Accepts: Date, ISO string, ms number, or Firestore Timestamp ({seconds}).
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  // A bare "YYYY-MM-DD" (from <input type="date">) is parsed by the JS Date
  // constructor as UTC midnight, which displays a day early in timezones west
  // of UTC. Parse it as a LOCAL date instead so due dates land on the right day.
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, opts) {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value) {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

// "2h ago", "3d ago", "just now"
export function relativeTime(value) {
  const d = toDate(value);
  if (!d) return '';
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(d);
}

// For <input type="datetime-local"> value binding.
export function toInputDateTime(value) {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toInputDate(value) {
  const d = toDate(value);
  if (!d) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Human file size: "847 KB", "3.2 MB".
export function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return '';
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
