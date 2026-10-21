const { validateQuery, createService } = require('../server/territory-service');
const service = createService();
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return res.status(405).json({ error: 'Método não permitido' }); }
    let query;
    try { query = validateQuery(req.query); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const result = await service(query);
    res.setHeader('Cache-Control', result.status === 'ok' ? 'public, max-age=300, s-maxage=3600' : 'no-store');
    return res.status(200).json(result);
};
