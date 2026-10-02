// Login page. Local mode: pick a name + role (or a one-tap demo account).
// Firebase mode: sign in with Google (an admin must add you as a team member
// before you can see any data).
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isFirebaseConfigured } from '../firebase/config';
import { DEMO_USERS } from '../services/authService';
import { ROLES } from '../utils/constants';
import { Field, Input, Select } from '../components/ui/Field';
import Button from '../components/ui/Button';

// Google "G" mark for the sign-in button.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Local-mode form state
  const [name, setName] = useState('');
  const [role, setRole] = useState('office');

  const go = async (credentials) => {
    setBusy(true);
    setError('');
    try {
      await signIn(credentials);
      navigate(from, { replace: true });
    } catch (err) {
      // A popup the user closes themselves isn't an error worth shouting about.
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setError('');
      } else {
        setError(err?.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  const submitLocal = (e) => {
    e.preventDefault();
    go({ displayName: name || 'Team Member', role });
  };

  return (
    <div className="login-screen">
      <div className="login-card card">
        <div className="login-brand">
          <span className="topbar-logo" style={{ width: 44, height: 44, fontSize: '1rem' }}>AE</span>
          <div>
            <h1>Affordable Exteriors</h1>
            <p className="muted text-sm">Job &amp; customer database</p>
          </div>
        </div>

        {isFirebaseConfigured ? (
          <div className="stack stack-4">
            <p className="muted text-sm">Sign in with your work Google account to continue.</p>
            <Button variant="secondary" size="lg" block disabled={busy} onClick={() => go()}>
              <span className="login-google">
                <GoogleMark />
                {busy ? 'Signing in…' : 'Continue with Google'}
              </span>
            </Button>
            {error && <p className="field-error">{error}</p>}
            <p className="muted text-xs">
              New here? An administrator needs to add you as a team member before you can see jobs.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={submitLocal} className="stack stack-4">
              <Field label="Your name" htmlFor="name" hint="Local demo mode — no password needed.">
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dave" />
              </Field>
              <Field label="Role" htmlFor="role">
                <Select id="role" value={role} onChange={(e) => setRole(e.target.value)} options={ROLES} />
              </Field>

              {error && <p className="field-error">{error}</p>}

              <Button type="submit" variant="primary" size="lg" block disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            <div className="login-demos">
              <div className="login-divider"><span>or use a demo account</span></div>
              <div className="grid login-demo-grid">
                {DEMO_USERS.map((u) => (
                  <Button key={u.uid} variant="secondary" size="sm" disabled={busy}
                    onClick={() => go({ uid: u.uid, displayName: u.displayName, email: u.email, role: u.role })}>
                    {u.displayName}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
