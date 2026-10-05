export const PREFERENCES_KEY = 'radar-acs.preferences.v1';
export const CATEGORIES = [
  ['tecnologiaIA', 'Tecnologia & IA', 'high'], ['desenvolvimento', 'Desenvolvimento', 'high'],
  ['concursosCarreira', 'Concursos & carreira', 'high'], ['brasilMundo', 'Brasil & Mundo', 'medium'],
  ['economia', 'Economia', 'medium'], ['oportunidades', 'Oportunidades', 'high'],
  ['futebol', 'Futebol', 'medium'], ['clima', 'Clima', 'medium']
];
export const PRIORITIES = [['high', 'Alta'], ['medium', 'Média'], ['low', 'Baixa'], ['off', 'Desligada']];
import { COVERS } from './covers';
export { COVERS } from './covers';
export function defaultPreferences() {
  return { editorial: Object.fromEntries(CATEGORIES.map(([key, , priority]) => [key, priority])), appearance: { cover: 'radar', density: 'comfortable' } };
}
export function normalizePreferences(input) {
  const result = defaultPreferences();
  for (const [key] of CATEGORIES) if (PRIORITIES.some(([value]) => value === input?.editorial?.[key])) result.editorial[key] = input.editorial[key];
  // Legacy horizon/pulse and unknown IDs resolve to default without writes.
  if (COVERS.some(([key]) => key === input?.appearance?.cover)) result.appearance.cover = input.appearance.cover;
  if (['comfortable', 'compact'].includes(input?.appearance?.density)) result.appearance.density = input.appearance.density;
  return result;
}
export function loadPreferences() {
  try { return normalizePreferences(JSON.parse(localStorage.getItem(PREFERENCES_KEY))); }
  catch { return defaultPreferences(); }
}
export function savePreferences(value) {
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalizePreferences(value)));
}
