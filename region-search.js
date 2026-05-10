(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.RegionSearch = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function normalizeSearchText(value) {
        return String(value || "")
            .trim()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function optionKey(item) {
        return `${normalizeSearchText(item.name)}::${item.state}`;
    }

    function byLabel(a, b) {
        return a.label.localeCompare(b.label, "pt-BR");
    }

    function buildCandidateOption(region) {
        return {
            id: region.id,
            name: region.name,
            state: region.state,
            lat: region.lat,
            lng: region.lng,
            label: `${region.name} - ${region.state}`,
            source: "candidate",
            description: "Região candidata com score territorial",
            searchText: normalizeSearchText(`${region.name} ${region.state} ${region.name} - ${region.state}`),
        };
    }

    function buildMunicipalityOption(municipality) {
        return {
            name: municipality.name,
            state: municipality.state,
            lat: municipality.lat,
            lng: municipality.lng,
            label: `${municipality.name} - ${municipality.state}`,
            source: "municipality",
            description: "Município para simulação local",
            searchText: normalizeSearchText(
                `${municipality.name} ${municipality.state} ${municipality.name} - ${municipality.state}`,
            ),
        };
    }

    function matchesState(item, selectedState) {
        return !selectedState || selectedState === "ALL" || item.state === selectedState;
    }

    function buildRegionSearchOptions(regions, municipalities, selectedState) {
        const candidateOptions = (regions || [])
            .filter((region) => matchesState(region, selectedState))
            .map(buildCandidateOption)
            .sort(byLabel);
        const candidateKeys = new Set(candidateOptions.map(optionKey));

        const municipalityOptions = (municipalities || [])
            .filter((municipality) => matchesState(municipality, selectedState))
            .filter((municipality) => !candidateKeys.has(optionKey(municipality)))
            .map(buildMunicipalityOption)
            .sort(byLabel);

        return [...candidateOptions, ...municipalityOptions];
    }

    function findRegionOption(options, typedText) {
        const query = normalizeSearchText(typedText);
        if (!query) return null;

        return (
            (options || []).find((option) => normalizeSearchText(option.label) === query) ||
            (options || []).find((option) => normalizeSearchText(option.name) === query) ||
            (options || []).find((option) => option.searchText.startsWith(query)) ||
            (options || []).find((option) => option.searchText.includes(query)) ||
            null
        );
    }

    return {
        buildRegionSearchOptions,
        findRegionOption,
        normalizeSearchText,
    };
});
