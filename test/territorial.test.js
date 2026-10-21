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
test('territorial data changes final score using municipality reference rather than candidate region', () => {
    const data = { municipalities: [{ ...site, name: 'São Paulo', state: 'SP' }], substations: [{ ...site, name: 'ONS', voltageKv: 230 }] };
    const clean = analyzeSiteResources(data, site);
    const flagged = analyzeSiteResources({ ...data, envRisk: [{ nome: 'SAO PAULO', uf: 'SP', has_uc_protection: true }] }, site);
    assert.equal(flagged.scores.environmental, 38);
    assert.equal(flagged.scores.substation, 95);
    assert.ok(flagged.overallScore < clean.overallScore);
    assert.equal(flagged.environmental.municipality, 'São Paulo/SP');
    assert.equal(flagged.nearestSubstation.nearestName, 'ONS');
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
