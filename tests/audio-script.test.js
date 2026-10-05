'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {validateAudioScript}=require('../api/audio-script');
test('roteiro final curto é válido sem mínimo editorial rígido',()=>assert.equal(validateAudioScript({roteiroAlexa:'Empresa anuncia novidade.'}).palavras,3));
test('blocos personalizados ausentes não invalidam o roteiro final renderizado',()=>assert.doesNotThrow(()=>validateAudioScript({noticias:[{roteiroAlexa:''},{}],roteiroAlexa:'Conteúdo útil desta edição.'})));
test('roteiro final vazio ou excessivo é erro de apresentação',()=>{for(const script of ['', 'texto '.repeat(2000)])assert.throws(()=>validateAudioScript({roteiroAlexa:script}),{code:'AUDIO_SCRIPT_INVALID'})});
test('URL e marcação não sanitizadas são rejeitadas somente no roteiro final',()=>{for(const script of ['Leia https://example.com','<speak>texto</speak>','[Fonte](example.com)'])assert.throws(()=>validateAudioScript({roteiroAlexa:script}),{code:'AUDIO_SCRIPT_INVALID'})});
