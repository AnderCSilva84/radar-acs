'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createScheduledRepository, incident, exceptionalAuthorization } = require('../api/scheduled-repository');
const { createScheduledGenerator } = require('../api/scheduled-generator');
function database(patch = {}) {
    const state = { tipo: 'scheduled-reservation', data: incident.date, status: 'FAILED', recoveryAttempted: true, ...patch.state };
    let writes = 0;
    const db = {
        collection(name) {
            const query = { name, filters: [], doc(id) { return { name, id }; },
                where(field, op, value) { this.filters.push([field, value]); return this; },
                orderBy() { return this; }, limit() { return this; } };
            return query;
        },
        async runTransaction(operation) {
            return operation({ async get(ref) {
                if (ref.name === 'geracoesManuais') return { exists: patch.reservationExists !== false, data: () => state };
                if (ref.id) return { exists: Boolean(patch.edition) };
                if (ref.filters.some(([key]) => key === 'titulo')) return { empty: !patch.numbered };
                if (ref.filters.some(([key]) => key === 'data')) return { empty: !patch.publishedToday };
                return { empty: Boolean(patch.noLatest), docs: [{ data: () => ({ data: patch.previousDate || incident.previousDate, titulo: patch.previousTitle || incident.previousTitle }) }] };
            }, update(ref, value) {
                assert.equal(ref.id, 'scheduled-' + incident.date); writes++; Object.assign(state, value);
            } });
        }
    };
    return { state, db, writes: () => writes };
}
test('exceção final é consumida uma vez antes da geração, sem mudar recoveryAttempted', async () => {
    const f = database(); const repo = createScheduledRepository(f.db, () => 'timestamp');
    assert.equal(await repo.recoverExceptional(incident.date, exceptionalAuthorization), true);
    f.state.status = 'FAILED'; // A failed paid attempt must never reopen authorization.
    assert.equal(await repo.recoverExceptional(incident.date, exceptionalAuthorization), false);
    assert.equal(await repo.recover(incident.date), false);
    assert.equal(f.state.recoveryAttempted, true); assert.equal(f.state.exceptionalRecoveryConsumed, true);
    assert.equal(f.writes(), 1);
});
test('todos os pré-requisitos da exceção são obrigatórios, sem escrita em recusas', async () => {
    for (const patch of [{ edition: true }, { numbered: true }, { publishedToday: true }, { reservationExists: false }, { noLatest: true },
        { previousDate: '2026-10-05' }, { previousTitle: 'Outra edição' },
        { state: { status: 'RESERVED' } }, { state: { recoveryAttempted: false } }, { state: { data: '2026-10-05' } },
        { state: { exceptionalRecoveryConsumed: true } }]) {
        const f = database(patch); const repo = createScheduledRepository(f.db, () => 'timestamp');
        assert.equal(await repo.recoverExceptional(incident.date, exceptionalAuthorization), false);
        assert.equal(f.writes(), 0);
    }
    const f = database(); const repo = createScheduledRepository(f.db, () => 'timestamp');
    assert.equal(await repo.recoverExceptional('2026-10-05', exceptionalAuthorization), false);
    assert.equal(await repo.recoverExceptional(incident.date, 'force=true'), false);
    assert.equal(f.writes(), 0);
});
test('gatilho excepcional usa o mesmo motor uma vez; repetição e dia seguinte são bloqueados', async () => {
    const f = database(); const repo = createScheduledRepository(f.db, () => 'timestamp');
    repo.published = async () => false;
    repo.latest = async () => ({ data: incident.previousDate, titulo: incident.previousTitle });
    repo.reserve = async () => assert.fail('Não criar outra reserva');
    let calls = 0;
    const handler = createScheduledGenerator({ repository: repo, logger: { info() {}, error() {} }, now: () => new Date('2026-10-04T14:00:00Z'),
        generate: async () => { calls++; throw new Error('Falha simulada sem retry'); } });
    const body = { recoveryDate: incident.date, confirmarRecuperacao: true, exceptionalRecoveryAuthorization: exceptionalAuthorization };
    const res = () => ({ set() {}, status(code) { this.code = code; return this; }, json(value) { this.body = value; } });
    const first = res(); await handler({ method: 'POST', body }, first); assert.equal(first.code, 503);
    f.state.status = 'FAILED';
    const second = res(); await handler({ method: 'POST', body }, second); assert.equal(second.code, 409); assert.equal(calls, 1);
    const tomorrow = createScheduledGenerator({ repository: repo, now: () => new Date('2026-10-05T11:00:00Z'), generate: async () => assert.fail('Exceção expirada') });
    const third = res(); await tomorrow({ method: 'POST', body }, third); assert.equal(third.code, 409);
});
