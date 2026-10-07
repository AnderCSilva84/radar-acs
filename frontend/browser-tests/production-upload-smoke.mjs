import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ baseURL: 'https://radar-acs.web.app' });
  let writes = 0;
  page.on('request', request => { if (request.url().startsWith('https://radar-acs.web.app/api/') && request.method() !== 'GET') writes++; });
  const home = await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.locator('.news-lead').waitFor();
  if(home.status() !== 200) throw Error('Home HTTP');
  const script = await page.locator('script[type=module]').getAttribute('src');
  const localHtml = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  if(!localHtml.includes(script)) throw Error('Hosting bundle mismatch');
  const bundle = await page.request.get(script);
  if(bundle.status() !== 200 || !(await bundle.text()).includes('A imagem selecionada será enviada ao salvar a campanha')) throw Error('Upload bundle not published');
  const latest = await page.request.get('/api/briefing/latest');
  const baseline = JSON.parse(fs.readFileSync(new URL('../../.local-release-latest-before.json', import.meta.url), 'utf8'));
  if(latest.status() !== 200 || JSON.stringify(await latest.json()) !== JSON.stringify(baseline)) throw Error('Edition changed');
  await page.goto('/admin/advertisers', { waitUntil: 'domcontentloaded' });
  await page.waitForURL('**/login');
  if(await page.locator('input[type=file]').count() || writes) throw Error('Admin exposed or production write');
  console.log(JSON.stringify({ homeHTTP: home.status(), uploadBundle: 'PASS', adminProtected: 'PASS', editionUnchanged: true, campaignWrites: writes, realUploadTest: 'NOT EXECUTED', result: 'PASS' }));
} finally { await browser.close(); }
