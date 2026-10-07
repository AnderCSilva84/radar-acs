'use strict';
class LiveProvider {
    constructor(kind) { this.kind = kind; }
    async load() { return { status: 'NOT_CONFIGURED', matches: [] }; }
}
class FootballProvider extends LiveProvider {
    constructor() { super('football'); }
}
const states = { SCHEDULED: 'UPCOMING', TIMED: 'UPCOMING', IN_PLAY: 'LIVE', PAUSED: 'HALFTIME', FINISHED: 'FINISHED', POSTPONED: 'POSTPONED', CANCELLED: 'CANCELLED', SUSPENDED: 'POSTPONED' };
function normalizeMatch(raw) {
    const status = states[raw.status];
    if (!status || !raw.id || !raw.homeTeam?.name || !raw.awayTeam?.name || !Number.isFinite(Date.parse(raw.utcDate))) throw Error('Partida inválida.');
    const team = value => ({ id: String(value.id), name: String(value.name).slice(0, 120) });
    const result = { id: String(raw.id), status, startsAt: new Date(raw.utcDate).toISOString(), home: team(raw.homeTeam), away: team(raw.awayTeam), competition: String(raw.competition?.name || '').slice(0, 120) };
    const score = raw.score?.fullTime;
    if (status !== 'UPCOMING' && Number.isInteger(score?.home) && score.home >= 0 && Number.isInteger(score?.away) && score.away >= 0) result.score = { home: score.home, away: score.away };
    // Provider does not guarantee a minute field. Never synthesize one from start time.
    return result;
}
class FootballDataProvider extends FootballProvider {
    constructor(request) { super(); this.request = request; }
    async load() {
        const result = await this.request('/v4/competitions/BSA/matches');
        if (!Array.isArray(result.matches)) throw Error('Resposta de futebol inválida.');
        return { status: 'DELAYED', matches: result.matches.slice(0, 500).map(normalizeMatch) };
    }
}
class MockFootballProvider extends FootballProvider {
    constructor(matches = []) { super(); this.matches = matches; }
    async load() { return { status: 'MOCK', matches: this.matches.map(normalizeMatch) }; }
}
function footballTtl(matches) {
    if (matches.some(match => ['LIVE', 'HALFTIME'].includes(match.status))) return 120000;
    if (matches.some(match => match.status === 'UPCOMING')) return 1800000;
    if (matches.length) return 21600000;
    return 43200000;
}
function createCachedFootball(provider, now = Date.now) {
    let cached, pending, expires = 0;
    return async () => {
        if (cached && now() < expires) return cached;
        if (!pending) pending = (async () => {
            try {
                const value = await provider.load();
                cached = { ...value, updatedAt: new Date(now()).toISOString(), stale: false };
                expires = now() + footballTtl(value.matches);
            } catch {
                cached = cached ? { ...cached, stale: true } : { status: 'UNAVAILABLE', matches: [], stale: true, updatedAt: null };
                expires = now() + 300000;
            }
            return cached;
        })().finally(() => { pending = null; });
        return pending;
    };
}
module.exports = { LiveProvider, FootballProvider, FootballDataProvider, MockFootballProvider, normalizeMatch, footballTtl, createCachedFootball };
