'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const sample = require('../examples/briefing-teste.json');
const { validateBriefing } = require('../api/validation');
const { publishBriefing } = require('../services/publish-briefing');
const { getBriefingPlayback } = require('../lambda/playback');
const { createApi } = require('../api/handler');
const options = { baseUrl: 'https://example.com/radarApi', token: 'x'.repeat(40) };
const clone = () => JSON.parse(JSON.stringify(sample));

test('Abertura aparece uma vez e roteiro começa pelo conteúdo editorial', () => {
    const ssml = getBriefingPlayback(validateBriefing(clone())).ssml;
    assert.equal(ssml.split('Bom dia, Anderson.').length - 1, 1);
    assert.equal(ssml.split('Está começando o Radar ACS').length - 1, 1);
    assert.match(sample.roteiroAlexa, /^Este é o primeiro briefing/);
    for (const greeting of ['Bom dia, Anderson.', 'Boa tarde, Anderson.', 'Olá, Anderson.', 'Está começando o Radar ACS.', 'Esta comecando o Radar ACS.']) {
        assert.throws(() => validateBriefing({ ...clone(), roteiroAlexa: greeting + ' Conteúdo.' }), /editorial/);
    }
});

test('Publicador valida e envia cinco notícias sem segredo no JSON', async () => {
    let sent;
    const result = await publishBriefing({ ...clone(), RADAR_ADMIN_TOKEN: 'não transportar' }, {
        ...options,
        fetchImpl: async (url, request) => {
            sent = JSON.parse(request.body);
            assert.equal(url, 'https://example.com/radarApi/api/briefing');
            assert.equal(request.headers.Authorization, 'Bearer ' + options.token);
            assert.equal(request.redirect, 'error');
            return { ok: true, json: async () => ({ success: true, id: sample.data, publicado: true }) };
        }
    });
    assert.equal(sent.noticias.length, 5);
    assert.equal(sent.RADAR_ADMIN_TOKEN, undefined);
    assert.deepEqual(result, { success: true, id: sample.data, publicado: true });
});

for (const [name, patch] of [
    ['duas notícias', { noticias: sample.noticias.slice(0, 2) }],
    ['seis notícias', { noticias: [...sample.noticias, { ...sample.noticias[4], ordem: 6 }] }],
    ['roteiro vazio', { roteiroAlexa: '  ' }],
    ['fonte vazia', { noticias: sample.noticias.map((item, i) => i === 0 ? { ...item, fonte: '' } : item) }],
    ['URL vazia', { noticias: sample.noticias.map((item, i) => i === 0 ? { ...item, url: '' } : item) }],
    ['título vazio', { titulo: '' }],
    ['data inválida', { data: '2026-02-30' }]
]) {
    test('Publicador rejeita ' + name + ' antes de enviar', async () => {
        let calls = 0;
        await assert.rejects(publishBriefing({ ...clone(), ...patch }, {
            ...options,
            fetchImpl: async () => { calls++; }
        }));
        assert.equal(calls, 0);
    });
}

test('API não substitui edição válida por payload incompleto', async () => {
    let stored = clone();
    let writes = 0;
    const api = createApi({ save: async value => { writes++; stored = value; } }, () => options.token);
    const response = { set() { return this; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await api({ method: 'POST', path: '/api/briefing', get: () => 'Bearer ' + options.token, is: () => true, body: { ...clone(), noticias: [] } }, response);
    assert.equal(response.code, 400);
    assert.equal(writes, 0);
    assert.deepEqual(stored, sample);
});

test('Publicador trata HTTP de erro e falha de rede sem revelar token', async () => {
    for (const status of [401, 400, 503]) {
        await assert.rejects(publishBriefing(clone(), {
            ...options, fetchImpl: async () => ({ ok: false, status })
        }), error => error.status === status && !error.message.includes(options.token));
    }
    await assert.rejects(publishBriefing(clone(), {
        ...options, fetchImpl: async () => { throw new Error(options.token); }
    }), error => !error.message.includes(options.token));
});
