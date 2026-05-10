let map;
let energyRenderer;
let electricRenderer;
let regionRenderer;
let layers = {
    cables: L.layerGroup(),
    water: L.layerGroup(),
    energy: L.layerGroup(),
    electric: L.layerGroup(),
    regions: L.layerGroup(),
    site: L.layerGroup()
};

let activeLayers = new Set(["energy", "electric", "cables", "water"]);
let weights = {
    renewables: 5,
    grid: 4,
    water: 5,
    connectivity: 3,
    licensing: 4,
};

let selectedRegion = null;
let selectedState = "ALL";
let wuiConfig = {
    preset: "standard",
    waterUseIntensityLPerKwh: WuiModel.WATER_USE_PRESETS.standard.intensity,
    itLoadMw: 50,
};
let siteConfig = {
    radiusKm: 100,
};
let allRegionsData = [];
let regionsData = [];
let regionSearchOptions = [];
let simulatedSite = null;
let siteAnalysis = null;
let currentData = {
    cables: [],
    water: [],
    energy: [],
    municipalities: []
};

let subFilters = {
    energy: { type: ["Solar", "Eólica", "Hidro", "Biomassa"] },
    water: { service: ["Água", "Esgoto"], pop: 0 }
};

const metricLabels = {
    renewables: "Energia renovável",
    grid: "Infraestrutura elétrica",
    water: "Segurança hídrica (WUI)",
    connectivity: "Conectividade e mercado",
    licensing: "Segurança regulatória",
};

const energyTypeColors = {
    Solar: "#facc15",
    "Eólica": "#22c55e",
    Hidro: "#38bdf8",
    Biomassa: "#fb923c",
};
const mixedEnergyColor = "#a5f3fc";

// Map Initialization
function initMap() {
    map = L.map('map', {
        center: [-15.7801, -47.9292], // Center of Brazil
        zoom: 4,
        zoomControl: false
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    map.createPane("energyGridPane");
    map.getPane("energyGridPane").style.zIndex = 380;
    map.createPane("electricPane");
    map.getPane("electricPane").style.zIndex = 405;
    map.createPane("regionPane");
    map.getPane("regionPane").style.zIndex = 430;
    map.createPane("sitePane");
    map.getPane("sitePane").style.zIndex = 470;

    energyRenderer = L.canvas({ pane: "energyGridPane", padding: 0.5 });
    electricRenderer = L.canvas({ pane: "electricPane", padding: 0.5 });
    regionRenderer = L.canvas({ pane: "regionPane", padding: 0.5 });
    Object.values(layers).forEach(layer => layer.addTo(map));
    map.on("zoomend", () => {
        if (map.hasLayer(layers.energy)) renderEnergy();
    });
    map.on("click", (event) => {
        setSimulatedSite(event.latlng, { activateResults: true });
        activatePanelTabByTarget("controls-site");
    });
}

function initPanelTabs() {
    document.querySelectorAll(".panel-tabs").forEach(tabList => {
        tabList.addEventListener("click", (event) => {
            const button = event.target.closest("[data-tab-target]");
            if (!button) return;

            const panel = button.closest(".panel");
            setActivePanelTab(panel, button.dataset.tabTarget);
        });
    });
}

function initInfoHints() {
    const viewportPadding = 12;

    document.querySelectorAll(".info-hint").forEach((hint) => {
        const tooltip = hint.querySelector(".info-tooltip");
        if (!tooltip) return;

        const positionTooltip = () => {
            const hintRect = hint.getBoundingClientRect();
            const tooltipWidth = Math.min(260, window.innerWidth - viewportPadding * 2);
            const tooltipHeight = tooltip.offsetHeight || 64;
            let left = hintRect.left + hintRect.width / 2 - tooltipWidth / 2;
            let top = hintRect.bottom + 8;

            left = Math.max(
                viewportPadding,
                Math.min(left, window.innerWidth - tooltipWidth - viewportPadding),
            );

            if (top + tooltipHeight > window.innerHeight - viewportPadding) {
                top = Math.max(viewportPadding, hintRect.top - tooltipHeight - 8);
            }

            tooltip.style.setProperty("--tooltip-left", `${left}px`);
            tooltip.style.setProperty("--tooltip-top", `${top}px`);
            tooltip.style.setProperty("--tooltip-width", `${tooltipWidth}px`);
        };

        hint.addEventListener("mouseenter", positionTooltip);
        hint.addEventListener("focus", positionTooltip);
        hint.addEventListener("touchstart", positionTooltip, { passive: true });
        hint.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            positionTooltip();
        });
    });
}

function setActivePanelTab(panel, target) {
    if (!panel || !target) return;

    panel.querySelectorAll("[data-tab-target]").forEach(tabButton => {
        tabButton.classList.toggle("is-active", tabButton.dataset.tabTarget === target);
    });

    panel.querySelectorAll("[data-tab-panel]").forEach(tabPanel => {
        const isActive = tabPanel.dataset.tabPanel === target;
        tabPanel.hidden = !isActive;
        tabPanel.classList.toggle("is-active", isActive);
    });
}

function activatePanelTabByTarget(target) {
    const button = document.querySelector(`[data-tab-target="${target}"]`);
    if (!button) return;
    setActivePanelTab(button.closest(".panel"), target);
}

// Data Fetching
async function fetchData() {
    try {
        const [cables, water, energy, municipalities] = await Promise.all([
            ApiClient.fetchJson('/api/cables'),
            ApiClient.fetchJson('/api/water'),
            ApiClient.fetchJson('/api/energy'),
            ApiClient.fetchOptionalJson('/api/municipalities', [])
        ]);

        currentData = { cables, water, energy, municipalities };

        renderCables();
        renderWater();
        renderEnergy();
        renderElectricInfrastructure();
        
        allRegionsData = RegionOptions.buildCandidateRegions(water, { energyRows: energy, cables });
        selectedState = "ALL";
        regionsData = RegionOptions.filterRegionsByState(allRegionsData, selectedState);

        renderRegions();
        renderRanking();
        renderWeights();
        renderWuiControls();
        renderSiteControls();
        renderStateSelect();
        renderSelect();
        
        const topRegion = getTopRegion();
        if (topRegion) selectRegion(topRegion.id);
        if (!topRegion) renderSiteAnalysis();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderCables() {
    layers.cables.clearLayers();
    currentData.cables.forEach(cable => {
        L.geoJSON(cable.geometry, {
            style: {
                color: '#3b82f6',
                weight: 2,
                opacity: 0.6
            }
        }).bindPopup(`<strong>Cable: ${cable.name}</strong><br>Owners: ${cable.owners}`).addTo(layers.cables);
    });
}

function renderWater() {
    layers.water.clearLayers();
    const filtered = currentData.water.filter(w => {
        const matchesService = subFilters.water.service.includes(w.service_type);
        const matchesPop = w.population >= subFilters.water.pop;
        return matchesService && matchesPop;
    });

    filtered.forEach(w => {
        L.circleMarker([w.lat, w.lng], {
            radius: 4,
            fillColor: '#0ea5e9',
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        }).bindPopup(`<strong>${w.city}</strong><br>População: ${w.population.toLocaleString()}<br>Serviço: ${w.service_type}`).addTo(layers.water);
    });
}

function renderEnergy() {
    layers.energy.clearLayers();
    const cells = EnergyGrid.buildEnergyGridCells(currentData.energy, {
        cellSize: getEnergyCellSize(),
        allowedTypes: subFilters.energy.type,
    });

    cells.forEach(cell => {
        const color = getEnergyCellColor(cell);
        const fillOpacity = Math.min(0.76, 0.22 + Math.log10(cell.count + 1) * 0.24);

        L.rectangle(cell.bounds, {
            renderer: energyRenderer,
            pane: "energyGridPane",
            color,
            weight: 1,
            opacity: 0.95,
            fillColor: color,
            fillOpacity,
            interactive: true,
        }).bindPopup(renderEnergyCellPopup(cell)).addTo(layers.energy);
    });
}

function getEnergyCellSize() {
    const zoom = map.getZoom();
    if (zoom <= 4) return 2;
    if (zoom <= 6) return 1;
    if (zoom <= 8) return 0.5;
    return 0.25;
}

function getEnergyCellColor(cell) {
    if (cell.types.length > 1) return mixedEnergyColor;
    return energyTypeColors[cell.dominantType] || "#e5e7eb";
}

function renderEnergyCellPopup(cell) {
    const capacity = cell.capacityMw.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
    });
    const count = cell.count.toLocaleString("pt-BR");

    return `
        <strong>Energia renovável agregada</strong><br>
        ${count} usina${cell.count === 1 ? "" : "s"} nesta área<br>
        Capacidade somada: ${capacity} MW<br>
        Tipos: ${cell.types.join(", ")}
    `;
}

function renderElectricInfrastructure() {
    layers.electric.clearLayers();

    const infrastructure = ElectricInfrastructure.buildElectricInfrastructure(currentData.energy, currentData.water, {
        cellSize: 1,
        minSubstationCapacityMw: 80,
        maxSubstations: 90,
        maxLineDistanceKm: 260,
        maxLines: 130,
        minLoadPopulation: 100000,
        maxLoadCenters: 70,
    });

    infrastructure.transmissionLines.forEach((line) => {
        L.polyline(
            [
                [line.from.lat, line.from.lng],
                [line.to.lat, line.to.lng],
            ],
            {
                renderer: electricRenderer,
                pane: "electricPane",
                color: "#f59e0b",
                weight: 1.7,
                opacity: 0.62,
                dashArray: "6 5",
                interactive: true,
            },
        ).bindPopup(`
            <strong>Linha de transmissão estimada</strong><br>
            Liga polos ANEEL próximos para indicar eixo elétrico provável.<br>
            Distância: ${formatKm(line.distanceKm)}
        `).addTo(layers.electric);
    });

    infrastructure.substations.forEach((node) => {
        L.circleMarker([node.lat, node.lng], {
            renderer: electricRenderer,
            pane: "electricPane",
            radius: Math.min(8, 4 + Math.log10(node.capacityMw + 1)),
            color: "#ffffff",
            weight: 1.5,
            opacity: 0.95,
            fillColor: "#8b5cf6",
            fillOpacity: 0.84,
            interactive: true,
        }).bindPopup(`
            <strong>Subestação estimada</strong><br>
            ${node.city ? `${node.city}/${node.state}<br>` : ""}
            Polo renovável ANEEL: ${formatMw(node.capacityMw)}<br>
            Usinas no entorno: ${node.plantCount}<br>
            Fonte dominante: ${node.dominantType}
        `).addTo(layers.electric);
    });

    infrastructure.loadCenters.forEach((center) => {
        L.circleMarker([center.lat, center.lng], {
            renderer: electricRenderer,
            pane: "electricPane",
            radius: Math.min(7, 3 + Math.log10(center.population + 1) - 4),
            color: "#ffffff",
            weight: 1.2,
            opacity: 0.9,
            fillColor: "#0f766e",
            fillOpacity: 0.82,
            interactive: true,
        }).bindPopup(`
            <strong>Carga elétrica</strong><br>
            ${center.city}/${center.state}<br>
            População atendida: ${center.population.toLocaleString("pt-BR")}<br>
            Serviços: ${formatServices(center.services)}
        `).addTo(layers.electric);
    });
}

function renderRegions() {
    layers.regions.clearLayers();
    const visible = ViewLimits.limitMapRegions(regionsData, getScore, selectedState, selectedRegion);
    const ordered = [...visible.regions].sort((a, b) => {
        if (a.id === selectedRegion?.id) return 1;
        if (b.id === selectedRegion?.id) return -1;
        return getScore(a) - getScore(b);
    });

    ordered.forEach(region => {
        const score = getScore(region);
        const status = getClass(score);
        const isSelected = region.id === selectedRegion?.id;
        const marker = L.circleMarker([region.lat, region.lng], {
            renderer: regionRenderer,
            pane: "regionPane",
            radius: isSelected ? 10 : getRegionMarkerRadius(score),
            color: isSelected ? "#ffffff" : "#f8fafc",
            weight: isSelected ? 3 : 1.5,
            opacity: 0.95,
            fillColor: getRegionMarkerColor(status.className),
            fillOpacity: isSelected ? 0.96 : 0.76,
            interactive: true,
        }).bindPopup(`
            <strong>${region.name}/${region.state}</strong><br>
            Score territorial: ${score}/100<br>
            ${region.tags.join(" • ")}
        `);

        marker.on('click', () => selectRegion(region.id));
        if (isSelected) {
            marker.bindTooltip(String(score), {
                permanent: true,
                direction: "center",
                className: "selected-region-score",
            });
        }
        marker.addTo(layers.regions);
    });

    document.querySelector("#mapCandidateNote").textContent = visible.hiddenCount > 0
        ? `Mapa: ${visible.regions.length} candidatos prioritários de ${visible.totalCount}.`
        : `Mapa: ${visible.totalCount} candidatos neste recorte.`;
}

function getRegionMarkerRadius(score) {
    if (score >= 80) return 6.5;
    if (score >= 70) return 5.5;
    return 4.5;
}

function getRegionMarkerColor(className) {
    const colors = {
        high: "#1f9d63",
        medium: "#c58a14",
        low: "#c54532",
    };
    return colors[className] || "#0c6b58";
}

// Logic helpers (same as original but adapted)
function getScore(region) {
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
    const scores = getEffectiveScores(region);
    const weighted = Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + (scores[key] || 0) * weight;
    }, 0);
    return Math.round(weighted / totalWeight);
}

function getWuiInput(region) {
    return {
        state: region.state,
        waterUseIntensityLPerKwh: wuiConfig.waterUseIntensityLPerKwh,
        itLoadMw: wuiConfig.itLoadMw,
    };
}

function getWuiAssessment(region) {
    return WuiModel.calculateWuiAssessment(getWuiInput(region));
}

function getEffectiveScores(region) {
    return WuiModel.applyWuiToScores(region.scores, getWuiInput(region));
}

function getClass(score) {
    if (score >= 80) return { label: "Alta aptidão", className: "high" };
    if (score >= 60) return { label: "Condicionada", className: "medium" };
    return { label: "Alto risco", className: "low" };
}

function getTopRegion() {
    return [...regionsData].sort((a, b) => getScore(b) - getScore(a))[0];
}

function selectRegion(id) {
    const region = regionsData.find(r => r.id === id);
    if (!region) return;
    
    selectedRegion = region;
    setSimulatedSite(
        { lat: region.lat, lng: region.lng, state: region.state },
        { activateResults: false, skipTabChange: true },
    );
    renderRegions();
    map.flyTo([region.lat, region.lng], 8);
    renderDetails();
    renderRanking();
    setRegionSearchValue(region);
}

function setSimulatedSite(latlng, options = {}) {
    if (!latlng || !Number.isFinite(Number(latlng.lat)) || !Number.isFinite(Number(latlng.lng))) return;

    simulatedSite = {
        lat: Number(latlng.lat),
        lng: Number(latlng.lng),
        state: latlng.state,
    };

    renderSiteAnalysis();
    renderSiteMarker();
    renderSiteControls();

    if (options.activateResults) {
        activatePanelTabByTarget("result-site");
    }
}

function renderSiteMarker() {
    layers.site.clearLayers();
    if (!simulatedSite) return;

    L.circle([simulatedSite.lat, simulatedSite.lng], {
        pane: "sitePane",
        radius: siteConfig.radiusKm * 1000,
        color: "#0c6b58",
        weight: 2,
        opacity: 0.85,
        fillColor: "#0c6b58",
        fillOpacity: 0.08,
        interactive: false,
    }).addTo(layers.site);

    const marker = L.marker([simulatedSite.lat, simulatedSite.lng], {
        pane: "sitePane",
        draggable: true,
        icon: L.divIcon({
            className: "site-marker",
            html: "<span></span>",
            iconSize: [26, 26],
            iconAnchor: [13, 13],
        }),
    }).addTo(layers.site);

    marker.on("dragend", () => {
        setSimulatedSite(marker.getLatLng(), { activateResults: true });
        activatePanelTabByTarget("controls-site");
    });

    renderNearestFiberLine();
}

function renderNearestFiberLine() {
    const fiber = siteAnalysis?.fiber;
    const nearestPoint = fiber?.nearestPoint;
    if (!nearestPoint || !activeLayers.has("cables")) return;

    L.polyline(
        [
            [simulatedSite.lat, simulatedSite.lng],
            [nearestPoint.lat, nearestPoint.lng],
        ],
        {
            pane: "sitePane",
            color: "#2970a8",
            weight: 2,
            opacity: 0.88,
            dashArray: "5 6",
            interactive: false,
            className: "fiber-proximity-line",
        },
    ).addTo(layers.site);

    L.circleMarker([nearestPoint.lat, nearestPoint.lng], {
        pane: "sitePane",
        radius: 5,
        color: "#ffffff",
        weight: 1.5,
        opacity: 0.95,
        fillColor: "#2970a8",
        fillOpacity: 0.95,
        interactive: false,
        className: "fiber-proximity-endpoint",
    }).addTo(layers.site);
}

function renderSiteControls() {
    document.querySelector("#siteRadius").value = siteConfig.radiusKm;
    document.querySelector("#siteRadiusInput").value = siteConfig.radiusKm;
    document.querySelector("#siteRadiusValue").textContent = `${siteConfig.radiusKm} km`;

    const context = document.querySelector("#siteContext");
    if (!simulatedSite) {
        context.innerHTML = `
            <span><strong>Local:</strong> nenhum ponto definido</span>
            <span><strong>Raio:</strong> ${siteConfig.radiusKm} km</span>
        `;
        return;
    }

    const nearest = siteAnalysis?.site?.nearestRegion;
    context.innerHTML = `
        <span><strong>Coordenadas:</strong> lat ${formatCoordinate(simulatedSite.lat)} / lng ${formatCoordinate(simulatedSite.lng)}</span>
        <span><strong>UF estimada:</strong> ${siteAnalysis?.site?.state || simulatedSite.state || "NA"}</span>
        <span><strong>Referência próxima:</strong> ${nearest ? `${nearest.name}/${nearest.state} (${formatKm(nearest.distanceKm)})` : "sem candidato próximo"}</span>
    `;
}

function renderSiteAnalysis() {
    const container = document.querySelector("#siteAnalysis");
    if (!simulatedSite || currentData.energy.length === 0) {
        siteAnalysis = null;
        container.innerHTML = `
            <p class="field-note">Defina um ponto no mapa ou use a região selecionada para calcular os recursos no raio.</p>
        `;
        return;
    }

    siteAnalysis = SiteAnalysis.analyzeSiteResources(currentData, simulatedSite, {
        radiusKm: siteConfig.radiusKm,
        regions: allRegionsData,
        wuiConfig,
        weights,
    });
    const status = getClass(siteAnalysis.overallScore);
    const coverage = siteAnalysis.load.renewableCoveragePercentage;

    container.innerHTML = `
        <div class="site-score-card">
            <div>
                <span class="wui-label">Aptidão no raio</span>
                <span class="score-value">${siteAnalysis.overallScore}</span>
                <span class="score-total">/100</span>
            </div>
            <span class="status-pill ${status.className}">${status.label}</span>
        </div>

        <div class="site-location-grid">
            <span>Coordenadas</span>
            <strong>lat ${formatCoordinate(siteAnalysis.site.lat)} / lng ${formatCoordinate(siteAnalysis.site.lng)}</strong>
            <span>Raio analisado</span>
            <strong>${siteAnalysis.radiusKm} km</strong>
            <span>UF usada no WUI</span>
            <strong>${siteAnalysis.site.state}</strong>
            <span>Candidato mais próximo</span>
            <strong>${formatNearestRegion(siteAnalysis.site.nearestRegion)}</strong>
        </div>

        <h3>Recursos disponíveis no raio</h3>
        <div class="resource-grid">
            <div class="resource-card">
                <span>Energia renovável</span>
                <strong>${formatMw(siteAnalysis.energy.totalCapacityMw)}</strong>
                <small>${siteAnalysis.energy.totalPlants} usina${siteAnalysis.energy.totalPlants === 1 ? "" : "s"} · ${formatCoverage(coverage)}</small>
            </div>
            <div class="resource-card">
                <span>Água e esgoto</span>
                <strong>${siteAnalysis.water.points}</strong>
                <small>${formatServices(siteAnalysis.water.services)} · ${siteAnalysis.water.municipalities} município${siteAnalysis.water.municipalities === 1 ? "" : "s"}</small>
            </div>
            <div class="resource-card">
                <span>Proximidade da fibra</span>
                <strong>${siteAnalysis.fiber.score}/100</strong>
                <small>${renderFiberProximity(siteAnalysis.fiber, siteAnalysis.cables)}</small>
            </div>
        </div>

        <h3>Matriz renovável no raio</h3>
        <div class="renewable-breakdown-list">
            ${renderEnergyBreakdownRows(siteAnalysis.energy.types)}
        </div>

        <h3>Impacto calculado do data center</h3>
        <div class="impact-grid">
            <span>Carga de TI</span>
            <strong>${siteAnalysis.load.itLoadMw.toLocaleString("pt-BR")} MW</strong>
            <span>Energia anual estimada</span>
            <strong>${siteAnalysis.load.annualEnergyGwh.toLocaleString("pt-BR")} GWh/ano</strong>
            <span>Consumo de água estimado</span>
            <strong>${siteAnalysis.impact.annualWaterMegaliters.toLocaleString("pt-BR")} ML/ano</strong>
            <span>Impacto WUI</span>
            <strong>${siteAnalysis.impact.impactScore}/100 · ${siteAnalysis.impact.impactClass}</strong>
        </div>

        ${renderNearestResources(siteAnalysis)}

        <p class="field-note">
            Capacidade renovável é soma nominal das usinas dentro do raio; não representa energia contratada nem conexão garantida.
        </p>
    `;

    renderSiteControls();
}

function renderEnergyBreakdownRows(types) {
    return types.map(item => `
        <div class="renewable-breakdown-row">
            <div class="renewable-breakdown-head">
                <span><i class="energy-swatch ${getEnergySwatchClass(item.type)}"></i>${item.type}</span>
                <strong>${item.percentage}%</strong>
            </div>
            <div class="bar"><span style="width:${item.percentage}%"></span></div>
            <small>${formatMw(item.capacityMw)}</small>
        </div>
    `).join("");
}

function renderNearestResources(analysis) {
    const plants = analysis.energy.topPlants
        .map((plant) => `
            <li>
                <span>${plant.name || plant.type} · ${plant.city}/${plant.state}</span>
                <strong>${formatMw(plant.capacityMw)} · ${formatKm(plant.distanceKm)}</strong>
            </li>
        `)
        .join("");
    const water = analysis.water.items
        .map((item) => `
            <li>
                <span>${item.city}/${item.state} · ${item.serviceType}</span>
                <strong>${formatKm(item.distanceKm)}</strong>
            </li>
        `)
        .join("");
    const fiber = analysis.fiber.nearestName
        ? `
            <li>
                <span>Cabos de Fibra · ${analysis.fiber.nearestName}</span>
                <strong>${analysis.fiber.label} · ${formatKm(analysis.fiber.nearestDistanceKm)}</strong>
            </li>
        `
        : "";

    if (!plants && !water && !fiber) return "";

    return `
        <h3>Recursos mais próximos</h3>
        <ul class="mini-list">
            ${plants}
            ${water}
            ${fiber}
        </ul>
    `;
}

function renderFiberProximity(fiber, cables) {
    if (!fiber || fiber.label === "Sem dado") {
        return `<span class="fiber-band unknown">Sem dado</span> sem cabo válido na base`;
    }

    const cableCount = cables.count === 1 ? "1 cabo no raio" : `${cables.count} cabos no raio`;
    return `
        <span class="fiber-band ${fiber.className}">${fiber.label}</span>
        ${fiber.nearestName} a ${formatKm(fiber.nearestDistanceKm)} · ${cableCount}
    `;
}

function renderRegionFiberProximity(fiber) {
    if (!fiber || fiber.label === "Sem dado") {
        return `
            <p class="field-note region-fiber-summary">
                Fibra: sem rota válida na base para pontuar esta região.
            </p>
        `;
    }

    return `
        <div class="region-fiber-summary">
            <span class="fiber-band ${fiber.className}">${fiber.label}</span>
            <span>${fiber.nearestName} a ${formatKm(fiber.nearestDistanceKm)}. Quanto mais perto da rota, maior o indicador.</span>
        </div>
    `;
}

function renderDetails() {
    if (!selectedRegion) return;
    const score = getScore(selectedRegion);
    const status = getClass(score);
    const scores = getEffectiveScores(selectedRegion);
    const wuiAssessment = getWuiAssessment(selectedRegion);

    document.querySelector("#selectedName").textContent = `${selectedRegion.name} / ${selectedRegion.state}`;
    document.querySelector("#selectedSummary").textContent = selectedRegion.summary;
    document.querySelector("#selectedScore").textContent = score;
    document.querySelector("#selectedFiber").innerHTML = renderRegionFiberProximity(selectedRegion.fiber);
    
    const statusEl = document.querySelector("#selectedClass");
    statusEl.textContent = status.label;
    statusEl.className = `status-pill ${status.className}`;
    
    document.querySelector("#recommendation").textContent = selectedRegion.recommendation;

    document.querySelector("#metrics").innerHTML = Object.entries(metricLabels)
        .map(([key, label]) => {
            const value = scores[key] || 0;
            return `
                <div class="metric">
                    <div class="metric-row">
                        <span>${label}</span>
                        <span>${value}/100</span>
                    </div>
                    <div class="bar"><span style="width:${value}%"></span></div>
                </div>
            `;
        })
        .join("");

    renderWuiResult(wuiAssessment);
    renderRenewableMix(selectedRegion);
    renderMethodology(selectedRegion, wuiAssessment);

    document.querySelector("#conditions").innerHTML = selectedRegion.conditions
        .map((condition) => `<span class="condition">${condition}</span>`)
        .join("");
}

function renderWuiResult(assessment) {
    document.querySelector("#wuiResult").innerHTML = `
        <div class="wui-head">
            <span>
                <span class="wui-label">Índice de impacto</span>
                <span class="wui-score">${assessment.impactScore}</span>
            </span>
            <span class="status-pill ${getWuiClassName(assessment.impactScore)}">${assessment.impactClass}</span>
        </div>
        <div class="wui-grid">
            <span>Estresse Aqueduct</span>
            <strong>${assessment.stress.label}</strong>
            <span>Consumo anual estimado</span>
            <strong>${assessment.annualWaterMegaliters.toLocaleString("pt-BR")} ML/ano</strong>
            <span>Intensidade</span>
            <strong>${assessment.waterUseIntensityLPerKwh.toLocaleString("pt-BR")} L/kWh TI</strong>
            <span>Carga de TI</span>
            <strong>${assessment.itLoadMw.toLocaleString("pt-BR")} MW</strong>
        </div>
        <p class="field-note">${assessment.source}</p>
    `;
}

function renderRenewableMix(region) {
    const summary = RenewableBreakdown.buildRenewableBreakdown(currentData.energy, region);

    if (summary.totalCapacityMw === 0) {
        document.querySelector("#renewableMix").innerHTML = `
            <p class="field-note">Sem geração renovável registrada na base ANEEL para este recorte.</p>
        `;
        return;
    }

    document.querySelector("#renewableMix").innerHTML = `
        <div class="renewable-summary">
            <span>${summary.scopeLabel}</span>
            <strong>${summary.totalCapacityMw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MW</strong>
            <small>${summary.totalPlants.toLocaleString("pt-BR")} usina${summary.totalPlants === 1 ? "" : "s"}</small>
        </div>
        <div class="renewable-breakdown-list">
            ${summary.types.map(item => `
                <div class="renewable-breakdown-row">
                    <div class="renewable-breakdown-head">
                        <span><i class="energy-swatch ${getEnergySwatchClass(item.type)}"></i>${item.type}</span>
                        <strong>${item.percentage}%</strong>
                    </div>
                    <div class="bar"><span style="width:${item.percentage}%"></span></div>
                    <small>${item.capacityMw.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MW</small>
                </div>
            `).join("")}
        </div>
        <p class="field-note">
            Percentual calculado pela capacidade outorgada renovável no ${summary.scopeLabel.toLowerCase()} usado como recorte.
        </p>
    `;
}

function getEnergySwatchClass(type) {
    const classes = {
        Solar: "solar",
        "Eólica": "wind",
        Hidro: "hydro",
        Biomassa: "biomass",
    };
    return classes[type] || "mixed";
}

function formatMw(value) {
    return `${Number(value || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
    })} MW`;
}

function formatCoordinate(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 5,
    });
}

function formatNearestRegion(region) {
    if (!region) return "sem referência";
    return `${region.name}/${region.state} (${formatKm(region.distanceKm)})`;
}

function formatServices(services) {
    if (!services || services.length === 0) return "sem serviço no raio";
    return services.join(" e ");
}

function formatCableDistance(cables) {
    if (cables.count > 0) {
        return cables.nearestDistanceKm === null
            ? "cabo no raio"
            : `mais próximo a ${formatKm(cables.nearestDistanceKm)}`;
    }
    if (cables.nearestDistanceKm === null) return "sem cabo na base";
    return `mais próximo a ${formatKm(cables.nearestDistanceKm)}`;
}

function formatCoverage(percentage) {
    if (percentage >= 1000) {
        return `${(percentage / 100).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
        })}x da carga TI`;
    }
    return `${percentage}% da carga TI`;
}

function formatKm(value) {
    return `${Number(value || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
    })} km`;
}

function renderMethodology(region, assessment) {
    const dataBasis = region.methodology?.dataBasis || [];
    const assumptionNotes = region.methodology?.assumptionNotes || [];

    document.querySelector("#methodology").innerHTML = `
        <div class="methodology-block">
            <h3>Dados reais usados</h3>
            <p>${dataBasis.join(" • ") || "Sem fonte declarada"}</p>
        </div>
        <div class="methodology-block">
            <h3>Como calculamos o impacto hídrico</h3>
            <ul>
                <li><strong>Impacto hídrico:</strong> combina consumo de água do data center, carga de TI e estresse hídrico Aqueduct da UF.</li>
                <li><strong>Mitigação local:</strong> presença de água e esgoto melhora a leitura preliminar de segurança hídrica.</li>
            </ul>
        </div>
        <div class="methodology-block">
            <h3>Premissas da triagem</h3>
            <ul>
                ${assumptionNotes.map(note => `<li>${note}</li>`).join("")}
                <li>WUI é uma estimativa por UF baseada em The Green Grid WUI e WRI Aqueduct 4.0; não substitui estudo por bacia, outorga ou disponibilidade local.</li>
                <li>Impacto hídrico atual: ${assessment.impactScore}/100, onde menor é melhor.</li>
            </ul>
        </div>
    `;
}

function getWuiClassName(impactScore) {
    if (impactScore >= 76) return "low";
    if (impactScore >= 51) return "medium";
    if (impactScore >= 26) return "medium";
    return "high";
}

function renderRanking() {
    const ranked = ViewLimits.limitRankedRegions(regionsData, getScore, selectedRegion, 30);
    document.querySelector("#rankingNote").textContent = ranked.hiddenCount > 0
        ? `Mostrando ${ranked.regions.length} de ${ranked.totalCount} regiões. Filtre por estado para investigar mais candidatos.`
        : `${ranked.totalCount} regiões candidatas neste recorte.`;
    document.querySelector("#ranking").innerHTML = ranked.regions
        .map((region, index) => {
            const score = getScore(region);
            return `
                <li data-region="${region.id}" class="${selectedRegion?.id === region.id ? 'selected' : ''}">
                    <span class="ranking-index">${index + 1}</span>
                    <span>
                        <span class="ranking-name">${region.name}/${region.state}</span>
                        <span class="ranking-tags">${region.tags.join(" • ")}</span>
                    </span>
                    <span class="ranking-score">${score}</span>
                </li>
            `;
        })
        .join("");
}

function renderWeights() {
    document.querySelector("#weights").innerHTML = Object.entries(metricLabels)
        .map(([key, label]) => `
            <div class="weight-control">
                <div class="weight-head">
                    <span>${label}</span>
                    <span id="weight-value-${key}">${weights[key]}</span>
                </div>
                <input type="range" min="1" max="5" value="${weights[key]}" data-weight="${key}" />
            </div>
        `).join("");
}

function renderWuiControls() {
    const presetEntries = Object.entries(WuiModel.WATER_USE_PRESETS);
    document.querySelector("#wuiPreset").innerHTML = [
        ...presetEntries.map(([key, preset]) => `
            <option value="${key}">${preset.label}</option>
        `),
        `<option value="custom">Ajustado</option>`,
    ].join("");
    document.querySelector("#wuiPreset").value = wuiConfig.preset;
    document.querySelector("#waterIntensity").value = wuiConfig.waterUseIntensityLPerKwh;
    document.querySelector("#itLoadMw").value = wuiConfig.itLoadMw;
    renderWuiPresetDescription();
}

function renderWuiPresetDescription() {
    const preset = WuiModel.WATER_USE_PRESETS[wuiConfig.preset];
    document.querySelector("#wuiPresetDescription").textContent = preset
        ? preset.description
        : "Valor ajustado manualmente para simulação.";
}

function renderSelect() {
    regionSearchOptions = RegionSearch.buildRegionSearchOptions(
        regionsData,
        currentData.municipalities,
        selectedState,
    );

    document.querySelector("#regionOptions").innerHTML = regionSearchOptions
        .map(option => `
            <option value="${escapeHtml(option.label)}">${escapeHtml(option.description)}</option>
        `)
        .join("");

    if (selectedRegion) setRegionSearchValue(selectedRegion);

    const candidateCount = regionSearchOptions.filter(option => option.source === "candidate").length;
    const municipalityCount = regionSearchOptions.length - candidateCount;
    document.querySelector("#regionSearchNote").textContent =
        `${candidateCount} regiões candidatas e ${municipalityCount} municípios disponíveis neste recorte.`;
}

function setRegionSearchValue(region) {
    const input = document.querySelector("#regionSearch");
    if (!input || !region) return;
    input.value = `${region.name} - ${region.state}`;
}

function escapeHtml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderStateSelect() {
    const states = RegionOptions.getStateOptions(allRegionsData);
    document.querySelector("#stateSelect").innerHTML = [
        `<option value="ALL"${selectedState === "ALL" ? " selected" : ""}>Todos os estados</option>`,
        ...states.map(state => `<option value="${state}">${state}</option>`),
    ].join("");
    document.querySelector("#stateSelect").value = selectedState;
}

function applyStateFilter(state) {
    selectedState = state;
    regionsData = RegionOptions.filterRegionsByState(allRegionsData, state);
    selectedRegion = null;
    renderRegions();
    renderRanking();
    renderSelect();

    if (regionsData.length > 0) {
        selectRegion(regionsData[0].id);
    }
}

// Event Listeners
document.querySelector("#weights").addEventListener("input", (e) => {
    const input = e.target.closest("[data-weight]");
    if (!input) return;
    weights[input.dataset.weight] = Number(input.value);
    document.querySelector(`#weight-value-${input.dataset.weight}`).textContent = input.value;
    renderRegions();
    renderRanking();
    renderDetails();
});

document.querySelector("#resetWeights").addEventListener("click", () => {
    weights = { renewables: 5, grid: 4, water: 5, connectivity: 3, licensing: 4 };
    renderWeights();
    renderRegions();
    renderRanking();
    renderDetails();
});

document.querySelector("#wuiPreset").addEventListener("change", (e) => {
    const presetKey = e.target.value;
    wuiConfig.preset = presetKey;

    if (WuiModel.WATER_USE_PRESETS[presetKey]) {
        wuiConfig.waterUseIntensityLPerKwh = WuiModel.WATER_USE_PRESETS[presetKey].intensity;
        document.querySelector("#waterIntensity").value = wuiConfig.waterUseIntensityLPerKwh;
    }

    renderWuiPresetDescription();
    refreshTerritorialAnalysis();
});

document.querySelector("#waterIntensity").addEventListener("input", (e) => {
    wuiConfig.preset = "custom";
    wuiConfig.waterUseIntensityLPerKwh = Number(e.target.value);
    document.querySelector("#wuiPreset").value = "custom";
    renderWuiPresetDescription();
    refreshTerritorialAnalysis();
});

document.querySelector("#itLoadMw").addEventListener("input", (e) => {
    wuiConfig.itLoadMw = Number(e.target.value);
    refreshTerritorialAnalysis();
});

function updateSiteRadius(value) {
    const radius = Math.min(300, Math.max(10, Number(value) || 100));
    siteConfig.radiusKm = radius;
    renderSiteAnalysis();
    renderSiteMarker();
    renderSiteControls();
}

document.querySelector("#siteRadius").addEventListener("input", (e) => {
    updateSiteRadius(e.target.value);
});

document.querySelector("#siteRadiusInput").addEventListener("input", (e) => {
    updateSiteRadius(e.target.value);
});

document.querySelector("#useSelectedRegionAsSite").addEventListener("click", () => {
    if (!selectedRegion) return;
    setSimulatedSite(
        { lat: selectedRegion.lat, lng: selectedRegion.lng, state: selectedRegion.state },
        { activateResults: true },
    );
    map.flyTo([selectedRegion.lat, selectedRegion.lng], 8);
});

function refreshTerritorialAnalysis() {
    renderRegions();
    renderRanking();
    renderDetails();
    renderSiteAnalysis();
}

function selectRegionSearchOption() {
    const input = document.querySelector("#regionSearch");
    const note = document.querySelector("#regionSearchNote");
    const option = RegionSearch.findRegionOption(regionSearchOptions, input.value);

    if (!option) {
        note.textContent = "Nenhuma região ou município encontrado para este estado.";
        return;
    }

    input.value = option.label;

    if (option.source === "candidate") {
        selectRegion(option.id);
        note.textContent = "Região candidata selecionada com score territorial completo.";
        return;
    }

    selectedRegion = null;
    setSimulatedSite(
        { lat: option.lat, lng: option.lng, state: option.state },
        { activateResults: true },
    );
    map.flyTo([option.lat, option.lng], 8);
    renderRegions();
    renderRanking();
    renderMunicipalityDetails(option);
    activatePanelTabByTarget("controls-site");
    note.textContent = "Município selecionado para simulação local. Ajuste o raio para ver recursos e impacto.";
}

function renderMunicipalityDetails(option) {
    const status = siteAnalysis ? getClass(siteAnalysis.overallScore) : { label: "Simulação local", className: "medium" };

    document.querySelector("#selectedName").textContent = `${option.name} / ${option.state}`;
    document.querySelector("#selectedSummary").textContent =
        "Município escolhido pelo autocomplete. A análise principal passa a ser o raio de consumo do data center.";
    document.querySelector("#selectedScore").textContent = siteAnalysis ? siteAnalysis.overallScore : 0;
    document.querySelector("#selectedFiber").innerHTML = renderRegionFiberProximity(siteAnalysis?.fiber);

    const statusEl = document.querySelector("#selectedClass");
    statusEl.textContent = siteAnalysis ? status.label : "Simulação local";
    statusEl.className = `status-pill ${status.className}`;

    document.querySelector("#metrics").innerHTML = `
        <p class="field-note">
            Este município não tem necessariamente score territorial completo. Use a aba Local para ver energia,
            água, conectividade e impacto dentro do raio configurado.
        </p>
    `;
    document.querySelector("#recommendation").textContent =
        "Valide o ponto pelo raio de consumo, disponibilidade renovável, segurança hídrica, fibra e licenciamento local.";
    document.querySelector("#conditions").innerHTML = [
        "Conferir outorga e disponibilidade hídrica local",
        "Validar conexão elétrica e fibra",
        "Checar licenciamento municipal e ambiental",
    ].map((condition) => `<span class="condition">${condition}</span>`).join("");
    renderRenewableMix({ name: option.name, state: option.state });
}

document.querySelector("#focusRegion").addEventListener("click", () => {
    selectRegionSearchOption();
});

document.querySelector("#regionSearch").addEventListener("change", () => {
    selectRegionSearchOption();
});

document.querySelector("#regionSearch").addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    selectRegionSearchOption();
});

document.querySelector("#stateSelect").addEventListener("change", (e) => {
    applyStateFilter(e.target.value);
});

document.querySelector("#ranking").addEventListener("click", (e) => {
    const li = e.target.closest("[data-region]");
    if (li) selectRegion(li.dataset.region);
});

document.querySelectorAll("[data-layer]").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        const layer = checkbox.dataset.layer;
        const subContainer = document.querySelector(`.sub-filters[data-parent="${layer}"]`);
        
        if (checkbox.checked) {
            activeLayers.add(layer);
            map.addLayer(layers[layer]);
            if (subContainer) subContainer.style.display = 'block';
        } else {
            activeLayers.delete(layer);
            map.removeLayer(layers[layer]);
            if (subContainer) subContainer.style.display = 'none';
        }

        if (layer === "cables") renderSiteMarker();
    });
});

document.querySelectorAll("[data-sub]").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        const type = checkbox.dataset.sub;
        const value = checkbox.value;
        const parent = checkbox.closest(".sub-filters").dataset.parent;

        if (type === "pop") {
            subFilters[parent].pop = checkbox.checked ? Number(value) : 0;
        } else {
            if (checkbox.checked) {
                subFilters[parent][type].push(value);
            } else {
                subFilters[parent][type] = subFilters[parent][type].filter(v => v !== value);
            }
        }

        if (parent === "energy") renderEnergy();
        if (parent === "water") renderWater();
    });
});

// Initialization
initMap();
initPanelTabs();
initInfoHints();
fetchData();
