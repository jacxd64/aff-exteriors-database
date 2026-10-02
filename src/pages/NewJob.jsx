// New Job / Lead — a mobile-friendly 3-step form. Required fields are marked;
// everything else can be filled in later on the job detail page.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import jobsService from '../services/jobsService';
import appointmentsService from '../services/appointmentsService';
import { emptyJob } from '../utils/jobHelpers';
import { fullName } from '../utils/format';
import { validateNewJob } from '../utils/validation';
import {
  TRADES, JOB_TYPES, PRIORITIES, LEAD_SOURCES, CONTACT_METHODS,
} from '../utils/constants';
import { Field, Input, Select, Textarea } from '../components/ui/Field';
import { Tag } from '../components/ui/Tag';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

const STEPS = ['Customer', 'Job details', 'Appointment'];

// Which step a given validation error lives on (to jump there on submit).
const FIELD_STEP = {
  firstName: 0, lastName: 0, phone: 0, street: 0, email: 0,
  jobType: 1, trades: 1, leadSource: 1,
};

export default function NewJob() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [job, setJob] = useState(emptyJob());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setField = (k, v) => setJob((p) => ({ ...p, [k]: v }));
  const setIn = (group, k, v) => setJob((p) => ({ ...p, [group]: { ...p[group], [k]: v } }));
  const toggleTrade = (key) =>
    setJob((p) => ({
      ...p,
      trades: p.trades.includes(key) ? p.trades.filter((t) => t !== key) : [...p.trades, key],
    }));

  const showReferrer = ['referral', 'previous-customer', 'neighbor'].includes(job.leadSource.type);

  const submit = async () => {
    const found = validateNewJob(job);
    setErrors(found);
    if (Object.keys(found).length) {
      const firstField = Object.keys(found)[0];
      setStep(FIELD_STEP[firstField] ?? 0);
      toast.error('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const id = await jobsService.createJob(job, user);
      // Convert any appointment times entered during intake into calendar appointments.
      const cust = fullName(job.customer);
      const intake = [
        job.appointments.initial && { type: 'initial', start: job.appointments.initial },
        job.appointments.adjuster && { type: 'adjuster', start: job.appointments.adjuster },
      ].filter(Boolean);
      for (const a of intake) {
        // eslint-disable-next-line no-await-in-loop
        await appointmentsService.add({ jobId: id, customerName: cust, type: a.type, start: a.start, durationMin: 60 }, user);
      }
      toast.success('Job created.');
      navigate(`/jobs/${id}`);
    } catch (err) {
      toast.error(err?.message || 'Could not create the job.');
      setSaving(false);
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-header">
        <div className="row gap-2">
          <Button variant="ghost" icon="arrow-left" onClick={() => navigate(-1)} aria-label="Back" />
          <div>
            <h1>New Job</h1>
            <p className="page-subtitle">Add a lead from the field or office</p>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, i) => (
          <button
            type="button"
            key={label}
            className={`stepper-item ${i === step ? 'current' : ''} ${i < step ? 'done' : ''}`}
            onClick={() => setStep(i)}
          >
            <span className="stepper-dot">{i < step ? <Icon name="check" size={14} /> : i + 1}</span>
            <span className="stepper-label">{label}</span>
          </button>
        ))}
      </div>

      <form
        className="card card-pad new-job-form"
        onSubmit={(e) => {
          e.preventDefault();
          // Enter key: advance through steps; only create on the final step.
          if (step < STEPS.length - 1) setStep((s) => s + 1);
          else submit();
        }}
      >
        {step === 0 && (
          <div className="stack stack-4">
            <div className="form-grid-2">
              <Field label="First name" required error={errors.firstName} htmlFor="fn">
                <Input id="fn" value={job.customer.firstName} invalid={!!errors.firstName}
                  onChange={(e) => setIn('customer', 'firstName', e.target.value)} autoFocus />
              </Field>
              <Field label="Last name" required error={errors.lastName} htmlFor="ln">
                <Input id="ln" value={job.customer.lastName} invalid={!!errors.lastName}
                  onChange={(e) => setIn('customer', 'lastName', e.target.value)} />
              </Field>
            </div>
            <Field label="Phone" required error={errors.phone} htmlFor="ph">
              <Input id="ph" type="tel" inputMode="tel" value={job.customer.phone} invalid={!!errors.phone}
                onChange={(e) => setIn('customer', 'phone', e.target.value)} placeholder="(509) 555-0123" />
            </Field>
            <Field label="Email" error={errors.email} htmlFor="em">
              <Input id="em" type="email" value={job.customer.email} invalid={!!errors.email}
                onChange={(e) => setIn('customer', 'email', e.target.value)} placeholder="optional" />
            </Field>
            <Field label="Street address" required error={errors.street} htmlFor="st">
              <Input id="st" value={job.address.street} invalid={!!errors.street}
                onChange={(e) => setIn('address', 'street', e.target.value)} placeholder="123 Main St" />
            </Field>
            <div className="form-grid-3">
              <Field label="City" htmlFor="city">
                <Input id="city" value={job.address.city} onChange={(e) => setIn('address', 'city', e.target.value)} />
              </Field>
              <Field label="State" htmlFor="state">
                <Input id="state" value={job.address.state} onChange={(e) => setIn('address', 'state', e.target.value)} />
              </Field>
              <Field label="ZIP" htmlFor="zip">
                <Input id="zip" inputMode="numeric" value={job.address.zip} onChange={(e) => setIn('address', 'zip', e.target.value)} />
              </Field>
            </div>
            <Field label="Preferred contact" htmlFor="pc">
              <Select id="pc" value={job.customer.preferredContact}
                onChange={(e) => setIn('customer', 'preferredContact', e.target.value)} options={CONTACT_METHODS} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="stack stack-4">
            <Field label="Job type" required error={errors.jobType}>
              <div className="segmented">
                {JOB_TYPES.map((t) => (
                  <button type="button" key={t.key} aria-pressed={job.jobType === t.key}
                    onClick={() => setField('jobType', t.key)}>{t.label}</button>
                ))}
              </div>
            </Field>

            <Field label="Trades involved" required error={errors.trades} hint="Tap all that apply.">
              <div className="row row-wrap gap-2">
                {TRADES.map((t) => (
                  <Tag key={t.key} selected={job.trades.includes(t.key)} onToggle={() => toggleTrade(t.key)}>
                    {t.label}
                  </Tag>
                ))}
              </div>
            </Field>

            <div className="form-grid-2">
              <Field label="Priority" htmlFor="pri">
                <Select id="pri" value={job.priority} onChange={(e) => setField('priority', e.target.value)} options={PRIORITIES} />
              </Field>
              <Field label="Assigned to" htmlFor="assigned">
                <Input id="assigned" value={job.assignedTo} onChange={(e) => setField('assignedTo', e.target.value)} placeholder="Salesperson / manager" />
              </Field>
            </div>

            <Field label="Lead source" required error={errors.leadSource} htmlFor="ls">
              <Select id="ls" value={job.leadSource.type} invalid={!!errors.leadSource}
                onChange={(e) => setIn('leadSource', 'type', e.target.value)} placeholder="Select a source" options={LEAD_SOURCES} />
            </Field>
            {showReferrer && (
              <Field label="Referrer name / details" htmlFor="ref">
                <Input id="ref" value={job.leadSource.referrerName}
                  onChange={(e) => setIn('leadSource', 'referrerName', e.target.value)} placeholder="Who referred them?" />
              </Field>
            )}

            {job.jobType === 'insurance' && (
              <div className="form-grid-2 insurance-mini">
                <Field label="Insurance company" htmlFor="ic">
                  <Input id="ic" value={job.insurance.company} onChange={(e) => setIn('insurance', 'company', e.target.value)} placeholder="optional" />
                </Field>
                <Field label="Claim number" htmlFor="cn">
                  <Input id="cn" value={job.insurance.claimNumber} onChange={(e) => setIn('insurance', 'claimNumber', e.target.value)} placeholder="optional" />
                </Field>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="stack stack-4">
            <Field label="Initial appointment" hint="If already scheduled." htmlFor="appt">
              <Input id="appt" type="datetime-local" value={job.appointments.initial}
                onChange={(e) => setIn('appointments', 'initial', e.target.value)} />
            </Field>
            {job.jobType === 'insurance' && (
              <Field label="Adjuster appointment" htmlFor="adj">
                <Input id="adj" type="datetime-local" value={job.appointments.adjuster}
                  onChange={(e) => setIn('appointments', 'adjuster', e.target.value)} />
              </Field>
            )}
            <div className="form-grid-2">
              <Field label="Next action" htmlFor="na">
                <Input id="na" value={job.nextAction.text} onChange={(e) => setIn('nextAction', 'text', e.target.value)} placeholder="e.g. Call to confirm" />
              </Field>
              <Field label="Due date" htmlFor="nad">
                <Input id="nad" type="date" value={job.nextAction.dueDate} onChange={(e) => setIn('nextAction', 'dueDate', e.target.value)} />
              </Field>
            </div>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" value={job.customer.notes} onChange={(e) => setIn('customer', 'notes', e.target.value)} placeholder="Anything useful about this customer or job…" />
            </Field>
            <p className="muted text-sm">
              <Icon name="camera" size={14} /> You can add photos, measurements, and documents after creating the job.
            </p>
          </div>
        )}

        {/* Footer actions */}
        <div className="form-actions">
          {step > 0 ? (
            <Button type="button" variant="secondary" icon="arrow-left" onClick={() => setStep(step - 1)}>Back</Button>
          ) : <span />}
          {/* One button (always type="button") that advances or, on the last step,
              creates the job — so its type never flips to submit mid-click. */}
          <Button
            type="button"
            variant="primary"
            disabled={saving}
            icon={step === STEPS.length - 1 ? 'check' : undefined}
            iconRight={step === STEPS.length - 1 ? undefined : 'chevron-right'}
            onClick={() => {
              if (step < STEPS.length - 1) setStep(step + 1);
              else submit();
            }}
          >
            {step === STEPS.length - 1 ? (saving ? 'Creating…' : 'Create Job') : 'Next'}
          </Button>
        </div>
      </form>
    </div>
  );
}
