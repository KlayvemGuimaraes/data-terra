const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const axios = require('axios');
const db = require('./db');
const {
    SIGA_DAILY_RESOURCE_ID,
    fetchDatastoreRecords,
    normalizeSigaEnergyRecord,
} = require('./aneel-energy');

async function ingestCables() {
    console.log('Ingesting fiber cables...');
    const cablesPath = path.join(__dirname, '..', 'all_cables.json');
    const data = JSON.parse(fs.readFileSync(cablesPath, 'utf8'));

    const insert = db.prepare(`
        INSERT OR REPLACE INTO cables (id, name, owners, rfs_year, length, geometry)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
        data.forEach(feature => {
            const props = feature.properties;
            insert.run(
                props.id,
                props.name,
                props.owners,
                props.rfs_year,
                props.length,
                JSON.stringify(feature.geometry)
            );
        });
    })();
    console.log(`Ingested ${data.length} cables.`);
}

async function ingestWater() {
    console.log('Ingesting water data...');
    const xlsPath = path.join(__dirname, '..', 'Planilha_Pesquisa_Simplificada_AE2021.xls');
    const workbook = xlsx.readFile(xlsPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    // Load city coordinates reference
    const municipiosPath = path.join(__dirname, 'references', 'municipios.json');
    if (!fs.existsSync(municipiosPath)) {
        console.error('Municipios reference not found. Run download script first.');
        return;
    }
    const municipiosRaw = fs.readFileSync(municipiosPath, 'utf8');
    const municipios = JSON.parse(municipiosRaw.replace(/^\uFEFF/, ''));
    
    // Helper to find coordinates by name and state
    const findCoords = (name, state) => {
        const m = municipios.find(m => 
            m.nome.toLowerCase() === name.toLowerCase() && 
            m.codigo_uf === getUfCode(state)
        );
        return m ? { lat: m.latitude, lng: m.longitude } : null;
    };

    const getUfCode = (uf) => {
        const ufs = { 'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17, 'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41, 'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53 };
        return ufs[uf.toUpperCase()];
    };

    const insert = db.prepare(`
        INSERT OR REPLACE INTO water_resources (id, city, state, provider, service_type, population, lat, lng)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    db.transaction(() => {
        // Data starts at row 15 (index 14) or similar based on inspection
        rawData.slice(15).forEach((row, index) => {
            if (!row[1] || !row[2]) return; // Skip empty rows

            const city = row[1];
            const state = row[2];
            const provider = row[5];
            const serviceType = row[9];
            const population = row[10];
            
            const coords = findCoords(city, state);
            if (coords) {
                insert.run(
                    `${city}-${state}-${index}`,
                    city,
                    state,
                    provider,
                    serviceType,
                    population,
                    coords.lat,
                    coords.lng
                );
                count++;
            }
        });
    })();
    console.log(`Ingested ${count} water resource points.`);
}

async function ingestEnergy() {
    console.log('Fetching real energy data from ANEEL Datastore...');
    try {
        const records = await fetchDatastoreRecords({
            resourceId: SIGA_DAILY_RESOURCE_ID,
            get: (url) => axios.get(url),
        });

        console.log(`Fetched ${records.length} records from ANEEL.`);

        const insert = db.prepare(`
            INSERT OR REPLACE INTO energy_plants (
                id,
                name,
                type,
                generation_type,
                phase,
                fuel_origin,
                fuel_source,
                grant_type,
                capacity_mw,
                fiscalized_capacity_mw,
                physical_guarantee_mw,
                qualified_generation,
                owner,
                city,
                state,
                lat,
                lng,
                operation_date,
                validity_start_date,
                validity_end_date,
                sub_basin,
                source_record_date,
                ceg_code
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        let count = 0;
        db.prepare('DELETE FROM energy_plants').run();
        db.transaction(() => {
            records.forEach(r => {
                const plant = normalizeSigaEnergyRecord(r);
                if (!plant) return;

                insert.run(
                    plant.id,
                    plant.name,
                    plant.type,
                    plant.generationType,
                    plant.phase,
                    plant.fuelOrigin,
                    plant.fuelSource,
                    plant.grantType,
                    plant.capacityMw,
                    plant.fiscalizedCapacityMw,
                    plant.physicalGuaranteeMw,
                    plant.qualifiedGeneration,
                    plant.owner,
                    plant.city,
                    plant.state,
                    plant.lat,
                    plant.lng,
                    plant.operationDate,
                    plant.validityStartDate,
                    plant.validityEndDate,
                    plant.subBasin,
                    plant.sourceRecordDate,
                    plant.cegCode
                );
                count++;
            });
        })();
        console.log(`Ingested ${count} real renewable energy plants from ANEEL API (Wind, Solar, Hydro, Biomass).`);

    } catch (error) {
        console.error('Error fetching energy data:', error.message);
    }
}

async function run() {
    await ingestCables();
    await ingestWater();
    await ingestEnergy();
}

run().catch(console.error);
