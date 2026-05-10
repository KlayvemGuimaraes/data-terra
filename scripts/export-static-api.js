const fs = require("node:fs");
const path = require("node:path");
const db = require("../server/db");

const rootDir = path.join(__dirname, "..");
const dataDir = path.join(rootDir, "data");

function writeJson(fileName, value) {
  const filePath = path.join(dataDir, fileName);
  fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`);
  console.log(`Wrote ${path.relative(rootDir, filePath)}`);
}

function parseGeometry(row) {
  return {
    ...row,
    geometry: JSON.parse(row.geometry),
  };
}

function exportStaticApi() {
  fs.mkdirSync(dataDir, { recursive: true });

  const cables = db.prepare("SELECT * FROM cables").all().map(parseGeometry);
  const water = db.prepare("SELECT * FROM water_resources").all();
  const energy = db.prepare("SELECT * FROM energy_plants").all();

  writeJson("cables.json", cables);
  writeJson("water.json", water);
  writeJson("energy.json", energy);
  writeJson("summary.json", {
    cables: cables.length,
    water: water.length,
    energy: energy.length,
  });
}

exportStaticApi();
