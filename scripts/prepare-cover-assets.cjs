'use strict';
// Local raster conversion only: no API, cloud SDK, or editorial generation.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('../frontend/node_modules/@playwright/test');

(async () => {
    const publicDir = path.resolve(__dirname, '../frontend/public');
    const { createServer } = await import('../frontend/node_modules/vite/dist/node/index.js');
    const server = await createServer({ root: path.resolve(__dirname, '../frontend'), server: { middlewareMode: true } });
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1672, height: 941 }, deviceScaleFactor: 1 });
        await page.goto(pathToFileURL(publicDir + '/manifest.webmanifest').href);
        for (const base of ['capa-radar', 'capa-eleicoes-2026']) {
            const png = fs.readFileSync(path.join(publicDir, base + '.png'));
            const data = await page.evaluate(async source => {
                const img = new Image(); img.src = source; await img.decode();
                const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                return canvas.toDataURL('image/webp', 0.94);
            }, 'data:image/png;base64,' + png.toString('base64'));
            if (!data.startsWith('data:image/webp;base64,')) throw new Error('WebP encoder unavailable');
            const webp = Buffer.from(data.split(',')[1], 'base64');
            fs.writeFileSync(path.join(publicDir, base + '.webp'), webp);
            console.log(JSON.stringify({ asset: base, pngBytes: png.length, webpBytes: webp.length, reduction: ((1-webp.length/png.length)*100).toFixed(2) + '%' }));
        }
        const { CoverArt } = await server.ssrLoadModule('/src/components/CoverArt.jsx');
        const React = require('../frontend/node_modules/react');
        const { renderToStaticMarkup } = require('../frontend/node_modules/react-dom/server');
        const logo = 'data:image/png;base64,' + fs.readFileSync(path.join(publicDir, 'logo-acs.png')).toString('base64');
        for (const cover of ['radar', 'acs']) {
            const html = renderToStaticMarkup(React.createElement(CoverArt, { cover }));
            await page.setContent('<style>body{margin:0;background:#0e1723}.cover-art{width:1672px;height:941px;position:relative;overflow:hidden}.cover-art>svg{width:100%;height:100%}.brand-signature{position:absolute;height:auto;border-radius:3px}.discreet{width:13%;right:5%;bottom:6%;opacity:.85}.prominent{width:31%;right:6%;top:12%;box-shadow:0 0 32px #096cd029}</style>' + html.replace('/logo-acs.png', logo));
            await page.locator('img').evaluate(img => img.decode());
            await page.screenshot({ path: path.join(publicDir, 'capa-' + cover + '-default.png') });
        }
    } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
