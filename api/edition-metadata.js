'use strict';
const definitions = { coverId: ['radar', 'acs', 'radar-news', 'eleicoes-2026'], context: ['eleicoes-2026'], editionType: ['special', 'regular'] };
function editionMetadata(input, strict = false) {
    const result = {};
    for (const [key, allowed] of Object.entries(definitions)) {
        if (input[key] === undefined) continue;
        if (allowed.includes(input[key]) || ['context','coverId'].includes(key) && typeof input[key] === 'string' && /^[a-z0-9][a-z0-9_-]{0,79}$/.test(input[key])) result[key] = input[key];
        else if (strict) throw new Error('Metadado inválido: ' + key);
    }
    if (input.specialTitle !== undefined) {
        if (typeof input.specialTitle === 'string' && input.specialTitle.trim() && input.specialTitle.length <= 100 && !/[\u0000-\u001f]/.test(input.specialTitle)) result.specialTitle = input.specialTitle.trim();
        else if (strict) throw new Error('Metadado inválido: specialTitle');
    }
    return result;
}
module.exports = { editionMetadata };
