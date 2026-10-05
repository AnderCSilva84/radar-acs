import { Icon } from './Icon';
import { StatusBadge } from './StatusBadge';
import { estimateMinutes } from '../utils/briefing';

export function EditionSummary({ briefing, count, onRead }) {
  return <aside className="edition-summary" aria-labelledby="edition-summary-title">
    <h3 id="edition-summary-title" className="eyebrow">EDIÇÃO DE HOJE</h3>
    <p className="summary-title">{briefing.titulo}</p>
    <div className="summary-meta">
      <span>{count} {count === 1 ? 'assunto' : 'assuntos'}</span>
      <span><Icon name="clock" />aproximadamente {estimateMinutes(briefing.roteiroAlexa)} min</span>
    </div>
    <StatusBadge />
    <button className="text-button" onClick={onRead}>Ler briefing<Icon name="arrow" /></button>
  </aside>;
}
