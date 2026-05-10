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
  const regionSearchScriptIndex = html.indexOf("./region-search.js");
  const apiClientScriptIndex = html.indexOf("./api-client.js");
  const appScriptIndex = html.indexOf("./app.js");

  assert.ok(riskScriptIndex > 0);
  assert.ok(limitsScriptIndex > riskScriptIndex);
  assert.ok(renewableScriptIndex > limitsScriptIndex);
  assert.ok(siteScriptIndex > renewableScriptIndex);
  assert.ok(regionSearchScriptIndex > siteScriptIndex);
  assert.ok(apiClientScriptIndex > regionSearchScriptIndex);
  assert.ok(appScriptIndex > riskScriptIndex);
  assert.ok(appScriptIndex > limitsScriptIndex);
  assert.ok(appScriptIndex > renewableScriptIndex);
  assert.ok(appScriptIndex > siteScriptIndex);
  assert.ok(appScriptIndex > regionSearchScriptIndex);
  assert.ok(appScriptIndex > apiClientScriptIndex);
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

test("region search uses a writable autocomplete after the state select", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  assert.match(html, /id="stateSelect"/);
  assert.match(html, /id="regionSearch"/);
  assert.match(html, /list="regionOptions"/);
  assert.match(html, /id="regionOptions"/);
  assert.doesNotMatch(html, /id="regionSelect"/);
});

test("declares fiber proximity legend and local result rendering", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

  assert.match(html, /Proximidade da fibra/);
  assert.match(html, /fiber-proximity-dot/);
  assert.match(app, /siteAnalysis\.fiber/);
  assert.match(app, /renderFiberProximity/);
});

test("declares regional fiber proximity rendering", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

  assert.match(html, /id="selectedFiber"/);
  assert.match(app, /buildCandidateRegions\(water,\s*\{\s*energyRows:\s*energy,\s*cables\s*\}\)/);
  assert.match(app, /renderRegionFiberProximity/);
});

test("explains electrical structure legend without declaring unavailable map layers", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");

  assert.match(html, /Subestações/);
  assert.match(html, /Linhas de transmissão/);
  assert.match(html, /Carga elétrica/);
  assert.match(html, /electric-substation-dot/);
  assert.match(html, /electric-transmission-line/);
  assert.match(html, /electric-load-dot/);
  assert.doesNotMatch(app, /electric:\s*L\.layerGroup\(/);
});

test("main interface sections expose hoverable information hints", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");
  const expectedHints = [
    "controls-layers",
    "controls-weights",
    "controls-wui",
    "controls-site",
    "controls-region",
    "map-overview",
    "result-summary",
    "result-water",
    "result-site",
    "result-method",
    "result-ranking",
  ];

  expectedHints.forEach((hintKey) => {
    assert.match(html, new RegExp(`data-info-key="${hintKey}"`));
  });
  assert.ok((html.match(/class="info-hint"/g) || []).length >= expectedHints.length);
});

test("summary view explains score interpretation, examples and estimated criteria limits", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  assert.match(html, /id="scoreGuide"/);
  assert.match(html, /Como interpretar o score/);
  assert.match(html, /data-example="good-site"/);
  assert.match(html, /data-example="bad-site"/);
  assert.match(html, /Critérios estimados/);
});

test("information tooltips are positioned against the viewport to avoid clipping", () => {
  const app = fs.readFileSync(path.join(rootDir, "app.js"), "utf8");
  const css = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

  assert.match(app, /function initInfoHints/);
  assert.match(app, /getBoundingClientRect/);
  assert.match(css, /\.info-tooltip\s*{[^}]*position:\s*fixed/s);
  assert.match(css, /--tooltip-left/);
});
