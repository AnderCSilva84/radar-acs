'use strict';
const config = require('./generator-config.json');
function estimatedDurationSeconds(script, wordsPerMinute = config.narrationWordsPerMinute) {
    if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) throw new Error('Ritmo de narração inválido');
    if (typeof script !== 'string') throw new Error('Roteiro inválido');
    const words = script.trim().split(/\s+/).filter(Boolean).length;
    return Math.ceil(words * 60 / wordsPerMinute);
}
module.exports = { estimatedDurationSeconds };
