const assert = require("node:assert/strict");
const test = require("node:test");

const { buildElectricInfrastructure } = require("../electric-infrastructure");

test("builds visible electrical infrastructure from generation and demand data", () => {
  const energyRows = [
    {
      name: "Solar Alpha",
      type: "Solar",
      capacity_mw: 90,
      city: "Alpha",
      state: "BA",
      lat: -10.1,
      lng: -40.1,
    },
    {
      name: "Eolica Alpha",
      type: "Eólica",
      capacity_mw: 70,
      city: "Alpha",
      state: "BA",
      lat: -10.3,
      lng: -40.2,
    },
    {
      name: "Hidro Beta",
      type: "Hidro",
      capacity_mw: 180,
      city: "Beta",
      state: "BA",
      lat: -11.2,
      lng: -41.0,
    },
    {
      name: "Solar pequena",
      type: "Solar",
      capacity_mw: 1,
      city: "Pequena",
      state: "BA",
      lat: -16,
      lng: -45,
    },
  ];
  const waterRows = [
    {
      city: "Centro consumidor",
      state: "BA",
      population: 220000,
      service_type: "Água",
      lat: -10.2,
      lng: -40.15,
    },
    {
      city: "Pequeno centro",
      state: "BA",
      population: 18000,
      service_type: "Água",
      lat: -13,
      lng: -42,
    },
  ];

  const infrastructure = buildElectricInfrastructure(energyRows, waterRows, {
    cellSize: 1,
    minSubstationCapacityMw: 40,
    maxSubstations: 10,
    maxLines: 10,
    maxLineDistanceKm: 200,
    minLoadPopulation: 100000,
  });

  assert.equal(infrastructure.substations.length, 2);
  assert.equal(infrastructure.transmissionLines.length, 1);
  assert.equal(infrastructure.loadCenters.length, 1);
  assert.equal(infrastructure.loadCenters[0].city, "Centro consumidor");
  assert.ok(infrastructure.substations[0].capacityMw >= infrastructure.substations[1].capacityMw);
});
