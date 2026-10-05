import { expect, it } from 'vitest';
import { resolveCover } from './covers';
import { savePreferences, loadPreferences, defaultPreferences } from './preferences';
it('capa contextual tem prioridade sem sobrescrever preferência e termina com a edição', () => {
  const preference = defaultPreferences();preference.appearance.cover = 'radar-news';savePreferences(preference);
  expect(resolveCover({ coverId: 'eleicoes-2026' }, loadPreferences().appearance.cover)).toBe('eleicoes-2026');
  expect(loadPreferences().appearance.cover).toBe('radar-news');
  expect(resolveCover({}, loadPreferences().appearance.cover)).toBe('radar-news');
  expect(resolveCover({ coverId: 'unknown' }, 'unknown')).toBe('radar');
});
