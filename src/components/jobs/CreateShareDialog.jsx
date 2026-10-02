// Create a public share link for the selected photos, and manage a job's
// existing links (copy / revoke). Opened from the PhotoBank's select mode.
import { useEffect, useState } from 'react';
import sharesService from '../../services/sharesService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { formatDate } from '../../utils/format';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Field, Input, Textarea, Select } from '../ui/Field';

const EXPIRY = [
  { key: '7', label: '7 days' },
  { key: '30', label: '30 days' },
  { key: '90', label: '90 days' },
  { key: '', label: 'Never (revoke manually)' },
];

const shareUrl = (token) => `${window.location.origin}/share/${token}`;

export default function CreateShareDialog({ open, jobId, customerName, photos, onClose }) {
  const { user } = useAuth();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [expiry, setExpiry] = useState('30');
  const [creating, setCreating] = useState(false);
  const [link, setLink] = useState('');
  const [existing, setExisting] = useState([]);

  const refresh = () => {
    if (jobId) sharesService.listByJob(jobId).then(setExisting).catch(() => {});
  };

  useEffect(() => {
    if (!open) return;
    setTitle(customerName ? `Photos for ${customerName}` : 'Shared photos');
    setNote('');
    setExpiry('30');
    setLink('');
    refresh();
  }, [open, customerName, jobId]);

  if (!open) return null;

  const count = photos?.length || 0;

  const copy = async (url) => {
    try { await navigator.clipboard.writeText(url); toast.success('Link copied to clipboard.'); }
    catch { toast.info('Select and copy the link manually.'); }
  };

  const create = async () => {
    if (!count) { toast.error('Select photos to share first.'); return; }
    setCreating(true);
    try {
      const res = await sharesService.create(
        { jobId, title, note, photos, expiresInDays: expiry ? Number(expiry) : 0 },
        user,
      );
      const url = shareUrl(res.token);
      setLink(url);
      try { await navigator.clipboard.writeText(url); toast.success('Share link created and copied!'); }
      catch { toast.success('Share link created.'); }
      refresh();
    } catch (err) {
      toast.error(err?.message || 'Could not create the share link.');
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (token) => {
    try { await sharesService.revoke(token); toast.success('Link revoked.'); refresh(); }
    catch (err) { toast.error(err?.message || 'Could not revoke.'); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Share photos" size="narrow"
      footer={<Button variant="ghost" onClick={onClose}>Done</Button>}>
      <div className="stack stack-3">
        <p className="muted text-sm">
          Creates a private link to the <strong>{count}</strong> selected photo{count === 1 ? '' : 's'} that
          anyone can open — no login — without seeing anything else.
        </p>
        <Field label="Title" htmlFor="sh-title">
          <Input id="sh-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Note to recipient (optional)" htmlFor="sh-note">
          <Textarea id="sh-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Here are the photos from today's inspection." />
        </Field>
        <Field label="Link expires" htmlFor="sh-exp">
          <Select id="sh-exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} options={EXPIRY} />
        </Field>
        <Button variant="primary" icon="link" disabled={creating || !count} onClick={create}>
          {creating ? 'Creating…' : 'Create share link'}
        </Button>

        {link && (
          <div className="share-result">
            <span className="share-link-text">{link}</span>
            <div className="row gap-2">
              <Button variant="secondary" size="sm" icon="copy" onClick={() => copy(link)}>Copy</Button>
              <a className="btn btn-secondary btn-sm" href={link} target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
        )}

        {existing.length > 0 && (
          <div className="share-existing">
            <p className="field-label">Active links for this job</p>
            <ul className="share-list">
              {existing.map((s) => {
                const expired = s.expiresAt && new Date(s.expiresAt) < new Date();
                const dead = s.revoked || expired;
                return (
                  <li key={s.id} className={`share-list-item ${dead ? 'is-dead' : ''}`}>
                    <span className="share-list-main">
                      <span className="share-list-title">{s.title}</span>
                      <span className="muted text-xs">
                        {(s.photos || []).length} photos · {dead ? (s.revoked ? 'revoked' : 'expired') : (s.expiresAt ? `until ${formatDate(s.expiresAt)}` : 'no expiry')}
                      </span>
                    </span>
                    {!dead && (
                      <span className="row gap-1">
                        <button type="button" className="icon-btn" aria-label="Copy link" onClick={() => copy(shareUrl(s.id))}><Icon name="copy" size={16} /></button>
                        <button type="button" className="icon-btn" aria-label="Revoke link" onClick={() => revoke(s.id)}><Icon name="trash" size={16} /></button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
