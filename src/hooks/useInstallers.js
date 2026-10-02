// Live contractor / crew bank.
import { useEffect, useState } from 'react';
import installersService from '../services/installersService';

export function useInstallers() {
  const [installers, setInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = installersService.subscribe((list) => {
      setInstallers(list);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { installers, loading };
}
