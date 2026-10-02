// NotesPanel — chronological job notes with an add form and delete confirm.
import { useState } from 'react';
import { useNotes } from '../../hooks/useJobDetail';
import jobsService from '../../services/jobsService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CAP } from '../../utils/permissions';
import { Field, Textarea, Select } from '../ui/Field';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import ConfirmDialog from '../ui/ConfirmDialog';
import { LoadingBlock } from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import { relativeTime } from '../../utils/format';

const NOTE_CATEGORIES = [
  { key: 'general', label: 'General' },
  { key: 'customer', label: 'Customer' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'materials', label: 'Materials' },
  { key: 'install', label: 'Install' },
  { key: 'office', label: 'Office' },
];
const CATEGORY_LABEL = Object.fromEntries(NOTE_CATEGORIES.map((c) => [c.key, c.label]));

export default function NotesPanel({ jobId }) {
  const { notes, loading } = useNotes(jobId);
  const { user, can } = useAuth();
  const toast = useToast();
  const canAdd = can(CAP.NOTE_ADD);

  const [text, setText] = useState('');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSaving(true);
    try {
      await jobsService.addNote(jobId, { text: body, category, user });
      setText('');
      setCategory('general');
    } catch (err) {
      toast.error(err?.message || 'Could not add note.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await jobsService.deleteNote(jobId, toDelete.id);
      setToDelete(null);
    } catch (err) {
      toast.error(err?.message || 'Could not delete note.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="stack stack-4">
      {canAdd && (
        <form className="card card-pad note-form" onSubmit={add}>
          <Field label="Add a note" htmlFor="note-text">
            <Textarea id="note-text" value={text} rows={3}
              onChange={(e) => setText(e.target.value)} placeholder="What happened? What's next?" />
          </Field>
          <div className="row row-between row-wrap gap-2 note-form-foot">
            <Select aria-label="Note category" value={category}
              onChange={(e) => setCategory(e.target.value)} options={NOTE_CATEGORIES} />
            <Button type="submit" variant="primary" icon="plus" disabled={saving || !text.trim()}>
              {saving ? 'Adding…' : 'Add note'}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <LoadingBlock label="Loading notes…" />
      ) : notes.length === 0 ? (
        <EmptyState icon="file" title="No notes yet"
          message={canAdd ? 'Add the first note above.' : 'Notes added to this job will show here.'} />
      ) : (
        <ul className="note-list">
          {notes.map((n) => (
            <li key={n.id} className="note-item card card-pad">
              <div className="note-item-head">
                <span className="chip">{CATEGORY_LABEL[n.category] || 'General'}</span>
                <span className="subtle text-xs">{n.user} · {relativeTime(n.at)}</span>
                {canAdd && (
                  <button type="button" className="icon-btn note-del" aria-label="Delete note" onClick={() => setToDelete(n)}>
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>
              <p className="note-item-text">{n.text}</p>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this note?"
        message="This can't be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
