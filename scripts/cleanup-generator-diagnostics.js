'use strict';
// Limpeza manual, sem Scheduler. ADC Google; nenhum segredo da aplicação é necessário.
const { initializeApp } = require('../api/node_modules/firebase-admin/app');
const { getFirestore } = require('../api/node_modules/firebase-admin/firestore');
async function main() {
    const args = process.argv.slice(2);
    if (args[args.indexOf('--project') + 1] !== 'radar-acs' || !args.includes('--project')) {
        throw new Error('Informe explicitamente --project radar-acs');
    }
    initializeApp({ projectId: 'radar-acs' });
    const db = getFirestore();
    const expired = await db.collection('geracoesDiagnostico').where('expiresAt', '<=', new Date()).limit(25).get();
    if (!args.includes('--delete')) {
        console.log('Simulação: diagnósticos expirados neste lote:', expired.size);
        return;
    }
    const batch = db.batch();
    expired.docs.forEach(doc => batch.delete(doc.ref));
    if (!expired.empty) await batch.commit();
    console.log('Diagnósticos expirados removidos:', expired.size);
}
main().catch(() => { console.error('Limpeza não concluída. Verifique autenticação e permissões ADC.'); process.exitCode = 1; });
