import { useCallback, useEffect, useState } from 'react';
import { getLatestBriefing } from '../services/radarApi';

export function useBriefing(enabled = true) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading', briefing: null });
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ status: 'loading', briefing: null });
    getLatestBriefing({ signal: controller.signal }).then(briefing => {
      if (!controller.signal.aborted) setState({ status: briefing ? 'ready' : 'empty', briefing });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error', briefing: null });
    });
    return () => controller.abort();
  }, [attempt, enabled]);
  return { ...state, retry: useCallback(() => setAttempt(n => n + 1), []) };
}
