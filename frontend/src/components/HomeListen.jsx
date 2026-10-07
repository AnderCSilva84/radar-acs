import { mediaUrl } from '../services/media';
import { useState } from 'react';
function HomeMediaLogo({ logo, spotify }) {
  const [failed, setFailed] = useState(false);
  return logo && !failed ? <img src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span aria-hidden="true" className="home-media-symbol">{spotify ? '♫' : '◉'}</span>;
}

export function HomeListen({ items = [] }) {
  const media = items.filter(item => item.enabled && (
    item.mediaType === 'SPOTIFY_PLAYLIST' ? mediaUrl(item.spotifyUrl, true) :
      item.usageStatus === 'approved' && (item.mediaType === 'EXTERNAL_RADIO' ? mediaUrl(item.externalUrl) : item.mediaType === 'RADIO_STREAM' && mediaUrl(item.streamUrl))
  )).slice(0, 4);
  if (!media.length) return null;
  return <section className="home-listen" aria-labelledby="home-listen-title"><div className="section-heading"><div><span className="eyebrow">NO SEU RITMO</span><h2 id="home-listen-title">Ouça enquanto acompanha o dia.</h2></div><a href="/listen">Ver tudo em Ouvir →</a></div>
    <div className="home-listen-grid">{media.map(item => {
      const external = item.mediaType === 'EXTERNAL_RADIO';
      const spotify = item.mediaType === 'SPOTIFY_PLAYLIST';
      const logo = mediaUrl(item.logoUrl);
      return <article key={item.id} className={`home-media-card ${spotify ? 'home-media-spotify' : 'home-media-radio'}`}><HomeMediaLogo key={logo} logo={logo} spotify={spotify} /><div><span className="eyebrow">{spotify ? 'PLAYLIST SPOTIFY' : 'RÁDIO'}</span><h3>{item.name}</h3><a href={external ? mediaUrl(item.externalUrl) : '/listen'} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{external ? 'Ouvir transmissão oficial ↗' : 'Ouvir →'}</a></div></article>;
    })}</div>
  </section>;
}
