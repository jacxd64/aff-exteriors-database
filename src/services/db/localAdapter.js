// ===========================================================================
// Local data adapter — a tiny Firestore-like store backed by localStorage.
//
// It implements the same surface the Firebase adapter does (list/get/add/
// set/update/remove/subscribe) so domain services don't care which backend is
// active. Data is namespaced per "collection path" (e.g. "jobs" or
// "jobs/<id>/timeline"). Subscriptions re-run their query on every mutation,
// including changes from other browser tabs.
// ===========================================================================
import { generateId } from '../../utils/jobHelpers';

const PREFIX = 'affdb:';
const cache = new Map(); // path -> array of docs
const subscribers = new Map(); // path -> Set<{ options, cb }>

function keyFor(path) {
  return PREFIX + path;
}

function readPath(path) {
  if (cache.has(path)) return cache.get(path);
  let docs = [];
  try {
    const raw = localStorage.getItem(keyFor(path));
    docs = raw ? JSON.parse(raw) : [];
  } catch {
    docs = [];
  }
  cache.set(path, docs);
  return docs;
}

function writePath(path, docs) {
  cache.set(path, docs);
  try {
    localStorage.setItem(keyFor(path), JSON.stringify(docs));
  } catch (err) {
    // Most likely a quota error (e.g. too many base64 photos). Surface clearly.
    console.error('Local store write failed for', path, err);
    throw err;
  }
  notify(path);
}

// --- Query engine ----------------------------------------------------------
function getField(obj, field) {
  return field.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

function matchesWhere(doc, clause) {
  const [field, op, value] = clause;
  const v = getField(doc, field);
  switch (op) {
    case '==': return v === value;
    case '!=': return v !== value;
    case '>': return v > value;
    case '>=': return v >= value;
    case '<': return v < value;
    case '<=': return v <= value;
    case 'array-contains': return Array.isArray(v) && v.includes(value);
    case 'array-contains-any': return Array.isArray(v) && value.some((x) => v.includes(x));
    case 'in': return Array.isArray(value) && value.includes(v);
    default: return true;
  }
}

function applyQuery(docs, options = {}) {
  let result = docs.slice();
  if (options.where) {
    for (const clause of options.where) {
      result = result.filter((doc) => matchesWhere(doc, clause));
    }
  }
  if (options.orderBy) {
    const [field, dir = 'asc'] = options.orderBy;
    result.sort((a, b) => {
      const av = getField(a, field);
      const bv = getField(b, field);
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      const cmp = av < bv ? -1 : 1;
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  if (options.limit) result = result.slice(0, options.limit);
  return result;
}

// --- Pub/sub ---------------------------------------------------------------
function notify(path) {
  const subs = subscribers.get(path);
  if (!subs) return;
  const docs = readPath(path);
  subs.forEach(({ options, cb }) => cb(applyQuery(docs, options)));
}

// React to changes from other tabs.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return;
    const path = e.key.slice(PREFIX.length);
    cache.delete(path);
    notify(path);
  });
}

// --- Public API ------------------------------------------------------------
const localAdapter = {
  async list(path, options) {
    return applyQuery(readPath(path), options);
  },

  async get(path, id) {
    return readPath(path).find((d) => d.id === id) || null;
  },

  async add(path, data) {
    const id = data.id || generateId(path.split('/').pop());
    const doc = { ...data, id };
    const docs = readPath(path);
    writePath(path, [...docs, doc]);
    return id;
  },

  async set(path, id, data) {
    const docs = readPath(path);
    const idx = docs.findIndex((d) => d.id === id);
    const doc = { ...data, id };
    if (idx === -1) writePath(path, [...docs, doc]);
    else {
      const next = docs.slice();
      next[idx] = doc;
      writePath(path, next);
    }
    return id;
  },

  async update(path, id, partial) {
    const docs = readPath(path);
    const idx = docs.findIndex((d) => d.id === id);
    if (idx === -1) throw new Error(`Document ${id} not found in ${path}`);
    const next = docs.slice();
    next[idx] = deepMerge(next[idx], partial);
    writePath(path, next);
    return id;
  },

  async remove(path, id) {
    const docs = readPath(path);
    writePath(path, docs.filter((d) => d.id !== id));
  },

  subscribe(path, options, cb) {
    if (!subscribers.has(path)) subscribers.set(path, new Set());
    const entry = { options, cb };
    subscribers.get(path).add(entry);
    // Fire immediately with current data.
    Promise.resolve().then(() => cb(applyQuery(readPath(path), options)));
    return () => {
      const subs = subscribers.get(path);
      if (subs) subs.delete(entry);
    };
  },
};

// Merge that replaces arrays wholesale but merges nested plain objects, so
// updating job.contract.signed doesn't wipe the rest of job.contract.
function deepMerge(target, patch) {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
      out[k] = deepMerge(target[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default localAdapter;
