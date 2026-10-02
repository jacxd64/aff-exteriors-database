// Schedule — an appointments calendar with Day / Week / Month views. Day & Week
// are an hour-by-hour planner grid (appointments positioned by time); Month is a
// classic grid with pills. Click an empty slot to create, an appointment to edit.
import { useMemo, useState } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import { useAuth } from '../context/AuthContext';
import { CAP } from '../utils/permissions';
import { EVENT_TYPE_MAP, EVENT_TYPE_COLORS } from '../utils/constants';
import { toDate } from '../utils/format';
import { LoadingBlock } from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import AppointmentDialog from '../components/jobs/AppointmentDialog';

const START_HOUR = 6;
const END_HOUR = 20;
const HOUR_H = 48;
const TOTAL_H = (END_HOUR - START_HOUR) * HOUR_H;

const pad = (n) => String(n).padStart(2, '0');
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfWeek = (d) => addDays(d, -d.getDay());
const addMonths = (d, n) => new Date(d.getFullYear(), d.getMonth() + n, 1);
const minutesOf = (d) => d.getHours() * 60 + d.getMinutes();
const timeLabel = (d) => {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? 'AM' : 'PM';
  h = h % 12 || 12;
  return m ? `${h}:${pad(m)} ${ap}` : `${h} ${ap}`;
};
const apptLabel = (a) => a.title || a.customerName || EVENT_TYPE_MAP[a.type]?.label || 'Appointment';
const colorOf = (a) => EVENT_TYPE_COLORS[a.type] || EVENT_TYPE_COLORS.other;

// Greedy lane layout so overlapping appointments sit side-by-side.
function layoutDay(appts) {
  const items = appts
    .map((a) => { const d = toDate(a.start); const s = minutesOf(d); return { ...a, _s: s, _e: s + (Number(a.durationMin) || 60) }; })
    .sort((a, b) => a._s - b._s);
  const out = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const laneEnds = [];
    cluster.forEach((it) => {
      let lane = laneEnds.findIndex((end) => end <= it._s);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(it._e); } else laneEnds[lane] = it._e;
      it._lane = lane;
    });
    cluster.forEach((it) => { it._lanes = laneEnds.length; out.push(it); });
    cluster = [];
  };
  items.forEach((it) => {
    if (cluster.length && it._s >= clusterEnd) flush();
    cluster.push(it);
    clusterEnd = Math.max(clusterEnd, it._e);
  });
  flush();
  return out;
}

function DayColumn({ day, appts, onCreate, onOpen, canEdit }) {
  const events = layoutDay(appts);
  const onBg = (e) => {
    if (!canEdit) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    let mins = START_HOUR * 60 + Math.round(((y / HOUR_H) * 60) / 30) * 30;
    mins = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 30, mins));
    onCreate(`${dateKey(day)}T${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`);
  };
  return (
    <div className="cal-col" style={{ height: TOTAL_H }} onClick={onBg}>
      {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
        <div key={i} className="cal-hourline" style={{ top: i * HOUR_H }} />
      ))}
      {events.map((ev) => {
        const top = Math.max(0, ((ev._s - START_HOUR * 60) / 60) * HOUR_H);
        const height = Math.max(18, (ev.durationMin / 60) * HOUR_H - 2);
        const w = 100 / ev._lanes;
        return (
          <button
            key={ev.id}
            type="button"
            className="cal-event"
            style={{ top, height, left: `calc(${w * ev._lane}% + 1px)`, width: `calc(${w}% - 2px)`, background: colorOf(ev) }}
            onClick={(e) => { e.stopPropagation(); onOpen(ev); }}
            title={`${timeLabel(toDate(ev.start))} · ${apptLabel(ev)}`}
          >
            <span className="cal-event-time">{timeLabel(toDate(ev.start))}</span>
            <span className="cal-event-label">{apptLabel(ev)}</span>
          </button>
        );
      })}
    </div>
  );
}

function TimePlanner({ days, byDay, onCreate, onOpen, canEdit }) {
  const today = dateKey(new Date());
  return (
    <div className="cal-time">
      <div className="cal-time-inner" style={{ minWidth: days.length > 1 ? 56 + days.length * 92 : undefined }}>
        <div className="cal-time-head">
          <div className="cal-axis-head" />
          {days.map((d) => (
            <div key={dateKey(d)} className={`cal-dayhead ${dateKey(d) === today ? 'is-today' : ''}`}>
              <span className="cal-dayhead-dow">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="cal-dayhead-num">{d.getDate()}</span>
            </div>
          ))}
        </div>
        <div className="cal-time-body">
          <div className="cal-axis">
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div key={i} className="cal-hourlabel" style={{ height: HOUR_H }}>
                {timeLabel(new Date(2000, 0, 1, START_HOUR + i))}
              </div>
            ))}
          </div>
          {days.map((d) => (
            <DayColumn key={dateKey(d)} day={d} appts={byDay.get(dateKey(d)) || []} onCreate={onCreate} onOpen={onOpen} canEdit={canEdit} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthView({ anchor, byDay, onPickDay, onOpen }) {
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const todayKey = dateKey(new Date());
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <div className="cal-month">
      <div className="cal-weekday-row">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => <div key={w} className="cal-weekday">{w}</div>)}
      </div>
      <div className="cal-month-grid">
        {cells.map((d) => {
          const list = byDay.get(dateKey(d)) || [];
          const other = d.getMonth() !== anchor.getMonth();
          return (
            <div key={dateKey(d)} className={`cal-day-cell ${other ? 'is-other' : ''} ${dateKey(d) === todayKey ? 'is-today' : ''}`} onClick={() => onPickDay(d)}>
              <span className="cal-day-num">{d.getDate()}</span>
              <div className="cal-day-pills">
                {list.slice(0, 3).map((a) => (
                  <button key={a.id} type="button" className="cal-pill" style={{ background: colorOf(a) }}
                    onClick={(e) => { e.stopPropagation(); onOpen(a); }} title={apptLabel(a)}>
                    <span className="cal-pill-time">{timeLabel(toDate(a.start))}</span> {apptLabel(a)}
                  </button>
                ))}
                {list.length > 3 && <span className="cal-more">+{list.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Schedule() {
  const { appointments, loading } = useAppointments();
  const { can } = useAuth();
  const canEdit = can(CAP.JOB_EDIT);

  const [view, setView] = useState('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const [dialog, setDialog] = useState(null);

  const byDay = useMemo(() => {
    const map = new Map();
    appointments.forEach((a) => {
      const d = toDate(a.start);
      if (!d) return;
      const k = dateKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(a);
    });
    map.forEach((list) => list.sort((a, b) => (a.start < b.start ? -1 : 1)));
    return map;
  }, [appointments]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(anchor), i)), [anchor]);

  const shift = (dir) => {
    if (view === 'month') setAnchor((a) => addMonths(a, dir));
    else if (view === 'week') setAnchor((a) => addDays(a, dir * 7));
    else setAnchor((a) => addDays(a, dir));
  };

  const title = view === 'month'
    ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : view === 'day'
      ? anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      : `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  const openCreate = (start) => setDialog({ initial: { start } });
  const openEdit = (appt) => setDialog({ appointment: appt });

  return (
    <div className="page cal">
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p className="page-subtitle">Appointments across all jobs</p>
        </div>
      </div>

      <div className="cal-toolbar">
        <div className="cal-nav">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous"><Icon name="chevron-right" className="flip" /></button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAnchor(new Date())}>Today</button>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next"><Icon name="chevron-right" /></button>
          <span className="cal-title">{title}</span>
        </div>
        <div className="cal-toolbar-right">
          <div className="segmented cal-views">
            {['day', 'week', 'month'].map((v) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
          </div>
          {canEdit && (
            <Button variant="primary" size="sm" icon="plus" onClick={() => setDialog({ initial: { start: '' } })}>New</Button>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingBlock label="Loading schedule…" />
      ) : view === 'month' ? (
        <MonthView anchor={anchor} byDay={byDay} onPickDay={(d) => { setAnchor(d); setView('day'); }} onOpen={openEdit} />
      ) : (
        <TimePlanner days={view === 'day' ? [anchor] : weekDays} byDay={byDay} onCreate={openCreate} onOpen={openEdit} canEdit={canEdit} />
      )}

      <AppointmentDialog
        open={!!dialog}
        appointment={dialog?.appointment}
        initial={dialog?.initial}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
