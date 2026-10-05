// Stable registry for future contextual covers; no automatic selection now.
export const COVER_ASSETS = __COVER_ASSETS__;
export const COVER_DEFINITIONS = [
  { id: 'radar', label: 'Radar', description: 'Sinais que merecem atenção.', type: 'svg' },
  { id: 'acs', label: 'ACS', description: 'A identidade ACS no seu Radar.', type: 'svg' },
  { id: 'radar-news', label: 'Radar News', description: 'Notícias, tecnologia e oportunidades em destaque.', type: 'image', asset: COVER_ASSETS.news }
];
export const COVERS = COVER_DEFINITIONS.map(({ id, label, description }) => [id, label, description]);
export const CONTEXTUAL_COVERS = [{ id: 'eleicoes-2026', label: 'Eleições 2026', type: 'contextual', asset: COVER_ASSETS.election }];
export function resolveCover(edition, defaultCover) {
  if ([...CONTEXTUAL_COVERS, ...COVER_DEFINITIONS].some(cover => cover.id === edition?.coverId)) return edition.coverId;
  if (COVER_DEFINITIONS.some(cover => cover.id === defaultCover)) return defaultCover;
  return 'radar';
}
