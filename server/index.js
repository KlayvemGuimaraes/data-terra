const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const MUNICIPALITY_DATA_PATHS = [
    path.join(__dirname, '..', 'data', 'municipalities.json'),
    path.join(__dirname, 'references', 'municipios.json'),
];

const ufCodeToState = {
    11: 'RO',
    12: 'AC',
    13: 'AM',
    14: 'RR',
    15: 'PA',
    16: 'AP',
    17: 'TO',
    21: 'MA',
    22: 'PI',
    23: 'CE',
    24: 'RN',
    25: 'PB',
    26: 'PE',
    27: 'AL',
    28: 'SE',
    29: 'BA',
    31: 'MG',
    32: 'ES',
    33: 'RJ',
    35: 'SP',
    41: 'PR',
    42: 'SC',
    43: 'RS',
    50: 'MS',
    51: 'MT',
    52: 'GO',
    53: 'DF',
};

let municipalitiesCache = null;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

function readMunicipalities() {
    if (municipalitiesCache) return municipalitiesCache;

    const dataPath = MUNICIPALITY_DATA_PATHS.find((candidatePath) => fs.existsSync(candidatePath));
    if (!dataPath) {
        municipalitiesCache = [];
        return municipalitiesCache;
    }

    const content = fs.readFileSync(dataPath, 'utf8').replace(/^\uFEFF/, '');
    municipalitiesCache = JSON.parse(content)
        .map((municipality) => ({
            name: municipality.name || municipality.nome,
            state: municipality.state || ufCodeToState[municipality.codigo_uf],
            lat: municipality.lat ?? municipality.latitude,
            lng: municipality.lng ?? municipality.longitude,
        }))
        .filter((municipality) => municipality.name && municipality.state);

    return municipalitiesCache;
}

function normalizeText(value) {
    return String(value || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}

// API Endpoints
app.get('/api/cables', (req, res) => {
    const cables = db.prepare('SELECT * FROM cables').all();
    res.json(cables.map(c => ({
        ...c,
        geometry: JSON.parse(c.geometry)
    })));
});

app.get('/api/water', (req, res) => {
    const water = db.prepare('SELECT * FROM water_resources').all();
    res.json(water);
});

app.get('/api/energy', (req, res) => {
    const energy = db.prepare('SELECT * FROM energy_plants').all();
    res.json(energy);
});

app.get('/api/municipalities', (req, res) => {
    const state = String(req.query.state || '').toUpperCase();
    const query = normalizeText(req.query.q);
    let municipalities = readMunicipalities();

    if (state) {
        municipalities = municipalities.filter((municipality) => municipality.state === state);
    }

    if (query) {
        municipalities = municipalities.filter((municipality) =>
            normalizeText(municipality.name).includes(query),
        );
    }

    res.json(municipalities);
});

app.get('/api/summary', (req, res) => {
    const cableCount = db.prepare('SELECT COUNT(*) as count FROM cables').get().count;
    const waterCount = db.prepare('SELECT COUNT(*) as count FROM water_resources').get().count;
    const energyCount = db.prepare('SELECT COUNT(*) as count FROM energy_plants').get().count;
    
    res.json({
        cables: cableCount,
        water: waterCount,
        energy: energyCount
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
