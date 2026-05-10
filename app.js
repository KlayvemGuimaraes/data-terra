const regions = [
  {
    id: "pecem",
    name: "Pecém",
    state: "CE",
    x: 64,
    y: 26,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Porto, hub de hidrogênio e forte complementaridade eólica/solar para cargas eletrointensivas.",
    scores: {
      renewables: 94,
      grid: 76,
      water: 62,
      environment: 70,
      connectivity: 78,
      licensing: 74,
    },
    layers: ["energy", "grid", "water"],
    tags: ["eólica", "solar", "porto", "H2"],
    recommendation:
      "Alta aptidão para data center com contrato de energia renovável adicional e desenho hídrico conservador.",
    conditions: [
      "energia renovável adicional",
      "resfriamento de baixo consumo",
      "monitoramento hídrico",
    ],
  },
  {
    id: "suape",
    name: "Suape",
    state: "PE",
    x: 68,
    y: 36,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Complexo portuário-industrial com logística forte e boa conexão com projetos renováveis do Nordeste.",
    scores: {
      renewables: 88,
      grid: 72,
      water: 58,
      environment: 66,
      connectivity: 76,
      licensing: 69,
    },
    layers: ["energy", "grid", "water"],
    tags: ["porto", "solar", "eólica"],
    recommendation:
      "Apto com condicionantes, especialmente em segurança hídrica e comprovação de energia limpa firme.",
    conditions: [
      "plano de seca",
      "energia contratada dedicada",
      "reuso de água",
    ],
  },
  {
    id: "camacari",
    name: "Camaçari",
    state: "BA",
    x: 61,
    y: 45,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Base industrial relevante, proximidade portuária e oportunidade para integrar data center a power shoring.",
    scores: {
      renewables: 82,
      grid: 78,
      water: 61,
      environment: 64,
      connectivity: 72,
      licensing: 67,
    },
    layers: ["energy", "grid", "risk"],
    tags: ["indústria", "porto", "solar"],
    recommendation:
      "Boa opção para validar data center ligado a indústria, exigindo avaliação acumulada de água e território.",
    conditions: [
      "avaliação acumulada",
      "resfriamento eficiente",
      "transparência de consumo",
    ],
  },
  {
    id: "serra",
    name: "Serra/Vitória",
    state: "ES",
    x: 63,
    y: 65,
    label: { left: "120%", top: "8px", shift: "0" },
    summary:
      "Região portuária e industrial com potencial para combinar energia limpa, logística e demanda corporativa.",
    scores: {
      renewables: 74,
      grid: 75,
      water: 68,
      environment: 70,
      connectivity: 74,
      licensing: 72,
    },
    layers: ["grid", "water"],
    tags: ["porto", "indústria", "rede"],
    recommendation:
      "Apto para estudo de viabilidade, com foco em conexão elétrica e pactuação local de uso de recursos.",
    conditions: [
      "consulta local",
      "reforço de rede",
      "energia renovável rastreável",
    ],
  },
  {
    id: "campinas",
    name: "Campinas",
    state: "SP",
    x: 51,
    y: 71,
    label: { left: "-18%", top: "8px", shift: "-100%" },
    summary:
      "Mercado consumidor, conectividade e ecossistema digital fortes, mas com maior pressão hídrica e urbana.",
    scores: {
      renewables: 60,
      grid: 86,
      water: 47,
      environment: 58,
      connectivity: 95,
      licensing: 60,
    },
    layers: ["grid", "risk"],
    tags: ["fibra", "mercado", "rede"],
    recommendation:
      "Aptidão condicionada: excelente para latência e mercado, porém exige solução hídrica fechada e energia adicional.",
    conditions: [
      "circuito fechado",
      "energia adicional",
      "gestão de pico",
    ],
  },
  {
    id: "triangulo",
    name: "Triângulo Mineiro",
    state: "MG",
    x: 48,
    y: 62,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Boa posição logística, presença de biomassa/solar e menor pressão urbana que grandes metrópoles.",
    scores: {
      renewables: 77,
      grid: 70,
      water: 66,
      environment: 73,
      connectivity: 64,
      licensing: 75,
    },
    layers: ["energy", "water"],
    tags: ["solar", "biomassa", "logística"],
    recommendation:
      "Boa alternativa para data center regional, especialmente se combinado com solar, biomassa e armazenamento.",
    conditions: [
      "armazenamento",
      "contrato renovável",
      "gestão hídrica local",
    ],
  },
  {
    id: "rio",
    name: "Rio de Janeiro",
    state: "RJ",
    x: 58,
    y: 72,
    label: { left: "118%", top: "10px", shift: "0" },
    summary:
      "Conectividade internacional e mercado, mas maior complexidade territorial e custo regulatório.",
    scores: {
      renewables: 56,
      grid: 82,
      water: 63,
      environment: 55,
      connectivity: 93,
      licensing: 54,
    },
    layers: ["grid", "risk"],
    tags: ["cabos", "mercado", "porto"],
    recommendation:
      "Indicado para cargas que valorizam conectividade, com análise ambiental e urbana mais rigorosa.",
    conditions: [
      "mitigação urbana",
      "energia rastreável",
      "plano de contingência",
    ],
  },
  {
    id: "goiasdf",
    name: "Goiás/DF",
    state: "GO/DF",
    x: 47,
    y: 55,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Centralidade geográfica, solar competitivo e boa alternativa para redundância fora do eixo costeiro.",
    scores: {
      renewables: 76,
      grid: 68,
      water: 57,
      environment: 69,
      connectivity: 66,
      licensing: 72,
    },
    layers: ["energy", "grid"],
    tags: ["solar", "redundância", "interior"],
    recommendation:
      "Apto com condicionantes de rede e água, interessante para redundância nacional de infraestrutura cloud.",
    conditions: ["reforço elétrico", "uso eficiente de água", "backup limpo"],
  },
  {
    id: "portoalegre",
    name: "Porto Alegre",
    state: "RS",
    x: 49,
    y: 86,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Clima mais favorável para resfriamento e boa conectividade regional, com atenção a eventos extremos.",
    scores: {
      renewables: 69,
      grid: 72,
      water: 71,
      environment: 62,
      connectivity: 70,
      licensing: 68,
    },
    layers: ["water", "grid"],
    tags: ["clima", "rede", "mercado sul"],
    recommendation:
      "Apto com avaliação de resiliência climática, especialmente drenagem, cheias e continuidade operacional.",
    conditions: [
      "resiliência climática",
      "redundância elétrica",
      "plano de cheias",
    ],
  },
  {
    id: "manaus",
    name: "Manaus",
    state: "AM",
    x: 33,
    y: 31,
    label: { left: "50%", top: "38px", shift: "-50%" },
    summary:
      "Zona industrial relevante, mas com desafios de rede, logística energética e sensibilidade socioambiental.",
    scores: {
      renewables: 44,
      grid: 42,
      water: 75,
      environment: 38,
      connectivity: 48,
      licensing: 40,
    },
    layers: ["water", "risk"],
    tags: ["indústria", "sistema sensível", "alerta"],
    recommendation:
      "Não recomendado para data center eletrointensivo sem solução dedicada de energia limpa e baixo impacto.",
    conditions: [
      "energia dedicada",
      "estudo socioambiental robusto",
      "não ampliar fóssil",
    ],
  },
];

const metricLabels = {
  renewables: "Energia renovável",
  grid: "Infraestrutura elétrica",
  water: "Segurança hídrica",
  environment: "Baixo risco socioambiental",
  connectivity: "Conectividade e mercado",
  licensing: "Segurança regulatória",
};

const defaultWeights = {
  renewables: 5,
  grid: 4,
  water: 5,
  environment: 4,
  connectivity: 3,
  licensing: 4,
};

let weights = { ...defaultWeights };
let selectedId = "pecem";
let activeLayers = new Set(["energy", "grid", "water", "risk"]);

const markersEl = document.querySelector("#markers");
const weightsEl = document.querySelector("#weights");
const rankingEl = document.querySelector("#ranking");
const regionSelect = document.querySelector("#regionSelect");
const metricsEl = document.querySelector("#metrics");

function getScore(region) {
  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weighted = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + region.scores[key] * weight;
  }, 0);
  return Math.round(weighted / totalWeight);
}

function getClass(score) {
  if (score >= 80) {
    return { label: "Alta aptidão", className: "high" };
  }
  if (score >= 60) {
    return { label: "Condicionada", className: "medium" };
  }
  return { label: "Alto risco", className: "low" };
}

function sortedRegions() {
  return [...regions].sort((a, b) => getScore(b) - getScore(a));
}

function renderWeights() {
  weightsEl.innerHTML = Object.entries(metricLabels)
    .map(
      ([key, label]) => `
        <div class="weight-control">
          <div class="weight-head">
            <span>${label}</span>
            <span id="weight-value-${key}">${weights[key]}</span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            value="${weights[key]}"
            data-weight="${key}"
            aria-label="${label}"
          />
        </div>
      `,
    )
    .join("");
}

function renderSelect() {
  regionSelect.innerHTML = regions
    .map((region) => `<option value="${region.id}">${region.name} - ${region.state}</option>`)
    .join("");
  regionSelect.value = selectedId;
}

function renderMarkers() {
  markersEl.innerHTML = regions
    .map((region) => {
      const score = getScore(region);
      const status = getClass(score);
      const hasVisibleLayer = region.layers.some((layer) => activeLayers.has(layer));
      return `
        <button
          class="marker ${status.className} ${region.id === selectedId ? "selected" : ""} ${
            hasVisibleLayer ? "" : "layer-muted"
          }"
          style="left:${region.x}%; top:${region.y}%; --label-left:${region.label.left}; --label-top:${region.label.top}; --label-shift:${region.label.shift}"
          data-region="${region.id}"
          data-label="${region.name}/${region.state}"
          type="button"
          aria-label="Analisar ${region.name}"
        >
          ${score}
        </button>
      `;
    })
    .join("");
}

function renderDetails() {
  const region = regions.find((item) => item.id === selectedId);
  const score = getScore(region);
  const status = getClass(score);

  document.querySelector("#selectedName").textContent = `${region.name} / ${region.state}`;
  document.querySelector("#selectedSummary").textContent = region.summary;
  document.querySelector("#selectedScore").textContent = score;
  const statusEl = document.querySelector("#selectedClass");
  statusEl.textContent = status.label;
  statusEl.className = `status-pill ${status.className}`;
  document.querySelector("#recommendation").textContent = region.recommendation;

  metricsEl.innerHTML = Object.entries(metricLabels)
    .map(([key, label]) => {
      const value = region.scores[key];
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

  document.querySelector("#conditions").innerHTML = region.conditions
    .map((condition) => `<span class="condition">${condition}</span>`)
    .join("");
}

function renderRanking() {
  rankingEl.innerHTML = sortedRegions()
    .map((region, index) => {
      const score = getScore(region);
      return `
        <li data-region="${region.id}" tabindex="0">
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

function renderAll() {
  renderMarkers();
  renderDetails();
  renderRanking();
  regionSelect.value = selectedId;
}

function selectRegion(id) {
  selectedId = id;
  renderAll();
}

renderWeights();
renderSelect();
renderAll();

weightsEl.addEventListener("input", (event) => {
  const input = event.target.closest("[data-weight]");
  if (!input) return;
  const key = input.dataset.weight;
  weights[key] = Number(input.value);
  document.querySelector(`#weight-value-${key}`).textContent = input.value;
  renderAll();
});

document.querySelector("#resetWeights").addEventListener("click", () => {
  weights = { ...defaultWeights };
  renderWeights();
  renderAll();
});

document.querySelector("#focusRegion").addEventListener("click", () => {
  selectRegion(regionSelect.value);
});

markersEl.addEventListener("click", (event) => {
  const marker = event.target.closest("[data-region]");
  if (!marker) return;
  selectRegion(marker.dataset.region);
});

rankingEl.addEventListener("click", (event) => {
  const item = event.target.closest("[data-region]");
  if (!item) return;
  selectRegion(item.dataset.region);
});

rankingEl.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const item = event.target.closest("[data-region]");
  if (!item) return;
  event.preventDefault();
  selectRegion(item.dataset.region);
});

document.querySelectorAll("[data-layer]").forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      activeLayers.add(checkbox.dataset.layer);
    } else {
      activeLayers.delete(checkbox.dataset.layer);
    }
    renderMarkers();
  });
});
