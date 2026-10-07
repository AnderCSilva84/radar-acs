// Read-only diagnosis. Never authenticates, edits media, invokes audio or writes production.
import { chromium, webkit, devices } from '@playwright/test';
import fs from 'node:fs';
const response = await fetch('https://radar-acs.web.app/api/live/radios');
if (!response.ok) throw Error(`Media HTTP ${response.status}`);
const media = await response.json();
const item = media.media.find(entry => entry.id === 'acs-music');
const url = new URL(item.spotifyUrl);
const id = url.pathname.split('/').filter(Boolean).at(-1);
if (url.hostname !== 'open.spotify.com' || !/^[A-Za-z0-9]{22}$/.test(id) || !/\/playlist\//.test(url.pathname)) throw Error('Invalid registered playlist');
const canonicalUrl = `https://open.spotify.com/playlist/${id}`;
const embedUrl = `https://open.spotify.com/embed/playlist/${id}`;
const report = { type: 'playlist', playlistId: id, registeredUrl: item.spotifyUrl, canonicalUrl, embedUrl, mediaHTTP: response.status, environments: [], webkitAvailable: fs.existsSync(webkit.executablePath()) };
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const [name, options] of [['desktop Chromium', { viewport: { width: 1440, height: 1000 } }], ['iPhone emulation Chromium (not Safari)', { ...devices['iPhone 13'], defaultBrowserType: undefined, viewport: { width: 390, height: 844 } }]]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const result = { name, width: options.viewport.width };
    for (const [label, target] of [['canonical', canonicalUrl], ['embed', embedUrl]]) {
      try {
        const navigation = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 25000 });
        await page.waitForTimeout(2500);
        result[label] = { http: navigation?.status(), finalUrl: page.url(), pageNotFound: await page.getByText('Page not found', { exact: true }).isVisible().catch(() => false), title: await page.title(), playControls: await page.getByRole('button', { name: /^(Play|Reproduzir)$/i }).count() };
      } catch (error) { result[label] = { error: error.name, message: error.message.split('\n')[0] }; }
    }
    // A separate anchor uses the same canonical URL, tested without playing audio.
    await page.goto('about:blank');
    await page.setContent(`<a href="${canonicalUrl}" target="_blank" rel="noopener noreferrer">Abrir no Spotify</a>`);
    const popup = page.waitForEvent('popup');
    await page.getByRole('link').click();
    const opened = await popup;
    await opened.waitForLoadState('domcontentloaded', { timeout: 25000 }).catch(() => {});
    result.externalLink = { openedNewTab: true, finalUrl: opened.url() };
    await context.close();
    report.environments.push(result);
    console.log(JSON.stringify(result));
  }
} finally { await browser.close(); }
fs.mkdirSync('review/spotify-ios', { recursive: true });
fs.writeFileSync('review/spotify-ios/audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ playlistId: id, canonicalUrl, embedUrl, webkitAvailable: report.webkitAvailable, productionWrites: 0 }));
