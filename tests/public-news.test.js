'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApi } = require('../api/handler');
const { publicNews, publicSourceUrl } = require('../api/public-news');
const sample = require('../examples/briefing-teste.json');

async function get(value) {
    let reads = 0;
    const res = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await createApi({ latest: async () => { reads++; return value; } }, () => { throw new Error('GET must not access secrets'); })
        ({ method: 'GET', path: '/api/briefing/latest' }, res);
    return { ...res, reads };
}

test('GET additive news preserves legacy Alexa fields using one existing read', async () => {
    const result = await get(sample);
    assert.equal(result.code, 200);
    assert.equal(result.reads, 1);
    assert.deepEqual(Object.fromEntries(['data', 'titulo', 'roteiroAlexa', 'audioUrl'].map(key => [key, result.body.briefing[key]])),
        { data: sample.data, titulo: sample.titulo, roteiroAlexa: sample.roteiroAlexa, audioUrl: null });
    assert.equal(result.body.briefing.noticias.length, 5);
    assert.equal(result.body.briefing.noticias[0].titulo, sample.noticias[0].titulo);
});

test('public news exposes only existing editorial fields and safe sourceUrl', () => {
    const news = { id: 'a', categoria: 'TI', titulo: 'Título', resumo: 'Resumo', fonte: 'Fonte', url: 'https://example.com/news?utm_source=x&article=2', allowedFacts: ['private'], evidence: ['private'], sourceId: 'private', diagnostics: 'private', prompt: 'private', tokens: 8, custos: 4 };
    assert.deepEqual(publicNews([news]), [{ id: 'a', categoria: 'TI', titulo: 'Título', resumo: 'Resumo', fonte: 'Fonte', sourceUrl: 'https://example.com/news?article=2' }]);
    assert.deepEqual(publicNews([{ titulo: 'Only title' }]), [{ titulo: 'Only title' }]);
});

test('public URLs preserve functional parameters and reject credentials/non HTTP', () => {
    assert.equal(publicSourceUrl('https://example.com/a?id=3&utm_campaign=x&utm_medium=y&fbclid=z#section'), 'https://example.com/a?id=3#section');
    assert.equal(publicSourceUrl('http://example.com/a'), 'http://example.com/a');
    for (const url of ['javascript:alert(1)', 'not a URL', 'https://user:pass@example.com', 'file:///x']) assert.equal(publicSourceUrl(url), null);
});

test('legacy edition without news remains valid with empty additive feed', async () => {
    const { noticias, ...legacy } = sample;
    const result = await get(legacy);
    assert.equal(result.code, 200);
    assert.equal(result.reads, 1);
    assert.deepEqual(result.body.briefing.noticias, []);
    assert.equal(result.body.briefing.roteiroAlexa, sample.roteiroAlexa);
});
