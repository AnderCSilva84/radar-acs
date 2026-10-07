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
        <span className="eyebrow">RADAR ACS · INFORMAÇÃO PARA O SEU DIA</span>
        <h1 className="portal-headline">Seu radar pessoal<br />do que <em>importa.</em></h1>
        <p className="portal-hero-intro">Notícias, tecnologia e oportunidades. Uma seleção para entender o dia e seguir em frente.</p>
        <span className="hero-edition-kind">{briefing.editionType === 'special' ? 'EDIÇÃO ESPECIAL' : 'EDIÇÃO DO DIA'}</span>
        <h2 id="briefing-title">{briefing.titulo}</h2>
        {briefing.specialTitle && <p className="special-headline">{briefing.specialTitle}</p>}
        <p>{formatDate(briefing.data)}</p>
        <div className="briefing-meta">{count !== null && <span>{count} {count === 1 ? 'assunto' : 'assuntos'}</span>}<span><Icon name="clock" />aproximadamente {estimateMinutes(briefing.roteiroAlexa)} min de leitura</span><StatusBadge /></div>
      </div>
      <div className="hero-actions">{onRead && <button className="primary-button" onClick={onRead}><Icon name="book" />Ler edição<Icon name="arrow" /></button>}<a className="hero-secondary" href="/listen">Ouvir o Radar <span aria-hidden="true">↗</span></a><a className="hero-tertiary" href="/live">Ao Vivo <span aria-hidden="true">↗</span></a></div>
    </div>
    <div className="edition-hero-visual"><div className="radar-caption"><span>NO SEU RADAR</span><span>{count ?? 0} SINAIS EDITORIAIS</span></div><AnimatedRadar count={count ?? 0} /><EditionCover briefing={briefing} priority /></div>
  </section>;
}
