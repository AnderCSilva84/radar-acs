export function AdminHome() {
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow">SUPERADMIN</span><h1>Seu centro de configuração</h1><p>Preferências, agenda editorial e patrocínios em um só lugar.</p></div><div className="admin-shortcuts">
    <a href="/admin/preferences"><span>01</span><h2>Preferências</h2><p>Assuntos prioritários e times seguidos.</p></a>
    <a href="/admin/calendar"><span>02</span><h2>Calendário</h2><p>Eventos e edições especiais.</p></a>
    <a href="/admin/advertisers"><span>03</span><h2>Anunciantes</h2><p>Campanhas e patrocínios diretos.</p></a>
  </div></section>;
}
