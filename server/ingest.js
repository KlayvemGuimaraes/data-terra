const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const axios = require('axios');
const db = require('./db');

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
        // Resource ID for "Siga - Empreendimentos de Geração" (diário)
        const resourceId = '2f65a1b0-19b8-4360-8238-b34ab4693d55';
        const url = `https://dadosabertos.aneel.gov.br/api/3/action/datastore_search?resource_id=${resourceId}&limit=5000`;
        
        const res = await axios.get(url);
        const records = res.data.result.records;

        console.log(`Fetched ${records.length} records from ANEEL.`);

        const insert = db.prepare(`
            INSERT OR REPLACE INTO energy_plants (id, name, type, capacity_mw, owner, city, state, lat, lng)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Load city coordinates reference for geocoding if lat/lng is missing or weird
        // (ANEEL data usually has coordinates but let's be safe)
        const municipiosPath = path.join(__dirname, 'references', 'municipios.json');
        const municipiosRaw = fs.readFileSync(municipiosPath, 'utf8');
        const municipios = JSON.parse(municipiosRaw.replace(/^\uFEFF/, ''));
        
        const getUfCode = (uf) => {
            const ufs = { 'RO': 11, 'AC': 12, 'AM': 13, 'RR': 14, 'PA': 15, 'AP': 16, 'TO': 17, 'MA': 21, 'PI': 22, 'CE': 23, 'RN': 24, 'PB': 25, 'PE': 26, 'AL': 27, 'SE': 28, 'BA': 29, 'MG': 31, 'ES': 32, 'RJ': 33, 'SP': 35, 'PR': 41, 'SC': 42, 'RS': 43, 'MS': 50, 'MT': 51, 'GO': 52, 'DF': 53 };
            return ufs[uf.toUpperCase()];
        };

        let count = 0;
        db.transaction(() => {
            records.forEach(r => {
                // ANEEL Columns (Real Names)
                const name = r.NomEmpreendimento;
                const source = (r.NomFonteCombustivel || '').toLowerCase();
                const capacityKw = parseFloat((r.MdaPotenciaOutorgadaKw || '0').replace(',', '.'));
                const state = r.SigUFPrincipal;
                
                // Coordinates
                const lat = parseFloat((r.NumCoordNEmpreendimento || '0').replace(',', '.'));
                const lng = parseFloat((r.NumCoordEEmpreendimento || '0').replace(',', '.'));

                // Extract City from "City - UF"
                const cityParts = (r.DscMuninicpios || '').split(' - ');
                const city = cityParts[0] || '';

                // Map type
                let type = 'Outros';
                if (source.includes('vento')) type = 'Eólica';
                else if (source.includes('sol') || source.includes('fotovoltaica')) type = 'Solar';
                else if (source.includes('hidráulico') || source.includes('hídrica')) type = 'Hidro';
                else if (source.includes('cana') || source.includes('biogás') || source.includes('florestais') || source.includes('licor')) type = 'Biomassa';

                // Skip if not renewable for this prototype focus
                if (type === 'Outros') return;
                if (lat === 0 || lng === 0) return;

                insert.run(
                    r._id.toString(),
                    name,
                    type,
                    (capacityKw / 1000).toFixed(2), // Convert to MW
                    r.DscPropriRegimePariticipacao || '',
                    city,
                    state,
                    lat,
                    lng
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
