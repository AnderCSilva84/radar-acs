'use strict';

const { stage, errorSnapshot, atStage } = require('./diagnostics');

// A plataforma Cloud Run exige IAM antes de executar este handler.

function createManualGenerator({ generate, runs, canGenerate = async () => true, getRedactions = () => [], logger = console }) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST para geração manual.' });
        if (!req.is('application/json') || req.body?.confirmarPublicacao !== true
            || typeof req.body?.requestId !== 'string'
            || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.requestId)) {
            return res.status(400).json({ success: false, message: 'Informe requestId UUID v4 e confirmarPublicacao: true.' });
        }
        const id = req.body.requestId;
        let acquired = false;
        try {
            if (!await canGenerate()) return res.status(409).json({ success: false, message: 'Edição da data já existe ou latest é posterior; geração cancelada.' });
            acquired = await stage('FIRESTORE_EXECUTION_LOG', () => runs.acquire(id));
            if (!acquired) return res.status(409).json({ success: false, message: 'Esta execução já foi iniciada. Não será repetida.' });
            const result = await generate(id);
            await stage('FIRESTORE_EXECUTION_LOG', () => runs.complete(id, result));
            return res.status(200).json(result);
        } catch (error) {
            // Não registrar mensagens de SDK, request ou cabeçalhos de autenticação.
            const diagnostic = errorSnapshot(error, getRedactions());
            logger.error('Geração manual falhou', { requestId: id, ...diagnostic });
            if (acquired) {
                try { await runs.fail(id, diagnostic); }
                catch (logError) { logger.error('Falha ao registrar estado da geração', errorSnapshot(atStage(logError, 'FIRESTORE_EXECUTION_LOG'), getRedactions())); }
            }
            return res.status(503).json({ success: false, message: 'A geração não foi concluída. Consulte as métricas e verifique o briefing antes de repetir.' });
        }
    };
}

module.exports = { createManualGenerator };
