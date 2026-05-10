const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

test("vercel rewrites API endpoints to static data files", () => {
  const config = readJson("vercel.json");
  const rewrites = config.rewrites || [];

  assert.equal(config.buildCommand, "npm run build");
  assert.equal(config.outputDirectory, ".");
  assert.deepEqual(
    rewrites.map((rewrite) => [rewrite.source, rewrite.destination]),
    [
      ["/api/cables", "/data/cables.json"],
      ["/api/water", "/data/water.json"],
      ["/api/energy", "/data/energy.json"],
      ["/api/municipalities", "/data/municipalities.json"],
      ["/api/summary", "/data/summary.json"],
    ],
  );
});

test("static API files contain the data needed by the frontend", () => {
  const cables = readJson("data/cables.json");
  const water = readJson("data/water.json");
  const energy = readJson("data/energy.json");
  const municipalities = readJson("data/municipalities.json");
  const summary = readJson("data/summary.json");

  assert.ok(cables.length > 0);
  assert.ok(cables.every((cable) => typeof cable.geometry === "object"));
  assert.ok(water.length > 0);
  assert.ok(energy.length > 0);
  assert.ok(municipalities.length > 0);
  assert.equal(summary.cables, cables.length);
  assert.equal(summary.water, water.length);
  assert.equal(summary.energy, energy.length);
});
