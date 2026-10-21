const fs = require('node:fs');
const path = require('node:path');
const { parseDelimited } = require('./csv');
const SOURCE = 'https://dados.mma.gov.br/dataset/44b6dc8a-dc82-4a84-8d95-1b0da7c85dac/resource/72dd3d2d-3cca-4b97-b382-a1c90531e379/download/cnuc_2026_07.csv';
function parseEnvironmental(text) {
    const [headers, ...rows] = parseDelimited(text);
    const municipalityIndex = headers.indexOf('Municípios Abrangidos');
    const groupIndex = headers.indexOf('Grupo');
    if (municipalityIndex < 0 || groupIndex < 0) throw new Error('Esquema CNUC inesperado');
    const records = new Map();
    for (const row of rows) {
        for (const raw of (row[municipalityIndex] || '').split(',')) {
            const match = raw.trim().match(/^(.+?)\s*\(([A-Z]{2})\)$/);
            if (!match) continue;
            const nome = match[1].trim().toUpperCase(), uf = match[2];
            const key = `${nome}/${uf}`;
            const record = records.get(key) || { nome, uf, has_uc_protection: false, has_ti_homologada: null, has_quilombola: null };
            if (/proteção integral/i.test(row[groupIndex])) record.has_uc_protection = true;
            records.set(key, record);
        }
    }
    if (!records.size) throw new Error('CNUC vazio: base anterior preservada');
    return [...records.values()];
}
async function main() {
    const response = process.argv[2] ? null : await fetch(SOURCE, { signal: AbortSignal.timeout(45000) });
    if (response && !response.ok) throw new Error(`CNUC HTTP ${response.status}`);
    const buffer = response ? Buffer.from(await response.arrayBuffer()) : fs.readFileSync(process.argv[2]);
    const records = parseEnvironmental(buffer.toString('latin1'));
    fs.writeFileSync(path.join(__dirname, '../data/environmental-risk.json'), JSON.stringify(records) + '\n');
    console.log(`${records.length} municípios CNUC; FUNAI e INCRA não integrados.`);
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { parseEnvironmental };
