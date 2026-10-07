'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createScheduledGenerator}=require('../api/scheduled-generator');
const {generateRadarEdition}=require('./helpers/legacy-generator');
const fixture=require('./fixtures/collected-news-unconfirmed.json');
for(const [name,completed,pending] of [['3 completed + 1 searching',3,1],['5 ações internas',5,0],['10 ações internas',10,0]]){
 test('pipeline Scheduled completo sem gate web: '+name,async()=>{
 const response=structuredClone(fixture);const message=response.output.find(item=>item.type==='message');const source=response.output.find(item=>item.type==='web_search_call');
 response.output=[...Array.from({length:completed},(_,i)=>({...structuredClone(source),id:'completed-'+i,status:'completed'})),...Array.from({length:pending},(_,i)=>({...structuredClone(source),id:'pending-'+i,status:'searching'})),message];
 let calls=0,published=null,candidates,checkpoint;const warnings=[];const now=()=>new Date('2026-10-03T12:00:00Z');
 const logger={info(name,data){if(name==='RADAR_WEB_COLLECTION_WARNING')warnings.push(data)},error(){}};
 const repository={published:async()=>!!published,claim:async()=>({acquired:true,runId:'mock',attempt:1}),latest:async()=>null,finishAttempt:async()=>!!published};
 const generate=options=>generateRadarEdition({...options,now,logger,apiKey:'mock-secret',fetchImpl:async()=>{calls++;assert.equal(calls,1);return {ok:true,json:async()=>response}},checkpoint:value=>{checkpoint=value},evidenceCheckpoint:value=>{candidates=value},publish:async briefing=>{assert.equal(published,null);published=briefing}});
 const res={set(){},status(code){this.code=code;return this},json(value){this.body=value;return this}};
 await createScheduledGenerator({repository,generate,now,logger})({method:'POST'},res);
 assert.equal(res.code,200);assert.equal(res.body.status,'PUBLISHED');assert.equal(calls,1);assert.equal(published.noticias.length,4);
 assert.equal(checkpoint.resultadoEstruturado.noticias.length,4);assert.ok(candidates.every(item=>['PASS','WARNING'].includes(item.status)));
 assert.equal(res.body.metrics.webToolItems,completed+pending);assert.equal(res.body.metrics.completedSearchActions,completed);
 assert.equal(res.body.metrics.inProgressSearchActions,pending);assert.equal(warnings.length,pending?1:0);
 if(pending)assert.equal(warnings[0].reasonCode,'WEB_COLLECTION_INCOMPLETE_WARNING');
 });
}
