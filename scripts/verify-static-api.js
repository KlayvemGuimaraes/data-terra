const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.join(__dirname, "..");

function readJson(relativePath) {
  const filePath = path.join(rootDir, relativePath);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function verifyStaticApi() {
  const vercelConfig = readJson("vercel.json");
  const rewrites = vercelConfig.rewrites || [];
  const expectedRewrites = [
    ["/api/cables", "/data/cables.json"],
    ["/api/water", "/data/water.json"],
    ["/api/energy", "/data/energy.json"],
    ["/api/municipalities", "/data/municipalities.json"],
    ["/api/summary", "/data/summary.json"],
  ];

  assert(
    JSON.stringify(rewrites.map((rewrite) => [rewrite.source, rewrite.destination])) ===
      JSON.stringify(expectedRewrites),
    "vercel.json rewrites do not match the static API contract",
  );

  const cables = readJson("data/cables.json");
  const water = readJson("data/water.json");
  const energy = readJson("data/energy.json");
  const municipalities = readJson("data/municipalities.json");
  const summary = readJson("data/summary.json");

  assert(Array.isArray(cables) && cables.length > 0, "data/cables.json is empty or invalid");
  assert(cables.every((cable) => typeof cable.geometry === "object"), "cable geometries must be JSON objects");
  assert(Array.isArray(water) && water.length > 0, "data/water.json is empty or invalid");
  assert(Array.isArray(energy) && energy.length > 0, "data/energy.json is empty or invalid");
  assert(Array.isArray(municipalities) && municipalities.length > 0, "data/municipalities.json is empty or invalid");
  assert(summary.cables === cables.length, "summary.cables does not match data/cables.json");
  assert(summary.water === water.length, "summary.water does not match data/water.json");
  assert(summary.energy === energy.length, "summary.energy does not match data/energy.json");

  console.log("Static API ready for Vercel.");
}

verifyStaticApi();
