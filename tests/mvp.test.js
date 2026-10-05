'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const sample=require('../examples/briefing-teste.json');
const {validateBriefing}=require('../api/validation');const {createApi,authorized}=require('../api/handler');
const {createBriefingClient,requestJson}=require('../lambda/briefing-client');const {getBriefingPlayback}=require('../lambda/playback');
const clone=()=>JSON.parse(JSON.stringify(sample));
test('Contrato válido, cinco notícias, datas reais e limite Alexa',()=>{
 assert.equal(validateBriefing(clone()).id,'2026-10-02');
 for(const patch of [{data:'2026-02-30'},{publicado:'true'},{noticias:[]},{roteiroAlexa:'a'.repeat(8000)},{audioUrl:'http://example.com/a.mp3'},{roteiroAlexa:'a\u0001'}])assert.throws(()=>validateBriefing({...clone(),...patch}));
});
test('SSML escapa conteúdo externo e mantém roteiro completo',()=>{
 const result=getBriefingPlayback({roteiroAlexa:'A & B <speak> teste\n\nSegundo assunto'});
 assert.match(result.ssml,/A &amp; B &lt;speak&gt;/);assert.match(result.ssml,/Segundo assunto/);assert.ok(result.ssml.length<=8000);
 assert.equal(require('../api/playback').getBriefingPlayback({roteiroAlexa:'A & B'}, '', {introduction:'Abertura neutra'}).ssml, getBriefingPlayback({roteiroAlexa:'A & B'}, '', {introduction:'Abertura neutra'}).ssml);
});
function fsRead(p){return require('fs').readFileSync(require('path').join(__dirname,p),'utf8');}
test('Cache em falha, vazio limpa cache e payload inválido não é narrado',async()=>{
 let mode='ok';const client=createBriefingClient(async()=>{if(mode==='error')throw new Error('rede');if(mode==='empty')return {success:false,message:'Nenhum briefing disponível.'};if(mode==='invalid')return {};return {success:true,briefing:sample};});
 assert.equal((await client()).briefing.data,sample.data);mode='error';assert.match((await client()).prefix,/último briefing/);mode='empty';assert.equal((await client()).briefing,null);mode='invalid';await assert.rejects(client());
});
test('Cliente rejeita endpoint sem HTTPS',async()=>{await assert.rejects(requestJson('http://localhost'));});
const token='x'.repeat(40);
async function call(repo,{method='GET',path='/api/briefing/latest',body,auth,contentType='application/json'}={}){
 const res={headers:{},code:200,set(k,v){this.headers[k]=v;return this;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await createApi(repo,()=>token)({method,path,body,get:()=>auth,is:t=>t===contentType},res);return res;
}
test('API lê apenas campos públicos, lida com vazio e indisponibilidade',async()=>{
 const result=await call({latest:async()=>sample});assert.deepEqual(Object.keys(result.body.briefing),['data','titulo','roteiroAlexa','audioUrl','noticias']);assert.equal(result.headers['Cache-Control'],'no-store');
 assert.equal((await call({latest:async()=>null})).body.success,false);
 assert.equal((await call({latest:async()=>{throw new Error('banco');}})).code,503);
});
test('API protege escrita e rejeita dados inválidos antes do banco',async()=>{
 let saved;const repo={save:async value=>{saved=value;}};
 assert.equal((await call(repo,{method:'POST',path:'/api/briefing',body:sample})).code,401);assert.equal(saved,undefined);
 assert.equal((await call(repo,{method:'POST',path:'/api/briefing',auth:'Bearer '+token,body:{...sample,noticias:[]}})).code,400);
 assert.equal((await call(repo,{method:'POST',path:'/api/briefing',auth:'Bearer '+token,body:sample,contentType:'text/plain'})).code,415);
 assert.equal((await call(repo,{method:'POST',path:'/api/briefing',auth:'Bearer '+token,body:sample})).code,200);assert.equal(saved.publicado,true);
 assert.equal(authorized('Bearer curto','curto'),false);
});
