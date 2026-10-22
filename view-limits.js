(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ViewLimits = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function compareRegions(a, b) {
        return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR") ||
            String(a.state || "").localeCompare(String(b.state || ""), "pt-BR") ||
            String(a.id).localeCompare(String(b.id), "pt-BR");
    }

    function sortByPillar(regions, pillarId, getGroupScores) {
        return regions
            .map(region => ({ region, score: getGroupScores(region)[pillarId] }))
            .sort((a, b) => {
                const aActive = Number.isFinite(a.score);
                const bActive = Number.isFinite(b.score);
                if (aActive !== bActive) return aActive ? -1 : 1;
                if (aActive && a.score !== b.score) return b.score - a.score;
                return compareRegions(a.region, b.region);
            })
            .map(({ region }) => region);
    }

    function includeSelected(regions, selectedRegion) {
        if (!selectedRegion) return regions;
        if (regions.some((region) => region.id === selectedRegion.id)) return regions;
        return [...regions, selectedRegion];
    }

    function limitRankedRegions(regions, pillarId, getGroupScores, selectedRegion = null, maxItems = 30) {
        const sorted = sortByPillar(regions, pillarId, getGroupScores);
        const limited = includeSelected(sorted.slice(0, maxItems), selectedRegion);

        return {
            regions: limited,
            totalCount: sorted.length,
            hiddenCount: Math.max(0, sorted.length - limited.length),
        };
    }

    function limitMapRegions(
        regions,
        selectedState,
        selectedRegion = null,
        maxNationalItems = 80,
        maxStateItems = 140,
    ) {
        const maxItems = selectedState === "ALL" ? maxNationalItems : maxStateItems;
        const sorted = [...regions].sort(compareRegions);
        const limited = includeSelected(sorted.slice(0, maxItems), selectedRegion);

        return {
            regions: limited,
            totalCount: sorted.length,
            hiddenCount: Math.max(0, sorted.length - limited.length),
        };
    }

    return { limitMapRegions, limitRankedRegions };
});
