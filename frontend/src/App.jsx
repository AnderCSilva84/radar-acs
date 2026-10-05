import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { EditionHero as BriefingHero } from './components/EditionHero';
import { NewsFeed } from './components/NewsFeed';
import { BriefingModal } from './components/BriefingModal';
import { LoadState } from './components/LoadState';
import { useBriefing } from './hooks/useBriefing';
import { useNavigation } from './hooks/useNavigation';
import { History } from './pages/History';
import { Preferences } from './pages/Preferences';
import { useAdmin } from './hooks/useAdmin';
import { AdminRoute } from './components/AdminRoute';
import { Login } from './pages/Login';
import { Calendar } from './pages/Calendar';
import { AdminHome } from './pages/AdminHome';
import { Advertisers } from './pages/Advertisers';
import { AdSlot } from './components/AdSlot';
import { useCampaigns } from './hooks/useCampaigns';
import { Legal } from './pages/Legal';
export default function App() {
  const { path, navigate, redirect } = useNavigation();
  const administrative = ['/admin', '/admin/preferences', '/admin/calendar', '/admin/advertisers', '/preferences', '/login'].includes(path);
  const campaigns = useCampaigns(path === '/' || path === '/history');
  useEffect(() => { if (path === '/preferences') redirect('/admin/preferences'); }, [path, redirect]);
  const admin = useAdmin(administrative);
  const { status, briefing, retry } = useBriefing(path === '/');
  const [reading, setReading] = useState(false);
  const [historyOnline, setHistoryOnline] = useState(false);
  return <><a className="skip-link" href="#hoje">Pular para o conteúdo</a><div className="page-shell"><Header path={path} navigate={navigate} connectionLabel={administrative ? 'Administração' : ['/privacy', '/terms'].includes(path) ? 'Informações do serviço' : undefined} online={path === '/history' ? historyOnline : status === 'ready' || status === 'empty'} />
    <main id="hoje">{['/privacy', '/terms'].includes(path) ? <Legal type={path.slice(1)} /> : path === '/history' ? <History onConnectionChange={setHistoryOnline} campaigns={campaigns} /> : path === '/login' ? <Login admin={admin} redirect={redirect} /> : administrative ? <AdminRoute admin={admin} redirect={redirect}>{admin.settings && (path === '/admin' ? <AdminHome /> : path === '/admin/advertisers' ? <Advertisers user={admin.user} /> : path === '/admin/calendar' ? <Calendar settings={admin.settings} onSave={admin.save} /> : <Preferences briefing={briefing} serverSettings={admin.settings} onSave={admin.save} />)}</AdminRoute> : path !== '/' ? <section className="inner-page"><h1>Página não encontrada</h1><a className="text-button" href="/" onClick={event => navigate(event, '/')}>Voltar para Hoje</a></section> : status === 'ready' ? <><AdSlot position="HOME_TOP" campaigns={campaigns} /><BriefingHero briefing={briefing} onRead={() => setReading(true)} /><AdSlot position="SPECIAL_SPONSOR" campaigns={campaigns} /><NewsFeed briefing={briefing} onRead={() => setReading(true)} campaigns={campaigns} /><AdSlot position="HOME_BOTTOM" campaigns={campaigns} /></> : <LoadState status={status} retry={retry} />}</main>
    <footer><span>RADAR ACS <i>·</i> Informação para o seu dia.</span><span>Feito para ouvir. Pensado para você. <a href="/admin" onClick={event => navigate(event, '/admin')}>Configurações</a></span><nav className="legal-links" aria-label="Informações legais"><a href="/privacy" onClick={event => navigate(event, '/privacy')}>Política de Privacidade</a><a href="/terms" onClick={event => navigate(event, '/terms')}>Termos de Uso</a></nav></footer>
  </div>{reading && briefing && <BriefingModal briefing={briefing} onClose={() => setReading(false)} />}</>;
}
