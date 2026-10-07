// Local review screenshots use public production snapshots, never invented news,
// stations, scores, playlists or advertising. No production writes or playback.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const read = path => JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const latest = read('../../.local-spotify-deploy-latest.json');
const live = read('../../.local-premium-live.json');
const ads = read('../../.local-premium-ads.json');
const output = new URL('../review/public-final/', import.meta.url);
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const [label, width] of [['desktop', 1440], ['mobile', 375]]) {
    const page = await browser.newPage({ baseURL: 'http://127.0.0.1:4175', viewport: { width, height: 1000 } });
    await page.route('**/api/briefing/latest', route => route.fulfill({ json: latest }));
    await page.route('**/api/live', route => route.fulfill({ json: live }));
    await page.route('**/api/advertising', route => route.fulfill({ json: ads }));
    for (const [path, name, heading] of [['/', 'home', latest.briefing.titulo], ['/listen', 'listen', 'Ouvir'], ...(label === 'desktop' ? [['/live', 'live', 'Radar Ao Vivo']] : [])]) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      if (response.status() !== 200) throw Error(`${path}: HTTP ${response.status()}`);
      await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      if (path === '/') {
        await page.locator('.home-listen').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => [...document.querySelectorAll('.home-listen img')].every(image => image.complete));
      }
      if (path === '/listen') {
        await page.getByRole('heading', { name: 'Jovem Pan News', exact: true }).waitFor();
        const frame = page.locator('iframe').first();
        await frame.waitFor(); await frame.scrollIntoViewIfNeeded();
        // Render the actual official iframe. Its existing playlist may be
        // unavailable; never replace it with a fabricated working player.
        const content = frame.contentFrame();
        const notFound = content.getByText('Page not found', { exact: true });
        await notFound.or(content.getByRole('button', { name: /^(Play|Reproduzir)$/i }).first()).waitFor({ timeout: 15000 }).catch(() => {});
        if (await notFound.isVisible().catch(() => false)) await page.getByRole('button', { name: /Player n.*carregou/ }).first().click();
      }
      if (path === '/live' && live.football.enabled) await page.getByRole('heading', { name: 'Radar Futebol' }).waitFor();
      await page.evaluate(async () => { await document.fonts.ready; document.documentElement.style.scrollBehavior = 'auto'; document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
      await page.waitForFunction(() => scrollY === 0);
      await page.waitForFunction(() => [...document.images].filter(image => image.getBoundingClientRect().top < innerHeight).every(image => image.complete), { timeout: 15000 }).catch(() => {});
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw Error(`${path}: horizontal overflow`);
      await page.screenshot({ path: new URL(`${name}-final-${label}.png`, output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), fullPage: true });
      console.log(JSON.stringify({ path, width, http: response.status(), screenshot: `${name}-final-${label}.png`, realData: true }));
    }
    if (label === 'desktop' && ads.campaigns?.length) { await page.goto('/'); await page.locator('.ad-slot-home_top img').waitFor(); await page.waitForFunction(() => { const image = document.querySelector('.ad-slot-home_top img'); return image?.complete && image.naturalWidth > 0; }); await page.locator('.ad-slot-home_top').screenshot({ path: new URL('home-desktop-ad-preview.png', output).pathname.replace(/^\/([A-Za-z]:)/, '$1'), style: '.skip-link { visibility: hidden; }' }); }
    await page.close();
  }
} finally { await browser.close(); }
