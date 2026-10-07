import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => { await page.route('**/api/radar/latest', route => route.fulfill({ json: { success: false, message: 'Fixture sem edição.' } })); });
const playlist = { id: 'fixture', mediaType: 'SPOTIFY_PLAYLIST', name: 'Playlist de teste', enabled: true, spotifyUrl: 'https://open.spotify.com/playlist/1234567890123456789012?si=public' };
for (const width of [375, 390, 768, 1440]) test(`Spotify oficial responsivo ${width}, fallback sem API nem áudio`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await page.route('**/api/live', route => route.fulfill({ json: { success: true, preferences: { editorial: {} }, football: { enabled: false, teams: [], matches: [], status: 'DISABLED' }, media: [playlist] } }));
  // The widget fixture is local; no Spotify/API/audio request in browser tests.
  await page.route('https://open.spotify.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Spotify fixture</title><body style="margin:0;background:#202020;color:white"><p>Player oficial — fixture local</p></body>' }));
  await page.goto('/listen');
  const iframe = page.locator('iframe');
  await expect(iframe).toHaveAttribute('src', 'https://open.spotify.com/embed/playlist/1234567890123456789012');
  await expect(iframe).toHaveAttribute('loading', 'lazy');
  await expect(iframe).toHaveAttribute('frameborder', '0');
  await expect(iframe).toHaveAttribute('allow', 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture');
  await expect(page.getByRole('link', { name: 'Abrir no Spotify ↗' })).toHaveAttribute('target', '_blank');
  expect(await page.locator('audio').getAttribute('src')).toBeNull();
  const box = await iframe.boundingBox();
  expect(box.width).toBeGreaterThan(0); expect(box.x + box.width).toBeLessThanOrEqual(width);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/spotify-embed-${width}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Player não carregou?' }).click();
  await expect(page.getByText('Não foi possível carregar o player do Spotify.')).toBeVisible();
  await expect(iframe).toHaveCount(0);
  await expect(page.getByText('Ouça esta playlist no Spotify.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('link', { name: 'Abrir no Spotify ↗' })).toHaveAttribute('href', 'https://open.spotify.com/playlist/1234567890123456789012');
});
