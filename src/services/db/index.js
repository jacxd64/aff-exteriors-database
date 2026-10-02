// ===========================================================================
// Picks the active data backend. When Firebase env vars are present we use
// Firestore; otherwise the local browser store. Domain services import `db`
// from here and never know the difference.
// ===========================================================================
import { isFirebaseConfigured } from '../../firebase/config';
import localAdapter from './localAdapter';
import firebaseAdapter from './firebaseAdapter';

export const db = isFirebaseConfigured ? firebaseAdapter : localAdapter;
export const backendName = isFirebaseConfigured ? 'firebase' : 'local';
export { isFirebaseConfigured };
