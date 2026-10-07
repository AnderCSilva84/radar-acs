'use strict';
const slots = ['HOME_TOP', 'HOME_MIDDLE', 'HOME_BOTTOM', 'HISTORY', 'SIDEBAR', 'SPECIAL_SPONSOR'];
function adDate(now = new Date()) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Belem' }).format(now); }
function campaignStatus(campaign, date = adDate()) {
    if (campaign.publicationState === 'draft') return 'RASCUNHO';
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
    const advertisers = input.advertisers === undefined ? undefined : validateAdvertisers(input.advertisers);
    const campaigns = input.campaigns.map(campaign => {
        const draft = campaign.publicationState === 'draft';
        if (campaign.publicationState !== undefined && !['draft', 'published'].includes(campaign.publicationState)) throw Error('Estado de publicação inválido.');
        if (draft && campaign.active) throw Error('Rascunho não pode estar ativo.');
        if (campaign.priority !== undefined && ![0, 1, 2].includes(campaign.priority)) throw Error('Prioridade inválida.');
        if (campaign.advertiserId !== undefined && (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(campaign.advertiserId) || !advertisers?.some(item => item.id === campaign.advertiserId))) throw Error('Anunciante inválido.');
        const id = text(campaign.id, 80);
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(id) || !slots.includes(campaign.position) || typeof campaign.active !== 'boolean') throw Error('Campanha inválida.');
        for (const date of [campaign.startDate, campaign.endDate]) if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw Error('Período inválido.');
        if (campaign.endDate < campaign.startDate) throw Error('Período inválido.');
        if (campaign.imageFit !== undefined && !['cover', 'contain'].includes(campaign.imageFit)) throw Error('Ajuste da imagem inválido.');
        return { id, advertiserName: text(campaign.advertiserName), campaignName: text(campaign.campaignName), imageUrl: draft && !campaign.imageUrl ? '' : publicUrl(campaign.imageUrl), targetUrl: draft && !campaign.targetUrl ? '' : publicUrl(campaign.targetUrl), alt: text(campaign.alt, 200, draft), startDate: campaign.startDate, endDate: campaign.endDate, position: campaign.position, active: campaign.active,
            ...(campaign.publicationState !== undefined ? { publicationState: campaign.publicationState } : {}), ...(campaign.advertiserId ? { advertiserId: campaign.advertiserId } : {}), ...(campaign.priority !== undefined ? { priority: campaign.priority } : {}),
            imageFit: campaign.imageFit || 'contain', ctaText: text(campaign.ctaText, 60, true), contact: text(campaign.contact, 100, true), notes: text(campaign.notes, 400, true) };
    });
    if (new Set(campaigns.map(c => c.id)).size !== campaigns.length) throw Error('ID duplicado.');
    return { campaigns, ...(advertisers !== undefined ? { advertisers } : {}) };
}
function validateAdvertisers(input) {
    if (!Array.isArray(input) || input.length > 50) throw Error('Anunciantes inválidos.');
    const values = input.map(item => {
        const id = text(item.id, 80);
        if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw Error('Anunciante inválido.');
        const email = text(item.email, 120, true);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Email inválido.');
        return { id, name: text(item.name), company: text(item.company, 120, true), contact: text(item.contact, 100, true), whatsapp: text(item.whatsapp, 40, true), email, notes: text(item.notes, 400, true) };
    });
    if (new Set(values.map(item => item.id)).size !== values.length) throw Error('Anunciante duplicado.');
    return values;
}
function publicCampaigns(input, date = adDate()) {
    const result = [];
    for (const campaign of input?.campaigns || []) {
        try {
            const value = validateAdvertising({ campaigns: [campaign], ...(input.advertisers ? { advertisers: input.advertisers } : {}) }).campaigns[0];
            if (campaignStatus(value, date) !== 'ATIVA') continue;
            const { id, advertiserName, campaignName, imageUrl, targetUrl, alt, startDate, endDate, position } = value;
            result.push({ id, advertiserName, campaignName, imageUrl, targetUrl, alt, startDate, endDate, position, imageFit: value.imageFit, ctaText: value.ctaText, ...(value.priority !== undefined ? { priority: value.priority } : {}) });
        } catch { /* Never expose invalid stored campaigns. */ }
    }
    return result.sort((a, b) => a.id.localeCompare(b.id, 'en'));
}
function createAdvertisingRepository(db) {
    const ref = db.collection('settings').doc('advertising');
    return { async get() { const snapshot = await ref.get(); return snapshot.exists ? snapshot.data() : { campaigns: [] }; }, async save(value) { await ref.set(value); } };
}
module.exports = { slots, adDate, campaignStatus, validateAdvertising, publicCampaigns, createAdvertisingRepository, publicUrl };
