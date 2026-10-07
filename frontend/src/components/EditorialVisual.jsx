import { useEffect, useRef, useState } from 'react';
import { categoryTone, editorialImage } from '../utils/editorial';
const symbols = { technology: 'IA', development: '</>', opportunity: '↗', world: '◎', sport: '◉', economy: '↗', entertainment: '✦', general: 'R' };
export function EditorialVisual({ news, variant }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const image = editorialImage(news);
  const picture = useRef(null);
  useEffect(() => {
    if (!image || image === failedUrl || typeof IntersectionObserver === 'undefined') return;
    const target = picture.current;
    let timer;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { timer = setTimeout(() => { if (!target?.complete) setFailedUrl(image); }, 10000); observer.disconnect(); }
    });
    observer.observe(target);
    return () => { observer.disconnect(); clearTimeout(timer); };
  }, [image, failedUrl]);
  const tone = categoryTone(news.categoria);
  return <div className={`editorial-visual tone-${tone}`}>
    {image && image !== failedUrl ? <img ref={picture} src={image} alt={news.imageAlt || news.titulo || ''} loading="lazy" decoding="async" referrerPolicy="no-referrer" onLoad={event => { if (event.currentTarget.naturalWidth < 320 || event.currentTarget.naturalHeight < 160) setFailedUrl(image); }} onError={() => setFailedUrl(image)} />
      : <div className="category-art" aria-hidden="true"><span className="category-art-grid" /><span className="category-art-orbit" /><CategoryGraphic tone={tone} seed={news.id || news.titulo} variant={variant} /><span className="category-art-caption">RADAR ACS · {news.categoria || 'INFORMAÇÃO'}</span></div>}
  </div>;
}
function CategoryGraphic({ tone, seed, variant }) {
  const variation = (Number.isInteger(variant) ? variant : [...String(seed || '')].reduce((sum, character) => sum + character.charCodeAt(0), 0)) % 3;
  const motifs = {
    technology: <><path d="M35 45h55v40h40V45h55M35 155h55v-40h40v40h55"/><rect x="90" y="85" width="40" height="30"/><circle cx="35" cy="45" r="5"/><circle cx="185" cy="155" r="5"/></>,
    development: <><path d="m75 65-35 35 35 35m70-70 35 35-35 35m-22-85-25 100"/></>,
    opportunity: <><path d="M45 150 165 45m-60 0h60v60M40 100l20-20m90 80 25-25"/></>,
    world: <><circle cx="110" cy="100" r="66"/><ellipse cx="110" cy="100" rx="30" ry="66"/><path d="M44 100h132M55 65h110M55 135h110"/></>,
    economy: <><path d="M40 45v115h140M60 140V110h20v30m20 0V85h20v55m20 0V60h20v80M60 85l45-30 30 10 40-35"/></>,
    sport: <><rect x="35" y="45" width="150" height="110" rx="5"/><path d="M110 45v110M35 80h25v40H35m150-40h-25v40h25"/><circle cx="110" cy="100" r="23"/></>,
    entertainment: <><path d="M30 100q20-80 40 0t40 0t40 0t40 0M30 135q20-50 40 0t40 0t40 0t40 0"/></>
  };
  const neutral = <><circle cx="110" cy="100" r={45 + variation * 8}/><circle cx="110" cy="100" r="22"/><path d={variation === 0 ? 'M110 28v144M38 100h144M110 100l55-45' : variation === 1 ? 'M50 45l120 110M50 155 170 45M110 100l60 12' : 'M40 85h140M70 35l80 130M110 100l-58 28'}/><circle cx={150 - variation * 25} cy={60 + variation * 20} r="5" fill="currentColor"/></>;
  return motifs[tone] || seed ? <svg className="category-graphic" viewBox="0 0 220 200" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" data-motif={tone}>{motifs[tone] || neutral}</svg> : <strong>{symbols.general}</strong>;
}
