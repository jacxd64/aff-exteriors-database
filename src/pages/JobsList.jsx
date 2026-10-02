// Jobs List — the searchable job database. Cards on mobile, optional table on
// desktop. Filters and search are reflected in the URL so links are shareable.
import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { jobMatchesQuery, nextActionUrgency } from '../utils/jobHelpers';
import {
  TRADES, STATUSES, JOB_TYPES, DASHBOARD_BUCKETS, PRIORITY_MAP, JOB_TYPE_MAP,
} from '../utils/constants';
import { fullName, formatAddress, formatDate, relativeTime } from '../utils/format';
import JobCard, { NextAction } from '../components/jobs/JobCard';
import StatusBadge from '../components/ui/Badge';
import { TradePills } from '../components/ui/Tag';
import { Select } from '../components/ui/Field';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { LoadingBlock } from '../components/ui/Spinner';
import GlobalSearch from '../components/layout/GlobalSearch';

const BUCKET_LABELS = {
  followUp: 'Needs follow-up',
  insurance: 'Insurance — needs action',
  materials: 'Waiting on materials',
  readyToSchedule: 'Ready to schedule',
  scheduled: 'Scheduled / active',
  completed: 'Recently completed',
};

const URGENCY_RANK = { overdue: 0, today: 1, soon: 2, later: 3 };

const SORTERS = {
  updated: (a, b) => (String(a.updatedAt) < String(b.updatedAt) ? 1 : -1),
  priority: (a, b) => (PRIORITY_MAP[a.priority]?.rank ?? 2) - (PRIORITY_MAP[b.priority]?.rank ?? 2),
  name: (a, b) => fullName(a.customer).localeCompare(fullName(b.customer)),
  nextAction: (a, b) => {
    const ra = URGENCY_RANK[nextActionUrgency(a)] ?? 5;
    const rb = URGENCY_RANK[nextActionUrgency(b)] ?? 5;
    return ra - rb;
  },
};

function JobsTable({ jobs }) {
  const navigate = useNavigate();
  return (
    <div className="card table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Customer</th><th>PO #</th><th>Address</th><th>Type</th>
            <th>Trades</th><th>Status</th><th>Next action</th><th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job.id} onClick={() => navigate(`/jobs/${job.id}`)}>
              <td className="fw-600">{fullName(job.customer)}</td>
              <td className="subtle">{job.poNumber || '—'}</td>
              <td className="truncate" style={{ maxWidth: 220 }}>{formatAddress(job.address) || '—'}</td>
              <td>{JOB_TYPE_MAP[job.jobType]?.label || 'Retail'}</td>
              <td><TradePills trades={job.trades} max={2} /></td>
              <td><StatusBadge status={job.status} /></td>
              <td style={{ maxWidth: 200 }}>{job.nextAction?.text ? <NextAction job={job} compact /> : <span className="subtle">—</span>}</td>
              <td className="subtle text-sm">{relativeTime(job.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function JobsList() {
  const { jobs, loading } = useJobs();
  const isDesktop = useIsDesktop();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState('table');

  const q = params.get('q') || '';
  const bucket = params.get('bucket') || '';
  const status = params.get('status') || '';
  const trade = params.get('trade') || '';
  const jobType = params.get('jobType') || '';
  const sort = params.get('sort') || 'updated';

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams({}, { replace: true });
  const hasFilters = q || bucket || status || trade || jobType;

  const filtered = useMemo(() => {
    let result = jobs;
    if (q) result = result.filter((j) => jobMatchesQuery(j, q));
    if (bucket) {
      const keys = DASHBOARD_BUCKETS[bucket] || [];
      result = result.filter((j) => keys.includes(j.status));
    }
    if (status) result = result.filter((j) => j.status === status);
    if (trade) result = result.filter((j) => j.trades?.includes(trade));
    if (jobType) result = result.filter((j) => j.jobType === jobType);
    return [...result].sort(SORTERS[sort] || SORTERS.updated);
  }, [jobs, q, bucket, status, trade, jobType, sort]);

  if (loading) return <LoadingBlock label="Loading jobs…" />;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Jobs</h1>
          <p className="page-subtitle">{filtered.length} of {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}</p>
        </div>
        <Button variant="primary" icon="plus" to="/jobs/new" className="hide-mobile">Add New Job</Button>
      </div>

      <div className="filter-bar">
        <GlobalSearch placeholder="Search name, address, phone, PO #, claim #…" />
        <div className="filter-row">
          <Select value={jobType} onChange={(e) => setFilter('jobType', e.target.value)}
            placeholder="All types" options={JOB_TYPES} aria-label="Filter by job type" />
          <Select value={trade} onChange={(e) => setFilter('trade', e.target.value)}
            placeholder="All trades" options={TRADES} aria-label="Filter by trade" />
          <Select value={status} onChange={(e) => setFilter('status', e.target.value)}
            placeholder="All statuses" options={STATUSES} aria-label="Filter by status" />
          <Select value={sort} onChange={(e) => setFilter('sort', e.target.value)} aria-label="Sort by"
            options={[
              { key: 'updated', label: 'Recently updated' },
              { key: 'priority', label: 'Priority' },
              { key: 'name', label: 'Customer name' },
              { key: 'nextAction', label: 'Next action date' },
            ]} />
          {isDesktop && (
            <div className="view-toggle" role="group" aria-label="View">
              <button type="button" className={view === 'table' ? 'active' : ''} onClick={() => setView('table')} aria-label="Table view"><Icon name="list" size={18} /></button>
              <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-label="Card view"><Icon name="grid" size={18} /></button>
            </div>
          )}
        </div>

        {(bucket || hasFilters) && (
          <div className="row row-wrap gap-2">
            {bucket && <span className="chip chip-active">{BUCKET_LABELS[bucket] || bucket}</span>}
            <button type="button" className="chip" onClick={clearAll}>
              <Icon name="close" size={14} /> Clear filters
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching jobs"
          message={hasFilters ? 'Try adjusting or clearing your filters.' : 'Add your first job to get started.'}
          action={hasFilters
            ? <Button variant="secondary" onClick={clearAll}>Clear filters</Button>
            : <Button variant="primary" icon="plus" to="/jobs/new">Add New Job</Button>}
        />
      ) : isDesktop && view === 'table' ? (
        <JobsTable jobs={filtered} />
      ) : (
        <div className="job-grid">
          {filtered.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </div>
  );
}
