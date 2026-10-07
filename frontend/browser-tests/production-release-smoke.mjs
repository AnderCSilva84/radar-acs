import { chromium } from '@playwright/test';
import fs from 'node:fs';
const baseline = JSON.parse(fs.readFileSync(new URL('../../.local-release-latest-before.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { writes: 0, pages: [], errors: [] };
const check = (value, message) => { if (!value) throw Error(message); };
try {
  const page = await browser.newPage({ baseURL: 'https://radar-acs.web.app' });
  page.setDefaultTimeout(15000);
  page.on('request', request => { if (request.url().startsWith('https://radar-acs.web.app/api/') && request.method() !== 'GET') report.writes++; });
  page.on('pageerror', error => report.errors.push(error.message));
  const latest = await page.request.get('/api/briefing/latest');
  check(latest.status() === 200 && JSON.stringify(await latest.json()) === JSON.stringify(baseline), 'Latest changed');
  report.latestUnchanged = true;
  for (const width of [1440, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ['/', '/listen', '/live']) {
      const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
      check(response.status() === 200, `${path} HTTP`);
      if (path === '/') {
        for (const selector of ['.header', '.ad-slot-home_top', '.edition-hero', '.animated-radar', '.news-lead', '.secondary-stories .news-item', '.editorial-sidebar', '.edition-summary', '.home-listen', 'footer']) await page.locator(selector).first().waitFor();
        await page.getByRole('heading', { name: 'Radar Futebol', exact: true }).waitFor();
        const ad = page.locator('.ad-slot-home_top');
        check(await ad.locator('a').getAttribute('href') === 'https://acstech.dev.br/', 'Campaign target changed');
        await ad.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => { const image = document.querySelector('.ad-slot-home_top img'); return image?.complete && image.naturalWidth > 0; });
        check(await ad.locator('.ad-label').isVisible(), 'Publicidade absent');
        check(await page.locator('.news-item').count() === baseline.briefing.noticias.length, 'News count mismatch');
      } else if (path === '/listen') {
        await page.locator('.listen-hero-photo').waitFor();
        await page.waitForFunction(() => document.querySelector('.listen-hero-photo')?.naturalWidth > 0);
        await page.getByRole('heading', { name: 'Jovem Pan News', exact: true }).waitFor();
        const radio = page.locator('.radio-card').filter({ hasText: 'Jovem Pan News' });
        check(await radio.locator('a').getAttribute('href') === 'https://jovempan.com.br/ao-vivo/' && await radio.locator('a').getAttribute('target') === '_blank', 'Radio link mismatch');
        await page.getByRole('heading', { name: 'ACS Music', exact: true }).waitFor();
        const frame = page.locator('.spotify-embed iframe').first();
        await frame.waitFor();
        check((await frame.getAttribute('src')).startsWith('https://open.spotify.com/embed/playlist/'), 'Not official Spotify embed');
        await page.getByRole('button', { name: /Player n.*carregou/ }).click();
        await page.locator('.spotify-fallback-panel').waitFor();
        check(await page.locator('.spotify-external').getAttribute('target') === '_blank', 'Spotify fallback link');
        check(!await page.locator('audio').getAttribute('src'), 'Internal playback started');
        await page.locator('.news-lead').waitFor();
      } else {
        await page.getByRole('heading', { name: 'Radar Futebol', exact: true }).waitFor();
        await page.getByText('Acompanhando: Botafogo', { exact: true }).waitFor();
        await page.locator('.live-empty').waitFor();
        check(await page.locator('.live-empty > .signal-art').count() === 1, 'Football art absent');
        check(await page.locator('.live-capabilities article').count() === 3 && await page.locator('.live-card').count() === 0, 'Live empty state changed');
      }
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow ${width}`);
      report.pages.push({ path, width, http: response.status(), result: 'PASS' });
    }
  }
  check(report.errors.length === 0 && report.writes === 0, 'Runtime error or API write');
  report.result = 'PASS';
  console.log(JSON.stringify(report));
} catch (error) { console.log(JSON.stringify({ ...report, result: 'FAIL', error: error.message })); process.exitCode = 1; }
finally { await browser.close(); }
