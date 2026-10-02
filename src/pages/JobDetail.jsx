// Job Detail — the full job file. Header with status control + quick field
// actions, then tabbed sections (Overview / Insurance / Money / Materials /
// Notes / Files / Activity). Each section edits inline via jobsService.
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJob } from '../hooks/useJobs';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import jobsService from '../services/jobsService';
import { CAP } from '../utils/permissions';
import { STATUSES, JOB_TYPE_MAP, statusLabel } from '../utils/constants';
import { fullName, formatAddress, formatDate, toInputDate } from '../utils/format';
import { suggestedNextAction } from '../utils/jobHelpers';
import { LoadingBlock } from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import { Select } from '../components/ui/Field';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  CustomerSection, BasicsSection, LeadNextSection,
  InsuranceSection, ContractSection, MaterialsSection,
} from '../components/jobs/JobSections';
import JobAppointments from '../components/jobs/JobAppointments';
import NotesPanel from '../components/jobs/NotesPanel';
import TimelinePanel from '../components/jobs/TimelinePanel';
import NextActionDialog from '../components/jobs/NextActionDialog';
import FilesTab from '../components/jobs/FilesTab';

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const toast = useToast();
  const { job, loading } = useJob(id);

  const [tab, setTab] = useState('overview');
  const [changingStatus, setChangingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [naDialog, setNaDialog] = useState(null);
  const [naSaving, setNaSaving] = useState(false);

  if (loading) return <LoadingBlock label="Loading job…" />;
  if (!job) {
    return (
      <div className="page page-narrow">
        <EmptyState icon="alert" title="Job not found"
          message="This job may have been deleted."
          action={<Button variant="primary" to="/jobs">Back to jobs</Button>} />
      </div>
    );
  }

  const canEdit = can(CAP.JOB_EDIT);
  const canDelete = can(CAP.JOB_DELETE);
  const isInsurance = job.jobType === 'insurance';

  const handleSave = async (patch, log) => {
    try {
      await jobsService.updateJob(job.id, patch, { user, log });
      toast.success('Saved.');
      return true;
    } catch (err) {
      toast.error(err?.message || 'Could not save changes.');
      return false;
    }
  };

  const onStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === job.status) return;
    setChangingStatus(true);
    try {
      await jobsService.changeStatus(job.id, newStatus, { user, oldStatus: job.status });
      toast.success('Status updated.');
      // Offer a sensible next step for the new status (you can edit or skip).
      const suggestion = suggestedNextAction(newStatus);
      if (suggestion) {
        setNaDialog({
          mode: 'suggest',
          title: `Moved to ${statusLabel(newStatus)}`,
          message: 'Here’s a suggested next step. Edit it, or skip to leave the current one.',
          initialText: suggestion.text,
          initialDate: suggestion.dueDate,
          confirmLabel: 'Set next action',
          skipLabel: 'Skip',
        });
      }
    } catch (err) {
      toast.error(err?.message || 'Could not update status.');
    } finally {
      setChangingStatus(false);
    }
  };

  // Reschedule the current next action (bumps the date, logs old → new + reason).
  const openReschedule = () => {
    setNaDialog({
      mode: 'reschedule',
      title: 'Reschedule next action',
      initialText: job.nextAction.text,
      initialDate: toInputDate(job.nextAction.dueDate),
      confirmLabel: 'Reschedule',
      skipLabel: 'Cancel',
    });
  };

  // Mark the current next action done (logs it, clears it), then suggest the next.
  const markDone = async () => {
    const completed = job.nextAction.text;
    if (!completed) return;
    try {
      await jobsService.updateJob(job.id, { nextAction: { text: '', dueDate: '' } },
        { user, log: `Completed: ${completed}` });
      toast.success('Marked done.');
      const suggestion = suggestedNextAction(job.status);
      if (suggestion) {
        setNaDialog({
          mode: 'suggest',
          title: 'What’s next?',
          message: 'Set the next step for this job, or skip.',
          initialText: suggestion.text,
          initialDate: suggestion.dueDate,
          confirmLabel: 'Set next action',
          skipLabel: 'Skip',
        });
      }
    } catch (err) {
      toast.error(err?.message || 'Could not update next action.');
    }
  };

  const submitNextAction = async ({ text, dueDate, reason }) => {
    if (!naDialog) return;
    setNaSaving(true);
    try {
      let log;
      if (naDialog.mode === 'reschedule') {
        const oldD = job.nextAction.dueDate ? formatDate(job.nextAction.dueDate) : 'no date';
        const newD = dueDate ? formatDate(dueDate) : 'no date';
        log = `Rescheduled “${text}”: ${oldD} → ${newD}${reason ? ` (${reason})` : ''}`;
      } else {
        log = `Next action set: ${text}`;
      }
      await jobsService.updateJob(job.id, { nextAction: { text, dueDate } }, { user, log });
      toast.success('Next action updated.');
      setNaDialog(null);
    } catch (err) {
      toast.error(err?.message || 'Could not update next action.');
    } finally {
      setNaSaving(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await jobsService.deleteJob(job.id);
      toast.success('Job deleted.');
      navigate('/jobs');
    } catch (err) {
      toast.error(err?.message || 'Could not delete job.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...(isInsurance ? [{ key: 'insurance', label: 'Insurance' }] : []),
    { key: 'money', label: 'Contract & Payment' },
    { key: 'materials', label: 'Materials' },
    { key: 'notes', label: 'Notes' },
    { key: 'files', label: 'Files' },
    { key: 'activity', label: 'Activity' },
  ];

  const phoneDigits = String(job.customer.phone || '').replace(/\D/g, '');
  const addressText = formatAddress(job.address);
  const mapsUrl = addressText
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText)}`
    : null;

  return (
    <div className="page page-narrow job-detail">
      {/* Header */}
      <div className="page-header job-detail-header">
        <div className="row gap-2" style={{ minWidth: 0 }}>
          <Button variant="ghost" icon="arrow-left" onClick={() => navigate(-1)} aria-label="Back" />
          <div style={{ minWidth: 0 }}>
            <div className="row gap-2 row-wrap">
              <h1 className="truncate">{fullName(job.customer)}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="page-subtitle">
              {JOB_TYPE_MAP[job.jobType]?.label || 'Retail'}
              {job.poNumber ? ` · PO #${job.poNumber}` : ''}
              {addressText ? ` · ${addressText}` : ''}
            </p>
          </div>
        </div>
        {canDelete && (
          <Button variant="ghost" icon="trash" onClick={() => setConfirmDelete(true)}
            className="hide-mobile" aria-label="Delete job" />
        )}
      </div>

      {/* Status control + desktop quick actions */}
      <div className="card card-pad job-detail-bar">
        <div className="field job-status-field">
          <label className="field-label" htmlFor="job-status">Status</label>
          <Select id="job-status" value={job.status} onChange={onStatusChange}
            options={STATUSES} disabled={!canEdit || changingStatus} />
        </div>
        <div className="row gap-2 row-wrap job-quick-actions hide-mobile">
          {phoneDigits && <Button variant="secondary" icon="phone" to={`tel:${phoneDigits}`}>Call</Button>}
          {job.customer.email && <Button variant="secondary" icon="mail" to={`mailto:${job.customer.email}`}>Email</Button>}
          {mapsUrl && (
            <a className="btn btn-secondary" href={mapsUrl} target="_blank" rel="noreferrer">
              <Icon name="map-pin" size={18} /> Map
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {tab === 'overview' && (
          <div className="detail-grid">
            <CustomerSection job={job} canEdit={canEdit} onSave={handleSave} />
            <BasicsSection job={job} canEdit={canEdit} onSave={handleSave} />
            <LeadNextSection job={job} canEdit={canEdit} onSave={handleSave}
              onReschedule={canEdit ? openReschedule : undefined}
              onMarkDone={canEdit ? markDone : undefined} />
            <JobAppointments jobId={job.id} customerName={fullName(job.customer)} />
          </div>
        )}
        {tab === 'insurance' && isInsurance && (
          <InsuranceSection job={job} canEdit={canEdit} onSave={handleSave} />
        )}
        {tab === 'money' && <ContractSection job={job} canEdit={canEdit} onSave={handleSave} />}
        {tab === 'materials' && <MaterialsSection job={job} canEdit={canEdit} onSave={handleSave} />}
        {tab === 'notes' && <NotesPanel jobId={job.id} />}
        {tab === 'files' && <FilesTab jobId={job.id} customerName={fullName(job.customer)} />}
        {tab === 'activity' && <TimelinePanel jobId={job.id} />}
      </div>

      {/* Sticky mobile action bar */}
      {(phoneDigits || mapsUrl) && (
        <div className="job-actionbar">
          {phoneDigits && <a className="btn btn-secondary" href={`tel:${phoneDigits}`}><Icon name="phone" size={18} /> Call</a>}
          {job.customer.email && <a className="btn btn-secondary" href={`mailto:${job.customer.email}`}><Icon name="mail" size={18} /> Email</a>}
          {mapsUrl && <a className="btn btn-secondary" href={mapsUrl} target="_blank" rel="noreferrer"><Icon name="map-pin" size={18} /> Map</a>}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this job?"
        message="The entire job file, notes, and history will be permanently removed."
        confirmLabel="Delete job"
        danger
        loading={deleting}
        onConfirm={doDelete}
        onClose={() => setConfirmDelete(false)}
      />

      <NextActionDialog
        open={!!naDialog}
        title={naDialog?.title}
        message={naDialog?.message}
        initialText={naDialog?.initialText || ''}
        initialDate={naDialog?.initialDate || ''}
        showReason={naDialog?.mode === 'reschedule'}
        confirmLabel={naDialog?.confirmLabel}
        skipLabel={naDialog?.skipLabel}
        loading={naSaving}
        onConfirm={submitNextAction}
        onClose={() => setNaDialog(null)}
      />
    </div>
  );
}
