'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateRadarEdition, generateAndPublish, buildRequest } = require('../api/generator');
const { collectObservedEvidence } = require('../api/observed-factual-evidence');
const { observedSourceEvidence } = require('../api/source-evidence-store');
const fixture = require('./fixtures/collected-news-unconfirmed.json');
async function run(update = () => {}) {
    const response = structuredClone(fixture);
    const generated = JSON.parse(response.output[1].content[0].text);
    update(generated, response);
    response.output[1].content[0].text = JSON.stringify(generated);
    let calls = 0, saved = null, candidates;
    try {
        const result = await generateRadarEdition({ apiKey: 'fixture-secret', now: () => new Date('2026-10-03T12:00:00Z'),
            fetchImpl: async () => { calls++; return { ok: true, json: async () => response }; },
            readSource: async () => assert.fail('Não consultar páginas nem IA adicional'),
            evidenceCheckpoint: value => { candidates = value; }, logger: { info() {} },
            publish: async value => { assert.equal(saved, null); saved = value; } });
        return { result, saved, candidates, calls };
    } catch (error) { return { error, saved, candidates, calls }; }
}
test('fixture conceitual: quatro unconfirmed no gate antigo publicam com fontes coletadas válidas', async () => {
    const news = JSON.parse(fixture.output[1].content[0].text).noticias;
    const old = await collectObservedEvidence(news, observedSourceEvidence(fixture));
    assert.equal(old.rejeitadas.length, 4);
    assert.ok(old.rejeitadas.every(n => n.code === 'FACTUAL_EVIDENCE_UNCONFIRMED'));
    const r = await run(); assert.ifError(r.error);
    assert.equal(r.saved.noticias.length, 4); assert.equal(r.calls, 1);
    assert.ok(r.candidates.every(n => n.status === 'PASS'));
    assert.equal(r.result.metrics.leiturasFontes, 0);
});
test('fonte ausente rejeita somente candidato', async () => {
    const r = await run(g => { g.noticias[0].fonte = ''; }); assert.ifError(r.error);
    assert.equal(r.saved.noticias.length, 3); assert.equal(r.candidates.find(n => n.status === 'FAIL').reasonCode, 'SOURCE_REQUIRED');
});
test('URL inválida ou não coletada rejeita somente candidato', async () => {
    for (const url of ['http://example.com/news', 'https://example.com/not-collected']) {
        const r = await run(g => { g.noticias[0].url = url; }); assert.ifError(r.error);
        assert.equal(r.saved.noticias.length, 3); assert.equal(r.candidates.find(n => n.status === 'FAIL').reasonCode, 'INVALID_URL');
    }
});
test('duplicação evidente preserva somente a primeira notícia', async () => {
    const r = await run(g => { g.noticias[1] = { ...g.noticias[0], ordem: 2 }; }); assert.ifError(r.error);
    assert.equal(r.saved.noticias.length, 3); assert.equal(r.candidates.find(n => n.status === 'FAIL').reasonCode, 'NEWS_DUPLICATE');
});
test('uma notícia coletada válida publica; zero válidas falha sem retry', async () => {
    const one = await run(g => g.noticias.forEach((n, i) => { if (i) n.fonte = ''; }));
    assert.ifError(one.error); assert.equal(one.saved.noticias.length, 1); assert.equal(one.calls, 1);
    const zero = await run(g => g.noticias.forEach(n => { n.fonte = ''; }));
    assert.equal(zero.error.code, 'NO_VALID_NEWS'); assert.equal(zero.saved, null); assert.equal(zero.calls, 1);
});
test('contradição explícita do mesmo título rejeita candidato sem exigir confirmação geral', async () => {
    const r = await run((g, response) => {
        g.noticias[0].titulo = 'Equipe anunciou ferramenta para desenvolvimento';
        response.output[0].action.sources[0].title = 'Equipe não anunciou ferramenta para desenvolvimento';
    }); assert.ifError(r.error);
    assert.equal(r.saved.noticias.length, 3); assert.equal(r.candidates.find(n => n.status === 'FAIL').reasonCode, 'FACTUAL_CONTRADICTION');
});
test('estrutura quebrada impede publicação', async () => {
    const r = await run(g => { g.noticias = null; });
    assert.ok(r.error); assert.equal(r.saved, null); assert.equal(r.calls, 1);
});
test('mesmo motor e schema não exigem provas editoriais', () => {
    assert.equal(generateRadarEdition, generateAndPublish);
    const request = buildRequest('2026-10-05');
    const fields = request.text.format.schema.properties.noticias.items.required;
    assert.ok(fields.includes('fonte') && fields.includes('url'));
    for (const field of ['allowedFacts', 'evidencias', 'sourceIds']) assert.ok(!fields.includes(field));
    assert.equal(request.max_tool_calls, 3);
});
