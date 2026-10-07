import { useEffect, useState } from 'react';
import { mediaRequest } from '../services/adminAuth';
import { appendMedia, orderedMedia, moveMedia, mediaUrl } from '../services/media';
import { MediaCard } from '../components/MediaCard';
export const newMedia = () => ({ id: '', mediaType: 'RADIO_STREAM', name: '', description: '', logoUrl: '', streamUrl: '', externalUrl: '', spotifyUrl: '', websiteUrl: '', city: '', state: '', country: 'Brasil', tags: [], enabled: true, featured: false, sortOrder: 0, usageStatus: 'pending' });
const usageLabels = { pending: 'Pendente — ainda não publicar', approved: 'Aprovado — pode aparecer no Radar', disabled: 'Desativado — não utilizar' };
export function MediaAdmin({ user }) {
  const [media, setMedia] = useState([]), [draft, setDraft] = useState(null), [editing, setEditing] = useState(false);
  const [status, setStatus] = useState('loading'), [message, setMessage] = useState(''), [deleting, setDeleting] = useState(null);
  useEffect(() => {
    let active = true;
    mediaRequest(user).then(value => { if (active) { setMedia(value.media); setStatus('ready'); } }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [user]);
  async function save(next, closeDraft = false) {
    setStatus('saving'); setMessage('');
    try {
      const value = await mediaRequest(user, { media: next });
      setMedia(value.media);
      if (closeDraft) setDraft(null);
      setDeleting(null); setMessage('Mídias salvas.');
    } catch { setMessage('Não foi possível salvar. Suas alterações foram preservadas. Confira os campos e as URLs HTTPS.'); }
    finally { setStatus('ready'); }
  }
  function submit(event) {
    event.preventDefault();
    const radio = draft.mediaType !== 'SPOTIFY_PLAYLIST';
    const urlKey = draft.mediaType === 'EXTERNAL_RADIO' ? 'externalUrl' : radio ? 'streamUrl' : 'spotifyUrl';
    if (!mediaUrl(draft[urlKey], !radio)) return setMessage(draft.mediaType === 'EXTERNAL_RADIO' ? 'Informe uma URL HTTPS pública para a transmissão oficial.' : radio ? 'Informe uma URL HTTPS pública e autorizada para o stream.' : 'Use a URL HTTPS de uma playlist em open.spotify.com.');
    for (const key of ['logoUrl', ...(radio ? ['websiteUrl'] : [])]) if (draft[key] && !mediaUrl(draft[key])) return setMessage('Logo e site devem utilizar URLs públicas HTTPS.');
    const value = { ...draft, ...(radio ? {} : { spotifyUrl: mediaUrl(draft.spotifyUrl, true) }) };
    save(editing ? media.map(item => item.id === value.id ? { ...value, sortOrder: item.sortOrder } : item) : appendMedia(media, value), true);
  }
  const radio = draft?.mediaType !== 'SPOTIFY_PLAYLIST';
  const external = draft?.mediaType === 'EXTERNAL_RADIO';
  const fields = ['name','description','logoUrl', ...(radio ? [external ? 'externalUrl' : 'streamUrl','websiteUrl','city','state','country'] : ['spotifyUrl'])];
  const labels = { name:'Nome', description:'Descrição', logoUrl:radio ? 'Logo / capa' : 'Capa opcional', streamUrl:'URL do stream', externalUrl:'URL da transmissão oficial', websiteUrl:'Site oficial', city:'Cidade', state:'Estado', country:'País', spotifyUrl:'URL da playlist no Spotify' };
  const ordered = orderedMedia(media);
  return <section className="inner-page media-admin"><div className="page-heading"><span className="eyebrow">OUVIR</span><h1>Mídia / Ouvir</h1><p>Cadastre rádios autorizadas e playlists para acompanhar o dia.</p></div>
    <button className="primary-button" disabled={status !== 'ready' || Boolean(draft)} onClick={() => { setDraft(newMedia()); setEditing(false); setMessage(''); }}>Nova mídia</button>
    {status === 'loading' && <p role="status">Carregando mídias...</p>}{status === 'error' && <p role="alert">Não foi possível carregar mídias. Recarregue antes de editar.</p>}
    {!media.length && status === 'ready' && !draft && <p className="subtle">Nenhuma mídia cadastrada. Comece adicionando uma rádio ou playlist.</p>}
    <div className="campaign-list">{ordered.map((item, index) => <section key={item.id}><div><h2>{item.name}</h2><p>{item.mediaType === 'RADIO_STREAM' ? 'Rádio / Stream' : item.mediaType === 'EXTERNAL_RADIO' ? 'Rádio / Link oficial' : 'Spotify / Playlist'} · {item.enabled ? 'Ativa' : 'Inativa'} · {item.featured ? 'Destaque' : 'Sem destaque'}</p>{item.mediaType !== 'SPOTIFY_PLAYLIST' && <p>{usageLabels[item.usageStatus]}</p>}</div>
      <div className="media-actions"><button disabled={status !== 'ready' || Boolean(draft)} onClick={() => { setDraft({ ...newMedia(), ...item }); setEditing(true); setMessage(''); }}>Editar {item.name}</button>
        <button disabled={status !== 'ready' || Boolean(draft)} onClick={() => save(media.map(value => value.id === item.id ? { ...value, enabled: !value.enabled } : value))}>{item.enabled ? 'Desativar' : 'Ativar'} {item.name}</button>
        <button disabled={status !== 'ready' || Boolean(draft)} onClick={() => setDeleting(item)}>Excluir {item.name}</button>
        <button aria-label={`Mover ${item.name} para cima`} disabled={status !== 'ready' || Boolean(draft) || index === 0} onClick={() => save(moveMedia(media, item.id, -1))}>↑</button>
        <button aria-label={`Mover ${item.name} para baixo`} disabled={status !== 'ready' || Boolean(draft) || index === ordered.length - 1} onClick={() => save(moveMedia(media, item.id, 1))}>↓</button></div>
    </section>)}</div>
    {draft && <form className="admin-form media-form" onSubmit={submit}><h2>{editing ? 'Editar mídia' : 'Nova mídia'}</h2>
      {editing && <p className="subtle">Identificador técnico: <code>{draft.id}</code></p>}
      <label>Tipo<select value={draft.mediaType} onChange={event => setDraft({ ...draft, mediaType: event.target.value })}><option value="RADIO_STREAM">Rádio / Stream autorizado</option><option value="EXTERNAL_RADIO">Rádio / Link oficial</option><option value="SPOTIFY_PLAYLIST">Spotify / Playlist</option></select></label>
      {fields.map(key => <label key={key} htmlFor={`media-${key}`}>{labels[key]}{['name','streamUrl','externalUrl','spotifyUrl'].includes(key) ? ' *' : ''}
        {key === 'description' ? <textarea id={`media-${key}`} maxLength="400" rows="3" value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />
          : <input id={`media-${key}`} type={key.endsWith('Url') ? 'url' : 'text'} pattern={key.endsWith('Url') ? 'https://.+' : undefined} placeholder={key === 'spotifyUrl' ? 'https://open.spotify.com/playlist/...' : undefined} maxLength={key.endsWith('Url') ? 2000 : 120} required={['name','streamUrl','externalUrl','spotifyUrl'].includes(key)} value={draft[key]} aria-describedby={key === 'streamUrl' ? 'stream-help' : undefined} onChange={event => setDraft({ ...draft, [key]: event.target.value })} />}
        {key === 'externalUrl' && <small>Abre a transmissão oficial em uma nova aba, sem reprodução dentro do Radar.</small>}
        {key === 'streamUrl' && <small id="stream-help">Use o endereço direto e autorizado da transmissão, não apenas o endereço do site da rádio.</small>}
      </label>)}
      <label>Tags<input placeholder="Notícias, música, tecnologia" value={draft.tags.join(', ')} onChange={event => setDraft({ ...draft, tags: event.target.value.split(',').map(tag => tag.trim()).filter(Boolean) })} /></label>
      {radio && <label>Status de uso<select value={draft.usageStatus} onChange={event => setDraft({ ...draft, usageStatus: event.target.value })}>{Object.entries(usageLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>}
      <label className="media-check"><input type="checkbox" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled: event.target.checked })} /><span><strong>Ativa</strong><small>{radio ? 'Exibir esta mídia quando estiver aprovada.' : 'Exibir esta playlist na área Ouvir.'}</small></span></label>
      <label className="media-check"><input type="checkbox" checked={draft.featured} onChange={event => setDraft({ ...draft, featured: event.target.checked })} /><span><strong>Destaque</strong><small>Dar maior visibilidade na área Ouvir.</small></span></label>
      {draft.name.trim() && mediaUrl(external ? draft.externalUrl : radio ? draft.streamUrl : draft.spotifyUrl, !radio) && <section className="media-preview" aria-label="Pré-visualização"><h3>Pré-visualização</h3><MediaCard item={draft} preview /><p className="subtle">Prévia visual. Nenhum áudio será iniciado.</p></section>}
      <div className="media-actions"><button className="primary-button" disabled={status === 'saving'}>{status === 'saving' ? 'Salvando...' : 'Salvar mídia'}</button><button type="button" disabled={status === 'saving'} onClick={() => setDraft(null)}>Cancelar</button></div>
    </form>}
    {deleting && <section className="media-confirm" role="alertdialog" aria-labelledby="delete-title" aria-describedby="delete-description"><h2 id="delete-title">Excluir mídia?</h2><p id="delete-description">{deleting.name} será removida do catálogo.</p><div className="media-actions"><button autoFocus disabled={status === 'saving'} onClick={() => setDeleting(null)}>Cancelar exclusão</button><button disabled={status === 'saving'} onClick={() => save(media.filter(item => item.id !== deleting.id))}>Confirmar exclusão</button></div></section>}
    <p role="status">{message}</p>
  </section>;
}


