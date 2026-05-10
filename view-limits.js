(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ViewLimits = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function sortByScore(regions, getScore) {
        return [...regions].sort((a, b) => getScore(b) - getScore(a));
    }

    function includeSelected(regions, selectedRegion) {
        if (!selectedRegion) return regions;
        if (regions.some((region) => region.id === selectedRegion.id)) return regions;
        return [...regions, selectedRegion];
    }

    function limitRankedRegions(regions, getScore, selectedRegion = null, maxItems = 30) {
        const sorted = sortByScore(regions, getScore);
        const limited = includeSelected(sorted.slice(0, maxItems), selectedRegion);

        return {
            regions: limited,
            totalCount: sorted.length,
            hiddenCount: Math.max(0, sorted.length - limited.length),
        };
    }

    function limitSelectableRegions(
        regions,
        getScore,
        selectedState,
        selectedRegion = null,
        maxNationalItems = 120,
    ) {
        if (selectedState !== "ALL") return regions;
        return includeSelected(sortByScore(regions, getScore).slice(0, maxNationalItems), selectedRegion);
    }

    function limitMapRegions(
        regions,
        getScore,
        selectedState,
        selectedRegion = null,
        maxNationalItems = 80,
        maxStateItems = 140,
    ) {
        const maxItems = selectedState === "ALL" ? maxNationalItems : maxStateItems;
        const sorted = sortByScore(regions, getScore);
        const limited = includeSelected(sorted.slice(0, maxItems), selectedRegion);

        return {
            regions: limited,
            totalCount: sorted.length,
            hiddenCount: Math.max(0, sorted.length - limited.length),
        };
    }

    return { limitMapRegions, limitRankedRegions, limitSelectableRegions };
});
