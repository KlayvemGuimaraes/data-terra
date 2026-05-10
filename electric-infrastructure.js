(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ElectricInfrastructure = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
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

    function buildElectricInfrastructure(energyRows, waterRows = [], options = {}) {
        const cellSize = toNumber(options.cellSize, 1);
        const minSubstationCapacityMw = toNumber(options.minSubstationCapacityMw, 80);
        const maxSubstations = toNumber(options.maxSubstations, 90);
        const maxLineDistanceKm = toNumber(options.maxLineDistanceKm, 260);
        const maxLines = toNumber(options.maxLines, 130);
        const minLoadPopulation = toNumber(options.minLoadPopulation, 100000);
        const maxLoadCenters = toNumber(options.maxLoadCenters, 70);
        const cells = buildGenerationConnectionCells(energyRows, cellSize)
            .filter((cell) => cell.capacityMw >= minSubstationCapacityMw)
            .sort((a, b) => b.capacityMw - a.capacityMw || b.plantCount - a.plantCount)
            .slice(0, maxSubstations);

        return {
            substations: cells,
            transmissionLines: buildTransmissionLinks(cells, {
                maxLineDistanceKm,
                maxLines,
            }),
            loadCenters: buildLoadCenters(waterRows, {
                minLoadPopulation,
                maxLoadCenters,
            }),
        };
    }

    function buildGenerationConnectionCells(energyRows, cellSize) {
        const cellsByKey = new Map();

        energyRows.forEach((row) => {
            const lat = toNumber(row?.lat, NaN);
            const lng = toNumber(row?.lng, NaN);
            if (!isValidCoordinate(lat, lng)) return;

            const capacity = Math.max(0, toNumber(row.capacity_mw));
            if (capacity <= 0) return;

            const latStart = Math.floor(lat / cellSize) * cellSize;
            const lngStart = Math.floor(lng / cellSize) * cellSize;
            const key = `${latStart}:${lngStart}`;

            if (!cellsByKey.has(key)) {
                cellsByKey.set(key, {
                    id: key,
                    lat: latStart + cellSize / 2,
                    lng: lngStart + cellSize / 2,
                    capacityMw: 0,
                    plantCount: 0,
                    typeCounts: {},
                    cities: new Map(),
                    states: new Map(),
                });
            }

            const cell = cellsByKey.get(key);
            cell.capacityMw += capacity;
            cell.plantCount += 1;
            cell.typeCounts[row.type] = (cell.typeCounts[row.type] || 0) + 1;
            increment(cell.cities, row.city);
            increment(cell.states, row.state);
        });

        return Array.from(cellsByKey.values()).map((cell) => {
            const typeNames = Object.keys(cell.typeCounts).sort((a, b) => a.localeCompare(b));
            const dominantType = typeNames
                .slice()
                .sort((a, b) => cell.typeCounts[b] - cell.typeCounts[a] || a.localeCompare(b))[0] || "Renovável";

            return {
                id: `electric-${cell.id}`,
                lat: round(cell.lat, 4),
                lng: round(cell.lng, 4),
                city: mostFrequent(cell.cities),
                state: mostFrequent(cell.states),
                capacityMw: round(cell.capacityMw, 1),
                plantCount: cell.plantCount,
                dominantType,
                types: typeNames,
            };
        });
    }

    function buildTransmissionLinks(substations, options) {
        const linksById = new Map();

        substations.forEach((origin) => {
            substations
                .filter((target) => target.id !== origin.id)
                .map((target) => ({
                    from: origin,
                    to: target,
                    distanceKm: distanceKm(origin, target),
                }))
                .filter((link) => link.distanceKm <= options.maxLineDistanceKm)
                .sort((a, b) => a.distanceKm - b.distanceKm)
                .slice(0, 2)
                .forEach((link) => {
                    const id = [link.from.id, link.to.id].sort().join("--");
                    if (!linksById.has(id)) {
                        linksById.set(id, {
                            id,
                            from: link.from,
                            to: link.to,
                            distanceKm: round(link.distanceKm, 1),
                        });
                    }
                });
        });

        return Array.from(linksById.values())
            .sort((a, b) => a.distanceKm - b.distanceKm)
            .slice(0, options.maxLines);
    }

    function buildLoadCenters(waterRows, options) {
        const centersByKey = new Map();

        waterRows.forEach((row) => {
            const lat = toNumber(row?.lat, NaN);
            const lng = toNumber(row?.lng, NaN);
            const population = toNumber(row?.population);
            if (!isValidCoordinate(lat, lng) || population < options.minLoadPopulation) return;

            const key = `${row.city || "Cidade"}/${row.state || ""}`;
            if (!centersByKey.has(key)) {
                centersByKey.set(key, {
                    id: `load-${key}`,
                    city: row.city || "Cidade",
                    state: row.state || "",
                    lat,
                    lng,
                    population,
                    services: new Set(),
                });
            }

            const center = centersByKey.get(key);
            center.population = Math.max(center.population, population);
            if (row.service_type) center.services.add(row.service_type);
        });

        return Array.from(centersByKey.values())
            .sort((a, b) => b.population - a.population)
            .slice(0, options.maxLoadCenters)
            .map((center) => ({
                ...center,
                services: Array.from(center.services).sort((a, b) => a.localeCompare(b)),
            }));
    }

    function increment(map, value) {
        const key = String(value || "").trim();
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
    }

    function mostFrequent(map) {
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || "";
    }

    function distanceKm(a, b) {
        const earthRadiusKm = 6371;
        const dLat = toRadians(toNumber(b.lat) - toNumber(a.lat));
        const dLng = toRadians(toNumber(b.lng) - toNumber(a.lng));
        const originLat = toRadians(toNumber(a.lat));
        const targetLat = toRadians(toNumber(b.lat));
        const h =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(originLat) * Math.cos(targetLat) * Math.sin(dLng / 2) ** 2;

        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    function toRadians(value) {
        return (value * Math.PI) / 180;
    }

    function round(value, decimals = 0) {
        const factor = 10 ** decimals;
        return Math.round(value * factor) / factor;
    }

    return { buildElectricInfrastructure };
});
