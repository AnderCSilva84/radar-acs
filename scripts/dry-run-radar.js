'use strict';
const assert = require('node:assert/strict');
const { generateAndPublish } = require('../api/generator');
const { createScheduledGenerator } = require('../api/scheduled-generator');

// Local-only fixture exercise: every external dependency is injected, no cloud SDK.
async function dryRun() {
    const response = structuredClone(require('../tests/fixtures/generated-response.json'));
    const generated = JSON.parse(response.output[1].content[0].text);
    delete generated.data; delete generated.titulo;
    generated.noticias.forEach(news => {
        news.sourceIds = [news.url];news.evidencias = [news.evidencia];news.termosEspecificos = [];
        news.allowedFacts = [{ texto: news.titulo + ' ' + news.resumo + ' ' + news.contexto, evidenciaIndices: [0] }];
        news.roteiroAlexa = news.resumo + ' ' + 'informação útil '.repeat(20).trim() + '.';
    });
    generated.roteiroAlexa = generated.noticias.map(news => news.roteiroAlexa).join('\n\n');
    generated.oportunidadeOrdem = 0;generated.oportunidadeDoDia = 'Nenhuma oportunidade específica comprovada nesta edição.';
    response.output[1].content[0].text = JSON.stringify(generated);
    const now = () => new Date('2026-10-04T11:00:00Z');
    let calls = 0, publicationChecks = 0, briefing;
    const logger = { info() {}, error() {} };
    const handler = createScheduledGenerator({ now, logger,
        repository: { published: async () => false, claim: async () => ({acquired:true, runId:"mock",attempt:1}), finishAttempt: async () => Boolean(briefing), latest: async () => ({ titulo: 'Radar ACS — Edição #002', data: '2026-10-03', noticias: [] }) },
        generate: options => generateAndPublish({ ...options, now, logger, apiKey: 'fixture-only', requireObservedEvidence: true,
            fetchImpl: async () => { calls++;return { ok: true, json: async () => response }; },
            readSource: async () => { throw new Error('Dry run cannot access web'); },
            publish: async value => { publicationChecks++;briefing = value; }
        })
    });
    const res = { set() { return this; }, status(code) { this.code = code;return this; }, json(body) { this.body = body;return this; } };
    await handler({ method: 'POST' }, res);
    assert.equal(res.code, 200);assert.equal(res.body.status, 'PUBLISHED');assert.equal(calls, 1);assert.equal(publicationChecks, 1);
    assert.equal(briefing.coverId, 'eleicoes-2026');assert.equal(briefing.editionType, 'special');assert.equal(briefing.data, '2026-10-04');assert.equal(briefing.titulo, 'Radar ACS — Edição #003');
    return { dryRun: 'PASS', mockModelCalls: calls, mockPublicationChecks: publicationChecks, openAIReal: 0, webReal: 0, firestoreWrites: 0, context: briefing.context, coverId: briefing.coverId, editionType: briefing.editionType };
}
if (require.main === module) dryRun().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message);process.exitCode = 1; });
module.exports = { dryRun };
