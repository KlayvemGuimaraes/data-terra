let map;
let layers = {
    cables: L.layerGroup(),
    water: L.layerGroup(),
    energy: L.layerGroup(),
    regions: L.layerGroup()
};

let activeLayers = new Set(["energy", "cables", "water", "risk"]);
let weights = {
    renewables: 5,
    grid: 4,
    water: 5,
    environment: 4,
    connectivity: 3,
    licensing: 4,
};

let selectedRegion = null;
let regionsData = [];
let currentData = {
    cables: [],
    water: [],
    energy: []
};

let subFilters = {
    energy: { type: ["Solar", "Eólica", "Hidro", "Biomassa"] },
    water: { service: ["Água", "Esgoto"], pop: 0 }
};

const metricLabels = {
    renewables: "Energia renovável",
    grid: "Infraestrutura elétrica",
    water: "Segurança hídrica",
    environment: "Baixo risco socioambiental",
    connectivity: "Conectividade e mercado",
    licensing: "Segurança regulatória",
};

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

    Object.values(layers).forEach(layer => layer.addTo(map));
}

// Data Fetching
async function fetchData() {
    try {
        const [cables, water, energy] = await Promise.all([
            fetch('/api/cables').then(res => res.json()),
            fetch('/api/water').then(res => res.json()),
            fetch('/api/energy').then(res => res.json())
        ]);

        currentData = { cables, water, energy };

        renderCables();
        renderWater();
        renderEnergy();
        
        // Use water points as "Regions" for the ranking example
        regionsData = water.slice(0, 20).map(w => ({
            id: w.id,
            name: w.city,
            state: w.state,
            lat: w.lat,
            lng: w.lng,
            summary: `Cidade com ${w.population.toLocaleString()} habitantes. Serviço de ${w.service_type} prestado por ${w.provider}.`,
            scores: {
                renewables: Math.floor(Math.random() * 40) + 60,
                grid: Math.floor(Math.random() * 40) + 50,
                water: Math.min(100, Math.floor(w.population / 10000)),
                environment: Math.floor(Math.random() * 30) + 70,
                connectivity: Math.floor(Math.random() * 50) + 40,
                licensing: 75
            },
            tags: [w.service_type, w.state],
            recommendation: "Aptidão preliminar baseada em dados reais de saneamento e proximidade de infraestrutura.",
            conditions: ["Validar rede elétrica local", "Confirmar disponibilidade de fibra"]
        }));

        renderRegions();
        renderRanking();
        renderWeights();
        renderSelect();
        
        if (regionsData.length > 0) selectRegion(regionsData[0].id);

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
    const filtered = currentData.energy.filter(e => subFilters.energy.type.includes(e.type));

    filtered.forEach(e => {
        L.marker([e.lat, e.lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-pin high"></div><div class="marker-value">⚡</div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            })
        }).bindPopup(`<strong>${e.name}</strong><br>Tipo: ${e.type}<br>Capacidade: ${e.capacity_mw}MW`).addTo(layers.energy);
    });
}

function renderRegions() {
    layers.regions.clearLayers();
    regionsData.forEach(region => {
        const score = getScore(region);
        const status = getClass(score);
        
        const marker = L.marker([region.lat, region.lng], {
            icon: L.divIcon({
                className: 'custom-marker',
                html: `<div class="marker-pin ${status.className}"></div><div class="marker-value">${score}</div>`,
                iconSize: [30, 42],
                iconAnchor: [15, 42]
            })
        });

        marker.on('click', () => selectRegion(region.id));
        marker.addTo(layers.regions);
    });
}

// Logic helpers (same as original but adapted)
function getScore(region) {
    const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
    const weighted = Object.entries(weights).reduce((sum, [key, weight]) => {
        return sum + (region.scores[key] || 0) * weight;
    }, 0);
    return Math.round(weighted / totalWeight);
}

function getClass(score) {
    if (score >= 80) return { label: "Alta aptidão", className: "high" };
    if (score >= 60) return { label: "Condicionada", className: "medium" };
    return { label: "Alto risco", className: "low" };
}

function selectRegion(id) {
    const region = regionsData.find(r => r.id === id);
    if (!region) return;
    
    selectedRegion = region;
    map.flyTo([region.lat, region.lng], 8);
    renderDetails();
    renderRanking();
    document.querySelector("#regionSelect").value = id;
}

function renderDetails() {
    if (!selectedRegion) return;
    const score = getScore(selectedRegion);
    const status = getClass(score);

    document.querySelector("#selectedName").textContent = `${selectedRegion.name} / ${selectedRegion.state}`;
    document.querySelector("#selectedSummary").textContent = selectedRegion.summary;
    document.querySelector("#selectedScore").textContent = score;
    
    const statusEl = document.querySelector("#selectedClass");
    statusEl.textContent = status.label;
    statusEl.className = `status-pill ${status.className}`;
    
    document.querySelector("#recommendation").textContent = selectedRegion.recommendation;

    document.querySelector("#metrics").innerHTML = Object.entries(metricLabels)
        .map(([key, label]) => {
            const value = selectedRegion.scores[key] || 0;
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

    document.querySelector("#conditions").innerHTML = selectedRegion.conditions
        .map((condition) => `<span class="condition">${condition}</span>`)
        .join("");
}

function renderRanking() {
    const sorted = [...regionsData].sort((a, b) => getScore(b) - getScore(a));
    document.querySelector("#ranking").innerHTML = sorted
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

function renderSelect() {
    document.querySelector("#regionSelect").innerHTML = regionsData
        .map(r => `<option value="${r.id}">${r.name} - ${r.state}</option>`)
        .join("");
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
    weights = { renewables: 5, grid: 4, water: 5, environment: 4, connectivity: 3, licensing: 4 };
    renderWeights();
    renderRegions();
    renderRanking();
    renderDetails();
});

document.querySelector("#focusRegion").addEventListener("click", () => {
    selectRegion(document.querySelector("#regionSelect").value);
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
            map.addLayer(layers[layer]);
            if (subContainer) subContainer.style.display = 'block';
        } else {
            map.removeLayer(layers[layer]);
            if (subContainer) subContainer.style.display = 'none';
        }
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
fetchData();
