import { useState } from 'react';
import { safeAdUrl, today } from '../services/advertising';
import { AdCreative } from './AdCreative';
import { AdCarousel } from './AdCarousel';
export function eligibleCampaigns(campaigns, position, date, failed = []) {
  return campaigns.filter(item => item.position === position && item.startDate <= date && item.endDate >= date && item.active !== false && item.publicationState !== 'draft' && !failed.includes(item.id) && safeAdUrl(item.imageUrl) && safeAdUrl(item.targetUrl))
    .map((campaign, index) => ({ campaign, index }))
    .sort((a, b) => (Number.isFinite(b.campaign.priority) ? b.campaign.priority : 0) - (Number.isFinite(a.campaign.priority) ? a.campaign.priority : 0) || a.index - b.index)
    .map(({ campaign }) => campaign);
}

export function AdSlot({ position, campaigns = [], renderCampaigns, autoplay = false, onImpression, onClick }) {
  const [failed, setFailed] = useState([]);
  const date = today();
  const eligible = eligibleCampaigns(campaigns, position, date, failed);
  if (!eligible.length) return null;
  const onImageError = id => setFailed(current => current.includes(id) ? current : [...current, id]);
  // An explicit renderer may override HOME_TOP presentation without losing campaigns.
  if (position === 'HOME_TOP' && renderCampaigns && eligible.length > 1) {
    return renderCampaigns({ campaigns: eligible, position, onImageError });
  }
  if (position === 'HOME_TOP' && eligible.length > 1) return <AdCarousel campaigns={eligible} onImageError={onImageError} autoplay={autoplay} onImpression={onImpression} onClick={onClick} />;
  const campaign = eligible[0];
  return <AdCreative key={campaign.id} campaign={campaign} onImageError={() => onImageError(campaign.id)} onClick={onClick} onImpression={onImpression} />;
}
