import { useState } from 'react';
import { safeAdUrl, today } from '../services/advertising';
export function AdSlot({ position, campaigns = [] }) {
  const [failed, setFailed] = useState([]);
  const date = today();
  const campaign = campaigns.find(item => item.position === position && item.startDate <= date && item.endDate >= date && item.active !== false && !failed.includes(item.id) && safeAdUrl(item.imageUrl) && safeAdUrl(item.targetUrl));
  if (!campaign) return null;
  return <aside className={'ad-slot ad-slot-' + position.toLowerCase()} aria-label={position === 'SPECIAL_SPONSOR' ? 'Patrocínio da edição' : 'Publicidade'}>
    <span className="ad-label">{position === 'SPECIAL_SPONSOR' ? 'Esta edição tem o apoio de · Patrocínio' : 'Publicidade'}</span>
    <a href={safeAdUrl(campaign.targetUrl)} target="_blank" rel="noopener noreferrer sponsored" referrerPolicy="no-referrer"><img src={safeAdUrl(campaign.imageUrl)} alt={campaign.alt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(current => [...current, campaign.id])} /><span>{campaign.advertiserName}</span></a>
  </aside>;
}
