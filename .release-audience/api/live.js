'use strict';
const { defaultSettings, validateSettings } = require('./editorial-settings');
const { publicMedia } = require('./live-media');
function cachedRead(read, ttl = 60000) {
    let value, expires = 0, pending;
    const get = async () => {
        if (Date.now() < expires) return value;
        if (!pending) pending = Promise.resolve().then(read).then(next => { value = next; expires = Date.now() + ttl; return value; }).finally(() => { pending = null; });
        return pending;
    };
    get.invalidate = () => { expires = 0; };
    return get;
}
function createLive({ settings, media, football }) {
    return async (req, res) => {
        if (req.method !== 'GET') return res.status(405).json({ success: false });
        if (req.path === '/api/live/radios') return res.status(200).json({ success: true, media: publicMedia(await media()) });
        if (!['/api/live', '/api/live/football'].includes(req.path) && !/^\/api\/live\/football\/team\/[a-z0-9_-]{1,80}$/.test(req.path)) return res.status(404).json({ success: false });
        const config = validateSettings(await settings() || defaultSettings());
        const followedTeams = config.followedTeams.filter(team => team.active && team.sport === 'football');
        const enabled = config.editorial.futebol !== 'off';
        const value = enabled && followedTeams.length ? await football() : { status: enabled ? 'NO_TEAMS' : 'DISABLED', matches: [], updatedAt: null, stale: false };
        const teams = followedTeams.map(({ id, name, provider, providerTeamId }) => ({ id, name, ...(provider && providerTeamId ? { provider, providerTeamId } : {}) }));
        const ids = new Set(teams.filter(team => team.provider === 'football-data').map(team => team.providerTeamId));
        let matches = value.matches.filter(match => ids.has(match.home.id) || ids.has(match.away.id));
        if (req.path.startsWith('/api/live/football/team/')) {
            const team = teams.find(item => item.id === req.path.split('/').at(-1));
            if (!team) return res.status(404).json({ success: false });
            matches = matches.filter(match => team.providerTeamId && [match.home.id, match.away.id].includes(team.providerTeamId));
        }
        const footballValue = { ...value, enabled, teams: enabled ? teams : [], matches };
        return res.status(200).json(req.path === '/api/live'
            ? { success: true, preferences: { editorial: config.editorial }, football: footballValue, media: publicMedia(await media()) }
            : { success: true, football: footballValue });
    };
}
module.exports = { cachedRead, createLive };
