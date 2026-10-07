import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/live', route => route.fulfill({ json: { success: true, preferences: { editorial: {} }, football: { enabled: false, status: 'DISABLED', teams: [], matches: [] }, media: [] } }));
});
import fs from 'node:fs';
import { adminMock, loginMock } from './admin-mock';
const fixture = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/editorial-edicao-002.json', import.meta.url), 'utf8'));
const edition = { ...fixture, titulo: 'Radar ACS — Edição #003', data: '2026-10-04', editionType: 'special', specialTitle: 'Eleições 2026', coverId: 'eleicoes-2026' };
test('radar CSS, mobile, redução de movimento e uma consulta para todos os slots', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  let adsCalls = 0; const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/radar/latest', route => route.fulfill({ json: { success: true, briefing: edition } }));
  await page.route('**/api/advertising', route => { adsCalls++; return route.fulfill({ json: { success: true, campaigns: [{ id: 'mock', advertiserName: 'Mock sponsor', imageUrl: 'https://example.com/mock-banner.png', targetUrl: 'https://example.com/product', alt: 'Mock banner', position: 'HOME_TOP', startDate: '2020-01-01', endDate: '2099-12-31' }] } }); });
  await page.route('https://example.com/mock-banner.png', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="120"><rect width="900" height="120" fill="#b5d4bc"/><text x="35" y="70" font-size="32">MOCK SPONSOR — TEST ONLY</text></svg>' }));
  await page.goto('/'); await expect(page.getByRole('heading', { name: edition.titulo })).toBeVisible();
  await expect(page.getByText('Publicidade', { exact: true })).toBeVisible();
  expect(adsCalls).toBe(1); expect(await page.locator('.radar-sweep').first().evaluate(node => getComputedStyle(node).animationName)).toBe('radar-rotate');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/portal-mobile.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'reduce' }); expect(await page.locator('.radar-sweep').first().evaluate(node => getComputedStyle(node).animationName)).toBe('none');
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.screenshot({ path: 'test-results/portal-desktop.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); expect(errors).toEqual([]);
});
test('outro UID não entra em Anunciantes', async ({ page }) => {
  await adminMock(page, false); await loginMock(page);
  await expect(page.getByText('Acesso negado.', { exact: true })).toBeVisible();
  await page.goto('/admin/advertisers'); await expect(page.getByRole('heading', { name: 'Acesso negado', exact: true })).toBeVisible();
});
