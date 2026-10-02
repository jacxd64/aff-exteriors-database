// JobCard — the standard job summary card used in lists and dashboard widgets.
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import StatusBadge from '../ui/Badge';
import { TradePills } from '../ui/Tag';
import Icon from '../ui/Icon';
import { fullName, formatAddress, formatDate, relativeTime } from '../../utils/format';
import { nextActionUrgency } from '../../utils/jobHelpers';
import { JOB_TYPE_MAP, PRIORITY_MAP } from '../../utils/constants';

const URGENCY_CLASS = { overdue: 'due-overdue', today: 'due-today', soon: 'due-soon' };

export function NextAction({ job, compact = false }) {
  const action = job.nextAction?.text;
  if (!action) return null;
  const urgency = nextActionUrgency(job);
  return (
    <div className={`next-action ${URGENCY_CLASS[urgency] || ''}`}>
      <Icon name="clock" size={15} />
      <span className="truncate">{action}</span>
      {job.nextAction?.dueDate && !compact && (
        <span className="next-action-due">{formatDate(job.nextAction.dueDate)}</span>
      )}
    </div>
  );
}

export default function JobCard({ job, onClick }) {
  const navigate = useNavigate();
  const go = onClick || (() => navigate(`/jobs/${job.id}`));
  const priority = PRIORITY_MAP[job.priority];
  const showPriority = job.priority === 'urgent' || job.priority === 'high';

  return (
    <Card interactive className="job-card" onClick={go}>
      <div className="job-card-top">
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="row gap-2">
            <span className="fw-700 truncate">{fullName(job.customer)}</span>
            {job.poNumber && <span className="text-xs subtle">#{job.poNumber}</span>}
          </div>
          <div className="job-card-address">
            <Icon name="map-pin" size={14} />
            <span className="truncate">{formatAddress(job.address) || 'No address'}</span>
          </div>
        </div>
        <StatusBadge status={job.status} />
      </div>

      <div className="row row-wrap gap-2 job-card-meta">
        <span className={`tag ${job.jobType === 'insurance' ? 'tag-insurance' : ''}`}>
          {JOB_TYPE_MAP[job.jobType]?.label || 'Retail'}
        </span>
        <TradePills trades={job.trades} max={3} />
        {showPriority && <span className={`tag ${priority?.tagClass || ''}`}>{priority?.label}</span>}
      </div>

      <NextAction job={job} />

      <div className="job-card-foot">
        <span className="text-xs subtle">Updated {relativeTime(job.updatedAt)}</span>
        {job.assignedTo && <span className="text-xs subtle">· {job.assignedTo}</span>}
      </div>
    </Card>
  );
}
