const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

test("declares a Leaflet layer for every layer checkbox", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const layerNames = Array.from(html.matchAll(/data-layer="([^"]+)"/g)).map(
    (match) => match[1],
  );

  layerNames.forEach((layer) => {
    assert.match(app, new RegExp(`${layer}:\\s*L\\.layerGroup\\(`));
  });
});

test("loads helper models before the main app script", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const riskScriptIndex = html.indexOf("./risk-model.js");
  const limitsScriptIndex = html.indexOf("./view-limits.js");
  const renewableScriptIndex = html.indexOf("./renewable-breakdown.js");
  const siteScriptIndex = html.indexOf("./site-analysis.js");
  const appScriptIndex = html.indexOf("./app.js");

  assert.ok(riskScriptIndex > 0);
  assert.ok(limitsScriptIndex > riskScriptIndex);
  assert.ok(renewableScriptIndex > limitsScriptIndex);
  assert.ok(siteScriptIndex > renewableScriptIndex);
  assert.ok(appScriptIndex > riskScriptIndex);
  assert.ok(appScriptIndex > limitsScriptIndex);
  assert.ok(appScriptIndex > renewableScriptIndex);
  assert.ok(appScriptIndex > siteScriptIndex);
});

test("every panel tab button has a matching tab panel", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const targets = Array.from(html.matchAll(/data-tab-target="([^"]+)"/g)).map(
    (match) => match[1],
  );
  const panels = new Set(
    Array.from(html.matchAll(/data-tab-panel="([^"]+)"/g)).map((match) => match[1]),
  );

  assert.ok(targets.length >= 6);
  targets.forEach((target) => assert.ok(panels.has(target), target));
});

test("declares controls and result areas for local site simulation", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  assert.match(html, /data-tab-target="controls-site"/);
  assert.match(html, /data-tab-panel="controls-site"/);
  assert.match(html, /data-tab-target="result-site"/);
  assert.match(html, /data-tab-panel="result-site"/);
  assert.match(html, /id="siteRadius"/);
  assert.match(html, /id="calculateSite"/);
  assert.match(html, /id="siteAnalysis"/);
});
