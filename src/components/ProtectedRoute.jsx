// Gate routes behind authentication. Redirects to /login when signed out, and
// shows a "not provisioned yet" screen for users who authenticated but haven't
// been granted a role by an admin (only possible in Firebase mode).
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingBlock } from './ui/Spinner';
import NotProvisioned from '../pages/NotProvisioned';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, role } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingBlock label="Loading…" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!role) {
    // Authenticated, but no role assigned yet — not a team member.
    return <NotProvisioned />;
  }
  return children;
}
