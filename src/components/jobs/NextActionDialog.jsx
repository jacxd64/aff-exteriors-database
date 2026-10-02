// Shared dialog for setting a job's "next action" — used when a status change
// suggests the next step, and when rescheduling an existing action. Edits the
// action text + due date, with an optional reason note (for reschedules).
import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Textarea } from '../ui/Field';

export default function NextActionDialog({
  open,
  title,
  message,
  initialText = '',
  initialDate = '',
  showReason = false,
  reasonLabel = 'Reason (optional)',
  confirmLabel = 'Save',
  skipLabel = 'Skip',
  loading = false,
  onConfirm,
  onClose,
}) {
  const [text, setText] = useState(initialText);
  const [dueDate, setDueDate] = useState(initialDate);
  const [reason, setReason] = useState('');

  // Re-seed the fields each time the dialog opens with fresh context.
  useEffect(() => {
    if (open) {
      setText(initialText);
      setDueDate(initialDate);
      setReason('');
    }
  }, [open, initialText, initialDate]);

  const confirm = () => onConfirm?.({ text: text.trim(), dueDate, reason: reason.trim() });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="narrow"
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{skipLabel}</Button>
          <Button variant="primary" icon="check" onClick={confirm} disabled={loading || !text.trim()}>
            {loading ? 'Saving…' : confirmLabel}
          </Button>
        </>
      )}
    >
      {message && <p className="muted" style={{ marginBottom: 'var(--space-3)' }}>{message}</p>}
      <div className="stack stack-3">
        <Field label="Next action" htmlFor="na-text">
          <Input id="na-text" value={text} onChange={(e) => setText(e.target.value)}
            placeholder="What needs to happen next?" />
        </Field>
        <Field label="Due date" htmlFor="na-date">
          <Input id="na-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        {showReason && (
          <Field label={reasonLabel} htmlFor="na-reason">
            <Textarea id="na-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Rained out" />
          </Field>
        )}
      </div>
    </Modal>
  );
}
