'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const {parseWriting,validateWriting}=require('../api/editorial-v2-generator');
const {finalStatus}=require('../api/factual-calibration');
const {publicUrl}=require('../api/editorial-pool');
const files=['.local-editorial-v2-paid-preview.json','.local-editorial-v2-preview-report.json'];
const before=files.map(f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'));
const response=JSON.parse(fs.readFileSync(files[0])),prior=JSON.parse(fs.readFileSync(files[1]));
const writing=parseWriting(response);
const results=prior.selected.map(c=>{const n=writing.noticias.find(x=>x.candidateId===c.id),audit={};let error;
try{validateWriting(n,c,audit);}catch(e){error={code:e.code,message:e.message};}
const result={title:c.title,...audit,url:publicUrl(c.url)?'PASS':'FAIL',source:c.sourceName&&c.sourceDomain===new URL(c.url).hostname?'PASS':'FAIL',error};result.final=finalStatus(result);return result;});
for(let i=0;i<files.length;i++)if(before[i]!==crypto.createHash('sha256').update(fs.readFileSync(files[i])).digest('hex'))throw new Error('PRESERVED_CONTENT_MODIFIED');
const report={revalidated:results.length,passed:results.filter(x=>x.final==='PASS').length,failed:results.filter(x=>x.final==='FAIL').length,preservedHashes:before,results,openAiCalls:0,webSearch:0,firestoreWrites:0,newEditions:0};
fs.writeFileSync('.local-factual-contract-v2-revalidation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
