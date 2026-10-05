'use strict';
const { defaultSettings, validateSettings } = require('./editorial-settings');
function createAdminSettings({ repository, verifyIdToken, getAdminUid, validate = validateSettings, defaults = defaultSettings }) {
    return async (req, res) => {
        res.set('Cache-Control', 'no-store');
        let user;
        const header = req.get('Authorization');
        if (typeof header !== 'string' || !/^Bearer \S+$/.test(header)) return res.status(401).json({ success: false, message: 'Autenticação necessária.' });
        try { user = await verifyIdToken(header.slice(7), true); }
        catch { return res.status(401).json({ success: false, message: 'Sessão inválida.' }); }
        const uid = getAdminUid();
        if (!uid || user.uid !== uid) return res.status(403).json({ success: false, message: 'Acesso negado.' });
        try {
            if (req.method === 'GET') return res.status(200).json({ success: true, settings: await repository.get() || defaults() });
            if (req.method !== 'PUT') return res.status(405).json({ success: false });
            if (!req.is('application/json')) return res.status(415).json({ success: false });
            let settings;
            try { settings = validate(req.body); } catch { return res.status(400).json({ success: false, message: 'Configuração inválida.' }); }
            await repository.save(settings);
            return res.status(200).json({ success: true, settings });
        } catch { return res.status(503).json({ success: false, message: 'Configurações indisponíveis.' }); }
    };
}
module.exports = { createAdminSettings };
