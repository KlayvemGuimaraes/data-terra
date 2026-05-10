const assert = require("node:assert/strict");
const test = require("node:test");

const {
  limitMapRegions,
  limitRankedRegions,
  limitSelectableRegions,
} = require("../view-limits");

function makeRegion(id, score) {
  return { id, score };
}

test("limits ranking while preserving selected region outside the top slice", () => {
  const regions = Array.from({ length: 35 }, (_, index) =>
    makeRegion(`region-${index + 1}`, 100 - index),
  );
  const selected = regions[34];

  const result = limitRankedRegions(regions, (region) => region.score, selected, 10);

  assert.equal(result.regions.length, 11);
  assert.equal(result.regions[0].id, "region-1");
  assert.equal(result.regions.at(-1).id, "region-35");
  assert.equal(result.totalCount, 35);
  assert.equal(result.hiddenCount, 24);
});

test("limits selectable regions only in national view", () => {
  const regions = Array.from({ length: 150 }, (_, index) =>
    makeRegion(`region-${index + 1}`, 100 - index),
  );

  assert.equal(limitSelectableRegions(regions, (region) => region.score, "ALL").length, 120);
  assert.equal(limitSelectableRegions(regions, (region) => region.score, "SP").length, 150);
});

test("limits map regions more aggressively in national view", () => {
  const regions = Array.from({ length: 200 }, (_, index) =>
    makeRegion(`region-${index + 1}`, 100 - index),
  );
  const selected = regions[199];

  const national = limitMapRegions(regions, (region) => region.score, "ALL", selected);
  const state = limitMapRegions(regions, (region) => region.score, "SP", selected);

  assert.equal(national.regions.length, 81);
  assert.equal(national.hiddenCount, 119);
  assert.equal(national.regions.at(-1).id, "region-200");
  assert.equal(state.regions.length, 141);
  assert.equal(state.hiddenCount, 59);
});
