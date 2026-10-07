import { useEffect, useRef, useState } from 'react';
import { prepareCreative, creativeSlots, aspectWarning } from '../services/adCreative';
import { safeAdUrl, campaignStatus } from '../services/advertising';
import { AdCreative } from './AdCreative';

const devices = { Desktop: 1440, Tablet: 768, Mobile: 390 };
export function AdCreativeEditor({ draft, onChange, onLocalSelection, onFileSelection, editing }) {
  const [creative, setCreative] = useState(null);
  const [error, setError] = useState('');
  const [device, setDevice] = useState('Desktop');
  const [available, setAvailable] = useState(500);
  const [previewHeight, setPreviewHeight] = useState(500);
  const container = useRef(null);
  const viewport = useRef(null);
  const current = useRef(null);
  const sequence = useRef(0);
  const fileInput = useRef(null);
  useEffect(() => {
    if (!globalThis.ResizeObserver) return;
    const observer = new ResizeObserver(entries => setAvailable(entries[0].contentRect.width));
    observer.observe(container.current);
    const heightObserver = new ResizeObserver(() => setPreviewHeight(viewport.current.scrollHeight));
    heightObserver.observe(viewport.current);
    return () => { observer.disconnect(); heightObserver.disconnect(); };
  }, []);
  useEffect(() => () => {
    sequence.current++;
    if (current.current) URL.revokeObjectURL(current.current.url);
  }, []);
  useEffect(() => { onLocalSelection(false); }, [onLocalSelection]);
  function clear() {
    sequence.current++;
    if (current.current) URL.revokeObjectURL(current.current.url);
    current.current = null;
    setCreative(null);
    setError('');
    onLocalSelection(false);
    onFileSelection?.(null);
    if (fileInput.current) fileInput.current.value = '';
  }
  async function select(file) {
    if (!file) return;
    const request = ++sequence.current;
    setError('');
    onLocalSelection(true);
    onFileSelection?.(null);
    try {
      const result = await prepareCreative(file);
      if (request !== sequence.current) { URL.revokeObjectURL(result.url); return; }
      if (current.current) URL.revokeObjectURL(current.current.url);
      current.current = result;
      result.file = file;
      setCreative(result);
      onFileSelection?.(file);
    } catch (failure) {
      if (request !== sequence.current) return;
      setError(failure.message);
      onLocalSelection(Boolean(current.current));
      onFileSelection?.(current.current?.file || null);
    }
  }
  const recommended = creativeSlots[draft.position];
  const divisor = (a, b) => b ? divisor(b, a % b) : a;
  const common = divisor(...recommended);
  const width = devices[device];
  const scale = Math.min(1, available / width);
  const adWidth = draft.position === 'SIDEBAR' ? Math.min(300, width - 32) : Math.min(1200, width - 32);
  const statuses = { INATIVA: 'Desativada', AGENDADA: 'Programada', ENCERRADA: 'Encerrada', ATIVA: 'Ativa' };
  const status = !editing ? 'Rascunho' : statuses[campaignStatus(draft)];
  return <section className="creative-editor">
    <h3>Criativo do anúncio</h3>
    <div className="creative-drop" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); select(event.dataTransfer.files[0]); }}>
      <p>Arraste sua imagem aqui ou selecione um arquivo</p>
      <label>Selecionar imagem<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={event => select(event.target.files[0])} /></label>
      <small>JPG, PNG ou WebP · até 5 MB</small>
    </div>
    {error && <p role="alert">{error}</p>}
    {creative && <div className="creative-metadata"><p>{creative.name} · {creative.width} × {creative.height} px · {(creative.size / 1024).toFixed(1)} KB · {creative.type}</p><button type="button" onClick={clear}>Remover imagem local</button></div>}
    <p className="subtle">A imagem selecionada será enviada ao salvar a campanha. JPG, PNG ou WebP até 5 MB. Somente o superadmin pode enviar arquivos; os criativos salvos são públicos.</p>
    <label>Ajuste da imagem<select value={draft.imageFit || 'contain'} onChange={event => onChange({ ...draft, imageFit: event.target.value })}><option value="cover">Preencher espaço</option><option value="contain">Mostrar imagem inteira</option></select></label>
    <label>Texto do botão (opcional)<input maxLength={60} value={draft.ctaText || ''} onChange={event => onChange({ ...draft, ctaText: event.target.value })} /></label>
    <p>Formato recomendado: {recommended[0]} × {recommended[1]} px · {recommended[0] / common}:{recommended[1] / common}</p>
    {creative && <p className="subtle">{creative.width >= recommended[0] ? '✓ Boa resolução para Desktop' : '⚠ Esta imagem pode ficar pequena em telas grandes'}</p>}
    {creative && draft.position === 'HOME_TOP' && creative.height > creative.width && <p className="subtle">⚠ O formato é muito vertical para Topo da Home. Prefira uma arte horizontal.</p>}
    {creative && aspectWarning(creative.width, creative.height, draft.position) && <p role="status">⚠ Esta imagem pode sofrer corte neste espaço. “Mostrar imagem inteira” preserva o conteúdo.</p>}
    <h3>Prévia do anúncio</h3>
    <div className="creative-devices" aria-label="Tamanho da prévia">{Object.keys(devices).map(name => <button key={name} type="button" aria-pressed={device === name} onClick={() => setDevice(name)}>{name}</button>)}</div>
    <p>{device} · {width}px simulados · {draft.position}</p>
    <div ref={container} className="creative-preview-shell" style={{ height: previewHeight * scale + 4 }}>
      <div ref={viewport} className="creative-preview-viewport" data-width={width} style={{ width, transform: `scale(${scale})` }}>
        <div style={{ width: adWidth, margin: '0 auto' }}><AdCreative campaign={draft} preview localImageUrl={creative?.url} /></div>
      </div>
    </div>
    <p>Campanha {status.toLowerCase()} · {draft.startDate} → {draft.endDate}</p>
    {safeAdUrl(draft.targetUrl) ? <a href={safeAdUrl(draft.targetUrl)} target="_blank" rel="noopener noreferrer">Testar link ↗</a> : <span className="subtle">Informe uma URL pública HTTPS válida para testar o link.</span>}
  </section>;
}
