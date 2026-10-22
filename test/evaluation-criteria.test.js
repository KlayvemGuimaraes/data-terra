const assert = require("node:assert/strict");
const test = require("node:test");

const EvaluationCriteria = require("../evaluation-criteria");
const {
  CRITERIA,
  GROUPS,
  calculateGroupScores,
  getDefaultWeights,
} = EvaluationCriteria;

const scores = {
  renewables: 90,
  grid: 80,
  water: 50,
  connectivity: 40,
  licensing: 20,
  environmental: 70,
  substation: 10,
};

test("catalogs the seven criteria in four ordered evaluation pillars", () => {
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
    GROUPS.map(({ id, criteria }) => ({ id, criteria })),
    [
      {
        id: "water",
        criteria: ["water"],
      },
      {
        id: "energy",
        criteria: ["renewables", "grid", "substation"],
      },
      {
        id: "connectivity",
        criteria: ["connectivity"],
      },
      {
        id: "territorial",
        criteria: ["licensing", "environmental"],
      },
    ],
  );
  GROUPS.forEach((group) => {
    group.criteria.forEach((criterion) => {
      assert.equal(CRITERIA[criterion].groupId, group.id);
    });
  });
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

test("exports pillar scoring without an overall weighted score", () => {
  assert.equal(Object.hasOwn(EvaluationCriteria, "calculateWeightedScore"), false);
});

test("rounds each pillar's weighted mean using only its own criteria", () => {
  assert.deepEqual(calculateGroupScores(scores, getDefaultWeights()), {
    water: 50,
    energy: 67,
    connectivity: 40,
    territorial: 41,
  });
  assert.deepEqual(
    calculateGroupScores(
      { ...scores, unknown: 100 },
      { ...getDefaultWeights(), unknown: 100 },
    ),
    { water: 50, energy: 67, connectivity: 40, territorial: 41 },
  );
});

test("changing any criterion score affects only its own pillar", () => {
  const weights = getDefaultWeights();
  const baseline = calculateGroupScores(scores, weights);

  GROUPS.forEach((group) => {
    group.criteria.forEach((criterion) => {
      const changed = calculateGroupScores(
        { ...scores, [criterion]: scores[criterion] + 10 },
        weights,
      );

      assert.notEqual(changed[group.id], baseline[group.id], criterion);
      assert.deepEqual(
        changed,
        { ...baseline, [group.id]: changed[group.id] },
        criterion,
      );
    });
  });
});

test("disabling any criterion weight affects only its own pillar", () => {
  const weights = getDefaultWeights();
  const baseline = calculateGroupScores(scores, weights);

  GROUPS.forEach((group) => {
    group.criteria.forEach((criterion) => {
      const changed = calculateGroupScores(scores, {
        ...weights,
        [criterion]: 0,
      });

      assert.notEqual(changed[group.id], baseline[group.id], criterion);
      assert.deepEqual(
        changed,
        { ...baseline, [group.id]: changed[group.id] },
        criterion,
      );
    });
  });
});

test("positive water and connectivity weights do not change single-criterion pillars", () => {
  const weights = getDefaultWeights();
  const baseline = calculateGroupScores(scores, weights);

  for (const criterion of ["water", "connectivity"]) {
    for (const weight of [0.25, 1, 10, 100]) {
      assert.deepEqual(
        calculateGroupScores(scores, { ...weights, [criterion]: weight }),
        baseline,
        `${criterion}: ${weight}`,
      );
    }
  }
});

test("returns null for every pillar when all weights are zero", () => {
  const weights = Object.fromEntries(Object.keys(CRITERIA).map((key) => [key, 0]));

  assert.deepEqual(calculateGroupScores(scores, weights), {
    water: null,
    energy: null,
    connectivity: null,
    territorial: null,
  });
});

test("counts active zero scores while excluding disabled weights", () => {
  assert.deepEqual(
    calculateGroupScores(
      {
        renewables: 0,
        grid: 100,
        water: 0,
        connectivity: 0,
        licensing: 0,
        environmental: 100,
        substation: 100,
      },
      { ...getDefaultWeights(), connectivity: 0, substation: 0 },
    ),
    { water: 0, energy: 44, connectivity: null, territorial: 43 },
  );
});

test("uses numeric score fallbacks and default weights for absent input", () => {
  assert.deepEqual(calculateGroupScores(null, null), {
    water: 0,
    energy: 0,
    connectivity: 0,
    territorial: 0,
  });
  assert.deepEqual(
    calculateGroupScores(
      {
        renewables: "invalid",
        grid: "80",
        water: NaN,
        connectivity: "40",
        licensing: undefined,
        environmental: null,
        substation: Infinity,
      },
      getDefaultWeights(),
    ),
    { water: 0, energy: 27, connectivity: 40, territorial: 0 },
  );
});

test("does not activate missing, invalid or nonpositive weights", () => {
  assert.deepEqual(calculateGroupScores(scores, {}), {
    water: null,
    energy: null,
    connectivity: null,
    territorial: null,
  });
  assert.deepEqual(
    calculateGroupScores(scores, {
      renewables: "invalid",
      grid: "4",
      water: NaN,
      connectivity: Infinity,
      licensing: null,
      environmental: undefined,
      substation: -3,
    }),
    { water: null, energy: 80, connectivity: null, territorial: null },
  );
});
