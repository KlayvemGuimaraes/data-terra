(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory(require("./wui-model"));
    } else {
        root.SiteAnalysis = factory(root.WuiModel);
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function (WuiModel) {
    const TYPE_ORDER = ["Hidro", "Solar", "Biomassa", "Eólica"];
    const DEFAULT_WEIGHTS = {
        renewables: 5,
        grid: 4,
        water: 5,
        environment: 4,
        connectivity: 3,
        licensing: 4,
    };

    function toNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
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

    function distanceKm(a, b) {
        const lat1 = toNumber(a?.lat, NaN);
        const lng1 = toNumber(a?.lng, NaN);
        const lat2 = toNumber(b?.lat, NaN);
        const lng2 = toNumber(b?.lng, NaN);

        if (!isValidCoordinate(lat1, lng1) || !isValidCoordinate(lat2, lng2)) {
            return Infinity;
        }

        const earthRadiusKm = 6371;
        const dLat = toRadians(lat2 - lat1);
        const dLng = toRadians(lng2 - lng1);
        const originLat = toRadians(lat1);
        const targetLat = toRadians(lat2);
        const h =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(originLat) * Math.cos(targetLat) * Math.sin(dLng / 2) ** 2;

        return earthRadiusKm * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    }

    function toRadians(value) {
        return (value * Math.PI) / 180;
    }

    function withDistance(row, site) {
        const lat = toNumber(row?.lat, NaN);
        const lng = toNumber(row?.lng, NaN);
        if (!isValidCoordinate(lat, lng)) return null;
        return { ...row, distanceKm: distanceKm(site, { lat, lng }) };
    }

    function rowsWithinRadius(rows, site, radiusKm) {
        return rows
            .map((row) => withDistance(row, site))
            .filter((row) => row && row.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm);
    }

    function summarizeEnergy(plants, itLoadMw) {
        const capacityByType = new Map(TYPE_ORDER.map((type) => [type, 0]));
        let totalCapacityMw = 0;

        plants.forEach((plant) => {
            const capacity = Math.max(0, toNumber(plant.capacity_mw));
            if (!capacityByType.has(plant.type)) capacityByType.set(plant.type, 0);
            capacityByType.set(plant.type, capacityByType.get(plant.type) + capacity);
            totalCapacityMw += capacity;
        });

        const orderedTypes = [
            ...TYPE_ORDER,
            ...Array.from(capacityByType.keys()).filter((type) => !TYPE_ORDER.includes(type)).sort(),
        ];
        const roundedTotal = round(totalCapacityMw);

        return {
            totalPlants: plants.length,
            totalCapacityMw: roundedTotal,
            types: orderedTypes.map((type) => {
                const capacityMw = round(capacityByType.get(type) || 0);
                const percentage = totalCapacityMw > 0
                    ? Math.round((capacityMw / totalCapacityMw) * 100)
                    : 0;
                return { type, capacityMw, percentage };
            }),
            topPlants: plants
                .slice()
                .sort((a, b) => toNumber(b.capacity_mw) - toNumber(a.capacity_mw))
                .slice(0, 5)
                .map((plant) => ({
                    name: plant.name,
                    type: plant.type,
                    city: plant.city,
                    state: plant.state,
                    capacityMw: round(toNumber(plant.capacity_mw)),
                    distanceKm: round(plant.distanceKm, 1),
                })),
            coveragePercentage: calculateCoveragePercentage(roundedTotal, itLoadMw),
        };
    }

    function summarizeWater(rows) {
        const services = new Set();
        const municipalities = new Set();
        const providers = new Set();
        let population = 0;

        rows.forEach((row) => {
            if (row.service_type) services.add(row.service_type);
            if (row.city && row.state) municipalities.add(`${row.city}/${row.state}`);
            if (row.provider) providers.add(row.provider);
            population = Math.max(population, toNumber(row.population));
        });

        return {
            points: rows.length,
            municipalities: municipalities.size,
            population,
            services: normalizeServices(services),
            providers: Array.from(providers).sort((a, b) => a.localeCompare(b)).slice(0, 5),
            nearestDistanceKm: rows[0] ? round(rows[0].distanceKm, 1) : null,
            items: rows.slice(0, 5).map((row) => ({
                city: row.city,
                state: row.state,
                serviceType: row.service_type,
                provider: row.provider,
                distanceKm: round(row.distanceKm, 1),
            })),
        };
    }

    function normalizeServices(services) {
        const values = Array.from(services);
        const hasWater = values.some((value) => String(value).includes("Água"));
        const hasSewage = values.some((value) => String(value).includes("Esgoto"));
        const ordered = [];
        if (hasWater) ordered.push("Água");
        if (hasSewage) ordered.push("Esgoto");
        values
            .filter((value) => !ordered.includes(value))
            .sort((a, b) => a.localeCompare(b))
            .forEach((value) => ordered.push(value));
        return ordered;
    }

    function summarizeCables(cables, site, radiusKm) {
        const nearby = cables
            .map((cable) => ({
                name: cable.name || "Cabo sem nome",
                owners: cable.owners,
                distanceKm: minDistanceToGeometryKm(site, cable.geometry),
            }))
            .filter((cable) => Number.isFinite(cable.distanceKm))
            .sort((a, b) => a.distanceKm - b.distanceKm);
        const withinRadius = nearby.filter((cable) => cable.distanceKm <= radiusKm);
        const nearest = nearby[0];

        return {
            count: withinRadius.length,
            nearestDistanceKm: nearest ? round(nearest.distanceKm, 1) : null,
            nearestName: nearest?.name || null,
            items: withinRadius.slice(0, 5).map((cable) => ({
                ...cable,
                distanceKm: round(cable.distanceKm, 1),
            })),
        };
    }

    function minDistanceToGeometryKm(site, geometry) {
        const lines = getGeometryLines(geometry);
        let min = Infinity;

        lines.forEach((line) => {
            for (let index = 0; index < line.length; index += 1) {
                const point = line[index];
                if (!isLngLat(point)) continue;

                min = Math.min(min, distanceKm(site, { lat: point[1], lng: point[0] }));

                if (index === 0 || !isLngLat(line[index - 1])) continue;
                min = Math.min(min, distanceToSegmentKm(site, line[index - 1], point));
            }
        });

        return min;
    }

    function getGeometryLines(geometry) {
        if (!geometry) return [];
        if (geometry.type === "LineString") return [geometry.coordinates || []];
        if (geometry.type === "MultiLineString") return geometry.coordinates || [];
        return [];
    }

    function isLngLat(point) {
        return (
            Array.isArray(point) &&
            point.length >= 2 &&
            Number.isFinite(Number(point[0])) &&
            Number.isFinite(Number(point[1]))
        );
    }

    function distanceToSegmentKm(site, start, end) {
        const lngScale = 111.32 * Math.cos(toRadians(site.lat));
        const latScale = 111.32;
        const a = {
            x: (start[0] - site.lng) * lngScale,
            y: (start[1] - site.lat) * latScale,
        };
        const b = {
            x: (end[0] - site.lng) * lngScale,
            y: (end[1] - site.lat) * latScale,
        };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) return Math.sqrt(a.x * a.x + a.y * a.y);

        const t = clamp((-(a.x * dx + a.y * dy)) / lengthSquared, 0, 1);
        const closest = { x: a.x + dx * t, y: a.y + dy * t };
        return Math.sqrt(closest.x * closest.x + closest.y * closest.y);
    }

    function inferNearestRegion(site, regions) {
        const candidates = (regions || [])
            .map((region) => {
                const lat = toNumber(region.lat, NaN);
                const lng = toNumber(region.lng, NaN);
                if (!isValidCoordinate(lat, lng)) return null;
                return {
                    id: region.id,
                    name: region.name,
                    state: region.state,
                    lat,
                    lng,
                    distanceKm: distanceKm(site, { lat, lng }),
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distanceKm - b.distanceKm);

        return candidates[0] || null;
    }

    function calculateCoveragePercentage(totalCapacityMw, itLoadMw) {
        const load = Math.max(1, toNumber(itLoadMw, 50));
        return Math.round((totalCapacityMw / load) * 100);
    }

    function scoreRenewables(totalCapacityMw, itLoadMw) {
        return clamp(Math.round((totalCapacityMw / Math.max(1, itLoadMw)) * 100), 0, 100);
    }

    function scoreWater(water, impact) {
        const hasWater = water.services.includes("Água");
        const hasSewage = water.services.includes("Esgoto");
        const serviceScore = hasWater && hasSewage ? 88 : hasWater ? 72 : hasSewage ? 64 : 42;
        return clamp(Math.round(impact.suitabilityScore * 0.65 + serviceScore * 0.35), 0, 100);
    }

    function scoreConnectivity(cables, radiusKm) {
        if (cables.count > 0) return clamp(82 + cables.count * 2, 82, 100);
        if (cables.nearestDistanceKm === null) return 35;
        if (cables.nearestDistanceKm <= radiusKm * 1.5) return 68;
        if (cables.nearestDistanceKm <= radiusKm * 3) return 55;
        return 40;
    }

    function buildScores(energy, water, cables, impact, itLoadMw, radiusKm) {
        const renewables = scoreRenewables(energy.totalCapacityMw, itLoadMw);
        const connectivity = scoreConnectivity(cables, radiusKm);
        return {
            renewables,
            grid: clamp(Math.round(renewables * 0.7 + connectivity * 0.3), 0, 100),
            water: scoreWater(water, impact),
            environment: impact.suitabilityScore,
            connectivity,
            licensing: water.points > 0 ? 76 : 58,
        };
    }

    function weightedScore(scores, weights) {
        const entries = Object.entries(weights || DEFAULT_WEIGHTS);
        const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
        const weighted = entries.reduce((sum, [key, weight]) => {
            return sum + (scores[key] || 0) * weight;
        }, 0);
        return Math.round(weighted / totalWeight);
    }

    function analyzeSiteResources(data, site, options = {}) {
        const radiusKm = clamp(toNumber(options.radiusKm, 100), 5, 500);
        const regions = options.regions || [];
        const nearestRegion = inferNearestRegion(site, regions);
        const state = String(site?.state || nearestRegion?.state || "NA").toUpperCase();
        const itLoadMw = clamp(toNumber(options.wuiConfig?.itLoadMw, 50), 1, 500);
        const waterUseIntensityLPerKwh = clamp(
            toNumber(options.wuiConfig?.waterUseIntensityLPerKwh, 1),
            0,
            5,
        );
        const energyRows = rowsWithinRadius(data.energy || [], site, radiusKm);
        const waterRows = rowsWithinRadius(data.water || [], site, radiusKm);
        const impact = WuiModel.calculateWuiAssessment({
            state,
            itLoadMw,
            waterUseIntensityLPerKwh,
        });
        const energy = summarizeEnergy(energyRows, itLoadMw);
        const water = summarizeWater(waterRows);
        const cables = summarizeCables(data.cables || [], site, radiusKm);
        const scores = buildScores(energy, water, cables, impact, itLoadMw, radiusKm);

        return {
            site: {
                lat: round(toNumber(site?.lat), 5),
                lng: round(toNumber(site?.lng), 5),
                state,
                stateSource: site?.state ? "informado" : nearestRegion ? "região candidata mais próxima" : "indefinido",
                nearestRegion: nearestRegion
                    ? {
                        id: nearestRegion.id,
                        name: nearestRegion.name,
                        state: nearestRegion.state,
                        distanceKm: round(nearestRegion.distanceKm, 1),
                    }
                    : null,
            },
            radiusKm,
            load: {
                itLoadMw,
                annualEnergyGwh: round(itLoadMw * 8.76, 1),
                renewableCoveragePercentage: energy.coveragePercentage,
            },
            energy,
            water,
            cables,
            impact,
            scores,
            overallScore: weightedScore(scores, options.weights || DEFAULT_WEIGHTS),
        };
    }

    function round(value, digits = 2) {
        const factor = 10 ** digits;
        return Math.round(toNumber(value) * factor) / factor;
    }

    return {
        analyzeSiteResources,
        distanceKm,
        minDistanceToGeometryKm,
    };
});
