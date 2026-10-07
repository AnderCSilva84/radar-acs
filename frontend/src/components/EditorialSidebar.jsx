import { categoryTone, editorialText } from '../utils/editorial';
export function EditorialSidebar({ news }) {
  const categories = [...new Set(news.map(item => item.categoria).filter(Boolean))];
  return <aside className="editorial-directory" aria-labelledby="radar-directory-title"><span className="eyebrow">EXPLORE</span><h3 id="radar-directory-title">E ainda no Radar</h3><nav aria-label="Explore o Radar">
    {categories.map(category => <a key={category} href={`#news-${news.findIndex(item => item.categoria === category)}`} data-tone={categoryTone(category)}><span className="directory-dot" />{editorialText(category)}<span aria-hidden="true">↗</span></a>)}
    <a href="/live"><span className="directory-dot" />Ao Vivo<span aria-hidden="true">↗</span></a><a href="/listen"><span className="directory-dot" />Ouvir<span aria-hidden="true">↗</span></a>
  </nav></aside>;
}
