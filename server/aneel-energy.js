const ANEEL_DATASTORE_URL = "https://dadosabertos.aneel.gov.br/api/3/action/datastore_search";
const SIGA_DAILY_RESOURCE_ID = "2f65a1b0-19b8-4360-8238-b34ab4693d55";

async function fetchDatastoreRecords({
    resourceId,
    get,
    pageSize = 5000,
    baseUrl = ANEEL_DATASTORE_URL,
}) {
    const records = [];
    let offset = 0;
    let total = Infinity;

    while (records.length < total) {
        const url = new URL(baseUrl);
        url.searchParams.set("resource_id", resourceId);
        url.searchParams.set("limit", String(pageSize));
        url.searchParams.set("offset", String(offset));

        const response = await get(url.toString());
        const result = response?.data?.result || {};
        const pageRecords = result.records || [];
        total = Number.isFinite(Number(result.total)) ? Number(result.total) : records.length + pageRecords.length;

        if (pageRecords.length === 0) break;

        records.push(...pageRecords);
        offset += pageRecords.length;
    }

    return records;
}

function normalizeSigaEnergyRecord(record) {
    const lat = parseBrazilianNumber(record.NumCoordNEmpreendimento);
    const lng = parseBrazilianNumber(record.NumCoordEEmpreendimento);
    const type = classifyRenewableType(record.NomFonteCombustivel || record.DscFonteCombustivel);
    const phase = record.DscFaseUsina || "";

    if (!type || phase !== "Operação" || !isValidCoordinate(lat, lng)) return null;

    const cityParts = String(record.DscMuninicpios || "").split(" - ");

    return {
        id: String(record._id),
        name: record.NomEmpreendimento || "",
        type,
        generationType: record.SigTipoGeracao || "",
        phase,
        fuelOrigin: record.DscOrigemCombustivel || "",
        fuelSource: record.NomFonteCombustivel || record.DscFonteCombustivel || "",
        grantType: record.DscTipoOutorga || "",
        capacityMw: kwToMw(record.MdaPotenciaOutorgadaKw),
        fiscalizedCapacityMw: kwToMw(record.MdaPotenciaFiscalizadaKw),
        physicalGuaranteeMw: kwToMw(record.MdaGarantiaFisicaKw),
        qualifiedGeneration: record.IdcGeracaoQualificada || "",
        owner: record.DscPropriRegimePariticipacao || "",
        city: cityParts[0] || "",
        state: record.SigUFPrincipal || cityParts[1] || "",
        lat,
        lng,
        operationDate: record.DatEntradaOperacao || "",
        validityStartDate: record.DatInicioVigencia || "",
        validityEndDate: record.DatFimVigencia || "",
        subBasin: record.DscSubBacia || "",
        sourceRecordDate: record.DatGeracaoConjuntoDados || "",
        cegCode: record.CodCEG || "",
    };
}

function classifyRenewableType(value) {
    const source = String(value || "").toLowerCase();
    if (source.includes("vento")) return "Eólica";
    if (source.includes("sol") || source.includes("fotovoltaica") || source.includes("radiação solar")) {
        return "Solar";
    }
    if (source.includes("hidráulico") || source.includes("hídrica") || source.includes("potencial hidráulico")) {
        return "Hidro";
    }
    if (
        source.includes("cana") ||
        source.includes("biogás") ||
        source.includes("biomassa") ||
        source.includes("florestais") ||
        source.includes("licor")
    ) {
        return "Biomassa";
    }
    return null;
}

function kwToMw(value) {
    const kw = parseBrazilianNumber(value);
    return Number.isFinite(kw) ? kw / 1000 : 0;
}

function parseBrazilianNumber(value) {
    if (value === null || value === undefined || value === "") return NaN;
    const number = Number(String(value).replace(",", "."));
    return Number.isFinite(number) ? number : NaN;
}

function isValidCoordinate(lat, lng) {
    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0)
    );
}

module.exports = {
    ANEEL_DATASTORE_URL,
    SIGA_DAILY_RESOURCE_ID,
    fetchDatastoreRecords,
    normalizeSigaEnergyRecord,
};
