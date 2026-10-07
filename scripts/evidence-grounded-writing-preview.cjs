'use strict';
// Read-only production inputs; local preview outputs only. No publisher or cloud write client.
const fs = require('node:fs');
const crypto = require('node:crypto');
const {rankPool,publicUrl} = require('../api/editorial-pool');
const {validateSettings,categories,dailyEditorial} = require('../api/editorial-settings');
const {buildWritingRequest,parseWriting,validateWriting} = require('../api/editorial-v2-generator');
const {finalStatus} = require('../api/factual-calibration');
const {editorialDate,requestOpenAI,metricsFor} = require('../api/generator');
const prefix = '.local-evidence-grounded-v1';
const wordCount = text => String(text || '').trim().split(/\s+/).filter(Boolean).length;
const escape = text => String(text || '').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function decode(value) {
 if(value.mapValue)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([key,item])=>[key,decode(item)]));
 if(value.arrayValue)return (value.arrayValue.values||[]).map(decode);
 if('integerValue' in value)return Number(value.integerValue);
 for(const key of ['stringValue','booleanValue','doubleValue','timestampValue'])if(key in value)return value[key];
 return null;
}
async function prepare(input){
 if(input.project!=='radar-acs'||String(input.projectNumber)!=='596095541153')throw Error('PROJECT_MISMATCH');
 const date=editorialDate(),saved=JSON.parse(fs.readFileSync('.local-editorial-v2-real-collection.json','utf8'));
 const profileResponse=await fetch('https://firestore.googleapis.com/v1/projects/radar-acs/databases/(default)/documents/settings/editorial',{headers:{Authorization:'Bearer '+input.accessToken}});
 input.accessToken=null;
 if(!profileResponse.ok)throw Error('PROFILE_HTTP_'+profileResponse.status);
 const profile=validateSettings(decode({mapValue:{fields:(await profileResponse.json()).fields}}));
 const latestResponse=await fetch('https://radar-acs.web.app/api/briefing/latest');
 if(!latestResponse.ok)throw Error('LATEST_HTTP_'+latestResponse.status);
 const latest=await latestResponse.json(),edition=latest.briefing||latest;
 const recent=(edition.noticias||[]).map(item=>({titulo:item.titulo,url:item.sourceUrl||item.url}));
 const ranked=rankPool(saved.collected.candidates,profile,recent,date);
 if(ranked.selected.length<5||ranked.selected.length>7)throw Error('POOL_REFRESH_REQUIRED_NO_OPENAI');
 return {date,profile,ranked,latestHash:crypto.createHash('sha256').update(JSON.stringify(latest)).digest('hex'),collectionDate:saved.date};
}
async function run(input){
 const prepared=await prepare(input);
 const overview={date:prepared.date,collectionDate:prepared.collectionDate,pool:prepared.ranked.pool.length,selected:prepared.ranked.selected.length,profile:prepared.profile,selectedCandidates:prepared.ranked.selected,latestHash:prepared.latestHash};
 if(input.mode==='preflight'){fs.writeFileSync(prefix+'-preflight.json',JSON.stringify(overview,null,2));console.log(JSON.stringify({date:overview.date,collectionDate:overview.collectionDate,pool:overview.pool,selected:overview.selected}));return;}
 // Atomic durable local guard. Never remove it or retry automatically after an error.
 fs.writeFileSync(prefix+'-attempt.json',JSON.stringify({date:prepared.date,startedAt:new Date().toISOString()}),{flag:'wx'});
 let calls=0;
 const start=Date.now();
 const response=await requestOpenAI(buildWritingRequest(prepared.ranked.selected,prepared.date,dailyEditorial(prepared.profile,prepared.date).context,[input.apiKey]),input.apiKey,async(url,options)=>{if(++calls!==1)throw Error('SECOND_CALL_FORBIDDEN');return fetch(url,options);});
 input.apiKey=null;
 fs.writeFileSync(prefix+'-paid.json',JSON.stringify(response,null,2),{flag:'wx'});
 const report={...overview,calls,metrics:metricsFor(response,Date.now()-start),results:[],accepted:[],validation:null,firestoreWrites:0,storageWrites:0,newEditions:0,deploy:false};
 const writing=parseWriting(response);
 const setValid=Array.isArray(writing.noticias)&&writing.noticias.length===prepared.ranked.selected.length&&new Set(writing.noticias.map(item=>item.candidateId)).size===prepared.ranked.selected.length&&writing.noticias.every(item=>prepared.ranked.selected.some(candidate=>candidate.id===item.candidateId));
 for(const candidate of prepared.ranked.selected){
  const audit={};let error,prose;
  try{if(!setValid)throw Error('WRITING_SET_MISMATCH');prose=validateWriting(writing.noticias.find(item=>item.candidateId===candidate.id),candidate,audit);}catch(caught){error={code:caught.code||null,message:caught.message};}
  const result={title:candidate.title,...audit,url:publicUrl(candidate.url)?'PASS':'FAIL',source:candidate.sourceName&&candidate.sourceDomain===new URL(candidate.url).hostname?'PASS':'FAIL',error};
  result.final=finalStatus(result);report.results.push(result);
  if(result.final==='PASS')report.accepted.push({...candidate,...prose});
 }
 report.passed=report.accepted.length;report.failed=report.selected-report.passed;
 report.status=report.passed>=5?'SUCCESS':report.passed>=3?'REDUCED':'FAIL';
 if(report.passed>=5){
  const news=report.accepted.map((item,index)=>({id:item.id,ordem:index+1,titulo:item.title,resumo:item.editorialSummary.split(/\n\s*\n/)[0],editorialSummary:item.editorialSummary,speechSummary:item.speechSummary,roteiroAlexa:item.speechSummary,contexto:item.evidence[0].text,fonte:item.sourceName,url:item.url,categoria:categories[item.category],publishedAt:item.publishedAt}));
  try{
   require('../api/news-duplicates').validateDistinctNews(news);
   const rendered=require('../api/audio-rendering').renderEditionAudio({data:prepared.date,titulo:'EVIDENCE-GROUNDED V1 — PREVIEW NÃO PUBLICADO',resumo:news.map(item=>item.titulo).join('. '),noticias:news,oportunidadeDoDia:'Nenhuma oportunidade específica comprovada nesta edição.',audioUrl:null,publicado:true,...dailyEditorial(prepared.profile,prepared.date).context});
   if(rendered.warnings.length)throw Error('AUDIO_WARNINGS');
   require('../api/audio-script').validateAudioScript(rendered.edition);require('../api/validation').validateBriefing(rendered.edition);
   report.validation='PASS';report.pwaWords=report.accepted.reduce((sum,item)=>sum+wordCount(item.editorialSummary),0);report.pwaAverage=report.pwaWords/report.passed;
   report.alexaWords=wordCount(rendered.edition.roteiroAlexa);report.alexaAverage=report.alexaWords/report.passed;report.alexaSeconds=require('../api/narration-duration').estimatedDurationSeconds(rendered.edition.roteiroAlexa);
   fs.writeFileSync(prefix+'-alexa.txt',rendered.edition.roteiroAlexa);
   fs.writeFileSync(prefix+'-pwa.html','<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Preview local não publicado</title><style>body{font:16px system-ui;max-width:900px;margin:auto;padding:24px}article{margin:24px 0}p{white-space:pre-wrap}</style><h1>Preview não publicado</h1>'+report.accepted.map(item=>'<article><h2>'+escape(item.title)+'</h2><p>'+escape(item.sourceName)+'</p><a href="'+escape(item.url)+'">Fonte</a><p>'+escape(item.editorialSummary)+'</p></article>').join('')+'</html>');
  }catch(error){report.validation={code:error.code||null,message:error.message};report.status='FAIL';}
 }
 fs.writeFileSync(prefix+'-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({status:report.status,calls,selected:report.selected,passed:report.passed,failed:report.failed,metrics:report.metrics,validation:report.validation},null,2));
}
let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{const input=JSON.parse(text);text='';run(input).catch(error=>{console.error(JSON.stringify({code:error.code||null,message:require('../api/diagnostics').redact(error.message,[input.apiKey,input.accessToken].filter(Boolean))}));process.exitCode=1;});});
