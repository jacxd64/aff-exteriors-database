// ===========================================================================
// Image helpers for generating SMALL copies (thumbnails / local previews).
// The original File is never modified — these always produce a separate, new
// downscaled image. Orientation is corrected so iPhone photos aren't sideways.
// ===========================================================================

async function loadBitmap(file) {
  // createImageBitmap with 'from-image' applies the EXIF orientation for us.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> */
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function scaledSize(w, h, maxPx) {
  if (w <= maxPx && h <= maxPx) return { w, h };
  const r = w > h ? maxPx / w : maxPx / h;
  return { w: Math.max(1, Math.round(w * r)), h: Math.max(1, Math.round(h * r)) };
}

async function drawScaled(file, maxPx) {
  const bmp = await loadBitmap(file);
  const w = bmp.width || bmp.naturalWidth;
  const h = bmp.height || bmp.naturalHeight;
  const { w: dw, h: dh } = scaledSize(w, h, maxPx);
  const canvas = document.createElement('canvas');
  canvas.width = dw;
  canvas.height = dh;
  canvas.getContext('2d').drawImage(bmp, 0, 0, dw, dh);
  if (bmp.close) bmp.close();
  return canvas;
}

// A downscaled JPEG Blob — used for fast-loading gallery thumbnails (Firebase
// mode). Returns null for non-images.
export async function makeThumbnailBlob(file, maxPx = 1024, quality = 0.72) {
  if (!file.type?.startsWith('image/')) return null;
  const canvas = await drawScaled(file, maxPx);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

// A data URL — used for local/dev mode previews (no cloud storage). Images are
// downscaled to keep them small; small non-images are inlined as-is.
export async function makeDataURL(file, maxPx = 1400, quality = 0.85) {
  if (!file.type?.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }
  const canvas = await drawScaled(file, maxPx);
  return canvas.toDataURL('image/jpeg', quality);
}
