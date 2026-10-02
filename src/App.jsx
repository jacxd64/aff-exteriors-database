// App root: providers + route table. Public /login; everything else is gated
// by <ProtectedRoute> and rendered inside the responsive <AppShell>.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import Login from './pages/Login';
import SharePage from './pages/SharePage';
import Dashboard from './pages/Dashboard';
import JobsList from './pages/JobsList';
import NewJob from './pages/NewJob';
import JobDetail from './pages/JobDetail';
import Schedule from './pages/Schedule';
import Installers from './pages/Installers';
import BidBuilder from './pages/BidBuilder';
import EmptyState from './components/ui/EmptyState';
import Button from './components/ui/Button';

function NotFound() {
  return (
    <div className="page">
      <EmptyState
        icon="alert"
        title="Page not found"
        message="That page doesn’t exist or has moved."
        action={<Button variant="primary" to="/">Back to dashboard</Button>}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/share/:token" element={<SharePage />} />
            <Route
              element={(
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              )}
            >
              <Route index element={<Dashboard />} />
              <Route path="jobs" element={<JobsList />} />
              <Route path="jobs/new" element={<NewJob />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="bid" element={<BidBuilder />} />
              <Route path="installers" element={<Installers />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
