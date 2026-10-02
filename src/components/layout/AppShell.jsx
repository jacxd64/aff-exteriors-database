// ===========================================================================
// AppShell — the responsive frame. Desktop: left sidebar. Mobile: top bar +
// hamburger drawer + bottom tab nav + floating "add" button.
// ===========================================================================
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_ITEMS } from './navItems';
import { ROLE_MAP } from '../../utils/constants';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import GlobalSearch from './GlobalSearch';

function avatarInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function NavList({ onNavigate }) {
  return (
    <nav className="stack stack-2">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          onClick={onNavigate}
        >
          <span className="nav-icon">
            <Icon name={item.icon} />
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function UserFooter({ user, onSignOut }) {
  return (
    <div className="user-footer">
      <div className="row gap-2">
        <span className="topbar-user" aria-hidden="true">{avatarInitials(user?.displayName)}</span>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="fw-600 truncate">{user?.displayName || 'Signed in'}</div>
          <div className="text-xs subtle">{ROLE_MAP[user?.role]?.label || 'Team member'}</div>
        </div>
      </div>
      <Button variant="ghost" icon="log-out" size="sm" onClick={onSignOut} className="full-width mt-2">
        Sign out
      </Button>
    </div>
  );
}

export default function AppShell() {
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();

  const closeDrawer = () => setDrawerOpen(false);
  const handleSignOut = () => {
    closeDrawer();
    signOut();
  };

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <button
          type="button"
          className="icon-btn hamburger hide-desktop"
          aria-label="Open menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon name="menu" size={22} />
        </button>

        <div className="topbar-brand">
          <span className="topbar-logo">AE</span>
          <span className="hide-mobile">Affordable Exteriors</span>
        </div>

        <div className="topbar-search hide-mobile">
          <GlobalSearch />
        </div>

        <div className="topbar-spacer" />

        <button
          type="button"
          className="icon-btn hide-desktop"
          aria-label="Search"
          onClick={() => navigate('/jobs')}
        >
          <Icon name="search" size={22} />
        </button>

        <span className="topbar-user hide-mobile" title={user?.displayName} aria-hidden="true">
          {avatarInitials(user?.displayName)}
        </span>
      </header>

      {/* Body: sidebar (desktop) + main */}
      <div className="shell-body">
        <aside className="sidebar">
          <Button variant="primary" icon="plus" to="/jobs/new" className="sidebar-add full-width">
            Add New Job
          </Button>
          <NavList />
          <div className="sidebar-foot">
            <UserFooter user={user} onSignOut={handleSignOut} />
          </div>
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="drawer-overlay" onClick={closeDrawer} />
          <div className="drawer">
            <div className="drawer-head">
              <div className="topbar-brand">
                <span className="topbar-logo">AE</span>
                <span>Affordable Exteriors</span>
              </div>
              <button type="button" className="icon-btn" aria-label="Close menu" onClick={closeDrawer}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <Button variant="primary" icon="plus" to="/jobs/new" className="full-width mb-4" onClick={closeDrawer}>
              Add New Job
            </Button>
            <NavList onNavigate={closeDrawer} />
            <div className="sidebar-foot" style={{ marginTop: 'auto' }}>
              <UserFooter user={user} onSignOut={handleSignOut} />
            </div>
          </div>
        </>
      )}

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="nav-icon">
              <Icon name={item.icon} />
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile floating add button */}
      <button type="button" className="fab" aria-label="Add new job" onClick={() => navigate('/jobs/new')}>
        <Icon name="plus" size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
