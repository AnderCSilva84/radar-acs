import { mediaUrl } from '../services/media';
import { SpotifyEmbed } from './SpotifyEmbed';
export function MediaCard({ item, onPlay, preview = false, featured = false }) {
  const radio = item.mediaType === 'RADIO_STREAM';
  const external = item.mediaType === 'EXTERNAL_RADIO';
  const logo = mediaUrl(item.logoUrl);
  return <article className={`live-card media-card ${radio || external ? 'radio-card' : 'spotify-card'} ${featured ? 'media-featured' : ''}`}>
    {featured && (radio || external) && <svg className="radio-studio-art" aria-hidden="true" viewBox="0 0 200 200" fill="none"><rect x="74" y="20" width="52" height="100" rx="26" stroke="currentColor" strokeWidth="5"/><path d="M58 90v12a42 42 0 0 0 84 0V90M100 144v30m-35 0h70M85 45h30M85 60h30M85 75h30" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/></svg>}
    {logo && <img className="media-logo" src={logo} alt="" loading="lazy" referrerPolicy="no-referrer" />}
    <span className="category">{radio ? 'RÁDIO · AO VIVO' : external ? 'RÁDIO · TRANSMISSÃO OFICIAL' : 'PLAYLIST · SPOTIFY'}</span>
    <h3>{item.name}</h3><p>{item.description}</p>
    {preview ? <button type="button" className="primary-button" disabled>{radio ? '▶ Ouvir ao vivo' : external ? 'Abrir transmissão oficial ↗' : 'Abrir no Spotify ↗'}</button>
      : radio ? <button className="primary-button" onClick={() => onPlay(item)}>Ouvir {item.name}</button>
        : external ? <a className="primary-button" href={mediaUrl(item.externalUrl)} target="_blank" rel="noopener noreferrer">Abrir transmissão oficial ↗</a>
          : <SpotifyEmbed url={item.spotifyUrl} name={item.name} />}
  </article>;
}
