// StatusBadge — a colored pill for a job/material/install status key.
import { statusLabel, statusBadge } from '../../utils/constants';

export function Badge({ variant = 'neutral', children, className = '' }) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>;
}

// Convenience wrapper that resolves a job status key to its label + color.
export default function StatusBadge({ status }) {
  if (!status) return null;
  return <Badge variant={statusBadge(status)}>{statusLabel(status)}</Badge>;
}
