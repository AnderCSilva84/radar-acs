import { TeamCrest } from './TeamCrest';
import { useId, useState } from 'react';
import { searchClubs, clubForTeam, followClub } from '../services/clubCatalog';
export function FollowedTeamsEditor({ teams, onChange }) {
  const [query,setQuery]=useState(''), [open,setOpen]=useState(false), [index,setIndex]=useState(0), [message,setMessage]=useState('');
  const listId=useId(), results=searchClubs(query);
  function add(club) {
    if(teams.length>=20 && !teams.some(team=>clubForTeam(team)?.id===club.id)) return setMessage('Você pode acompanhar até 20 times.');
    onChange(followClub(club,teams)); setQuery(''); setOpen(false); setMessage('Time adicionado. Salve as preferências para aplicar.');
  }
  return <div className="team-editor"><p className="subtle">Encontre seu clube. Brasileirão 2026, Séries A, B e C.</p>
    <label>Pesquise um time<input role="combobox" aria-autocomplete="list" aria-expanded={open && results.length>0} aria-controls={listId} aria-activedescendant={open && results[index] ? `${listId}-${index}` : undefined} placeholder="Digite Flamengo, Botafogo, Paysandu..." value={query} onFocus={()=>setOpen(true)} onBlur={()=>setOpen(false)} onChange={event=>{setQuery(event.target.value);setIndex(0);setOpen(true);}} onKeyDown={event=>{
      if(event.key==='Escape') setOpen(false);
      if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);setIndex(current=>Math.max(0,Math.min(results.length-1,open?current+(event.key==='ArrowDown'?1:-1):0)));}
      if(event.key==='Enter' && open && results[index]){event.preventDefault();add(results[index]);}
    }}/></label>
    {open && results.length>0 && <ul id={listId} role="listbox" aria-label="Clubes encontrados" className="club-results">{results.map((club,i)=><li key={club.id} id={`${listId}-${i}`} role="option" aria-selected={i===index} onPointerDown={event=>event.preventDefault()} onClick={()=>add(club)}><TeamCrest team={club} /><div><strong>{club.name}</strong><small>{club.state} · Série {club.division} · {club.season}</small></div></li>)}</ul>}
    {open && query && !results.length && <p role="status">Nenhum clube encontrado nesta temporada.</p>}
    <div className="followed-clubs">{teams.map(team=>{const club=clubForTeam(team);return <article key={team.id}><TeamCrest team={club || team} /><div><strong>{team.name}</strong><small>{club?`Série ${club.division} · ${club.state} · ${club.season}`:'Clube já seguido'}{team.active?' · ✓ Seguindo':' · Pausado'}</small></div><button type="button" onClick={()=>onChange(teams.filter(item=>item.id!==team.id))}>Remover {team.name}</button>{!team.active && <button type="button" onClick={()=>onChange(teams.map(item=>item.id===team.id?{...item,active:true}:item))}>Seguir {team.name}</button>}</article>;})}</div><p role="status">{message}</p></div>;
}
