// Global search box. Submitting navigates to the Jobs page with the query.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';

export default function GlobalSearch({ placeholder = 'Search jobs, names, addresses…', onSubmitted }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = q.trim();
    navigate(trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}` : '/jobs');
    onSubmitted?.();
  };

  return (
    <form className="search-box" onSubmit={submit} role="search">
      <span className="search-icon">
        <Icon name="search" size={18} />
      </span>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        aria-label="Search jobs"
      />
    </form>
  );
}
