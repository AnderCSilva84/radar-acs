'use strict';

// Guardrails for 3–5 subjects, not an editorial duration target.
// Legacy scripts without individual blocks retain the global guardrails.
function validateAudioScript(generated) {
    const fail = message => {
        const error = new Error(message);
        error.name = 'ValidationError';
        error.code = 'AUDIO_SCRIPT_INVALID';
        error.validation = 'roteiroAlexa.integridade';
        throw error;
    };
    const script = generated.roteiroAlexa || '';
    const count = text => text.trim().split(/\s+/).filter(Boolean).length;
    if (count(script) < 150 || count(script) > 750 || /https?:\/\/|<[^>]+>|【|\[\d+\]/.test(script)) {
        fail('Roteiro deve conter 150–750 palavras, sem URLs ou marcação');
    }
    const news = generated.noticias;
    if (news.some(item => Object.hasOwn(item, 'roteiroAlexa'))) {
        for (const item of news) {
            const block = item.roteiroAlexa;
            if (typeof block !== 'string' || count(block) < 25
                || /(?:\.\.\.|…|\b(?:e|ou|porque|para|com|de))\s*$/i.test(block)) {
                fail('Bloco narrável ausente, anormalmente curto ou com indício de truncamento: ' + item.ordem);
            }
        }
        if (script !== news.map(item => item.roteiroAlexa.trim()).join('\n\n')) {
            fail('Roteiro global diverge dos blocos individuais');
        }
    }
    return { palavras: count(script) };
}

module.exports = { validateAudioScript };
