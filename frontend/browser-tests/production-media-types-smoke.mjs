// Read-only smoke test. Admin authentication/API are mocked ONLY in the isolated
// browser context to inspect the published form without real login or writes.
import { chromium } from '@playwright/test';
import { adminMock, loginMock } from './admin-mock.js';
import fs from 'node:fs';
const baseURL = 'https://radar-acs.web.app';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ baseURL, viewport: { width: 375, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const baseline = JSON.parse(fs.readFileSync(new URL('../../.local-media-deploy-latest.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
  const latest = await page.request.get('/api/briefing/latest');
  if (latest.status() !== 200 || JSON.stringify(await latest.json()) !== JSON.stringify(baseline)) throw Error('Latest mudou ou ficou indisponível');
  const admin = await page.request.get('/api/admin/radios');
  if (admin.status() !== 401) throw Error(`Admin anônimo HTTP ${admin.status()}`);
  const livePromise = page.waitForResponse(response => new URL(response.url()).pathname === '/api/live');
  const listen = await page.goto('/listen');
  if (listen.status() !== 200) throw Error(`Listen HTTP ${listen.status()}`);
  const live = await livePromise;
  const value = await live.json();
  if (live.status() !== 200 || !value.success || !Array.isArray(value.media)) throw Error('API Ouvir inválida');
  if (!value.media.length) await page.getByText('Novas formas de acompanhar seu dia estão chegando.').waitFor();
  if (await page.locator('audio').getAttribute('src')) throw Error('Áudio iniciou automaticamente');
  await page.goto('/admin/radios'); await page.waitForURL('**/login');
  await browser.newContext({ baseURL }).then(async context => {
    try {
      const editor = await context.newPage();
      await adminMock(editor);
      let writes = 0;
      await editor.route('**/api/admin/radios', route => {
        if (route.request().method() !== 'GET') { writes++; return route.abort(); }
        return route.fulfill({ json: { success: true, settings: { media: [] } } });
      });
      await loginMock(editor); await editor.waitForURL('**/admin');
      await editor.goto('/admin/radios');
      await editor.getByRole('button', { name: 'Nova mídia' }).click();
      const type = editor.getByLabel('Tipo');
      for (const id of ['RADIO_STREAM', 'EXTERNAL_RADIO', 'SPOTIFY_PLAYLIST']) {
        await type.selectOption(id);
        if (await type.inputValue() !== id) throw Error(`Tipo ausente: ${id}`);
        if (id === 'RADIO_STREAM') {
          await editor.getByLabel('URL do stream', { exact: false }).waitFor();
          if (await editor.getByLabel('Status de uso').inputValue() !== 'pending') throw Error('Rádio foi aprovada automaticamente');
        } else if (id === 'EXTERNAL_RADIO') {
          await editor.getByLabel('URL da transmissão oficial', { exact: false }).waitFor();
          if (await editor.getByLabel('URL do stream', { exact: false }).count()) throw Error('Rádio externa exige stream');
        } else await editor.getByLabel('URL da playlist no Spotify', { exact: false }).waitFor();
      }
      if (writes) throw Error('Tentativa de escrita no teste');
    } finally { await context.close(); }
  });
  if (errors.length) throw Error(errors.join('; '));
  console.log(JSON.stringify({ listenHTTP: listen.status(), apiHTTP: live.status(), publicMedia: value.media.length, emptyState: value.media.length ? 'N/A' : 'PASS', adminAnonymousHTTP: admin.status(), adminRedirect: 'PASS', publishedFormTypes: 'PASS (isolated mock auth/API)', latestUnchanged: true, latestTitle: baseline.briefing.titulo, latestDate: baseline.briefing.data, productionWrites: 0, pageErrors: 0 }));
} finally { await browser.close(); }
