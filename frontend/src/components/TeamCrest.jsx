import { useState } from 'react';
import { verifiedCrestFor } from '../services/teamCrests';

export function TeamCrest({ team, large = false }) {
  const crest = verifiedCrestFor(team);
  const [failedUrl, setFailedUrl] = useState(null);
  return <span className={`team-crest${large ? ' team-crest-large' : ''}`}>
    {crest && failedUrl !== crest.crestUrl
      ? <img src={crest.crestUrl} alt={`Escudo do ${team.name}`} width="48" height="48" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl(crest.crestUrl)} />
      : <span role="img" aria-label={`Escudo indisponível: ${team?.name || 'clube'}`}>⚽</span>}
  </span>;
}

export function FollowedTeamCrests({ teams = [], compact = false }) {
  const followed = teams.filter(team => team.active !== false);
  if (!followed.length) return null;
  const shown = compact ? followed.slice(0, 4) : followed;
  return <div className={`followed-team-crests${followed.length === 1 ? ' single-team' : ''}`} aria-label="Times acompanhados">
    {shown.map(team => <div className="followed-team-visual" key={team.id || team.name}><TeamCrest team={team} large={followed.length === 1} /><span>{team.name}</span></div>)}
    {followed.length > shown.length && <span className="team-crest-more" aria-label={`${followed.length - shown.length} outros times`}>+{followed.length - shown.length}</span>}
  </div>;
}
