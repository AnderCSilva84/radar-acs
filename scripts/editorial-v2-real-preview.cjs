'use strict';
// Local read-only test harness. No publication, database write or storage client.
const fs = require('node:fs');
const { createCollector } = require('../api/editorial-collector');
const { rankPool, sourcePlan } = require('../api/editorial-pool');
const { validateSettings, categories } = require('../api/editorial-settings');
function decode(v) {
    if (v.mapValue) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
    if (v.arrayValue) return (v.arrayValue.values || []).map(decode);
    if ('integerValue' in v) return Number(v.integerValue);
    for (const k of ['stringValue', 'booleanValue', 'doubleValue', 'timestampValue']) if (k in v) return v[k];
    return null;
}
async function main(input) {
    const report = { firestoreWrites: 0, storageWrites: 0, openAiCalls: 0, webSearch: 0, published: false };
    const doc = await fetch('https://firestore.googleapis.com/v1/projects/radar-acs/databases/(default)/documents/settings/editorial', { headers: { Authorization: 'Bearer ' + input.accessToken } });
    if (!doc.ok) throw new Error('PROFILE_HTTP_' + doc.status);
    const settings = validateSettings(decode({ mapValue: { fields: (await doc.json()).fields } }));
    input.accessToken = null;
    const latestResponse = await fetch('https://radar-acs.web.app/api/briefing/latest');
    if (!latestResponse.ok) throw new Error('LATEST_HTTP_' + latestResponse.status);
    const latest = await latestResponse.json();
    report.latestBefore = latest;
    report.profile = settings;
    const date = require('../api/generator').editorialDate(new Date());
    report.date = date;
    const traces = [];
    const tracedFetch = async (url, options) => {
        const trace = { url, status: null }; traces.push(trace);
        try { const response = await fetch(url, options); trace.status = response.status; trace.contentType = response.headers.get('content-type'); return response; }
        catch (error) { trace.error = error.name; trace.cause = error.cause?.code || error.cause?.message || null; throw error; }
    };
    const collected = await createCollector({ fetchImpl: tracedFetch })({ settings, date });
    const latestEdition = latest.briefing || latest.data || latest;
    const recent = (latestEdition.noticias || []).map(n => ({ titulo: n.titulo, url: n.sourceUrl || n.url }));
    const ranked = rankPool(collected.candidates, settings, recent, date);
    Object.assign(report, { collected, ranked, traces, sourcePlan: sourcePlan(settings), categories, firestoreReadsEstimated: 2 });
    fs.writeFileSync('.local-editorial-v2-real-collection.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ date, profile: settings, latest: { title: latestEdition.titulo, date: latestEdition.data }, metrics: collected.metrics, diagnostics: ranked.diagnostics, selected: ranked.selected, traces }, null, 2));
}
let text = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', chunk => text += chunk);
process.stdin.on('end', () => { const input = JSON.parse(text); text = ''; main(input).catch(e => { console.error(JSON.stringify({ error: e.name, code: e.code || null, message: e.message })); process.exitCode = 1; }); });
