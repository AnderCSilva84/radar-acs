import { useEffect, useState } from 'react';
import { getLive } from '../services/live';
export function useLive(enabled) {
  const [state, setState] = useState({ status: 'loading', data: null });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    getLive().then(data => { if (active) setState({ status: 'ready', data }); })
      .catch(() => { if (active) setState({ status: 'error', data: null }); });
    return () => { active = false; };
  }, [enabled]);
  return state;
}
