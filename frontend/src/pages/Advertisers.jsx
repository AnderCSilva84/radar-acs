import { useEffect, useState } from 'react';
import { advertisingRequest } from '../services/adminAuth';
import { campaignStatus, today, safeAdUrl } from '../services/advertising';
import { AdCreativeEditor } from '../components/AdCreativeEditor';
import { AdCarousel } from '../components/AdCarousel';
import { eligibleCampaigns } from '../components/AdSlot';
import { uploadCreative } from '../services/creativeUpload';
export const COMMERCIAL_SLOTS = { HOME_TOP: 'Topo da Home', HOME_MIDDLE: 'Meio da Home', HOME_BOTTOM: 'Final da Home', HISTORY: 'Histórico', SIDEBAR: 'Barra lateral', SPECIAL_SPONSOR: 'Patrocínio da edição' };
const blankAdvertiser = () => ({ id: `adv-${crypto.randomUUID()}`, name: '', company: '', contact: '', whatsapp: '', email: '', notes: '' });
const empty = () => ({ id: `cmp-${crypto.randomUUID()}`, advertiserName: '', campaignName: '', imageUrl: '', targetUrl: '', alt: '', startDate: today(), endDate: today(), position: 'HOME_TOP', active: false, publicationState: 'draft', priority: 0, contact: '', notes: '' });
const steps = ['Anunciante', 'Campanha', 'Espaço', 'Criativo', 'Resumo'];
const statusLabel = item => item.publicationState !== 'draft' && item.active === false ? 'PAUSADA' : campaignStatus(item);
export function Advertisers({ user }) {
  const [data, setData] = useState({ campaigns: [], advertisers: [] });
  const [loading, setLoading] = useState(true), [loadFailed, setLoadFailed] = useState(false), [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('Visão geral'), [draft, setDraft] = useState(null), [step, setStep] = useState(0), [editing, setEditing] = useState(false);
  const [advertiser, setAdvertiser] = useState(null), [advertiserForm, setAdvertiserForm] = useState(null), [message, setMessage] = useState(''), [confirm, setConfirm] = useState(null);
  const [localSelection, setLocalSelection] = useState(false), [selectedFile, setSelectedFile] = useState(null), [uploaded, setUploaded] = useState(null);
  const [carouselPreview, setCarouselPreview] = useState(false), [device, setDevice] = useState('Desktop'), [rotate, setRotate] = useState(false);
  useEffect(() => { let live = true; advertisingRequest(user).then(value => { if (live) setData({ campaigns: value.campaigns, advertisers: value.advertisers || [] }); }).catch(() => { if (live) { setLoadFailed(true); setMessage('Não foi possível carregar campanhas. Recarregue antes de editar.'); } }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [user]);
  function start(item) {
    setDraft(item ? { ...item, priority: item.priority || 0 } : empty()); setEditing(Boolean(item)); setStep(0); setTab('Campanhas');
    setAdvertiser(item ? data.advertisers.find(value => value.id === item.advertiserId) || { ...blankAdvertiser(), name: item.advertiserName, contact: item.contact || '', notes: item.notes || '' } : blankAdvertiser());
    setLocalSelection(false); setSelectedFile(null); setUploaded(null); setMessage('');
  }
  async function persist(next, close = true) {
    setBusy(true); setMessage('');
    try { const value = await advertisingRequest(user, next); setData({ campaigns: value.campaigns, advertisers: value.advertisers || [] }); if (close) { setDraft(null); setAdvertiserForm(null); } setMessage('Campanhas salvas.'); }
    catch { setMessage('Não foi possível salvar. Confira URLs HTTPS, campos e período.'); throw Error('SAVE_FAILED'); }
    finally { setBusy(false); }
  }
  async function submit(state) {
    if (busy) return;
    if (localSelection && !selectedFile) return setMessage('Aguarde a validação da imagem selecionada.');
    if (!advertiser?.name.trim() || !draft.campaignName.trim()) return setMessage('Informe anunciante e nome da campanha.');
    if (draft.endDate < draft.startDate) return setMessage('A data final deve ser igual ou posterior à inicial.');
    if (state === 'published' && (!safeAdUrl(draft.targetUrl) || (!selectedFile && !safeAdUrl(draft.imageUrl)) || !draft.alt.trim())) return setMessage('Informe URLs públicas HTTPS e texto alternativo válidos.');
    setBusy(true); setMessage('');
    try {
      let nextDraft = { ...draft, advertiserName: advertiser.name.trim(), advertiserId: advertiser.id, publicationState: state, active: state === 'published' };
      if (selectedFile) {
        const imageUrl = uploaded?.file === selectedFile && uploaded?.id === draft.id ? uploaded.url : await uploadCreative(user, draft.id, selectedFile);
        setUploaded({ file: selectedFile, id: draft.id, url: imageUrl }); nextDraft = { ...nextDraft, imageUrl }; setDraft(nextDraft);
      }
      const advertisers = data.advertisers.some(item => item.id === advertiser.id) ? data.advertisers.map(item => item.id === advertiser.id ? advertiser : item) : [...data.advertisers, advertiser];
      await persist({ advertisers, campaigns: editing ? data.campaigns.map(item => item.id === draft.id ? nextDraft : item) : [...data.campaigns, nextDraft] });
    } catch (error) { if (error.message !== 'SAVE_FAILED') setMessage(error.message); setBusy(false); }
  }
  function confirmPublish(event) {
    event.preventDefault();
    if (!advertiser?.name.trim() || !draft.campaignName.trim() || !(selectedFile || draft.imageUrl) || !draft.targetUrl || !draft.alt.trim()) { setMessage('Complete anunciante, campanha, imagem, link e texto alternativo antes de publicar.'); return; }
    setStep(4);
    setConfirm({ kind: 'publish', label: 'Publicar campanha', action: () => submit('published') });
  }
  async function action(next) { try { await persist(next); } catch { /* Preserve form and show safe error. */ } }
  const active = data.campaigns.filter(item => campaignStatus(item) === 'ATIVA');
  const scheduled = data.campaigns.filter(item => campaignStatus(item) === 'AGENDADA');
  const occupied = new Set(active.map(item => item.position)).size;
  const legacyAdvertisers = new Set(data.campaigns.filter(campaign => !campaign.advertiserId && !data.advertisers.some(item => item.name.trim().toLowerCase() === campaign.advertiserName.trim().toLowerCase())).map(item => item.advertiserName.trim().toLowerCase()));
  const advertiserCount = data.advertisers.length + legacyAdvertisers.size;
  const top = eligibleCampaigns(data.campaigns, 'HOME_TOP', today());
  return <section className="inner-page commercial-center"><div className="page-heading"><span className="eyebrow">PUBLICIDADE DIRETA</span><h1>Central Comercial</h1><p>Campanhas, anunciantes e espaços em um só lugar.</p></div>
    <nav className="commercial-tabs" aria-label="Central Comercial">{['Visão geral','Campanhas','Anunciantes','Espaços'].map(name => <button key={name} type="button" aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</nav>
    {loading && <p role="status">Carregando campanhas...</p>}
    {tab === 'Visão geral' && <><div className="commercial-stats">{[[active.length,'Campanhas ativas'],[scheduled.length,'Programadas'],[advertiserCount,'Anunciantes'],[occupied,'Espaços ocupados']].map(([count,label]) => <article key={label}><strong>{loading || loadFailed ? '—' : count}</strong><span>{label}</span></article>)}</div><p className="subtle">Contagens da configuração atual. Campanhas anteriores permanecem compatíveis.</p></>}
    <button className="primary-button" disabled={loading || busy || loadFailed || !!draft} onClick={() => start()}>Nova campanha</button>
    {['Visão geral','Campanhas'].includes(tab) && <div className="campaign-list">{data.campaigns.map(item => <section key={item.id}><div><span className="campaign-status">{statusLabel(item)}</span><h2>{item.campaignName}</h2><p>{item.advertiserName} · {COMMERCIAL_SLOTS[item.position]} · {item.startDate} a {item.endDate}</p></div><div><button disabled={busy || !!draft} onClick={() => start(item)}>Editar</button>{item.publicationState !== 'draft' && <button disabled={busy || !!draft} onClick={() => action({ ...data, campaigns: data.campaigns.map(value => value.id === item.id ? { ...value, active: !value.active } : value) })}>{item.active ? 'Desativar' : 'Ativar'}</button>}</div></section>)}</div>}
    {!loading && !data.campaigns.length && <p className="subtle">Nenhuma campanha cadastrada.</p>}
    {tab === 'Anunciantes' && <section><h2>Relacionamento comercial</h2><button disabled={busy || loadFailed || loading} onClick={() => setAdvertiserForm(blankAdvertiser())}>Novo anunciante</button>{data.advertisers.map(item => <article className="commercial-advertiser" key={item.id}><h3>{item.name}</h3><p>{item.company} · {item.contact}</p><button disabled={busy} onClick={() => setAdvertiserForm({ ...item })}>Editar anunciante</button><button disabled={busy} onClick={() => {
      if (data.campaigns.some(campaign => campaign.advertiserId === item.id)) return setMessage('Este anunciante possui campanhas. Remova o vínculo antes de excluir.');
      setConfirm({ kind: 'delete', label: `Excluir anunciante ${item.name}`, action: () => action({ ...data, advertisers: data.advertisers.filter(value => value.id !== item.id) }) });
    }}>Excluir anunciante</button></article>)}{!data.advertisers.length && <p>Nenhum anunciante cadastrado separadamente.</p>}
    {advertiserForm && <form className="admin-form" onSubmit={event => { event.preventDefault(); action({ ...data, campaigns: data.campaigns.map(item => item.advertiserId === advertiserForm.id ? { ...item, advertiserName: advertiserForm.name.trim() } : item), advertisers: data.advertisers.some(item => item.id === advertiserForm.id) ? data.advertisers.map(item => item.id === advertiserForm.id ? advertiserForm : item) : [...data.advertisers, advertiserForm] }); }}><AdvertiserFields value={advertiserForm} onChange={setAdvertiserForm} /><button disabled={busy}>Salvar anunciante</button><button type="button" onClick={() => setAdvertiserForm(null)}>Cancelar</button></form>}</section>}
    {tab === 'Espaços' && <div className="commercial-spaces">{Object.entries(COMMERCIAL_SLOTS).map(([code,name]) => <article key={code}><h2>{name}</h2><small>{code}</small><p>Campanhas ativas: {active.filter(item => item.position === code).length}</p><ul>{active.filter(item => item.position === code).map(item => <li key={item.id}>{item.campaignName} · {item.advertiserName}</li>)}</ul>{code === 'HOME_TOP' && <button type="button" disabled={!top.length} onClick={() => setCarouselPreview(true)}>Prévia do carrossel</button>}</article>)}</div>}
    {draft && <form className="admin-form campaign-form" onSubmit={confirmPublish}><fieldset disabled={busy}><h2>{editing ? 'Editar campanha' : 'Nova campanha'}</h2><ol className="campaign-steps">{steps.map((name,index) => <li key={name}><button type="button" aria-current={step === index ? 'step' : undefined} onClick={() => setStep(index)}>{index+1}. {name}</button></li>)}</ol>
      <section hidden={step !== 0}><h3>Quem anuncia</h3><label>Anunciante existente<select value={data.advertisers.some(item => item.id === advertiser?.id) ? advertiser.id : ''} onChange={event => setAdvertiser(data.advertisers.find(item => item.id === event.target.value) || blankAdvertiser())}><option value="">Novo anunciante</option>{data.advertisers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><AdvertiserFields value={advertiser} onChange={setAdvertiser} /></section>
      <section hidden={step !== 1}><h3>Objetivo e período</h3>{[['campaignName','Campanha','text'],['startDate','Data inicial','date'],['endDate','Data final','date'],['targetUrl','URL de destino','url']].map(([key,label,type]) => <label key={key}>{label}<input type={type} required={step === 1} value={draft[key]} maxLength={key === 'targetUrl' ? 2000 : 120} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}<label>Botão<select value={['','Saiba mais','Comprar','Conhecer','Falar no WhatsApp'].includes(draft.ctaText || '') ? draft.ctaText || '' : 'custom'} onChange={event => setDraft({ ...draft, ctaText: event.target.value === 'custom' ? 'Seu texto' : event.target.value })}><option value="">Sem botão</option><option>Saiba mais</option><option>Comprar</option><option>Conhecer</option><option>Falar no WhatsApp</option><option value="custom">Personalizado</option></select></label><label>Prioridade<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: Number(event.target.value) })}><option value={0}>Normal</option><option value={1}>Alta</option><option value={2}>Destaque</option></select></label></section>
      <section hidden={step !== 2}><h3>Onde a campanha aparece</h3><label>Posição<select value={draft.position} onChange={event => setDraft({ ...draft, position: event.target.value })}>{Object.entries(COMMERCIAL_SLOTS).map(([code,name]) => <option key={code} value={code}>{name}</option>)}</select></label><div className="slot-plan" data-slot={draft.position}><span>Header</span><strong>{COMMERCIAL_SLOTS[draft.position]}</strong><span>Conteúdo do Radar</span></div><small>{draft.position}</small></section>
      <section hidden={step !== 3}><h3>Imagem e mensagem</h3><label>URL do banner<input type="url" required={step === 3 && !localSelection} value={draft.imageUrl} onChange={event => setDraft({ ...draft, imageUrl: event.target.value })} /></label><label>Texto alternativo<input required={step === 3} maxLength={200} value={draft.alt} onChange={event => setDraft({ ...draft, alt: event.target.value })} /></label><AdCreativeEditor key={draft.id} draft={{ ...draft, advertiserName: advertiser?.name || '' }} onChange={setDraft} onLocalSelection={setLocalSelection} onFileSelection={setSelectedFile} editing={editing} /></section>
      <section hidden={step !== 4}><h3>Confira antes de salvar</h3><dl className="campaign-summary"><dt>Anunciante</dt><dd>{advertiser?.name || 'Não informado'}</dd><dt>Campanha</dt><dd>{draft.campaignName || 'Não informada'}</dd><dt>Espaço</dt><dd>{COMMERCIAL_SLOTS[draft.position]}</dd><dt>Período</dt><dd>{draft.startDate} → {draft.endDate}</dd><dt>Link</dt><dd>{draft.targetUrl || 'Não informado'}</dd><dt>CTA</dt><dd>{draft.ctaText || 'Sem botão'}</dd><dt>Ajuste</dt><dd>{draft.imageFit === 'cover' ? 'Preencher' : 'Conter'}</dd><dt>Criativo</dt><dd>{selectedFile?.name || draft.imageUrl || 'Não informado'}</dd></dl><p>Salvar rascunho não exibe a campanha. A publicação respeita o período selecionado.</p></section>
      <div className="campaign-actions">{step > 0 && <button type="button" onClick={() => setStep(value => value - 1)}>Anterior</button>}{step < 4 && <button type="button" onClick={() => setStep(value => value + 1)}>Continuar</button>}<button type="button" disabled={busy} onClick={() => submit('draft')}>Salvar rascunho</button><button className="primary-button" disabled={busy}>Publicar campanha</button><button type="button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>{editing && <button type="button" disabled={busy} onClick={() => setConfirm({ kind:'delete', label:'Excluir campanha', action:() => action({ ...data, campaigns:data.campaigns.filter(item => item.id !== draft.id) }) })}>Excluir campanha</button>}</div>
    </fieldset></form>}
    {confirm && <div className="commercial-dialog" role="dialog" aria-modal="true" aria-label={confirm.label} onKeyDown={event => {
      if (event.key === 'Escape') setConfirm(null);
      if (event.key === 'Tab') {
        const buttons = [...event.currentTarget.querySelectorAll('button')];
        const next = event.shiftKey ? buttons[buttons.length - 1] : buttons[0];
        if ((!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) || (event.shiftKey && document.activeElement === buttons[0])) { event.preventDefault(); next.focus(); }
      }
    }}><h2>{confirm.label}?</h2><p>{confirm.kind === 'publish' ? 'A campanha será exibida conforme o período e o espaço escolhidos.' : 'Esta ação remove o registro selecionado.'}</p><p>{confirm.kind === 'publish' && `${advertiser?.name} · ${draft?.campaignName} · ${COMMERCIAL_SLOTS[draft?.position]} · ${draft?.startDate} → ${draft?.endDate}`}</p>{confirm.kind === 'publish' && <p className="subtle">Destino: {draft?.targetUrl} · CTA: {draft?.ctaText || 'Sem botão'} · Ajuste: {draft?.imageFit === 'cover' ? 'Preencher' : 'Conter'} · Criativo: {selectedFile?.name || draft?.imageUrl}</p>}<button autoFocus type="button" onClick={() => { const pending = confirm.action; setConfirm(null); pending(); }}>Confirmar</button><button type="button" onClick={() => setConfirm(null)}>Voltar</button></div>}
    {carouselPreview && <section className="commercial-carousel-preview" aria-label="Prévia do carrossel"><h2>Topo da Home · campanhas ativas</h2><div className="creative-devices">{['Desktop','Tablet','Mobile'].map(name => <button key={name} type="button" aria-pressed={device === name} onClick={() => setDevice(name)}>{name}</button>)}</div><label><input type="checkbox" checked={rotate} onChange={event => setRotate(event.target.checked)} />Rotação automática (8 segundos)</label><div style={{ maxWidth: device === 'Mobile' ? 390 : device === 'Tablet' ? 768 : 1200 }}><AdCarousel campaigns={top} preview autoplay={rotate} /></div><button type="button" onClick={() => setCarouselPreview(false)}>Fechar prévia</button></section>}
    <p role="status">{busy ? 'Salvando...' : message}</p>
  </section>;
}
function AdvertiserFields({ value, onChange }) {
  if (!value) return null;
  return <div className="advertiser-fields">{[['name','Anunciante'],['company','Empresa'],['contact','Contato'],['whatsapp','WhatsApp'],['email','Email'],['notes','Observações internas']].map(([key,label]) => <label key={key}>{label}<input type={key === 'email' ? 'email' : 'text'} maxLength={key === 'notes' ? 400 : key === 'whatsapp' ? 40 : key === 'contact' ? 100 : 120} value={value[key] || ''} onChange={event => onChange({ ...value, [key]: event.target.value })} /></label>)}</div>;
}
