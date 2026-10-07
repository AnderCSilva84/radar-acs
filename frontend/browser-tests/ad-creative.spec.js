import { test, expect } from '@playwright/test';
import { adminMock, loginMock } from './admin-mock.js';
import fs from 'node:fs';

test('criativo local e prévia compartilhada sem upload ou escrita remota', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route('https://**/*', route => route.abort());
  await adminMock(page);
  let writes = 0;
  page.on('request', request => { if (request.method() === 'PUT') writes++; });
  await loginMock(page);
  await page.goto('/admin/advertisers');
  await page.getByRole('button', { name: 'Nova campanha' }).click();

  await page.getByLabel('Anunciante', { exact: true }).fill('Anunciante de teste');
  await page.getByRole('button', { name: '2. Campanha', exact: true }).click();
  await page.getByLabel('Campanha', { exact: true }).fill('Campanha técnica — somente teste local');
  await page.getByLabel('URL de destino', { exact: true }).fill('https://example.com/offer');
  await page.getByRole('button', { name: '4. Criativo', exact: true }).click();
  await page.getByLabel('URL do banner', { exact: true }).fill('https://example.com/technical.png');
  await page.getByLabel('Texto do botão (opcional)').fill('Saiba mais');
  expect(await page.getByLabel('Texto alternativo', { exact: true }).evaluate(input => input.checkValidity())).toBe(false);
  await page.getByLabel('Texto alternativo', { exact: true }).fill('Criativo técnico azul com identificação de teste');
  const bytes = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 1200, 300); gradient.addColorStop(0, '#123b66'); gradient.addColorStop(1, '#07564d');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1200, 300);
    ctx.fillStyle = '#8ff0dd'; ctx.font = 'bold 52px sans-serif'; ctx.fillText('ANUNCIANTE DE TESTE', 65, 115);
    ctx.fillStyle = '#ffffff'; ctx.font = '28px sans-serif'; ctx.fillText('Criativo técnico · prévia local · sem publicação', 65, 180);
    ctx.strokeStyle = '#8ff0dd'; ctx.lineWidth = 5; ctx.strokeRect(1040, 65, 95, 170);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Selecionar imagem').setInputFiles({ name: 'criativo-tecnico.png', mimeType: 'image/png', buffer: Buffer.from(bytes, 'base64') });
  await expect(page.getByText(/criativo-tecnico.png · 1200 × 300 px/)).toBeVisible();
  await expect(page.locator('.ad-preview img')).toHaveAttribute('src', /^blob:/);
  expect(await page.locator('.ad-preview a').count()).toBe(0);
  expect(await page.getByLabel('URL do banner', { exact: true }).getAttribute('required')).toBeNull();
  expect(writes).toBe(0);
  await page.evaluate(() => { document.activeElement?.blur(); });
  fs.mkdirSync('review/ad-creative', { recursive: true });
  const captureStyle = '.skip-link { visibility: hidden; }'; // Hide offscreen fixed-link capture artifact only.
  await page.screenshot({ path: 'review/ad-creative/admin-selected.png', fullPage: true, style: captureStyle });
  await page.locator('.creative-editor').screenshot({ path: 'review/ad-creative/home-top-desktop.png', style: captureStyle });
  for (const [name, width] of [['Tablet', '768'], ['Mobile', '390']]) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.creative-preview-viewport')).toHaveAttribute('data-width', width);
  }
  await page.locator('.creative-editor').screenshot({ path: 'review/ad-creative/home-top-mobile.png', style: captureStyle });
  await page.getByRole('button', { name: 'Desktop', exact: true }).click();
  await page.getByRole('button', { name: '3. Espaço', exact: true }).click();
  await page.getByLabel('Posição').selectOption('SIDEBAR');
  await page.getByRole('button', { name: '4. Criativo', exact: true }).click();
  await expect(page.getByText(/Esta imagem pode sofrer corte/)).toBeVisible();
  await page.getByLabel('Ajuste da imagem').selectOption('cover');
  expect(await page.locator('.ad-preview img').evaluate(image => getComputedStyle(image).objectFit)).toBe('cover');
  await page.locator('.creative-editor').screenshot({ path: 'review/ad-creative/sidebar-desktop.png', style: captureStyle });
  await page.getByLabel('Ajuste da imagem').selectOption('contain');
  expect(await page.locator('.ad-preview img').evaluate(image => getComputedStyle(image).objectFit)).toBe('scale-down');
  for (const slot of ['HOME_MIDDLE', 'HOME_BOTTOM', 'HISTORY', 'SPECIAL_SPONSOR']) {
    await page.getByRole('button', { name: '3. Espaço', exact: true }).click();
    await page.getByLabel('Posição').selectOption(slot);
  await page.getByRole('button', { name: '4. Criativo', exact: true }).click();
    await expect(page.locator('.ad-preview')).toHaveClass(new RegExp('ad-slot-' + slot.toLowerCase()));
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Remover imagem local' }).click();
  await expect(page.getByText(/criativo-tecnico.png/)).toHaveCount(0);
  for (const [extension, mimeType] of [['jpg', 'image/jpeg'], ['webp', 'image/webp']]) {
    const data = await page.evaluate(type => {
      const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 300;
      canvas.getContext('2d').fillRect(0, 0, 1200, 300);
      return canvas.toDataURL(type).split(',')[1];
    }, mimeType);
    await page.getByLabel('Selecionar imagem').setInputFiles({ name: `technical.${extension}`, mimeType, buffer: Buffer.from(data, 'base64') });
    await expect(page.getByText(new RegExp(`technical.${extension} · 1200 × 300 px`))).toBeVisible();
    expect(await page.locator('.ad-preview img').evaluate(img => img.naturalWidth)).toBe(1200);
  }
  expect(writes).toBe(0);
});
