import { expect, it, vi } from 'vitest';
import { getLatestBriefing } from './radarApi';
import { alexaBriefing, briefing } from '../test/fixture';
it('consome apenas GET latest e preserva campos realmente recebidos', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, briefing: alexaBriefing }) });
  vi.stubGlobal('fetch', fetch);
  expect(await getLatestBriefing()).toEqual(alexaBriefing);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][1].method).toBe('GET');
  expect(fetch.mock.calls[0][1].credentials).toBe('omit');
});
it('resposta sem edição retorna empty', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: false, message: 'Nenhum briefing disponível.' }) }));
  expect(await getLatestBriefing()).toBeNull();
});
it('HTTP de erro e contrato inválido são rejeitados', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  await expect(getLatestBriefing()).rejects.toThrow();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, briefing: {} }) }));
  await expect(getLatestBriefing()).rejects.toThrow();
});
it('preserva notícias aditivas sem chamadas extras', async () => {
  const payload = { ...briefing, noticias: [{ titulo: 'Notícia', fonte: 'Fonte', sourceUrl: 'https://example.com/' }] };
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, briefing: payload }) });
  vi.stubGlobal('fetch', fetch);
  expect(await getLatestBriefing()).toEqual(payload);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rejeita noticias com tipo inválido', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, briefing: { ...alexaBriefing, noticias: {} } }) }));
  await expect(getLatestBriefing()).rejects.toThrow('Resposta de notícias inválida');
});
