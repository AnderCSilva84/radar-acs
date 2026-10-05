'use strict';
const test = require('node:test');const assert = require('node:assert/strict');
const { editorialDate, buildRequest, generateAndPublish } = require('../api/generator');
const { editionContext, editionTitle, validateElection } = require('../api/edition-context');
const { createScheduledGenerator } = require('../api/scheduled-generator');
const { validateBriefing } = require('../api/validation');
const { publicEdition } = require('../api/history');
const sample = require('../examples/briefing-teste.json');
const now = () => new Date('2026-10-04T11:00:00Z');
const logger = { info() {}, error() {} };
function res() { return { set() { return this; }, status(code) { this.code = code;return this; }, json(body) { this.body = body;return this; } }; }
test('contexto especial e timezone Belem limitados a 04/10, próximo dia regular', () => {
    assert.equal(editorialDate(new Date('2026-10-04T02:59:00Z')), '2026-10-03');
    assert.equal(editorialDate(now()), '2026-10-04');
    assert.deepEqual(editionContext('2026-10-05'), {});
    assert.equal(editionContext('2026-10-04').coverId, 'eleicoes-2026');
    assert.equal(editionContext('2026-10-04').editionType, 'special');
    assert.equal(editionTitle('2026-10-04', 'Radar ACS — Edição #002'), 'Radar ACS — Edição #003');
    assert.equal(editionTitle('2026-10-05', 'Radar ACS — Edição #003'), 'Radar ACS — Edição #004');
});
test('prompt neutralidade e estilo na mesma chamada sem parâmetros adicionais', () => {
    const request = buildRequest('2026-10-04', [], [], editionContext('2026-10-04'));
    assert.match(request.instructions, /TSE, TRE-PA/);assert.match(request.instructions, /Neutralidade absoluta/);assert.match(request.instructions, /Estilo Anderson/);
    assert.match(request.instructions, /NÃO existem resultados/);assert.equal(request.max_tool_calls, 3);assert.equal(request.tools[0].type, 'web_search');
});
test('neutralidade bloqueia propaganda e resultados das 08h, aceita serviço sóbrio', () => {
    for (const text of ['Vote em Fulano', 'Fulano foi eleito', 'Resultado oficial da votação', 'Fulano vai vencer a eleição']) assert.throws(() => validateElection([{ titulo: text }], '2026-10-04'), { code: 'ELECTION_NEUTRALITY' });
    assert.doesNotThrow(() => validateElection([{ titulo: 'Serviço ao eleitor no Pará', resumo: 'Informações oficiais da Justiça Eleitoral.' }], '2026-10-04'));
});
test('metadados preservados no contrato e histórico; documentos antigos intactos', () => {
    const metadata = editionContext('2026-10-04');
    const valid = validateBriefing({ ...sample, ...metadata });
    assert.equal(valid.coverId, 'eleicoes-2026');assert.equal(publicEdition(valid).context, 'eleicoes-2026');
    assert.equal(publicEdition(sample).coverId, undefined);
    assert.throws(() => validateBriefing({ ...sample, coverId: '../unsafe' }));
    assert.equal(validateBriefing({ ...sample, coverId: 'cirio-2026', context: 'cirio-2026' }).context, 'cirio-2026');
});
test('data já publicada encerra sem reservar, gerar ou publicar', async () => {
    const handler = createScheduledGenerator({ now, logger, repository: { published: async () => true, reserve: async () => assert.fail('Reserva desnecessária') }, generate: async () => assert.fail('Geração proibida') });
    const response = res();await handler({ method: 'POST' }, response);assert.equal(response.body.status, 'SKIPPED_ALREADY_PUBLISHED');
});
test('reserva impede segundo gasto na mesma data mesmo se a primeira geração falhar', async () => {
    let acquired = false, calls = 0;
    const handler = createScheduledGenerator({ now, logger, repository: { published: async () => false, claim: async () => { if(acquired)return {acquired:false,status:'SKIPPED_ATTEMPTS_EXHAUSTED'};acquired=true;return {acquired:true,attempt:1,runId:'mock'}; }, finishAttempt: async () => false, latest: async () => null }, generate: async () => { calls++;throw new Error('Falha de validação/publicação'); } });
    const first = res();await handler({ method: 'POST' }, first);assert.equal(first.code, 503);
    const second = res();await handler({ method: 'POST' }, second);assert.equal(second.body.status, 'SKIPPED_ATTEMPTS_EXHAUSTED');assert.equal(calls, 1);
});
test('falhas de geração, validação ou publicação não reportam sucesso nem retry', async () => {
    for (const stage of ['OPENAI_REQUEST','BRIEFING_VALIDATION','PUBLICATION']) {
        let calls = 0;
        const handler = createScheduledGenerator({ now, logger, repository: { published: async () => false, claim: async () => ({acquired:true,attempt:2,runId:'mock'}), finishAttempt: async () => false, latest: async () => null }, generate: async () => { calls++;throw Object.assign(new Error('Falha'), { stage }); } });
        const response = res();await handler({ method: 'POST' }, response);assert.equal(response.code, 503);assert.equal(response.body.status, 'FAILED');assert.equal(calls, 1);
    }
});
test('dry run exercita o core e publicação em memória sem IO real', async () => {
    const result = await require('../scripts/dry-run-radar').dryRun();assert.equal(result.dryRun, 'PASS');assert.equal(result.openAIReal, 0);assert.equal(result.firestoreWrites, 0);
});
