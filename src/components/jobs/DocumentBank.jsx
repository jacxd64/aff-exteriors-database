// Job document bank: upload PDFs / scans / Word docs, a typed list, inline
// PDF and image viewing (with zoom), and download. Word/other types download.
import { useRef, useState } from 'react';
import { useDocuments } from '../../hooks/useFiles';
import filesService from '../../services/filesService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CAP } from '../../utils/permissions';
import { DOCUMENT_TYPES, DOCUMENT_TYPE_MAP } from '../../utils/constants';
import { formatDate, formatBytes } from '../../utils/format';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Select } from '../ui/Field';
import EmptyState from '../ui/EmptyState';
import { LoadingBlock } from '../ui/Spinner';
import ConfirmDialog from '../ui/ConfirmDialog';
import Lightbox from './Lightbox';
import PdfViewer from './PdfViewer';

const isPdf = (m) => m.contentType === 'application/pdf' || m.ext === 'pdf';
const isImage = (m) => (m.contentType || '').startsWith('image/');

export default function DocumentBank({ jobId }) {
  const { documents, loading } = useDocuments(jobId);
  const { user, can } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);

  const [category, setCategory] = useState('contract');
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [imgDoc, setImgDoc] = useState(null);

  const canAdd = can(CAP.DOCUMENT_ADD);
  const canDelete = can(CAP.JOB_EDIT);

  const onPick = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setUploads(files.map((f) => ({ name: f.name, pct: 0, error: false })));
    let ok = 0;
    for (let i = 0; i < files.length; i += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await filesService.addDocument(jobId, files[i], {
          category,
          user,
          onProgress: (pct) => setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, pct } : x))),
        });
        ok += 1;
      } catch (err) {
        setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: true } : x)));
        toast.error(err?.message || `Could not upload ${files[i].name}.`);
      }
    }
    await filesService.logUploads(jobId, 'document', ok, user);
    setBusy(false);
    window.setTimeout(() => setUploads([]), 2500);
    if (ok) toast.success(`Uploaded ${ok} document${ok === 1 ? '' : 's'}.`);
  };

  const open = (m) => {
    if (isPdf(m)) {
      // Browser-based PDF rendering is unreliable on phones (esp. scanned PDFs on
      // iOS Safari), so use the device's native viewer there; keep the in-app
      // viewer on larger screens.
      if (window.matchMedia('(max-width: 767px)').matches) window.open(m.url, '_blank', 'noopener');
      else setPdfDoc(m);
    } else if (isImage(m)) {
      setImgDoc(m);
    } else {
      window.open(m.url, '_blank', 'noopener');
    }
  };

  const doDelete = async () => {
    setWorking(true);
    try {
      await filesService.deleteDocument(jobId, confirm, { user });
      toast.success('Deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete.');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  if (loading) return <LoadingBlock label="Loading documents…" />;

  return (
    <div className="filebank">
      <div className="filebank-toolbar">
        {canAdd && (
          <>
            <input ref={inputRef} type="file" accept="application/pdf,.doc,.docx,image/*,text/plain" multiple hidden onChange={onPick} />
            <div className="field filebank-cat">
              <Select id="doc-upload-cat" value={category} onChange={(e) => setCategory(e.target.value)} options={DOCUMENT_TYPES} aria-label="Document type" />
            </div>
            <Button variant="primary" icon="upload" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? 'Uploading…' : 'Add documents'}
            </Button>
          </>
        )}
      </div>

      {uploads.length > 0 && (
        <div className="upload-list">
          {uploads.map((u, i) => (
            <div key={i} className={`upload-row ${u.error ? 'error' : ''}`}>
              <span className="upload-name">{u.name}</span>
              <span className="upload-bar"><span className="upload-fill" style={{ width: `${u.pct}%` }} /></span>
              <span className="upload-pct">{u.error ? 'Failed' : `${u.pct}%`}</span>
            </div>
          ))}
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState
          icon="file"
          title="No documents yet"
          message={canAdd ? 'Upload scopes, supplements, estimates, invoices, permits — PDFs open right here with zoom.' : 'No documents have been added to this job.'}
        />
      ) : (
        <ul className="doc-list">
          {documents.map((d) => (
            <li key={d.id} className="doc-row">
              <button type="button" className="doc-main" onClick={() => open(d)}>
                <span className="doc-icon"><Icon name={isImage(d) ? 'image' : 'file'} /></span>
                <span className="doc-info">
                  <span className="doc-name">{d.name}</span>
                  <span className="doc-meta">
                    {DOCUMENT_TYPE_MAP[d.category]?.label || 'Document'}
                    {d.size ? ` · ${formatBytes(d.size)}` : ''}
                    {' · '}{formatDate(d.uploadedAt)}
                  </span>
                </span>
              </button>
              <div className="doc-actions">
                <a className="icon-btn" href={d.url} download={d.name} target="_blank" rel="noreferrer" aria-label="Download"><Icon name="download" /></a>
                {canDelete && <button type="button" className="icon-btn" onClick={() => setConfirm(d)} aria-label="Delete"><Icon name="trash" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {pdfDoc && <PdfViewer doc={pdfDoc} onClose={() => setPdfDoc(null)} />}

      {imgDoc && (
        <Lightbox items={[{ url: imgDoc.url, name: imgDoc.name }]} index={0} onIndex={() => {}} onClose={() => setImgDoc(null)} />
      )}

      <ConfirmDialog
        open={confirm !== null}
        title="Delete this document?"
        message="This permanently removes the file from the job."
        confirmLabel="Delete"
        danger
        loading={working}
        onConfirm={doDelete}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}
