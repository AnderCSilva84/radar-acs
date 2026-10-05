'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { historyOptions, loadHistory } = require('../api/history');
const { createApi } = require('../api/handler');
const sample = require('../examples/briefing-teste.json');

async function call(repository, query = {}) {
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await createApi(repository, () => { throw new Error('History cannot access secrets'); })({ method: 'GET', path: '/api/briefing/history', query }, res);
    return res;
}

test('history bounded page uses existing indexed collection and one query without writes', async () => {
    const operations = [];
    const query = Object.fromEntries(['where', 'orderBy', 'startAfter', 'limit'].map(method => [method, (...args) => { operations.push([method, ...args]); return query; }]));
    query.get = async () => { operations.push(['get']); return { docs: [{ data: () => sample }] }; };
    const db = { collection: name => { operations.push(['collection', name]); return query; } };
    assert.deepEqual(await loadHistory(db, historyOptions({ limit: '5', cursor: '2026-10-03' })), [sample]);
    assert.deepEqual(operations, [['collection', 'briefings'], ['where', 'publicado', '==', true], ['orderBy', 'data', 'desc'], ['startAfter', '2026-10-03'], ['limit', 5], ['get']]);
});

test('history cursor is last returned date without extra lookahead', async () => {
    let calls = 0;
    const editions = [3, 2, 1].map(day => ({ ...sample, data: `2026-10-0${day}` }));
    const result = await call({ history: async options => { calls++; assert.deepEqual(options, { limit: 3, cursor: undefined }); return editions; } }, { limit: '3' });
    assert.equal(result.code, 200); assert.equal(calls, 1);
    assert.equal(result.body.nextCursor, '2026-10-01');
    assert.deepEqual(result.body.editions.map(item => item.data), ['2026-10-03', '2026-10-02', '2026-10-01']);
});

test('history projects complete public edition and excludes internal fields', async () => {
    const privateEdition = { ...sample, diagnostics: 'private', tokens: 20, prompt: 'private', noticias: sample.noticias.map(item => ({ ...item, evidence: ['private'], allowedFacts: ['private'], sourceEvidence: 'private' })) };
    const result = await call({ history: async () => [privateEdition] });
    const edition = result.body.editions[0];
    assert.equal(edition.roteiroAlexa, sample.roteiroAlexa);assert.equal(edition.noticias.length, 5);assert.equal(edition.publicado, true);
    assert.deepEqual(Object.keys(edition), ['data', 'titulo', 'roteiroAlexa', 'audioUrl', 'publicado', 'noticias']);
    assert.ok(!JSON.stringify(edition).includes('private'));
    assert.equal(result.body.nextCursor, null);
});

test('history handles empty and unavailable database safely', async () => {
    assert.deepEqual((await call({ history: async () => [] })).body, { success: true, editions: [], nextCursor: null });
    const result = await call({ history: async () => { throw new Error('database private details'); } });
    assert.equal(result.code, 503);assert.ok(!JSON.stringify(result.body).includes('private'));
});

test('history rejects oversized pages and malformed cursors before any query', async () => {
    let reads = 0;
    const repository = { history: async () => { reads++; return []; } };
    for (const query of [{ limit: '6' }, { limit: '0' }, { limit: '-1' }, { limit: '1.5' }, { limit: ['5'] }, { cursor: '2026-02-30' }, { cursor: '../x' }, { cursor: ['2026-10-03'] }]) {
        assert.equal((await call(repository, query)).code, 400);
    }
    assert.equal(reads, 0);
});
