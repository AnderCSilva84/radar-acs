import { useEffect } from 'react';
export function AdminRoute({ admin, redirect, children }) {
  useEffect(() => { if (admin.status === 'anonymous') redirect('/login'); }, [admin.status, redirect]);
  if (admin.status === 'loading' || admin.status === 'anonymous') return <section className="inner-page" role="status">Verificando acesso...</section>;
  if (admin.status !== 'authorized') return <section className="inner-page"><h1>{admin.status === 'denied' ? 'Acesso negado' : 'Administração indisponível'}</h1><p>Somente o administrador autorizado pode acessar esta área.</p>{admin.user && <button className="text-button" onClick={admin.logout}>Sair</button>}</section>;
  return <><nav className="admin-nav" aria-label="Administração"><a href="/admin">Admin</a><a href="/admin/preferences">Preferências</a><a href="/admin/calendar">Calendário</a><a href="/admin/advertisers">Anunciantes</a><button className="text-button" onClick={admin.logout}>Sair</button></nav>{children}</>;
}
