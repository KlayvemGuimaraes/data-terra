const assert = require("node:assert/strict");
const test = require("node:test");

const { classifyRiskImpact, getRiskOverlayStyle } = require("../risk-model");

test("classifies WUI impact for risk overlays", () => {
  assert.deepEqual(classifyRiskImpact(12), {
    label: "Baixo risco hídrico",
    className: "high",
  });
  assert.deepEqual(classifyRiskImpact(34), {
    label: "Risco moderado",
    className: "medium",
  });
  assert.deepEqual(classifyRiskImpact(61), {
    label: "Risco substancial",
    className: "low",
  });
});

test("returns stable map style for risk overlays", () => {
  const highRisk = getRiskOverlayStyle(61);

  assert.equal(highRisk.color, "#c54532");
  assert.equal(highRisk.radius, 18);
  assert.equal(highRisk.fillOpacity, 0.2);
});
