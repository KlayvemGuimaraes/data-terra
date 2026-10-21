const Model = require('../territorial-model');
const SOURCES = {
    environment: { name: 'MMA/CNUC', edition: '31/07/2026', url: 'https://geoservicos.inde.gov.br/geoserver/MMA/ows', layer: 'MMA:cnuc_26_07_31' },
    basin: { name: 'ANA/SNIRH', edition: 'Balanço quantitativo 2020', url: 'https://www.snirh.gov.br/arcgis/rest/services/INDE/Camadas/MapServer/47' },
    transmission: { name: 'ANEEL/SIGEL - ONS', edition: 'Serviço consultado na data indicada', url: 'https://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/1' },
    climate: { name: 'NASA POWER / MERRA-2', edition: 'Período informado pela API', url: 'https://power.larc.nasa.gov/api/temporal/climatology/point' },
};
function validateQuery(query) {
    const { kind } = query;
    if (!Object.hasOwn(SOURCES, kind)) throw new Error('Fonte inválida');
    for (const key of ['lat', 'lng', 'radius']) if (typeof query[key] !== 'string' || !query[key].trim() || !Number.isFinite(Number(query[key]))) throw new Error('Coordenadas e raio obrigatórios');
    const lat = Number(query.lat), lng = Number(query.lng), radius = Number(query.radius);
    if (lat < -34 || lat > 6 || lng < -74 || lng > -34 || radius < 10 || radius > 300) throw new Error('Ponto fora do recorte brasileiro ou raio fora de 10–300 km');
    return { kind, lat, lng, radius };
}
function bbox({ lat, lng, radius }) {
    const dy = radius / 110.5, dx = radius / (110.5 * Math.cos((Math.abs(lat) + dy) * Math.PI / 180));
    return [lng - dx, lat - dy, lng + dx, lat + dy];
}
function queryUrl(base, params) { return `${base}?${new URLSearchParams(params)}`; }
// Somente as geometrias de exibição são simplificadas (~100 m). A avaliação usa as originais.
function simplifyLine(line, tolerance = 0.001) {
    if (line.length <= 4) return line;
    const keep = new Set([0, line.length - 1]), stack = [[0, line.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop(); let max = tolerance, at = -1;
        const start = line[a], end = line[b], dx = end[0] - start[0], dy = end[1] - start[1], len = dx * dx + dy * dy;
        for (let i = a + 1; i < b; i++) {
            const p = line[i]; const t = len ? Math.min(1, Math.max(0, ((p[0] - start[0]) * dx + (p[1] - start[1]) * dy) / len)) : 0;
            const d = Math.hypot(p[0] - start[0] - t * dx, p[1] - start[1] - t * dy);
            if (d > max) { max = d; at = i; }
        }
        if (at !== -1) { keep.add(at); stack.push([a, at], [at, b]); }
    }
    const result = [...keep].sort((a, b) => a - b).map(i => line[i].slice(0, 2));
    return result.length >= 4 ? result : line;
}
function simplifyGeometry(g) {
    if (!g) return null;
    const levels = { LineString: 0, MultiLineString: 1, Polygon: 1, MultiPolygon: 2 };
    if (!(g.type in levels)) return g;
    const walk = (value, depth) => depth ? value.map(v => walk(v, depth - 1)) : simplifyLine(value);
    return { type: g.type, coordinates: walk(g.coordinates, levels[g.type]) };
}
function displayFeature(feature, properties) { return { type: 'Feature', properties, geometry: simplifyGeometry(feature.geometry) }; }
function createService(fetchImpl = fetch) {
    const cache = new Map();
    async function json(url, signal) {
        const r = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error(`Fonte retornou HTTP ${r.status}`);
        const d = await r.json();
        if (d.error || d.errors) throw new Error('Fonte retornou erro de consulta');
        return d;
    }
    async function load(q) {
        const source = SOURCES[q.kind], signal = AbortSignal.timeout(40000);
        const metadata = { source: source.name, sourceUrl: source.url, edition: source.edition, fetchedAt: new Date().toISOString() };
        if (q.kind === 'climate') {
            const d = await json(queryUrl(source.url, { parameters: 'T2M_MAX,RH2M,PRECTOTCORR', community: 'RE', longitude: q.lng, latitude: q.lat, format: 'JSON' }), signal);
            return { ...metadata, ...Model.climateAssessment(d.properties?.parameter, d.header?.fill_value), edition: d.header?.range || source.edition, parameters: d.properties?.parameter || {}, units: d.parameters || {}, geometry: d.geometry, note: 'Climatologia em grade; não é medição no terreno, previsão ou dimensionamento de refrigeração.' };
        }
        if (q.kind === 'basin') {
            const d = await json(queryUrl(`${source.url}/query`, { f: 'json', where: '1=1', geometry: JSON.stringify({ x: q.lng, y: q.lat, spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryPoint', inSR: 4326, spatialRel: 'esriSpatialRelIntersects', outFields: 'OBJECTID,COBACIA,NORIOCOMP,UGRH,BAL_PERC,CLASSE,DISP_Q95,DEM_ACM', returnGeometry: false }), signal);
            if (!Array.isArray(d.features)) throw new Error('Resposta ANA sem feições');
            const rows = d.features.map(f => f.attributes).filter(Boolean).sort((a, b) => Model.basinScore({ class: a.CLASSE }) - Model.basinScore({ class: b.CLASSE }));
            const row = rows[0];
            if (!row) return { ...metadata, status: 'no-data', features: [] };
            let features = [], geometryStatus = 'unavailable';
            try {
                const g = await json(queryUrl(`${source.url}/query`, { f: 'geojson', objectIds: row.OBJECTID, outFields: 'OBJECTID,COBACIA,CLASSE', returnGeometry: true, outSR: 4326, maxAllowableOffset: 0.0005 }), signal);
                features = (g.features || []).map(f => displayFeature(f, { name: `Microbacia ${row.COBACIA}`, class: String(row.CLASSE).trim() }));
                geometryStatus = features.length ? 'ok' : 'unavailable';
            } catch { /* Os atributos consultados no ponto continuam válidos sem a geometria visual. */ }
            return { ...metadata, status: 'ok', code: row.COBACIA, region: row.UGRH, river: String(row.NORIOCOMP || '').trim(), class: String(row.CLASSE).trim(), commitmentPercent: row.BAL_PERC, availability: row.DISP_Q95, accumulatedDemand: row.DEM_ACM, intersectingBasins: rows.length, features, geometryStatus };
        }
        const features = []; let complete = false;
        const envelope = bbox(q);
        for (let page = 0; page < 4; page++) {
            const count = 100;
            const params = q.kind === 'environment'
                ? { service: 'WFS', version: '2.0.0', request: 'GetFeature', typeNames: source.layer, outputFormat: 'application/json', srsName: 'urn:ogc:def:crs:OGC:1.3:CRS84', bbox: `${envelope.join(',')},urn:ogc:def:crs:OGC:1.3:CRS84`, count, startIndex: page * count }
                : { f: 'geojson', where: '1=1', geometry: envelope.join(','), geometryType: 'esriGeometryEnvelope', inSR: 4326, outSR: 4326, spatialRel: 'esriSpatialRelIntersects', outFields: 'OID,Name', returnGeometry: true, orderByFields: 'OID', resultOffset: page * count, resultRecordCount: count };
            const d = await json(queryUrl(q.kind === 'environment' ? source.url : `${source.url}/query`, params), signal);
            if (!Array.isArray(d.features)) throw new Error('Resposta geográfica inválida');
            features.push(...d.features);
            if (d.features.length < count || (Number.isFinite(d.numberMatched) && features.length >= d.numberMatched)) { complete = true; break; }
        }
        if (features.some(f => !f.geometry || !(q.kind === 'environment' ? ['Polygon', 'MultiPolygon'] : ['LineString', 'MultiLineString']).includes(f.geometry.type))) complete = false;
        const located = features.map(f => ({ f, distance: Model.distance([q.lng, q.lat], f.geometry) })).filter(x => x.distance <= q.radius).sort((a, b) => a.distance - b.distance);
        if (q.kind === 'transmission') {
            return { ...metadata, status: complete ? 'ok' : 'partial', count: located.length, nearestDistanceKm: located.length ? Math.round(located[0].distance * 100) / 100 : null, nearestName: located[0]?.f.properties?.Name || null, features: located.slice(0, 40).map(({ f }) => displayFeature(f, { name: f.properties?.Name || 'Linha ONS' })), displayLimited: located.length > 40 };
        }
        const items = located.map(({ f, distance }) => ({ id: f.id, name: f.properties?.nome_uc || 'UC', group: f.properties?.grupo, category: f.properties?.categoria, sphere: f.properties?.esfera, manager: f.properties?.org_gestor, managementPlan: f.properties?.pl_manejo, polygonQuality: f.properties?.quali_pol, atPoint: Model.contains([q.lng, q.lat], f.geometry), distanceKm: Math.round(distance * 100) / 100 }));
        return { ...metadata, status: complete ? 'ok' : 'partial', count: located.length, items, features: located.slice(0, 30).map(({ f }, i) => displayFeature(f, items[i])), displayLimited: located.length > 30 };
    }
    return async function getTerritory(q) {
        const key = JSON.stringify(q), cached = cache.get(key);
        if (cached && cached.expires > Date.now()) return cached.data;
        try {
            const data = await load(q);
            // Impede ultrapassar o limite de resposta da função mantendo o resultado analítico.
            if (Buffer.byteLength(JSON.stringify(data)) > 3000000) { data.features = []; data.geometryStatus = 'omitted-size'; }
            if (data.status === 'ok') { if (cache.size >= 128) cache.delete(cache.keys().next().value); cache.set(key, { data, expires: Date.now() + 3600000 }); }
            return data;
        } catch (error) {
            return { status: 'unavailable', source: SOURCES[q.kind].name, sourceUrl: SOURCES[q.kind].url, edition: SOURCES[q.kind].edition, fetchedAt: new Date().toISOString(), message: error.name === 'TimeoutError' ? 'Fonte excedeu o tempo de consulta' : 'Fonte indisponível ou resposta inválida', features: [] };
        }
    };
}
module.exports = { SOURCES, validateQuery, createService, bbox, simplifyGeometry };
