import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const live = page.waitForResponse(response => new URL(response.url()).pathname === '/api/live');
  const response = await page.goto('https://radar-acs.web.app/listen');
  if (response.status() !== 200) throw Error(`Ouvir HTTP ${response.status()}`);
  const api = await live;
  if (api.status() !== 200) throw Error(`API HTTP ${api.status()}`);
  const data = await api.json();
  if (!data.success || !Array.isArray(data.media)) throw Error('Payload inválido');
  await page.getByRole('heading', { name: 'Ouvir', exact: true }).waitFor();
  if (!data.media.length) await page.getByText('Novas formas de acompanhar seu dia estão chegando.').waitFor();
  if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw Error('Overflow mobile');
  if (await page.locator('audio').getAttribute('src')) throw Error('Áudio iniciou automaticamente');
  await page.goto('https://radar-acs.web.app/admin/radios');
  await page.waitForURL('**/login');
  if (errors.length) throw Error(errors.join('; '));
  console.log(JSON.stringify({ listenHTTP: response.status(), apiHTTP: api.status(), publicMedia: data.media.length, mobile: 'PASS', emptyState: data.media.length ? 'N/A' : 'PASS', adminProtected: 'PASS', autoplay: false, pageErrors: 0 }));
} finally { await browser.close(); }
