import { mediaUrl as safeUrl } from '../services/media';
import { MediaCard } from '../components/MediaCard';
import { NewsFeed } from '../components/NewsFeed';
import {ListenerCount} from '../components/Audience';
export function Listen({ state, onPlay, briefing, onRead }) {
  const media = (state.data?.media || []).filter(item => item.enabled);
  const radios = media.filter(item => item.usageStatus === 'approved' && ((item.mediaType === 'RADIO_STREAM' && safeUrl(item.streamUrl)) || (item.mediaType === 'EXTERNAL_RADIO' && safeUrl(item.externalUrl))));
  const playlists = media.filter(item => item.mediaType === 'SPOTIFY_PLAYLIST' && safeUrl(item.spotifyUrl, true));
  return <section className="inner-page listen-page"><div className="listen-hero"><img className="listen-hero-photo" src="/images/listen-headphones.webp" alt="" fetchPriority="high" /><div className="listen-hero-copy"><span className="eyebrow">NO SEU RITMO</span><h1>Ouvir</h1><p>Rádios autorizadas e playlists para acompanhar seu dia de trabalho, estudo, lazer e informação.</p><div className="listen-quicklinks" aria-label="Explore a área Ouvir">
    {playlists.length > 0 && <a href="#playlists"><span aria-hidden="true">♫</span>Música</a>}{radios.length > 0 && <a href="#radios"><span aria-hidden="true">◉</span>Notícias</a>}<a href="/live"><span aria-hidden="true">◎</span>Esportes</a>{playlists.length > 0 && <a href="#playlists"><span aria-hidden="true">✦</span>Foco</a>}
  </div></div><div className="listen-photo-caption" aria-hidden="true">Trabalhe<br />Estude<br />Acompanhe<br />Relaxe<span /></div></div>
    <ListenerCount/>
    {state.status === 'loading' && <p role="status">Carregando mídias...</p>}
    {state.status === 'error' && <p role="alert">Não foi possível carregar as mídias agora.</p>}
    {state.status === 'ready' && !radios.length && !playlists.length && <div className="listen-empty"><span aria-hidden="true">♫</span><p>Novas formas de acompanhar seu dia estão chegando.</p></div>}
    {[['Rádios ao vivo', radios], ['Playlists', playlists]].filter(([, items]) => items.length).map(([title, items]) => <section id={title === 'Playlists' ? 'playlists' : 'radios'} className={'live-section media-section ' + (title === 'Playlists' ? 'spotify-section' : 'radio-section')} key={title}><div className="section-heading"><div><h2><span className="media-section-icon" aria-hidden="true">{title === 'Playlists' ? '♫' : '◉'}</span>{title === 'Playlists' ? 'Playlists do Spotify' : title}</h2><p className="subtle">{title === 'Playlists' ? 'Música para programar, estudar, relaxar e muito mais.' : 'Notícias, informação e esportes, direto das transmissões oficiais.'}</p></div><span className="section-count">{items.length} {items.length === 1 ? 'opção' : 'opções'}</span></div><div data-count={items.length} className={title === 'Playlists' ? 'live-grid playlist-grid' : 'live-grid radio-grid'}>{items.map((item, index) => <MediaCard key={item.id} item={item} onPlay={onPlay} featured={index === 0} />)}</div></section>)}
    <p className="subtle media-disclosure">Streams autorizados reproduzem dentro do Radar. Outras rádios abrem a transmissão oficial; playlists usam o player oficial do Spotify ou abrem no Spotify.</p>
    {briefing && <NewsFeed briefing={briefing} onRead={onRead} liveState={state} priorities={state.data?.preferences?.editorial} />}
  </section>;
}
