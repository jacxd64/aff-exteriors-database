// Live jobs collection + single-job hooks.
import { useEffect, useState } from 'react';
import jobsService from '../services/jobsService';

export function useJobs() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = jobsService.subscribeJobs((list) => {
      setJobs(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { jobs, loading };
}

export function useJob(id) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsub = jobsService.subscribeJob(id, (j) => {
      setJob(j);
      setLoading(false);
    });
    return unsub;
  }, [id]);

  return { job, loading };
}
