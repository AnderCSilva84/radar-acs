import { expect, it, vi } from 'vitest';
import { getBriefingHistory } from './historyApi';
import { briefing } from '../test/fixture';

it('history uses a single bounded GET and explicit cursor with no credentials', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, editions: [briefing], nextCursor: null }) });vi.stubGlobal('fetch', fetch);
  expect((await getBriefingHistory({ cursor: '2026-10-03' })).editions).toEqual([briefing]);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls[0][0]).toBe('/api/radar/history?limit=5&cursor=2026-10-03');
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'omit', cache: 'no-store' });
});
it('history rejects HTTP errors and malformed contracts without retry', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false });vi.stubGlobal('fetch', fetch);
  await expect(getBriefingHistory()).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true, editions: Array(6).fill(briefing), nextCursor: null }) });
  await expect(getBriefingHistory()).rejects.toThrow('Resposta de histórico inválida');
});
