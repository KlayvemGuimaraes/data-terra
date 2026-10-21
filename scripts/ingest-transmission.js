const fs = require('node:fs');
const path = require('node:path');
const SOURCE = 'https://sigel.aneel.gov.br/arcgis/rest/services/PORTAL/Transmiss%C3%A3o/MapServer/1';
async function read(params) {
    const response = await fetch(`${SOURCE}/query?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`ANEEL HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error('ANEEL retornou erro');
    return data;
}
async function main() {
    const { count } = await read({ f: 'json', where: '1=1', returnCountOnly: true });
    if (!Number.isInteger(count) || count < 1 || count > 50000) throw new Error('Contagem ANEEL inválida');
    const features = [];
    for (let offset = 0; offset < count; offset += 1000) {
        const data = await read({ f: 'geojson', where: '1=1', outFields: 'OID,Name', returnGeometry: true, outSR: 4326, orderByFields: 'OID', resultOffset: offset, resultRecordCount: 1000 });
        if (!Array.isArray(data.features)) throw new Error('GeoJSON inválido');
        features.push(...data.features);
        console.log(`${features.length}/${count} linhas`);
    }
    if (features.length !== count || new Set(features.map(f => f.id ?? f.properties.OID)).size !== count || features.some(f => !['LineString','MultiLineString'].includes(f.geometry?.type))) throw new Error('Snapshot incompleto ou inválido; base anterior preservada');
    const data = { type: 'FeatureCollection', source: SOURCE, retrievedAt: new Date().toISOString(), features };
    fs.writeFileSync(path.join(__dirname, '../data/transmission.json'), JSON.stringify(data)+'\n');
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
