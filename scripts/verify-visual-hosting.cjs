'use strict';
const { chromium } = require('../frontend/node_modules/@playwright/test');
const registry = require('../lambda/cover-registry.json');
(async () => {
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        const latestResponse = page.waitForResponse(response => response.url() === 'https://radar-acs.web.app/api/briefing/latest');
        const home = await page.goto('https://radar-acs.web.app/');
        const latest = await latestResponse;
        const payload = await latest.json();
        if (home.status() !== 200 || latest.status() !== 200 || payload.briefing.titulo !== 'Radar ACS \u2014 Edi\u00e7\u00e3o #002' || payload.briefing.data !== '2026-10-03' || payload.briefing.noticias.length !== 5) throw new Error('Home/latest validation failed');
        await page.locator('.edition-hero').waitFor();
        if (await page.getByRole('article').count() !== 5) throw new Error('News not rendered');
        const historyResponse = page.waitForResponse(response => response.url().includes('/api/briefing/history?limit=5'));
        const historyPage = await page.goto('https://radar-acs.web.app/history');
        const history = await historyResponse;
        const archive = await history.json();
        if (historyPage.status() !== 200 || history.status() !== 200 || archive.editions.length !== 2 || !archive.editions.every(edition => /#00[12]$/.test(edition.titulo))) throw new Error('History validation failed');
        await page.getByRole('button', { name: 'Ver edi\u00e7\u00e3o \u2192' }).first().waitFor();
        const cards = await page.locator('.history-card .edition-cover').count();
        if (cards !== 2) throw new Error('History cards missing');
        await page.getByRole('button', { name: 'Ver edi\u00e7\u00e3o \u2192' }).first().click();
        await page.getByRole('heading', { name: 'Roteiro da edi\u00e7\u00e3o' }).waitFor();
        if (await page.locator('.edition-detail .edition-cover').count() !== 1) throw new Error('Historical cover missing');
        const preferences = await page.goto('https://radar-acs.web.app/preferences');
        await page.getByRole('radio', { name: 'Radar News', exact: true }).waitFor();
        if (preferences.status() !== 200) throw new Error('Preferences HTTP');
        const special = page.getByRole('region', { name: 'CAPAS ESPECIAIS' });
        await special.waitFor();
        if (await page.getByRole('radio').count() !== 3 || await special.locator('input, button, select').count() !== 0) throw new Error('Special cover must not be selectable');
        if (!await special.getByText('Elei\u00e7\u00f5es 2026', { exact: true }).isVisible() || !await special.getByText('Autom\u00e1tica', { exact: true }).isVisible()) throw new Error('Special cover missing');
        const assets = [];
        for (const cover of Object.values(registry)) {
            const response = await page.request.head('https://radar-acs.web.app' + cover.webAsset);
            if (response.status() !== 200 || !response.headers()['content-type']?.startsWith('image/png')) throw new Error('Public cover unavailable: ' + cover.webAsset);
            assets.push({ asset: cover.webAsset, http: response.status(), contentType: response.headers()['content-type'] });
        }
        if (errors.length) throw new Error('Browser error: ' + errors.join('; '));
        console.log(JSON.stringify({ home: home.status(), historyPage: historyPage.status(), preferences: preferences.status(), latest: { http: latest.status(), title: payload.briefing.titulo, date: payload.briefing.data, news: payload.briefing.noticias.length }, history: { http: history.status(), editions: archive.editions.map(({ titulo, data }) => ({ titulo, data })), cards }, assets, cors: 'PASS', firestoreReadsEstimated: 3, firestoreWrites: 0 }, null, 2));
    } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
