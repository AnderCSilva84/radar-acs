import { useId, useState } from 'react';
import { COVER_ASSETS } from '../services/covers';
import { BrandSignature } from './BrandSignature';

export function CoverArt({ cover, thumbnail = false, priority = false }) {
  const gradient = useId();
  const [failed, setFailed] = useState(false);
  const [fallbackPng, setFallbackPng] = useState(false);
  const asset = cover === 'eleicoes-2026' ? COVER_ASSETS.election : COVER_ASSETS.news;
  const webp = cover === 'eleicoes-2026' ? COVER_ASSETS.electionWebp : COVER_ASSETS.newsWebp;
  if (!failed && (cover === 'radar-news' || cover === 'eleicoes-2026')) return <picture className="cover-art">
    {webp && !fallbackPng && <source type="image/webp" srcSet={webp} />}
    <img className="cover-art news-cover-image" src={asset} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" width="1672" height="941"
      onError={() => { if (webp && !fallbackPng) setFallbackPng(true); else setFailed(true); }} />
  </picture>;
  return <div className={'cover-art cover-composition cover-' + cover}><svg viewBox="0 0 640 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><radialGradient id={gradient}><stop stopColor="#5398af" stopOpacity=".45" /><stop offset="1" stopColor="#0e1723" stopOpacity="0" /></radialGradient></defs>
    <rect width="640" height="360" fill="#0e1723" />
    {cover === 'acs' ? <>
        <defs><linearGradient id={gradient + '-acs'} x1="0" x2="1" y1="1" y2="0"><stop stopColor="#071529" /><stop offset=".7" stopColor="#10386b" /><stop offset="1" stopColor="#125db0" /></linearGradient></defs>
        <rect width="640" height="360" fill={`url(#${gradient}-acs)`} />
        <g fill="none" stroke="#85ddeb" strokeOpacity=".22"><path d="M300 360V260h100v-45h240M0 310h260v-90h70M330 0v70h80M460 360v-65h180" /><path d="M0 335h275v-70h50M380 360v-55h260" strokeOpacity=".1" /></g>
        <g fill="#69bcf9">{[[560,245,10],[577,228,8],[593,212,6],[610,199,4],[320,218,6]].map(([x,y,size]) => <rect key={x} x={x} y={y} width={size} height={size} opacity=".5" />)}</g>
      </>
      : <g transform="translate(420 180)"><g fill="none" stroke="#85ddeb" strokeOpacity=".3">{[35, 75, 115, 155].map(radius => <circle key={radius} r={radius} />)}<path d="M-155 0h310M0-155v310" strokeDasharray="3 8" /></g><path d="M0 0 110-110A155 155 0 0 1 155 0Z" fill="#85ddeb" fillOpacity=".09" /><path d="m0 0 110-110" stroke="#85ddeb" /><g fill="#85ddeb"><circle cx="70" cy="-68" r="4" /><circle cx="-75" cy="60" r="3" /><circle r="4" /></g></g>}
  </svg><BrandSignature prominent={cover === 'acs'} decorative={thumbnail} /></div>;
}
