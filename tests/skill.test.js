'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const client=require('../lambda/briefing-client');
let mode='success';
client.createBriefingClient=()=>async()=>{if(mode==='error')throw new Error('indisponível');return mode==='empty'?{briefing:null}:{briefing:require('../examples/briefing-teste.json')};};
const {handler}=require('../lambda/index');
function invoke(request){return new Promise((resolve,reject)=>handler({version:'1.0',session:{new:true,sessionId:'test',application:{applicationId:'test'},user:{userId:'test'},attributes:{}},context:{System:{application:{applicationId:'test'},user:{userId:'test'},device:{deviceId:'test',supportedInterfaces:{}}}},request:{requestId:'test',timestamp:new Date().toISOString(),locale:'pt-BR',...request}}, {},(error,value)=>error?reject(error):resolve(value)));}
test('SDK Alexa: Launch dinâmico, ausência, erro, ajuda e parada',async()=>{
 mode='success';let result=await invoke({type:'LaunchRequest'});assert.match(result.response.outputSpeech.ssml,/primeiro briefing dinâmico/);assert.equal(result.response.shouldEndSession,true);
 mode='empty';result=await invoke({type:'LaunchRequest'});assert.match(result.response.outputSpeech.ssml,/ainda não foi publicado/);
 mode='error';result=await invoke({type:'LaunchRequest'});assert.match(result.response.outputSpeech.ssml,/Não consegui acessar/);
 result=await invoke({type:'IntentRequest',intent:{name:'AMAZON.HelpIntent'}});assert.match(result.response.outputSpeech.ssml,/ouvir briefing/);
 result=await invoke({type:'IntentRequest',intent:{name:'AMAZON.StopIntent'}});assert.match(result.response.outputSpeech.ssml,/Até mais/);
});

test('Custom Task pt-BR reproduz briefing e conclui a tarefa com TTS', async () => {
 mode='success';
 const result=await invoke({type:'LaunchRequest',task:{name:'test.OuvirBriefingHoje',version:'1',input:{}}});
 assert.match(result.response.outputSpeech.ssml,/primeiro briefing dinâmico/);
 assert.equal(result.response.shouldEndSession,true);
 assert.equal(result.response.directives[0].type,'Tasks.CompleteTask');
 assert.equal(result.response.directives[0].status.code,'200');
 assert.equal(result.response.directives.length,1);
});
test('Custom Task rejeita nome, versão, locale e parâmetros inesperados', async () => {
 for(const patch of [{task:{name:'other.OuvirBriefingHoje',version:'1'}},{task:{name:'test.OuvirBriefingHoje',version:'2'}},{locale:'en-US'},{task:{name:'test.OuvirBriefingHoje',version:'1',input:{extra:true}}}]) {
  const result=await invoke({type:'LaunchRequest',task:{name:'test.OuvirBriefingHoje',version:'1',input:{}},...patch});
  assert.equal(result.response.directives[0].status.code,'400');
 }
});
test('Custom Task encerra com falha em briefing ausente ou API indisponível', async () => {
 for(const value of ['empty','error']) {
  mode=value;
  const result=await invoke({type:'LaunchRequest',task:{name:'test.OuvirBriefingHoje',version:'1',input:{}}});
  assert.equal(result.response.directives[0].status.code,'500');
 }
 mode='success';
});
test('Pacote declara tarefa sem parâmetros, pt-BR e invocation name preservado', () => {
 const task=require('../tasks/OuvirBriefingHoje.1.json');
 assert.equal(task.info['x-amzn-display-details']['pt-BR'].title,'Ouvir briefing de hoje');
 assert.equal(task.info['x-amzn-alexa-access-scope'],'public');
 assert.equal(require('../skill.json').manifest.apis.custom.tasks[0].name,'OuvirBriefingHoje');
 assert.equal(require('../interactionModels/custom/pt-BR.json').interactionModel.languageModel.invocationName,'radar acs');
});
