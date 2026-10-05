import { expect, it, vi } from 'vitest';
import { defaultPreferences, loadPreferences, savePreferences, PREFERENCES_KEY } from './preferences';

it('defaults editoriais e capa radar sem dados remotos', () => {
  const value = loadPreferences();
  expect(value).toEqual(defaultPreferences());
  expect(value.editorial.tecnologiaIA).toBe('high');
  expect(value.editorial.futebol).toBe('medium');
  expect(value.appearance.cover).toBe('radar');
});
it('JSON inválido e estrutura inesperada preservam defaults', () => {
  for (const raw of ['{broken', 'null', '[]', '{"appearance":{"cover":"unknown"}}']) {
    localStorage.setItem(PREFERENCES_KEY, raw);
    expect(loadPreferences()).toEqual(defaultPreferences());
  }
});
it('persiste coverId estável, densidade e prioridade desligada em uma chave versionada', () => {
  const value = defaultPreferences(); value.appearance.cover = 'radar-news';value.appearance.density = 'compact';value.editorial.clima = 'off';
  savePreferences(value);
  expect(loadPreferences()).toEqual(value);expect(localStorage.length).toBe(1);
});
it('armazenamento indisponível retorna defaults na leitura e comunica falha na escrita', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(loadPreferences()).toEqual(defaultPreferences());
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(() => savePreferences(defaultPreferences())).toThrow();
});
it('somente campos conhecidos são salvos, sem credenciais ou dados extras', () => {
  savePreferences({ ...defaultPreferences(), Authorization: 'private', secret: 'private', appearance: { cover: 'acs', token: 'private' } });
  expect(localStorage.getItem(PREFERENCES_KEY)).not.toContain('private');
  expect(loadPreferences().appearance.cover).toBe('acs');
});
it('IDs antigos horizon e pulse migrados para radar preservam prioridades', () => {
  for (const cover of ['horizon', 'pulse']) {
    const value = defaultPreferences();value.appearance.cover = cover;value.editorial.clima = 'off';
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
    expect(loadPreferences().appearance.cover).toBe('radar');
    expect(loadPreferences().editorial.clima).toBe('off');
    savePreferences(loadPreferences());
    expect(JSON.parse(localStorage.getItem(PREFERENCES_KEY)).appearance.cover).toBe('radar');
  }
});
