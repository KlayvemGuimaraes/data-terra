const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CRITERIA,
  GROUPS,
  calculateGroupScores,
  calculateWeightedScore,
  getDefaultWeights,
} = require("../evaluation-criteria");

test("catalogs the seven criteria in three evaluation groups", () => {
  assert.deepEqual(Object.keys(CRITERIA), [
    "renewables",
    "grid",
    "water",
    "connectivity",
    "licensing",
    "environmental",
    "substation",
  ]);
  assert.deepEqual(
    GROUPS.map(({ id, label, criteria }) => ({ id, label, criteria })),
    [
      {
        id: "resources",
        label: "Recursos e impacto",
        criteria: ["renewables", "water"],
      },
      {
        id: "feasibility",
        label: "Viabilidade estimada",
        criteria: ["grid", "connectivity", "licensing"],
      },
      {
        id: "territorial",
        label: "Riscos territoriais",
        criteria: ["environmental", "substation"],
      },
    ],
  );
  assert.equal(CRITERIA.water.groupId, "resources");
  assert.equal(CRITERIA.grid.groupId, "feasibility");
  assert.equal(CRITERIA.environmental.groupId, "territorial");
  assert.equal(CRITERIA.substation.groupId, "territorial");
  assert.ok(GROUPS.every((group) => group.description.length > 0));
});

test("returns a fresh copy of the current default weights", () => {
  const first = getDefaultWeights();
  const second = getDefaultWeights();

  assert.deepEqual(first, {
    renewables: 5,
    grid: 4,
    water: 5,
    connectivity: 3,
    licensing: 4,
    environmental: 3,
    substation: 3,
  });
  assert.notStrictEqual(first, second);

  first.renewables = 1;
  assert.equal(second.renewables, 5);
  assert.equal(CRITERIA.renewables.defaultWeight, 5);
});

test("calculates the rounded overall weighted score", () => {
  const score = calculateWeightedScore(
    {
      renewables: 100,
      grid: 80,
      water: 60,
      connectivity: 40,
      licensing: 20,
    },
    getDefaultWeights(),
  );

  assert.equal(score, 49);
});

test("calculates independent weighted scores for both groups", () => {
  const groupScores = calculateGroupScores(
    {
      renewables: 90,
      grid: 80,
      water: 50,
      connectivity: 40,
      licensing: 20,
    },
    getDefaultWeights(),
  );

  assert.deepEqual(groupScores, {
    resources: 70,
    feasibility: 47,
    territorial: 0,
  });
});

test("handles invalid inputs and zero denominators safely", () => {
  assert.equal(calculateWeightedScore(null, null), 0);
  assert.equal(
    calculateWeightedScore(
      { renewables: "invalid", water: 80 },
      { renewables: 5, water: 5 },
      ["renewables", "water", "unknown"],
    ),
    40,
  );
  assert.equal(
    calculateWeightedScore(
      { renewables: 100, water: 100 },
      { renewables: 0, water: "invalid" },
      ["renewables", "water"],
    ),
    0,
  );
  assert.deepEqual(calculateGroupScores({}, {}), {
    resources: 0,
    feasibility: 0,
    territorial: 0,
  });
});
