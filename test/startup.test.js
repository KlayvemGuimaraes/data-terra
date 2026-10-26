const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');

function boot(reducedMotion = false) {
    const classes = new Set(), timers = [], events = new Map();
    const listen = (name, callback) => events.set(name, callback);
    const context = {
        document: { documentElement: { classList: { add: value => classes.add(value), remove: value => classes.delete(value) } }, addEventListener: listen },
        window: {
            matchMedia: () => ({ matches: reducedMotion, addEventListener: listen }),
            setTimeout: (callback, delay) => timers.push({ callback, delay }),
            addEventListener: listen,
        },
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../startup'), 'utf8'), context);
    return { context, classes, timers, events };
}

test('entry animation releases rendering on a bounded timer, independently of APIs', async () => {
    const { context, classes, timers } = boot();
    assert.ok(classes.has('is-entering'));
    assert.equal(timers[0].delay, 1450);
    timers.shift().callback();
    assert.equal(classes.has('is-entering'), false);
    timers.shift().callback();
    await context.window.DataTerraIntroReady;
});

test('reduced motion skips animation and releases the application', async () => {
    const { context, classes, timers } = boot(true);
    assert.equal(classes.size, 0);
    assert.ok(timers[0].delay < 100);
    timers.shift().callback();
    await context.window.DataTerraIntroReady;
});

test('keyboard interaction can dismiss the entry animation immediately', () => {
    const { classes, events, timers } = boot();
    events.get('keydown')();
    assert.equal(classes.size, 0);
    const count = timers.length;
    events.get('pointerdown')();
    assert.equal(timers.length, count, 'release is scheduled only once');
});
