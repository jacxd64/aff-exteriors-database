// ===========================================================================
// Firebase (Firestore) adapter. Implements the same surface as localAdapter.
// Only used when isFirebaseConfigured is true, so getFirebase() never throws
// here in local mode.
//
// `path` is a slash-delimited collection path: "jobs" or "jobs/<id>/timeline".
// ===========================================================================
import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, deleteDoc,
  query, where as fbWhere, orderBy as fbOrderBy, limit as fbLimit, onSnapshot,
} from 'firebase/firestore';
import { getFirebase } from '../../firebase/init';

function collRef(path) {
  const { db } = getFirebase();
  return collection(db, ...path.split('/'));
}
function docRef(path, id) {
  const { db } = getFirebase();
  return doc(db, ...path.split('/'), id);
}

function buildQuery(path, options = {}) {
  const constraints = [];
  if (options.where) {
    for (const [field, op, value] of options.where) constraints.push(fbWhere(field, op, value));
  }
  if (options.orderBy) {
    const [field, dir = 'asc'] = options.orderBy;
    constraints.push(fbOrderBy(field, dir));
  }
  if (options.limit) constraints.push(fbLimit(options.limit));
  return query(collRef(path), ...constraints);
}

function snapToDocs(snap) {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const firebaseAdapter = {
  async list(path, options) {
    const snap = await getDocs(buildQuery(path, options));
    return snapToDocs(snap);
  },

  async get(path, id) {
    const snap = await getDoc(docRef(path, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async add(path, data) {
    const ref = await addDoc(collRef(path), data);
    return ref.id;
  },

  async set(path, id, data) {
    await setDoc(docRef(path, id), data);
    return id;
  },

  async update(path, id, partial) {
    // merge:true mirrors localAdapter's deep merge of nested maps.
    await setDoc(docRef(path, id), partial, { merge: true });
    return id;
  },

  async remove(path, id) {
    await deleteDoc(docRef(path, id));
  },

  subscribe(path, options, cb) {
    return onSnapshot(buildQuery(path, options), (snap) => cb(snapToDocs(snap)), (err) =>
      console.error('Firestore subscribe error on', path, err),
    );
  },
};

export default firebaseAdapter;
