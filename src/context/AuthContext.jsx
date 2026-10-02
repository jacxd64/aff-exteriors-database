// ===========================================================================
// Auth context: subscribes to the auth service and exposes the current user,
// loading state, sign in/out, and a capability checker `can(capability)`.
// ===========================================================================
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import { can as canDo } from '../utils/permissions';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = authService.subscribe((u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      signIn: (credentials) => authService.signIn(credentials),
      signOut: () => authService.signOut(),
      can: (capability) => canDo(user?.role, capability),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
