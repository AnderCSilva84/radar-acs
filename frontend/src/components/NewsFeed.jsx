import { NewsItem } from './NewsItem';
import { Icon } from './Icon';
import { EditionSummary } from './EditionSummary';
import { AdSlot } from './AdSlot';
export function NewsFeed({ briefing, onRead, campaigns = [] }) {
  const news = Array.isArray(briefing.noticias) ? briefing.noticias : [];
  const subtitle = news.length === 1 ? '1 assunto que merece sua atenção.'
    : news.length > 1 ? `${news.length} assuntos que merecem sua atenção.` : 'Os assuntos que merecem sua atenção.';
  return <section className="news-section" aria-labelledby="radar-today"><div className="section-heading"><div><h2 id="radar-today">Seu Radar hoje</h2><p className="subtle">{subtitle}</p></div></div>
    {news.length ? <div className="editorial-layout"><div className="news-main"><NewsItem news={news[0]} lead index={0} /><AdSlot position="HOME_MIDDLE" campaigns={campaigns} /><div className="news-grid">{news.slice(1).map((item, index) => <NewsItem key={item.id ?? index} news={item} index={index + 1} />)}</div></div><div className="editorial-sidebar"><EditionSummary briefing={briefing} count={news.length} onRead={onRead} /><AdSlot position="SIDEBAR" campaigns={campaigns} /></div></div>
      : <div className="script-invite"><Icon name="book" width="28" height="28"/><div><h3>Os destaques estão no seu briefing.</h3><p>Leia o roteiro completo e acompanhe os assuntos desta edição.</p></div><button className="text-button" onClick={onRead}>Ler roteiro<Icon name="arrow"/></button></div>}
  </section>;
}
