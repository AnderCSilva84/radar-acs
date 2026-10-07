'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateMedia, publicMedia, spotifyUrl } = require('../api/live-media');
const { defaultSettings, validateSettings } = require('../api/editorial-settings');
const { createLive, cachedRead } = require('../api/live');
const { createAdminSettings } = require('../api/admin-settings');
const { createApi } = require('../api/handler');
const { FootballProvider, FootballDataProvider, MockFootballProvider, normalizeMatch, footballTtl, createCachedFootball } = require('../api/live-providers');
const radio = () => ({ id:'test-radio',name:'Rádio teste',streamUrl:'https://example.com/radio',enabled:true,featured:false,sortOrder:0,usageStatus:'approved' });
const playlist = () => ({ id:'test-playlist',mediaType:'SPOTIFY_PLAYLIST',name:'Playlist teste',spotifyUrl:'https://open.spotify.com/playlist/1234567890123456789012?si=public',enabled:true,featured:false,sortOrder:1 });
const match = (status='TIMED') => ({ id:1,status,utcDate:'2026-10-05T20:00:00Z',homeTeam:{id:10,name:'Time A'},awayTeam:{id:20,name:'Time B'},score:{fullTime:{home:2,away:1}} });
const response = () => ({ code:200,set(){return this;},status(code){this.code=code;return this;},json(body){this.body=body;return this;} });
test('rádio externa exige URL segura, aprovação e nunca expõe stream', () => {
  const external = { ...radio(), mediaType: 'EXTERNAL_RADIO', externalUrl: 'https://example.com/ouvir' };
  const value = validateMedia({ media: [external] }).media[0];
  assert.equal(value.externalUrl, external.externalUrl);
  assert.equal(value.streamUrl, undefined);
  assert.equal(publicMedia({ media: [external] }).length, 1);
  for (const usageStatus of ['pending', 'disabled']) assert.equal(publicMedia({ media: [{ ...external, usageStatus }] }).length, 0);
  for (const externalUrl of ['', 'http://example.com', 'https://user:pass@example.com', 'https://example.com/?token=private']) assert.throws(() => validateMedia({ media: [{ ...external, externalUrl }] }));
});
test('rádio compatível sem mediaType; playlist sem campos irrelevantes; whitelist sem secrets', () => {
  const result=validateMedia({media:[{...radio(),secret:'DO_NOT_EXPOSE'},playlist()]});
  assert.equal(result.media[0].mediaType,'RADIO_STREAM'); assert.equal(result.media[1].streamUrl,undefined);
  assert.doesNotMatch(JSON.stringify(result),/DO_NOT_EXPOSE|\?si=/);
});
test('URLs e tipos inválidos não passam; somente playlist oficial HTTPS', () => {
  for(const url of ['javascript:alert(1)','data:text/plain,a','file:///tmp/x','http://example.com/a','https://user:pass@example.com/a','https://localhost/a','https://example.com/?token=private']) assert.throws(()=>validateMedia({media:[{...radio(),streamUrl:url}]}));
  for(const url of ['https://example.com/playlist/1234567890123456789012','https://open.spotify.com.evil.test/playlist/1234567890123456789012','https://open.spotify.com/track/1234567890123456789012','https://open.spotify.com/playlist/no','javascript:bad']) assert.throws(()=>spotifyUrl(url));
  assert.equal(spotifyUrl(playlist().spotifyUrl),'https://open.spotify.com/playlist/1234567890123456789012');
  assert.throws(()=>validateMedia({media:[{...radio(),mediaType:'PODCAST'}]}));
});
test('disabled, pending e status disabled não aparecem; approved e Spotify ativo aparecem', () => {
  assert.equal(publicMedia({media:[{...radio(),enabled:false}]}).length,0);
  for(const usageStatus of ['pending','disabled']) assert.equal(publicMedia({media:[{...radio(),usageStatus}]}).length,0);
  assert.equal(publicMedia({media:[radio(),playlist()]}).length,2);
});
for(const [raw,status] of [['TIMED','UPCOMING'],['IN_PLAY','LIVE'],['PAUSED','HALFTIME'],['FINISHED','FINISHED'],['POSTPONED','POSTPONED'],['CANCELLED','CANCELLED']]) {
  test(`FootballProvider normaliza ${raw}`,()=>{const value=normalizeMatch(match(raw));assert.equal(value.status,status);assert.equal(value.minute,undefined);if(status==='UPCOMING')assert.equal(value.score,undefined);});
}
test('placar ausente não é inventado, payload externo inválido é rejeitado',()=>{
  const value=match('IN_PLAY');value.score=null;assert.equal(normalizeMatch(value).score,undefined);
  assert.throws(()=>normalizeMatch({...match(),status:'UNSUPPORTED'}));
});
test('providers mock e adapter são injetáveis sem rede; produção não retorna fixture', async()=>{
  assert.equal((await new FootballProvider().load()).status,'NOT_CONFIGURED');
  assert.equal((await new MockFootballProvider([match()]).load()).matches.length,1);
  const provider=new FootballDataProvider(async path=>{assert.equal(path,'/v4/competitions/BSA/matches');return {matches:[match()]};});
  assert.equal((await provider.load()).status,'DELAYED');
});
test('cache single-flight e TTL adaptativo sem consulta por usuário',async()=>{
  let calls=0,now=0;
  const get=createCachedFootball({load:async()=>{calls++;return {status:'OK',matches:[normalizeMatch(match('IN_PLAY'))]};}},()=>now);
  await Promise.all([get(),get(),get()]);assert.equal(calls,1);now=119999;await get();assert.equal(calls,1);now=120000;await get();assert.equal(calls,2);
  assert.equal(footballTtl([normalizeMatch(match())]),1800000);assert.equal(footballTtl([normalizeMatch(match('FINISHED'))]),21600000);assert.equal(footballTtl([]),43200000);
});
test('falha do provider preserva resultado stale e aplica cooldown sem retry',async()=>{
  let fail=false,now=0,calls=0;
  const get=createCachedFootball({load:async()=>{calls++;if(fail)throw Error('PRIVATE_TOKEN');return {status:'OK',matches:[normalizeMatch(match('IN_PLAY'))]};}},()=>now);
  await get();fail=true;now=120001;const stale=await get();assert.equal(stale.stale,true);assert.equal(stale.matches.length,1);await get();assert.equal(calls,2);assert.doesNotMatch(JSON.stringify(stale),/PRIVATE_TOKEN/);
});
test('configuração e mídias são lidas uma vez por janela, cache pode ser invalidado',async()=>{
  let reads=0;const get=cachedRead(async()=>{reads++;return {value:reads};});await Promise.all([get(),get()]);await get();assert.equal(reads,1);get.invalidate();await get();assert.equal(reads,2);
});
test('futebol off não consulta provider; múltiplos times mapeados filtram partidas',async()=>{
  const config=defaultSettings();config.editorial.futebol='off';let calls=0;
  config.followedTeams=[{id:'a',name:'A',sport:'football',country:'BR',active:true,provider:'football-data',providerTeamId:'10'},{id:'b',name:'B',sport:'football',country:'BR',active:true,provider:'football-data',providerTeamId:'20'}];
  assert.equal(validateSettings(config).followedTeams.length,2);
  const live=createLive({settings:async()=>config,media:async()=>({media:[]}),football:async()=>{calls++;return {status:'OK',matches:[normalizeMatch(match())]};}});
  const off=response();await live({method:'GET',path:'/api/live'},off);assert.equal(calls,0);assert.equal(off.body.football.enabled,false);
  config.editorial.futebol='high';const on=response();await live({method:'GET',path:'/api/live/football/team/a'},on);assert.equal(on.body.football.matches.length,1);assert.equal(calls,1);
});
test('endpoints públicos sem login e admin restrito ao UID existente',async()=>{
  let writes=0;
  const admin=createAdminSettings({repository:{get:async()=>({media:[]}),save:async()=>writes++},verifyIdToken:async token=>({uid:token}),getAdminUid:()=> 'owner',validate:validateMedia,defaults:()=>({media:[]})});
  const live=createLive({settings:async()=>defaultSettings(),media:async()=>({media:[radio()]}),football:async()=>new FootballProvider().load()});
  const api=createApi({},()=>'',null,null,live,admin);
  const publicRes=response();await api({method:'GET',path:'/api/live/radios'},publicRes);assert.equal(publicRes.code,200);assert.equal(publicRes.body.media.length,1);
  for(const [token,code] of [[undefined,401],['Bearer stranger',403],['Bearer owner',200]]) {
    const res=response();await api({method:'PUT',path:'/api/admin/radios',get:()=>token,is:()=>true,body:{media:[playlist()]}},res);assert.equal(res.code,code);
  }
  assert.equal(writes,1);
});
