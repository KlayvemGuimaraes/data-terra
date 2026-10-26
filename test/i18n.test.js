const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { create, LOCALES, STORAGE_KEY, messages } = require('../i18n');

function openBrowserLanguage(search, saved, storageDenied = false) {
    const entries = new Map([[STORAGE_KEY, saved]]);
    const storage = {
        getItem(key) { if (storageDenied) throw new Error('denied'); return entries.get(key); },
        setItem(key, value) { if (storageDenied) throw new Error('denied'); entries.set(key, value); }
    };
    const context = {
        window: { localStorage: storage, location: { search } },
        document: { documentElement: {} },
        DataTerraTranslations: messages,
        URLSearchParams,
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../i18n'), 'utf8'), context);
    return { locale: context.DataTerraI18n.getLocale(), htmlLanguage: context.document.documentElement.lang, saved: entries.get(STORAGE_KEY) };
}

test('shared simulator links apply an explicit supported language before the first render', () => {
    assert.deepEqual(openBrowserLanguage('?lang=en', 'pt-BR'), { locale: 'en', htmlLanguage: 'en', saved: 'en' });
    for (const language of ['pt', 'pt-BR']) {
        assert.deepEqual(openBrowserLanguage('?lang=' + language, 'en'), { locale: 'pt-BR', htmlLanguage: 'pt-BR', saved: 'pt-BR' });
    }
});

test('missing or unsupported link languages preserve the saved choice', () => {
    for (const search of ['', '?lang=unknown']) {
        assert.deepEqual(openBrowserLanguage(search, 'en'), { locale: 'en', htmlLanguage: 'en', saved: 'en' });
    }
});

test('a shared English link works when browser storage is unavailable', () => {
    assert.equal(openBrowserLanguage('?lang=en', undefined, true).locale, 'en');
});

test('language choice persists, restores and falls back safely', () => {
    const entries = new Map();
    const storage = { getItem: key => entries.get(key), setItem: (key, value) => entries.set(key, value) };
    const i18n = create({ storage });
    assert.deepEqual(LOCALES, ['pt-BR', 'en']);
    assert.equal(i18n.getLocale(), 'pt-BR');
    i18n.setLocale('en');
    assert.equal(entries.get(STORAGE_KEY), 'en');
    assert.equal(create({ storage }).getLocale(), 'en');
    entries.set(STORAGE_KEY, 'unsupported');
    assert.equal(create({ storage }).getLocale(), 'pt-BR');
});

test('storage denial does not prevent a language change', () => {
    const storage = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const i18n = create({ storage });
    i18n.setLocale('en');
    assert.equal(i18n.t('Camadas'), 'Layers');
    i18n.setLocale('pt-BR');
    assert.equal(i18n.t('Camadas'), 'Camadas');
});

test('translations preserve values, proper names and whitespace without recursive substitution', () => {
    const { t } = create({ locale: 'en' });
    assert.equal(t`Raio de ${125} km`, '125 km radius');
    assert.equal(t`Cabo: ${'Água {0} $&'}`, 'Cable: Água {0} $&');
    assert.equal(t(' · selecionada'), ' · selected');
    assert.equal(t('Name not in the catalog'), 'Name not in the catalog');
});

test('HTML localizes authored text and accessible labels while preserving attributes and escaped data', () => {
    const { html, t } = create({ locale: 'en' });
    assert.equal(html`<span data-layer="water">Água</span>`, '<span data-layer="water">Water</span>');
    assert.equal(html`<option value="${'Água'}">${t('Água')}</option>`, '<option value="Água">Water</option>');
    assert.equal(html`<button title="Camadas">${'&lt;São Paulo&gt;'}</button>`, '<button title="Layers">&lt;São Paulo&gt;</button>');
    assert.equal(html`<strong>Cabo: ${'Água {0}'}</strong>`, '<strong>Cable: Água {0}</strong>');
});

test('every English message preserves exactly the source interpolation tokens', () => {
    const tokens = text => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
    for (const [source, translations] of Object.entries(messages)) {
        assert.ok(translations.en?.trim(), source);
        assert.deepEqual(tokens(translations.en), tokens(source), source);
    }
});

test('numbers and lists use the selected locale and scores remain numeric inputs', () => {
    const i18n = create();
    assert.equal(i18n.number(1234.5), '1.234,5');
    i18n.setLocale('en');
    assert.equal(i18n.number(1234.5), '1,234.5');
    assert.equal(i18n.list(['Water', 'Sewage']), 'Water and Sewage');
});

test('a repeated choice does not trigger another render', () => {
    const i18n = create();
    let count = 0;
    const unsubscribe = i18n.onChange(() => count++);
    i18n.setLocale('en');
    i18n.setLocale('en');
    assert.equal(count, 1);
    unsubscribe();
    i18n.setLocale('pt-BR');
    assert.equal(count, 1);
});
