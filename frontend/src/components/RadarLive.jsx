import { TeamCrest, FollowedTeamCrests } from './TeamCrest';
const labels = { UPCOMING: 'PRÓXIMO JOGO', LIVE: 'AO VIVO', HALFTIME: 'INTERVALO', FINISHED: 'ENCERRADO', POSTPONED: 'ADIADO', CANCELLED: 'CANCELADO' };
function SignalArt({ kind = 'football' }) {
  return <svg className={`signal-art signal-art-${kind}`} viewBox="0 0 240 160" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="170" cy="65" r="66" opacity=".2" /><path d="M0 130 240 30M0 155 240 55" opacity=".15" />
    {kind === 'football' ? <><path d="M35 40h150v85H35zM110 40v85" /><circle cx="110" cy="82" r="24" /><path d="M35 65h22v34H35m150-34h-22v34h22" /></> : kind === 'events' ? <><path d="M50 40h125v85H50zM50 65h125M75 30v22m75-22v22M75 85h20m30 0h25M75 105h20" /></> : <><circle cx="110" cy="82" r="8" /><path d="M87 59a33 33 0 0 0 0 46m46-46a33 33 0 0 1 0 46M70 42a57 57 0 0 0 0 80m80-80a57 57 0 0 1 0 80M110 98v35" /></>}
  </svg>;
}
export function LiveMatchCard({ match }) {
  return <article className="live-card"><span className="category">{labels[match.status]}</span>
    <div className="live-match-crests"><TeamCrest team={match.home} /><span aria-hidden="true">×</span><TeamCrest team={match.away} /></div><h3>{match.home.name} × {match.away.name}</h3>
    {match.score && <strong className="live-score">{match.score.home} – {match.score.away}</strong>}
    {match.competition && <p>{match.competition}</p>}
    {match.startsAt && <time dateTime={match.startsAt}>{new Date(match.startsAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time>}
  </article>;
}
export function RadarLive({ state, compact = false }) {
  if (state.status !== 'ready' || !state.data.football.enabled) return null;
  const football = state.data.football;
  const groups = [
    ['Próximos jogos', ['UPCOMING']], ['Ao vivo', ['LIVE', 'HALFTIME']],
    ['Resultados', ['FINISHED']], ['Outras partidas', ['POSTPONED', 'CANCELLED']]
  ];
  return <section className="live-section" aria-labelledby="live-title"><div className="section-heading"><div><span className="eyebrow">RADAR AO VIVO</span><h2 id="live-title">Radar Futebol</h2></div></div>
    {football.teams?.length > 0 && <p className="subtle">Acompanhando: {football.teams.map(team => team.name).join(' · ')}</p>}
    <FollowedTeamCrests teams={football.teams} compact={compact} />
    {football.stale && <p role="status">Dados temporariamente indisponíveis. Último resultado disponível pode estar desatualizado.</p>}
    {football.status === 'DELAYED' && <p className="subtle">Resultados com atraso da fonte. Não representam cobertura em tempo real.</p>}
    {football.matches.length ? compact ? <div className="live-grid">{football.matches.map(match => <LiveMatchCard key={match.id} match={match} />)}</div> : groups.map(([title, statuses]) => {
      const matches = football.matches.filter(match => statuses.includes(match.status));
      return matches.length ? <div className="live-match-group" key={title}><h3>{title}</h3><div className="live-grid">{matches.map(match => <LiveMatchCard key={match.id} match={match} />)}</div></div> : null;
    })
      : <div className="live-empty">{!compact && <SignalArt />}{!football.teams?.some(team => team.active !== false) && <span className="live-empty-icon" aria-hidden="true">⚽</span>}<p>{!football.teams?.length ? 'Escolha os times que deseja acompanhar no seu Radar.' : `Você acompanha ${football.teams.length === 1 ? 'este time' : 'seus times'} no seu Radar.`}</p><p className="subtle">Quando houver partidas disponíveis, horários, placares e resultados aparecerão aqui.</p><a href={compact ? '/live' : '/admin/preferences'}>{compact ? 'Ver Radar Ao Vivo →' : 'Gerenciar times acompanhados →'}</a></div>}
    {!compact && !football.matches.length && <div className="live-next"><span className="eyebrow">PRÓXIMOS SINAIS</span><p className="subtle">Capacidades do Radar — sem eventos anunciados.</p><div className="live-capabilities">{[['football', 'Futebol'], ['events', 'Eventos especiais'], ['coverage', 'Coberturas ao vivo']].map(([kind, title]) => <article key={kind}><SignalArt kind={kind} /><h3>{title}</h3></article>)}</div></div>}
  </section>;
}
