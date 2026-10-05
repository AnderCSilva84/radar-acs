import { useEffect, useRef, useState } from 'react';
import { getBriefingHistory } from '../services/historyApi';
import { NewsItem } from '../components/NewsItem';
import { StatusBadge } from '../components/StatusBadge';
import { EditionCover } from '../components/EditionCover';
import { estimateMinutes, formatDate, readableParagraphs } from '../utils/briefing';
import { AdSlot } from '../components/AdSlot';

export function History({ onConnectionChange, campaigns = [] }) {
  const [editions, setEditions] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [status, setStatus] = useState('loading');
  const [selected, setSelected] = useState(null);
  const request = useRef(null);
  const busy = useRef(false);
  const editionHeading = useRef(null);
  const returnButton = useRef(null);
  async function load(next) {
    if (busy.current) return;
    busy.current = true;
    const controller = new AbortController();
    request.current = controller;
    setStatus(next ? 'loading-more' : 'loading');
    try {
      const page = await getBriefingHistory({ cursor: next || undefined, signal: controller.signal });
      if (controller.signal.aborted) return;
      setEditions(current => next ? [...current, ...page.editions.filter(item => !current.some(previous => previous.data === item.data))] : page.editions);
      setCursor(page.nextCursor);
      setStatus('ready');
      onConnectionChange?.(true);
    } catch {
      if (!controller.signal.aborted) { setStatus('error'); onConnectionChange?.(false); }
    } finally { busy.current = false; }
  }
  useEffect(() => { load(); return () => request.current?.abort(); }, []);
  useEffect(() => { if (selected) editionHeading.current?.focus(); }, [selected]);
  function closeEdition() {
    setSelected(null);
    requestAnimationFrame(() => returnButton.current?.focus());
  }
  if (selected) return <section className="inner-page edition-detail" aria-labelledby="history-edition-title">
    <button className="text-button back-button" onClick={closeEdition}>← Voltar ao histórico</button>
    <div className="page-heading"><span className="eyebrow">EDIÇÃO DO RADAR</span><h1 ref={editionHeading} tabIndex="-1" id="history-edition-title">{selected.titulo}</h1><p>{formatDate(selected.data)} · {selected.noticias.length} {selected.noticias.length === 1 ? 'assunto' : 'assuntos'} · aproximadamente {estimateMinutes(selected.roteiroAlexa)} min</p><StatusBadge /></div>
    <EditionCover briefing={selected} priority />
    <div className="news-list">{selected.noticias.map((item, index) => <NewsItem key={item.id ?? index} news={item} />)}</div>
    <section className="history-script" aria-labelledby="history-script-title"><h2 id="history-script-title">Roteiro da edição</h2><div className="script-text">{readableParagraphs(selected.roteiroAlexa).map((text, index) => <p key={index}>{text}</p>)}</div></section>
  </section>;
  return <section className="inner-page" aria-labelledby="history-title">
    <div className="page-heading"><span className="eyebrow">ARQUIVO EDITORIAL</span><h1 id="history-title">Histórico</h1><p>Suas edições anteriores do Radar.</p></div>
    <AdSlot position="HISTORY" campaigns={campaigns} />
    {status === 'loading' && <p role="status" className="subtle">Carregando suas edições...</p>}
    {status === 'error' && <div className="history-error"><p role="alert">Não foi possível carregar o histórico agora.</p><button className="text-button" onClick={() => load(editions.length ? cursor : null)}>Tentar novamente</button></div>}
    {status === 'ready' && editions.length === 0 && <p className="subtle">Ainda não há edições no histórico.</p>}
    <div className="history-list history-cards">{editions.map(edition => <div className="history-row history-card" key={edition.data}>
      <EditionCover briefing={edition} thumbnail />
      <div><span className="history-date">{formatDate(edition.data)}</span><h2>{edition.titulo}</h2><p className="subtle">{edition.noticias.length} {edition.noticias.length === 1 ? 'assunto' : 'assuntos'} · aproximadamente {estimateMinutes(edition.roteiroAlexa)} min</p><StatusBadge /></div>
      <span className="history-type">{edition.editionType === 'special' ? 'Edição especial' : 'Edição regular'}{edition.specialTitle && <small>{edition.specialTitle}</small>}</span>
      <button className="text-button" onClick={event => { returnButton.current = event.currentTarget; setSelected(edition); }}>Ver edição →</button>
    </div>)}</div>
    {cursor && status !== 'error' && <button className="text-button load-more" disabled={status === 'loading-more'} onClick={() => load(cursor)}>{status === 'loading-more' ? 'Carregando...' : 'Carregar mais'}</button>}
    <span role="status" className="sr-only">{status === 'ready' && editions.length > 0 ? `${editions.length} edições carregadas.` : ''}</span>
  </section>;
}
