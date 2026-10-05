'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createScheduledRepository, incident } = require('../api/scheduled-repository');
const { createScheduledGenerator } = require('../api/scheduled-generator');
const { createDiagnosticBuffer, withConsolidatedDiagnostic } = require('../api/consolidated-diagnostic');
const { validateAudioScript } = require('../api/audio-script');
function database({ exists = false, numbered = false, previousDate = incident.previousDate, status, recoveryAttempted = false, reservationExists = true, reservationTime = incident.reservationTime } = {}) {
    const state = { tipo: 'scheduled-reservation', data: incident.date, criadoEm: { toDate: () => new Date(reservationTime) }, ...(status ? { status } : {}), recoveryAttempted };
    let writes = 0, reads = 0;
    const db = {
        collection(name) {
            return {
                doc(id) { return { name, id, get: async () => { reads++; return { exists }; }, update: async patch => { writes++; Object.assign(state, patch); } }; },
                where(field) { return { orderBy() { return this; }, limit() { return { field }; } }; }
            };
        },
        async runTransaction(operation) {
            return operation({
                async get(ref) {
                    reads++;
                    if (ref.name === 'briefings') return { exists };
                    if (ref.name === 'geracoesManuais') return { exists: reservationExists, data: () => state };
                    if (ref.field === 'titulo') return { empty: !numbered };
                    return { empty: false, docs: [{ data: () => ({ data: previousDate, titulo: incident.previousTitle }) }] };
                },
                update(ref, patch) { assert.equal(ref.id, 'scheduled-' + incident.date); writes++; Object.assign(state, patch); }
            });
        }
    };
    return { db, state, counts: () => ({ writes, reads }) };
}
test('Known failed reservation permits exactly one recovery and is never removed', async () => {
    for (const status of [undefined, 'FAILED']) {
        const fixture = database({ status }); const repository = createScheduledRepository(fixture.db, () => 'timestamp');
        assert.equal(await repository.recover(incident.date), true);
        assert.equal(await repository.recover(incident.date), false);
        assert.equal(fixture.state.tipo, 'scheduled-reservation');
        assert.equal(fixture.state.recoveryAttempted, true);
        assert.equal(fixture.counts().writes, 1);
    }
});
test('Recovery rejects existing date, numbered edition, newer latest, unknown failure and other date', async () => {
    for (const patch of [{ exists: true }, { numbered: true }, { previousDate: '2026-10-05' }, { status: 'RESERVED' }, { reservationExists: false }, { reservationTime: '2026-10-04T11:01:00Z' }, { recoveryAttempted: true }]) {
        const fixture = database(patch); const repository = createScheduledRepository(fixture.db, () => 'timestamp');
        assert.equal(await repository.recover(incident.date), false);
        assert.equal(fixture.counts().writes, 0);
    }
    assert.equal(await createScheduledRepository(database().db, () => null).recover('2026-10-05'), false);
});
test('Scheduled diagnostics persist only one technical summary, not paid content or secrets', async () => {
    let writes = 0, saved;
    const buffer = createDiagnosticBuffer(async value => { writes++; saved = value; }, ['SECRET'], { technicalOnly: true, date: incident.date, editionNumber: '003' });
    await assert.rejects(withConsolidatedDiagnostic(buffer, async () => {
        buffer.capture({ resultadoEstruturado: { noticias: [{ titulo: 'PRIVATE_CONTENT' }, {}] }, respostaEditorialBruta: 'SECRET PRIVATE_CONTENT', metrics: { chamadasOpenAI: 1 } });
        buffer.candidates([{ candidateId: 'candidate-1', status: 'FAIL', reasonCode: 'OUTSIDE_ALLOWED_FACTS', stage: 'FACTUAL_EVIDENCE', reason: 'SECRET' }, { candidateId: 'candidate-2', status: 'WARNING' }]);
        throw Object.assign(new Error('Falha'), { stage: 'FACTUAL_EVIDENCE' });
    }));
    assert.equal(writes, 1); assert.equal(saved.candidatosGerados, 2); assert.equal(saved.candidatosValidos, 1); assert.equal(saved.candidatosRejeitados, 1); assert.equal(saved.publicado, false);
    assert.deepEqual(saved.candidatos[0], { candidateId: 'candidate-1', stage: 'FACTUAL_EVIDENCE', reasonCode: 'OUTSIDE_ALLOWED_FACTS' });
    assert.doesNotMatch(JSON.stringify(saved), /PRIVATE_CONTENT|SECRET|respostaEditorialBruta/);
});
test('Publication does not regress latest and recovery is explicitly confirmed', async () => {
    for (const body of [{ recoveryDate: incident.date }, { recoveryDate: '2026-10-05', confirmarRecuperacao: true }, undefined]) {
        const response = { set() {}, status(value) { this.code = value; return this; }, json(value) { this.body = value; } };
        const handler = createScheduledGenerator({ now: () => new Date('2026-10-04T12:00:00Z'), logger: { info() {}, error() {} }, repository: { published: async () => false, reserve: async () => true, claim: async () => ({acquired:true,attempt:1,runId:'mock'}), finishAttempt: async () => false, latest: async () => ({ data: '2026-10-05' }) }, generate: async () => assert.fail('Do not generate') });
        await handler({ method: 'POST', body }, response); assert.equal(response.code, body ? 409 : 503);
    }
});

test('Explicit recovery uses its guard once, never invokes the normal reservation or Scheduler', async () => {
    let calls = 0;
    const fixture = database(); const repository = createScheduledRepository(fixture.db, () => 'timestamp');
    repository.latest = async () => ({ data: incident.previousDate, titulo: incident.previousTitle });
    repository.reserve = async () => assert.fail('Do not bypass normal reservation');
    const handler = createScheduledGenerator({ now: () => new Date('2026-10-04T12:00:00Z'), logger: { info() {}, error() {} }, repository, generate: async () => { calls++; return { noticias: [{}], metrics: {} }; } });
    for (const expected of [200, 409]) {
        const response = { set() {}, status(value) { this.code = value; return this; }, json(value) { this.body = value; } };
        await handler({ method: 'POST', body: { recoveryDate: incident.date, confirmarRecuperacao: true } }, response);
        assert.equal(response.code, expected);
    }
    assert.equal(calls, 1);
});

test('Existing edition blocks manual generation before spending or reserving', async () => {
    const { createManualGenerator } = require('../api/manual-generator');
    const response = { set() {}, status(value) { this.code = value; return this; }, json(value) { this.body = value; } };
    await createManualGenerator({ canGenerate: async () => false, runs: { acquire: async () => assert.fail('No reserve') }, generate: async () => assert.fail('No AI') })({ method: 'POST', is: () => true, body: { requestId: '12345678-1234-4234-8234-123456789abc', confirmarPublicacao: true } }, response);
    assert.equal(response.code, 409);
});
test('Small edition audio remains complete, bounded and consistent', () => {
    for (const total of [1, 2, 3]) {
        const news = Array.from({ length: total }, (_, i) => ({ ordem: i + 1, roteiroAlexa: 'Conteúdo '.repeat(39) + 'completo.' }));
        assert.doesNotThrow(() => validateAudioScript({ noticias: news, roteiroAlexa: news.map(item => item.roteiroAlexa.trim()).join('\n\n') }));
        news[0].roteiroAlexa = 'Bloco vazio e';
        assert.doesNotThrow(() => validateAudioScript({ noticias: news, roteiroAlexa: news.map(item => item.roteiroAlexa).join('\n\n') }));
    }
});
