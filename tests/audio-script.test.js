'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateAudioScript } = require('../api/audio-script');
function briefing(size, words = 60) {
    const noticias = Array.from({ length: size }, (_, i) => ({ ordem: i + 1, roteiroAlexa: 'Informação '.repeat(words - 1) + 'completa.' }));
    return { noticias, roteiroAlexa: noticias.map(n => n.roteiroAlexa).join('\n\n') };
}
test('duração conservadora aceita 3–5 blocos completos sem mínimo proporcional', () => {
    for (const size of [3, 4, 5]) assert.doesNotThrow(() => validateAudioScript(briefing(size)));
});
test('rejeita bloco vazio mesmo com roteiro global longo', () => {
    const g = briefing(4); g.noticias[1].roteiroAlexa = '';
    assert.throws(() => validateAudioScript(g), { code: 'AUDIO_SCRIPT_INVALID' });
});
test('rejeita bloco anormalmente curto ou indicação explícita de truncamento', () => {
    for (const ending of ['curto.', 'Informação '.repeat(30) + '...', 'Informação '.repeat(30) + 'porque']) {
        const g = briefing(4); g.noticias[0].roteiroAlexa = ending;
        g.roteiroAlexa = g.noticias.map(n => n.roteiroAlexa).join('\n\n');
        assert.throws(() => validateAudioScript(g), { code: 'AUDIO_SCRIPT_INVALID' });
    }
});
test('rejeita roteiro global curto, excessivo ou divergente', () => {
    for (const g of [briefing(3, 30), briefing(5, 160), { ...briefing(4), roteiroAlexa: briefing(4).roteiroAlexa + ' Outra frase.' }]) {
        assert.throws(() => validateAudioScript(g), { code: 'AUDIO_SCRIPT_INVALID' });
    }
});
