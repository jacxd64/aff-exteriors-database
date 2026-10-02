// Shown when someone signs in with Google successfully but an admin hasn't yet
// added them as a team member (no users/{uid} doc → no role). They can read or
// change nothing until they're provisioned, so we explain and offer sign-out.
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Icon from '../components/ui/Icon';

export default function NotProvisioned() {
  const { user, signOut } = useAuth();
  return (
    <div className="login-screen">
      <div className="login-card card stack stack-4" style={{ textAlign: 'center' }}>
        <div className="provision-badge"><Icon name="shield" size={26} /></div>
        <div>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>You&rsquo;re almost in</h1>
          <p className="muted">
            You&rsquo;re signed in as{' '}
            <strong>{user?.email || user?.displayName || 'your account'}</strong>, but it hasn&rsquo;t
            been added to Affordable Exteriors yet.
          </p>
        </div>
        <p className="muted text-sm">
          Ask an administrator to add you as a team member, then sign in again.
        </p>
        <Button variant="secondary" block onClick={() => signOut()}>Sign out</Button>
      </div>
    </div>
  );
}
