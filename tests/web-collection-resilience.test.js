'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateAndPublish } = require('../api/generator');
const { createScheduledGenerator } = require('../api/scheduled-generator');
const { createDiagnosticBuffer, withConsolidatedDiagnostic } = require('../api/consolidated-diagnostic');
const fixture = require('./fixtures/generated-response.json');
const logger = { info() {}, error() {} };

test('deploy declara somente o invocador Scheduler existente, preservando endpoint privado', () => {
    const code = require('node:fs').readFileSync(require('node:path').join(__dirname, '../api/index.js'), 'utf8');
    const scheduled = code.slice(code.indexOf('exports.generateRadarScheduled ='));
    assert.match(scheduled, /invoker: \['radar-scheduler@radar-acs\.iam\.gserviceaccount\.com'\]/);
    assert.doesNotMatch(scheduled, /invoker: ['"]public['"]/);
});

async function run({ valid = 3, pending = true, empty = false, corrupt = false, missingContent = false, invalidUrl = false, invalidContent = false } = {}) {
    const response = structuredClone(fixture);
    const generated = JSON.parse(response.output[1].content[0].text);
    generated.noticias = generated.noticias.slice(0, 4);
    generated.noticias.forEach(n => {
        n.sourceIds = [n.url]; n.evidencias = [n.evidencia]; n.termosEspecificos = [];
        n.allowedFacts = [{ texto: n.titulo + ' ' + n.resumo + ' ' + n.contexto, evidenciaIndices: [0] }];
        n.roteiroAlexa = n.resumo + ' ' + 'informação útil '.repeat(25).trim() + '.';
    });
    generated.noticias.forEach((n, i) => { if (!missingContent && i >= valid) n.fonte = ''; });
    if (invalidContent) generated.noticias[0].roteiroAlexa = '';
    generated.roteiroAlexa = generated.noticias.map(n => n.roteiroAlexa).join('\n\n');
    generated.oportunidadeOrdem = 0;
    generated.oportunidadeDoDia = 'Nenhuma oportunidade específica comprovada nesta edição.';
    response.output[0].action.sources = generated.noticias.map((n, i) => ({ url: n.url,
        ...(!missingContent ? { text: i < valid ? n.evidencia : 'Este conteúdo não sustenta o anúncio descrito pelo candidato.' } : {}) }));
    if (invalidUrl) generated.noticias[0].url = 'http://example.com/invalid';
    if (empty) generated.noticias = [];
    response.output[1].content[0].text = corrupt ? '{"noticias":[' : JSON.stringify(generated);
    if (pending) response.output.push({ id: 'aux-open', type: 'web_search_call', status: 'in_progress',
        action: { type: 'open_page', url: 'https://example.com/pending', sources: [{ url: generated.noticias[0]?.sourceIds[0] || 'https://example.com/pending', text: 'Não utilizar conteúdo auxiliar pendente.' }] } });
    let calls = 0, published = null, summary, writes = 0;
    const diagnostic = createDiagnosticBuffer(async value => { summary = value; writes++; }, ['fake-secret'], { technicalOnly: true });
    const generate = options => withConsolidatedDiagnostic(diagnostic, () => generateAndPublish({
        ...options, apiKey: 'fake-secret', requireObservedEvidence: true,
        now: () => new Date('2026-10-02T12:00:00Z'), logger,
        fetchImpl: async () => { calls++; return { ok: true, json: async () => response }; },
        readSource: async () => assert.fail('Consulta externa proibida'),
        checkpoint: value => diagnostic.capture(value), evidenceCheckpoint: value => diagnostic.candidates(value),
        publish: async value => { assert.equal(published, null); published = value; }
    }));
    const handler = createScheduledGenerator({ logger, now: () => new Date('2026-10-02T12:00:00Z'), generate,
        repository: { published: async () => false, claim: async () => ({acquired:true,attempt:2,runId:'mock'}), finishAttempt: async () => Boolean(published), latest: async () => null } });
    const res = { set() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
    await handler({ method: 'POST', body: {} }, res);
    assert.equal(calls, 1); assert.equal(writes, 1);
    assert.equal(JSON.stringify(summary).includes('fake-secret'), false);
    assert.equal(summary.resultadoEstruturado, undefined);
    return { res, published, summary };
}

for (const [name, valid, total] of [['A: três válidas', 3, 3], ['B: uma válida / incidente 08h', 1, 1]]) {
    test('Scheduler → pipeline completo mock, auxiliar incompleta: ' + name, async () => {
        const r = await run({ valid });
        assert.equal(r.res.code, 200); assert.equal(r.published.noticias.length, total);
        assert.deepEqual(r.summary.metrics.webCollectionWarnings, ['WEB_COLLECTION_INCOMPLETE_WARNING']);
        assert.equal(r.summary.webActions.at(-1).status, 'in_progress');
    });
}
test('C: nenhuma fonte válida não publica apesar do warning auxiliar', async () => {
    const r = await run({ valid: 0 }); assert.equal(r.res.code, 503); assert.equal(r.published, null);
    assert.equal(r.summary.erro.code, 'NO_VALID_NEWS');
});
for (const [name, options] of [['D: zero candidatos', { empty: true }], ['E: JSON corrompido', { corrupt: true }]]) {
    test(name + ' mantém hard failure', async () => {
        const r = await run(options); assert.equal(r.res.code, 503); assert.equal(r.published, null);
        assert.equal(r.summary.erro.code, 'WEB_COLLECTION_INCOMPLETE');
    });
}
test('F: coleta completa preserva publicação normal', async () => {
    const r = await run({ valid: 4, pending: false }); assert.equal(r.res.code, 200);
    assert.equal(r.published.noticias.length, 4); assert.deepEqual(r.summary.metrics.webCollectionWarnings, []);
});
test('G: ausência de conteúdo independente continua warning explícito', async () => {
    const r = await run({ missingContent: true }); assert.equal(r.res.code, 200);
    assert.equal(r.summary.metrics.sourceEvidenceWarnings, 4);
});
test('H: fonte ausente rejeita candidato e preserva os coletados válidos', async () => {
    const r = await run({ valid: 3 }); assert.equal(r.summary.candidatos.length, 1);
    assert.equal(r.summary.candidatos[0].reasonCode, 'SOURCE_REQUIRED');
});
test('I: URL inválida rejeita somente candidato correspondente', async () => {
    const r = await run({ valid: 4, invalidUrl: true }); assert.equal(r.res.code, 200);
    assert.equal(r.published.noticias.length, 3);
    assert.equal(r.summary.candidatos[0].reasonCode, 'INVALID_URL');
});
test('candidato com bloco vazio permanece e usa fallback de áudio', async () => {
    const r = await run({ valid: 4, invalidContent: true });
    assert.equal(r.res.code, 200); assert.equal(r.published.noticias.length,4);
    assert.ok(r.summary.metrics.audioWarnings.some(item=>item.code==='AUDIO_FALLBACK_TITLE_SUMMARY'));
});
