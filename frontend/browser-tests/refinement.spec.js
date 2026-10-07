import { test, expect } from '@playwright/test';
import fs from 'node:fs';
// Frozen public snapshots; isolated routes, no production reads or writes.
const { latest, live, ads } = JSON.parse(fs.readFileSync(new URL('./refinement-fixture.json', import.meta.url), 'utf8'));
for (const width of [390, 768, 1440]) test(`refinamento Home, mídias e publicidade em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('**/api/radar/latest', route => route.fulfill({ json: latest }));
  await page.route('**/api/live', route => route.fulfill({ json: live }));
  await page.route('**/api/advertising', route => route.fulfill({ json: ads }));
  await page.route('https://acstech.dev.br/**', route => route.abort());
  await page.route('https://yt3.googleusercontent.com/**', route => route.abort());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: latest.briefing.titulo, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jovem Pan News', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ACS Music', exact: true })).toBeVisible();
  expect(await page.locator('iframe').count()).toBe(0);
  expect(await page.locator('.news-lead').count()).toBe(1);
  expect(await page.locator('.secondary-stories .news-item').count()).toBe(latest.briefing.noticias.length - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto('/live');
  await expect(page.getByText('Acompanhando: Botafogo')).toBeVisible();
  await expect(page.getByText(/Quando houver partidas disponíveis/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Gerenciar times acompanhados →' })).toHaveAttribute('href', '/admin/preferences');
});
