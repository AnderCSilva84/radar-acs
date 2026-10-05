'use strict';
const slots = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'HISTORY', 'SIDEBAR', 'SPECIAL_SPONSOR'];
function adDate(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Belem' }).format(now); }
function campaignStatus(campaign, date = adDate()) {
    return !campaign.active ? 'INATIVA' : campaign.startDate > date ? 'AGENDADA' : campaign.endDate < date ? 'ENCERRADA' : 'ATIVA';
}
function text(value, max = 120, optional = false) {
    if (optional && (value === undefined || value === '')) return '';
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f<>]/.test(value)) throw Error('Campanha inválida.');
    return value.trim();
}
function publicUrl(value) {
    const url = new URL(text(value, 2000));
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost' || /^(?:127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\[|\]/.test(url.hostname)
        || [...url.searchParams.keys()].some(key => /^(?:token|access_token|id_token|refresh_token|api_?key|key|secret|password|authorization|auth|credential|signature|sig|session|x-goog-.+|x-amz-.+)$/i.test(key))) throw Error('URL pública HTTPS necessária.');
    return url.href;
}
function validateAdvertising(input) {
    if (!input || !Array.isArray(input.campaigns) || input.campaigns.length > 50 || Buffer.byteLength(JSON.stringify(input)) > 100000) throw Error('Campanhas inválidas.');
    const campaigns = input.campaigns.map(campaign => {
        const id = text(campaign.id, 80);
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(id) || !slots.includes(campaign.position) || typeof campaign.active !== 'boolean') throw Error('Campanha inválida.');
        for (const date of [campaign.startDate, campaign.endDate]) if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Período inválido.');
        if (campaign.endDate < campaign.startDate) throw Error('Período inválido.');
        return { id, advertiserName: text(campaign.advertiserName), campaignName: text(campaign.campaignName), imageUrl: publicUrl(campaign.imageUrl), targetUrl: publicUrl(campaign.targetUrl), alt: text(campaign.alt, 200), startDate: campaign.startDate, endDate: campaign.endDate, position: campaign.position, active: campaign.active,
            contact: text(campaign.contact, 100, true), notes: text(campaign.notes, 400, true) };
    });
    if (new Set(campaigns.map(c => c.id)).size !== campaigns.length) throw Error('ID duplicado.');
    return { campaigns };
}
function publicCampaigns(input, date = adDate()) {
    const result = [];
    for (const campaign of input?.campaigns || []) {
        try {
            const value = validateAdvertising({ campaigns: [campaign] }).campaigns[0];
            if (campaignStatus(value, date) !== 'ATIVA') continue;
            const { id, advertiserName, campaignName, imageUrl, targetUrl, alt, startDate, endDate, position } = value;
            result.push({ id, advertiserName, campaignName, imageUrl, targetUrl, alt, startDate, endDate, position });
        } catch { /* Never expose invalid stored campaigns. */ }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}
function createAdvertisingRepository(db) {
    const ref = db.collection('settings').doc('advertising');
    return { async get() { const snapshot = await ref.get(); return snapshot.exists ? snapshot.data() : { campaigns: [] }; }, async save(value) { await ref.set(value); } };
}
module.exports = { slots, adDate, campaignStatus, validateAdvertising, publicCampaigns, createAdvertisingRepository };
