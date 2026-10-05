'use strict';
const { editorialDate } = require('./generator');
const { editionContext, editionTitle } = require('./edition-context');
const { compactHistory } = require('./recent-news');
const { errorSnapshot } = require('./diagnostics');

// Automatic retries are disabled: one paid request per normal daily execution.
function retryable() { return false; }

function createScheduledGenerator({ repository, generate, now = () => new Date(), logger = console, getRedactions = () => [] }) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        if (req.method !== 'POST') return res.status(405).json({ success: false });
        // IAM authenticates before this handler. No application token at entry.
        const date = editorialDate(now());
        const recovery = req.body?.recoveryDate !== undefined;
        const exceptional = req.body?.exceptionalRecoveryAuthorization !== undefined;
        if (exceptional && (!recovery || req.body.exceptionalRecoveryAuthorization !== require('./scheduled-repository').exceptionalAuthorization)) {
            return res.status(409).json({ status: 'RECOVERY_FORBIDDEN', date });
        }
        if (recovery && (date !== '2026-10-04' || req.body.recoveryDate !== date || req.body.confirmarRecuperacao !== true)) {
            return res.status(409).json({ status: 'RECOVERY_FORBIDDEN', date });
        }
        const context = editionContext(date);
        logger.info('RADAR_SCHEDULED_START', { date, context: context.context || 'regular' });
        try {
            if (await repository.published(date)) return res.status(recovery ? 409 : 200).json({ status: 'SKIPPED_ALREADY_PUBLISHED', date });
            if (!recovery) {
                const attempts = [];
                    // claim atomically checks the edition and the persisted daily attempt cap.
                    const claim = await repository.claim(date, now());
                    if (!claim.acquired) return res.status(200).json({ status: claim.status, date, attempts });
                    let result, failure, title;
                    try {
                        const previous = await repository.latest();
                        if (previous?.data > date) throw Object.assign(new Error('Latest posterior à data editorial'), { code: 'LATEST_GUARD_FAILED' });
                        title = editionTitle(date, previous?.titulo);
                        logger.info('RADAR_GENERATION_STARTED', { date, title, attempt: claim.attempt });
                        result = await generate({ context, finalTitle: title, date, attempt: claim.attempt,
                            getRecentNews: async () => compactHistory(previous ? [previous] : []) });
                    } catch (error) { failure = error; }
                    const outcome = { attempt: claim.attempt, ...(result ? { metrics: result.metrics, noticiasPublicadas: result.noticias?.length } : {}),
                        ...(!result && failure?.metrics ? { metrics: failure.metrics } : {}),
                        ...(failure ? { erro: errorSnapshot(failure, getRedactions()) } : {}) };
                    // A publication may have succeeded before a diagnostic/network failure.
                    const published = await repository.finishAttempt(date, claim.runId, outcome);
                    attempts.push(outcome);
                    if (published) return res.status(200).json({ status: 'PUBLISHED', date, title, attempts,
                        metrics: result?.metrics, noticiasPublicadas: result?.noticias?.length });
                    if (!failure) throw Object.assign(new Error('Motor terminou sem edição persistida'), { code: 'PUBLICATION_NOT_FOUND' });
                    logger.error('RADAR_SCHEDULED_ATTEMPT_FAILED', { date, attempt: claim.attempt, ...errorSnapshot(failure, getRedactions()) });
                return res.status(503).json({ status: 'FAILED', date, attempts });
            }
            const acquired = exceptional ? await repository.recoverExceptional(date, req.body.exceptionalRecoveryAuthorization)
                : recovery ? await repository.recover(date) : await repository.reserve(date);
            if (!acquired) return res.status(recovery ? 409 : 200).json({ status: recovery ? 'RECOVERY_FORBIDDEN' : 'SKIPPED_ALREADY_ATTEMPTED', date });
            const previous = await repository.latest();
            if (previous?.data > date || recovery && (previous?.data !== '2026-10-03' || previous?.titulo !== 'Radar ACS — Edição #002')) {
                return res.status(409).json({ status: 'LATEST_GUARD_FAILED', date });
            }
            const title = editionTitle(date, previous?.titulo);
            logger.info('RADAR_GENERATION_STARTED', { date, title });
            const result = await generate({ context, finalTitle: title, date, recovery, getRecentNews: async () => compactHistory(previous ? [previous] : []) });
            logger.info('RADAR_PUBLICATION_PASS', { date, title, metrics: result.metrics });
            return res.status(200).json({ status: 'PUBLISHED', date, title, metrics: result.metrics, noticiasPublicadas: result.noticias?.length });
        } catch (error) {
            logger.error('RADAR_SCHEDULED_FAILED', { date, ...errorSnapshot(error, getRedactions()) });
            return res.status(503).json({ status: 'FAILED', date });
        }
    };
}
module.exports = { createScheduledGenerator, retryable };
