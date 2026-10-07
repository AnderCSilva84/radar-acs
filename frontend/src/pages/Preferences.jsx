import { useState } from 'react';
import { CATEGORIES, PRIORITIES, COVERS, defaultPreferences, loadPreferences, savePreferences } from '../services/preferences';
import { CoverArt } from '../components/CoverArt';
import { formatDate } from '../utils/briefing';
import { FollowedTeamsEditor } from '../components/FollowedTeamsEditor';

export function Preferences({ briefing, serverSettings, onSave }) {
  const [preferences, setPreferences] = useState(() => serverSettings || loadPreferences());
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  function update(section, key, value) {
    setPreferences(current => ({ ...current, [section]: { ...current[section], [key]: value } }));
    setMessage('');
  }
  async function save(event) {
    event.preventDefault();
    setSaving(true);
    try {
      if (onSave) { await onSave(preferences); setMessage('Preferências salvas.'); }
      else { savePreferences(preferences); setMessage('Salvo neste dispositivo.'); }
    }
    catch { setMessage('Não foi possível salvar. Suas alterações continuam no formulário.'); }
    finally { setSaving(false); }
  }
  return <section className="inner-page" aria-labelledby="preferences-title">
    <div className="page-heading"><span className="eyebrow">PREFERÊNCIAS</span><h1 id="preferences-title">Seu Radar</h1><p>Escolha o que merece mais espaço no seu dia.</p></div>
    <form onSubmit={save}>
      <section className="preferences-section" aria-labelledby="content-title"><h2 id="content-title">Conteúdo</h2><p className="subtle">{onSave ? 'Estas preferências definem os assuntos priorizados no seu Radar diário.' : 'Ajustes locais de preferência. Ainda não alteram as notícias geradas.'}</p>
        <div className="priority-list">{CATEGORIES.map(([key, label]) => <div className="priority-row" key={key}><label htmlFor={`priority-${key}`}>{label}</label><select id={`priority-${key}`} value={preferences.editorial[key]} onChange={event => update('editorial', key, event.target.value)}>{PRIORITIES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></div>)}</div>
      </section>
      {onSave && <section className="preferences-section"><h2>Times que sigo</h2><FollowedTeamsEditor teams={preferences.followedTeams} onChange={teams => setPreferences(current => ({ ...current, followedTeams: teams }))} /></section>}
      <section className="preferences-section" aria-labelledby="appearance-title"><h2 id="appearance-title">Aparência</h2><p className="subtle">Escolha como o Radar aparece nas suas telas.</p>
        <fieldset className="cover-options"><legend>Capa da edição</legend>{COVERS.map(([id, label, description]) => <label className={'cover-option ' + (preferences.appearance.cover === id ? 'selected' : '')} key={id}>
          <span className="cover-thumb"><CoverArt cover={id} thumbnail /></span><span><input type="radio" aria-label={label} name="cover" value={id} checked={preferences.appearance.cover === id} onChange={() => update('appearance', 'cover', id)} />{label}</span><small>{description}</small>
        </label>)}</fieldset>
        <section className="special-covers" aria-labelledby="special-covers-title">
          <h3 id="special-covers-title">CAPAS ESPECIAIS</h3>
          <p className="subtle">Capas especiais são aplicadas automaticamente às edições temáticas e não alteram sua capa padrão.</p>
          <div className="special-cover-card">
            <div className="special-cover-art"><CoverArt cover="eleicoes-2026" thumbnail /></div>
            <div><h4>Eleições 2026</h4><span className="special-cover-badge">Automática</span><p className="subtle">Capa especial da edição Eleições 2026.</p></div>
          </div>
        </section>
        <div className="density-row"><label htmlFor="density">Densidade do preview</label><select id="density" value={preferences.appearance.density} onChange={event => update('appearance', 'density', event.target.value)}><option value="comfortable">Confortável</option><option value="compact">Compacta</option></select></div>
        <h3 className="preview-heading">Visualização em tela</h3>
        <div className={'screen-preview ' + preferences.appearance.density} data-cover={preferences.appearance.cover} aria-label={`Visualização da capa ${COVERS.find(([id]) => id === preferences.appearance.cover)[1]}`}>
          <CoverArt cover={preferences.appearance.cover} />{preferences.appearance.cover === 'radar-news'
            ? <div className="news-cover-caption"><span className="sr-only">RADAR ACS. Bom dia, Anderson.</span>{briefing ? <><span>{formatDate(briefing.data)}</span><span>{briefing.titulo}</span></> : <span>Sua próxima edição, na sua tela.</span>}</div>
            : <div className="preview-copy"><span className="eyebrow">RADAR ACS</span><strong>Bom dia,<br />Anderson.</strong>{briefing ? <><span>{formatDate(briefing.data)}</span><span>{briefing.titulo}</span></> : <span>Sua próxima edição, na sua tela.</span>}</div>}
        </div>
      </section>
      <div className="preferences-actions"><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Salvando...' : onSave ? 'Salvar alterações' : 'Salvar preferências'}</button><button className="text-button" type="button" onClick={() => { setPreferences(current => ({ ...current, ...defaultPreferences() })); setMessage('Padrões restaurados no preview. Salve para aplicar.'); }}>Restaurar padrões</button></div>
      <p className="subtle">{onSave ? 'As alterações são salvas somente ao confirmar.' : 'As preferências ficam somente neste navegador. Sincronização remota aguarda administração autenticada.'}</p><p className="save-message" role="status">{message}</p>
    </form>
  </section>;
}
