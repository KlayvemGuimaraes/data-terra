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
    capacity_mw REAL,
    owner TEXT,
    city TEXT,
    state TEXT,
    lat REAL,
    lng REAL
  );
`);

module.exports = db;
