// Spinner + a full-block loading state.
export function Spinner({ large = false }) {
  return <div className={`spinner ${large ? 'spinner-lg' : ''}`} role="status" aria-label="Loading" />;
}

export function LoadingBlock({ label = 'Loading…' }) {
  return (
    <div className="loading-block">
      <Spinner large />
      <span>{label}</span>
    </div>
  );
}

export default Spinner;
