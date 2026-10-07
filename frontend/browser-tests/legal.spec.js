import { test, expect } from '@playwright/test';

for (const width of [375, 1440]) {
  for (const [path, title] of [['/privacy', 'Política de Privacidade'], ['/terms', 'Termos de Uso']]) {
    test(`${path}: acesso direto, refresh e navegação pública em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const requests = [];
      const runtimeErrors = [];
      page.on('pageerror', error => runtimeErrors.push(error.message));
      page.on('request', request => { if (/\/api\/|firebase\/init|identitytoolkit/.test(request.url())) requests.push(request.url()); });
      const response = await page.goto(path);
      expect(response.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${title} — Radar ACS`);
      await expect(page.getByText(path === '/privacy' ? '5 de outubro de 2026' : '4 de outubro de 2026')).toBeVisible();
      if (path === '/privacy') await expect(page.getByRole('link', { name: 'Política de Privacidade do Spotify' })).toHaveAttribute('href', 'https://www.spotify.com/legal/privacy-policy/');
      expect((await page.reload()).status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${title} — Radar ACS`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('link', { name: 'Hoje', exact: true })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Histórico', exact: true })).toBeVisible();
      const other = path === '/privacy' ? 'Termos de Uso' : 'Política de Privacidade';
      await page.getByRole('link', { name: other, exact: true }).click();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`${other} — Radar ACS`);
      expect(requests).toEqual([]);
      expect(runtimeErrors).toEqual([]);
      if (width === 375) await page.screenshot({ path: `test-results/legal-${path.slice(1)}-mobile.png`, fullPage: true });
    });
  }
}
