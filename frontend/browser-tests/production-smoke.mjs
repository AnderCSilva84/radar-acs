// Explicit read-only production check. Not part of the mocked test suite.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', error => errors.push(error.name));
  let latestCount = 0, adsCount = 0, historyCount = 0;
  const calls = {};
  page.on('response', response => {
    const url = new URL(response.url());
    if (url.pathname === '/api/briefing/latest') { latestCount++; calls.latest = response.status(); }
    if (url.pathname === '/api/advertising') { adsCount++; calls.ads = response.status(); }
    if (url.pathname === '/api/briefing/history') { historyCount++; calls.history = response.status(); }
  });
  const latestResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/briefing/latest');
  const home = await page.goto('https://radar-acs.web.app/');
  const latest = await (await latestResponse).json();
  const baseline = JSON.parse(fs.readFileSync(new URL('../../.local-portal-latest-baseline.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
  if (JSON.stringify(latest.briefing) !== JSON.stringify(baseline)) throw Error('Latest changed');
  await page.getByRole('heading', { name: /Radar ACS.*#003/ }).waitFor();
  await page.locator('.news-lead').waitFor();
  const news = await page.getByRole('article').count();
  const radar = await page.locator('.radar-sweep').first().evaluate(node => getComputedStyle(node).animationName);
  await page.screenshot({ path: 'test-results/production-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  const mobile = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.locator('.radar-sweep').first().evaluate(node => getComputedStyle(node).animationName);
  await page.screenshot({ path: 'test-results/production-mobile.png', fullPage: true });
  await page.getByRole('link', { name: 'Histórico', exact: true }).click();
  await page.locator('.history-card').first().waitFor();
  const history = await page.locator('.history-card').count();
  await page.getByRole('button', { name: 'Ver edição →' }).first().click();
  await page.getByRole('heading', { name: 'Roteiro da edição' }).waitFor();
  const readable = await page.getByRole('article').count();
  const protectedRoutes = {};
  for (const path of ['/admin', '/admin/preferences', '/admin/calendar', '/admin/advertisers']) {
    await page.goto('https://radar-acs.web.app' + path);
    await page.getByRole('heading', { name: 'Acesso administrativo' }).waitFor();
    protectedRoutes[path] = new URL(page.url()).pathname === '/login';
  }
  if (home.status() !== 200 || !mobile || reduced !== 'none' || news < 1 || readable < 1 || errors.length || Object.values(protectedRoutes).some(value => !value) || calls.latest !== 200 || calls.history !== 200 || calls.ads !== 200) throw Error('Production smoke failed');
  console.log(JSON.stringify({ home: home.status(), news, history, readable, radar, reduced, mobile, protectedRoutes, api: calls, requests: { latest: latestCount, ads: adsCount, history: historyCount }, consoleErrors: errors.length }));
} finally { await browser.close(); }
