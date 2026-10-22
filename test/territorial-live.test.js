const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('../territorial-model');
const { calculateGroupScores } = require('../evaluation-criteria');
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
test('a protected point retains evidence and affects only the territorial pillar', () => {
    const protection = { atPoint: true, group: 'Proteção Integral', sphere: 'Federal', category: 'Parque' };
    const unprotected = Model.assess(complete, base);
    const assessed = Model.assess({ ...complete, environment: { status: 'ok', items: [protection] } }, base);
    assert.equal(assessed.complete, true);
    assert.equal(Object.hasOwn(assessed, 'cap'), false);
    assert.deepEqual(assessed.overlaps, [protection]);
    assert.deepEqual(assessed.scores, { ...unprotected.scores, environmental: 15, licensing: 20 });
    assert.deepEqual(calculateGroupScores(assessed.scores), {
        ...calculateGroupScores(unprotected.scores),
        territorial: 18,
    });
    assert.equal(calculateGroupScores(assessed.scores).connectivity, 100);
    assert.ok(assessed.rules.length > unprotected.rules.length);
    assert.ok(assessed.rules.every(rule => [rule.title, rule.text, rule.url].every(value => typeof value === 'string' && value.length > 0)));
    assert.ok(assessed.warnings.length > unprotected.warnings.length);
    assert.ok(assessed.warnings.every(warning => typeof warning === 'string' && warning.length > 0));
    const stateProtection = Model.assess({ ...complete, environment: { status: 'ok', items: [{ ...protection, sphere: 'Estadual' }] } }, base);
    assert.equal(assessed.rules.length, stateProtection.rules.length + 1);
});

test('other conservation overlaps retain their own criterion effects without a cap', () => {
    const protection = { atPoint: true, group: 'Uso Sustentável' };
    const unprotected = Model.assess(complete, base);
    const assessed = Model.assess({ ...complete, environment: { status: 'ok', items: [protection] } }, base);
    assert.equal(Object.hasOwn(assessed, 'cap'), false);
    assert.deepEqual(assessed.overlaps, [protection]);
    assert.deepEqual(assessed.scores, { ...unprotected.scores, environmental: 40, licensing: 40 });
    assert.deepEqual(calculateGroupScores(assessed.scores), {
        ...calculateGroupScores(unprotected.scores),
        territorial: 40,
    });
    assert.ok(assessed.rules.length > unprotected.rules.length);
    assert.ok(assessed.warnings.length > unprotected.warnings.length);
});

test('nearby protection without a point intersection does not change criterion scores', () => {
    const unprotected = Model.assess(complete, base);
    const nearby = Model.assess({ ...complete, environment: { status: 'ok', items: [{ atPoint: false, group: 'Proteção Integral' }] } }, base);
    assert.deepEqual(nearby.overlaps, []);
    assert.deepEqual(nearby.scores, unprotected.scores);
    assert.deepEqual(nearby.rules, unprotected.rules);
    assert.deepEqual(nearby.warnings, unprotected.warnings);
    assert.equal(Object.hasOwn(nearby, 'cap'), false);
});

test('missing and partial consultations retain completeness warnings without a global ceiling', () => {
    const good = Model.assess(complete, base);
    const missing = Model.assess({}, base);
    assert.equal(good.complete, true);
    assert.equal(Object.hasOwn(good, 'cap'), false);
    assert.equal(missing.complete, false);
    assert.equal(Object.hasOwn(missing, 'cap'), false);
    assert.deepEqual(missing.scores, { ...base, grid: 40, water: 62, licensing: 60 });
    assert.deepEqual(missing.overlaps, []);
    assert.ok(missing.warnings.length > good.warnings.length);
    assert.ok(missing.warnings.every(warning => typeof warning === 'string' && warning.length > 0));
    assert.equal(calculateGroupScores(missing.scores).connectivity, 100);

    const baseline = calculateGroupScores(good.scores);
    for (const [source, pillar] of [
        ['environment', 'territorial'],
        ['basin', 'water'],
        ['climate', 'water'],
        ['transmission', 'energy'],
    ]) {
        const partial = Model.assess({ ...complete, [source]: { ...complete[source], status: 'partial' } }, base);
        const groups = calculateGroupScores(partial.scores);
        assert.equal(partial.complete, false, source);
        assert.equal(Object.hasOwn(partial, 'cap'), false, source);
        assert.ok(partial.warnings.length > good.warnings.length, source);
        assert.deepEqual(partial.rules, good.rules, source);
        assert.notEqual(groups[pillar], baseline[pillar], source);
        assert.deepEqual(groups, { ...baseline, [pillar]: groups[pillar] }, source);
    }
});

test('basin and climate change only the water criterion and pillar', () => {
    const good = Model.assess(complete, base);
    for (const { sources, water } of [
        { sources: { basin: { status: 'ok', class: 'crítico' } }, water: 53 },
        { sources: { climate: { status: 'ok', score: 10 } }, water: 74 },
        { sources: { basin: { status: 'ok', class: 'crítico' }, climate: { status: 'ok', score: 10 } }, water: 37 },
    ]) {
        const assessed = Model.assess({ ...complete, ...sources }, base);
        assert.deepEqual(assessed.scores, { ...good.scores, water });
        assert.deepEqual(calculateGroupScores(assessed.scores), {
            ...calculateGroupScores(good.scores),
            water,
        });
    }
    assert.equal(Model.basinScore({ class: 'muito alto\n  ' }), 30);
});

test('transmission distance changes only the grid criterion and energy pillar', () => {
    const nearby = Model.assess(complete, base);
    const distant = Model.assess({ ...complete, transmission: { status: 'ok', nearestDistanceKm: 60 } }, base);
    assert.equal(nearby.scores.grid, 90);
    assert.deepEqual(distant.scores, { ...nearby.scores, grid: 35 });
    assert.deepEqual(calculateGroupScores(distant.scores), {
        ...calculateGroupScores(nearby.scores),
        energy: 77,
    });
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
    const q = { kind: 'environment', lat: -23, lng: -46, radius: 100 };
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
test('official transmission snapshot stays available without external network', async () => {
    const data = await createService(async () => { throw Error('offline'); })({ kind: 'transmission', lat: -23.86191, lng: -46.46209, radius: 30 });
    assert.equal(data.status, 'ok');
    assert.ok(data.count > 0);
    assert.ok(data.sourceRetrievedAt);
    assert.ok(data.nearestDistanceKm < 1);
});
test('retry preserves known protection alerts on a failed refresh of the same point', async () => {
    let fail = false;
    const protection = { atPoint: true, group: 'Proteção Integral' };
    const client = create({ delay: 0, fetchImpl: async () => {
        if (fail) throw Error('offline');
        return { ok: true, json: async () => ({ status: 'ok', items: [protection] }) };
    } });
    const site = { lat: -23, lng: -46 };
    client.request(site, 30);
    await new Promise(r => setTimeout(r, 10));
    fail = true;
    const refresh = client.request(site, 30, true);
    const duringRefresh = Model.assess(refresh, base);
    await new Promise(r => setTimeout(r, 10));
    assert.equal(refresh.environment.status, 'partial');
    const afterFailure = Model.assess(refresh, base);
    for (const assessed of [duringRefresh, afterFailure]) {
        assert.equal(Object.hasOwn(assessed, 'cap'), false);
        assert.deepEqual(assessed.overlaps, [protection]);
        assert.equal(assessed.scores.environmental, 15);
        assert.equal(assessed.scores.licensing, 20);
    }
    assert.equal(afterFailure.complete, false);
    assert.deepEqual(afterFailure.rules, duringRefresh.rules);
    assert.ok(afterFailure.warnings.length > duringRefresh.warnings.length);
    const changed = client.request({ lat: -24, lng: -47 }, 30);
    assert.equal(changed.environment.items, undefined);
    client.dispose();
});
