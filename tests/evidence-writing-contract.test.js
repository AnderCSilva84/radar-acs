'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {buildWritingRequest,validateWriting} = require('../api/editorial-v2-generator');
const {rankPool} = require('../api/editorial-pool');
const {defaultSettings} = require('../api/editorial-settings');
const fixture = require('./fixtures/editorial-v2.cjs');
function sample(){const c=rankPool(fixture.pool().slice(0,1),defaultSettings(),[],'2026-10-06').selected[0];return {c,n:fixture.writing([c]).noticias[0]};}
test('evidence-first contract is explicit and retains a single writing call without tools',()=>{
 const {c}=sample(),request=buildWritingRequest([c],'2026-10-06');
 assert.deepEqual(request.tools,[]);assert.equal(request.tool_choice,'none');
 for(const instruction of ['Antes de redigir cada claim','EVIDENCE → CLAIM → TEXT','Não faça inferências editoriais','Preserve entidades','negação e modalidade','Não reproduza trechos extensos','Nunca preencha tamanho'])assert.ok(request.instructions.includes(instruction));
 assert.ok(request.instructions.includes('Múltiplas referências'));
 assert.equal(request.text.format.schema.properties.noticias.maxItems,1);
});
for(const mode of ['claim without reference','unknown reference','new fact','amplified modality','changed negation']) test('unchanged validator rejects '+mode,()=>{
 const {c,n}=sample();const first=n.evidenceReferences[0];
 if(mode==='claim without reference')n.evidenceReferences.shift();
 if(mode==='unknown reference')first.evidenceIds=['other-story'];
 if(mode==='new fact'){first.segment=first.segment.replace('biblioteca','InventedOrg');n.editorialSummary=n.editorialSummary.replace('biblioteca','InventedOrg');}
 if(mode==='amplified modality')c.evidence[0].text=c.evidence[0].text.replace('amplia','pode ampliar');
 if(mode==='changed negation')c.evidence[0].text=c.evidence[0].text.replace('amplia','não amplia');
 assert.throws(()=>validateWriting(n,c),{code:'FACTUAL_EVIDENCE'});
});
