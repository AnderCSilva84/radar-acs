import { useEffect, useRef, useState } from 'react';
import { AdCreative } from './AdCreative';
// Optional callbacks are an integration contract, not a tracking implementation.
export function AdCarousel({ campaigns, onImageError, preview = false, autoplay = false, interval = 8000, onImpression, onClick }) {
  const [index, setIndex] = useState(0), [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(!document.hidden), [reduced, setReduced] = useState(false);
  const root = useRef(null), swipe = useRef(null), suppressClick = useRef(false), seen = useRef(new Set());
  const current = campaigns[index % campaigns.length];
  useEffect(() => {
    const media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    const changed = () => setReduced(Boolean(media?.matches));
    const visibility = () => setVisible(!document.hidden);
    changed(); media?.addEventListener?.('change', changed); document.addEventListener('visibilitychange', visibility);
    return () => { media?.removeEventListener?.('change', changed); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!autoplay || paused || !visible || reduced || campaigns.length < 2) return;
    const timer = setInterval(() => setIndex(value => (value + 1) % campaigns.length), Math.max(7000, interval));
    return () => clearInterval(timer);
  }, [autoplay, paused, visible, reduced, campaigns.length, interval]);
  useEffect(() => {
    if (preview || !onImpression || !globalThis.IntersectionObserver || !current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .5) && !seen.current.has(current.id)) {
        seen.current.add(current.id); onImpression({ campaignId: current.id, position: current.position });
      }
    }, { threshold: .5 });
    observer.observe(root.current); return () => observer.disconnect();
  }, [current, onImpression, preview]);
  function move(next) { setPaused(true); setIndex((next + campaigns.length) % campaigns.length); }
  if (!current) return null;
  return <aside ref={root} className="ad-slot ad-carousel" aria-label="Publicidade — campanhas" aria-roledescription="carrossel" tabIndex={0}
    onDragStart={event => event.preventDefault()} onFocus={() => setPaused(true)} onPointerDown={event => { setPaused(true); suppressClick.current = false; swipe.current = event.clientX; }}
    onPointerUp={event => { if (swipe.current !== null && Math.abs(event.clientX - swipe.current) > 45) { move(index + (event.clientX < swipe.current ? 1 : -1)); suppressClick.current = true; } swipe.current = null; }}
    onPointerCancel={() => { swipe.current = null; }} onClickCapture={event => { if (suppressClick.current) { event.preventDefault(); suppressClick.current = false; } }}
    onKeyDown={event => { if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) { event.preventDefault(); move(event.key === 'Home' ? 0 : event.key === 'End' ? campaigns.length - 1 : index + (event.key === 'ArrowRight' ? 1 : -1)); } }}>
    <span className="ad-label">Publicidade</span>
    <AdCreative key={current.id} campaign={current} embedded preview={preview} onImageError={() => onImageError?.(current.id)} onClick={onClick} />
    <div className="ad-carousel-controls"><button type="button" aria-label="Anúncio anterior" onClick={() => move(index - 1)}>←</button>
      <div className="ad-carousel-pages">{campaigns.map((campaign, i) => <button type="button" key={campaign.id} aria-label={`Mostrar anúncio ${i + 1}: ${campaign.campaignName}`} aria-pressed={current.id === campaign.id} onClick={() => move(i)}>{i + 1}</button>)}</div>
      <button type="button" aria-label="Próximo anúncio" onClick={() => move(index + 1)}>→</button>
      {autoplay && !reduced && <button type="button" onClick={() => setPaused(value => !value)}>{paused ? 'Retomar rotação' : 'Pausar rotação'}</button>}
    </div>
  </aside>;
}
