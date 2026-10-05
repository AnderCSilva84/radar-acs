'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {sanitizeSpeech,renderEditionAudio}=require('../api/audio-rendering');
const {generateRadarEdition}=require('../api/generator');
const {validateAudioScript}=require('../api/audio-script');
const {getBriefingPlayback}=require('../api/playback');
const fixture=require('./fixtures/collected-news-unconfirmed.json');
const news=(custom)=>({ordem:1,titulo:'Pesquisa & desenvolvimento',resumo:'A equipe apresentou uma ferramenta útil para desenvolver software.',roteiroAlexa:custom});
test('sanitização remove HTML, markdown, URLs e controles sem alterar os campos publicados',()=>{
 const item=news('<p>**Pesquisa** & desenvolvimento.</p> [Documentação](https://example.com)\u0000');
 const result=renderEditionAudio({noticias:[item]});assert.equal(result.edition.noticias[0].titulo,item.titulo);assert.equal(result.edition.noticias[0].resumo,item.resumo);
 assert.ok(!/[\u0000]|https?:\/\/|<p>|\*\*|\]\(/.test(result.edition.roteiroAlexa));assert.ok(result.edition.roteiroAlexa.includes('Documentação'));
});
test('ampersand, aspas e comparações são escapados uma única vez no SSML',()=>{
 const text=sanitizeSpeech('Pesquisa & desenvolvimento: "A < B", e C > D.');const ssml=getBriefingPlayback({roteiroAlexa:text},'',{introduction:''}).ssml;
 assert.ok(ssml.includes('&amp;'));assert.ok(ssml.includes('&quot;'));assert.ok(ssml.includes('&lt;'));assert.ok(ssml.includes('&gt;'));assert.ok(!ssml.includes('&amp;amp;'));
 assert.equal(sanitizeSpeech('Pesquisa &amp; desenvolvimento'),'Pesquisa & desenvolvimento');
});
test('roteiro ausente, objeto malformado, truncado ou tag quebrada usa título e resumo',()=>{
 for(const value of [undefined,null,{text:'broken'},'<speak', 'Texto interrompido porque','...']){
 const rendered=renderEditionAudio({noticias:[news(value)]});assert.ok(rendered.edition.roteiroAlexa.includes(news().resumo));assert.ok(rendered.warnings.some(w=>w.code==='AUDIO_FALLBACK_TITLE_SUMMARY'));assert.doesNotThrow(()=>validateAudioScript(rendered.edition));
 }
});
test('URLs e referências públicas deixam de fazer parte do texto falado',()=>{
 assert.equal(sanitizeSpeech('Veja [a fonte](https://example.com/path). https://example.com/out www.example.com 【fonte】'),'Veja a fonte.');
});
test('sem texto falável ou sem espaço no SSML omite fala, preservando notícias no PWA',()=>{
 const items=[{ordem:1,titulo:'<p></p>',resumo:'<p></p>'},...Array.from({length:5},(_,i)=>({ordem:i+2,titulo:'Título',resumo:'Texto útil '.repeat(300)}))];
 const rendered=renderEditionAudio({noticias:items});assert.equal(rendered.edition.noticias.length,6);assert.ok(rendered.warnings.some(w=>w.code==='AUDIO_ITEM_OMITTED'));assert.ok(getBriefingPlayback(rendered.edition).ssml.length<8000);
});
async function pipeline(mutate){const response=structuredClone(fixture);const message=response.output.find(i=>i.type==='message');const generated=JSON.parse(message.content[0].text);mutate(generated,response);message.content[0].text=JSON.stringify(generated);let saved,calls=0,candidates;
 const result=await generateRadarEdition({apiKey:'fixture-secret',now:()=>new Date('2026-10-03T12:00:00Z'),fetchImpl:async()=>{calls++;assert.equal(calls,1);return {ok:true,json:async()=>response}},readSource:async()=>assert.fail('Sem pesquisa externa'),publish:async value=>{assert.equal(saved,undefined);saved=value},evidenceCheckpoint:value=>{candidates=value},logger:{info(){}}});return {result,saved,calls,candidates};}
test('incidente simulado: 1 INVALID_URL + 4 áudio inválido publica quatro notícias (mock)',async()=>{
 const r=await pipeline((g,response)=>{g.noticias.forEach((item,i)=>{item.roteiroAlexa=[undefined,'<speak','Texto truncado porque',{broken:true}][i]});g.noticias.unshift({...g.noticias[0],ordem:1,url:'http://invalid.example.com',titulo:'Candidato inválido'});g.noticias.forEach((n,i)=>n.ordem=i+1)});
 assert.equal(r.calls,1);assert.equal(r.saved.noticias.length,4);assert.equal(r.candidates.filter(c=>c.status==='FAIL').length,1);assert.equal(r.candidates.find(c=>c.status==='FAIL').reasonCode,'INVALID_URL');assert.ok(r.result.metrics.audioWarnings.length>=4);assert.doesNotThrow(()=>validateAudioScript(r.saved));
});
test('uma notícia válida com fala ausente continua publicável',async()=>{const r=await pipeline(g=>{g.noticias=g.noticias.slice(0,1);delete g.noticias[0].roteiroAlexa});assert.equal(r.saved.noticias.length,1);assert.ok(r.saved.roteiroAlexa.includes(r.saved.noticias[0].resumo))});
test('zero notícias estruturalmente válidas falha sem publicação ou retry',async()=>{await assert.rejects(pipeline(g=>g.noticias.forEach(n=>n.fonte='')),{code:'NO_VALID_NEWS'})});
