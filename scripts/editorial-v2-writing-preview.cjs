'use strict';
const fs=require('node:fs');
const {rankPool}=require('../api/editorial-pool');
const {buildWritingRequest,parseWriting,validateWriting}=require('../api/editorial-v2-generator');
const {requestOpenAI,metricsFor}=require('../api/generator');
const {dailyEditorial,categories}=require('../api/editorial-settings');
const {renderEditionAudio}=require('../api/audio-rendering');
const {validateBriefing}=require('../api/validation');
const {validateAudioScript}=require('../api/audio-script');
const {validateDistinctNews}=require('../api/news-duplicates');
const words=s=>String(s||'').trim().split(/\s+/).filter(Boolean).length;
const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function run(input){
 const preserved=JSON.parse(fs.readFileSync('.local-editorial-v2-real-collection.json','utf8'));
 if(preserved.collected.candidates.length!==71||preserved.ranked.pool.length!==11||preserved.collected.candidates.filter(x=>x.verified).length!==35) throw new Error('PRESERVED_POOL_MISMATCH');
 const ranked=rankPool(preserved.collected.candidates,preserved.profile,[],preserved.date);
 if(JSON.stringify(ranked.selected)!==JSON.stringify(preserved.ranked.selected)||ranked.selected.length<5) throw new Error('SELECTION_MISMATCH');
 if(fs.existsSync('.local-editorial-v2-paid-preview.json')) throw new Error('PAID_PREVIEW_ALREADY_EXISTS_NO_SECOND_CALL');
 const start=Date.now(), context=dailyEditorial(preserved.profile,preserved.date).context;
 let calls=0;
 const response=await requestOpenAI(buildWritingRequest(ranked.selected,preserved.date,context,[input.apiKey]),input.apiKey,async(url,options)=>{if(++calls>1)throw new Error('SECOND_CALL_FORBIDDEN');return fetch(url,options);});
 input.apiKey=null;
 // Preserve paid output locally before validation; no cloud persistence or credentials.
 fs.writeFileSync('.local-editorial-v2-paid-preview.json',JSON.stringify(response,null,2));
 const writing=parseWriting(response), accepted=[], rejected=[];
 for(const candidate of ranked.selected){
  const matches=(writing.noticias||[]).filter(x=>x.candidateId===candidate.id);
  try{if(matches.length!==1)throw new Error('CANDIDATE_ID_MISMATCH');const prose=validateWriting(matches[0],candidate);accepted.push({...candidate,...prose});}
  catch(e){rejected.push({title:candidate.title,code:e.code||e.message,message:e.message});}
 }
 const report={calls,metrics:metricsFor(response,Date.now()-start),pool:11,selected:ranked.selected,accepted,rejected,validation:null};
 let edition,playback;
 if(accepted.length){
  const news=accepted.map((n,i)=>({id:n.id,ordem:i+1,titulo:n.title,resumo:n.editorialSummary.split(/\n\s*\n/)[0],editorialSummary:n.editorialSummary,speechSummary:n.speechSummary,roteiroAlexa:n.speechSummary,contexto:n.evidence[0].text,fonte:n.sourceName,url:n.url,categoria:categories[n.category],dataPublicacao:n.publishedAt,publishedAt:n.publishedAt}));
  const rendered=renderEditionAudio({data:preserved.date,titulo:'EDITORIAL V2 — PREVIEW NÃO PUBLICADO',resumo:news.map(n=>n.titulo).join('. '),noticias:news,oportunidadeDoDia:'Nenhuma oportunidade específica comprovada nesta edição.',audioUrl:null,publicado:true,...context});
  edition=rendered.edition;
  try{validateDistinctNews(news);validateAudioScript(edition);validateBriefing(edition);if(rendered.warnings.length)throw new Error('AUDIO_WARNINGS');report.validation='PASS';}catch(e){report.validation={code:e.code||e.message,message:e.message};}
  playback=require('../lambda/daily-greeting').dailyPlayback(edition,'',new Date());
  fs.writeFileSync('.local-editorial-v2-alexa-preview.ssml',playback.ssml);
  report.alexaWords=words(edition.roteiroAlexa);report.alexaSeconds=require('../api/narration-duration').estimatedDurationSeconds(edition.roteiroAlexa);
  report.pwaWords=accepted.reduce((n,x)=>n+words(x.editorialSummary),0);
 }
 report.coverage=Object.keys(categories).map(k=>({category:categories[k],priority:preserved.profile.editorial[k],valid:ranked.pool.filter(x=>x.category===k).length,selected:ranked.selected.filter(x=>x.category===k).length,accepted:accepted.filter(x=>x.category===k).length}));
 report.status=accepted.length>=5?'NORMAL':accepted.length>=3?'REDUCED':accepted.length?'EDITORIAL_SHORTAGE':'FAIL';
 fs.writeFileSync('.local-editorial-v2-preview-report.json',JSON.stringify(report,null,2));
 const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Radar ACS — preview não publicado</title><style>body{background:#091217;color:#edf7f7;font:16px system-ui;max-width:900px;margin:auto;padding:28px}article{border:1px solid #235052;padding:24px;margin:24px 0;border-radius:16px}a{color:#69dfd4}p{white-space:pre-wrap;line-height:1.7}</style><h1>RADAR ACS</h1><h2>EDITORIAL V2 — PREVIEW NÃO PUBLICADO</h2>'+accepted.map((n,i)=>`<article><small>${i+1} · ${escape(categories[n.category])} · ${n.priority} · score ${n.score}</small><h2>${escape(n.title)}</h2><p>${escape(n.sourceName)} · ${escape(n.publishedAt)} · IMAGEM: ${n.imageUrl?'SIM':'NÃO'}</p><a href="${escape(n.url)}">${escape(n.url)}</a><h3>Editorial summary</h3><p>${escape(n.editorialSummary)}</p><h3>Speech summary</h3><p>${escape(n.speechSummary)}</p></article>`).join('')+`<h2>Validação</h2><pre>${escape(JSON.stringify(report.validation))}</pre><h2>Rejeitados</h2><pre>${escape(JSON.stringify(rejected,null,2))}</pre></html>`;
 fs.writeFileSync('.local-editorial-v2-pwa-preview.html',html);
 console.log(JSON.stringify({status:report.status,calls,metrics:report.metrics,accepted:accepted.length,rejected,validation:report.validation,alexaWords:report.alexaWords,alexaSeconds:report.alexaSeconds,pwaWords:report.pwaWords,coverage:report.coverage},null,2));
}
let input='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>input+=x);process.stdin.on('end',()=>{const config=JSON.parse(input);input='';run(config).catch(e=>{console.error(JSON.stringify({code:e.code||null,message:e.message}));process.exitCode=1;});});
