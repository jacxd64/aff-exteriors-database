// ===========================================================================
// Share-link previews. Link previewers (iMessage, Facebook, email) read the raw
// HTML and never run the app, so every /share/:token link used to preview as
// the generic site title. This function serves the normal app shell with the
// share's own title + description injected as Open Graph tags. The browser
// still boots the React app exactly as before.
// ===========================================================================
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { buildShareMeta, injectMeta } from './shareMeta.js';

initializeApp();
const db = getFirestore();

const SITE = 'https://aff-exteriors.web.app';
let shell = { html: '', at: 0 };

// The built index.html lives on Hosting (asset hashes change every build), so
// fetch it rather than bundling a copy. Cached briefly per instance.
async function getShell() {
  if (shell.html && Date.now() - shell.at < 5 * 60 * 1000) return shell.html;
  const res = await fetch(`${SITE}/index.html`);
  if (!res.ok) throw new Error(`shell fetch ${res.status}`);
  shell = { html: await res.text(), at: Date.now() };
  return shell.html;
}

export const sharePreview = onRequest({ region: 'us-central1', memory: '256MiB', invoker: 'public' }, async (req, res) => {
  const token = (req.path.split('/share/')[1] || '').split('/')[0];
  let share = null;
  try {
    if (/^[A-Za-z0-9]{10,64}$/.test(token)) {
      const snap = await db.collection('shares').doc(token).get();
      share = snap.exists ? snap.data() : null;
    }
  } catch (err) {
    console.error('share lookup failed', err);
  }
  try {
    const html = injectMeta(await getShell(), buildShareMeta(share, `${SITE}/share/${token}`, SITE));
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).send(html);
  } catch (err) {
    console.error('shell failed', err);
    res.redirect(302, `${SITE}/`);
  }
});
