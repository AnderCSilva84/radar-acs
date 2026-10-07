import { chromium } from '@playwright/test';
import fs from 'node:fs';
const read = path => JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const baseline = read('../../.local-controlled-latest-before.json');
const adsBefore = read('../../.local-controlled-ads-before.json');
const browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={public:[],private:[],errors:[],writes:0};
const check=(ok,message)=>{if(!ok)throw Error(message);};
fs.mkdirSync('review/controlled-release',{recursive:true});
try {
  const page=await browser.newPage({baseURL:'https://radar-acs.web.app'});
  await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():route.abort());
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('request',request=>{if(request.url().startsWith('https://radar-acs.web.app/api/')&&request.method()!=='GET')report.writes++;});
  const latest=await page.request.get('/api/briefing/latest');const latestData=await latest.json();
  check(latest.status()===200&&JSON.stringify(latestData)===JSON.stringify(baseline),'Latest edition changed');
  report.edition={preserved:true,title:latestData.briefing.titulo,date:latestData.briefing.data};
  const ads=await page.request.get('/api/advertising'); const adData=await ads.json();
  check(ads.status()===200&&adsBefore.campaigns.length===adData.campaigns.length,'Campaign count changed');
  for(const previous of adsBefore.campaigns){const current=adData.campaigns.find(ad=>ad.id===previous.id);check(current&&Object.entries(previous).every(([key,value])=>JSON.stringify(current[key])===JSON.stringify(value)),'Campaign changed');}
  report.campaignPreserved=true;
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    for(const path of ['/','/history','/listen','/live','/privacy','/terms']){
      const response=await page.goto(path,{waitUntil:'domcontentloaded'});check(response.status()===200,path+' HTTP');
      if(path==='/'){await page.locator('.news-lead').waitFor();await page.locator('.followed-team-crests').scrollIntoViewIfNeeded();const img=page.getByAltText('Escudo do Botafogo');await img.waitFor();await page.waitForFunction(()=>{const img=document.querySelector('.followed-team-crests img');return img?.complete&&img.naturalWidth>0;});check(await page.locator('.ad-slot-home_top').count()===1,'Campaign missing');}
      if(path==='/listen'){await page.getByRole('heading',{name:'Jovem Pan News',exact:true}).waitFor();await page.getByRole('heading',{name:'ACS Music',exact:true}).waitFor();}
      if(path==='/live')await page.getByRole('heading',{name:'Radar Futebol',exact:true}).waitFor();
      if(path==='/history')await page.getByRole('heading',{level:1}).waitFor();
      if(path==='/privacy')await page.getByRole('heading',{name:'Política de Privacidade — Radar ACS',exact:true}).waitFor();
      if(path==='/terms')await page.getByRole('heading',{name:'Termos de Uso — Radar ACS',exact:true}).waitFor();
      check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path+' overflow');
      const adminChunks=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(name=>/\/assets\/(AdminArea|Advertisers|Preferences|Calendar|MediaAdmin)-/.test(name)));
      check(adminChunks.length===0,'Private code in public route');
      report.public.push({path,width,http:response.status(),adminChunks:0});
      await page.screenshot({path:`review/controlled-release/${path.slice(1)||'home'}-${width}.png`,fullPage:true,style:'.skip-link {visibility:hidden} .public-page .header {position:static!important}'});
    }
  }
  for(const path of ['/admin','/admin/preferences','/admin/calendar','/admin/radios','/admin/advertisers']){
    await page.goto(path);await page.waitForURL('**/login');await page.getByLabel('Senha',{exact:true}).waitFor();check(await page.locator('input[type=file]').count()===0,'Public upload UI exposed');report.private.push({path,anonymous:'DENIED'});
  }
  const protectedApi=await page.request.get('/api/admin/advertisers');check(protectedApi.status()===401,'Anonymous admin API not denied');report.adminApi=protectedApi.status();
  check(report.errors.length===0,'Runtime JS errors');check(report.writes===0,'Unexpected write');
  report.result='PASS';fs.writeFileSync('review/controlled-release/smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
} catch(error){report.result='FAIL';report.failure=error.message;fs.writeFileSync('review/controlled-release/smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));process.exitCode=1;}
finally{await browser.close();}
