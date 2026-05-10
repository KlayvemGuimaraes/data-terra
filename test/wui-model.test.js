const assert = require("node:assert/strict");
const test = require("node:test");

const {
  WATER_USE_PRESETS,
  applyWuiToScores,
  calculateWuiAssessment,
  getAqueductStressByState,
} = require("../wui-model");

test("looks up Aqueduct baseline water stress by Brazilian state", () => {
  const sp = getAqueductStressByState("SP");

  assert.equal(sp.state, "SP");
  assert.equal(sp.source, "WRI Aqueduct 4.0 province baseline bws Tot");
  assert.equal(sp.category, 1);
  assert.equal(sp.label, "Low - Medium (10-20%)");
  assert.equal(Number(sp.score.toFixed(3)), 1.137);
});

test("calculates WUI estimate from data center water intensity and local stress", () => {
  const assessment = calculateWuiAssessment({
    state: "PB",
    waterUseIntensityLPerKwh: 2.5,
    itLoadMw: 50,
  });

  assert.equal(assessment.annualWaterMegaliters, 1095);
  assert.equal(assessment.impactScore, 54);
  assert.equal(assessment.suitabilityScore, 46);
  assert.equal(assessment.impactClass, "Substancial");
  assert.equal(assessment.stress.label, "Medium - High (20-40%)");
});

test("applies WUI suitability to the region water score without mutating input scores", () => {
  const scores = {
    renewables: 80,
    grid: 70,
    water: 90,
    environment: 75,
    connectivity: 60,
    licensing: 70,
  };

  const updated = applyWuiToScores(scores, {
    state: "SP",
    waterUseIntensityLPerKwh: WATER_USE_PRESETS.intensive.intensity,
    itLoadMw: 40,
  });

  assert.equal(scores.water, 90);
  assert.notEqual(updated.water, 90);
  assert.equal(updated.water, 59);
});

test("falls back safely when a state has no Aqueduct entry", () => {
  const assessment = calculateWuiAssessment({
    state: "XX",
    waterUseIntensityLPerKwh: 1,
    itLoadMw: 10,
  });

  assert.equal(assessment.stress.label, "Sem dado Aqueduct");
  assert.equal(assessment.impactClass, "Baixo");
  assert.equal(assessment.suitabilityScore, 88);
});
