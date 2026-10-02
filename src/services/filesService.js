// ===========================================================================
// Photos & documents for a job. Metadata lives in Firestore subcollections
// (jobs/{id}/photos, jobs/{id}/documents); the actual files live in Cloud
// Storage (Firebase mode) or are inlined as downscaled data URLs (local/dev).
//
// Firebase mode stores the FULL-RESOLUTION original untouched, plus a small
// thumbnail for fast gallery loading. No compression is applied to originals.
// ===========================================================================
import { db } from './db';
import { isFirebaseConfigured } from '../firebase/config';
import * as fileStore from './fileStore';
import { makeThumbnailBlob, makeDataURL } from '../utils/imageUtils';
import { generateId } from '../utils/jobHelpers';

const photosPath = (jobId) => `jobs/${jobId}/photos`;
const docsPath = (jobId) => `jobs/${jobId}/documents`;
const timelinePath = (jobId) => `jobs/${jobId}/timeline`;
const nowIso = () => new Date().toISOString();
const extOf = (name) => {
  const m = /\.([a-z0-9]+)$/i.exec(name || '');
  return m ? m[1].toLowerCase() : '';
};

async function addTimeline(jobId, entry) {
  return db.add(timelinePath(jobId), { at: nowIso(), ...entry });
}
async function bump(jobId) {
  try { await db.update('jobs', jobId, { updatedAt: nowIso() }); } catch { /* non-fatal */ }
}

const filesService = {
  subscribePhotos(jobId, cb) {
    return db.subscribe(photosPath(jobId), { orderBy: ['uploadedAt', 'desc'] }, cb);
  },
  subscribeDocuments(jobId, cb) {
    return db.subscribe(docsPath(jobId), { orderBy: ['uploadedAt', 'desc'] }, cb);
  },

  // Upload one photo. Original is stored full-quality; a thumbnail is generated
  // for the grid. onProgress(0-100) reports the original's upload progress.
  async addPhoto(jobId, file, { category = 'other', user, onProgress } = {}) {
    const id = generateId('photo');
    const ext = extOf(file.name) || 'jpg';
    let url;
    let thumbURL;
    let path = '';
    let thumbPath = '';

    if (isFirebaseConfigured) {
      const thumb = await makeThumbnailBlob(file, 1024);
      const orig = await fileStore.uploadFile(`${photosPath(jobId)}/${id}.${ext}`, file, {
        onProgress, contentType: file.type || 'image/jpeg',
      });
      url = orig.url;
      path = orig.path;
      if (thumb) {
        const t = await fileStore.uploadFile(`${photosPath(jobId)}/${id}_thumb.jpg`, thumb, { contentType: 'image/jpeg' });
        thumbURL = t.url;
        thumbPath = t.path;
      } else {
        thumbURL = url;
      }
    } else {
      // Local/dev only: downscale so it fits the browser store. Real quality is
      // preserved in Firebase mode.
      url = await makeDataURL(file, 1400);
      thumbURL = await makeDataURL(file, 480);
      onProgress?.(100);
    }

    const meta = {
      id, name: file.name, category, contentType: file.type, size: file.size,
      url, thumbURL, path, thumbPath,
      uploadedBy: user?.displayName || 'Unknown', uploadedAt: nowIso(),
    };
    await db.set(photosPath(jobId), id, meta);
    await bump(jobId);
    return meta;
  },

  async addDocument(jobId, file, { category = 'other', user, onProgress } = {}) {
    const id = generateId('doc');
    const ext = extOf(file.name);
    let url;
    let path = '';

    if (isFirebaseConfigured) {
      const up = await fileStore.uploadFile(`${docsPath(jobId)}/${id}${ext ? `.${ext}` : ''}`, file, {
        onProgress, contentType: file.type || 'application/octet-stream',
      });
      url = up.url;
      path = up.path;
    } else {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('In local demo mode, documents over 2 MB can’t be stored. This works fully once Firebase Storage is on.');
      }
      url = await makeDataURL(file);
      onProgress?.(100);
    }

    const meta = {
      id, name: file.name, category, contentType: file.type, size: file.size,
      ext, url, path,
      uploadedBy: user?.displayName || 'Unknown', uploadedAt: nowIso(),
    };
    await db.set(docsPath(jobId), id, meta);
    await bump(jobId);
    return meta;
  },

  // One timeline entry after a batch upload (avoids per-file spam).
  async logUploads(jobId, kind, count, user) {
    if (!count) return;
    await addTimeline(jobId, {
      type: kind === 'photo' ? 'photo' : 'document',
      text: `${count} ${kind}${count === 1 ? '' : 's'} added`,
      user: user?.displayName || 'Unknown',
    });
  },

  async deletePhoto(jobId, meta, { user } = {}) {
    await db.remove(photosPath(jobId), meta.id);
    if (isFirebaseConfigured) {
      await fileStore.deleteFile(meta.path);
      await fileStore.deleteFile(meta.thumbPath);
    }
    await addTimeline(jobId, { type: 'photo', text: `Photo removed: ${meta.name}`, user: user?.displayName || 'Unknown' });
    await bump(jobId);
  },

  async deleteDocument(jobId, meta, { user } = {}) {
    await db.remove(docsPath(jobId), meta.id);
    if (isFirebaseConfigured) await fileStore.deleteFile(meta.path);
    await addTimeline(jobId, { type: 'document', text: `Document removed: ${meta.name}`, user: user?.displayName || 'Unknown' });
    await bump(jobId);
  },
};

export default filesService;
