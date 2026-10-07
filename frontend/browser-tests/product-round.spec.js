import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { adminMock, loginMock } from './admin-mock.js';
const fixture = JSON.parse(fs.readFileSync(new URL('./refinement-fixture.json', import.meta.url), 'utf8'));
const output = 'review/product-round';
fs.mkdirSync(output, { recursive: true });
async function cached(page, campaigns = fixture.ads.campaigns) {
  await page.route('**/api/briefing/latest', route => route.fulfill({ json: fixture.latest }));
  await page.route('**/api/radar/latest', route => route.fulfill({ json: fixture.latest }));
  await page.route('**/api/live', route => route.fulfill({ json: fixture.live }));
  await page.route('**/api/advertising', route => route.fulfill({ json: {success:true,campaigns} }));
  await page.route('https://**/*', route => route.abort());
  await page.route('https://acstech.dev.br/**', route => route.fulfill({ contentType:'image/png',body:fs.readFileSync(new URL('../public/logo-acs.png',import.meta.url)) }));
  await page.route('https://open.spotify.com/embed/**', route => route.fulfill({ contentType:'text/html',body:'<title>Prévia técnica local do iframe</title>' }));
}
for (const [label,width] of [['desktop',1440],['mobile',390]]) test(`produto local: Home/Ouvir/Ao vivo sem alteração de conteúdo em ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await cached(page);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  for(const path of ['/','/listen','/live']) {
    await page.goto(path);await expect(page.locator('.header')).toBeVisible();
    if(path==='/') {await expect(page.locator('.news-item')).toHaveCount(fixture.latest.briefing.noticias.length);await page.locator('.home-listen').scrollIntoViewIfNeeded();}
    if(path==='/listen') {await expect(page.getByRole('heading',{name:'Jovem Pan News',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'ACS Music',exact:true})).toBeVisible();}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.evaluate(async()=>{document.documentElement.style.scrollBehavior='auto';document.activeElement?.blur();await document.fonts.ready;window.scrollTo({top:0,left:0,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    await page.waitForFunction(()=>scrollY===0);
    await page.screenshot({path:`${output}/${path==='/'?'home-news-images':path==='/listen'?'listen':'live'}-${label}.png`,fullPage:true,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  }
  expect(errors).toEqual([]);
});
test('busca de clubes por teclado, múltiplos selecionados e screenshot sem IDs',async({page})=>{
  await cached(page);const mock=await adminMock(page);await loginMock(page);await page.goto('/admin/preferences');
  const input=page.getByRole('combobox',{name:'Pesquise um time'});
  await input.fill('BOTA');await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(3);
  await expect(page.getByRole('listbox').getByRole('option').filter({hasText:'Botafogo-PB'})).toContainText('Série C');
  await input.fill('paysa');await input.press('Enter');await expect(page.getByRole('button',{name:'Remover Paysandu'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Remover Botafogo',exact:true})).toBeVisible();
  await expect(page.getByLabel('ID do time',{exact:true})).toHaveCount(0);
  await page.setViewportSize({width:1440,height:1000});await page.locator('.team-editor').screenshot({path:`${output}/admin-teams-desktop.png`,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.setViewportSize({width:390,height:844});await page.locator('.team-editor').screenshot({path:`${output}/admin-teams-mobile.png`,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  expect(mock.settings().followedTeams).toHaveLength(1); // No save, even in the mock.
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('Central Comercial, fluxo guiado, criativo e prévia somente local',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await cached(page);await adminMock(page);
  await page.route('**/api/admin/advertisers',route=>route.fulfill({json:{success:true,settings:{campaigns:fixture.ads.campaigns.map(item=>({...item,active:true})),advertisers:[]}}}));
  let writes=0;page.on('request',request=>{if(['PUT','POST','DELETE'].includes(request.method()) && !request.url().includes('identitytoolkit')) writes++;});
  await loginMock(page);await page.goto('/admin/advertisers');await expect(page.getByRole('heading',{name:'Central Comercial',exact:true})).toBeVisible();
  await page.screenshot({path:`${output}/commercial-dashboard.png`,fullPage:true,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.getByRole('button',{name:'Nova campanha',exact:true}).click();await page.getByLabel('Anunciante',{exact:true}).fill('ACS Tecnologia');await page.getByLabel('Empresa',{exact:true}).fill('ACS Tecnologia');
  await page.screenshot({path:`${output}/campaign-create.png`,fullPage:true,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.getByRole('button',{name:'2. Campanha',exact:true}).click();await page.getByLabel('Campanha',{exact:true}).fill('Conheça a ACS Tecnologia');await page.getByLabel('URL de destino',{exact:true}).fill('https://acstech.dev.br/');
  await page.getByRole('button',{name:'4. Criativo',exact:true}).click();await page.getByLabel('Texto alternativo',{exact:true}).fill('Logotipo ACS Tecnologia');
  await page.getByLabel('Selecionar imagem').setInputFiles(new URL('../public/logo-acs.png',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
  await expect(page.locator('.ad-preview img')).toHaveAttribute('src',/^blob:/);
  await page.locator('.creative-editor').screenshot({path:`${output}/campaign-preview-desktop.png`,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.getByRole('button',{name:'Tablet',exact:true}).click();await expect(page.locator('.creative-preview-viewport')).toHaveAttribute('data-width','768');
  await page.getByRole('button',{name:'Mobile',exact:true}).click();await page.locator('.creative-editor').screenshot({path:`${output}/campaign-preview-mobile.png`,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(writes).toBe(0);
});
test('carrossel: 2 campanhas técnicas locais, swipe, teclado, reduced-motion, preview sem tracking',async({page})=>{
  const campaigns=[...fixture.ads.campaigns, {...fixture.ads.campaigns[0],id:'technical-preview-only',campaignName:'PRÉVIA TÉCNICA LOCAL — NÃO PUBLICADA'}];
  await page.setViewportSize({width:1440,height:1000});await cached(page,campaigns);await page.goto('/');
  await expect(page.getByRole('button',{name:'Próximo anúncio'})).toBeVisible();
  await page.getByRole('button',{name:'Próximo anúncio'}).click();await expect(page.getByText('PRÉVIA TÉCNICA LOCAL — NÃO PUBLICADA')).toBeVisible();
  await page.getByLabel('Publicidade — campanhas').focus();await page.keyboard.press('ArrowLeft');await expect(page.getByRole('button',{name:/Mostrar anúncio 1/})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:`${output}/home-carousel-preview.png`,fullPage:true,style:'.skip-link { visibility:hidden; } .public-page .header { position:static!important; }'});
  await page.setViewportSize({width:390,height:844});const root=page.getByLabel('Publicidade — campanhas');await root.scrollIntoViewIfNeeded();const box=await root.boundingBox();
  await page.mouse.move(box.x+box.width-15,box.y+35);await page.mouse.down();await page.mouse.move(box.x+15,box.y+35);await page.mouse.up();
  await expect(page.getByRole('button',{name:/Mostrar anúncio 2/})).toHaveAttribute('aria-pressed','true');
  const before=await root.boundingBox();await page.getByRole('button',{name:'Anúncio anterior'}).click();const after=await root.boundingBox();expect(Math.abs(before.height-after.height)).toBeLessThan(2);
  await page.emulateMedia({reducedMotion:'reduce'});expect(await page.locator('.ad-carousel .ad-creative-body').evaluate(node=>getComputedStyle(node).animationName)).toBe('none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
