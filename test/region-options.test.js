const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildCandidateRegions,
  filterRegionsByState,
  getStateOptions,
} = require("../region-options");

const waterRows = [
  {
    id: "rj-1",
    city: "Rio de Janeiro",
    state: "RJ",
    provider: "Provider RJ",
    service_type: "Água",
    population: 6000000,
    lat: -22.9,
    lng: -43.2,
  },
  {
    id: "sp-1",
    city: "São Paulo",
    state: "SP",
    provider: "Provider SP",
    service_type: "Esgoto",
    population: 12000000,
    lat: -23.5,
    lng: -46.6,
  },
  {
    id: "sp-2",
    city: "São Paulo",
    state: "SP",
    provider: "Provider SP 2",
    service_type: "Água",
    population: 12000000,
    lat: -23.51,
    lng: -46.61,
  },
  {
    id: "ba-1",
    city: "Salvador",
    state: "BA",
    provider: "Provider BA",
    service_type: "Água",
    population: 2800000,
    lat: -12.9,
    lng: -38.5,
  },
  {
    id: "bad",
    city: "Sem Coordenada",
    state: "ZZ",
    provider: "Provider ZZ",
    service_type: "Água",
    population: 1000,
    lat: null,
    lng: -38.5,
  },
];

test("builds one candidate region per valid municipality and combines services", () => {
  const regions = buildCandidateRegions(waterRows);

  assert.deepEqual(
    regions.map((region) => region.id),
    ["Rio de Janeiro-RJ", "São Paulo-SP", "Salvador-BA"],
  );
  assert.equal(regions[1].name, "São Paulo");
  assert.equal(regions[1].state, "SP");
  assert.equal(regions[1].tags.join(" • "), "Água e Esgoto • SP");
  assert.equal(regions[1].scores.water, 78);
  assert.ok(regions[1].summary.includes("Água e Esgoto"));
});

test("returns sorted state options from candidate regions", () => {
  const regions = buildCandidateRegions(waterRows);

  assert.deepEqual(getStateOptions(regions), ["BA", "RJ", "SP"]);
});

test("filters candidate regions by state without dropping other states globally", () => {
  const regions = buildCandidateRegions(waterRows);

  assert.deepEqual(
    filterRegionsByState(regions, "SP").map((region) => region.name),
    ["São Paulo"],
  );
  assert.equal(filterRegionsByState(regions, "ALL").length, 3);
});

test("adds energy-backed candidates for states missing from water data", () => {
  const waterWithoutSp = waterRows.filter((row) => row.state !== "SP");
  const energyRows = [
    {
      id: "energy-sp-1",
      name: "Solar Paulista",
      type: "Solar",
      capacity_mw: 25,
      city: "Ribeirão Preto",
      state: "SP",
      lat: -21.17,
      lng: -47.81,
    },
    {
      id: "energy-sp-2",
      name: "Biomassa Paulista",
      type: "Biomassa",
      capacity_mw: 10,
      city: "Ribeirão Preto",
      state: "SP",
      lat: -21.18,
      lng: -47.82,
    },
  ];

  const regions = buildCandidateRegions(waterWithoutSp, { energyRows });
  const spRegions = filterRegionsByState(regions, "SP");

  assert.deepEqual(getStateOptions(regions), ["BA", "RJ", "SP"]);
  assert.equal(spRegions.length, 1);
  assert.equal(spRegions[0].name, "Ribeirão Preto");
  assert.equal(spRegions[0].tags.join(" • "), "Energia renovável • SP");
  assert.match(spRegions[0].summary, /2 usinas renováveis/);
  assert.match(spRegions[0].summary, /35 MW/);
});

test("uses renewable capacity and population evidence instead of seeded scores", () => {
  const energyRows = [
    {
      id: "energy-sp-1",
      name: "Solar Capital",
      type: "Solar",
      capacity_mw: 800,
      city: "São Paulo",
      state: "SP",
      lat: -23.5,
      lng: -46.6,
    },
    {
      id: "energy-ba-1",
      name: "Solar Bahia",
      type: "Solar",
      capacity_mw: 80,
      city: "Juazeiro",
      state: "BA",
      lat: -9.4,
      lng: -40.5,
    },
  ];

  const regions = buildCandidateRegions(waterRows, { energyRows });
  const sp = regions.find((region) => region.name === "São Paulo");
  const ba = regions.find((region) => region.name === "Salvador");

  assert.equal(sp.scores.renewables, 99);
  assert.equal(sp.scores.grid, 84);
  assert.equal(sp.scores.connectivity, 100);
  assert.equal(ba.scores.renewables, 57);
  assert.ok(sp.methodology.proxyNotes.some((note) => note.includes("capacidade renovável")));
});
