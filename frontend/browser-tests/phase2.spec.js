import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { adminMock, loginMock } from './admin-mock';
const fixture = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/editorial-edicao-002.json', import.meta.url), 'utf8'));
for (const width of [375, 390, 430, 768, 1280]) {
  test(`historico publico e preferencias privadas em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/radar/latest', route => route.fulfill({ json: { success: true, briefing: fixture } }));
    await page.route('**/api/advertising', route => route.fulfill({ json: { success: true, campaigns: [] } }));
    let historyCalls = 0;
    await page.route('**/api/radar/history?*', route => {
      historyCalls++; const next = new URL(route.request().url()).searchParams.has('cursor');
      return route.fulfill({ json: { success: true, editions: next ? [{ ...fixture, titulo: 'Anterior', data: '2026-10-02' }] : [fixture], nextCursor: next ? null : '2026-10-03' } });
    });
    const mock = await adminMock(page);
    await page.goto('/preferences'); await expect(page).toHaveURL(/\/login$/);
    await loginMock(page); await expect(page.getByRole('heading', { name: /centro de/ })).toBeVisible();
    await page.getByRole('navigation', { name: /Administra/ }).getByRole('link', { name: /Prefer/ }).click();
    await expect(page.getByRole('heading', { name: 'Seu Radar' })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(3);
    for (const name of ['Radar', 'ACS', 'Radar News']) {
      await page.getByRole('radio', { name, exact: true }).check();
      const preview = page.locator('.screen-preview'); await expect(preview).toBeVisible(); await preview.scrollIntoViewIfNeeded();
      const bounds = await preview.boundingBox(); expect(bounds.width / bounds.height).toBeCloseTo(16 / 9, 1);
      if (name !== 'Radar News') await preview.locator('.brand-signature').evaluate(img => img.decode());
    }
    await page.getByLabel('Clima', { exact: true }).selectOption('off'); await page.getByRole('button', { name: /Salvar altera/ }).click();
    await expect(page.getByText(/Prefer.*salvas/)).toBeVisible(); expect(mock.settings().editorial.clima).toBe('off');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/preferences-${width}.png`, fullPage: true });
    await page.reload(); await expect(page.getByRole('radio', { name: 'Radar News', exact: true })).toBeChecked(); await expect(page.getByLabel('Clima', { exact: true })).toHaveValue('off');
    await page.getByRole('link', { name: /Hist.*rico/, exact: true }).click(); await expect(page.getByRole('heading', { name: fixture.titulo })).toBeVisible(); expect(historyCalls).toBe(1);
    await page.getByRole('button', { name: 'Carregar mais' }).click(); await expect(page.getByRole('heading', { name: 'Anterior' })).toBeVisible(); expect(historyCalls).toBe(2);
    await page.getByRole('button', { name: /Ver edi/ }).first().click(); await expect(page.getByRole('article')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: /Roteiro da edi/ })).toBeVisible(); expect(historyCalls).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/admin/calendar'); await expect(page.getByRole('heading', { name: /Calend.*rio editorial/ })).toBeVisible();
    await page.goto('/admin/advertisers'); await expect(page.getByRole('heading', { name: 'Anunciantes' })).toBeVisible();
    await page.getByRole('button', { name: 'Sair', exact: true }).click(); await expect(page).toHaveURL(/\/login$/);
  });
}
