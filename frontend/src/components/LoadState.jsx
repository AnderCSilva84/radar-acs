import { Icon } from './Icon';
export function LoadState({ status, retry }) {
  return <section className="load-state" aria-live="polite" aria-busy={status === 'loading'}>
    <div className={'state-symbol ' + (status === 'loading' ? 'loading' : '')}><img src="/icons/radar.svg" alt="" width="72" height="72" /></div>
    <span className="eyebrow">SEU BRIEFING PESSOAL</span>
    <h1>{status === 'loading' ? 'Preparando seu Radar...' : status === 'empty' ? 'Ainda não há uma edição publicada.' : 'Não foi possível carregar o Radar agora.'}</h1>
    <p>{status === 'loading' ? 'Um instante para colocar o dia em perspectiva.' : status === 'empty' ? 'Seu próximo briefing aparecerá aqui quando estiver disponível.' : 'Tente novamente em alguns instantes.'}</p>
    {status === 'error' && <button className="primary-button" onClick={retry}><Icon name="refresh" />Tentar novamente</button>}
  </section>;
}
