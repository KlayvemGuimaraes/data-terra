const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeSiteResources, scoreSubstation, scoreEnvironmental } = require('../site-analysis');
const { parseDelimited } = require('../scripts/csv');
const { parseEnvironmental } = require('../scripts/ingest-environmental');
const site = { lat: -23.55, lng: -46.63 };
test('ONS distance, voltage bonus and missing coordinates are distinct', () => {
    assert.equal(scoreSubstation([{ ...site, voltageKv: 230 }], site, 100), 95);
    assert.equal(scoreSubstation([{ ...site, voltageKv: 138 }], site, 100), 90);
    assert.equal(scoreSubstation([{ lat: 80, lng: 100, voltageKv: 138 }], site, 100), 32);
    assert.equal(scoreSubstation([{ lat: 'invalid', lng: 100 }], site, 100), 40);
    assert.equal(scoreSubstation([], site, 100), 40);
});
test('CNUC municipal matching handles accents and distinguishes states and missing coverage', () => {
    const records = [{ nome: 'SÃO PAULO', uf: 'SP', has_uc_protection: true }];
    assert.equal(scoreEnvironmental(records, { name: 'Sao Paulo', state: 'SP' }), 38);
    assert.equal(scoreEnvironmental(records, { name: 'Sao Paulo', state: 'RN' }), 58);
    assert.equal(scoreEnvironmental([], { name: 'Sao Paulo', state: 'SP' }), 58);
});
test('municipal protection evidence changes only the territorial pillar, not the candidate reference', () => {
    const data = { municipalities: [{ ...site, name: 'São Paulo', state: 'SP' }], substations: [{ ...site, name: 'ONS', voltageKv: 230 }] };
    const options = { regions: [{ id: 'Guarulhos-SP', name: 'Guarulhos', state: 'SP', lat: -23.45, lng: -46.53 }] };
    const clean = analyzeSiteResources(data, site, options);
    const flagged = analyzeSiteResources({ ...data, envRisk: [{ nome: 'SAO PAULO', uf: 'SP', has_uc_protection: true }] }, site, options);
    assert.equal(clean.scores.environmental, 58);
    assert.deepEqual(flagged.scores, { ...clean.scores, environmental: 38 });
    assert.equal(flagged.scores.substation, 95);
    assert.deepEqual(flagged.groupScores, { ...clean.groupScores, territorial: 51 });
    assert.ok(flagged.groupScores.territorial < clean.groupScores.territorial);
    assert.equal(flagged.site.nearestRegion.name, 'Guarulhos');
    assert.equal(flagged.environmental.municipality, 'São Paulo/SP');
    assert.equal(flagged.environmental.status, 'atencao');
    assert.equal(flagged.nearestSubstation.nearestName, 'ONS');
});

test('substation evidence changes only the energy pillar', () => {
    const data = { municipalities: [{ ...site, name: 'São Paulo', state: 'SP' }] };
    const missing = analyzeSiteResources(data, site);
    const nearby = analyzeSiteResources({ ...data, substations: [{ ...site, name: 'ONS', voltageKv: 230 }] }, site);
    assert.equal(missing.scores.substation, 40);
    assert.deepEqual(nearby.scores, { ...missing.scores, substation: 95 });
    assert.ok(nearby.groupScores.energy > missing.groupScores.energy);
    assert.deepEqual(nearby.groupScores, { ...missing.groupScores, energy: nearby.groupScores.energy });
    assert.equal(nearby.nearestSubstation.nearestName, 'ONS');
    assert.equal(nearby.nearestSubstation.nearestDistanceKm, 0);
    assert.equal(nearby.nearestSubstation.nearestVoltageKv, 230);
});
test('CSV accepts quoted separators, escaped quotes and embedded newlines', () => {
    assert.deepEqual(parseDelimited('a;b\n"a;b";"c""d\ne"\n'), [['a', 'b'], ['a;b', 'c"d\ne']]);
    assert.throws(() => parseDelimited('"unfinished'));
});
test('CNUC reads official protection group and retains unknown territorial sources', () => {
    const rows = parseEnvironmental('Municípios Abrangidos;Grupo\n"SÃO PAULO (SP), CUBATÃO (SP)";Proteção Integral\n');
    assert.equal(rows.length, 2);
    assert.equal(rows[0].has_uc_protection, true);
    assert.equal(rows[0].has_ti_homologada, null);
    assert.equal(rows[0].has_quilombola, null);
    assert.throws(() => parseEnvironmental('unexpected;schema\n'));
});
