'use strict';
const categories = {
    tecnologiaIA: 'Tecnologia & IA', desenvolvimento: 'Desenvolvimento',
    concursosCarreira: 'Concursos & carreira', oportunidades: 'Oportunidades',
    brasilMundo: 'Brasil & Mundo', economia: 'Economia', futebol: 'Futebol', clima: 'Clima'
};
const priorities = ['high', 'medium', 'low', 'off'];
const eventPriorities = ['normal', 'high', 'headline'];
const eventTypes = ['special', 'sports', 'local', 'national', 'editorial'];
const defaultSettings = () => ({
    editorial: Object.fromEntries(Object.keys(categories).map(key => [key, ['tecnologiaIA', 'desenvolvimento', 'concursosCarreira', 'oportunidades'].includes(key) ? 'high' : 'medium'])),
    appearance: { cover: 'radar', density: 'comfortable' },
    followedTeams: [{ id: 'botafogo', name: 'Botafogo', sport: 'football', country: 'BR', active: true }],
    events: []
});
function invalid() { throw Object.assign(new Error('Configuração editorial inválida.'), { code: 'INVALID_SETTINGS' }); }
function text(value, max = 100) {
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f<>]/.test(value)) invalid();
    return value.trim();
}
function identifier(value) { const id = text(value, 80); if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) invalid(); return id; }
function validateSettings(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || Buffer.byteLength(JSON.stringify(input)) > 65536) invalid();
    const result = defaultSettings();
    for (const key of Object.keys(categories)) {
        if (!priorities.includes(input.editorial?.[key])) invalid();
        result.editorial[key] = input.editorial[key];
    }
    if (!['radar', 'acs', 'radar-news'].includes(input.appearance?.cover) || !['comfortable', 'compact'].includes(input.appearance?.density)) invalid();
    result.appearance = { cover: input.appearance.cover, density: input.appearance.density };
    if (!Array.isArray(input.followedTeams) || input.followedTeams.length > 20 || !Array.isArray(input.events) || input.events.length > 100) invalid();
    result.followedTeams = input.followedTeams.map(team => {
        if (typeof team.active !== 'boolean') invalid();
        const value = { id: identifier(team.id), name: text(team.name), sport: text(team.sport), country: text(team.country), active: team.active };
        if (team.catalogId) value.catalogId = identifier(team.catalogId);
        if (team.provider || team.providerTeamId) {
            if (team.provider !== 'football-data' || !/^\d{1,10}$/.test(String(team.providerTeamId || ''))) invalid();
            value.provider = team.provider;
            value.providerTeamId = String(team.providerTeamId);
        }
        return value;
    });
    result.events = input.events.map(event => {
        if (!eventTypes.includes(event.type) || !Object.hasOwn(categories, event.category) || !eventPriorities.includes(event.priority) || typeof event.active !== 'boolean') invalid();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date) || !Number.isFinite(Date.parse(event.date)) || new Date(event.date).toISOString().slice(0, 10) !== event.date) invalid();
        const value = { id: identifier(event.id), title: text(event.title), date: event.date, type: event.type, category: event.category, priority: event.priority, active: event.active, priorityOrder: event.priorityOrder ?? 0 };
        if (!Number.isInteger(value.priorityOrder) || value.priorityOrder < 0 || value.priorityOrder > 1000) invalid();
        for (const key of ['coverId', 'teamId']) if (event[key]) value[key] = identifier(event[key]);
        for (const key of ['description', 'competition', 'location']) if (event[key]) value[key] = text(event[key], key === 'description' ? 400 : 100);
        for (const key of ['startTime', 'endTime']) if (event[key]) {
            if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(event[key])) invalid();
            value[key] = event[key];
        }
        if (value.startTime && value.endTime && value.endTime < value.startTime) invalid();
        return value;
    });
    for (const list of [result.events, result.followedTeams]) if (new Set(list.map(item => item.id)).size !== list.length) invalid();
    return result;
}
function dailyEditorial(settings, date) {
    const events = settings.events.filter(event => event.active && event.date === date)
        .sort((a, b) => eventPriorities.indexOf(b.priority) - eventPriorities.indexOf(a.priority) || a.priorityOrder - b.priorityOrder || a.id.localeCompare(b.id, 'en'));
    const headline = events.find(event => event.priority === 'headline');
    const context = headline ? { editionType: 'special', context: headline.id, specialTitle: headline.title, coverId: headline.coverId || settings.appearance.cover }
        : { editionType: 'regular', coverId: settings.appearance.cover };
    return { context, settings, prompt: JSON.stringify({ priorities: settings.editorial, categories, followedTeams: settings.editorial.futebol === 'off' ? [] : settings.followedTeams.filter(team => team.active).map(({ name, sport, country }) => ({ name, sport, country })), todayEvents: events.map(({ title, category, priority, description, teamId, competition, startTime, endTime, location }) => ({ title, category, priority, description, teamId, competition, startTime, endTime, location })) }) };
}
async function loadEditorial(getSettings, date, logger = console) {
    let saved, settings = defaultSettings();
    const warning = code => { try { logger.warn('RADAR_EDITORIAL_SETTINGS_WARNING', { code }); } catch { /* Diagnostics are optional. */ } };
    try { saved = await getSettings(); }
    catch { warning('SETTINGS_FALLBACK'); }
    if (saved) {
        try { settings = validateSettings({ ...saved, events: [] }); }
        catch { warning('PROFILE_FALLBACK'); }
        try { settings = validateSettings({ ...settings, events: saved.events || [] }); }
        catch { warning('CALENDAR_FALLBACK'); }
    }
    return dailyEditorial(settings, date);
}
function createEditorialRepository(db) {
    const ref = db.collection('settings').doc('editorial');
    return { async get() { const snapshot = await ref.get(); return snapshot.exists ? snapshot.data() : null; }, async save(value) { await ref.set(value); } };
}
module.exports = { categories, defaultSettings, validateSettings, dailyEditorial, loadEditorial, createEditorialRepository };
