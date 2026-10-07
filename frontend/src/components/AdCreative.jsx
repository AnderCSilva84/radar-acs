import { useEffect, useRef } from 'react';
import { safeAdUrl } from '../services/advertising';
import { creativeSlots } from '../services/adCreative';
export function AdCreative({ campaign, preview = false, localImageUrl, onImageError, embedded = false, onClick, onImpression }) {
  const root = useRef(null), seen = useRef(new Set());
  useEffect(() => {
    if (preview || embedded || !onImpression || !globalThis.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5) && !seen.current.has(campaign.id)) {
        seen.current.add(campaign.id); onImpression({ campaignId: campaign.id, position: campaign.position });
      }
    }, { threshold: .5 });
    observer.observe(root.current); return () => observer.disconnect();
  }, [campaign.id, campaign.position, preview, embedded, onImpression]);
  const imageUrl = preview && localImageUrl?.startsWith('blob:') ? localImageUrl : safeAdUrl(campaign.imageUrl);
  const target = safeAdUrl(campaign.targetUrl);
  const [width, height] = creativeSlots[campaign.position] || creativeSlots.HOME_TOP;
  const content = <>
    {imageUrl ? <img draggable={false} src={imageUrl} alt={campaign.alt} loading={preview ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onError={onImageError} style={{ aspectRatio: `${width} / ${height}`, objectFit: (campaign.creativeFit || campaign.imageFit) === 'cover' ? 'cover' : 'contain' }} /> : <div className="ad-image-placeholder" style={{ aspectRatio: `${width} / ${height}` }}>Selecione uma imagem</div>}
    <div className="ad-creative-copy"><span>{campaign.advertiserName}</span><strong>{campaign.campaignName}</strong>{campaign.ctaText && <span className="ad-creative-cta">{campaign.ctaText}</span>}</div>
  </>;
  const body = preview || !target ? <div className="ad-creative-body">{content}</div> : <a className="ad-creative-body" href={target} target="_blank" rel="noopener noreferrer sponsored" referrerPolicy="no-referrer" onClick={() => onClick?.({ campaignId: campaign.id, position: campaign.position })}>{content}</a>;
  if (embedded) return <div className={`ad-creative ad-slot-${campaign.position.toLowerCase()}`} data-creative-fit={campaign.imageFit || 'contain'}>{body}</div>;
  return <aside ref={root} data-creative-fit={(campaign.creativeFit || campaign.imageFit) === 'cover' ? 'cover' : 'contain'} className={`ad-slot ad-creative ${preview ? 'ad-preview' : ''} ad-slot-${campaign.position.toLowerCase()}`} aria-label={campaign.position === 'SPECIAL_SPONSOR' ? 'Patrocínio da edição' : 'Publicidade'}>
    <span className="ad-label">{campaign.position === 'SPECIAL_SPONSOR' ? 'Esta edição tem o apoio de · Patrocínio' : 'Publicidade'}</span>{body}
  </aside>;
}
