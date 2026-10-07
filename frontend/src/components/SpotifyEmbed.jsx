import { useEffect, useRef, useState } from 'react';
import { spotifyEmbedUrls } from '../services/spotifyEmbed';

function PlaylistPlayer({ urls, name }) {
  const [failed, setFailed] = useState(false);
  const iframe = useRef(null);
  useEffect(() => {
    const frame = iframe.current;
    const fail = () => setFailed(true);
    frame?.addEventListener('error', fail);
    return () => frame?.removeEventListener('error', fail);
  }, []);
  return <div className="spotify-embed">
    {failed ? <div className="spotify-fallback-panel" role="status"><span aria-hidden="true">♫</span><p>Não foi possível carregar o player do Spotify.</p><strong>Ouça esta playlist no Spotify.</strong></div>
      : <><iframe
        ref={iframe}
        title={`Player oficial do Spotify — ${name}`}
        src={urls.embedUrl}
        width="100%"
        height="352"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        frameBorder="0"
      /><button type="button" className="spotify-fallback" onClick={() => setFailed(true)}>Player não carregou?</button></>}
    <a className={'spotify-external' + (failed ? ' spotify-external-fallback' : '')} href={urls.canonicalUrl} target="_blank" rel="noopener noreferrer">Abrir no Spotify ↗</a>
  </div>;
}

export function SpotifyEmbed({ url, name }) {
  const urls = spotifyEmbedUrls(url);
  if (!urls) return <p role="status">Não foi possível carregar o player do Spotify.</p>;
  return <PlaylistPlayer key={urls.playlistId} urls={urls} name={name} />;
}
