// Live appointments — all (for the calendar) or for a single job.
import { useEffect, useState } from 'react';
import appointmentsService from '../services/appointmentsService';

export function useAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = appointmentsService.subscribeAll((list) => {
      setAppointments(list);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { appointments, loading };
}

export function useJobAppointments(jobId) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!jobId) return undefined;
    setLoading(true);
    const unsub = appointmentsService.subscribeByJob(jobId, (list) => {
      setAppointments(list);
      setLoading(false);
    });
    return unsub;
  }, [jobId]);
  return { appointments, loading };
}
