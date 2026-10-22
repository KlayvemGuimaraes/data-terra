let map;
let energyRenderer;
let electricRenderer;
let regionRenderer;
let layers = {
    cables: L.layerGroup(),
    water: L.layerGroup(),
    energy: L.layerGroup(),
    electric: L.layerGroup(),
    substations: L.layerGroup(),
    environmental: L.layerGroup(),
    protectedAreas: L.layerGroup(),
    transmission: L.layerGroup(),
    basins: L.layerGroup(),
    climate: L.layerGroup(),
    regions: L.layerGroup(),
    site: L.layerGroup()
};

let activeLayers = new Set(["energy", "cables", "water", "substations", "protectedAreas", "transmission", "basins"]);
let territorialScoreCache = new WeakMap();
let weights = EvaluationCriteria.getDefaultWeights();

let selectedRegion = null;
let selectedState = "ALL";
let rankingPillar = "water";
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
let liveTerritory = {};
const territoryClient = TerritorialClient.create({ onUpdate(data) {
    liveTerritory = data;
    renderSiteAnalysis();
    renderLiveLayers();
} });
let currentData = {
    cables: [],
    water: [],
    energy: [],
    substations: [],
    envRisk: [],
    municipalities: []
};

let subFilters = {
    energy: { type: ["Solar", "Eólica", "Hidro", "Biomassa"] },
    water: { service: ["Água", "Esgoto"], pop: 0 }
};

const criteriaCatalog = EvaluationCriteria.CRITERIA;
const criteriaGroups = EvaluationCriteria.GROUPS;

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

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
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
    Object.entries(layers).forEach(([key, layer]) => { if (!["environmental", "electric", "climate"].includes(key)) layer.addTo(map); });
    map.on("zoomend", () => {
        if (map.hasLayer(layers.energy)) renderEnergy();
    });
    map.on("click", (event) => {
        setSimulatedSite(event.latlng, { activateResults: true });
        activatePanelTabByTarget("controls-site");
    });
}

function initPanelTabs() {
    document.querySelectorAll("[data-workspace-tab]").forEach(link => {
        link.addEventListener("click", () => {
            activatePanelTabByTarget(link.dataset.workspaceTab);
            document.querySelector(link.getAttribute("href"))?.focus({ preventScroll: true });
        });
    });
    document.querySelectorAll("[data-tab-target]").forEach(button => {
        button.setAttribute("aria-pressed", String(button.classList.contains("is-active")));
    });
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
        tabButton.setAttribute("aria-pressed", String(tabButton.dataset.tabTarget === target));
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
        const [cables, water, energy, municipalities, substations, envRisk] = await Promise.all([
            ApiClient.fetchJson('/api/cables'),
            ApiClient.fetchJson('/api/water'),
            ApiClient.fetchJson('/api/energy'),
            ApiClient.fetchOptionalJson('/api/municipalities', []),
            ApiClient.fetchOptionalJson('/api/substations', []),
            ApiClient.fetchOptionalJson('/api/environmental', [])
        ]);

        currentData = { cables, water, energy, municipalities, substations, envRisk };
        renderTerritorialLayers();

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
        
        const firstRegion = ViewLimits.limitMapRegions(regionsData, selectedState).regions[0];
        if (firstRegion) selectRegion(firstRegion.id);
        else renderSiteAnalysis();

    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function escapeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderTerritorialLayers() {
    layers.substations.clearLayers();
    layers.environmental.clearLayers();
    currentData.substations.forEach(s => L.circleMarker([s.lat, s.lng], {
        radius: 4, color: "#fbbf24", weight: 1, fillOpacity: 0.7,
    }).bindPopup(`<strong>${escapeText(s.name)}</strong><br>ONS · ${s.voltageKv} kV<br>Proximidade não garante conexão ou capacidade disponível.`).addTo(layers.substations));
    currentData.municipalities.forEach(m => {
        const summary = SiteAnalysis.summarizeEnvironmental(currentData.envRisk, m);
        if (summary.status !== "atencao") return;
        L.circleMarker([m.lat, m.lng], {
            radius: 5, color: "#fb7185", weight: 1, fillOpacity: 0.3,
        }).bindPopup(`<strong>${escapeText(m.name)}/${escapeText(m.state)}</strong><br>${summary.label}.<br>Sede municipal: não representa limite ou sobreposição no terreno.`).addTo(layers.environmental);
    });
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
    const visible = ViewLimits.limitMapRegions(regionsData, selectedState, selectedRegion);
    const ordered = [...visible.regions].sort((a, b) => {
        if (a.id === selectedRegion?.id) return 1;
        if (b.id === selectedRegion?.id) return -1;
        return 0;
    });

    ordered.forEach(region => {
        const isSelected = region.id === selectedRegion?.id;
        const isLocal = isSelected && siteAnalysis;
        const groupScores = isLocal ? siteAnalysis.groupScores : getRegionGroupScores(region);
        const marker = L.circleMarker([region.lat, region.lng], {
            renderer: regionRenderer,
            pane: "regionPane",
            radius: isSelected ? 9 : 5,
            color: isSelected ? "#ffffff" : "#f8fafc",
            weight: isSelected ? 3 : 1.5,
            opacity: 0.95,
            fillColor: isSelected ? "#174b3c" : "#2970a8",
            fillOpacity: isSelected ? 0.96 : 0.76,
            interactive: true,
        }).bindPopup(`
            <strong>${escapeText(region.name)}/${escapeText(region.state)}</strong>
            <p>${isLocal ? "Ponto e raio selecionados" : "Comparação regional preliminar"}</p>
            <dl class="popup-pillars">${criteriaGroups.map(group => `
                <div><dt>${group.label}</dt><dd>${formatPillarScore(groupScores[group.id])}</dd></div>
            `).join("")}</dl>
            <p>Maior nota = condição mais favorável em cada pilar. — = sem avaliação. Sem conclusão única sobre o local.</p>
        `);

        marker.on('click', () => selectRegion(region.id));
        if (isSelected) {
            marker.bindTooltip(`${escapeText(region.name)}/${escapeText(region.state)} · selecionada`, {
                direction: "top",
            });
        }
        marker.addTo(layers.regions);
    });

    document.querySelector("#mapCandidateNote").textContent = visible.hiddenCount > 0
        ? `Mapa: ${visible.regions.length} de ${visible.totalCount} candidatos, em recorte alfabético com a seleção preservada. Marcadores não indicam notas.`
        : `Mapa: ${visible.totalCount} candidatos neste recorte. Marcadores não indicam notas.`;
}

function getRegionGroupScores(region) {
    return EvaluationCriteria.calculateGroupScores(getEffectiveScores(region), weights);
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
    let territorial = territorialScoreCache.get(region);
    if (!territorial || territorial.radiusKm !== siteConfig.radiusKm) {
        territorial = {
            radiusKm: siteConfig.radiusKm,
            environmental: SiteAnalysis.scoreEnvironmental(currentData.envRisk, region),
            substation: SiteAnalysis.scoreSubstation(currentData.substations, region, siteConfig.radiusKm),
        };
        territorialScoreCache.set(region, territorial);
    }
    return {
        ...WuiModel.applyWuiToScores(region.scores, getWuiInput(region)),
        environmental: territorial.environmental,
        substation: territorial.substation,
    };
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

    if (selectedRegion && (Math.abs(selectedRegion.lat - Number(latlng.lat)) > 0.00001 || Math.abs(selectedRegion.lng - Number(latlng.lng)) > 0.00001)) selectedRegion = null;
    simulatedSite = {
        lat: Number(latlng.lat),
        lng: Number(latlng.lng),
        state: latlng.state,
        name: latlng.name,
    };

    renderSiteAnalysis();
    renderSiteMarker();
    renderSiteControls();
    renderRegions();
    renderRanking();
    renderDetails();

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

function renderLiveLayers() {
    const mapping = { environment: 'protectedAreas', transmission: 'transmission', basin: 'basins', climate: 'climate' };
    const colors = { environment: '#be185d', transmission: '#b45309', basin: '#0284c7' };
    for (const [kind, layerName] of Object.entries(mapping)) {
        layers[layerName].clearLayers();
        const data = liveTerritory[kind];
        if (!data) continue;
        if (kind === 'climate') {
            if (data.status === 'ok' && simulatedSite) L.circleMarker([simulatedSite.lat, simulatedSite.lng], { radius: 9, color: '#ea580c', fillOpacity: 0.2 }).bindPopup(`NASA POWER · referência em grade<br>Máxima climatológica: ${escapeText(data.maxTemperature)} °C<br>${escapeText(data.edition)}`).addTo(layers.climate);
            continue;
        }
        L.geoJSON(data.features || [], {
            style: { color: colors[kind], weight: kind === 'transmission' ? 2 : 1.5, fillOpacity: 0.1 },
            onEachFeature(feature, layer) {
                const p = feature.properties || {};
                layer.bindPopup(`<strong>${escapeText(p.name || data.source)}</strong><br>${escapeText(p.category || p.class || '')}<br>${escapeText(data.source)} · geometria visual simplificada${p.atPoint ? '<br>Interseção com o ponto selecionado' : ''}`);
            },
        }).addTo(layers[layerName]);
    }
}

function renderTerritorialDetails() {
    const statusText = { loading: 'Consultando', ok: 'Consultado', partial: 'Cobertura parcial', unavailable: 'Indisponível', 'no-data': 'Sem dado no ponto' };
    const labels = { environment: 'Áreas protegidas · CNUC', transmission: 'Linhas oficiais · ANEEL/ONS', basin: 'Microbacia · ANA', climate: 'Clima · NASA POWER' };
    const summaries = {
        environment: data => `${data.count ?? 0} UC(s) no raio; ${data.items?.filter(i => i.atPoint).length ?? 0} no ponto.`,
        transmission: data => data.nearestDistanceKm == null ? 'Nenhuma linha identificada no raio consultado.' : `${data.nearestName} · distância aproximada ${formatKm(data.nearestDistanceKm)} ao traçado.`,
        basin: data => `${data.code} · ${data.region} · classe ${data.class}. Comprometimento: ${data.commitmentPercent == null ? 'não informado' : Number(data.commitmentPercent).toFixed(1) + '%'}.`,
        climate: data => `Máxima climatológica ${data.maxTemperature} °C · umidade média ${data.humidity}% · ${data.dryMonths} mês(es) com precipitação média inferior a 1 mm/dia. Indicador climático: ${data.score}/100.`,
    };
    return `<details class="methodology-block territorial-details" data-territory-section="main" open>
        <summary>Consulta territorial e próximos passos</summary>
        <div aria-live="polite">${Object.entries(labels).map(([kind, label]) => {
            const data = liveTerritory[kind] || { status: 'loading' };
            return `<details class="territorial-source" data-territory-section="${kind}"><summary>${label} · ${data.refreshing ? 'Atualizando (resultado anterior)' : statusText[data.status] || 'Sem dado'}</summary>
                <p>${escapeText(data.status === 'ok' || data.status === 'partial' ? summaries[kind](data) : data.message || 'Aguardando consulta à fonte oficial.')}</p>
                ${data.items ? `<ul>${data.items.filter(i => i.atPoint).map(i => `<li>${escapeText(i.name)} · ${escapeText(i.group)} · plano de manejo: ${escapeText(i.managementPlan || 'não informado')}. Gestor: ${escapeText(i.manager || 'não informado')}.</li>`).join('')}</ul>` : ''}
                <p class="field-note">${escapeText(data.message || '')} ${escapeText(data.edition || '')}${data.fetchedAt ? ` · consultado em ${escapeText(new Date(data.fetchedAt).toLocaleString('pt-BR'))}` : ''}${data.displayLimited ? ' · mapa mostra apenas as feições mais próximas; contagem inclui todas as consultadas.' : ''}${data.geometryStatus && data.geometryStatus !== 'ok' ? ' · geometria indisponível para exibição.' : ''}</p>
            </details>`;
        }).join('')}</div>
        <details data-territory-section="rules"><summary>Regras de triagem e diligências</summary><ul>${siteAnalysis.territorial.rules.map(r => `<li><strong>${escapeText(r.title)}:</strong> ${escapeText(r.text)} <a href="${r.url}" target="_blank" rel="noopener">Fonte oficial</a></li>`).join('')}</ul></details>
        <p class="field-note">${escapeText(siteAnalysis.territorial.warnings.join(' '))}</p>
        <button type="button" id="retryTerritory" class="secondary-button">Atualizar consultas</button>
    </details>`;
}

document.addEventListener('click', event => {
    if (event.target.closest('#retryTerritory') && simulatedSite) {
        liveTerritory = territoryClient.request(simulatedSite, siteConfig.radiusKm, true);
        renderLiveLayers();
        renderSiteAnalysis();
    }
});

function renderSiteAnalysis() {
    const container = document.querySelector("#siteAnalysis");
    if (!simulatedSite || currentData.energy.length === 0) {
        siteAnalysis = null;
        renderLocalScoreSummary(null);
        container.innerHTML = `
            <p class="field-note">Defina um ponto no mapa ou use a região selecionada para calcular os recursos no raio.</p>
        `;
        return;
    }

    const nextTerritory = territoryClient.request(simulatedSite, siteConfig.radiusKm);
    if (nextTerritory !== liveTerritory) { liveTerritory = nextTerritory; renderLiveLayers(); }
    siteAnalysis = SiteAnalysis.analyzeSiteResources(currentData, simulatedSite, {
        territory: liveTerritory,
        radiusKm: siteConfig.radiusKm,
        regions: allRegionsData,
        wuiConfig,
        weights,
    });
    const coverage = siteAnalysis.load.renewableCoveragePercentage;
    const groupScores = siteAnalysis.groupScores;
    const expandedTerritory = new Map([...container.querySelectorAll("[data-territory-section]")].map(el => [el.dataset.territorySection, el.open]));

    container.innerHTML = `
        <h3>Quatro pilares no ponto</h3>
        ${renderScoreGroupSummary(groupScores)}
        <p class="field-note">Notas heurísticas de 0 a 100: maior é mais favorável em cada pilar, inclusive estresse hídrico e risco social/territorial. Não são probabilidades nem autorizações.</p>
        <p class="field-note">${siteAnalysis.territorial.complete ? 'Consulta das quatro fontes concluída; verifique os limites de cobertura.' : 'Consulta incompleta ou em andamento; os indicadores usam as reservas declaradas nas fontes.'}</p>
        ${renderTerritorialDetails()}
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

        <details class="methodology-block">
            <summary>Subestação ONS e referência municipal de reserva</summary>
            <p><strong>Subestação ONS:</strong> ${siteAnalysis.nearestSubstation.nearestName ? `${escapeText(siteAnalysis.nearestSubstation.nearestName)} · ${formatKm(siteAnalysis.nearestSubstation.nearestDistanceKm)} em linha geodésica · ${siteAnalysis.nearestSubstation.nearestVoltageKv} kV` : "Sem dados disponíveis (40 pontos)"}. Validar capacidade e acesso com o agente responsável.</p>
            <p><strong>Ambiental:</strong> ${siteAnalysis.environmental.label}. Referência: ${escapeText(siteAnalysis.environmental.municipality || "indisponível")}.</p>
            <p>${siteAnalysis.environmental.source} Consultar limites, planos de manejo e órgão licenciador antes de selecionar o terreno.</p>
        </details>
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

    container.querySelectorAll("[data-territory-section]").forEach(el => { if (expandedTerritory.has(el.dataset.territorySection)) el.open = expandedTerritory.get(el.dataset.territorySection); });
    renderLocalScoreSummary(siteAnalysis);
    renderSiteControls();
    renderRegions();
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
    if (siteAnalysis) {
        renderLocalScoreSummary(siteAnalysis);
        return;
    }
    if (!selectedRegion) return;
    const scores = getEffectiveScores(selectedRegion);
    const groupScores = EvaluationCriteria.calculateGroupScores(scores, weights);
    const wuiAssessment = getWuiAssessment(selectedRegion);

    document.querySelector("#selectedName").textContent = `${selectedRegion.name} / ${selectedRegion.state}`;
    document.querySelector("#selectedSummary").textContent = selectedRegion.summary;
    document.querySelector("#selectedScoreGroups").innerHTML = renderScoreGroupSummary(groupScores);
    document.querySelector("#selectedFiber").innerHTML = renderRegionFiberProximity(selectedRegion.fiber);
    
    document.querySelector("#recommendation").textContent = selectedRegion.recommendation;

    document.querySelector("#metrics").innerHTML = renderMetricGroups(scores, groupScores);

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
            <h3>Premissas das bases regionais</h3>
            <p>A simulação local incorpora as consultas oficiais descritas em Novas fontes e premissas territoriais.</p>
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
    const pillar = criteriaGroups.find(group => group.id === rankingPillar);
    const select = document.querySelector("#rankingPillar");
    select.innerHTML = criteriaGroups.map(group => `<option value="${group.id}">${group.label}</option>`).join("");
    select.value = rankingPillar;
    const ranked = ViewLimits.limitRankedRegions(regionsData, rankingPillar, getRegionGroupScores, selectedRegion, 30);
    document.querySelector("#rankingNote").textContent =
        `Ordem decrescente somente por ${pillar.label}. Sem avaliação vem ao final; empates seguem ordem alfabética. ` +
        (ranked.hiddenCount > 0
            ? `Mostrando até 30 candidatos e preservando a seleção (${ranked.regions.length} de ${ranked.totalCount}). `
            : `${ranked.totalCount} regiões candidatas neste recorte. `) +
        "Bases regionais preliminares: os quatro valores podem diferir da análise do ponto e raio na aba Local.";
    document.querySelector("#ranking").innerHTML = ranked.regions
        .map(region => {
            const groupScores = getRegionGroupScores(region);
            return `
                <li data-region="${escapeText(region.id)}" class="${selectedRegion?.id === region.id ? 'selected' : ''}">
                    <button class="ranking-select" type="button" aria-label="Analisar ${escapeText(region.name)}/${escapeText(region.state)}">
                        <span class="ranking-name">${escapeText(region.name)}/${escapeText(region.state)}${selectedRegion?.id === region.id ? " · selecionada" : ""}</span>
                        <span class="ranking-tags">${escapeText(region.tags.join(" • "))}</span>
                    </button>
                    <dl class="ranking-pillars">
                        ${criteriaGroups.map(group => `
                            <div class="${group.id === rankingPillar ? "is-sorted" : ""}">
                                <dt>${group.label}</dt>
                                <dd>${formatPillarScore(groupScores[group.id])}${groupScores[group.id] === null ? "<small>Sem avaliação</small>" : ""}</dd>
                            </div>
                        `).join("")}
                    </dl>
                </li>
            `;
        })
        .join("");
}

function renderWeights() {
    document.querySelector("#weights").innerHTML = criteriaGroups
        .map((group) => `
            <section class="criteria-group" data-criteria-group="${group.id}">
                <div class="criteria-group-heading">
                    <h3>${group.label}</h3>
                    <p>${group.description}</p>
                    ${group.criteria.length === 1 ? "<p>Critério único: qualquer peso positivo mantém a nota; zero desativa a avaliação deste pilar.</p>" : "<p>Pesos relativos apenas dentro deste pilar. Zero desativa o critério.</p>"}
                </div>
                <div class="criteria-group-controls">
                    ${group.criteria.map(renderWeightControl).join("")}
                </div>
            </section>
        `)
        .join("");
}

function renderWeightControl(key) {
    const criterion = criteriaCatalog[key];
    return `
        <div class="weight-control">
            <div class="weight-head">
                <label for="weight-${key}">${criterion.label}</label>
                <span id="weight-value-${key}">${weights[key] > 0 ? weights[key] : "Desativado"}</span>
            </div>
            <input
                id="weight-${key}"
                type="range"
                min="0"
                max="5"
                value="${weights[key]}"
                data-weight="${key}"
            />
        </div>
    `;
}

function formatPillarScore(value) {
    return Number.isFinite(value) ? `${value}/100` : "—";
}

function renderScoreGroupSummary(groupScores) {
    return `
        <div class="criteria-score-grid">
            ${criteriaGroups.map((group) => `
                <div class="criteria-score-card" data-score-group="${group.id}">
                    <span>${group.label}</span>
                    <strong>${Number.isFinite(groupScores[group.id]) ? `${groupScores[group.id]}<small>/100</small>` : "—"}</strong>
                    ${groupScores[group.id] === null ? '<small class="pillar-empty">Sem avaliação</small>' : ""}
                </div>
            `).join("")}
        </div>
    `;
}

function renderMetricGroups(scores, groupScores) {
    return criteriaGroups.map((group) => `
        <section class="criteria-metric-group" data-metric-group="${group.id}">
            <div class="criteria-metric-heading">
                <div>
                    <h3>${group.label}</h3>
                    <p>${group.description}</p>
                </div>
                <strong>${formatPillarScore(groupScores[group.id])}</strong>
            </div>
            <div class="criteria-metric-list">
                ${group.criteria.map((key) => renderMetric(key, scores[key])).join("")}
            </div>
        </section>
    `).join("");
}

function renderMetric(key, score) {
    const value = Number.isFinite(Number(score)) ? Number(score) : 0;
    return `
        <div class="metric">
            <div class="metric-row">
                <span>${criteriaCatalog[key].label}</span>
                <span>${value}/100${weights[key] > 0 ? "" : " · fora da média"}</span>
            </div>
            <div class="bar"><span style="width:${value}%"></span></div>
        </div>
    `;
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

    const firstRegion = ViewLimits.limitMapRegions(regionsData, selectedState).regions[0];
    if (firstRegion) selectRegion(firstRegion.id);
}

// Event Listeners
document.querySelector("#rankingPillar").addEventListener("change", (event) => {
    rankingPillar = event.target.value;
    renderRanking();
});

document.querySelector("#weights").addEventListener("input", (e) => {
    const input = e.target.closest("[data-weight]");
    if (!input) return;
    weights[input.dataset.weight] = Number(input.value);
    document.querySelector(`#weight-value-${input.dataset.weight}`).textContent = input.value > 0 ? input.value : "Desativado";
    renderRegions();
    renderRanking();
    renderDetails();
    renderSiteAnalysis();
});

document.querySelector("#resetWeights").addEventListener("click", () => {
    weights = EvaluationCriteria.getDefaultWeights();
    renderWeights();
    renderRegions();
    renderRanking();
    renderDetails();
    renderSiteAnalysis();
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
    renderRegions();
    renderRanking();
    renderDetails();
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
        note.textContent = "Região candidata selecionada. Os quatro pilares do ponto e raio estão disponíveis em Resumo e Local.";
        return;
    }

    selectedRegion = null;
    setSimulatedSite(
        { lat: option.lat, lng: option.lng, state: option.state, name: option.name },
        { activateResults: true },
    );
    map.flyTo([option.lat, option.lng], 8);
    renderRegions();
    renderRanking();
    activatePanelTabByTarget("controls-site");
    note.textContent = "Município selecionado para simulação local. Ajuste o raio para ver recursos e impacto.";
}

function renderLocalScoreSummary(analysis) {
    const location = selectedRegion || simulatedSite;
    document.querySelector("#selectedName").textContent = location?.name
        ? `${location.name} / ${location.state}`
        : "Local simulado";
    document.querySelector("#selectedSummary").textContent = analysis
        ? `Triagem do ponto e raio de ${analysis.radiusKm} km. Quatro pilares independentes, sem nota ou classificação única do local.`
        : "Defina um ponto e aguarde os dados para avaliar os quatro pilares.";
    document.querySelector("#selectedCoverage").textContent = analysis
        ? (analysis.territorial.complete
            ? "Consulta territorial concluída; consulte limites e diligências na aba Local."
            : "Consulta territorial incompleta ou em andamento; verifique cobertura e valores de reserva na aba Local.")
        : "Sem avaliação local disponível.";
    const groupScores = analysis?.groupScores || Object.fromEntries(criteriaGroups.map(group => [group.id, null]));
    document.querySelector("#selectedScoreGroups").innerHTML = renderScoreGroupSummary(groupScores);
    document.querySelector("#selectedFiber").innerHTML = analysis ? renderRegionFiberProximity(analysis.fiber) : "";
    if (!analysis) {
        document.querySelector("#metrics").innerHTML = "";
        return;
    }
    document.querySelector("#metrics").innerHTML = renderMetricGroups(analysis.scores, groupScores);
    document.querySelector("#recommendation").textContent = analysis.territorial.warnings.join(' ');
    document.querySelector("#conditions").innerHTML = analysis.territorial.rules.map(rule => `<span class="condition">${escapeText(rule.title)}</span>`).join('');
    renderWuiResult(analysis.impact);
    document.querySelector("#renewableMix").innerHTML = `
        <div class="renewable-summary">
            <span>Raio de ${analysis.radiusKm} km</span>
            <strong>${formatMw(analysis.energy.totalCapacityMw)}</strong>
            <small>${analysis.energy.totalPlants} usina(s) na base</small>
        </div>
        <div class="renewable-breakdown-list">${renderEnergyBreakdownRows(analysis.energy.types)}</div>
        <p class="field-note">Capacidade nominal no raio; não representa energia contratada ou conexão garantida.</p>
    `;
    document.querySelector("#methodology").innerHTML = `
        <div class="methodology-block">
            <h3>Base do ponto e raio</h3>
            <p>Os quatro pilares em Resumo e Local usam os recursos no raio, a referência WUI por UF, subestações ONS e as consultas territoriais detalhadas. Consulte o estado de cada fonte na aba Local.</p>
            <p>A comparação regional usa indicadores municipais/estaduais distintos; não incorpora essas consultas detalhadas e não representa uma validação do ponto.</p>
            <p>Pesos só combinam critérios dentro de cada pilar. Todos os pesos de um pilar em zero deixam esse pilar sem avaliação, sem ocultar alertas ambientais ou de cobertura.</p>
        </div>
    `;
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
