const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildRegionSearchOptions,
  findRegionOption,
  normalizeSearchText,
} = require("../region-search");

const regions = [
  { id: "Caetité-BA", name: "Caetité", state: "BA", lat: -14.06, lng: -42.49 },
  { id: "Tucuruí-PA", name: "Tucuruí", state: "PA", lat: -3.76, lng: -49.67 },
];

const municipalities = [
  { name: "Maiquinique", state: "BA", lat: -15.62, lng: -40.26 },
  { name: "Caetité", state: "BA", lat: -14.06, lng: -42.49 },
  { name: "Altamira", state: "PA", lat: -3.2, lng: -52.2 },
];

test("normalizes accents and letter case for region searches", () => {
  assert.equal(normalizeSearchText("  MãÍQUINIQUE  "), "maiquinique");
});

test("builds state-scoped search options with candidate regions and municipalities", () => {
  const options = buildRegionSearchOptions(regions, municipalities, "BA");

  assert.deepEqual(
    options.map((option) => [option.label, option.source]),
    [
      ["Caetité - BA", "candidate"],
      ["Maiquinique - BA", "municipality"],
    ],
  );
});

test("resolves partial typed text to the matching municipality option", () => {
  const options = buildRegionSearchOptions(regions, municipalities, "BA");
  const option = findRegionOption(options, "maiquinique");

  assert.equal(option.label, "Maiquinique - BA");
  assert.equal(option.source, "municipality");
});
