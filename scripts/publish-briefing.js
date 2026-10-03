'use strict';

const fs = require('node:fs');
const { publishBriefing } = require('../services/publish-briefing');

async function main() {
    const file = process.argv[2];
    if (!file) {
        throw new Error('Uso: npm run publish:briefing -- arquivo.json');
    }

    const briefing = JSON.parse(fs.readFileSync(file, 'utf8'));
    const result = await publishBriefing(briefing);
    console.log('Briefing salvo:', result.id, result.publicado ? '(publicado)' : '(rascunho)');
}

main().catch(error => {
    console.error('Não foi possível publicar:', error.message);
    process.exitCode = 1;
});
