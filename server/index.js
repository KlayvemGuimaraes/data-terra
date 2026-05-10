const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

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
