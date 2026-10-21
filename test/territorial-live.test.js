const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../territorial-model');
const { validateQuery, createService } = require('../server/territory-service');
const { create } = require('../territorial-client');
const polygon = { type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]] };
const complete = { environment: { status: 'ok', items: [] }, transmission: { status: 'ok', nearestDistanceKm: 2 }, basin: { status: 'ok', class: 'baixo' }, climate: { status: 'ok', score: 90 } };
const base = { renewables: 100, water: 90, grid: 100, connectivity: 100, licensing: 90, environmental: 58, substation: 95 };
test('point-in-polygon respects holes, boundaries and multipolygons', () => {
    assert.equal(Model.contains([2, 2], polygon), true);
    assert.equal(Model.contains([5, 5], polygon), false);
    assert.equal(Model.contains([0, 2], polygon), true);
    assert.equal(Model.contains([12, 2], polygon), false);
    assert.equal(Model.contains([2, 2], { type: 'MultiPolygon', coordinates: [polygon.coordinates] }), true);
    assert.ok(Model.distance([5, 5], polygon) > 100);
    assert.equal(Model.distance([2, 2], polygon), 0);
});
test('line distance uses closest segment rather than endpoints', () => {
    assert.ok(Model.distance([0, 0], { type: 'LineString', coordinates: [[-1, 0.1], [1, 0.1]] }) < 12);
});
test('a protected point caps the score independently of favorable weights', () => {
    const assessed = Model.assess({ ...complete, environment: { status: 'ok', items: [{ atPoint: true, group: 'Proteção Integral', sphere: 'Federal', category: 'Parque' }] } }, base);
    assert.equal(assessed.cap, 39);
    assert.equal(assessed.scores.environmental, 15);
    assert.equal(assessed.scores.licensing, 20);
    assert.ok(assessed.rules.some(r => r.title.includes('federal')));
    assert.equal(Model.assess({ ...complete, environment: { status: 'ok', items: [{ atPoint: false, group: 'Proteção Integral' }] } }, base).cap, 100);
});
test('missing or partial data never supports high aptitude; basin and climate alter water score', () => {
    assert.equal(Model.assess({}, base).cap, 79);
    assert.equal(Model.assess({ ...complete, environment: { status: 'partial', items: [] } }, base).cap, 79);
    const good = Model.assess(complete, base);
    const bad = Model.assess({ ...complete, basin: { status: 'ok', class: 'crítico' }, climate: { status: 'ok', score: 10 } }, base);
    assert.ok(bad.scores.water < good.scores.water);
    assert.equal(good.scores.grid, 90);
    assert.equal(Model.basinScore({ class: 'muito alto\n  ' }), 30);
});
test('climate rejects missing months, nulls and sentinel values', () => {
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const values = n => Object.fromEntries(months.map(m => [m, n]));
    const p = { T2M_MAX: values(30), RH2M: values(70), PRECTOTCORR: values(2) };
    assert.equal(Model.climateAssessment(p).score, 92);
    p.T2M_MAX.JAN = -999;
    assert.equal(Model.climateAssessment(p).status, 'unavailable');
    p.T2M_MAX.JAN = null;
    assert.equal(Model.climateAssessment(p).status, 'unavailable');
});
test('API validates kind, finite coordinates, Brazilian bounding box and radius', () => {
    const q = { kind: 'basin', lat: '-23', lng: '-46', radius: '100' };
    assert.equal(validateQuery(q).lat, -23);
    for (const override of [{ kind: '__proto__' }, { lat: '' }, { lat: 'Infinity' }, { lng: '0' }, { radius: '301' }, { lat: ['-23'] }]) assert.throws(() => validateQuery({ ...q, ...override }));
});
test('source outage and invalid payload are unavailable, not an empty healthy territory', async () => {
    const q = { kind: 'environment', lat: -23, lng: -46, radius: 100 };
    assert.equal((await createService(async () => { throw Error('offline'); })(q)).status, 'unavailable');
    assert.equal((await createService(async () => ({ ok: true, json: async () => ({ error: 'bad' }) }))(q)).status, 'unavailable');
    const invalid = await createService(async () => ({ ok: true, json: async () => ({ features: [{ geometry: null }] }) }))(q);
    assert.equal(invalid.status, 'partial');
});
test('service caches successes but retries failures', async () => {
    let calls = 0;
    const service = createService(async () => { calls++; return { ok: calls !== 1, status: 503, json: async () => ({ features: [] }) }; });
    const q = { kind: 'transmission', lat: -23, lng: -46, radius: 100 };
    assert.equal((await service(q)).status, 'unavailable');
    assert.equal((await service(q)).status, 'ok');
    await service(q); assert.equal(calls, 2);
});
test('client discards old location responses even if the fetch ignores abort', async () => {
    const pending = []; const updates = [];
    const client = create({ delay: 0, onUpdate: state => updates.push(state), fetchImpl: url => new Promise(resolve => pending.push({ url, resolve })) });
    client.request({ lat: -23, lng: -46 }, 30);
    await new Promise(r => setTimeout(r, 5));
    const old = pending.splice(0);
    client.request({ lat: -24, lng: -47 }, 30);
    await new Promise(r => setTimeout(r, 5));
    for (const item of old) item.resolve({ ok: true, json: async () => ({ status: 'ok', marker: 'old' }) });
    await new Promise(r => setTimeout(r, 5));
    assert.equal(updates.length, 0);
    for (const item of pending) item.resolve({ ok: true, json: async () => ({ status: 'ok', marker: 'new' }) });
    await new Promise(r => setTimeout(r, 5));
    assert.equal(updates.length, 4);
    assert.equal(updates.at(-1).basin.marker, 'new');
    client.dispose();
});
