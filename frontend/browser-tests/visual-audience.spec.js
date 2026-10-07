import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {adminMock,loginMock} from './admin-mock.js';
const fixture=JSON.parse(fs.readFileSync(new URL('./refinement-fixture.json',import.meta.url),'utf8'));
fs.mkdirSync('review/visual-audience',{recursive:true});
for(const width of [375,390,430,768,1024,1440])test(`visual and audience routes at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});
 await page.route('https://**/*',r=>r.abort());
 await page.route('**/api/briefing/latest',r=>r.fulfill({json:fixture.latest}));
 await page.route('**/api/radar/latest',r=>r.fulfill({json:fixture.latest}));
 await page.route('**/api/live',r=>r.fulfill({json:fixture.live}));
 await page.route('**/api/advertising',r=>r.fulfill({json:fixture.ads}));
 await page.route('**/api/briefing/history?*',r=>r.fulfill({json:{success:true,editions:[{...fixture.latest.briefing,publicado:true}],nextCursor:null}}));
 await page.route('**/api/audience/listeners',r=>r.fulfill({json:{success:true,listeners:0}}));
 let tracked=0;await page.route('**/api/audience/event',r=>{tracked++;return r.fulfill({json:{success:true}});});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const path of ['/','/history','/live','/listen']){
  await page.goto(path);await expect(page.locator('.header')).toBeVisible();await expect(page.locator('main h1, main h2').first()).toBeVisible();
  if(path==='/')await expect(page.locator('.your-radar')).toBeVisible();
  if(await page.getByRole('button',{name:'Recusar',exact:true}).count())await page.getByRole('button',{name:'Recusar',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`review/visual-audience/${path==='/'?'home':path.slice(1)}-${width}.png`,fullPage:true});
 }
 await adminMock(page);await loginMock(page);
 await page.route('**/api/admin/analytics',r=>r.fulfill({json:{success:true,analytics:{visitorsToday:0,visitsToday:0,visitors7:0,visitors30:0,visits30:0,listenersNow:0,days:[],pages:[]}}}));
 await page.goto('/admin/analytics');await expect(page.getByRole('heading',{name:'Audiência',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Ainda não há dados suficientes.'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`review/visual-audience/admin-${width}.png`,fullPage:true});
 expect(tracked).toBe(0);expect(errors).toEqual([]);
});
test('private audience chart and tables render aggregated local fixture',async({page})=>{
 await page.route('https://**/*',r=>r.abort());await adminMock(page);await loginMock(page);
 await page.route('**/api/admin/analytics',r=>r.fulfill({json:{success:true,analytics:{visitorsToday:2,visitsToday:3,visitors7:2,visitors30:2,visits30:3,listenersNow:1,days:[{date:'2026-10-06',visitors:2,visits:3,audioSessions:1}],pages:[{path:'/listen',views:3,percent:100}]}}}));
 for(const width of [390,1440]){await page.setViewportSize({width,height:1000});await page.goto('/admin/analytics');await expect(page.getByRole('heading',{name:'Páginas mais acessadas'})).toBeVisible();await expect(page.getByRole('img',{name:'Visualizações diárias; valores detalhados na tabela abaixo'})).toBeVisible();await expect(page.getByRole('cell',{name:'/listen',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`review/visual-audience/admin-data-${width}.png`,fullPage:true});}
});
