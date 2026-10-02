// ===========================================================================
// Lazy Firebase initialization. Nothing initializes until getFirebase() is
// called, and it's only ever called when isFirebaseConfigured is true — so
// local-store mode never touches the Firebase SDK.
// ===========================================================================
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig, { isFirebaseConfigured } from './config';

let services = null;

export function getFirebase() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values to .env.local.');
  }
  if (services) return services;
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  services = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    storage: getStorage(app),
  };
  return services;
}
