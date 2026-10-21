/**
 * ingest-substations.js
 *
 * Baixa o CSV oficial ONS de subestações da Rede de Operação e gera
 * data/substations.json com os campos necessários para o cálculo de distância
 * e o score territorial (Distância de subestação).
 *
 * Fonte: https://dados.ons.org.br/dataset/subestacao
 * CSV: https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/subestacao/SUBESTACAO.csv
 *
 * Campos usados:
 *   id_subestacao, nom_subestacao, nom_agente_principal,
 *   val_niveltensao, val_latitude, val_longitude, nom_subsistema, sig_uf
 *
 * Filtra: apenas subestações com coordenadas válidas e tensão ≥ 69kV.
 */

const https = require("node:https");
const fs = require("node:fs");
const path = require("node:path");

const ONS_CSV_URL =
    "https://ons-aws-prod-opendata.s3.amazonaws.com/dataset/subestacao/SUBESTACAO.csv";
const OUT_PATH = path.join(__dirname, "../data/substations.json");
const MIN_VOLTAGE_KV = 69;

function fetchText(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    fetchText(res.headers.location).then(resolve).catch(reject);
                    return;
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} ao buscar ${url}`));
                    return;
                }
                const chunks = [];
                res.on("data", (chunk) => chunks.push(chunk));
                res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
                res.on("error", reject);
            })
            .on("error", reject);
    });
}

function parseCSV(text) {
    const { parseDelimited } = require('./csv');
    const [headers, ...values] = parseDelimited(text);
    const rows = values.map(row => Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), row[i] || ''])));
    return rows;
}

function normalizeSubstation(row) {
    // Suporta variações de case e separadores nos nomes de campo
    const id =
        row["id_subestacao"] ||
        row["id subestacao"] ||
        row["cod_subestacao"] ||
        "";
    const name =
        row["nom_subestacao"] ||
        row["nom subestacao"] ||
        row["nome_subestacao"] ||
        "";
    const agent =
        row["nom_agente_principal"] ||
        row["nom agente principal"] ||
        "";
    const voltageRaw =
        row["val_niveltensao"] ||
        row["val niveltensao"] ||
        row["tensao_kv"] ||
        "0";
    const latRaw =
        row["val_latitude"] ||
        row["val latitude"] ||
        row["latitude"] ||
        "";
    const lngRaw =
        row["val_longitude"] ||
        row["val longitude"] ||
        row["longitude"] ||
        "";
    const state =
        row["sig_uf"] ||
        row["sig uf"] ||
        row["uf"] ||
        "";
    const subsystem =
        row["nom_subsistema"] ||
        row["nom subsistema"] ||
        row["subsistema"] ||
        "";

    const lat = parseFloat(String(latRaw).replace(",", "."));
    const lng = parseFloat(String(lngRaw).replace(",", "."));
    const voltageKv = parseFloat(String(voltageRaw).replace(",", ".")) || 0;

    return { id, name, agent, voltageKv, lat, lng, state, subsystem };
}

function isValidCoordinate(lat, lng) {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0)
    );
}

async function main() {
    console.log(`Baixando CSV ONS de subestações: ${ONS_CSV_URL}`);
    const text = await fetchText(ONS_CSV_URL);

    const rows = parseCSV(text);
    console.log(`Linhas lidas: ${rows.length}`);

    const substations = rows
        .map(normalizeSubstation)
        .filter((s) => isValidCoordinate(s.lat, s.lng) && s.voltageKv >= MIN_VOLTAGE_KV)
        .map(({ id, name, agent, voltageKv, lat, lng, state, subsystem }) => ({
            id,
            name,
            agent,
            voltageKv,
            lat,
            lng,
            state,
            subsystem,
        }));

    console.log(`Subestações válidas (≥${MIN_VOLTAGE_KV}kV, com coordenadas): ${substations.length}`);

    if (!substations.length) throw new Error("ONS vazio: base anterior preservada");
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, `${JSON.stringify(substations)}\n`);
    console.log(`Gravado: ${path.relative(path.join(__dirname, ".."), OUT_PATH)}`);
}

main().catch((err) => {
    console.error("Erro no ingest de subestações:", err.message);
    process.exit(1);
});
