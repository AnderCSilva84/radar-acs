'use strict';
const { publicUrl } = require('./advertising');
const MEDIA_TYPES = ['RADIO_STREAM', 'EXTERNAL_RADIO', 'SPOTIFY_PLAYLIST'];
function text(value, max = 120, optional = false) {
    if (optional && (value === undefined || value === '')) return '';
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f<>]/.test(value)) throw Error('Mídia inválida.');
    return value.trim();
}
function spotifyUrl(value) {
    const url = new URL(publicUrl(value));
    if (url.hostname !== 'open.spotify.com' || url.port || !/^\/(?:intl-[a-z]{2}\/)?playlist\/[A-Za-z0-9]{22}\/?$/.test(url.pathname) || url.hash) throw Error('Playlist Spotify inválida.');
    return 'https://open.spotify.com/playlist/' + url.pathname.split('/').filter(Boolean).at(-1);
}
function validateMedia(input) {
    if (!input || !Array.isArray(input.media) || input.media.length > 50 || Buffer.byteLength(JSON.stringify(input)) > 100000) throw Error('Mídias inválidas.');
    const media = input.media.map(item => {
        const mediaType = item.mediaType || 'RADIO_STREAM';
        const id = text(item.id, 80);
        if (!MEDIA_TYPES.includes(mediaType) || !/^[a-z0-9][a-z0-9_-]*$/.test(id) || typeof item.enabled !== 'boolean' || typeof item.featured !== 'boolean' || !Number.isInteger(item.sortOrder) || item.sortOrder < 0 || item.sortOrder > 1000) throw Error('Mídia inválida.');
        const value = { id, mediaType, name: text(item.name), description: text(item.description, 400, true), logoUrl: item.logoUrl ? publicUrl(item.logoUrl) : '', tags: (item.tags || []).map(tag => text(tag, 40)), enabled: item.enabled, featured: item.featured, sortOrder: item.sortOrder };
        if (!Array.isArray(item.tags || []) || value.tags.length > 10) throw Error('Tags inválidas.');
        if (mediaType === 'SPOTIFY_PLAYLIST') value.spotifyUrl = spotifyUrl(item.spotifyUrl);
        else {
            if (!['approved', 'pending', 'disabled'].includes(item.usageStatus)) throw Error('Status de uso inválido.');
            if (mediaType === 'RADIO_STREAM') value.streamUrl = publicUrl(item.streamUrl);
            else value.externalUrl = publicUrl(item.externalUrl);
            value.websiteUrl = item.websiteUrl ? publicUrl(item.websiteUrl) : '';
            for (const key of ['city', 'state', 'country']) value[key] = text(item[key], 80, true);
            value.usageStatus = item.usageStatus;
        }
        return value;
    });
    if (new Set(media.map(item => item.id)).size !== media.length) throw Error('ID duplicado.');
    return { media };
}
function publicMedia(input) {
    const result = [];
    for (const item of input?.media || []) {
        try {
            const value = validateMedia({ media: [item] }).media[0];
            if (value.enabled && (value.mediaType === 'SPOTIFY_PLAYLIST' || value.usageStatus === 'approved')) result.push(value);
        } catch { /* Reject unsafe stored entries without exposing diagnostics. */ }
    }
    return result.sort((a, b) => Number(b.featured) - Number(a.featured) || a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}
function createMediaRepository(db) {
    const ref = db.collection('settings').doc('listen');
    return { async get() { const snapshot = await ref.get(); return snapshot.exists ? snapshot.data() : { media: [] }; }, async save(value) { await ref.set(value); } };
}
module.exports = { MEDIA_TYPES, spotifyUrl, validateMedia, publicMedia, createMediaRepository };
