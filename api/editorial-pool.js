'use strict';

const { createHash } = require('node:crypto');
const { categories } = require('./editorial-settings');
const { normalize, similarity } = require('./news-duplicates');
const { canonicalUrl, classifyPreviousNews } = require('./recent-news');
const config = require('./editorial-v2-config.json');
const registry = require('./editorial-sources.json');

function publicUrl(value) {
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443'
            || !/^[a-z][a-z0-9.-]*\.[a-z]{2,}$/i.test(url.hostname)
            || /(?:^|\.)(?:localhost|local|internal)$/.test(url.hostname)) return null;
        if ([...url.searchParams.keys()].some(key => /token|secret|password|authorization|credential|cookie|signature|api.?key|session|^auth$/i.test(key))) return null;
        return canonicalUrl(url.href);
    } catch { return null; }
}

function classifyArticleUrl(value) {
    const url = publicUrl(value);
    if (!url) return { classification: 'INVALID_URL', reason: 'HTTPS público sem credenciais exigido' };
    const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
    const generic = path === '/' || /\/(?:news|latest|noticias|home|blog|blogs|category|categories|feed|rss|concursos)$/i.test(path)
        || /\/(?:category|categories|tag|tags)\//i.test(path)
        || /\/futebol\/times\/[^/]+$/i.test(path);
    return { classification: generic ? 'GENERIC_LISTING' : 'ARTICLE_URL', url,
        reason: generic ? 'Página de descoberta/listagem não é matéria específica' : 'Caminho específico; conteúdo e data ainda precisam ser validados' };
}

function resolveTeam(team) {
    // Exact catalog identity first. Never match the word "remo" against arbitrary prose.
    const key = team.catalogId || team.id;
    if (registry.teams[key]) return { id: key, ...registry.teams[key] };
    const matches = Object.entries(registry.teams).filter(([, item]) =>
        [item.name, ...item.aliases].some(name => normalize(name) === normalize(team.name)));
    return matches.length === 1 ? { id: matches[0][0], ...matches[0][1] } : null;
}

function evidenceUnits(text, limits = config) {
    const clean = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    // Keep complete sentences, never cut a quote mid-sentence to fit the budget.
    const sentences = clean.match(/.*?[.!?](?=\s|$)/gs) || [];
    const result = [];
    let length = 0;
    for (const sentence of sentences) {
        const value = sentence.trim();
        if (value.split(/\s+/).length < 5) continue;
        if (length + value.length > limits.maxEvidenceChars || result.length >= limits.maxEvidenceSentences) break;
        length += value.length;
        result.push({ id: 'e' + (result.length + 1), text: value });
    }
    return result;
}

function normalizeCandidate(raw, date, limits = config) {
    const classified = classifyArticleUrl(raw.url);
    if (classified.classification !== 'ARTICLE_URL') return { rejection: classified.classification };
    const title = typeof raw.title === 'string' ? raw.title.replace(/<[^>]*>/g, '').trim().slice(0, 200) : '';
    const published = typeof raw.publishedAt === 'string' ? raw.publishedAt.slice(0, 10) : '';
    if (!title || !Object.hasOwn(categories, raw.category) || !raw.sourceName) return { rejection: 'INVALID_CANDIDATE' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(published) || !Number.isFinite(Date.parse(published))
        || new Date(published).toISOString().slice(0, 10) !== published
        || published > date || Date.parse(published) < Date.parse(date) - limits.maxAgeDays * 86400000) return { rejection: 'INVALID_DATE' };
    const evidence = evidenceUnits(raw.evidenceText, limits);
    const evidenceText = evidence.map(item => item.text).join(' ');
    const titleWords = normalize(title).split(' ').filter(word => word.length > 3);
    const coverage = titleWords.length ? titleWords.filter(word => normalize(evidenceText).split(' ').includes(word)).length / titleWords.length : 0;
    if (evidenceText.split(/\s+/).length < limits.minEvidenceWords || coverage < 0.5) return { rejection: 'INSUFFICIENT_EVIDENCE' };
    const domain = new URL(classified.url).hostname;
    const id = 'candidate-' + createHash('sha256').update(classified.url).digest('hex').slice(0, 12);
    return { candidate: { id, title, url: classified.url, sourceName: String(raw.sourceName).slice(0, 120), sourceDomain: domain,
        publishedAt: published, category: raw.category, teamId: raw.teamId || null,
        evidenceText, evidence, collectedAt: raw.collectedAt || date,
        quality: Math.max(0, Math.min(3, Number(raw.quality) || 1)),
        generalRelevance: Math.max(0, Math.min(3, Number(raw.generalRelevance) || 0)),
        ...require('./news-image').imageFromSource({ ...raw, url: classified.url }) } };
}

function sourcePlan(settings, sources = registry.sources, limit = config.maxSourcePages, includeTeamSources = true) {
    const followed = !includeTeamSources || settings.editorial.futebol === 'off' ? [] : settings.followedTeams.filter(team => team.active).map(resolveTeam).filter(Boolean);
    const available = [...sources, ...followed.flatMap(team => team.newsSources.map(source => ({ ...source, teamId: team.id })))];
    const seen = new Set();
    return available.filter(source => source.categories.some(category => settings.editorial[category] !== 'off'))
        .sort((a, b) => {
            const weight = source => Math.max(...source.categories.map(category => config.priorityWeights[settings.editorial[category]] || 0)) + (source.teamId ? config.teamBoost : 0);
            return weight(b) - weight(a) || a.id.localeCompare(b.id);
        }).filter(source => { if (seen.has(source.url)) return false; seen.add(source.url); return true; }).slice(0, limit);
}

function rankPool(rawCandidates, settings, recent, date, limits = config) {
    const prioritiesApplied = { ...settings.editorial };
    const profile = { prioritiesApplied, followedTeams: settings.followedTeams.filter(team => team.active).map(team => team.catalogId || team.id).sort() };
    const editorialProfileVersion = 'v2-' + createHash('sha256').update(JSON.stringify(profile)).digest('hex').slice(0, 12);
    const diagnostics = { poolCollected: rawCandidates.length, poolValid: 0, invalidUrls: 0, genericUrls: 0,
        insufficientEvidence: 0, invalidDates: 0, invalidCandidates: 0, disabledCategories: 0,
        duplicates: 0, previousEditionDuplicates: 0, candidatesByPriority: {}, candidatesByCategory: {}, teamCandidates: 0,
        selectedForWriting: 0, published: 0, editorialShortage: false, editorialShortageReason: null,
        editorialProfileVersion, prioritiesApplied, openAiCalls: 0 };
    const reports = [], valid = [];
    const followedIds = new Set(settings.followedTeams.filter(team => team.active).map(team => team.catalogId || team.id));
    for (const raw of rawCandidates.slice(0, limits.maxDiscovered)) {
        const { candidate, rejection } = normalizeCandidate(raw, date, limits);
        const report = { candidateId: candidate?.id || 'unknown', title: String(raw.title || '').slice(0, 200), sourceUrl: publicUrl(raw.url), status: 'FAIL', reasonCode: rejection,
            evidenceCount: candidate?.evidence.length || 0, allowedFactsCount: candidate?.evidence.length || 0 };
        reports.push(report);
        if (rejection) {
            const counters = { INVALID_URL: 'invalidUrls', GENERIC_LISTING: 'genericUrls', INSUFFICIENT_EVIDENCE: 'insufficientEvidence', INVALID_DATE: 'invalidDates', INVALID_CANDIDATE: 'invalidCandidates' };
            diagnostics[counters[rejection]]++;
            continue;
        }
        const priority = settings.editorial[candidate.category];
        if (priority === 'off') { diagnostics.disabledCategories++; report.reasonCode = 'CATEGORY_DISABLED'; continue; }
        if (valid.some(item => item.url === candidate.url || normalize(item.title) === normalize(candidate.title)
            || similarity(item.title, candidate.title) >= 0.8 && similarity(item.evidenceText, candidate.evidenceText) >= 0.75)) {
            diagnostics.duplicates++; report.reasonCode = 'NEWS_DUPLICATE'; continue;
        }
        if (classifyPreviousNews({ titulo: candidate.title, url: candidate.url }, recent).status === 'FAIL') {
            diagnostics.previousEditionDuplicates++; report.reasonCode = 'PREVIOUS_EDITION_DUPLICATE'; continue;
        }
        const age = Math.floor((Date.parse(date) - Date.parse(candidate.publishedAt)) / 86400000);
        const components = { priority: limits.priorityWeights[priority], followedTeam: candidate.teamId && followedIds.has(candidate.teamId) ? limits.teamBoost : 0,
            freshness: Math.max(0, 12 - age * 3), source: candidate.quality * 3,
            evidence: Math.min(6, candidate.evidence.length * 2), articleUrl: 5, generalRelevance: candidate.generalRelevance * 2 };
        const score = Object.values(components).reduce((sum, value) => sum + value, 0);
        valid.push({ ...candidate, priority, score, scoreComponents: components });
        diagnostics.candidatesByPriority[priority] = (diagnostics.candidatesByPriority[priority] || 0) + 1;
        diagnostics.candidatesByCategory[candidate.category] = (diagnostics.candidatesByCategory[candidate.category] || 0) + 1;
        if (components.followedTeam) diagnostics.teamCandidates++;
        Object.assign(report, { status: 'PASS', reasonCode: null, reason: 'Evidência, data, URL e preferências válidas', score, category: candidate.category, priority });
    }
    valid.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    diagnostics.poolValid = valid.length;
    const pool = valid.slice(0, limits.targetPoolMax);
    const selected = [], remaining = [...pool];
    while (remaining.length && selected.length < limits.maxEdition) {
        const adjusted = item => item.score - selected.filter(chosen => chosen.category === item.category).length * limits.diversityPenalty;
        remaining.sort((a, b) => adjusted(b) - adjusted(a) || b.score - a.score || a.id.localeCompare(b.id));
        const item = remaining.shift();
        selected.push({ ...item, selectionScore: adjusted(item), selectionReason: 'Prioridade, atualidade, fonte e evidência; diversidade progressiva' });
    }
    diagnostics.selectedForWriting = selected.length;
    for (const report of reports) {
        const chosen = selected.find(item => item.id === report.candidateId);
        report.selectedForWriting = Boolean(chosen);
        if (chosen) Object.assign(report, { selectionScore: chosen.selectionScore, scoreComponents: chosen.scoreComponents,
            selectionReason: chosen.selectionReason });
    }
    diagnostics.editorialShortage = selected.length < limits.targetEditionMin;
    diagnostics.editorialShortageReason = selected.length < 3 ? 'EDITORIAL_SHORTAGE: somente ' + selected.length + ' candidatos válidos após filtros'
        : selected.length < limits.targetEditionMin ? 'EDITORIAL_REDUCED: somente ' + selected.length + ' candidatos válidos após filtros' : null;
    return { pool, selected, extras: pool.filter(item => !selected.some(chosen => chosen.id === item.id)), diagnostics, reports };
}

module.exports = { publicUrl, classifyArticleUrl, resolveTeam, evidenceUnits, normalizeCandidate, sourcePlan, rankPool };
