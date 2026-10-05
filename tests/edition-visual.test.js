'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { addEditionVisual: addVisual, resolveEditionCover } = require('../lambda/edition-visual');
const addEditionVisual = (request, edition, resolver) => addVisual(request, edition, resolver, false);
const document = require('../lambda/edition-cover-apl.json');
const { getBriefingPlayback } = require('../lambda/playback');

test('APL observability is narrow, safe and checks the final response', () => {
    const { logEditionVisualResponse } = require('../lambda/edition-visual');
    const original = console.info;
    const logs = [];
    console.info = (_, fields) => logs.push(fields);
    try {
        const request = input(true);
        addEditionVisual(request, { coverId: 'radar-news' });
        logEditionVisualResponse({ directives: request.directives, outputSpeech: { ssml: 'PRIVATE_SPEECH' } });
        assert.equal(logs[0].RADAR_APL_SUPPORTED, true);
        assert.equal(logs[0].RADAR_APL_DIRECTIVE_ADDED, true);
        assert.equal(logs[0].RADAR_APL_COVER_ID, 'radar-news');
        assert.equal(logs[1].RADAR_APL_DIRECTIVE_COUNT, 1);
        assert.equal(logs[1].RADAR_APL_RENDERDOCUMENT_FINAL, true);
        logEditionVisualResponse({ directives: [] });
        assert.equal(logs[2].RADAR_APL_RENDERDOCUMENT_FINAL, false);
        const unsupported = input(false);
        addEditionVisual(unsupported, {});
        assert.equal(logs[3].RADAR_APL_SUPPORTED, false);
        assert.equal(unsupported.directives.length, 0);
        addEditionVisual(input(true), {}, () => { throw new TypeError('Authorization Bearer SECRET OPENAI_API_KEY=KEY cookie=COOKIE'); });
        assert.match(logs[4].RADAR_APL_ERROR, /TypeError.*RESOLVER/);
        assert.doesNotMatch(JSON.stringify(logs), /SECRET|COOKIE|PRIVATE_SPEECH|Authorization|OPENAI_API_KEY/);
        console.info = () => { throw new Error('logger unavailable'); };
        assert.doesNotThrow(() => addEditionVisual(input(true), {}));
        assert.doesNotThrow(() => logEditionVisualResponse({ directives: [] }));
    } finally { console.info = original; }
});

function input(supported) {
    const directives = [];
    return { directives, requestEnvelope: { context: { System: { device: { supportedInterfaces: supported ? { 'Alexa.Presentation.APL': {} } : {} } } } }, responseBuilder: { addDirective(value) { directives.push(value); } } };
}

test('Minimal cover preserves text fallback under the full-screen image', () => {
 const request = input(true);
 addVisual(request, {coverId:'eleicoes-2026',titulo:'Radar ACS #003',data:'2026-10-04',specialTitle:'Elei??es 2026'});
 const directive=request.directives[0], items=directive.document.mainTemplate.items[0].items;
 assert.equal(directive.document.version,'1.0');
 assert.deepEqual(items.map(item=>item.type),['Frame','Text','Text','Text','Image']);
 assert.equal(items[1].text,'RADAR ACS');
 assert.equal(items.at(-1).position,'absolute');
 assert.equal(items.at(-1).width,'100%');
 assert.equal(items.at(-1).height,'100%');
 assert.equal(items.at(-1).scale,'best-fill');
 assert.match(directive.datasources.edition.metadata,/#003.*2026-10-04/);
 assert.equal(directive.datasources.edition.specialTitle,'Elei??es 2026');
 assert.doesNotMatch(JSON.stringify(directive.document),/TESTE VISUAL|imports|#003/);
});

test('Viewport logs use actual technical fields and do not infer a device profile', () => {
    const original = console.info; const logs = [];
    console.info = (_, fields) => logs.push(fields);
    try {
        const request = input(true);
        request.requestEnvelope.context.System.device.deviceId = 'PRIVATE_DEVICE';
        request.requestEnvelope.context.System.device.supportedInterfaces['Alexa.Presentation.APL'] = { runtime: { maxVersion: '2024.3', secret: 'PRIVATE_RUNTIME' }, token: 'PRIVATE_TOKEN' };
        request.requestEnvelope.viewport = { width: 960, height: 480, pixelWidth: 960, pixelHeight: 480, dpi: 160, shape: 'RECTANGLE', mode: 'HUB', userId: 'PRIVATE_USER' };
        addVisual(request, {});
        assert.equal(logs[0].RADAR_APL_MAX_VERSION, '2024.3');
        for (const [marker, value] of [['WIDTH', 960], ['HEIGHT', 480], ['PIXEL_WIDTH', 960], ['PIXEL_HEIGHT', 480], ['DPI', 160], ['SHAPE', 'RECTANGLE'], ['MODE', 'HUB']]) assert.equal(logs[0]['RADAR_VIEWPORT_' + marker], value);
        assert.equal(logs[0].RADAR_VIEWPORT_PROFILE, 'INDETERMINADO');
        request.requestEnvelope.viewport.profile = 'hubLandscapeSmall';
        addVisual(request, {});
        assert.equal(logs[1].RADAR_VIEWPORT_PROFILE, 'hubLandscapeSmall');
        assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_|deviceId|userId|token|secret/);
        const missing = input(false); addVisual(missing, {});
        assert.equal(logs[2].RADAR_APL_MAX_VERSION, 'AUSENTE');
        assert.equal(logs[2].RADAR_VIEWPORT_WIDTH, 'AUSENTE');
        assert.equal(missing.directives.length, 0);
        request.requestEnvelope.viewport = { pixelWidth: 'Bearer PRIVATE_NUMBER', dpi: Infinity, shape: 'PRIVATE_SHAPE', mode: 'PRIVATE_MODE', profile: 'PRIVATE_PROFILE' };
        addVisual(request, {});
        assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);
        assert.equal(logs[3].RADAR_VIEWPORT_PROFILE, 'INDETERMINADO');
    } finally { console.info = original; }
});
for (const [id, asset] of [['eleicoes-2026', 'capa-eleicoes-2026.png'], ['radar-news', 'capa-radar.png'], ['radar', 'capa-radar-default.png'], ['acs', 'capa-acs-default.png']]) {
    test('APL cover registry: ' + id, () => {
        const request = input(true);
        addEditionVisual(request, { coverId: id, titulo: 'Radar ACS', data: '2026-10-04' });
        assert.equal(request.directives[0].type, 'Alexa.Presentation.APL.RenderDocument');
        assert.equal(request.directives[0].datasources.edition.coverUrl, 'https://radar-acs.web.app/' + asset);
    });
}
test('No-screen device preserves identical speech and has no visual directive', () => {
    const briefing = require('../examples/briefing-teste.json');
    const before = getBriefingPlayback(briefing);
    const request = input(false); addEditionVisual(request, briefing);
    assert.deepEqual(getBriefingPlayback(briefing), before);
    assert.equal(request.directives.length, 0);
});
test('Missing or unknown cover falls back to Radar', () => {
    assert.equal(resolveEditionCover({}).id, 'radar');
    assert.equal(resolveEditionCover({ coverId: '__proto__' }).id, 'radar');
});
test('Resolver failure, unsafe URL and absent briefing never block speech', () => {
    const request = input(true);
    addEditionVisual(request, {}, () => { throw new Error('unavailable'); });
    addEditionVisual(request, {}, () => ({ alexaUrl: 'https://radar-acs.web.app/image?token=SECRET' }));
    addEditionVisual(request, null);
    assert.equal(request.directives.length, 0);
});
test('APL document is self-contained, responsive and preserves image composition', () => {
    assert.equal(document.type, 'APL'); assert.equal(document.version, '1.0');
    const container = document.mainTemplate.items[0];
    assert.equal(container.width, '100%'); assert.equal(container.height, '100%');
    assert.equal(container.items.at(-1).scale, 'best-fill');
    assert.deepEqual(document.mainTemplate.parameters, ['edition']);
    assert.equal(require('../skill.json').manifest.apis.custom.interfaces[0].type, 'ALEXA_PRESENTATION_APL');
});
