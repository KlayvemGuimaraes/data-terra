(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.RegionOptions = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    function toNumber(value) {
        if (value === null || value === undefined || value === "") return null;
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

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function scoreFromLog(value, maxReference, minScore, maxScore) {
        const number = Math.max(0, toNumber(value) || 0);
        if (number === 0) return minScore;

        const normalized = Math.log10(number + 1) / Math.log10(maxReference + 1);
        return clamp(Math.round(minScore + normalized * (maxScore - minScore)), minScore, maxScore);
    }

    function toRadians(value) {
        return (value * Math.PI) / 180;
    }

    function distanceKm(a, b) {
        const lat1 = toNumber(a?.lat);
        const lng1 = toNumber(a?.lng);
        const lat2 = toNumber(b?.lat);
        const lng2 = toNumber(b?.lng);

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

    function buildFiberContext(cables) {
        const routes = (cables || [])
            .map((cable) => ({
                name: cable.name || "Cabo sem nome",
                lines: getGeometryLines(cable.geometry),
            }))
            .filter((route) => route.lines.length > 0);

        return { routes };
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

    function nearestDistanceToRouteKm(site, lines) {
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

    function distanceToSegmentKm(site, start, end) {
        const siteLat = toNumber(site.lat);
        const siteLng = toNumber(site.lng);
        if (!isValidCoordinate(siteLat, siteLng)) return Infinity;

        const lngScale = 111.32 * Math.cos(toRadians(siteLat));
        const latScale = 111.32;
        const a = {
            x: (Number(start[0]) - siteLng) * lngScale,
            y: (Number(start[1]) - siteLat) * latScale,
        };
        const b = {
            x: (Number(end[0]) - siteLng) * lngScale,
            y: (Number(end[1]) - siteLat) * latScale,
        };
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) return Math.sqrt(a.x * a.x + a.y * a.y);

        const t = clamp((-(a.x * dx + a.y * dy)) / lengthSquared, 0, 1);
        const closest = { x: a.x + dx * t, y: a.y + dy * t };
        return Math.sqrt(closest.x * closest.x + closest.y * closest.y);
    }

    function summarizeFiberProximity(fiberContext, site) {
        let nearest = null;

        (fiberContext.routes || []).forEach((route) => {
            const candidate = {
                name: route.name,
                distanceKm: nearestDistanceToRouteKm(site, route.lines),
            };
            if (!Number.isFinite(candidate.distanceKm)) return;
            if (!nearest || candidate.distanceKm < nearest.distanceKm) {
                nearest = candidate;
            }
        });

        if (!nearest) return null;

        const band = classifyFiberDistance(nearest.distanceKm);
        return {
            hasData: true,
            score: scoreFiberDistance(nearest.distanceKm),
            label: band.label,
            className: band.className,
            nearestDistanceKm: round(nearest.distanceKm, 1),
            nearestName: nearest.name,
        };
    }

    function scoreFiberDistance(distanceKm) {
        if (!Number.isFinite(distanceKm)) return 0;
        if (distanceKm <= 5) return 100;
        if (distanceKm <= 25) {
            return clamp(Math.round(95 - ((distanceKm - 5) / 20) * 15), 80, 95);
        }
        if (distanceKm <= 75) {
            return clamp(Math.round(79 - ((distanceKm - 25) / 50) * 29), 50, 79);
        }
        return clamp(Math.round(49 - Math.min(29, (distanceKm - 75) * 0.3)), 20, 49);
    }

    function classifyFiberDistance(distanceKm) {
        if (!Number.isFinite(distanceKm)) return { label: "Sem dado", className: "unknown" };
        if (distanceKm <= 5) return { label: "Excelente", className: "high" };
        if (distanceKm <= 25) return { label: "Boa", className: "high" };
        if (distanceKm <= 75) return { label: "Moderada", className: "medium" };
        return { label: "Distante", className: "low" };
    }

    function round(value, digits = 2) {
        const factor = 10 ** digits;
        return Math.round((toNumber(value) || 0) * factor) / factor;
    }

    function formatKm(value) {
        return `${Number(value || 0).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
        })} km`;
    }

    function buildFiberTags(fiber) {
        if (!fiber?.hasData) return [];
        return [`Fibra ${fiber.label.toLowerCase()} (${formatKm(fiber.nearestDistanceKm)})`];
    }

    function formatServices(services) {
        const sorted = Array.from(services).sort((a, b) => a.localeCompare(b));
        if (sorted.includes("Água") && sorted.includes("Esgoto")) return "Água e Esgoto";
        return sorted.join(" e ") || "Sem serviço informado";
    }

    function serviceScore(services) {
        if (services.has("Água") && services.has("Esgoto")) return 78;
        if (services.has("Água")) return 70;
        if (services.has("Esgoto")) return 64;
        return 55;
    }

    function buildEnergyContext(energyRows) {
        const byCity = new Map();
        const byState = new Map();

        energyRows.forEach((row) => {
            const lat = toNumber(row.lat);
            const lng = toNumber(row.lng);
            const capacityMw = toNumber(row.capacity_mw) || 0;
            if (!row.city || !row.state || !isValidCoordinate(lat, lng)) return;

            const keys = [
                [`${row.city}::${row.state}`, byCity],
                [row.state, byState],
            ];

            keys.forEach(([key, map]) => {
                if (!map.has(key)) {
                    map.set(key, { count: 0, capacityMw: 0, types: new Set() });
                }

                const aggregate = map.get(key);
                aggregate.count += 1;
                aggregate.capacityMw += capacityMw;
                aggregate.types.add(row.type);
            });
        });

        return { byCity, byState };
    }

    function buildScores(region, energyContext, fiber) {
        const cityEnergy = energyContext.byCity.get(`${region.name}::${region.state}`);
        const stateEnergy = energyContext.byState.get(region.state);
        const population = region.population || 0;
        const localCapacity = cityEnergy?.capacityMw || 0;
        const stateCapacity = stateEnergy?.capacityMw || 0;
        const populationScore = scoreFromLog(population, 12000000, 42, 100);
        const connectivityScore = fiber?.hasData ? fiber.score : populationScore;
        const serviceCoverageScore = serviceScore(region.services);
        const renewablesScore = localCapacity > 0
            ? scoreFromLog(localCapacity, 1000, 55, 100)
            : scoreFromLog(stateCapacity, 1200, 35, 70);
        const gridScore = localCapacity > 0
            ? scoreFromLog(localCapacity, 1000, 50, 85)
            : scoreFromLog(stateCapacity, 2500, 45, 70);

        return {
            renewables: renewablesScore,
            grid: gridScore,
            water: serviceCoverageScore,
            connectivity: connectivityScore,
            licensing: clamp(Math.round(58 + serviceCoverageScore * 0.25), 60, 82),
        };
    }

    function formatMw(value) {
        return value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    }

    function groupWaterRows(waterRows) {
        const groups = new Map();

        waterRows.forEach((row) => {
            const lat = toNumber(row.lat);
            const lng = toNumber(row.lng);

            if (!row.city || !row.state || !isValidCoordinate(lat, lng)) return;

            const key = `${row.city}::${row.state}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    id: `${row.city}-${row.state}`,
                    name: row.city,
                    state: row.state,
                    latTotal: 0,
                    lngTotal: 0,
                    coordinateCount: 0,
                    population: 0,
                    providers: new Set(),
                    services: new Set(),
                });
            }

            const group = groups.get(key);
            group.latTotal += lat;
            group.lngTotal += lng;
            group.coordinateCount += 1;
            group.population = Math.max(group.population, toNumber(row.population) || 0);
            if (row.provider) group.providers.add(row.provider);
            if (row.service_type) group.services.add(row.service_type);
        });

        return Array.from(groups.values());
    }

    function buildWaterCandidateRegions(waterRows, energyContext, fiberContext) {
        return groupWaterRows(waterRows)
            .map((group) => {
                const lat = group.latTotal / group.coordinateCount;
                const lng = group.lngTotal / group.coordinateCount;
                if (!isValidCoordinate(lat, lng)) return null;

                const serviceLabel = formatServices(group.services);
                const providerLabel = Array.from(group.providers)
                    .sort((a, b) => a.localeCompare(b))
                    .slice(0, 2)
                    .join(", ");
                const region = {
                    id: group.id,
                    name: group.name,
                    state: group.state,
                    lat,
                    lng,
                    population: group.population,
                    services: group.services,
                };
                const fiber = summarizeFiberProximity(fiberContext, region);
                const scores = buildScores(region, energyContext, fiber);

                return {
                    ...region,
                    fiber,
                    summary: `Cidade com ${group.population.toLocaleString("pt-BR")} habitantes. Serviços de ${serviceLabel} registrados para ${providerLabel || "prestador não informado"}.`,
                    scores,
                    tags: [serviceLabel, group.state, ...buildFiberTags(fiber)],
                    recommendation: "Aptidão preliminar baseada em dados reais de saneamento, geração renovável e premissas territoriais declaradas.",
                    conditions: ["Validar rede elétrica local", "Confirmar disponibilidade de fibra", "Checar licenciamento ambiental municipal"],
                    methodology: {
                        dataBasis: [
                            "Saneamento municipal",
                            "Geração renovável ANEEL",
                            "População municipal",
                            ...(fiber?.hasData ? ["Rotas de cabos de fibra"] : []),
                        ],
                        assumptionNotes: [
                            "Energia e rede usam capacidade renovável no município ou na UF como indicador inicial.",
                            fiber?.hasData
                                ? "Conectividade usa proximidade das rotas de fibra; quanto mais perto do cabo, maior o indicador."
                                : "Conectividade e mercado usam população como indicador indireto até integrar rotas terrestres de fibra.",
                        ],
                    },
                };
            })
            .filter(Boolean);
    }

    function buildEnergyCandidateRegions(energyRows, existingKeys, fiberContext) {
        const grouped = new Map();

        energyRows.forEach((row) => {
            const lat = toNumber(row.lat);
            const lng = toNumber(row.lng);
            if (!row.city || !row.state || !isValidCoordinate(lat, lng)) return;

            const key = `${row.city}::${row.state}`;
            if (existingKeys.has(key)) return;

            if (!grouped.has(key)) {
                grouped.set(key, {
                    id: `energy-${row.city}-${row.state}`,
                    name: row.city,
                    state: row.state,
                    latTotal: 0,
                    lngTotal: 0,
                    count: 0,
                    capacityMw: 0,
                    types: new Set(),
                });
            }

            const group = grouped.get(key);
            group.latTotal += lat;
            group.lngTotal += lng;
            group.count += 1;
            group.capacityMw += toNumber(row.capacity_mw) || 0;
            group.types.add(row.type);
        });

        return Array.from(grouped.values()).map((group) => {
            const types = Array.from(group.types).sort((a, b) => a.localeCompare(b));
            const capacityScore = Math.min(100, Math.round(group.capacityMw / 8));
            const renewableScore = scoreFromLog(group.capacityMw, 1000, 60, 100);
            const gridScore = scoreFromLog(group.capacityMw, 1000, 55, 88);
            const region = {
                id: group.id,
                name: group.name,
                state: group.state,
                lat: group.latTotal / group.count,
                lng: group.lngTotal / group.count,
            };
            const fiber = summarizeFiberProximity(fiberContext, region);

            return {
                ...region,
                fiber,
                summary: `Cidade com ${group.count.toLocaleString("pt-BR")} usinas renováveis registradas na ANEEL, somando ${formatMw(group.capacityMw)} MW de capacidade outorgada.`,
                scores: {
                    renewables: Math.max(60, renewableScore, capacityScore),
                    grid: gridScore,
                    water: 50,
                    connectivity: fiber?.hasData ? fiber.score : 52,
                    licensing: 70,
                },
                tags: ["Energia renovável", group.state, ...buildFiberTags(fiber)],
                recommendation: "Candidato inferido por concentração de geração renovável quando não há registro de saneamento na base local.",
                conditions: ["Adicionar dados de água locais", "Validar rede elétrica e fibra no município"],
                methodology: {
                    dataBasis: [
                        "Geração renovável ANEEL",
                        ...(fiber?.hasData ? ["Rotas de cabos de fibra"] : []),
                    ],
                    assumptionNotes: [
                        "Candidato criado por concentração de usinas renováveis sem dado local de saneamento.",
                        fiber?.hasData
                            ? "Conectividade usa proximidade das rotas de fibra; quanto mais perto do cabo, maior o indicador."
                            : "Água e conectividade permanecem indicadores estimados conservadores até integrar bases locais.",
                    ],
                },
            };
        });
    }

    function buildCandidateRegions(waterRows, options = {}) {
        const energyContext = buildEnergyContext(options.energyRows || []);
        const fiberContext = buildFiberContext(options.cables || []);
        const waterRegions = buildWaterCandidateRegions(waterRows, energyContext, fiberContext);
        const existingKeys = new Set(
            waterRegions.map((region) => `${region.name}::${region.state}`),
        );
        const energyRegions = buildEnergyCandidateRegions(
            options.energyRows || [],
            existingKeys,
            fiberContext,
        );

        return [...waterRegions, ...energyRegions];
    }

    function getStateOptions(regions) {
        return Array.from(new Set(regions.map((region) => region.state))).sort((a, b) =>
            a.localeCompare(b),
        );
    }

    function filterRegionsByState(regions, state) {
        if (!state || state === "ALL") return regions;
        return regions.filter((region) => region.state === state);
    }

    return { buildCandidateRegions, filterRegionsByState, getStateOptions };
});
