import { CoverArt } from './CoverArt';
import { resolveCover } from '../services/covers';
import { loadPreferences } from '../services/preferences';
export function EditionCover({ briefing, priority = false, thumbnail = false }) {
  const cover = resolveCover(briefing, loadPreferences().appearance.cover);
  return <div className="screen-preview edition-cover" data-cover={cover} aria-label={cover === 'eleicoes-2026' ? 'Capa Eleições 2026' : 'Capa da edição'}>
    <CoverArt key={cover} cover={cover} priority={priority} thumbnail={thumbnail} />
  </div>;
}
