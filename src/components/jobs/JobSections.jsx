// ===========================================================================
// Editable detail sections for a job. Each section shows a read-mode summary
// and flips to an inline form on Edit. EditableSection owns the edit/save/
// cancel chrome and draft state so the individual sections stay declarative:
// they describe how to read a draft from the job, render view + form, and turn
// the draft back into a patch for jobsService.updateJob.
// ===========================================================================
import { useState } from 'react';
import { SectionCard } from '../ui/Card';
import { Field, Input, Textarea, Select, Checkbox } from '../ui/Field';
import { Tag, TradePills } from '../ui/Tag';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import {
  JOB_TYPES, TRADES, PRIORITIES, LEAD_SOURCES, CONTACT_METHODS,
  SUPPLIERS, MATERIAL_STATUSES,
  JOB_TYPE_MAP, PRIORITY_MAP, LEAD_SOURCE_MAP, CONTACT_METHOD_MAP,
  SUPPLIER_MAP, MATERIAL_STATUS_MAP,
} from '../../utils/constants';
import { formatPhone, formatCurrency, formatDate, formatDateTime, toInputDate } from '../../utils/format';
import { nextActionUrgency } from '../../utils/jobHelpers';

// --- Read-mode display helpers ---------------------------------------------
export function DL({ children }) {
  return <dl className="dl dl-cols">{children}</dl>;
}

export function DRow({ label, children, full = false }) {
  const empty = children === null || children === undefined || children === '';
  return (
    <div className={`dl-row ${full ? 'dl-row-full' : ''}`}>
      <dt>{label}</dt>
      <dd>{empty ? <span className="subtle">—</span> : children}</dd>
    </div>
  );
}

const yesNo = (v) => (v ? 'Yes' : 'No');
const money = (v) => formatCurrency(v);

// --- Generic editable wrapper ----------------------------------------------
function EditableSection({ title, icon, canEdit, job, fromJob, view, form, toPatch, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => fromJob(job));
  const [saving, setSaving] = useState(false);

  const start = () => { setDraft(fromJob(job)); setEditing(true); };
  const cancel = () => setEditing(false);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const { patch, log } = toPatch(draft);
      const ok = await onSave(patch, log);
      if (ok !== false) setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      title={<><Icon name={icon} size={18} /> {title}</>}
      actions={canEdit && !editing && (
        <Button variant="ghost" size="sm" icon="edit" onClick={start} aria-label={`Edit ${title}`} />
      )}
    >
      {editing ? (
        <div className="stack stack-4">
          {form(draft, set)}
          <div className="row row-between section-edit-actions">
            <Button variant="ghost" onClick={cancel} disabled={saving}>Cancel</Button>
            <Button variant="primary" icon="check" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      ) : (
        view(job)
      )}
    </SectionCard>
  );
}

// --- Customer & contact -----------------------------------------------------
export function CustomerSection({ job, canEdit, onSave }) {
  return (
    <EditableSection
      title="Customer & contact" icon="user" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({ ...j.customer, ...j.address })}
      toPatch={(d) => ({
        patch: {
          customer: {
            firstName: d.firstName, lastName: d.lastName, phone: d.phone,
            email: d.email, preferredContact: d.preferredContact, notes: d.notes,
          },
          address: { street: d.street, city: d.city, state: d.state, zip: d.zip },
        },
        log: 'Updated customer & contact info',
      })}
      view={(j) => {
        const c = j.customer; const a = j.address;
        const digits = String(c.phone || '').replace(/\D/g, '');
        return (
          <DL>
            <DRow label="Phone">
              {c.phone ? <a href={`tel:${digits}`}>{formatPhone(c.phone)}</a> : null}
            </DRow>
            <DRow label="Email">
              {c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : null}
            </DRow>
            <DRow label="Preferred contact">{CONTACT_METHOD_MAP[c.preferredContact]?.label}</DRow>
            <DRow label="Address" full>
              {[a.street, [a.city, a.state].filter(Boolean).join(', '), a.zip].filter(Boolean).join(' · ')}
            </DRow>
            {c.notes ? <DRow label="Customer notes" full>{c.notes}</DRow> : null}
          </DL>
        );
      }}
      form={(d, set) => (
        <>
          <div className="form-grid-2">
            <Field label="First name" htmlFor="c-fn">
              <Input id="c-fn" value={d.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label="Last name" htmlFor="c-ln">
              <Input id="c-ln" value={d.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </Field>
          </div>
          <div className="form-grid-2">
            <Field label="Phone" htmlFor="c-ph">
              <Input id="c-ph" type="tel" inputMode="tel" value={d.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email" htmlFor="c-em">
              <Input id="c-em" type="email" value={d.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
          </div>
          <Field label="Street address" htmlFor="c-st">
            <Input id="c-st" value={d.street} onChange={(e) => set('street', e.target.value)} />
          </Field>
          <div className="form-grid-3">
            <Field label="City" htmlFor="c-city">
              <Input id="c-city" value={d.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="State" htmlFor="c-state">
              <Input id="c-state" value={d.state} onChange={(e) => set('state', e.target.value)} />
            </Field>
            <Field label="ZIP" htmlFor="c-zip">
              <Input id="c-zip" inputMode="numeric" value={d.zip} onChange={(e) => set('zip', e.target.value)} />
            </Field>
          </div>
          <Field label="Preferred contact" htmlFor="c-pc">
            <Select id="c-pc" value={d.preferredContact} onChange={(e) => set('preferredContact', e.target.value)} options={CONTACT_METHODS} />
          </Field>
          <Field label="Customer notes" htmlFor="c-notes">
            <Textarea id="c-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </>
      )}
    />
  );
}

// --- Job basics -------------------------------------------------------------
export function BasicsSection({ job, canEdit, onSave }) {
  return (
    <EditableSection
      title="Job basics" icon="jobs" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({
        poNumber: j.poNumber, jobType: j.jobType, priority: j.priority,
        assignedTo: j.assignedTo, trades: [...(j.trades || [])],
      })}
      toPatch={(d) => ({
        patch: {
          poNumber: d.poNumber, jobType: d.jobType, priority: d.priority,
          assignedTo: d.assignedTo, trades: d.trades,
        },
        log: 'Updated job basics',
      })}
      view={(j) => (
        <DL>
          <DRow label="Job type">{JOB_TYPE_MAP[j.jobType]?.label || 'Retail'}</DRow>
          <DRow label="PO #">{j.poNumber}</DRow>
          <DRow label="Priority">{PRIORITY_MAP[j.priority]?.label}</DRow>
          <DRow label="Assigned to">{j.assignedTo}</DRow>
          <DRow label="Trades" full><TradePills trades={j.trades} /></DRow>
        </DL>
      )}
      form={(d, set) => {
        const toggle = (key) => set('trades', d.trades.includes(key) ? d.trades.filter((t) => t !== key) : [...d.trades, key]);
        return (
          <>
            <Field label="Job type">
              <div className="segmented">
                {JOB_TYPES.map((t) => (
                  <button type="button" key={t.key} aria-pressed={d.jobType === t.key} onClick={() => set('jobType', t.key)}>{t.label}</button>
                ))}
              </div>
            </Field>
            <Field label="Trades involved" hint="Tap all that apply.">
              <div className="row row-wrap gap-2">
                {TRADES.map((t) => (
                  <Tag key={t.key} selected={d.trades.includes(t.key)} onToggle={() => toggle(t.key)}>{t.label}</Tag>
                ))}
              </div>
            </Field>
            <div className="form-grid-2">
              <Field label="Priority" htmlFor="b-pri">
                <Select id="b-pri" value={d.priority} onChange={(e) => set('priority', e.target.value)} options={PRIORITIES} />
              </Field>
              <Field label="PO #" htmlFor="b-po">
                <Input id="b-po" value={d.poNumber} onChange={(e) => set('poNumber', e.target.value)} />
              </Field>
            </div>
            <Field label="Assigned to" htmlFor="b-assigned">
              <Input id="b-assigned" value={d.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} placeholder="Salesperson / manager" />
            </Field>
          </>
        );
      }}
    />
  );
}

// --- Lead source & next action ---------------------------------------------
export function LeadNextSection({ job, canEdit, onSave, onReschedule, onMarkDone }) {
  const URGENCY_CLASS = { overdue: 'due-overdue', today: 'due-today', soon: 'due-soon' };
  return (
    <EditableSection
      title="Lead & next action" icon="inbox" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({
        type: j.leadSource.type, referrerName: j.leadSource.referrerName,
        text: j.nextAction.text, dueDate: j.nextAction.dueDate,
      })}
      toPatch={(d) => ({
        patch: {
          leadSource: { type: d.type, referrerName: d.referrerName },
          nextAction: { text: d.text, dueDate: d.dueDate },
        },
        log: 'Updated lead source / next action',
      })}
      view={(j) => {
        const urgency = nextActionUrgency(j);
        return (
          <DL>
            <DRow label="Lead source">{LEAD_SOURCE_MAP[j.leadSource.type]?.label}</DRow>
            {j.leadSource.referrerName ? <DRow label="Referrer">{j.leadSource.referrerName}</DRow> : null}
            <DRow label="Next action" full>
              {j.nextAction.text ? (
                <div className="next-action-block">
                  <span className={`next-action ${URGENCY_CLASS[urgency] || ''}`}>
                    <Icon name="clock" size={15} />
                    <span>{j.nextAction.text}</span>
                    {j.nextAction.dueDate && <span className="next-action-due">{formatDate(j.nextAction.dueDate)}</span>}
                  </span>
                  {(onMarkDone || onReschedule) && (
                    <div className="next-action-actions">
                      {onMarkDone && (
                        <Button variant="ghost" size="sm" icon="check" onClick={onMarkDone}>Done</Button>
                      )}
                      {onReschedule && (
                        <Button variant="ghost" size="sm" icon="schedule" onClick={onReschedule}>Reschedule</Button>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
            </DRow>
          </DL>
        );
      }}
      form={(d, set) => {
        const showReferrer = ['referral', 'previous-customer', 'neighbor'].includes(d.type);
        return (
          <>
            <Field label="Lead source" htmlFor="l-ls">
              <Select id="l-ls" value={d.type} onChange={(e) => set('type', e.target.value)} placeholder="Select a source" options={LEAD_SOURCES} />
            </Field>
            {showReferrer && (
              <Field label="Referrer name / details" htmlFor="l-ref">
                <Input id="l-ref" value={d.referrerName} onChange={(e) => set('referrerName', e.target.value)} placeholder="Who referred them?" />
              </Field>
            )}
            <div className="form-grid-2">
              <Field label="Next action" htmlFor="l-na">
                <Input id="l-na" value={d.text} onChange={(e) => set('text', e.target.value)} placeholder="e.g. Call to confirm" />
              </Field>
              <Field label="Due date" htmlFor="l-nad">
                <Input id="l-nad" type="date" value={toInputDate(d.dueDate)} onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
            </div>
          </>
        );
      }}
    />
  );
}

// --- Appointments -----------------------------------------------------------
export function AppointmentsSection({ job, canEdit, onSave }) {
  const isInsurance = job.jobType === 'insurance';
  return (
    <EditableSection
      title="Appointments" icon="schedule" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({ ...j.appointments })}
      toPatch={(d) => ({
        patch: { appointments: { initial: d.initial, adjuster: d.adjuster, followUp: d.followUp, notes: d.notes } },
        log: 'Updated appointments',
      })}
      view={(j) => {
        const ap = j.appointments;
        return (
          <DL>
            <DRow label="Initial">{ap.initial ? formatDateTime(ap.initial) : null}</DRow>
            {isInsurance ? <DRow label="Adjuster">{ap.adjuster ? formatDateTime(ap.adjuster) : null}</DRow> : null}
            <DRow label="Follow-up">{ap.followUp ? formatDateTime(ap.followUp) : null}</DRow>
            {ap.notes ? <DRow label="Notes" full>{ap.notes}</DRow> : null}
          </DL>
        );
      }}
      form={(d, set) => (
        <>
          <Field label="Initial appointment" htmlFor="a-init">
            <Input id="a-init" type="datetime-local" value={d.initial} onChange={(e) => set('initial', e.target.value)} />
          </Field>
          {isInsurance && (
            <Field label="Adjuster appointment" htmlFor="a-adj">
              <Input id="a-adj" type="datetime-local" value={d.adjuster} onChange={(e) => set('adjuster', e.target.value)} />
            </Field>
          )}
          <Field label="Follow-up appointment" htmlFor="a-fu">
            <Input id="a-fu" type="datetime-local" value={d.followUp} onChange={(e) => set('followUp', e.target.value)} />
          </Field>
          <Field label="Appointment notes" htmlFor="a-notes">
            <Textarea id="a-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </>
      )}
    />
  );
}

// --- Insurance (conditional) -----------------------------------------------
export function InsuranceSection({ job, canEdit, onSave }) {
  return (
    <EditableSection
      title="Insurance claim" icon="shield" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({ ...j.insurance })}
      toPatch={(d) => ({ patch: { insurance: { ...d } }, log: 'Updated insurance claim' })}
      view={(j) => {
        const ins = j.insurance;
        return (
          <DL>
            <DRow label="Insurance company">{ins.company}</DRow>
            <DRow label="Claim #">{ins.claimNumber}</DRow>
            <DRow label="Adjuster">{ins.adjusterName}</DRow>
            <DRow label="Adjuster phone">
              {ins.adjusterPhone ? <a href={`tel:${String(ins.adjusterPhone).replace(/\D/g, '')}`}>{formatPhone(ins.adjusterPhone)}</a> : null}
            </DRow>
            <DRow label="Adjuster email">
              {ins.adjusterEmail ? <a href={`mailto:${ins.adjusterEmail}`}>{ins.adjusterEmail}</a> : null}
            </DRow>
            <DRow label="Claim opened">{ins.dateClaimOpened ? formatDate(ins.dateClaimOpened) : null}</DRow>
            <DRow label="Scope received">{yesNo(ins.scopeReceived)}</DRow>
            <DRow label="Initial amount">{money(ins.initialAmount)}</DRow>
            <DRow label="Recoverable depreciation">{money(ins.recoverableDepreciation)}</DRow>
            <DRow label="Supplement">
              {ins.supplementApproved ? 'Approved' : ins.supplementSubmitted ? 'Submitted' : ins.supplementNeeded ? 'Needed' : 'No'}
            </DRow>
            <DRow label="NOC sent">{yesNo(ins.nocSent)}</DRow>
            <DRow label="Final payment status">{ins.finalPaymentStatus}</DRow>
            {ins.supplementNotes ? <DRow label="Supplement notes" full>{ins.supplementNotes}</DRow> : null}
          </DL>
        );
      }}
      form={(d, set) => (
        <>
          <div className="form-grid-2">
            <Field label="Insurance company" htmlFor="i-co">
              <Input id="i-co" value={d.company} onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field label="Claim number" htmlFor="i-cn">
              <Input id="i-cn" value={d.claimNumber} onChange={(e) => set('claimNumber', e.target.value)} />
            </Field>
          </div>
          <Field label="Adjuster name" htmlFor="i-an">
            <Input id="i-an" value={d.adjusterName} onChange={(e) => set('adjusterName', e.target.value)} />
          </Field>
          <div className="form-grid-2">
            <Field label="Adjuster phone" htmlFor="i-ap">
              <Input id="i-ap" type="tel" inputMode="tel" value={d.adjusterPhone} onChange={(e) => set('adjusterPhone', e.target.value)} />
            </Field>
            <Field label="Adjuster email" htmlFor="i-ae">
              <Input id="i-ae" type="email" value={d.adjusterEmail} onChange={(e) => set('adjusterEmail', e.target.value)} />
            </Field>
          </div>
          <div className="form-grid-2">
            <Field label="Date claim opened" htmlFor="i-do">
              <Input id="i-do" type="date" value={d.dateClaimOpened} onChange={(e) => set('dateClaimOpened', e.target.value)} />
            </Field>
            <Field label="Initial amount ($)" htmlFor="i-ia">
              <Input id="i-ia" inputMode="decimal" value={d.initialAmount} onChange={(e) => set('initialAmount', e.target.value)} />
            </Field>
          </div>
          <Field label="Recoverable depreciation ($)" htmlFor="i-rd">
            <Input id="i-rd" inputMode="decimal" value={d.recoverableDepreciation} onChange={(e) => set('recoverableDepreciation', e.target.value)} />
          </Field>
          <div className="checkbox-grid">
            <Checkbox label="Scope received" checked={d.scopeReceived} onChange={(e) => set('scopeReceived', e.target.checked)} />
            <Checkbox label="Supplement needed" checked={d.supplementNeeded} onChange={(e) => set('supplementNeeded', e.target.checked)} />
            <Checkbox label="Supplement submitted" checked={d.supplementSubmitted} onChange={(e) => set('supplementSubmitted', e.target.checked)} />
            <Checkbox label="Supplement approved" checked={d.supplementApproved} onChange={(e) => set('supplementApproved', e.target.checked)} />
            <Checkbox label="NOC sent" checked={d.nocSent} onChange={(e) => set('nocSent', e.target.checked)} />
          </div>
          <Field label="Supplement notes" htmlFor="i-sn">
            <Textarea id="i-sn" value={d.supplementNotes} onChange={(e) => set('supplementNotes', e.target.value)} />
          </Field>
          <Field label="Final payment status" htmlFor="i-fp">
            <Input id="i-fp" value={d.finalPaymentStatus} onChange={(e) => set('finalPaymentStatus', e.target.value)} placeholder="e.g. Awaiting depreciation check" />
          </Field>
        </>
      )}
    />
  );
}

// --- Contract & payment -----------------------------------------------------
export function ContractSection({ job, canEdit, onSave }) {
  return (
    <EditableSection
      title="Contract & payment" icon="dollar" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({ ...j.contract })}
      toPatch={(d) => ({ patch: { contract: { ...d } }, log: 'Updated contract & payment' })}
      view={(j) => {
        const c = j.contract;
        return (
          <DL>
            <DRow label="Contract signed">{yesNo(c.signed)}</DRow>
            <DRow label="Contract date">{c.date ? formatDate(c.date) : null}</DRow>
            <DRow label="Contract amount">{money(c.amount)}</DRow>
            <DRow label="Down required">{money(c.downRequired)}</DRow>
            <DRow label="Down received">{c.downReceived ? `Yes — ${money(c.downAmount)}` : 'No'}</DRow>
            <DRow label="Balance remaining">{money(c.balanceRemaining)}</DRow>
            <DRow label="Final payment received">{yesNo(c.finalReceived)}</DRow>
            {c.notes ? <DRow label="Notes" full>{c.notes}</DRow> : null}
          </DL>
        );
      }}
      form={(d, set) => (
        <>
          <div className="checkbox-grid">
            <Checkbox label="Contract signed" checked={d.signed} onChange={(e) => set('signed', e.target.checked)} />
            <Checkbox label="Down payment received" checked={d.downReceived} onChange={(e) => set('downReceived', e.target.checked)} />
            <Checkbox label="Final payment received" checked={d.finalReceived} onChange={(e) => set('finalReceived', e.target.checked)} />
          </div>
          <div className="form-grid-2">
            <Field label="Contract date" htmlFor="ct-date">
              <Input id="ct-date" type="date" value={d.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Contract amount ($)" htmlFor="ct-amt">
              <Input id="ct-amt" inputMode="decimal" value={d.amount} onChange={(e) => set('amount', e.target.value)} />
            </Field>
          </div>
          <div className="form-grid-2">
            <Field label="Down required ($)" htmlFor="ct-dr">
              <Input id="ct-dr" inputMode="decimal" value={d.downRequired} onChange={(e) => set('downRequired', e.target.value)} />
            </Field>
            <Field label="Down amount ($)" htmlFor="ct-da">
              <Input id="ct-da" inputMode="decimal" value={d.downAmount} onChange={(e) => set('downAmount', e.target.value)} />
            </Field>
          </div>
          <Field label="Balance remaining ($)" htmlFor="ct-bal">
            <Input id="ct-bal" inputMode="decimal" value={d.balanceRemaining} onChange={(e) => set('balanceRemaining', e.target.value)} />
          </Field>
          <Field label="Payment notes" htmlFor="ct-notes">
            <Textarea id="ct-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </>
      )}
    />
  );
}

// --- Materials --------------------------------------------------------------
export function MaterialsSection({ job, canEdit, onSave }) {
  return (
    <EditableSection
      title="Materials" icon="package" canEdit={canEdit} job={job} onSave={onSave}
      fromJob={(j) => ({ ...j.materials })}
      toPatch={(d) => ({ patch: { materials: { ...d } }, log: 'Updated materials' })}
      view={(j) => {
        const m = j.materials;
        return (
          <DL>
            <DRow label="Status">{MATERIAL_STATUS_MAP[m.status]?.label}</DRow>
            <DRow label="Supplier">{SUPPLIER_MAP[m.supplier]?.label}</DRow>
            <DRow label="List needed">{yesNo(m.listNeeded)}</DRow>
            <DRow label="List complete">{yesNo(m.listComplete)}</DRow>
            <DRow label="Order date">{m.orderDate ? formatDate(m.orderDate) : null}</DRow>
            <DRow label="Delivery date">{m.deliveryDate ? formatDate(m.deliveryDate) : null}</DRow>
            <DRow label="Delivery address" full>{m.deliveryAddress}</DRow>
            <DRow label="Pickup needed">{m.pickupNeeded ? `Yes — ${m.pickupResponsible || 'unassigned'}` : 'No'}</DRow>
            {m.notes ? <DRow label="Notes" full>{m.notes}</DRow> : null}
            {m.missingNotes ? <DRow label="Missing items" full>{m.missingNotes}</DRow> : null}
          </DL>
        );
      }}
      form={(d, set) => (
        <>
          <div className="form-grid-2">
            <Field label="Material status" htmlFor="m-st">
              <Select id="m-st" value={d.status} onChange={(e) => set('status', e.target.value)} options={MATERIAL_STATUSES} />
            </Field>
            <Field label="Supplier" htmlFor="m-sup">
              <Select id="m-sup" value={d.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Select supplier" options={SUPPLIERS} />
            </Field>
          </div>
          <div className="checkbox-grid">
            <Checkbox label="Material list needed" checked={d.listNeeded} onChange={(e) => set('listNeeded', e.target.checked)} />
            <Checkbox label="Material list complete" checked={d.listComplete} onChange={(e) => set('listComplete', e.target.checked)} />
            <Checkbox label="Pickup needed" checked={d.pickupNeeded} onChange={(e) => set('pickupNeeded', e.target.checked)} />
          </div>
          <div className="form-grid-2">
            <Field label="Order date" htmlFor="m-od">
              <Input id="m-od" type="date" value={d.orderDate} onChange={(e) => set('orderDate', e.target.value)} />
            </Field>
            <Field label="Delivery date" htmlFor="m-dd">
              <Input id="m-dd" type="date" value={d.deliveryDate} onChange={(e) => set('deliveryDate', e.target.value)} />
            </Field>
          </div>
          <Field label="Delivery address" htmlFor="m-da">
            <Input id="m-da" value={d.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} placeholder="Defaults to job site" />
          </Field>
          {d.pickupNeeded && (
            <Field label="Pickup responsible" htmlFor="m-pr">
              <Input id="m-pr" value={d.pickupResponsible} onChange={(e) => set('pickupResponsible', e.target.value)} />
            </Field>
          )}
          <Field label="Material notes" htmlFor="m-notes">
            <Textarea id="m-notes" value={d.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
          <Field label="Missing items" htmlFor="m-mn">
            <Textarea id="m-mn" value={d.missingNotes} onChange={(e) => set('missingNotes', e.target.value)} />
          </Field>
        </>
      )}
    />
  );
}
