'use strict';

function createExecutionLog(db, serverTimestamp) {
    return {
        async acquire(id) {
            try {
                await db.collection('geracoesManuais').doc(id).create({ status: 'iniciada', criadoEm: serverTimestamp() });
                return true;
            } catch (error) {
                if (error.code === 6 || error.code === 'already-exists') return false;
                throw error;
            }
        },
        async snapshot(id, snapshot) {
            await db.collection('geracoesDiagnostico').doc(id).create({
                ...snapshot, criadoEm: serverTimestamp(), expiresAt: new Date(Date.now() + 7 * 86400000)
            });
        },
        async complete(id, result) {
            // Notícias já estão no briefing; não duplicar o conteúdo no registro permanente.
            await db.collection('geracoesManuais').doc(id).update({
                status: 'concluida', data: result.data, metrics: result.metrics, atualizadoEm: serverTimestamp()
            });
        },
        async fail(id, diagnostic) {
            await db.collection('geracoesManuais').doc(id).update({
                status: 'falhou', erro: diagnostic, atualizadoEm: serverTimestamp()
            });
        }
    };
}
module.exports = { createExecutionLog };
