// Add / edit a contractor in the bank.
import { useEffect, useState } from 'react';
import installersService from '../../services/installersService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input, Textarea, Checkbox } from '../ui/Field';

export default function InstallerDialog({ open, installer, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const editing = Boolean(installer?.id);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(installer?.name || '');
    setPhone(installer?.phone || '');
    setNotes(installer?.notes || '');
    setActive(installer?.active !== false);
  }, [open, installer]);

  if (!open) return null;

  const save = async () => {
    if (!name.trim()) { toast.error('Enter a name.'); return; }
    setSaving(true);
    try {
      if (editing) await installersService.update(installer.id, { name: name.trim(), phone: phone.trim(), notes: notes.trim(), active });
      else await installersService.add({ name, phone, notes, active }, user);
      toast.success(editing ? 'Contractor updated.' : 'Contractor added.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await installersService.remove(installer.id);
      toast.success('Contractor removed.');
      onClose();
    } catch (err) {
      toast.error(err?.message || 'Could not remove.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit contractor' : 'Add contractor'}
      size="narrow"
      footer={(
        <>
          {editing && <Button variant="ghost" className="appt-delete" onClick={remove} disabled={saving}>Delete</Button>}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" icon="check" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </>
      )}
    >
      <div className="stack stack-3">
        <Field label="Name" htmlFor="in-name">
          <Input id="in-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Crew or contractor name" />
        </Field>
        <Field label="Phone" htmlFor="in-phone">
          <Input id="in-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Notes" htmlFor="in-notes" hint="Trades they cover, rates, availability — anything useful.">
          <Textarea id="in-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Checkbox label="Active (available to assign)" checked={active} onChange={(e) => setActive(e.target.checked)} />
      </div>
    </Modal>
  );
}
