const assert = require("node:assert/strict");
const test = require("node:test");

const { buildRenewableBreakdown } = require("../renewable-breakdown");

const energyRows = [
  {
    city: "Tucuruí",
    state: "PA",
    type: "Hidro",
    capacity_mw: "800",
    lat: -3.8,
    lng: -49.7,
  },
  {
    city: "Tucuruí",
    state: "PA",
    type: "Solar",
    capacity_mw: 200,
    lat: -3.9,
    lng: -49.6,
  },
  {
    city: "Altamira",
    state: "PA",
    type: "Biomassa",
    capacity_mw: 100,
    lat: -3.2,
    lng: -52.2,
  },
  {
    city: "João Câmara",
    state: "RN",
    type: "Eólica",
    capacity_mw: 300,
    lat: -5.5,
    lng: -35.8,
  },
];

test("summarizes renewable mix by selected municipality when local plants exist", () => {
  const summary = buildRenewableBreakdown(energyRows, {
    name: "Tucuruí",
    state: "PA",
  });

  assert.equal(summary.scope, "municipality");
  assert.equal(summary.scopeLabel, "Município");
  assert.equal(summary.totalCapacityMw, 1000);
  assert.equal(summary.totalPlants, 2);
  assert.deepEqual(
    summary.types.map((type) => [type.type, type.capacityMw, type.percentage]),
    [
      ["Hidro", 800, 80],
      ["Solar", 200, 20],
      ["Biomassa", 0, 0],
      ["Eólica", 0, 0],
    ],
  );
});

test("falls back to state renewable mix when municipality has no plants", () => {
  const summary = buildRenewableBreakdown(energyRows, {
    name: "Belém",
    state: "PA",
  });

  assert.equal(summary.scope, "state");
  assert.equal(summary.scopeLabel, "Estado");
  assert.equal(summary.totalCapacityMw, 1100);
  assert.equal(summary.totalPlants, 3);
  assert.deepEqual(
    summary.types.map((type) => [type.type, type.percentage]),
    [
      ["Hidro", 73],
      ["Solar", 18],
      ["Biomassa", 9],
      ["Eólica", 0],
    ],
  );
});

test("returns empty summary when state has no renewable plants", () => {
  const summary = buildRenewableBreakdown(energyRows, {
    name: "Sem Dados",
    state: "AC",
  });

  assert.equal(summary.scope, "none");
  assert.equal(summary.totalCapacityMw, 0);
  assert.equal(summary.totalPlants, 0);
});
