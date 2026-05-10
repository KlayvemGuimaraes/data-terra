const assert = require("node:assert/strict");
const test = require("node:test");

const { analyzeSiteResources, distanceKm } = require("../site-analysis");

const center = { lat: -23.55, lng: -46.63 };

const fixtures = {
  energy: [
    {
      name: "Solar Centro",
      type: "Solar",
      capacity_mw: 80,
      city: "São Paulo",
      state: "SP",
      lat: -23.56,
      lng: -46.64,
    },
    {
      name: "Biomassa Próxima",
      type: "Biomassa",
      capacity_mw: 20,
      city: "Guarulhos",
      state: "SP",
      lat: -23.45,
      lng: -46.53,
    },
    {
      name: "Hidro Distante",
      type: "Hidro",
      capacity_mw: 500,
      city: "Ilha Solteira",
      state: "SP",
      lat: -20.43,
      lng: -51.34,
    },
  ],
  water: [
    {
      city: "São Paulo",
      state: "SP",
      provider: "Sabesp",
      service_type: "Água",
      population: 11451245,
      lat: -23.55,
      lng: -46.63,
    },
    {
      city: "São Paulo",
      state: "SP",
      provider: "Sabesp",
      service_type: "Esgoto",
      population: 11451245,
      lat: -23.56,
      lng: -46.62,
    },
    {
      city: "Campinas",
      state: "SP",
      provider: "Sanasa",
      service_type: "Água",
      population: 1139047,
      lat: -22.9,
      lng: -47.06,
    },
  ],
  cables: [
    {
      name: "Backbone SP",
      geometry: {
        type: "LineString",
        coordinates: [
          [-47.1, -23.8],
          [-46.63, -23.55],
          [-46.2, -23.2],
        ],
      },
    },
    {
      name: "Backbone Nordeste",
      geometry: {
        type: "LineString",
        coordinates: [
          [-38.5, -12.9],
          [-35.2, -5.8],
        ],
      },
    },
  ],
};

const regions = [
  { id: "Sao-Paulo-SP", name: "São Paulo", state: "SP", lat: -23.55, lng: -46.63 },
  { id: "Rio-RJ", name: "Rio de Janeiro", state: "RJ", lat: -22.91, lng: -43.17 },
];

test("calculates haversine distance between two nearby coordinates", () => {
  assert.equal(Math.round(distanceKm(center, { lat: -23.56, lng: -46.64 })), 2);
});

test("summarizes resources inside the selected radius", () => {
  const analysis = analyzeSiteResources(fixtures, center, {
    radiusKm: 35,
    regions,
    wuiConfig: { waterUseIntensityLPerKwh: 1, itLoadMw: 50 },
  });

  assert.equal(analysis.site.state, "SP");
  assert.equal(analysis.energy.totalPlants, 2);
  assert.equal(analysis.energy.totalCapacityMw, 100);
  assert.deepEqual(
    analysis.energy.types.map((item) => [item.type, item.capacityMw, item.percentage]),
    [
      ["Hidro", 0, 0],
      ["Solar", 80, 80],
      ["Biomassa", 20, 20],
      ["Eólica", 0, 0],
    ],
  );
  assert.equal(analysis.water.points, 2);
  assert.deepEqual(analysis.water.services, ["Água", "Esgoto"]);
  assert.equal(analysis.cables.count, 1);
  assert.equal(analysis.load.renewableCoveragePercentage, 200);
});

test("calculates site impact and scores from local resources", () => {
  const analysis = analyzeSiteResources(fixtures, center, {
    radiusKm: 35,
    regions,
    wuiConfig: { waterUseIntensityLPerKwh: 1, itLoadMw: 50 },
  });

  assert.equal(analysis.impact.annualWaterMegaliters, 438);
  assert.equal(analysis.impact.state, "SP");
  assert.equal(analysis.scores.renewables, 100);
  assert.ok(analysis.scores.water > 70);
  assert.ok(analysis.overallScore >= 80);
});
