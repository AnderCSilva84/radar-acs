import { EditionCover } from './EditionCover';
import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';
import { estimateMinutes, formatDate } from '../utils/briefing';
import { AnimatedRadar } from './AnimatedRadar';

export function EditionHero({ briefing, onRead }) {
  const count = Array.isArray(briefing.noticias) ? briefing.noticias.length : null;
  return <section className="edition-hero" aria-labelledby="briefing-title">
    <div className="edition-hero-details">
      <div>
        <span className="eyebrow">RADAR ACS · {briefing.editionType === 'special' ? 'EDIÇÃO ESPECIAL' : 'EDIÇÃO DO DIA'}</span>
        <h2 id="briefing-title">{briefing.titulo}</h2>
        {briefing.specialTitle && <p className="special-headline">{briefing.specialTitle}</p>}
        <p>{formatDate(briefing.data)}</p>
        <p className="edition-intro">Os assuntos desta edição, em uma leitura direta. Informação para acompanhar o que importa.</p>
        <div className="briefing-meta">{count !== null && <span>{count} {count === 1 ? 'assunto' : 'assuntos'}</span>}<span><Icon name="clock" />aproximadamente {estimateMinutes(briefing.roteiroAlexa)} min de leitura</span><StatusBadge /></div>
      </div>
      {onRead && <button className="primary-button" onClick={onRead}><Icon name="book" />Ler briefing<Icon name="arrow" /></button>}
    </div>
    <div className="edition-hero-visual"><div className="radar-caption"><span>NO SEU RADAR</span><span>{count ?? 0} SINAIS EDITORIAIS</span></div><AnimatedRadar count={count ?? 0} /><EditionCover briefing={briefing} priority /></div>
  </section>;
}
