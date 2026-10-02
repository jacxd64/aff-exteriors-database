// In-app PDF viewer (desktop/tablet) built on PDF.js. Renders the page centered
// with comfortable margins by default (portrait docs at ~58% width on wide
// screens, so they're not over-zoomed), with zoom +/-, page navigation, a clear
// Close, and a graceful Open/Download fallback if the file can't load. Lazy.
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';

const MAX_CANVAS_SIDE = 2400; // keep canvases within safe memory bounds

let pdfjsPromise = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import('pdfjs-dist');
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

function dataURLToUint8(dataURL) {
  const base64 = dataURL.split(',')[1] || '';
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return arr;
}

export default function PdfViewer({ doc, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const renderTask = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPdf(null);
    setPage(1);
    setZoom(1);
    const timeout = setTimeout(() => {
      if (!cancelled) setStatus((s) => (s === 'loading' ? 'error' : s));
    }, 25000);
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const src = doc.url.startsWith('data:') ? { data: dataURLToUint8(doc.url) } : { url: doc.url };
        const loaded = await pdfjs.getDocument(src).promise;
        if (cancelled) return;
        clearTimeout(timeout);
        setPdf(loaded);
        setNumPages(loaded.numPages);
        setStatus('ready');
      } catch {
        if (!cancelled) {
          clearTimeout(timeout);
          setStatus('error');
        }
      }
    })();
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [doc.url]);

  const render = useCallback(async () => {
    if (!pdf || !stageRef.current || !canvasRef.current) return;
    try {
      const p = await pdf.getPage(page);
      const stageW = Math.max(120, stageRef.current.clientWidth - 24);
      const base = p.getViewport({ scale: 1 });
      const portrait = base.height > base.width;
      // Default display: fill width — except portrait docs on wide screens, which
      // render at ~58% width (centered, with margins) so they aren't over-zoomed.
      let fit = stageW / base.width;
      if (portrait && stageW > 700) fit = (stageW * 0.58) / base.width;
      const displayScale = fit * zoom;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let pixelScale = displayScale * dpr;
      const longestPt = Math.max(base.width, base.height);
      if (longestPt * pixelScale > MAX_CANVAS_SIDE) pixelScale = MAX_CANVAS_SIDE / longestPt;

      const pixelVp = p.getViewport({ scale: pixelScale });
      const displayVp = p.getViewport({ scale: displayScale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = pixelVp.width;
      canvas.height = pixelVp.height;
      canvas.style.width = `${displayVp.width}px`;
      canvas.style.height = `${displayVp.height}px`;
      if (renderTask.current) {
        try { renderTask.current.cancel(); } catch { /* ignore */ }
      }
      renderTask.current = p.render({ canvasContext: ctx, viewport: pixelVp });
      await renderTask.current.promise;
    } catch {
      /* render superseded or cancelled */
    }
  }, [pdf, page, zoom]);

  useEffect(() => { render(); }, [render]);

  // Re-render when the stage resizes (window resize / orientation / layout).
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => render());
    ro.observe(el);
    return () => ro.disconnect();
  }, [render]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setPage((p) => Math.min(numPages || 1, p + 1));
      else if (e.key === 'ArrowLeft') setPage((p) => Math.max(1, p - 1));
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, numPages]);

  return (
    <div className="pdfviewer">
      <div className="pdfviewer-bar">
        <span className="pdfviewer-title">{doc.name}</span>
        <div className="pdfviewer-tools">
          {status === 'ready' && numPages > 1 && (
            <span className="pdfviewer-pages">
              <button type="button" className="icon-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} aria-label="Previous page"><Icon name="chevron-right" className="flip" /></button>
              <span>{page} / {numPages}</span>
              <button type="button" className="icon-btn" onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} aria-label="Next page"><Icon name="chevron-right" /></button>
            </span>
          )}
          {status === 'ready' && (
            <>
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))} aria-label="Zoom out"><Icon name="zoom-out" /></button>
              <button type="button" className="icon-btn" onClick={() => setZoom((z) => Math.min(5, z + 0.2))} aria-label="Zoom in"><Icon name="zoom-in" /></button>
            </>
          )}
          <a className="icon-btn" href={doc.url} download={doc.name} target="_blank" rel="noreferrer" aria-label="Download"><Icon name="download" /></a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
      </div>
      <div className="pdfviewer-stage" ref={stageRef}>
        {status === 'loading' && <p className="pdfviewer-msg">Loading…</p>}
        {status === 'error' && (
          <div className="pdfviewer-msg">
            <p>This preview couldn’t load here.</p>
            <div className="row gap-2" style={{ justifyContent: 'center' }}>
              <a className="btn btn-secondary" href={doc.url} target="_blank" rel="noreferrer">Open in new tab</a>
              <a className="btn btn-primary" href={doc.url} download={doc.name} target="_blank" rel="noreferrer">Download</a>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="pdfviewer-canvas" style={{ display: status === 'ready' ? 'block' : 'none' }} />
      </div>
    </div>
  );
}
