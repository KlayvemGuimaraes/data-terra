const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data-terra.db');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cables (
    id TEXT PRIMARY KEY,
    name TEXT,
    owners TEXT,
    rfs_year INTEGER,
    length TEXT,
    geometry TEXT -- Store as JSON string
  );

  CREATE TABLE IF NOT EXISTS water_resources (
    id TEXT PRIMARY KEY,
    city TEXT,
    state TEXT,
    provider TEXT,
    service_type TEXT,
    population INTEGER,
    lat REAL,
    lng REAL
  );

  CREATE TABLE IF NOT EXISTS energy_plants (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT,
    generation_type TEXT,
    phase TEXT,
    fuel_origin TEXT,
    fuel_source TEXT,
    grant_type TEXT,
    capacity_mw REAL,
    fiscalized_capacity_mw REAL,
    physical_guarantee_mw REAL,
    qualified_generation TEXT,
    owner TEXT,
    city TEXT,
    state TEXT,
    lat REAL,
    lng REAL,
    operation_date TEXT,
    validity_start_date TEXT,
    validity_end_date TEXT,
    sub_basin TEXT,
    source_record_date TEXT,
    ceg_code TEXT
  );
`);

const energyPlantColumns = db.prepare("PRAGMA table_info(energy_plants)").all();
[
  ["generation_type", "TEXT"],
  ["phase", "TEXT"],
  ["fuel_origin", "TEXT"],
  ["fuel_source", "TEXT"],
  ["grant_type", "TEXT"],
  ["fiscalized_capacity_mw", "REAL"],
  ["physical_guarantee_mw", "REAL"],
  ["qualified_generation", "TEXT"],
  ["operation_date", "TEXT"],
  ["validity_start_date", "TEXT"],
  ["validity_end_date", "TEXT"],
  ["sub_basin", "TEXT"],
  ["source_record_date", "TEXT"],
  ["ceg_code", "TEXT"],
].forEach(([name, type]) => {
  if (!energyPlantColumns.some((column) => column.name === name)) {
    db.exec(`ALTER TABLE energy_plants ADD COLUMN ${name} ${type}`);
  }
});

module.exports = db;
