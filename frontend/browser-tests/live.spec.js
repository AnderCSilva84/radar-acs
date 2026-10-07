import { test, expect } from '@playwright/test';
import { adminMock } from './admin-mock';
test.beforeEach(async ({ page }) => { await page.route('**/api/radar/latest', route => route.fulfill({ json: { success: false, message: 'Fixture sem edição.' } })); });
const radio = { id:'fixture-radio',mediaType:'RADIO_STREAM',name:'Rádio Fixture',streamUrl:'https://example.com/fixture.wav',enabled:true,usageStatus:'approved' };
const playlist = { id:'fixture-playlist',mediaType:'SPOTIFY_PLAYLIST',name:'Playlist Fixture',spotifyUrl:'https://open.spotify.com/playlist/1234567890123456789012',enabled:true };
for (const width of [375,768,1440]) {
  test(`Ouvir ${width}px, rádio persistente e Spotify separado`, async ({ page }) => {
    await page.setViewportSize({width,height:900});
    await page.route('https://open.spotify.com/embed/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Spotify test fixture</title>' }));
    await page.route('**/api/live', route=>route.fulfill({json:{success:true,preferences:{editorial:{}},football:{enabled:false,teams:[],matches:[],status:'DISABLED'},media:[radio,playlist]}}));
    // Tiny valid PCM audio fixture; never contacts an actual stream.
    const bytes=Buffer.alloc(16044);bytes.write('RIFF');bytes.writeUInt32LE(16036,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(8000,24);bytes.writeUInt32LE(16000,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(16000,40);
    await page.route('https://example.com/fixture.wav',route=>route.fulfill({contentType:'audio/wav',body:bytes}));
    await page.route('**/api/radar/history*',route=>route.fulfill({json:{success:true,editions:[],nextCursor:null}}));
    await page.route('**/api/advertising',route=>route.fulfill({json:{success:true,campaigns:[]}}));
    const response=await page.goto('/listen');expect(response.status()).toBe(200);
    await expect(page.getByRole('heading',{level:1,name:'Ouvir'})).toBeVisible();
    expect(await page.locator('audio').getAttribute('src')).toBeNull();
    await expect(page.getByRole('link',{name:'Abrir no Spotify ↗'})).toHaveAttribute('href',playlist.spotifyUrl);
    await page.getByRole('button',{name:'Ouvir Rádio Fixture'}).click();
    await expect(page.getByRole('complementary',{name:'Player de rádio'})).toBeVisible();
    const source=await page.locator('audio').getAttribute('src');expect(source).toBe(radio.streamUrl);
    await page.getByRole('link',{name:'Histórico',exact:true}).click();
    await expect(page.getByRole('heading',{level:1,name:/Histórico/})).toBeVisible();
    expect(await page.locator('audio').getAttribute('src')).toBe(source);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Parar',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Player de rádio'})).toHaveCount(0);
    if(width===375) {await page.getByRole('link',{name:'Ouvir',exact:true}).click();await page.screenshot({path:'test-results/listen-mobile.png',fullPage:true});}
  });
}
test('admin mídias permanece privado e dados live não dependem de login',async({page})=>{
  await adminMock(page);
  await page.goto('/admin/radios');await expect(page).toHaveURL(/\/login$/);
});

