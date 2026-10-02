// ===========================================================================
// Firebase Cloud Storage operations (only used in Firebase mode). The Storage
// SDK is loaded lazily so local mode never pulls it in. Uploads are resumable
// and report progress; the ORIGINAL bytes are sent untouched (no compression).
// ===========================================================================
import { getFirebase } from '../firebase/init';

let mod = null;
async function load() {
  if (!mod) mod = await import('firebase/storage');
  return mod;
}

// Upload a File/Blob to `path`. Returns { url, path }. onProgress(0-100) optional.
export async function uploadFile(path, data, { onProgress, contentType } = {}) {
  const { ref, uploadBytesResumable, getDownloadURL } = await load();
  const { storage } = getFirebase();
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, data, contentType ? { contentType } : undefined);
  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve,
    );
  });
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteFile(path) {
  if (!path) return;
  const { ref, deleteObject } = await load();
  const { storage } = getFirebase();
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* already gone — ignore */
  }
}
