// Modal — a centered dialog on desktop, a bottom sheet on mobile (CSS-driven).
// Closes on overlay click or Escape; locks body scroll while open.
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

export default function Modal({ open, onClose, title, children, footer, size }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'narrow' ? 'modal-narrow' : size === 'wide' ? 'modal-wide' : '';

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${sizeClass}`} role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
        {title && (
          <div className="modal-head">
            <h3>{title}</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
              <Icon name="close" />
            </button>
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
