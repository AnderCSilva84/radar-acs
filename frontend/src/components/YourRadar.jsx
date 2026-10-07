import { FollowedTeamCrests } from './TeamCrest';
import { LiveMatchCard } from './RadarLive';
import {ListenerCount} from './Audience';
export function YourRadar({ state, news = [] }) {
  const football = state?.status === 'ready' && state.data?.football.enabled ? state.data.football : null;
  const categories = [...new Set(news.map(item => item.categoria).filter(Boolean))];
  return <aside className="your-radar" aria-labelledby="your-radar-title">
    <h3 id="your-radar-title">Seu Radar</h3>
    {football && <section className="your-radar-module" aria-labelledby="your-football-title">
      <h4 id="your-football-title">Radar Futebol</h4>
      <FollowedTeamCrests teams={football.teams} compact />
      {football.teams?.length > 0 && <span className="subtle">Acompanhando</span>}
      {football.stale ? <p>Dados temporariamente indisponíveis.</p> : football.matches.length ? <div className="your-radar-matches">{football.matches.map(match => <LiveMatchCard key={match.id} match={match} />)}</div> : <p>Nenhum jogo disponível agora.</p>}
      <a href="/live">Ver Radar Futebol →</a>
    </section>}
    <section className="your-radar-module"><h4><span aria-hidden="true">●</span> Ao Vivo</h4><p>Acompanhe o que está acontecendo.</p><a href="/live">Abrir Radar Ao Vivo →</a></section>
    <section className="your-radar-module"><h4><span aria-hidden="true">♫</span> Ouvir</h4><ListenerCount/><p>Rádio e playlists.</p><a href="/listen">Ouvir agora →</a></section>
    {categories.length > 0 && <nav className="your-radar-categories" aria-label="Assuntos desta edição">{categories.map(category => <a key={category} href={`#news-${news.findIndex(item => item.categoria === category)}`}>{category}</a>)}</nav>}
  </aside>;
}
