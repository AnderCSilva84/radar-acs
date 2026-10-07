'use strict';
const assert = require('node:assert/strict');
const { generateAndPublish } = require('../api/generator');
const { createScheduledGenerator } = require('../api/scheduled-generator');
const fixture = require('../tests/fixtures/editorial-v2.cjs');
const { rankPool } = require('../api/editorial-pool');
const { defaultSettings } = require('../api/editorial-settings');

// Local-only fixture exercise: every external dependency is injected, no cloud SDK.
async function dryRun() {
    const date = '2026-10-04', settings = defaultSettings();
    settings.events = [{ id: 'eleicoes-2026', title: 'Eleições 2026', date, type: 'special', category: 'brasilMundo', priority: 'headline', coverId: 'eleicoes-2026', active: true, priorityOrder: 0 }];
    const candidates = fixture.pool(date), ranked = rankPool(candidates, settings, [], date);
    const response = fixture.response(fixture.writing(ranked.selected));
    const now = () => new Date('2026-10-04T11:00:00Z');
    let calls = 0, publicationChecks = 0, briefing;
    const logger = { info() {}, error() {}, warn() {} };
    const handler = createScheduledGenerator({ now, logger,
        repository: { published: async () => false, claim: async () => ({acquired:true, runId:"mock",attempt:1}), finishAttempt: async () => Boolean(briefing), latest: async () => ({ titulo: 'Radar ACS — Edição #002', data: '2026-10-03', noticias: [] }) },
        generate: options => generateAndPublish({ ...options, now, logger, apiKey: 'fixture-only', requireObservedEvidence: true,
            getEditorialSettings: async () => settings,
            collectCandidates: async () => ({ candidates, metrics: { externalRequests: 0 } }),
            fetchImpl: async () => { calls++;return { ok: true, json: async () => response }; },
            readSource: async () => { throw new Error('Dry run cannot access web'); },
            publish: async value => { publicationChecks++;briefing = value; }
        })
    });
    const res = { set() { return this; }, status(code) { this.code = code;return this; }, json(body) { this.body = body;return this; } };
    await handler({ method: 'POST' }, res);
    assert.equal(res.code, 200);assert.equal(res.body.status, 'PUBLISHED');assert.equal(calls, 1);assert.equal(publicationChecks, 1);
    assert.equal(briefing.coverId, 'eleicoes-2026');assert.equal(briefing.editionType, 'special');assert.equal(briefing.data, '2026-10-04');assert.equal(briefing.titulo, 'Radar ACS — Edição #003');
    return { dryRun: 'PASS', mockModelCalls: calls, mockPublicationChecks: publicationChecks, openAIReal: 0, webReal: 0, firestoreWrites: 0, context: briefing.context, coverId: briefing.coverId, editionType: briefing.editionType,
        size: briefing.noticias.length, selection: ranked.selected.map(item => ({ title: item.title, category: item.category, priority: item.priority,
            score: item.score, source: item.sourceName, team: item.teamId, reason: item.selectionReason })) };
}
if (require.main === module) dryRun().then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error.message);process.exitCode = 1; });
module.exports = { dryRun };
