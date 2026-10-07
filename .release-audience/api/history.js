'use strict';
const { publicNews } = require('./public-news');
const { editionMetadata } = require('./edition-metadata');

function historyOptions(query = {}) {
    const limit = query.limit === undefined ? 5 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 5 || (query.limit !== undefined && typeof query.limit !== 'string')) {
        throw new Error('limit deve ser um inteiro entre 1 e 5');
    }
    const cursor = query.cursor;
    if (cursor !== undefined && (typeof cursor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cursor)
        || !Number.isFinite(Date.parse(cursor)) || new Date(cursor).toISOString().slice(0, 10) !== cursor)) {
        throw new Error('Cursor inválido');
    }
    return { limit, cursor };
}

async function loadHistory(db, { limit, cursor }) {
    // Existing publication contract: document ID = data, one edition per date.
    // Same indexed ordering as latest; no count query or extra lookahead read.
    let query = db.collection('briefings').where('publicado', '==', true).orderBy('data', 'desc');
    if (cursor) query = query.startAfter(cursor);
    const result = await query.limit(limit).get();
    return result.docs.map(doc => doc.data());
}

function publicEdition(value) {
    const { data, titulo, roteiroAlexa, audioUrl } = value;
    return { data, titulo, roteiroAlexa, audioUrl: audioUrl || null, publicado: true, noticias: publicNews(value.noticias), ...editionMetadata(value) };
}

module.exports = { historyOptions, loadHistory, publicEdition };
