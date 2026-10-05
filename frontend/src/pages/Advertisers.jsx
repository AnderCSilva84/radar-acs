import { useEffect, useState } from 'react';
import { advertisingRequest } from '../services/adminAuth';
import { campaignStatus, today } from '../services/advertising';
const slots = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'HISTORY', 'SIDEBAR', 'SPECIAL_SPONSOR'];
const empty = () => ({ id: '', advertiserName: '', campaignName: '', imageUrl: '', targetUrl: '', alt: '', startDate: today(), endDate: today(), position: 'HOME_TOP', active: true, contact: '', notes: '' });
export function Advertisers({ user }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [campaigns, setCampaigns] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [draft, setDraft] = useState(null), [editing, setEditing] = useState(false), [message, setMessage] = useState('');
  useEffect(() => { let live = true; advertisingRequest(user).then(value => { if (live) setCampaigns(value.campaigns); }).catch(() => { if (live) { setLoadFailed(true); setMessage('Não foi possível carregar campanhas. Recarregue antes de editar.'); } }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [user]);
  async function save(next) {
    setBusy(true); setMessage('');
    try { const value = await advertisingRequest(user, { campaigns: next }); setCampaigns(value.campaigns); setDraft(null); setMessage('Campanhas salvas.'); }
    catch { setMessage('Não foi possível salvar. Confira URLs HTTPS, campos e período.'); }
    finally { setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    if (!editing && campaigns.some(item => item.id === draft.id)) return setMessage('Esse ID já existe.');
    if (draft.endDate < draft.startDate) return setMessage('A data final deve ser igual ou posterior à inicial.');
    save(editing ? campaigns.map(item => item.id === draft.id ? draft : item) : [...campaigns, draft]);
  }
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow">PATROCÍNIOS DIRETOS</span><h1>Anunciantes</h1><p>Publicidade identificada, separada do conteúdo editorial.</p></div>
    <button className="primary-button" disabled={loading || busy || loadFailed} onClick={() => { setDraft(empty()); setEditing(false); }}>Nova campanha</button>
    {loading && <p role="status">Carregando campanhas...</p>}
    <div className="campaign-list">{campaigns.map(item => <section key={item.id}><div><span className={'campaign-status status-' + campaignStatus(item).toLowerCase()}>{campaignStatus(item)}</span><h2>{item.campaignName}</h2><p>{item.advertiserName} · {item.position} · {item.startDate} a {item.endDate}</p></div><div><button disabled={busy} onClick={() => { setDraft(item); setEditing(true); }}>Editar</button><button disabled={busy} onClick={() => save(campaigns.map(c => c.id === item.id ? { ...c, active: !c.active } : c))}>{item.active ? 'Desativar' : 'Ativar'}</button></div></section>)}</div>
    {!loading && !campaigns.length && <p className="subtle">Nenhuma campanha cadastrada.</p>}
    {draft && <form className="admin-form" onSubmit={submit}><h2>{editing ? 'Editar campanha' : 'Nova campanha'}</h2>
      {['id', 'advertiserName', 'campaignName', 'imageUrl', 'targetUrl', 'alt', 'startDate', 'endDate', 'contact', 'notes'].map((key, i) => <label key={key}>{['ID', 'Anunciante', 'Campanha', 'URL do banner', 'URL de destino', 'Texto alternativo', 'Data inicial', 'Data final', 'Contato comercial (privado)', 'Observações internas'][i]}<input type={key.endsWith('Url') ? 'url' : key.endsWith('Date') ? 'date' : 'text'} pattern={key === 'id' ? '[a-z0-9][a-z0-9_-]*' : key.endsWith('Url') ? 'https://.+' : undefined} required={!['contact', 'notes'].includes(key)} readOnly={key === 'id' && editing} maxLength={key.endsWith('Url') ? 2000 : key === 'notes' ? 400 : key === 'alt' ? 200 : 120} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <label>Posição<select value={draft.position} onChange={event => setDraft({ ...draft, position: event.target.value })}>{slots.map(slot => <option key={slot}>{slot}</option>)}</select></label>
      <label><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} />Ativa</label>
      <p className="subtle">Use um banner com URL pública HTTPS. Upload não habilitado. Contato e observações não aparecem no portal.</p>
      <button className="primary-button" disabled={busy}>Salvar campanha</button><button type="button" className="text-button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>
      {editing && <button type="button" className="text-button" disabled={busy} onClick={() => save(campaigns.filter(item => item.id !== draft.id))}>Excluir campanha</button>}
    </form>}<p role="status">{message}</p></section>;
}
