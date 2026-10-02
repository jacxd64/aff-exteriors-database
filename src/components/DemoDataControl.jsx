// Admin-only banner (Firebase mode only) to load or remove sample data so a
// fresh project can be explored with realistic jobs, then wiped clean. Renders
// nothing in local mode, for non-admins, or once real (non-sample) data exists.
import { useState } from 'react';
import { backendName } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { seedDemoData, removeDemoData } from '../services/demoSeed';
import Button from './ui/Button';
import Icon from './ui/Icon';

export default function DemoDataControl({ jobs }) {
  const { user, role } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (backendName !== 'firebase' || role !== 'admin') return null;

  const hasSamples = jobs.some((j) => j.sampleData);
  const empty = jobs.length === 0;
  if (!empty && !hasSamples) return null;

  const load = async () => {
    setBusy(true);
    try {
      const n = await seedDemoData(user);
      toast.success(`Loaded ${n} sample jobs.`);
    } catch (err) {
      toast.error(err?.message || 'Could not load sample data.');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      const n = await removeDemoData();
      toast.success(`Removed ${n} sample jobs.`);
    } catch (err) {
      toast.error(err?.message || 'Could not remove sample data.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="demo-banner">
      <span className="demo-banner-icon"><Icon name="package" size={18} /></span>
      {hasSamples ? (
        <>
          <div className="demo-banner-text">
            <strong>Sample data loaded.</strong>{' '}
            <span className="muted text-sm">
              These example jobs are tagged as samples — remove them when you&rsquo;re ready for real data.
            </span>
          </div>
          <Button variant="secondary" size="sm" icon="trash" disabled={busy} onClick={clear}>
            {busy ? 'Removing…' : 'Remove sample data'}
          </Button>
        </>
      ) : (
        <>
          <div className="demo-banner-text">
            <strong>Want to explore with example jobs?</strong>{' '}
            <span className="muted text-sm">
              Load a set of realistic sample jobs to see how everything works. You can remove them anytime.
            </span>
          </div>
          <Button variant="primary" size="sm" icon="plus" disabled={busy} onClick={load}>
            {busy ? 'Loading…' : 'Load sample data'}
          </Button>
        </>
      )}
    </div>
  );
}
