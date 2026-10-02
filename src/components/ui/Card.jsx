// Card primitives. SectionCard is the titled container used across detail pages.
export function Card({ children, className = '', pad = false, interactive = false, ...rest }) {
  const cls = ['card', pad && 'card-pad', interactive && 'card-interactive', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}

export function SectionCard({ title, icon, actions, children, className = '' }) {
  return (
    <section className={`card section-card ${className}`}>
      {(title || actions) && (
        <div className="section-head">
          <h3 className="row gap-2">{title}</h3>
          {actions && <div className="row gap-2">{actions}</div>}
        </div>
      )}
      <div className="section-body">{children}</div>
    </section>
  );
}

export default Card;
