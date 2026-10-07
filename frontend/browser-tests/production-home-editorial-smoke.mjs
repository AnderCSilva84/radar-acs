import { chromium } from '@playwright/test';
import fs from 'node:fs';
const read=path=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8').replace(/^\uFEFF/,''));
const baseline=read('../../.local-editorial-latest-before.json'),adsBefore=read('../../.local-editorial-ads-before.json');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const report={widths:[],errors:[],writes:0};
const check=(ok,message)=>{if(!ok)throw Error(message);};
fs.mkdirSync('review/home-editorial-production',{recursive:true});
try {
 const page=await browser.newPage({baseURL:'https://radar-acs.web.app'});
 await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():route.abort());
 page.on('pageerror',error=>report.errors.push(error.message));
 page.on('request',request=>{if(request.url().startsWith('https://radar-acs.web.app/api/')&&request.method()!=='GET')report.writes++;});
 const latest=await page.request.get('/api/briefing/latest');check(latest.status()===200,'Latest HTTP');const data=await latest.json();check(JSON.stringify(data)===JSON.stringify(baseline),'Edition changed');
 report.edition={title:data.briefing.titulo,date:data.briefing.data,preserved:true};
 const ads=await page.request.get('/api/advertising');check(ads.status()===200&&JSON.stringify(await ads.json())===JSON.stringify(adsBefore),'Campaign changed');report.campaignPreserved=true;
 for(const width of [375,390,430,768,1280,1440]){
  await page.setViewportSize({width,height:1000});const response=await page.goto('/');check(response.status()===200,'Home HTTP');
  await page.locator('.home-editorial-layout').waitFor();
  const script=await page.locator('script[type=module]').getAttribute('src');check(fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8').includes(script),'Published build differs');
  check(await page.locator('.home-editorial-layout .news-item').count()===data.briefing.noticias.length,'News lost');
  check(await page.locator('.home-editorial-layout .edition-summary,.home-editorial-layout .editorial-directory').count()===0,'Redundant sidebar');
  const main=await page.locator('.home-editorial-content').boundingBox(),radar=await page.locator('.your-radar').boundingBox();
  check(width>=1100?radar.x>main.x+main.width:radar.y>=main.y+main.height,'Editorial order');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Overflow');
  await page.locator('.your-radar').scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const img=document.querySelector('.your-radar .team-crest img');return img?.complete&&img.naturalWidth>0;});
  check(await page.locator('.ad-slot-home_top').count()===1,'Campaign missing');report.widths.push({width,http:response.status(),layout:'PASS',crest:'PASS'});
  if([390,768,1440].includes(width))await page.locator('.home-editorial-section').screenshot({path:`review/home-editorial-production/home-${width}.png`,style:'.skip-link {visibility:hidden} .public-page .header {position:static!important}'});
 }
 for(const path of ['/listen','/live']){const response=await page.request.get(path);check(response.status()===200,path+' HTTP');}
 check(report.errors.length===0,'JavaScript errors');check(report.writes===0,'Unexpected write');report.result='PASS';
}catch(error){report.result='FAIL';report.failure=error.message;process.exitCode=1;}
finally{fs.writeFileSync('review/home-editorial-production/smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));await browser.close();}
