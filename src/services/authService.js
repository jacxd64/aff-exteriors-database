// ===========================================================================
// Auth service. In local mode it's a lightweight mock (pick a name + role,
// no password). When Firebase is configured it uses Google sign-in and reads
// the user's role from the users/{uid} document — a user is only a "team
// member" once an admin has created that doc. Same interface either way:
//   subscribe(cb) -> unsubscribe   (cb receives the user object or null)
//   signIn(credentials?) -> Promise<user>   (no args needed for Google)
//   signOut() -> Promise<void>
// ===========================================================================
import { isFirebaseConfigured } from '../firebase/config';
import { db } from './db';

const LOCAL_USER_KEY = 'affdb:auth:user';

// Demo accounts offered as quick-login buttons in local mode.
export const DEMO_USERS = [
  { uid: 'demo-admin', displayName: 'Avery (Admin)', email: 'admin@aff.local', role: 'admin' },
  { uid: 'demo-office', displayName: 'Jordan (Office)', email: 'office@aff.local', role: 'office' },
  { uid: 'demo-sales', displayName: 'Dave (Sales/Field)', email: 'dave@aff.local', role: 'sales' },
  { uid: 'demo-pm', displayName: 'Mike (Project Mgr)', email: 'mike@aff.local', role: 'pm' },
];

// --------------------------------------------------------------------------
// Local (mock) implementation
// --------------------------------------------------------------------------
function createLocalAuth() {
  const listeners = new Set();
  let current = null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    current = raw ? JSON.parse(raw) : null;
  } catch {
    current = null;
  }

  const emit = () => listeners.forEach((cb) => cb(current));

  return {
    subscribe(cb) {
      listeners.add(cb);
      Promise.resolve().then(() => cb(current));
      return () => listeners.delete(cb);
    },
    async signIn(credentials) {
      const user = {
        uid: credentials.uid || `local-${Date.now().toString(36)}`,
        displayName: credentials.displayName?.trim() || 'Team Member',
        email: credentials.email || '',
        role: credentials.role || 'office',
      };
      current = user;
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
      emit();
      return user;
    },
    async signOut() {
      current = null;
      localStorage.removeItem(LOCAL_USER_KEY);
      emit();
    },
    getCurrentUser() {
      return current;
    },
  };
}

// --------------------------------------------------------------------------
// Firebase implementation (used only when configured)
// --------------------------------------------------------------------------
function createFirebaseAuth() {
  // Imported lazily so local mode never loads firebase/auth helpers it won't use.
  let helpers = null;
  async function load() {
    if (helpers) return helpers;
    const authMod = await import('firebase/auth');
    const { getFirebase } = await import('../firebase/init');
    helpers = { ...authMod, auth: getFirebase().auth };
    return helpers;
  }

  async function withRole(fbUser) {
    if (!fbUser) return null;
    // role stays null until an admin provisions a users/{uid} doc. A signed-in
    // Google user with no doc is authenticated but NOT yet a team member.
    let role = null;
    let provisioned = false;
    try {
      const profile = await db.get('users', fbUser.uid);
      if (profile?.role) {
        role = profile.role;
        provisioned = true;
      }
    } catch {
      /* leave unprovisioned */
    }
    return {
      uid: fbUser.uid,
      displayName: fbUser.displayName || fbUser.email,
      email: fbUser.email,
      photoURL: fbUser.photoURL || '',
      role,
      provisioned,
    };
  }

  return {
    subscribe(cb) {
      let unsub = () => {};
      load().then(({ onAuthStateChanged, auth }) => {
        unsub = onAuthStateChanged(auth, async (fbUser) => cb(await withRole(fbUser)));
      });
      return () => unsub();
    },
    async signIn() {
      const { signInWithPopup, GoogleAuthProvider, auth } = await load();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      return withRole(cred.user);
    },
    async signOut() {
      const { signOut, auth } = await load();
      await signOut(auth);
    },
    getCurrentUser() {
      return null;
    },
  };
}

const authService = isFirebaseConfigured ? createFirebaseAuth() : createLocalAuth();
export default authService;
