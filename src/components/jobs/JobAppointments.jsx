// A job's appointments (flexible list, backed by the appointments model + the
// shared calendar). Replaces the old fixed initial/adjuster/follow-up slots.
import { useState } from 'react';
import { useJobAppointments } from '../../hooks/useAppointments';
import { useAuth } from '../../context/AuthContext';
import { CAP } from '../../utils/permissions';
import { EVENT_TYPE_MAP, EVENT_TYPE_COLORS } from '../../utils/constants';
import { formatDateTime } from '../../utils/format';
import { SectionCard } from '../ui/Card';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import AppointmentDialog from './AppointmentDialog';

function durLabel(m) {
  if (!m) return '';
  if (m < 60) return `${m} min`;
  const h = m / 60;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr`;
}

export default function JobAppointments({ jobId, customerName }) {
  const { appointments, loading } = useJobAppointments(jobId);
  const { can } = useAuth();
  const canEdit = can(CAP.JOB_EDIT);
  const [dialog, setDialog] = useState(null);

  return (
    <SectionCard
      title={<><Icon name="schedule" size={18} /> Appointments</>}
      actions={canEdit && (
        <Button variant="ghost" size="sm" icon="plus" aria-label="Add appointment"
          onClick={() => setDialog({ initial: { jobId, customerName, start: '' } })} />
      )}
    >
      {loading ? (
        <p className="muted text-sm">Loading…</p>
      ) : appointments.length === 0 ? (
        <p className="muted text-sm">No appointments yet.{canEdit ? ' Tap + to schedule one.' : ''}</p>
      ) : (
        <ul className="appt-list">
          {appointments.map((a) => (
            <li key={a.id}>
              <button type="button" className="appt-item" disabled={!canEdit}
                onClick={() => canEdit && setDialog({ appointment: a })}>
                <span className="appt-dot" style={{ background: EVENT_TYPE_COLORS[a.type] || EVENT_TYPE_COLORS.other }} />
                <span className="appt-item-main">
                  <span className="appt-item-title">{a.title || EVENT_TYPE_MAP[a.type]?.label || 'Appointment'}</span>
                  <span className="appt-item-when">
                    {formatDateTime(a.start)}{a.durationMin ? ` · ${durLabel(a.durationMin)}` : ''}
                  </span>
                </span>
                {a.assignedTo && <span className="appt-item-who">{a.assignedTo}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <AppointmentDialog
        open={!!dialog}
        appointment={dialog?.appointment}
        initial={dialog?.initial}
        onClose={() => setDialog(null)}
      />
    </SectionCard>
  );
}
