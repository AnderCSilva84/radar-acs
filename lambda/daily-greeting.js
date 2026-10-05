'use strict';
const { getBriefingPlayback, escapeXml } = require('./playback');
const FALLBACK_TIME_ZONE = 'America/Sao_Paulo';
function validTimeZone(value) {
    if (typeof value !== 'string' || !value.trim()) return false;
    try { new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format(); return true; }
    catch (_) { return false; }
}
function currentDate(now = new Date(), timeZone = FALLBACK_TIME_ZONE) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    return value('year') + '-' + value('month') + '-' + value('day');
}
function fullDate(date) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date + 'T12:00:00Z'));
}
function getGreetingByLocalTime(now = new Date(), timeZone = FALLBACK_TIME_ZONE) {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now));
    return hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
}
async function getGreetingOptions(input) {
    let timeZone = FALLBACK_TIME_ZONE;
    const system = input.requestEnvelope?.context?.System;
    if (system?.device?.deviceId && system.apiAccessToken && input.serviceClientFactory) {
        let timer;
        try {
            const fetched = await Promise.race([
                input.serviceClientFactory.getUpsServiceClient().getSystemTimeZone(system.device.deviceId),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Timeout')), 1500); })
            ]);
            if (!validTimeZone(fetched)) throw new Error('InvalidTimeZone');
            timeZone = fetched;
        } catch (_) {
            // Never log SDK errors: they may contain credentials or request identifiers.
            console.warn('RADAR_GREETING_TIMEZONE_FALLBACK');
        } finally { clearTimeout(timer); }
    }
    const id = system?.person?.personId;
    const personId = typeof id === 'string' && /^amzn1\.ask\.person\.[A-Za-z0-9._~-]+$/.test(id) && id.length <= 1024 ? id : undefined;
    return { timeZone, personId };
}
function dailyPlayback(briefing, prefix = '', now = new Date(), options = {}) {
    const timeZone = validTimeZone(options.timeZone) ? options.timeZone : FALLBACK_TIME_ZONE;
    const today = currentDate(now, timeZone);
    const current = briefing.data === today;
    const greeting = getGreetingByLocalTime(now, timeZone);
    const introduction = current
        ? greeting + '! Este é o seu Radar ACS de ' + fullDate(today) + '. Vamos aos assuntos desta edição.'
        : greeting + '! A edição de hoje do Radar ACS ainda não foi publicada. A última edição disponível é de ' + fullDate(briefing.data) + '. Vamos ouvir essa edição.';
    const weekday = new Intl.DateTimeFormat('pt-BR', { timeZone, weekday: 'long' }).format(now);
    const wish = ['sábado', 'domingo'].includes(weekday) ? 'um ótimo ' : 'uma ótima ';
    const ending = current
        ? 'E esse foi o seu Radar ACS de hoje. Tenha ' + wish + weekday + '. Até amanhã!'
        : 'Essa foi a última edição disponível. Até mais!';
    const playback = getBriefingPlayback(briefing, prefix, { introduction, ending });
    if (typeof options.personId === 'string' && /^amzn1\.ask\.person\.[A-Za-z0-9._~-]+$/.test(options.personId) && options.personId.length <= 1024) {
        const personalized = playback.ssml.replace(escapeXml(introduction),
            escapeXml(greeting) + ', <alexa:name type="first" personId="' + escapeXml(options.personId) + '"/>' + escapeXml(introduction.slice(greeting.length)));
        if (personalized.length <= 8000) playback.ssml = personalized;
    }
    return playback;
}
module.exports = { currentDate, fullDate, dailyPlayback, getGreetingByLocalTime, getGreetingOptions };
