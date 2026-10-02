// Tag / trade pill. With onToggle it becomes a selectable button (used in forms).
import { tradeLabel } from '../../utils/constants';

export function Tag({ children, selected, onToggle, className = '' }) {
  const cls = ['tag', onToggle && 'tag-button', selected && 'tag-selected', className]
    .filter(Boolean)
    .join(' ');
  if (onToggle) {
    return (
      <button type="button" className={cls} aria-pressed={!!selected} onClick={onToggle}>
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}

// Render a job's trade keys as a row of pills.
export function TradePills({ trades = [], max }) {
  if (!trades.length) return <span className="subtle text-sm">No trades</span>;
  const shown = max ? trades.slice(0, max) : trades;
  const extra = max ? trades.length - shown.length : 0;
  return (
    <span className="row row-wrap gap-2">
      {shown.map((t) => (
        <span key={t} className="tag">
          {tradeLabel(t)}
        </span>
      ))}
      {extra > 0 && <span className="tag">+{extra}</span>}
    </span>
  );
}

export default Tag;
