// Live photo / document collections for a job.
import { useEffect, useState } from 'react';
import filesService from '../services/filesService';

export function usePhotos(jobId) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return undefined;
    setLoading(true);
    const unsub = filesService.subscribePhotos(jobId, (list) => {
      setPhotos(list);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);
  return { photos, loading };
}

export function useDocuments(jobId) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return undefined;
    setLoading(true);
    const unsub = filesService.subscribeDocuments(jobId, (list) => {
      setDocuments(list);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);
  return { documents, loading };
}
