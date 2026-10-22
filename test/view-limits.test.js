const assert = require("node:assert/strict");
const test = require("node:test");

const ViewLimits = require("../view-limits");
const { limitMapRegions, limitRankedRegions } = ViewLimits;

function makeRegion(id, groupScores) {
  return {
    id,
    name: id,
    state: "SP",
    groupScores: {
      water: null,
      energy: null,
      connectivity: null,
      territorial: null,
      ...groupScores,
    },
  };
}

const alphabeticalRegions = [
  {
    ...makeRegion("alfa-sp-b", { water: 100, energy: 100, connectivity: 100, territorial: 100 }),
    name: "Alfa",
  },
  {
    ...makeRegion("beta-ac", { water: 90, energy: 90, connectivity: 90, territorial: 90 }),
    name: "Beta",
    state: "AC",
  },
  {
    ...makeRegion("alfa-rj", { water: 80, energy: 80, connectivity: 80, territorial: 80 }),
    name: "Alfa",
    state: "RJ",
  },
  {
    ...makeRegion("alfa-sp-a", { water: 70, energy: 70, connectivity: 70, territorial: 70 }),
    name: "Alfa",
  },
  {
    ...makeRegion("alfa-ac", { water: 10, energy: 10, connectivity: 10, territorial: 10 }),
    name: "Alfa",
    state: "AC",
  },
];
const alphabeticalIds = ["alfa-ac", "alfa-rj", "alfa-sp-a", "alfa-sp-b", "beta-ac"];
const getGroupScores = (region) => region.groupScores;

test("does not export the retired selectable-region limit", () => {
  assert.equal(Object.hasOwn(ViewLimits, "limitSelectableRegions"), false);
});

test("limits ranking while preserving selected region outside the top slice", () => {
  const regions = Array.from({ length: 35 }, (_, index) =>
    makeRegion(`region-${index + 1}`, { water: 100 - index, energy: index }),
  );
  const selected = regions[34];

  const result = limitRankedRegions(regions, "water", getGroupScores, selected, 10);

  assert.equal(result.regions.length, 11);
  assert.equal(result.regions[0].id, "region-1");
  assert.equal(result.regions.at(-1).id, "region-35");
  assert.equal(result.totalCount, 35);
  assert.equal(result.hiddenCount, 24);
});

test("defaults to thirty ranked regions when no selection is supplied", () => {
  const regions = Array.from({ length: 35 }, (_, index) =>
    makeRegion(`region-${index + 1}`, { water: 100 - index }),
  );

  const result = limitRankedRegions(regions, "water", getGroupScores);

  assert.equal(result.regions.length, 30);
  assert.equal(result.regions.at(-1).id, "region-30");
  assert.equal(result.totalCount, 35);
  assert.equal(result.hiddenCount, 5);
});

test("ranks by the explicitly selected pillar rather than the other scores", () => {
  const regions = [
    makeRegion("alfa", { water: 90, energy: 10, connectivity: 40, territorial: 70 }),
    makeRegion("beta", { water: 30, energy: 95, connectivity: 20, territorial: 80 }),
    makeRegion("gama", { water: 60, energy: 40, connectivity: 100, territorial: 10 }),
  ];
  const original = regions.slice();
  const expected = {
    water: ["alfa", "gama", "beta"],
    energy: ["beta", "gama", "alfa"],
    connectivity: ["gama", "alfa", "beta"],
    territorial: ["beta", "alfa", "gama"],
  };

  for (const [pillar, ids] of Object.entries(expected)) {
    const result = limitRankedRegions(regions, pillar, getGroupScores);
    assert.deepEqual(result.regions.map((region) => region.id), ids, pillar);
  }
  assert.deepEqual(regions, original);
});

test("breaks score ties alphabetically by name, state and id, not other pillars", () => {
  const regions = alphabeticalRegions.map((region) => ({
    ...region,
    groupScores: { ...region.groupScores, water: 50 },
  }));

  const result = limitRankedRegions(regions, "water", getGroupScores);

  assert.deepEqual(result.regions.map((region) => region.id), alphabeticalIds);
});

test("places null scores after every numeric score, including zero", () => {
  const regions = [
    makeRegion("null-b", { water: null, energy: 100, connectivity: 100, territorial: 100 }),
    makeRegion("zero", { water: 0 }),
    makeRegion("high", { water: 90 }),
    makeRegion("null-a", { water: null, energy: 0, connectivity: 0, territorial: 0 }),
    makeRegion("low", { water: 20 }),
  ];

  const result = limitRankedRegions(regions, "water", getGroupScores);

  assert.deepEqual(
    result.regions.map((region) => region.id),
    ["high", "low", "zero", "null-a", "null-b"],
  );
});

test("includes a selected null-scored region outside the ranking cutoff", () => {
  const regions = [
    makeRegion("disabled", { water: null, energy: 100 }),
    makeRegion("zero", { water: 0 }),
    makeRegion("high", { water: 90 }),
  ];

  const result = limitRankedRegions(regions, "water", getGroupScores, regions[0], 1);

  assert.deepEqual(result.regions.map((region) => region.id), ["high", "disabled"]);
  assert.equal(result.totalCount, 3);
  assert.equal(result.hiddenCount, 1);
});

test("does not duplicate a selected region already inside the ranking cutoff", () => {
  const regions = [
    makeRegion("high", { water: 90 }),
    makeRegion("low", { water: 20 }),
  ];

  const result = limitRankedRegions(regions, "water", getGroupScores, { ...regions[0] }, 1);

  assert.deepEqual(result.regions.map((region) => region.id), ["high"]);
  assert.equal(result.totalCount, 2);
  assert.equal(result.hiddenCount, 1);
});

test("orders map regions alphabetically by name, state and id regardless of scores", () => {
  const original = alphabeticalRegions.slice();

  const result = limitMapRegions(alphabeticalRegions, "ALL");

  assert.deepEqual(result.regions.map((region) => region.id), alphabeticalIds);
  assert.equal(result.totalCount, 5);
  assert.equal(result.hiddenCount, 0);
  assert.deepEqual(alphabeticalRegions, original);
});

test("applies alphabetical map cutoffs and includes the selected region outside either slice", () => {
  const selected = alphabeticalRegions[1];

  const national = limitMapRegions(alphabeticalRegions, "ALL", selected, 2, 3);
  const state = limitMapRegions(alphabeticalRegions, "SP", selected, 2, 3);

  assert.deepEqual(national.regions.map((region) => region.id), ["alfa-ac", "alfa-rj", "beta-ac"]);
  assert.equal(national.totalCount, 5);
  assert.equal(national.hiddenCount, 2);
  assert.deepEqual(state.regions.map((region) => region.id), ["alfa-ac", "alfa-rj", "alfa-sp-a", "beta-ac"]);
  assert.equal(state.totalCount, 5);
  assert.equal(state.hiddenCount, 1);
});

test("defaults to eighty national and one hundred forty state map regions", () => {
  const regions = Array.from({ length: 200 }, (_, index) =>
    makeRegion(`region-${String(index + 1).padStart(3, "0")}`, { water: index % 101 }),
  ).reverse();
  const selected = regions[0];

  const national = limitMapRegions(regions, "ALL", selected);
  const state = limitMapRegions(regions, "SP", selected);

  assert.equal(national.regions.length, 81);
  assert.equal(national.regions[0].id, "region-001");
  assert.equal(national.regions[79].id, "region-080");
  assert.equal(national.regions.at(-1).id, "region-200");
  assert.equal(national.totalCount, 200);
  assert.equal(national.hiddenCount, 119);
  assert.equal(state.regions.length, 141);
  assert.equal(state.regions[139].id, "region-140");
  assert.equal(state.regions.at(-1).id, "region-200");
  assert.equal(state.totalCount, 200);
  assert.equal(state.hiddenCount, 59);
});

test("does not duplicate a selected region already inside the map cutoff", () => {
  const selected = { ...alphabeticalRegions[4] };

  const result = limitMapRegions(alphabeticalRegions, "ALL", selected, 2);

  assert.deepEqual(result.regions.map((region) => region.id), ["alfa-ac", "alfa-rj"]);
  assert.equal(result.totalCount, 5);
  assert.equal(result.hiddenCount, 3);
});
