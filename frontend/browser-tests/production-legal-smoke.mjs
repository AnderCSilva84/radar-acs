import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/\/api\/|firebase\/init|identitytoolkit/.test(request.url())) requests.push(request.url()); });
  for (const [path, title] of [['privacy', 'Política de Privacidade'], ['terms', 'Termos de Uso']]) {
    const response = await page.goto(`https://radar-acs.web.app/${path}`);
    await page.getByRole('heading', { level: 1, name: `${title} — Radar ACS`, exact: true }).waitFor();
    if (response.status() !== 200) throw new Error(`${path}: HTTP ${response.status()}`);
    const refreshed = await page.reload();
    await page.getByRole('heading', { level: 1, name: `${title} — Radar ACS`, exact: true }).waitFor();
    if (refreshed.status() !== 200 || !await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error(`${path}: refresh ou layout inválido`);
    const other = path === 'privacy' ? 'Termos de Uso' : 'Política de Privacidade';
    await page.getByRole('link', { name: other, exact: true }).click();
    await page.getByRole('heading', { level: 1, name: `${other} — Radar ACS`, exact: true }).waitFor();
    console.log(JSON.stringify({ path, http: response.status(), direct: 'PASS', refresh: 'PASS', mobile: 'PASS', footer: 'PASS' }));
  }
  if (errors.length || requests.length) throw new Error('Erro JavaScript ou consulta inesperada em página legal');
  console.log(JSON.stringify({ publicAccess: 'PASS', apiRequests: 0, authRequests: 0, pageErrors: 0 }));
} finally { await browser.close(); }
