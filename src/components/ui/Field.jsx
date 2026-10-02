// Form field primitives: a labeled wrapper plus styled Input / Textarea /
// Select / Checkbox. All forward refs-free props; keep them simple.

export function Field({ label, required, hint, error, htmlFor, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function Input({ invalid, className = '', ...rest }) {
  return <input className={`input ${invalid ? 'input-invalid' : ''} ${className}`} {...rest} />;
}

export function Textarea({ invalid, className = '', ...rest }) {
  return <textarea className={`textarea ${invalid ? 'textarea-invalid' : ''} ${className}`} {...rest} />;
}

export function Select({ invalid, options = [], placeholder, children, className = '', ...rest }) {
  return (
    <select className={`select ${invalid ? 'select-invalid' : ''} ${className}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.key ?? o.value ?? o} value={o.key ?? o.value ?? o}>
          {o.label ?? o}
        </option>
      ))}
      {children}
    </select>
  );
}

export function Checkbox({ label, checked, onChange, ...rest }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={!!checked} onChange={onChange} {...rest} />
      <span>{label}</span>
    </label>
  );
}

export default Field;
