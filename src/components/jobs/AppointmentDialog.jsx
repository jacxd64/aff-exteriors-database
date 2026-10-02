// Create / edit a calendar appointment. Used from the Schedule page and from a
// job's Appointments section. Optionally links to a job (denormalizing the
// customer name for the calendar).
import { useEffect, useState } from 'react';
import { useJobs } from '../../hooks/useJobs';
import { useInstallers } from '../../hooks/useInstallers';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import appointmentsService from '../../services/appointmentsService';
import { EVENT_TYPES } from '../../utils/constants';
import { fullName } from '../../utils/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Select, Textarea } from '../ui/Field';

const DURATIONS = [
  { key: 15, label: '15 min' },
  { key: 30, label: '30 min' },
  { key: 45, label: '45 min' },
  { key: 60, label: '1 hour' },
  { key: 90, label: '1.5 hours' },
  { key: 120, label: '2 hours' },
  { key: 180, label: '3 hours' },
  { key: 240, label: '4 hours' },
  { key: 480, label: 'All day' },
];

export default function AppointmentDialog({ open, appointment, initial, onClose }) {
  const { jobs } = useJobs();
  const { installers } = useInstallers();
  const { user } = useAuth();
  const toast = useToast();
  const editing = Boolean(appointment?.id);

  const [jobId, setJobId] = useState('');
  const [type, setType] = useState('initial');
  const [start, setStart] = useState('');
  const [durationMin, setDurationMin] = useState(60);
  const [assignedTo, setAssignedTo] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const src = appointment || initial || {};
    setJobId(src.jobId || '');
    setType(src.type || 'initial');
    setStart(src.start || '');
    setDurationMin(src.durationMin || 60);
    setAssignedTo(src.assignedTo || '');
    setTitle(src.title || '');
    setNotes(src.notes || '');
  }, [open, appointment, initial]);

  if (!open) return null;

  const jobOptions = [
    { key: '', label: '— No job —' },
    ...jobs.map((j) => ({ key: j.id, label: `${fullName(j.customer)}${j.address?.city ? ` · ${j.address.city}` : ''}` })),
  ];

  const save = async () => {
    if (!start) { toast.error('Pick a date and time first.'); return; }
    setSaving(true);
    try {
      const job = jobs.find((j) => j.id === jobId);
      const data = {
        jobId,
        customerName: job ? fullName(job.customer) : '',
        type,
        start,
        durationMin: Number(durationMin),
        assignedTo,
        title,
        notes,
      };
      if (editing) await appointmentsService.update(appointment.id, data, { user, jobId });
      else await appointmentsService.add(data, user);
      toast.success(editing ? 'Appointment updated.' : 'Appointment added.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not save appointment.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await appointmentsService.remove(appointment.id, { jobId: appointment.jobId, user });
      toast.success('Appointment removed.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not remove appointment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit appointment' : 'New appointment'}
      size="narrow"
      footer={(
        <>
          {editing && (
            <Button variant="ghost" className="appt-delete" onClick={remove} disabled={saving}>Delete</Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon="check" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </>
      )}
    >
      <div className="stack stack-3">
        <div className="form-grid-2">
          <Field label="Type" htmlFor="ap-type">
            <Select id="ap-type" value={type} onChange={(e) => setType(e.target.value)} options={EVENT_TYPES} />
          </Field>
          <Field label="Duration" htmlFor="ap-dur">
            <Select id="ap-dur" value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} options={DURATIONS} />
          </Field>
        </div>
        <Field label="Date & time" htmlFor="ap-start">
          <Input id="ap-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Job / customer" htmlFor="ap-job" hint="Link this appointment to a job (optional).">
          <Select id="ap-job" value={jobId} onChange={(e) => setJobId(e.target.value)} options={jobOptions} />
        </Field>
        <Field label="Assigned to" htmlFor="ap-assigned" hint="Pick a contractor from your bank, or type a team member's name.">
          <Input id="ap-assigned" list="ap-contractors" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="Contractor or team member" />
          <datalist id="ap-contractors">
            {installers.filter((i) => i.active !== false).map((i) => <option key={i.id} value={i.name} />)}
          </datalist>
        </Field>
        <Field label="Title / label" htmlFor="ap-title" hint="Optional — defaults to the type.">
          <Input id="ap-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="ap-notes">
          <Textarea id="ap-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
