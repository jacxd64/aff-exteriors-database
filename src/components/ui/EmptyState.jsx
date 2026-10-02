// EmptyState — friendly placeholder for empty lists / unbuilt sections.
import Icon from './Icon';

export default function EmptyState({ icon = 'inbox', title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} size={40} strokeWidth={1.5} />
      </span>
      {title && <h3>{title}</h3>}
      {message && <p className="muted">{message}</p>}
      {action}
    </div>
  );
}
