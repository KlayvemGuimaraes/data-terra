(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./translations'));
    else root.DataTerraI18n = factory(root.DataTerraTranslations);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (messages) {
    const LOCALES = ['pt-BR', 'en'];
    const STORAGE_KEY = 'dataterra-language';
    const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
    const validLocale = value => LOCALES.includes(value) ? value : 'pt-BR';
    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function create({ locale = 'pt-BR', storage = null } = {}) {
        try { locale = storage?.getItem(STORAGE_KEY) || locale; } catch { /* Private browsing may disable storage. */ }
        let current = validLocale(locale);
        const listeners = new Set();

        function translate(source, values = {}, escape = false) {
            const key = normalize(source);
            const translated = messages[key]?.[current];
            const template = translated === undefined ? source : source.replace(/\S(?:[\s\S]*\S)?/, () => translated);
            return template.replace(/\{(\w+)\}/g, (match, name) => {
                if (!Object.hasOwn(values, name)) return match;
                return escape ? escapeHtml(values[name]) : String(values[name] ?? '');
            });
        }

        // Plain messages and tagged templates share the same catalog. Interpolations are
        // data, never message keys: municipality names, source names and IDs stay intact.
        function t(source, ...values) {
            if (Array.isArray(source) && Object.hasOwn(source, 'raw')) {
                const key = source.reduce((text, part, index) => text + (index ? `{${index - 1}}` : '') + part, '');
                return translate(key, values);
            }
            return translate(String(source ?? ''), values[0] || {});
        }

        // Only authored text and accessible attributes in the template are translated.
        // Values are interpolated afterwards, so markup/data from APIs is never parsed
        // as a translation instruction. Existing renderers escape external values.
        function html(parts, ...values) {
            const template = typeof parts === 'string' ? parts : parts.reduce((text, part, index) => text + (index ? `{${index - 1}}` : '') + part, '');
            const localized = template.replace(/(<[^>]*>)|([^<]+)/g, (match, tag, text) => {
                if (tag) return tag.replace(/(aria-label|title|placeholder)="([^"]*)"/g, (_, attr, value) => `${attr}="${escapeHtml(translate(value))}"`);
                const key = normalize(text);
                if (!messages[key]) return text;
                return text.replace(/\S(?:[\s\S]*\S)?/, () => escapeHtml(translate(key)));
            });
            return localized.replace(/\{(\d+)\}/g, (match, index) => index < values.length ? String(values[index] ?? '') : match);
        }

        function setLocale(value) {
            const next = validLocale(value);
            if (next === current) return;
            current = next;
            try { storage?.setItem(STORAGE_KEY, current); } catch { /* Selection still works in memory. */ }
            listeners.forEach(listener => listener(current));
        }

        // Capture only the initial authored DOM. Dynamic results are rendered explicitly
        // with t/html; no MutationObserver, page reload or replacement of input elements.
        function bindDocument(doc) {
            const textNodes = [], attributes = [];
            const walker = doc.createTreeWalker(doc.documentElement, 4);
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (node.parentElement?.closest('script, style, [data-no-i18n]')) continue;
                if (messages[normalize(node.data)]) textNodes.push([node, node.data]);
            }
            doc.querySelectorAll('[aria-label], [title], [placeholder]').forEach(el => {
                if (el.closest('[data-no-i18n]') || el.id === 'themeToggle') return;
                ['aria-label', 'title', 'placeholder'].forEach(attr => {
                    const source = el.getAttribute(attr);
                    if (source && messages[normalize(source)]) attributes.push([el, attr, source]);
                });
            });
            const apply = () => {
                doc.documentElement.lang = current;
                textNodes.forEach(([node, source]) => { node.data = t(source); });
                attributes.forEach(([el, attr, source]) => el.setAttribute(attr, t(source)));
                const select = doc.getElementById('languageSelect');
                if (select) select.value = current;
            };
            apply();
            listeners.add(apply);
            doc.getElementById('languageSelect')?.addEventListener('change', event => setLocale(event.target.value));
        }

        return {
            t, html, setLocale, bindDocument,
            getLocale: () => current,
            onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
            number: (value, options = {}) => Number(value).toLocaleString(current, options),
            date: value => new Date(value).toLocaleString(current),
            list: values => new Intl.ListFormat(current, { type: 'conjunction' }).format(values),
        };
    }

    let storage = null;
    try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* Sandboxed browser. */ }
    const instance = create({ storage });
    if (typeof document !== 'undefined') document.documentElement.lang = instance.getLocale();
    return { ...instance, create, LOCALES, STORAGE_KEY, messages };
});
