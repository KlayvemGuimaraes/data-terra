(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TerritorialClient = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const KINDS = ['environment', 'basin', 'transmission', 'climate'];
    function create({ fetchImpl = fetch, onUpdate = () => {}, delay = 350 } = {}) {
        let activeKey = '', state = {}, controller, timer;
        const cache = new Map();
        function request(site, radius, retry = false) {
            const key = `${Number(site.lat).toFixed(5)},${Number(site.lng).toFixed(5)},${radius}`;
            if (key === activeKey && !retry) return state;
            activeKey = key; clearTimeout(timer); controller?.abort();
            controller = new AbortController(); const signal = controller.signal;
            const cached = cache.get(key);
            state = !retry && cached && Date.now() - cached.time < 3600000 ? cached.state : Object.fromEntries(KINDS.map(k => [k, { status: 'loading' }]));
            if (state === cached?.state) return state;
            const current = state;
            timer = setTimeout(() => {
                KINDS.forEach(async kind => {
                    try {
                        const query = new URLSearchParams({ kind, lat: Number(site.lat).toFixed(5), lng: Number(site.lng).toFixed(5), radius });
                        const response = await fetchImpl(`/api/territory?${query}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(55000)]) });
                        if (!response.ok) throw new Error('Consulta indisponível');
                        const result = await response.json();
                        if (!result || !['ok', 'partial', 'unavailable', 'no-data'].includes(result.status)) throw new Error('Resposta inválida');
                        if (key !== activeKey || signal.aborted) return;
                        current[kind] = result;
                    } catch (error) {
                        if (signal.aborted || key !== activeKey) return;
                        current[kind] = { status: 'unavailable', message: 'Não foi possível consultar esta fonte.' };
                    }
                    if (KINDS.every(k => current[k].status === 'ok')) {
                        if (cache.size >= 20) cache.delete(cache.keys().next().value);
                        cache.set(key, { time: Date.now(), state: current });
                    }
                    onUpdate(current);
                });
            }, delay);
            return state;
        }
        return { request, dispose() { clearTimeout(timer); controller?.abort(); } };
    }
    return { create, KINDS };
});
