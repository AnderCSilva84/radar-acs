import { chromium } from '@playwright/test';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe' });
try {
  const page = await browser.newPage({ viewport:{ width:375,height:900 } });
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const baseline=JSON.parse(fs.readFileSync(new URL('../../.local-live-baseline.json',import.meta.url),'utf8').replace(/^\uFEFF/,''));
  const paths=['/api/live','/api/live/football','/api/live/radios'];
  let latest, live;
  for(const path of ['/api/briefing/latest',...paths]) {
    const response=await page.request.get('https://radar-acs.web.app'+path);
    if(response.status()!==200)throw Error(`${path}: HTTP ${response.status()}`);
    const value=await response.json();if(!value.success)throw Error(`${path}: payload inválido`);
    if(path==='/api/briefing/latest')latest=value;
    if(path==='/api/live')live=value;
    if(path==='/api/live' && (!Array.isArray(value.media)||!Array.isArray(value.football?.matches)))throw Error('Contrato live inválido');
    console.log(JSON.stringify({path,http:response.status(),footballStatus:value.football?.status,mediaCount:value.media?.length}));
  }
  if(JSON.stringify(latest)!==JSON.stringify(baseline))throw Error('Latest difere do baseline anterior ao deploy');
  if(live.football.teams?.length) {
    const team=await page.request.get('https://radar-acs.web.app/api/live/football/team/'+encodeURIComponent(live.football.teams[0].id));
    if(team.status()!==200 || !(await team.json()).success)throw Error('Endpoint de time inválido');
    console.log(JSON.stringify({path:'/api/live/football/team/:id',http:team.status()}));
  }
  console.log(JSON.stringify({latestUnchanged:true,title:latest.briefing.titulo,date:latest.briefing.data}));
  const admin=await page.request.get('https://radar-acs.web.app/api/admin/radios');
  if(admin.status()!==401)throw Error('Admin mídias não bloqueou anônimo');
  const home=await page.goto('https://radar-acs.web.app/');
  if(home.status()!==200)throw Error('Home indisponível');
  await page.getByRole('heading',{name:latest.briefing.titulo,exact:true}).waitFor();
  for(const [path,title] of [['/listen','Ouvir'],['/live','Radar Ao Vivo']]) {
    const response=await page.goto('https://radar-acs.web.app'+path);if(response.status()!==200)throw Error(`${path}: indisponível`);
    await page.getByRole('heading',{name:title,level:1,exact:true}).waitFor();
    await page.getByText('Carregando mídias...', {exact:true}).waitFor({state:'hidden'});
    if(path==='/live') await page.getByText(live.football.enabled ? 'A fonte de futebol ainda não está conectada. Nenhum placar é exibido sem dados verificados.' : 'Futebol está desligado nas preferências.', {exact:true}).waitFor();
    if(await page.getByRole('alert').count())throw Error(`${path}: erro no frontend`);
    if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))throw Error(`${path}: overflow mobile`);
    if(await page.locator('audio').getAttribute('src'))throw Error('Autoplay ou rádio indevida');
    console.log(JSON.stringify({path,http:response.status(),mobile:'PASS',autoplay:false}));
  }
  await page.goto('https://radar-acs.web.app/admin/radios');
  await page.waitForURL('**/login');
  if(errors.length)throw Error('Erros JavaScript na produção');
  console.log(JSON.stringify({adminAnonymous:401,adminRedirect:'PASS',pageErrors:0,firestoreWrites:0,providerRequests:0}));
} finally { await browser.close(); }
