'use strict';
function cleanSourceUrl(value) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Fonte HTTPS pública sem credenciais exigida');
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(?:fbclid|gclid|msclkid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
    return url.href;
}
function isSpecificSource(value) {
    try {
        const url = new URL(cleanSourceUrl(value));
        const path = url.pathname.replace(/\/+$/, '') || '/';
        return path !== '/' && !/^\/(?:changelog|blog|blogs|news|releases?|category|categories)$/i.test(path)
            && !/\/category\//i.test(path) && !/^\/blogs\/(?:aws|developer|devops)$/i.test(path);
    } catch { return false; }
}
function assertSpecificSource(value) {
    if (!isSpecificSource(value)) {
        const error = new Error('SOURCE_URL_NOT_SPECIFIC: homepage ou página genérica de categoria/listagem');
        error.code = 'SOURCE_URL_NOT_SPECIFIC'; error.stage = 'FACTUAL_EVIDENCE'; throw error;
    }
    return cleanSourceUrl(value);
}
module.exports = { cleanSourceUrl, isSpecificSource, assertSpecificSource };
