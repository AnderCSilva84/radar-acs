import { YourRadar } from './YourRadar';
import { NewsItem } from './NewsItem';
import { Icon } from './Icon';
import { EditionSummary } from './EditionSummary';
import { AdSlot } from './AdSlot';
import { prioritizeNews } from '../services/live';
import { EditorialSidebar } from './EditorialSidebar';
import { formatDate } from '../utils/briefing';
import { RadarLive } from './RadarLive';
export function NewsFeed({ briefing, onRead, campaigns = [], priorities, liveState, home = false }) {
  const news = prioritizeNews(Array.isArray(briefing.noticias) ? briefing.noticias : [], priorities);
  const subtitle = news.length === 1 ? '1 assunto que merece sua atenção.'
    : news.length > 1 ? `${news.length} assuntos que merecem sua atenção.` : 'Os assuntos que merecem sua atenção.';
  return <section id="edition-today" className={home ? "news-section home-editorial-section" : "news-section"} aria-labelledby="radar-today"><div className="section-heading"><div><span className="eyebrow">SEU RADAR HOJE</span><h2 id="radar-today"><span className="news-section-icon" aria-hidden="true">▤</span>Últimas notícias</h2><p className="subtle">Os principais assuntos do dia, direto da fonte.</p><span className="visually-hidden">{subtitle}</span></div><time dateTime={briefing.data}>{formatDate(briefing.data).replace(/ de \d{4}$/, '')}</time></div>
    {news.length ? <><div className={home ? "editorial-layout home-editorial-layout" : "editorial-layout reference-news-grid"}>{home ? <><div className="home-editorial-content"><div className="news-main"><NewsItem news={news[0]} lead index={0} /></div>{news.length > 1 && <div className="news-grid secondary-stories">{news.slice(1).map((item, index) => <NewsItem key={item.id ?? index} news={item} index={index + 1} />)}</div>}</div><div className="editorial-sidebar"><YourRadar state={liveState} news={news} /><AdSlot position="SIDEBAR" campaigns={campaigns} /></div></> : <><div className="news-main"><NewsItem news={news[0]} lead index={0} /></div><div className="news-grid secondary-stories">{news.slice(1).map((item, index) => <NewsItem key={item.id ?? index} news={item} index={index + 1} />)}</div><div className="editorial-sidebar">{liveState && <RadarLive state={liveState} compact />}<EditorialSidebar news={news} /><EditionSummary briefing={briefing} count={news.length} onRead={onRead} /><AdSlot position="SIDEBAR" campaigns={campaigns} /></div></>}</div><AdSlot position="HOME_MIDDLE" campaigns={campaigns} /></>
      : <div className="script-invite"><Icon name="book" width="28" height="28"/><div><h3>Os destaques estão no seu briefing.</h3><p>Leia o roteiro completo e acompanhe os assuntos desta edição.</p></div><button className="text-button" onClick={onRead}>Ler roteiro<Icon name="arrow"/></button></div>}
  </section>;
}
