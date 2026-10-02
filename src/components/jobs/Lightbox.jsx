// Full-screen image viewer with bounded pan + zoom (pinch / wheel / double-tap)
// and swipe / arrow navigation. Pan is clamped to the image bounds so it never
// flies off-screen. Used for job photos and image documents.
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';

const MAX_SCALE = 5;

export default function Lightbox({ items, index, onIndex, onClose }) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);

  const item = items[index];

  const clamp = useCallback((nx, ny, s) => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return { x: nx, y: ny };
    const maxX = Math.max(0, (img.clientWidth * s - c.clientWidth) / 2);
    const maxY = Math.max(0, (img.clientHeight * s - c.clientHeight) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, nx)), y: Math.min(maxY, Math.max(-maxY, ny)) };
  }, []);

  const setScaleClamped = useCallback((s) => {
    const ns = Math.min(MAX_SCALE, Math.max(1, s));
    setScale(ns);
    if (ns === 1) { setTx(0); setTy(0); }
    else { const c = clamp(tx, ty, ns); setTx(c.x); setTy(c.y); }
  }, [clamp, tx, ty]);

  const reset = useCallback(() => { setScale(1); setTx(0); setTy(0); }, []);
  useEffect(() => { reset(); }, [index, reset]);

  const go = useCallback((d) => onIndex((index + d + items.length) % items.length), [index, items.length, onIndex]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === '+' || e.key === '=') setScaleClamped(scale + 0.5);
      else if (e.key === '-') setScaleClamped(scale - 0.5);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, go, setScaleClamped, scale]);

  const twoFingerDist = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      gesture.current = { mode: 'pinch', startDist: twoFingerDist(), startScale: scale };
    } else if (scale > 1) {
      gesture.current = { mode: 'pan', x: e.clientX, y: e.clientY, tx, ty };
    } else {
      gesture.current = { mode: 'swipe', x: e.clientX, dx: 0 };
    }
  };

  const onMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    if (g.mode === 'pinch' && pointers.current.size >= 2) {
      setScaleClamped(g.startScale * (twoFingerDist() / g.startDist));
    } else if (g.mode === 'pan') {
      const { x, y } = clamp(g.tx + (e.clientX - g.x), g.ty + (e.clientY - g.y), scale);
      setTx(x); setTy(y);
    } else if (g.mode === 'swipe') {
      g.dx = e.clientX - g.x;
    }
  };

  const onUp = (e) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.mode === 'swipe' && Math.abs(g.dx) > 60) go(g.dx < 0 ? 1 : -1);
    if (pointers.current.size === 0) gesture.current = null;
  };

  const onWheel = (e) => { e.preventDefault(); setScaleClamped(scale + (e.deltaY < 0 ? 0.3 : -0.3)); };
  const onDouble = () => (scale > 1 ? reset() : setScaleClamped(2.5));

  if (!item) return null;

  return (
    <div
      className="lightbox"
      ref={containerRef}
      onWheel={onWheel}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={onDouble}
    >
      <div className="lightbox-bar" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
        <span className="lightbox-title">{item.name}</span>
        <div className="lightbox-tools">
          <button type="button" className="icon-btn" onClick={() => setScaleClamped(scale - 0.5)} aria-label="Zoom out"><Icon name="zoom-out" /></button>
          <button type="button" className="icon-btn" onClick={() => setScaleClamped(scale + 0.5)} aria-label="Zoom in"><Icon name="zoom-in" /></button>
          <a className="icon-btn" href={item.url} download={item.name} target="_blank" rel="noreferrer" aria-label="Download"><Icon name="download" /></a>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
      </div>

      <img
        ref={imgRef}
        className="lightbox-img"
        src={item.url}
        alt={item.name}
        draggable={false}
        style={{ transform: `translate(${tx}px, ${ty}px) scale(${scale})`, cursor: scale > 1 ? 'grab' : 'zoom-in' }}
      />

      {items.length > 1 && (
        <>
          <button type="button" className="lightbox-nav prev" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(-1)} aria-label="Previous"><Icon name="chevron-right" /></button>
          <button type="button" className="lightbox-nav next" onPointerDown={(e) => e.stopPropagation()} onClick={() => go(1)} aria-label="Next"><Icon name="chevron-right" /></button>
          <div className="lightbox-count">{index + 1} / {items.length}</div>
        </>
      )}
    </div>
  );
}
