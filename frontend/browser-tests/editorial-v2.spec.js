import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const base = JSON.parse(fs.readFileSync(new URL('./refinement-fixture.json', import.meta.url), 'utf8'));
for (const width of [375, 390, 430, 1280]) test(`edição V2 de sete matérias e fallback legado em ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('https://**/*', route => route.abort());
  await page.route('**/__/firebase/**', route => route.fulfill({ json: {} }));
  const latest = structuredClone(base.latest);
  latest.briefing.noticias = Array.from({ length: 7 }, (_, i) => ({ ...base.latest.briefing.noticias[i % base.latest.briefing.noticias.length],
    id: 'fixture-' + i, titulo: 'Matéria local de teste ' + (i + 1), editorialSummary: i === 6 ? undefined : 'Primeiro parágrafo factual ' + (i + 1) + '.\n\nSegundo parágrafo contextual ' + (i + 1) + '.',
    resumo: 'Resumo legado local ' + (i + 1) + '.', speechSummary: 'Texto reservado para narração.' }));
  await page.route('**/api/radar/latest', route => route.fulfill({ json: latest }));
  await page.route('**/api/briefing/latest', route => route.fulfill({ json: latest }));
  await page.route('**/api/live', route => route.fulfill({ json: base.live }));
  await page.route('**/api/advertising', route => route.fulfill({ json: base.ads }));
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.news-item')).toHaveCount(7);
  await expect(page.getByText('Primeiro parágrafo factual 1.', { exact: true })).toBeVisible();
  await expect(page.getByText('Segundo parágrafo contextual 1.', { exact: true })).toBeVisible();
  await expect(page.getByText('Resumo legado local 7.', { exact: true })).toBeVisible();
  await expect(page.getByText('Texto reservado para narração.', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
