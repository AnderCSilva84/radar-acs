import { useEffect, useRef, useState } from 'react';
import { observeAdmin, editorialRequest, logoutAdmin } from '../services/adminAuth';
export function useAdmin(enabled) {
  const [state, setState] = useState({ status: 'loading', user: null, settings: null });
  const observing = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    observing.current = true;
    let active = true, unsubscribe, version = 0;
    setState({ status: 'loading', user: null, settings: null });
    observeAdmin(async user => {
      const current = ++version;
      if (!active) return;
      if (!user) return setState({ status: 'anonymous', user: null, settings: null });
      setState({ status: 'loading', user: null, settings: null });
      try {
        const settings = await editorialRequest(user);
        if (active && current === version) setState({ status: 'authorized', user, settings });
      } catch (error) {
        if (active && current === version) setState({ status: error.message === 'Acesso negado.' ? 'denied' : 'error', user, settings: null });
      }
    }).then(stop => { unsubscribe = stop; if (!active) stop(); }).catch(() => { if (active) setState({ status: 'error', user: null, settings: null }); });
    return () => { active = false; observing.current = false; version++; unsubscribe?.(); };
  }, [enabled]);
  async function save(settings) {
    const value = await editorialRequest(state.user, settings);
    setState(current => ({ ...current, settings: value }));
    return value;
  }
  return { ...(enabled && !observing.current ? { status: 'loading', user: null, settings: null } : state), save, logout: logoutAdmin };
}
