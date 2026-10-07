import { Icon } from './Icon';
import { sourceLink } from '../utils/briefing';
import { editorialText, categoryTone } from '../utils/editorial';
import { EditorialVisual } from './EditorialVisual';
export function NewsItem({ news, lead = false, index }) {
  const link = sourceLink(news.sourceUrl || news.url);
  const suppliedDate = news.publishedAt || news.dataPublicacao;
  const parsedDate = typeof suppliedDate === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(suppliedDate) ? new Date(suppliedDate) : null;
  const validDate = parsedDate && Number.isFinite(parsedDate.getTime()) && (suppliedDate.includes('T') || parsedDate.toISOString().slice(0, 10) === suppliedDate);
  const dateLabel = validDate ? parsedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : null;
  const minutes = Number.isFinite(news.readingMinutes) && news.readingMinutes > 0 ? news.readingMinutes : null;
  return <article id={index !== undefined ? `news-${index}` : undefined} className={'news-item' + (lead ? ' news-lead' : '')} data-category={news.categoria || ''} data-tone={categoryTone(news.categoria)}><EditorialVisual news={news} variant={index} /><div className="news-copy">
    {index !== undefined && <span className="news-number">{String(index + 1).padStart(2, '0')}{lead && ' / EM DESTAQUE'}</span>}
    {news.categoria && <span className="category">{editorialText(news.categoria)}</span>}
    <h3>{editorialText(news.titulo)}</h3>{(news.editorialSummary?.trim() || news.resumo || '').split(/\n\s*\n/).filter(Boolean).map((paragraph, i) => <p key={i}>{editorialText(paragraph)}</p>)}
    {news.fonte && <div className="source">{link ? <a href={link} target="_blank" rel="noopener noreferrer">{editorialText(news.fonte)}<Icon name="arrow" /></a> : <span>{editorialText(news.fonte)}</span>}{dateLabel && <time dateTime={suppliedDate}>• {dateLabel}</time>}{minutes && <span>• {minutes} min</span>}{!dateLabel && !minutes && <span className="story-context">Fonte original</span>}</div>}
  </div></article>;
}
