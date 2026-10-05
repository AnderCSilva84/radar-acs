import { Icon } from './Icon';
import { sourceLink } from '../utils/briefing';
export function NewsItem({ news, lead = false, index }) {
  const link = sourceLink(news.sourceUrl || news.url);
  return <article className={'news-item' + (lead ? ' news-lead' : '')} data-category={news.categoria || ''}><div>
    {index !== undefined && <span className="news-number">{String(index + 1).padStart(2, '0')}{lead && ' / EM DESTAQUE'}</span>}
    {news.categoria && <span className="category">{news.categoria}</span>}
    <h3>{news.titulo}</h3>{news.resumo && <p>{news.resumo}</p>}
    {news.fonte && <div className="source">{link ? <a href={link} target="_blank" rel="noopener noreferrer">{news.fonte}<Icon name="arrow" /></a> : <span>{news.fonte}</span>}</div>}
  </div></article>;
}
