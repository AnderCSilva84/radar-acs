'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {createScheduledRepository,leaseMs}=require('../api/scheduled-repository');
const {createScheduledGenerator,retryable}=require('../api/scheduled-generator');
const {editionTitle}=require('../api/edition-context');
const date='2026-10-05';const instant=new Date('2026-10-05T11:00:00Z');
function fixture(initial){
 let state=initial&&structuredClone(initial),edition=false,queue=Promise.resolve();
 const db={collection(name){return {doc(id){return {name,id, get:async()=>({exists:edition}),update:async patch=>Object.assign(state,patch)}}}},
 runTransaction(operation){const result=queue.then(()=>operation({get:async ref=>ref.name==='briefings'?{exists:edition}:{exists:!!state,data:()=>state},set(ref,patch){state={...state,...patch}},update(ref,patch){Object.assign(state,patch)}}));queue=result.catch(()=>{});return result;}};
 const repo=createScheduledRepository(db,()=>instant);repo.latest=async()=>({data:'2026-10-03',titulo:'Radar ACS — Edição #002',noticias:[]});
 return {repo,get state(){return state},publish(){edition=true}};
}
const logger={info(){},error(){}};
function response(){return {set(){},status(code){this.code=code;return this},json(body){this.body=body;return this}};}
test('RUNNING atomically excludes concurrent executions and caps stale leases',async()=>{
 const f=fixture();const claims=await Promise.all([f.repo.claim(date,instant),f.repo.claim(date,instant)]);
 assert.equal(claims.filter(x=>x.acquired).length,1);assert.equal(f.state.status,'RUNNING');
 const next=await f.repo.claim(date,new Date(+instant+leaseMs+1));assert.equal(next.acquired,false);assert.equal(f.state.status,'FAILED');
 assert.equal((await f.repo.claim(date,new Date(+instant+2*leaseMs+2))).acquired,false);
});
test('legacy FAILED migrates once, preserving incident flags and prior diagnostic',async()=>{
 const f=fixture({status:'FAILED',ultimoResultado:{erro:'old incident'},exceptionalRecoveryConsumed:true,recoveryAttempted:true});
 const a=await f.repo.claim(date,instant);assert.equal(a.attempt,1);
 assert.equal(f.state.legacyIncident.ultimoResultado.erro,'old incident');assert.equal(f.state.exceptionalRecoveryConsumed,true);
 await f.repo.finishAttempt(date,a.runId,{erro:{code:'NO_VALID_NEWS'}});
 const b=await f.repo.claim(date,instant);assert.equal(b.acquired,false);
 assert.equal((await f.repo.claim(date,instant)).status,'SKIPPED_ATTEMPTS_EXHAUSTED');assert.equal(Object.keys(f.state.attemptResults).length,1);
});
test('PUBLISHED and existing edition never reopen a daily attempt',async()=>{
 for(const prior of [{status:'PUBLISHED'},undefined]){const f=fixture(prior);if(!prior)f.publish();assert.equal((await f.repo.claim(date,instant)).status,'SKIPPED_ALREADY_PUBLISHED');}
});
test('diagnostic write does not release RUNNING lease; stale owner cannot complete it',async()=>{
 const f=fixture();const a=await f.repo.claim(date,instant);await f.repo.recordResult(date,{publicado:false});assert.equal(f.state.status,'RUNNING');
 await assert.rejects(f.repo.finishAttempt(date,'other',{erro:{}}),{code:'RUN_LEASE_LOST'});
 await f.repo.finishAttempt(date,a.runId,{erro:{}});assert.equal(f.state.status,'FAILED');
});
test('scheduled primary failure never retries or spends again on a repeated invocation',async()=>{
 const f=fixture();let calls=0;
 const generate=async()=>{calls++;if(calls===1)throw Object.assign(new Error('Technical failure'),{stage:'OPENAI_REQUEST'});f.publish();return {noticias:[{}],metrics:{chamadasOpenAI:1}}};
 const h=createScheduledGenerator({repository:f.repo,generate,now:()=>instant,logger});const r=response();await h({method:'POST'},r);
 assert.equal(r.body.status,'FAILED');assert.equal(calls,1);assert.equal(f.state.status,'FAILED');assert.equal(f.state.attempts,1);
 const again=response();await h({method:'POST'},again);assert.equal(calls,1);assert.equal(again.body.status,'SKIPPED_ATTEMPTS_EXHAUSTED');
});
test('zero usable candidates fails once without an automatic retry',async()=>{
 const f=fixture();let calls=0;const h=createScheduledGenerator({repository:f.repo,generate:async()=>{calls++;throw Object.assign(new Error('No content'),{code:'NO_VALID_NEWS'})},now:()=>instant,logger});
 const r=response();await h({method:'POST'},r);assert.equal(r.code,503);assert.equal(calls,1);assert.equal(f.state.status,'FAILED');
 await h({method:'POST'},response());assert.equal(calls,1);
});
test('a single useful news item publishes without retry',async()=>{
 const f=fixture();let calls=0;const r=response();await createScheduledGenerator({repository:f.repo,generate:async()=>{calls++;f.publish();return {noticias:[{}],metrics:{}}},now:()=>instant,logger})({method:'POST'},r);
 assert.equal(calls,1);assert.equal(r.body.noticiasPublicadas,1);
});
test('publication despite diagnostic failure does not spend again',async()=>{
 for(const mode of ['during-publication','before-retry']){
 const f=fixture();let calls=0;const finish=f.repo.finishAttempt;f.repo.finishAttempt=async(...args)=>{const published=await finish(...args);if(mode==='before-retry')f.publish();return published};
 const r=response();await createScheduledGenerator({repository:f.repo,generate:async()=>{calls++;if(mode==='during-publication')f.publish();throw Object.assign(new Error('Diagnostic failed'),{code:'NO_VALID_NEWS'})},now:()=>instant,logger})({method:'POST'},r);
 assert.equal(calls,1);assert.equal(r.body.status,mode==='during-publication'?'PUBLISHED':'FAILED');
 }
});
test('auth and publication errors cannot trigger paid retry',()=>{
 assert.equal(retryable({stage:'OPENAI_REQUEST',status:401}),false);assert.equal(retryable({stage:'PUBLICATION'}),false);assert.equal(retryable({stage:'BRIEFING_VALIDATION'}),false);
});
test('edition sequence follows latest, regardless of yesterday being absent',()=>{
 assert.equal(editionTitle(date,'Radar ACS — Edição #002'),'Radar ACS — Edição #003');assert.equal(editionTitle(date,'Radar ACS — Edição #003'),'Radar ACS — Edição #004');assert.equal(editionTitle(date),'Radar ACS — Edição #001');
});

test('hotfix migrates exhausted policy 2 FAILED once and preserves all incident results',async()=>{
 const f=fixture({policyVersion:2,status:'FAILED',attempts:2,legacyIncident:{status:'FAILED',ultimoResultado:{erro:'original'}},attemptResults:{1:{erro:'first'},2:{erro:'second'}},exceptionalRecoveryConsumed:true});
 const c=await f.repo.claim(date,instant);assert.equal(c.attempt,1);assert.equal(f.state.policyVersion,3);assert.equal(f.state.previousPolicyAttempts,2);
 await f.repo.finishAttempt(date,c.runId,{erro:{code:'LOCAL_MOCK'}});
 assert.equal(f.state.legacyIncident.ultimoResultado.erro,'original');assert.equal(f.state.attemptResults[1].erro,'first');assert.equal(f.state.attemptResults[2].erro,'second');assert.ok(f.state.attemptResults['v3-1']);
 assert.equal((await f.repo.claim(date,instant)).acquired,false);
});
