(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ApiClient = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    async function fetchJson(url) {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`GET ${url} failed with ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    async function fetchOptionalJson(url, fallbackValue) {
        try {
            return await fetchJson(url);
        } catch (error) {
            if (typeof console !== "undefined" && console.warn) {
                console.warn(`Optional API unavailable: ${url}`, error);
            }
            return fallbackValue;
        }
    }

    return { fetchJson, fetchOptionalJson };
});
