'use strict';

const registry = require('./cover-registry.json');
const document = require('./edition-cover-apl.json');
const HOSTING = 'https://radar-acs.web.app';
function logVisual(fields) {
    try { console.info('RADAR_APL', fields); } catch { /* Logging must never interrupt audio. */ }
}

function viewportDiagnostic(envelope) {
    const fields = {
        RADAR_APL_MAX_VERSION: 'AUSENTE',
        RADAR_VIEWPORT_WIDTH: 'AUSENTE',
        RADAR_VIEWPORT_HEIGHT: 'AUSENTE',
        RADAR_VIEWPORT_PIXEL_WIDTH: 'AUSENTE',
        RADAR_VIEWPORT_PIXEL_HEIGHT: 'AUSENTE',
        RADAR_VIEWPORT_DPI: 'AUSENTE',
        RADAR_VIEWPORT_SHAPE: 'AUSENTE',
        RADAR_VIEWPORT_MODE: 'AUSENTE',
        RADAR_VIEWPORT_PROFILE: 'INDETERMINADO'
    };
    try {
        const apl = envelope.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL'];
        const version = apl?.runtime?.maxVersion ?? apl?.maxVersion;
        if (typeof version === 'string' && /^\d{1,4}\.\d{1,3}$/.test(version)) fields.RADAR_APL_MAX_VERSION = version;
        // Only actual request.viewport fields. Never infer dimensions or profile.
        const viewport = envelope.viewport;
        for (const [key, marker] of [['width', 'WIDTH'], ['height', 'HEIGHT'], ['pixelWidth', 'PIXEL_WIDTH'], ['pixelHeight', 'PIXEL_HEIGHT'], ['dpi', 'DPI']]) {
            const value = viewport?.[key];
            if (typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100000) fields['RADAR_VIEWPORT_' + marker] = value;
        }
        if (['RECTANGLE', 'ROUND'].includes(viewport?.shape)) fields.RADAR_VIEWPORT_SHAPE = viewport.shape;
        if (['HUB', 'MOBILE', 'AUTO', 'TV', 'PC'].includes(viewport?.mode)) fields.RADAR_VIEWPORT_MODE = viewport.mode;
        if (['hubLandscapeSmall', 'hubLandscapeMedium', 'hubLandscapeLarge', 'hubLandscapeXLarge', 'hubRoundSmall', 'mobileLandscape', 'mobilePortrait', 'tvLandscape'].includes(viewport?.profile)) fields.RADAR_VIEWPORT_PROFILE = viewport.profile;
    } catch { /* Technical diagnostics must never interrupt speech. */ }
    return fields;
}

function logEditionVisualResponse(response) {
    try {
        const directives = Array.isArray(response?.directives) ? response.directives : [];
        logVisual({
            RADAR_APL_DIRECTIVE_COUNT: directives.length,
            RADAR_APL_RENDERDOCUMENT_FINAL: directives.some(value => value?.type === 'Alexa.Presentation.APL.RenderDocument')
        });
    } catch { /* Do not expose the response or interrupt audio. */ }
}

function resolveEditionCover(edition) {
    const id = Object.hasOwn(registry, edition?.coverId) ? edition.coverId : 'radar';
    const cover = registry[id];
    return { id, ...cover, alexaUrl: HOSTING + cover.webAsset };
}

function addEditionVisual(input, edition, resolver = resolveEditionCover) {
    const supported = Boolean(input.requestEnvelope.context?.System?.device?.supportedInterfaces?.['Alexa.Presentation.APL']);
    const diagnostic = { RADAR_APL_SUPPORTED: supported, RADAR_APL_DIRECTIVE_ADDED: false };
    Object.assign(diagnostic, viewportDiagnostic(input.requestEnvelope));
    let stage = 'RESOLVER';
    try {
        if (edition && supported) {
            const cover = resolveEditionCover(edition);
            diagnostic.RADAR_APL_COVER_ID = cover.id;
            diagnostic.RADAR_APL_COVER_URL = cover.alexaUrl;
        }
    } catch { /* Diagnostics are optional. */ }
    if (!edition || !supported) { logVisual(diagnostic); return; }
    try {
        const cover = resolver(edition);
        stage = 'URL';
        const url = new URL(cover.alexaUrl);
        if (url.origin !== HOSTING || url.username || url.password || url.search || url.hash) { logVisual(diagnostic); return; }
        stage = 'METADATA';
        const metadata = [edition.titulo, edition.data].filter(value => typeof value === 'string').join(' · ')
            .replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[character]));
        stage = 'DIRECTIVE';
        input.responseBuilder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: 'radar-edition-cover',
            document,
            datasources: { edition: { coverUrl: url.href, metadata, specialTitle: String(edition.specialTitle || "").replace(/[&<>]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[character])) } }
        });
        diagnostic.RADAR_APL_DIRECTIVE_ADDED = true;
    } catch (error) {
        // Only allowlisted exception types and static messages: never serialize errors,
        // credentials, arbitrary error messages, request envelopes or speech.
        const name = ['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError'].includes(error?.name) ? error.name : 'Error';
        diagnostic.RADAR_APL_ERROR = name + ': falha visual na etapa ' + stage;
        // Visual presentation is optional. Never replace or interrupt speech.
    }
    logVisual(diagnostic);
}

module.exports = { resolveEditionCover, addEditionVisual, logEditionVisualResponse };
