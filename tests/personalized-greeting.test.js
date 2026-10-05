'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { dailyPlayback, getGreetingByLocalTime, getGreetingOptions, currentDate } = require('../lambda/daily-greeting');
const briefing = { data: '2026-10-04', roteiroAlexa: 'Notícia: A & B <tag> "exemplo".' };
const personId = 'amzn1.ask.person.TEST_ONLY';
for (const [hour, greeting] of [[8,'Bom dia'],[15,'Boa tarde'],[21,'Boa noite']]) {
    for (const recognized of [false, true]) {
        test(`saudação ${hour}h, recognized=${recognized}, edição escapada`, () => {
            const result = dailyPlayback(briefing, '', new Date(`2026-10-04T${String(hour).padStart(2,'0')}:00:00-03:00`), { timeZone: 'America/Belem', personId: recognized ? personId : undefined }).ssml;
            assert.match(result, new RegExp(greeting));
            assert.equal(result.includes('<alexa:name type="first" personId="' + personId + '"/>'), recognized);
            assert.match(result, /A &amp; B &lt;tag&gt; &quot;exemplo&quot;/);
            assert.doesNotMatch(result, /Anderson|<tag>/);
        });
    }
}
for (const [hour, expected] of [[4,'Boa noite'],[5,'Bom dia'],[11,'Bom dia'],[12,'Boa tarde'],[17,'Boa tarde'],[18,'Boa noite']]) {
    test(`limite horário ${hour}`, () => assert.equal(getGreetingByLocalTime(new Date(`2026-10-04T${String(hour).padStart(2,'0')}:59:00-03:00`), 'America/Sao_Paulo'), expected));
}
test('timezone real SDK, fuso diferente e virada de data', async () => {
    for (const timeZone of ['America/Belem','America/Sao_Paulo','Asia/Tokyo']) {
        const input = { requestEnvelope: { context: { System: { device: { deviceId: 'test-device' }, apiAccessToken: 'test-token', person: { personId } } } }, serviceClientFactory: { getUpsServiceClient: () => ({ getSystemTimeZone: async id => { assert.equal(id, 'test-device'); return timeZone; } }) } };
        assert.deepEqual(await getGreetingOptions(input), { timeZone, personId });
    }
    const now = new Date('2026-10-04T02:00:00Z');
    assert.equal(currentDate(now, 'Asia/Tokyo'), '2026-10-04');
    assert.equal(currentDate(now, 'America/Sao_Paulo'), '2026-10-03');
    assert.equal(getGreetingByLocalTime(now, 'Asia/Tokyo'), 'Bom dia');
    assert.equal(getGreetingByLocalTime(now, 'America/Belem'), 'Boa noite');
});
test('person ausente, ID ausente ou inválido não permite injeção SSML', async () => {
    for (const person of [undefined, {}, { personId: '<bad>' }, { personId: 'amzn1.ask.person.X"/>' }]) {
        const options = await getGreetingOptions({ requestEnvelope: { context: { System: { person } } } });
        assert.equal(options.personId, undefined);
        assert.doesNotMatch(dailyPlayback(briefing, '', new Date(), options).ssml, /alexa:name/);
    }
});
test('falha ou timezone inválido usa fallback, logs não expõem credenciais', async () => {
    const logs = [], original = console.warn;
    console.warn = (...args) => logs.push(args);
    try {
        for (const fail of [true,false]) {
            const options = await getGreetingOptions({ requestEnvelope: { context: { System: { device: { deviceId: 'PRIVATE_DEVICE' }, apiAccessToken: 'PRIVATE_TOKEN' } } }, serviceClientFactory: { getUpsServiceClient: () => ({ getSystemTimeZone: async () => { if (fail) throw new Error('Bearer PRIVATE_TOKEN PRIVATE_DEVICE'); return 'invalid'; } }) } });
            assert.equal(options.timeZone, 'America/Sao_Paulo');
            assert.match(dailyPlayback(briefing, '', new Date(), options).ssml, /<speak>/);
        }
        assert.doesNotMatch(JSON.stringify(logs), /PRIVATE|Bearer/);
    } finally { console.warn = original; }
});
