'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { currentDate, fullDate, dailyPlayback } = require('../lambda/daily-greeting');
const { generateRadarEdition, generateAndPublish, buildRequest } = require('../api/generator');
test('motor único mantém alias compatível e é usado por ambos os gatilhos', () => {
    assert.equal(generateRadarEdition, generateAndPublish);
    const source = require('node:fs').readFileSync(require('node:path').join(__dirname, '../api/index.js'), 'utf8');
    assert.equal((source.match(/\(\) => generateRadarEdition\(/g) || []).length, 2);
    assert.match(source, /scheduledRepository.reserve\(date\)/);
});
test('data e dia pt-BR calculados em Belém, incluindo virada UTC', () => {
    assert.equal(currentDate(new Date('2026-10-04T02:00:00Z')), '2026-10-03');
    assert.equal(fullDate('2026-10-04'), 'domingo, 4 de outubro de 2026');
});
test('edição de hoje tem abertura pública e encerramento sem inventar temperatura', () => {
    const result = dailyPlayback({ data: '2026-10-04', roteiroAlexa: 'Informação de hoje.' }, '', new Date('2026-10-04T12:00:00Z')).ssml;
    assert.match(result, /domingo, 4 de outubro de 2026/); assert.doesNotMatch(result, /Belém|Anderson/);
    assert.match(result, /Radar ACS de hoje/); assert.doesNotMatch(result, /graus/);
});
test('edição antiga é anunciada com transparência e sem encerramento de hoje', () => {
    const result = dailyPlayback({ data: '2026-10-03', roteiroAlexa: 'Informação anterior.' }, '', new Date('2026-10-04T12:00:00Z')).ssml;
    assert.match(result, /edição de hoje.*ainda não foi publicada/);
    assert.match(result, /sábado, 3 de outubro de 2026/); assert.doesNotMatch(result, /Radar ACS de hoje/);
});
