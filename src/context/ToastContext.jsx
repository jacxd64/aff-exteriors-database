// ===========================================================================
// Toast notifications. useToast() returns { success, error, info } helpers.
// Toasts auto-dismiss; they render in a fixed stack (styled in components.css).
// ===========================================================================
import { createContext, useContext, useCallback, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, variant = 'info', duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((list) => [...list, { id, message, variant }]);
      if (duration) setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  const value = {
    toast: push,
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error', 4500),
    info: (m) => push(m, 'info'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.variant}`} onClick={() => remove(t.id)} role="status">
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
