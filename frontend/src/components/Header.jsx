import { AnimatedRadar } from './AnimatedRadar';
export function Header({ online = false, path = '/', navigate, connectionLabel, newsCount = 3 }) {
  return <header className="header">
    <a className="brand" href="/" onClick={event => navigate?.(event, '/')} aria-label="Radar ACS — início">
      <AnimatedRadar count={newsCount} small />
      <span><strong>RADAR <span>ACS</span></strong><small>Seu dia. Suas notícias. Suas oportunidades.</small></span>
    </a>
    <nav aria-label="Navegação principal">
      {[['/', 'Hoje'], ['/history', 'Histórico'], ['/live', 'Ao Vivo'], ['/listen', 'Ouvir']].map(([url, label]) => <a key={url} href={url} aria-current={path === url ? 'page' : undefined} onClick={event => navigate?.(event, url)}>{label}</a>)}
    </nav>
    <span className={'connection ' + (online ? '' : 'offline')}><i />{online ? 'Online' : connectionLabel || 'Offline'}</span>
  </header>;
}
