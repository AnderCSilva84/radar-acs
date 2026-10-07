import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('**/api/live', route => route.fulfill({ json: { success: true, preferences: { editorial: {} }, football: { enabled: false, status: 'DISABLED', teams: [], matches: [] }, media: [] } }));
});
import fs from 'node:fs';
const fixture = JSON.parse(fs.readFileSync(new URL('../../tests/fixtures/editorial-edicao-002.json', import.meta.url), 'utf8'));
fixture.noticias = fixture.noticias.map(({ titulo, resumo, fonte, categoria, url }) => ({ titulo, resumo, fonte, categoria, sourceUrl: url }));

for (const width of [375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`Home editorial sem overflow em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/api/advertising', route => route.fulfill({ json: { success: true, campaigns: [] } }));
    let requests = 0;
    await page.route('**/api/radar/latest', route => { requests++; return route.fulfill({ json: { success: true, briefing: fixture } }); });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: fixture.titulo })).toBeVisible();
    await expect(page.getByRole('article')).toHaveCount(5);
    expect(requests).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.locator('.edition-hero .edition-cover')).toBeVisible();
    const summary = await page.getByRole('complementary', { name: 'Seu Radar' }).boundingBox();
    const feed = await page.locator('.home-editorial-content').boundingBox();
    if (width >= 1100) {
      expect(summary.x).toBeGreaterThan(feed.x + feed.width);
      expect(summary.width).toBeGreaterThanOrEqual(220);
      expect(summary.width).toBeLessThan(feed.width);
    } else {
      expect(summary.y).toBeGreaterThanOrEqual(feed.y + feed.height);
    }
    await expect(page.locator('.home-editorial-layout .edition-summary')).toHaveCount(0);
    await expect(page.locator('.home-editorial-layout .editorial-directory')).toHaveCount(0);
    expect(await page.locator('.source a').first().evaluate(node => getComputedStyle(node, '::before').content)).toBe('none');
    if (width >= 1280) {
      const heading = await page.getByRole('heading', { name: 'Últimas notícias' }).boundingBox();
      const banner = await page.locator('.edition-hero .edition-cover').boundingBox();
      expect(Math.abs(banner.width / banner.height - 16 / 9)).toBeLessThan(0.02);
      expect(heading.y).toBeGreaterThan(banner.y + banner.height);
    }
    await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Ler edição' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Roteiro do briefing' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement))).toBe(true);
    expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ler edição' }).first()).toBeFocused();
    const links = page.locator('.source a');
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('target', '_blank');
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
}
test('loading, erro com retry manual e empty', async ({ page }) => {
  await page.route('**/api/advertising', route => route.fulfill({ json: { success: true, campaigns: [] } }));
  let calls = 0;
  let release;
  const paused = new Promise(resolve => { release = resolve; });
  await page.route('**/api/radar/latest', async route => {
    calls++;
    if (calls === 1) { await paused; await route.fulfill({ status: 503 }); }
    else await route.fulfill({ json: { success: false, message: 'Nenhum briefing disponível.' } });
  });
  await page.goto('/');
  await expect(page.getByText('Preparando seu Radar...')).toBeVisible();
  release();
  await expect(page.getByText('Não foi possível carregar o Radar agora.')).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByText('Ainda não há uma edição publicada.')).toBeVisible();
  expect(calls).toBe(2);
});

