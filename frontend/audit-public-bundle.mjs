import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { adminMock, loginMock } from './browser-tests/admin-mock.js';
const fixture=JSON.parse(fs.readFileSync('browser-tests/refinement-fixture.json','utf8'));
const chunks=JSON.parse(fs.readFileSync('review/product-round/bundle-modules.json'));
const initial=new Set();function walk(file){const chunk=chunks.find(value=>value.fileName===file);if(!chunk||initial.has(file))return;initial.add(file);chunk.imports.forEach(walk);}walk(chunks.find(value=>value.isEntry).fileName);
const modules=chunks.filter(value=>initial.has(value.fileName)).flatMap(value=>value.modules);
if(modules.some(value=>/AdminArea|Advertisers|clubCatalog|adminAuth|firebase\/auth|Calendar|MediaAdmin/.test(value.id)))throw Error('Admin in public graph');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4181','--strictPort'],{windowsHide:true,stdio:'pipe'});
let serverError='';server.stderr.on('data',data=>serverError+=data);let browser;
try {
 for(let i=0;i<50;i++){if(server.exitCode!==null)throw Error(serverError);try{if((await fetch('http://127.0.0.1:4181')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));if(i===49)throw Error('Local preview unavailable');}
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const report=[];
 for(const path of ['/','/listen','/live','/history']){
  const page=await browser.newPage({baseURL:'http://127.0.0.1:4181'});const requested=[];const errors=[];
  page.on('request',request=>{if(request.method()!=='GET')throw Error('Unexpected write');if(request.url().endsWith('.js'))requested.push(new URL(request.url()).pathname);});page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/**',route=>route.fulfill({json:route.request().url().includes('/history')?{success:true,editions:[fixture.latest.briefing],nextCursor:null}:route.request().url().includes('/latest')?fixture.latest:route.request().url().includes('/live')?fixture.live:fixture.ads}));
  const response=await page.goto(path);await page.locator('h1,h2').first().waitFor();await page.waitForTimeout(250);
  if(requested.some(url=>/AdminArea|Advertisers|Preferences|Calendar|MediaAdmin|Login/.test(url)))throw Error('Admin downloaded on '+path);
  if(errors.length)throw Error(errors.join(';'));report.push({path,http:response.status(),adminLoaded:false,js:requested});await page.close();
 }
 const page=await browser.newPage({baseURL:'http://127.0.0.1:4181'});await adminMock(page);await loginMock(page);await page.goto('/admin/advertisers');await page.getByRole('heading',{name:'Central Comercial',exact:true}).waitFor();report.push({path:'/admin/advertisers',authorizedMock:true,lazyLoaded:true});await page.close();
 const result={initialChunks:[...initial],adminModulesInInitial:0,routes:report,realWrites:0,realUploads:0};fs.writeFileSync('review/product-round/public-bundle-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser?.close();server.kill();}
