import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/live', route => route.fulfill({ json: { success: true, preferences: { editorial: {} }, football: { enabled: false, status: 'DISABLED', teams: [], matches: [] }, media: [] } }));
});
import fs from 'node:fs';
const old = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/editorial-edicao-002.json', import.meta.url), 'utf8'));
const special = { ...old, data: '2026-10-04', titulo: 'Radar ACS — Edição #003', coverId: 'eleicoes-2026', context: 'eleicoes-2026', editionType: 'special', specialTitle: 'Eleições 2026' };
for (const width of [375,390,430,768,1024,1280,1440]) {
  test(`capa contextual no Today e Histórico sem alterar preferência em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/advertising', route => route.fulfill({ json: { success: true, campaigns: [] } }));
    await page.addInitScript(() => localStorage.setItem('radar-acs.preferences.v1', JSON.stringify({ appearance: { cover: 'radar-news', density: 'comfortable' } })));
    let normal = false;
    await page.route('**/api/briefing/latest', route => route.fulfill({ json: { success: true, briefing: normal ? old : special } }));
    // DEV uses its unchanged proxy path.
    await page.route('**/api/radar/latest', route => route.fulfill({ json: { success: true, briefing: normal ? old : special } }));
    await page.route('**/api/radar/history?*', route => route.fulfill({ json: { success: true, editions: [special,old], nextCursor: null } }));
    await page.goto('/');
    const cover = page.getByLabel('Capa Eleições 2026');
    await expect(cover).toBeVisible();await cover.locator('img').evaluate(img => img.decode());
    expect(await cover.locator('img').evaluate(img => img.naturalWidth > 0)).toBe(true);
    expect(await cover.locator('img').evaluate(img => getComputedStyle(img).objectFit)).toBe('contain');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/election-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('radar-acs.preferences.v1')).appearance.cover)).toBe('radar-news');
    await page.getByRole('link', { name: 'Histórico', exact: true }).click();
    await expect(page.locator('.history-card .edition-cover')).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/history-covers-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Ver edição →' }).first().click();
    await expect(page.getByLabel('Capa Eleições 2026')).toBeVisible();
    await page.getByRole('button', { name: '← Voltar ao histórico' }).click();
    await page.getByRole('button', { name: 'Ver edição →' }).last().click();
    await expect(page.getByLabel('Capa Eleições 2026')).toHaveCount(0);
    normal = true;await page.getByRole('link', { name: 'Hoje', exact: true }).click();
    await expect(page.locator('.edition-hero [data-cover="radar-news"]')).toBeVisible();
  });
}
