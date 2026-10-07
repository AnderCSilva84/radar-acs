'use strict';
const test = require('node:test'); const assert = require('node:assert/strict');
const { validateAdvertising, publicCampaigns, campaignStatus, createAdvertisingRepository } = require('../api/advertising');
const { createAdminSettings } = require('../api/admin-settings');
const { createApi } = require('../api/handler');
function campaign(overrides = {}) { return { id: 'fixture', advertiserName: 'Mock advertiser', campaignName: 'Fixture only', imageUrl: 'https://example.com/banner.png', targetUrl: 'https://example.com/product', alt: 'Mock banner', startDate: '2026-10-01', endDate: '2026-10-31', position: 'HOME_TOP', active: true, contact: 'PRIVATE_CONTACT', notes: 'PRIVATE_NOTES', ...overrides }; }
test('ajuste e CTA opcionais preservam campanhas antigas e são públicos sem campos privados', () => {
    const legacy = validateAdvertising({ campaigns: [campaign()] }).campaigns[0];
    assert.equal(legacy.imageFit, 'contain'); assert.equal(legacy.ctaText, '');
    const result = publicCampaigns({ campaigns: [campaign({ imageFit: 'cover', ctaText: 'Saiba mais' })] }, '2026-10-05');
    assert.equal(result[0].imageFit, 'cover'); assert.equal(result[0].ctaText, 'Saiba mais');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
});
test('CTA inválido, ajuste arbitrário, alt vazio e blob local não são persistidos', () => {
    for (const patch of [{ imageFit: 'fill' }, { ctaText: '<script>' }, { ctaText: 'a'.repeat(61) }, { alt: '' }, { imageUrl: 'blob:local' }, { imageUrl: 'data:image/png;base64,a' }]) assert.throws(() => validateAdvertising({ campaigns: [campaign(patch)] }));
});
test('campanha pública ativa é whitelist, sem contato, notas ou configurações', () => {
    const result = publicCampaigns({ campaigns: [campaign(), campaign({ id: 'future', startDate: '2026-11-01', endDate: '2026-12-01' }), campaign({ id: 'expired', endDate: '2026-10-02' }), campaign({ id: 'inactive', active: false })] }, '2026-10-04');
    assert.equal(result.length, 1); assert.equal(result[0].targetUrl, 'https://example.com/product');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE|notes|contact|active/);
});
test('estados e limites de data inclusivos são determinísticos', () => {
    assert.equal(campaignStatus(campaign(), '2026-10-01'), 'ATIVA'); assert.equal(campaignStatus(campaign(), '2026-10-31'), 'ATIVA');
    assert.equal(campaignStatus(campaign(), '2026-09-30'), 'AGENDADA'); assert.equal(campaignStatus(campaign(), '2026-11-01'), 'ENCERRADA'); assert.equal(campaignStatus(campaign({ active: false })), 'INATIVA');
});
test('URLs inseguras, token em URL, datas impossíveis e IDs duplicados não são publicados', () => {
    for (const imageUrl of ['http://example.com/x', 'javascript:alert(1)', 'https://user:pass@example.com/banner', 'https://localhost/x', 'https://example.com/x?token=SECRET', 'https://127.0.0.1/x']) assert.throws(() => validateAdvertising({ campaigns: [campaign({ imageUrl })] }));
    assert.throws(() => validateAdvertising({ campaigns: [campaign({ endDate: '2026-02-30' })] })); assert.throws(() => validateAdvertising({ campaigns: [campaign(), campaign()] }));
    assert.deepEqual(publicCampaigns({ campaigns: [campaign({ targetUrl: 'javascript:alert(1)' })] }, '2026-10-04'), []);
});
function response() { return { code: null, body: null, set() {}, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
test('CRUD reutiliza o mesmo ID token+UID; público e outro UID não leem nem escrevem', async () => {
    let reads = 0, writes = 0;
    const admin = createAdminSettings({ repository: { async get() { reads++; return { campaigns: [] }; }, async save() { writes++; } }, verifyIdToken: async value => ({ uid: value }), getAdminUid: () => 'superadmin', validate: validateAdvertising, defaults: () => ({ campaigns: [] }) });
    for (const [header, expected] of [[undefined, 401], ['Bearer other', 403]]) { for (const method of ['GET','PUT']) { const res = response(); await admin({ method, get: () => header, body: { campaigns: [campaign()] } }, res); assert.equal(res.code, expected); } }
    assert.equal(reads, 0); assert.equal(writes, 0);
    const res = response(); await admin({ method: 'PUT', get: () => 'Bearer superadmin', is: () => true, body: { campaigns: [campaign()] } }, res); assert.equal(res.code, 200); assert.equal(writes, 1);
});
test('API pública de campanhas faz uma leitura e sem escrita; campanha administrativa não vaza', async () => {
    let reads = 0; const api = createApi({ advertising: async () => { reads++; return { campaigns: [campaign({ startDate: '2020-01-01', endDate: '2100-12-31' })] }; } }, () => assert.fail('Sem secret para leitura pública'));
    const res = response(); await api({ path: '/api/advertising', method: 'GET' }, res); assert.equal(res.code, 200); assert.equal(reads, 1); assert.doesNotMatch(JSON.stringify(res.body), /PRIVATE/);
});
test('repositório separado não altera perfil nem calendário', async () => {
    let writes = 0; const repo = createAdvertisingRepository({ collection(name) { assert.equal(name, 'settings'); return { doc(id) { assert.equal(id, 'advertising'); return { async get() { return { exists: false }; }, async set() { writes++; } }; } }; } });
    assert.deepEqual(await repo.get(), { campaigns: [] }); await repo.save({ campaigns: [] }); assert.equal(writes, 1);
});
