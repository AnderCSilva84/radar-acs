'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultSettings, validateSettings, dailyEditorial, loadEditorial, createEditorialRepository } = require('../api/editorial-settings');
const { createAdminSettings } = require('../api/admin-settings');
const { buildRequest, generateRadarEdition } = require('./helpers/legacy-generator');
const fixture = require('./fixtures/collected-news-unconfirmed.json');
const date = '2026-10-03';
function event(overrides = {}) { return { id: 'cirio-2026', title: 'Círio de Nazaré 2026', date, type: 'local', category: 'brasilMundo', priority: 'headline', coverId: 'cirio-2026', active: true, priorityOrder: 0, ...overrides }; }
test('perfil compacto representa high/off e time ativo, sem cotas fixas', () => {
    const settings = defaultSettings(); settings.editorial.futebol = 'off';
    const request = buildRequest(date, [], [], {}, dailyEditorial(settings, date).prompt);
    assert.match(request.input, /"tecnologiaIA":"high"/); assert.match(request.input, /"futebol":"off"/);
    assert.match(request.input, /off: não pesquise deliberadamente/);
    assert.doesNotMatch(request.input, /Botafogo/);
    settings.editorial.futebol = 'high';
    assert.match(dailyEditorial(settings, date).prompt, /Botafogo/);
    settings.followedTeams[0].active = false; assert.doesNotMatch(dailyEditorial(settings, date).prompt, /Botafogo/);
});
test('headline sem capa usa padrão, e tipo editorial é aceito', () => {
    const settings = defaultSettings(); settings.appearance.cover = 'acs'; settings.events = [event({ coverId: '', type: 'editorial' })];
    assert.equal(dailyEditorial(validateSettings(settings), date).context.coverId, 'acs');
});
test('falha do calendário preserva perfil válido e gera regular; falha do perfil usa default', async () => {
    const settings = defaultSettings(); settings.editorial.tecnologiaIA = 'low'; settings.events = [event({ date: 'invalid' })];
    const warnings = []; const logger = { warn: (_, value) => warnings.push(value.code) };
    const result = await loadEditorial(async () => settings, date, logger);
    assert.equal(result.context.editionType, 'regular'); assert.match(result.prompt, /"tecnologiaIA":"low"/); assert.deepEqual(warnings, ['CALENDAR_FALLBACK']);
    settings.events = []; settings.editorial.tecnologiaIA = 'invalid';
    assert.match((await loadEditorial(async () => settings, date, logger)).prompt, /"tecnologiaIA":"high"/);
    assert.ok(warnings.includes('PROFILE_FALLBACK'));
});
test('headline determina metadados, empates são estáveis e evento não elimina perfil', () => {
    const settings = defaultSettings(); settings.events = [event({ id: 'outro', priorityOrder: 2 }), event(), event({ id: 'amanha', date: '2026-10-04' }), event({ id: 'inativo', active: false })];
    const day = dailyEditorial(validateSettings(settings), date);
    assert.deepEqual(day.context, { editionType: 'special', context: 'cirio-2026', specialTitle: 'Círio de Nazaré 2026', coverId: 'cirio-2026' });
    assert.match(day.prompt, /tecnologiaIA/); assert.doesNotMatch(day.prompt, /amanha|inativo/);
    assert.equal(dailyEditorial(settings, '2026-10-05').context.editionType, 'regular');
});
test('sem configuração e falha de leitura degradam sem calendário especial ou segredos no warning', async () => {
    const logs = []; const logger = { warn: (...args) => logs.push(args) };
    assert.equal((await loadEditorial(async () => null, date, logger)).context.editionType, 'regular');
    assert.equal((await loadEditorial(async () => { throw new Error('Bearer SECRET'); }, date, logger)).context.editionType, 'regular');
    assert.doesNotMatch(JSON.stringify(logs), /Bearer|SECRET/); assert.equal(logs.length, 1);
});
test('repositório usa um documento, uma leitura e uma escrita por salvar', async () => {
    let reads = 0, writes = 0;
    const repository = createEditorialRepository({ collection(name) { assert.equal(name, 'settings'); return { doc(id) { assert.equal(id, 'editorial'); return { async get() { reads++; return { exists: false }; }, async set(value) { writes++; assert.deepEqual(value, defaultSettings()); } }; } }; } });
    assert.equal(await repository.get(), null); await repository.save(defaultSettings()); assert.equal(reads, 1); assert.equal(writes, 1);
});
test('validação rejeita datas inválidas, duplicação de IDs, payload excessivo e prioridades desconhecidas', () => {
    for (const mutate of [s => { s.editorial.futebol = 'urgent'; }, s => { s.events = [event({ date: '2026-02-30' })]; }, s => { s.events = [event(), event()]; }, s => { s.followedTeams[0].active = 'yes'; }, s => { s.events = Array(101).fill(event()); }]) {
        const s = defaultSettings(); mutate(s); assert.throws(() => validateSettings(s));
    }
});
function req(method = 'GET', header, body) { return { method, body, get: () => header, is: () => true }; }
function res() { return { code: null, body: null, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
test('admin exige token válido e UID exato para leitura e escrita; não aceita RADAR token', async () => {
    let writes = 0, reads = 0;
    const handler = createAdminSettings({ repository: { async get() { reads++; return null; }, async save() { writes++; } }, verifyIdToken: async (token, revoked) => { assert.equal(revoked, true); if (token !== 'valid' && token !== 'other') throw Error('secret'); return { uid: token === 'valid' ? 'superadmin' : 'other' }; }, getAdminUid: () => 'superadmin' });
    for (const [header, expected] of [[undefined, 401], ['Bearer RADAR_ADMIN_TOKEN', 401], ['Bearer other', 403]]) {
        for (const method of ['GET', 'PUT']) { const response = res(); await handler(req(method, header, defaultSettings()), response); assert.equal(response.code, expected); }
    }
    assert.equal(reads, 0); assert.equal(writes, 0);
    const get = res(); await handler(req('GET', 'Bearer valid'), get); assert.equal(get.code, 200);
    const put = res(); await handler(req('PUT', 'Bearer valid', defaultSettings()), put); assert.equal(put.code, 200); assert.equal(writes, 1);
    const failClosed = createAdminSettings({ repository: {}, verifyIdToken: async () => ({ uid: 'superadmin' }), getAdminUid: () => '' });
    const blocked = res(); await failClosed(req('GET', 'Bearer valid'), blocked); assert.equal(blocked.code, 403);
});
for (const mode of ['headline', 'normal', 'failure']) test('pipeline mock com configuração: ' + mode + ', mantém uma chamada e um publish', async () => {
    let reads = 0, calls = 0, writes = 0, saved, warning = 0;
    const settings = defaultSettings(); if (mode === 'headline') settings.events = [event()];
    await generateRadarEdition({ apiKey: 'mock-only-key', now: () => new Date(date + 'T12:00:00Z'), finalTitle: 'Radar ACS — Edição #999',
        getEditorialSettings: async () => { reads++; if (mode === 'failure') throw Error('secret'); return settings; },
        fetchImpl: async (_, request) => { calls++; assert.match(JSON.parse(request.body).input, /PERFIL EDITORIAL/); return { ok: true, json: async () => structuredClone(fixture) }; },
        publish: async value => { writes++; saved = value; }, logger: { info() {}, warn() { warning++; } } });
    assert.equal(reads, 1); assert.equal(calls, 1); assert.equal(writes, 1);
    assert.equal(saved.editionType, mode === 'headline' ? 'special' : 'regular');
    if (mode === 'headline') { assert.equal(saved.context, 'cirio-2026'); assert.equal(saved.specialTitle, 'Círio de Nazaré 2026'); assert.equal(saved.coverId, 'cirio-2026'); }
    assert.equal(warning, mode === 'failure' ? 1 : 0);
});
