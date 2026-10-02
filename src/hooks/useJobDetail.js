// Live timeline + notes subcollections for a single job.
import { useEffect, useState } from 'react';
import jobsService from '../services/jobsService';

export function useTimeline(jobId) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return undefined;
    const unsub = jobsService.subscribeTimeline(jobId, (list) => {
      setEntries(list);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);
  return { entries, loading };
}

export function useNotes(jobId) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return undefined;
    const unsub = jobsService.subscribeNotes(jobId, (list) => {
      setNotes(list);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);
  return { notes, loading };
}
