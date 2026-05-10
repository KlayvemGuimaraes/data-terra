(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EnergyGrid = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
    }

    function isValidCoordinate(lat, lng) {
        return (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180 &&
            !(lat === 0 && lng === 0)
        );
    }

    function buildEnergyGridCells(plants, options = {}) {
        const cellSize = Number(options.cellSize) > 0 ? Number(options.cellSize) : 1;
        const allowedTypes = new Set(options.allowedTypes || []);
        const shouldFilterTypes = allowedTypes.size > 0;
        const cellsByKey = new Map();

        plants.forEach((plant) => {
            if (shouldFilterTypes && !allowedTypes.has(plant.type)) return;

            const lat = toNumber(plant.lat);
            const lng = toNumber(plant.lng);
            if (!isValidCoordinate(lat, lng)) return;

            const latStart = Math.floor(lat / cellSize) * cellSize;
            const lngStart = Math.floor(lng / cellSize) * cellSize;
            const key = `${latStart}:${lngStart}`;

            if (!cellsByKey.has(key)) {
                cellsByKey.set(key, {
                    id: key,
                    bounds: [
                        [latStart, lngStart],
                        [latStart + cellSize, lngStart + cellSize],
                    ],
                    center: [latStart + cellSize / 2, lngStart + cellSize / 2],
                    count: 0,
                    capacityMw: 0,
                    typeCounts: {},
                });
            }

            const cell = cellsByKey.get(key);
            const capacity = toNumber(plant.capacity_mw) || 0;

            cell.count += 1;
            cell.capacityMw += capacity;
            cell.typeCounts[plant.type] = (cell.typeCounts[plant.type] || 0) + 1;
        });

        return Array.from(cellsByKey.values())
            .map((cell) => {
                const types = Object.keys(cell.typeCounts).sort((a, b) => a.localeCompare(b));
                const dominantType = [...types].sort((a, b) => {
                    const countDiff = cell.typeCounts[b] - cell.typeCounts[a];
                    return countDiff || a.localeCompare(b);
                })[0];

                return {
                    ...cell,
                    types,
                    dominantType,
                    capacityMw: Math.round(cell.capacityMw * 100) / 100,
                };
            })
            .sort((a, b) => b.count - a.count || b.capacityMw - a.capacityMw);
    }

    return { buildEnergyGridCells };
});
