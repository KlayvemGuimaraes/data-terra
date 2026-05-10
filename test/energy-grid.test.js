const assert = require("node:assert/strict");
const test = require("node:test");

const { buildEnergyGridCells } = require("../energy-grid");

test("groups filtered renewable plants into geographic grid cells", () => {
  const plants = [
    { id: "solar-1", type: "Solar", capacity_mw: 10, lat: -15.1, lng: -47.9 },
    { id: "solar-2", type: "Solar", capacity_mw: "15.5", lat: -15.4, lng: -47.7 },
    { id: "wind-1", type: "Eólica", capacity_mw: 40, lat: -15.3, lng: -47.8 },
    { id: "hydro-1", type: "Hidro", capacity_mw: 80, lat: -21.0, lng: -43.0 },
    { id: "bad-coords", type: "Solar", capacity_mw: 5, lat: 0, lng: 0 },
    { id: "filtered", type: "Biomassa", capacity_mw: 20, lat: -15.2, lng: -47.8 },
  ];

  const cells = buildEnergyGridCells(plants, {
    cellSize: 1,
    allowedTypes: ["Solar", "Eólica", "Hidro"],
  });

  assert.equal(cells.length, 2);

  const brasiliaCell = cells.find((cell) => cell.count === 3);
  assert.deepEqual(brasiliaCell.types, ["Eólica", "Solar"]);
  assert.equal(brasiliaCell.dominantType, "Solar");
  assert.equal(brasiliaCell.count, 3);
  assert.equal(brasiliaCell.capacityMw, 65.5);
  assert.deepEqual(brasiliaCell.bounds, [
    [-16, -48],
    [-15, -47],
  ]);

  const hydroCell = cells.find((cell) => cell.dominantType === "Hidro");
  assert.equal(hydroCell.count, 1);
  assert.equal(hydroCell.capacityMw, 80);
});
