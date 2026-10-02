// ===========================================================================
// Public photo share links. A share is a Firestore doc keyed by a long,
// unguessable token. It holds ONLY the selected photos' (already-public)
// download URLs plus a title/note — no other job or customer data. The public
// /share/:token page reads it by token (rules allow GET but not LIST), so the
// rest of the app stays locked down.
// ===========================================================================
import { db } from './db';

const COLLECTION = 'shares';
const nowIso = () => new Date().toISOString();

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
function randomToken(len = 22) {
  const cryptoObj = (typeof window !== 'undefined' && (window.crypto || window.msCrypto)) || null;
  const bytes = new Uint8Array(len);
  if (cryptoObj?.getRandomValues) cryptoObj.getRandomValues(bytes);
  else for (let i = 0; i < len; i += 1) bytes[i] = Math.floor(Math.random() * 256); // fallback
  let out = '';
  for (let i = 0; i < len; i += 1) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

const sharesService = {
  async create({ jobId, title, note, photos, expiresInDays }, user) {
    const token = randomToken();
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : '';
    const doc = {
      jobId: jobId || '',
      company: 'Affordable Exteriors',
      title: (title || 'Shared photos').trim(),
      note: (note || '').trim(),
      photos: (photos || []).map((p) => ({
        url: p.url,
        thumbURL: p.thumbURL || p.url,
        name: p.name || 'photo',
      })),
      createdBy: user?.displayName || 'Unknown',
      createdAt: nowIso(),
      expiresAt,
      revoked: false,
    };
    await db.set(COLLECTION, token, doc);
    return { token, ...doc };
  },

  async get(token) {
    return db.get(COLLECTION, token);
  },

  // Staff-only listing for managing a job's links.
  async listByJob(jobId) {
    const all = await db.list(COLLECTION).catch(() => []);
    return all
      .filter((s) => s.jobId === jobId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },

  async revoke(token) {
    await db.update(COLLECTION, token, { revoked: true });
  },

  async remove(token) {
    await db.remove(COLLECTION, token);
  },
};

export default sharesService;
