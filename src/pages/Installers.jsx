// Contractor / crew bank — a simple list of the crews and subs you work with,
// which you can assign to installs and deliveries on the schedule.
import { useState } from 'react';
import { useInstallers } from '../hooks/useInstallers';
import { useAuth } from '../context/AuthContext';
import { CAP } from '../utils/permissions';
import { formatPhone } from '../utils/format';
import { TRADE_MAP } from '../utils/constants';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { LoadingBlock } from '../components/ui/Spinner';
import InstallerDialog from '../components/jobs/InstallerDialog';

export default function Installers() {
  const { installers, loading } = useInstallers();
  const { can } = useAuth();
  const canEdit = can(CAP.INSTALLER_EDIT);
  const [dialog, setDialog] = useState(null); // { installer } | {} | null

  const sorted = [...installers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Installers</h1>
          <p className="page-subtitle">Contractors &amp; crews you assign to installs and deliveries</p>
        </div>
        {canEdit && <Button variant="primary" icon="plus" onClick={() => setDialog({})}>Add contractor</Button>}
      </div>

      {loading ? (
        <LoadingBlock label="Loading contractors…" />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="installers"
          title="No contractors yet"
          message={canEdit
            ? 'Add the crews and subs you work with, then assign them to installs and deliveries on the schedule.'
            : 'No contractors have been added yet.'}
          action={canEdit && <Button variant="primary" icon="plus" onClick={() => setDialog({})}>Add contractor</Button>}
        />
      ) : (
        <div className="installer-list">
          {sorted.map((c) => (
            <div key={c.id} className={`installer-card ${c.active === false ? 'is-inactive' : ''}`}>
              <button type="button" className="installer-main" disabled={!canEdit} onClick={() => canEdit && setDialog({ installer: c })}>
                <span className="installer-name">
                  {c.name}
                  {c.active === false && <span className="badge badge-neutral">Inactive</span>}
                </span>
                {c.phone && <span className="installer-phone">{formatPhone(c.phone)}</span>}
                {c.trades?.length ? <span className="installer-trades">{c.trades.map((t) => TRADE_MAP[t]?.label || t).join(' · ')}</span> : null}
                {c.notes && <span className="installer-notes">{c.notes}</span>}
              </button>
              {c.phone && (
                <a className="icon-btn" href={`tel:${String(c.phone).replace(/\D/g, '')}`} aria-label={`Call ${c.name}`}>
                  <Icon name="phone" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      <InstallerDialog open={!!dialog} installer={dialog?.installer} onClose={() => setDialog(null)} />
    </div>
  );
}
