// The "Files" tab on a job: toggles between the photo bank and document bank.
import { useState } from 'react';
import PhotoBank from './PhotoBank';
import DocumentBank from './DocumentBank';

export default function FilesTab({ jobId, customerName }) {
  const [view, setView] = useState('photos');
  return (
    <div className="stack stack-4">
      <div className="segmented files-toggle">
        <button type="button" aria-pressed={view === 'photos'} onClick={() => setView('photos')}>Photos</button>
        <button type="button" aria-pressed={view === 'documents'} onClick={() => setView('documents')}>Documents</button>
      </div>
      {view === 'photos' ? <PhotoBank jobId={jobId} customerName={customerName} /> : <DocumentBank jobId={jobId} />}
    </div>
  );
}
