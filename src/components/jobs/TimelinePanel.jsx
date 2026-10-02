// TimelinePanel — read-only activity log for a job (newest first).
import { useTimeline } from '../../hooks/useJobDetail';
import Icon from '../ui/Icon';
import { LoadingBlock } from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { formatDateTime } from '../../utils/format';

const TYPE_ICON = {
  created: 'plus',
  update: 'edit',
  status: 'check-circle',
  note: 'file',
  photo: 'camera',
  document: 'file',
  material: 'package',
  schedule: 'schedule',
};

export default function TimelinePanel({ jobId }) {
  const { entries, loading } = useTimeline(jobId);

  if (loading) return <LoadingBlock label="Loading activity…" />;
  if (!entries.length) {
    return <EmptyState icon="clock" title="No activity yet" message="Edits, status changes, and notes will appear here." />;
  }

  return (
    <ul className="timeline">
      {entries.map((e) => (
        <li key={e.id} className="timeline-item">
          <span className="timeline-dot"><Icon name={TYPE_ICON[e.type] || 'clock'} size={14} /></span>
          <div className="timeline-body">
            <p className="timeline-text">{e.text}</p>
            <p className="timeline-meta subtle text-xs">{e.user} · {formatDateTime(e.at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
