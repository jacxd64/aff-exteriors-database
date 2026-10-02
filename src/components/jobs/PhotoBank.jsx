// Job photo bank: bulk multi-select upload (full quality, no re-compression in
// Firebase mode), category tagging + filtering, a fast thumbnail grid, a
// full-screen zoom/pan viewer, and multi-select download/delete.
import { useRef, useState } from 'react';
import { usePhotos } from '../../hooks/useFiles';
import filesService from '../../services/filesService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CAP } from '../../utils/permissions';
import { PHOTO_CATEGORIES, PHOTO_CATEGORY_MAP } from '../../utils/constants';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Select } from '../ui/Field';
import EmptyState from '../ui/EmptyState';
import { LoadingBlock } from '../ui/Spinner';
import ConfirmDialog from '../ui/ConfirmDialog';
import Lightbox from './Lightbox';
import CreateShareDialog from './CreateShareDialog';

async function downloadFile(url, name) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = obj;
    a.download = name || 'photo';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(obj), 2000);
  } catch {
    window.open(url, '_blank', 'noopener');
  }
}

const FILTERS = [{ key: 'all', label: 'All photos' }, ...PHOTO_CATEGORIES];

export default function PhotoBank({ jobId, customerName }) {
  const { photos, loading } = usePhotos(jobId);
  const { user, can } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);

  const [category, setCategory] = useState('damage');
  const [filter, setFilter] = useState('all');
  const [uploads, setUploads] = useState([]);
  const [busy, setBusy] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState({});
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const canAdd = can(CAP.PHOTO_ADD);
  const canDelete = can(CAP.JOB_EDIT);
  const filtered = filter === 'all' ? photos : photos.filter((p) => p.category === filter);
  const selectedList = filtered.filter((p) => selected[p.id]);

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
        await filesService.addPhoto(jobId, files[i], {
          category,
          user,
          onProgress: (pct) => setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, pct } : x))),
        });
        ok += 1;
      } catch {
        setUploads((u) => u.map((x, idx) => (idx === i ? { ...x, error: true } : x)));
      }
    }
    await filesService.logUploads(jobId, 'photo', ok, user);
    setBusy(false);
    window.setTimeout(() => setUploads([]), 1500);
    if (ok === files.length) toast.success(`Uploaded ${ok} photo${ok === 1 ? '' : 's'}.`);
    else toast.info(`Uploaded ${ok} of ${files.length}. ${files.length - ok} failed.`);
  };

  const toggleSel = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const clearSel = () => { setSelected({}); setSelectMode(false); };

  const downloadSelected = async () => {
    setWorking(true);
    for (const p of selectedList) {
      // eslint-disable-next-line no-await-in-loop
      await downloadFile(p.url, p.name);
    }
    setWorking(false);
    toast.success(`Downloading ${selectedList.length} photo${selectedList.length === 1 ? '' : 's'}.`);
  };

  const doDelete = async () => {
    setWorking(true);
    try {
      if (confirm === 'bulk') {
        for (const p of selectedList) {
          // eslint-disable-next-line no-await-in-loop
          await filesService.deletePhoto(jobId, p, { user });
        }
        clearSel();
      } else {
        await filesService.deletePhoto(jobId, confirm, { user });
      }
      toast.success('Deleted.');
    } catch (err) {
      toast.error(err?.message || 'Could not delete.');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };

  if (loading) return <LoadingBlock label="Loading photos…" />;

  return (
    <div className="filebank">
      <div className="filebank-toolbar">
        {canAdd && (
          <>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
            <div className="field filebank-cat">
              <Select id="photo-upload-cat" value={category} onChange={(e) => setCategory(e.target.value)} options={PHOTO_CATEGORIES} aria-label="Category for new photos" />
            </div>
            <Button variant="primary" icon="upload" disabled={busy} onClick={() => inputRef.current?.click()}>
              {busy ? 'Uploading…' : 'Add photos'}
            </Button>
          </>
        )}
        <div className="filebank-spacer" />
        <div className="field">
          <Select id="photo-filter" value={filter} onChange={(e) => setFilter(e.target.value)} options={FILTERS} aria-label="Filter photos" />
        </div>
        {photos.length > 0 && (
          <Button variant={selectMode ? 'secondary' : 'ghost'} onClick={() => (selectMode ? clearSel() : setSelectMode(true))}>
            {selectMode ? 'Done' : 'Select'}
          </Button>
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

      {selectMode && selectedList.length > 0 && (
        <div className="select-bar">
          <span>{selectedList.length} selected</span>
          <div className="row gap-2">
            <Button variant="secondary" size="sm" icon="download" disabled={working} onClick={downloadSelected}>Download</Button>
            {canDelete && <Button variant="secondary" size="sm" icon="link" onClick={() => setShareOpen(true)}>Share</Button>}
            {canDelete && <Button variant="danger" size="sm" icon="trash" disabled={working} onClick={() => setConfirm('bulk')}>Delete</Button>}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon="camera"
          title={photos.length === 0 ? 'No photos yet' : 'None in this category'}
          message={canAdd ? 'Add photos straight from the job site — select as many as you want at once, full quality.' : 'No photos have been added to this job.'}
        />
      ) : (
        <div className="photo-grid">
          {filtered.map((p, i) => (
            <button
              type="button"
              key={p.id}
              className={`photo-cell ${selected[p.id] ? 'selected' : ''}`}
              onClick={() => (selectMode ? toggleSel(p.id) : setViewerIndex(i))}
            >
              <img src={p.thumbURL || p.url} alt={p.name} loading="lazy" />
              {p.category && p.category !== 'other' && <span className="photo-cat">{PHOTO_CATEGORY_MAP[p.category]?.label}</span>}
              {selectMode && <span className={`photo-check ${selected[p.id] ? 'on' : ''}`}>{selected[p.id] && <Icon name="check" size={16} />}</span>}
            </button>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <Lightbox
          items={filtered.map((p) => ({ url: p.url, name: p.name }))}
          index={viewerIndex}
          onIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <CreateShareDialog
        open={shareOpen}
        jobId={jobId}
        customerName={customerName}
        photos={selectedList}
        onClose={() => setShareOpen(false)}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'bulk' ? `Delete ${selectedList.length} photo${selectedList.length === 1 ? '' : 's'}?` : 'Delete this photo?'}
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
