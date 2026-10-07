import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { EditionHero as BriefingHero } from './components/EditionHero';
import { NewsFeed } from './components/NewsFeed';
import { BriefingModal } from './components/BriefingModal';
import { LoadState } from './components/LoadState';
import { useBriefing } from './hooks/useBriefing';
import { useNavigation } from './hooks/useNavigation';
import { AdSlot } from './components/AdSlot';
import { useCampaigns } from './hooks/useCampaigns';
import { useLive } from './hooks/useLive';
import { RadarLive } from './components/RadarLive';
import { RadioPlayer } from './components/RadioPlayer';
import { HomeListen } from './components/HomeListen';
import {AudienceConsent} from './components/Audience';
const page = (load, name) => lazy(() => load().then(module => ({ default: module[name] })));
const AdminArea = page(() => import('./pages/AdminArea'), 'AdminArea');
const History = page(() => import('./pages/History'), 'History');
const Listen = page(() => import('./pages/Listen'), 'Listen');
const Legal = page(() => import('./pages/Legal'), 'Legal');
export default function App() {
  const { path, navigate, redirect } = useNavigation();
  const administrative = path.startsWith('/admin') || ['/preferences', '/login'].includes(path);
  const liveState = useLive(['/', '/listen', '/live'].includes(path));
  const radioPlayer = useRef(null);
  const campaigns = useCampaigns(path === '/' || path === '/history');
  useEffect(() => { if (path === '/preferences') redirect('/admin/preferences'); }, [path, redirect]);

  const { status, briefing, retry } = useBriefing(['/', '/listen'].includes(path));
  const [reading, setReading] = useState(false);
  const [historyOnline, setHistoryOnline] = useState(false);
  return <><a className="skip-link" href="#hoje">Pular para o conteúdo</a><div className={administrative ? "page-shell" : "page-shell public-page"}><Header path={path} navigate={navigate} connectionLabel={administrative ? 'Administração' : ['/privacy', '/terms'].includes(path) ? 'Informações do serviço' : undefined} online={['/listen', '/live'].includes(path) ? liveState.status === 'ready' : path === '/history' ? historyOnline : status === 'ready' || status === 'empty'} />
    <main id="hoje"><Suspense fallback={<p role="status">Carregando página...</p>}>{path === '/listen' ? <Listen state={liveState} onPlay={item => radioPlayer.current?.play(item)} briefing={briefing} onRead={() => setReading(true)} /> : path === '/live' ? <section className="inner-page live-page"><div className="live-page-hero"><span className="eyebrow">ACOMPANHE O DIA</span><h1>Radar Ao Vivo</h1><p>Acompanhe o dia.</p></div>{liveState.status === 'error' ? <p>Radar Ao Vivo indisponível.</p> : liveState.status === 'loading' ? <p>Carregando...</p> : liveState.data.football.enabled ? <RadarLive state={liveState} /> : <p>O acompanhamento de futebol está desativado.</p>}</section> : ['/privacy', '/terms'].includes(path) ? <Legal type={path.slice(1)} /> : path === '/history' ? <History onConnectionChange={setHistoryOnline} campaigns={campaigns} /> : administrative ? <AdminArea path={path} redirect={redirect} briefing={briefing} /> : path !== '/' ? <section className="inner-page"><h1>Página não encontrada</h1><a className="text-button" href="/" onClick={event => navigate(event, '/')}>Voltar para Hoje</a></section> : status === 'ready' ? <><BriefingHero briefing={briefing} onRead={() => setReading(true)} /><AdSlot position="HOME_TOP" campaigns={campaigns} /><AdSlot position="SPECIAL_SPONSOR" campaigns={campaigns} /><NewsFeed home briefing={briefing} onRead={() => setReading(true)} campaigns={campaigns} priorities={liveState.data?.preferences.editorial} liveState={liveState} /><HomeListen items={liveState.data?.media} /><AdSlot position="HOME_BOTTOM" campaigns={campaigns} /></> : <LoadState status={status} retry={retry} />}</Suspense></main>
    <footer><span>RADAR ACS <i>·</i> Informação para o seu dia.</span><span>Feito para ouvir. Pensado para você. <a href="/admin" onClick={event => navigate(event, '/admin')}>Configurações</a></span><nav className="legal-links" aria-label="Informações legais"><a href="/privacy" onClick={event => navigate(event, '/privacy')}>Política de Privacidade</a><a href="/terms" onClick={event => navigate(event, '/terms')}>Termos de Uso</a></nav></footer>
  </div><AudienceConsent path={path}/><RadioPlayer ref={radioPlayer} />{reading && briefing && <BriefingModal briefing={briefing} onClose={() => setReading(false)} />}</>;
}


