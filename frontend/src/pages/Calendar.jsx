import { useState } from 'react';
import { CATEGORIES } from '../services/preferences';
const empty = date => ({ id: '', title: '', date, type: 'special', category: 'brasilMundo', priority: 'normal', description: '', coverId: '', active: true, priorityOrder: 0, startTime: '', endTime: '', teamId: '', competition: '', location: '' });
export function Calendar({ settings, onSave }) {
  const [month, setMonth] = useState(() => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Belem' }).format(new Date()).slice(0, 7));
  const [events, setEvents] = useState(settings.events), [draft, setDraft] = useState(null), [editing, setEditing] = useState(false), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [year, number] = month.split('-').map(Number);
  const days = new Date(Date.UTC(year, number, 0)).getUTCDate();
  const offset = new Date(Date.UTC(year, number - 1, 1)).getUTCDay();
  async function persist(next) {
    setBusy(true); setMessage('');
    try { await onSave({ ...settings, events: next }); setEvents(next); setDraft(null); setMessage('Calendário salvo.'); }
    catch { setMessage('Não foi possível salvar o calendário.'); }
    finally { setBusy(false); }
  }
  function submit(event) {
    event.preventDefault();
    if (!editing && events.some(item => item.id === draft.id)) return setMessage('Esse ID já existe.');
    persist(editing ? events.map(item => item.id === draft.id ? draft : item) : [...events, draft]);
  }
  return <section className="inner-page"><div className="page-heading"><span className="eyebrow">ADMIN</span><h1>Calendário editorial</h1><p>Eventos dão prioridade temporária sem substituir seus outros interesses.</p></div>
    <label>Mês<input type="month" value={month} min="2020-01" max="2100-12" onChange={event => { if (event.target.value) setMonth(event.target.value); }} /></label>
    <button className="primary-button" disabled={busy} onClick={() => { setDraft(empty(month + '-01')); setEditing(false); }}>Adicionar evento</button>
    <div className="editorial-calendar" aria-label="Calendário mensal">
      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <strong key={day}>{day}</strong>)}
      {Array.from({ length: offset }, (_, i) => <div key={'blank-' + i} />)}
      {Array.from({ length: days }, (_, i) => {
        const date = month + '-' + String(i + 1).padStart(2, '0');
        return <section className="calendar-day" key={date}><span>{i + 1}</span>{events.filter(item => item.date === date).map(item => <button key={item.id} disabled={busy} onClick={() => { setDraft({ ...empty(date), ...item }); setEditing(true); }}>{item.title}{!item.active && ' (inativo)'}</button>)}</section>;
      })}
    </div>
    {draft && <form className="admin-form" onSubmit={submit}>
      <h2>{editing ? 'Editar evento' : 'Novo evento'}</h2>
      <label>ID<input required pattern="[a-z0-9][a-z0-9_-]*" maxLength={80} readOnly={editing} value={draft.id} onChange={event => setDraft({ ...draft, id: event.target.value })} /></label>
      <label>Título<input required maxLength={100} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
      <label>Data<input type="date" required value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} /></label>
      <label>Tipo<select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value })}>{['special', 'sports', 'local', 'national', 'editorial'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Categoria<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}>{CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label>Prioridade<select value={draft.priority} onChange={event => setDraft({ ...draft, priority: event.target.value })}>{['normal', 'high', 'headline'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>Ordem no empate<input type="number" min={0} max={1000} value={draft.priorityOrder} onChange={event => setDraft({ ...draft, priorityOrder: Number(event.target.value) })} /></label>
      {['description', 'coverId', 'teamId', 'competition', 'location', 'startTime', 'endTime'].map((key, i) => <label key={key}>{['Descrição', 'ID da capa', 'ID do time', 'Competição', 'Local', 'Início', 'Fim'][i]}<input type={key.endsWith('Time') ? 'time' : 'text'} maxLength={key === 'description' ? 400 : 100} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <label><input type="checkbox" checked={draft.active} onChange={event => setDraft({ ...draft, active: event.target.checked })} />Ativo</label>
      <p className="subtle">A capa deve corresponder a um asset publicado. IDs sem arte disponível usam o fallback Radar.</p>
      <button className="primary-button" disabled={busy}>Salvar evento</button>{' '}
      <button type="button" className="text-button" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>{' '}
      {editing && <button type="button" className="text-button" disabled={busy} onClick={() => persist(events.filter(item => item.id !== draft.id))}>Excluir evento</button>}
    </form>}
    <p role="status">{message}</p></section>;
}
