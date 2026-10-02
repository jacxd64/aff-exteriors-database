// Public, login-free photo gallery for a share link (/share/:token). Renders
// ONLY the shared photos — no app navigation or data. Handles loading,
// not-found, revoked, and expired states.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import sharesService from '../services/sharesService';
import { toDate, formatDate } from '../utils/format';
import { LoadingBlock } from '../components/ui/Spinner';
import Icon from '../components/ui/Icon';
import Lightbox from '../components/jobs/Lightbox';

function Shell({ children }) {
  return (
    <div className="share-screen">
      <header className="share-header">
        <span className="topbar-logo">AE</span>
        <strong>Affordable Exteriors</strong>
      </header>
      {children}
    </div>
  );
}

export default function SharePage() {
  const { token } = useParams();
  const [share, setShare] = useState(undefined); // undefined = loading, null = missing
  const [idx, setIdx] = useState(null);

  useEffect(() => {
    let alive = true;
    sharesService.get(token)
      .then((s) => { if (alive) setShare(s || null); })
      .catch(() => { if (alive) setShare(null); });
    return () => { alive = false; };
  }, [token]);

  if (share === undefined) {
    return <Shell><div className="share-msg"><LoadingBlock label="Loading photos…" /></div></Shell>;
  }

  const expDate = share?.expiresAt ? toDate(share.expiresAt) : null;
  const expired = expDate && expDate < new Date();
  if (!share || share.revoked || expired) {
    return (
      <Shell>
        <div className="share-msg share-card">
          <span className="provision-badge"><Icon name="alert" size={26} /></span>
          <h1>This link isn’t available</h1>
          <p className="muted">
            {expired ? 'This photo link has expired.' : 'This photo link is no longer active.'}
            {' '}Please contact us for an updated link.
          </p>
        </div>
      </Shell>
    );
  }

  const photos = share.photos || [];
  return (
    <Shell>
      <main className="share-main">
        <h1 className="share-title">{share.title}</h1>
        {share.note && <p className="share-note">{share.note}</p>}
        <p className="muted text-sm share-meta">
          {photos.length} photo{photos.length === 1 ? '' : 's'}
          {expDate ? ` · available until ${formatDate(expDate)}` : ''}
          {' · tap a photo to view full size or download'}
        </p>
        <div className="share-grid">
          {photos.map((p, i) => (
            <button type="button" key={i} className="share-cell" onClick={() => setIdx(i)}>
              <img src={p.thumbURL || p.url} alt={p.name} loading="lazy" />
            </button>
          ))}
        </div>
      </main>
      {idx !== null && (
        <Lightbox items={photos.map((p) => ({ url: p.url, name: p.name }))} index={idx} onIndex={setIdx} onClose={() => setIdx(null)} />
      )}
    </Shell>
  );
}
