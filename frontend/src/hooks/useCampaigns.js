import { useEffect, useRef, useState } from 'react';
import { getCampaigns } from '../services/advertising';
export function useCampaigns(enabled) {
  const [campaigns, setCampaigns] = useState([]);
  const loaded = useRef(false);
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    getCampaigns().then(setCampaigns).catch(() => {});
  }, [enabled]);
  return campaigns;
}
