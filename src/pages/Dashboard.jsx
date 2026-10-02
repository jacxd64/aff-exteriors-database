// Dashboard — answers "what needs attention today?" with stat cards and
// prioritized work lists. Everything links into filtered job views.
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useJobs } from '../hooks/useJobs';
import { DASHBOARD_BUCKETS } from '../utils/constants';
import { nextActionUrgency } from '../utils/jobHelpers';
import { SectionCard } from '../components/ui/Card';
import JobCard from '../components/jobs/JobCard';
import EmptyState from '../components/ui/EmptyState';
import { LoadingBlock } from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import GlobalSearch from '../components/layout/GlobalSearch';
import DemoDataControl from '../components/DemoDataControl';

const URGENCY_RANK = { overdue: 0, today: 1, soon: 2, later: 3 };

function inBucket(jobs, bucket) {
  const keys = DASHBOARD_BUCKETS[bucket] || [];
  return jobs.filter((j) => keys.includes(j.status));
}

function byUrgency(a, b) {
  const ra = URGENCY_RANK[nextActionUrgency(a)] ?? 4;
  const rb = URGENCY_RANK[nextActionUrgency(b)] ?? 4;
  if (ra !== rb) return ra - rb;
  const da = a.nextAction?.dueDate || '';
  const db = b.nextAction?.dueDate || '';
  return da < db ? -1 : da > db ? 1 : 0;
}

function StatCard({ icon, count, label, accent, to }) {
  return (
    <Link to={to} className={`stat-card accent-${accent}`}>
      <span className="stat-icon"><Icon name={icon} size={20} /></span>
      <span className="stat-count">{count}</span>
      <span className="stat-label">{label}</span>
    </Link>
  );
}

function Widget({ title, icon, jobs, viewAllTo, emptyMsg, limit = 4 }) {
  return (
    <SectionCard
      title={<><Icon name={icon} size={18} /> {title} <span className="count-pill">{jobs.length}</span></>}
      actions={jobs.length > 0 && <Link className="text-sm fw-600" to={viewAllTo}>View all</Link>}
    >
      {jobs.length === 0 ? (
        <p className="muted text-sm center" style={{ padding: 'var(--space-4) 0' }}>{emptyMsg}</p>
      ) : (
        <div className="stack stack-3">
          {jobs.slice(0, limit).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default function Dashboard() {
  const { jobs, loading } = useJobs();

  const buckets = useMemo(() => {
    const followUp = inBucket(jobs, 'followUp').sort(byUrgency);
    const insurance = inBucket(jobs, 'insurance').sort(byUrgency);
    const materials = inBucket(jobs, 'materials');
    const readyToSchedule = inBucket(jobs, 'readyToSchedule');
    const scheduled = inBucket(jobs, 'scheduled');
    const completed = inBucket(jobs, 'completed');
    const attentionToday = followUp.filter((j) => ['overdue', 'today'].includes(nextActionUrgency(j))).length;
    return { followUp, insurance, materials, readyToSchedule, scheduled, completed, attentionToday };
  }, [jobs]);

  if (loading) return <LoadingBlock label="Loading your jobs…" />;

  const subtitle = jobs.length === 0
    ? 'No jobs yet — add your first lead to get started.'
    : buckets.attentionToday > 0
      ? `${buckets.attentionToday} ${buckets.attentionToday === 1 ? 'item needs' : 'items need'} attention today`
      : 'You’re all caught up on time-sensitive items.';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <Button variant="primary" icon="plus" to="/jobs/new" className="hide-mobile">Add New Job</Button>
      </div>

      <div className="dashboard-search">
        <GlobalSearch />
      </div>

      <DemoDataControl jobs={jobs} />

      {jobs.length === 0 ? (
        <EmptyState
          icon="jobs"
          title="No jobs yet"
          message="Create a job file for your first lead. You can add photos, measurements, and details from the field or the office."
          action={<Button variant="primary" icon="plus" to="/jobs/new">Add New Job</Button>}
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon="inbox" count={buckets.followUp.length} label="Needs follow-up" accent="warning" to="/jobs?bucket=followUp" />
            <StatCard icon="shield" count={buckets.insurance.length} label="Insurance action" accent="info" to="/jobs?bucket=insurance" />
            <StatCard icon="package" count={buckets.materials.length} label="On materials" accent="info" to="/jobs?bucket=materials" />
            <StatCard icon="schedule" count={buckets.readyToSchedule.length} label="Ready to schedule" accent="success" to="/jobs?bucket=readyToSchedule" />
            <StatCard icon="clock" count={buckets.scheduled.length} label="Scheduled / active" accent="purple" to="/jobs?bucket=scheduled" />
            <StatCard icon="check-circle" count={buckets.completed.length} label="Recently completed" accent="neutral" to="/jobs?bucket=completed" />
          </div>

          <div className="dashboard-grid">
            <Widget title="Needs follow-up" icon="inbox" jobs={buckets.followUp}
              viewAllTo="/jobs?bucket=followUp" emptyMsg="Nothing waiting on follow-up." />
            <Widget title="Insurance — needs action" icon="shield" jobs={buckets.insurance}
              viewAllTo="/jobs?bucket=insurance" emptyMsg="No insurance jobs need action." />
            <Widget title="Ready to schedule" icon="schedule" jobs={buckets.readyToSchedule}
              viewAllTo="/jobs?bucket=readyToSchedule" emptyMsg="No jobs ready to schedule." />
            <Widget title="Recent jobs" icon="jobs" jobs={jobs}
              viewAllTo="/jobs" emptyMsg="No jobs yet." />
          </div>
        </>
      )}
    </div>
  );
}
