const assert = require("node:assert/strict");
const test = require("node:test");

const {
  fetchDatastoreRecords,
  normalizeSigaEnergyRecord,
} = require("../server/aneel-energy");

test("fetches all ANEEL datastore pages until the reported total is reached", async () => {
  const requested = [];
  const pages = [
    { total: 3, records: [{ _id: 1 }, { _id: 2 }] },
    { total: 3, records: [{ _id: 3 }] },
  ];

  const records = await fetchDatastoreRecords({
    resourceId: "resource-1",
    pageSize: 2,
    get: async (url) => {
      const parsed = new URL(url);
      requested.push({
        limit: parsed.searchParams.get("limit"),
        offset: parsed.searchParams.get("offset"),
      });
      return { data: { result: pages.shift() } };
    },
  });

  assert.deepEqual(records, [{ _id: 1 }, { _id: 2 }, { _id: 3 }]);
  assert.deepEqual(requested, [
    { limit: "2", offset: "0" },
    { limit: "2", offset: "2" },
  ]);
});

test("normalizes SIGA generation records with enriched electrical fields", () => {
  const plant = normalizeSigaEnergyRecord({
    _id: 42,
    DatGeracaoConjuntoDados: "2026-05-10",
    NomEmpreendimento: "Solar Exemplo",
    CodCEG: "UFV.RS.SP.000001-0.1",
    SigUFPrincipal: "SP",
    SigTipoGeracao: "UFV",
    DscFaseUsina: "Operação",
    DscOrigemCombustivel: "Solar",
    DscFonteCombustivel: "Radiação solar",
    DscTipoOutorga: "Autorização",
    NomFonteCombustivel: "Radiação solar",
    DatEntradaOperacao: "2024-01-02",
    MdaPotenciaOutorgadaKw: "1234,50",
    MdaPotenciaFiscalizadaKw: "1200,00",
    MdaGarantiaFisicaKw: "450,00",
    IdcGeracaoQualificada: "Sim",
    NumCoordNEmpreendimento: "-23,55000000",
    NumCoordEEmpreendimento: "-46,63000000",
    DatInicioVigencia: "2020-01-01",
    DatFimVigencia: "2040-01-01",
    DscPropriRegimePariticipacao: "100% para Exemplo Energia",
    DscSubBacia: "Tietê",
    DscMuninicpios: "São Paulo - SP",
  });

  assert.deepEqual(plant, {
    id: "42",
    name: "Solar Exemplo",
    type: "Solar",
    generationType: "UFV",
    phase: "Operação",
    fuelOrigin: "Solar",
    fuelSource: "Radiação solar",
    grantType: "Autorização",
    capacityMw: 1.2345,
    fiscalizedCapacityMw: 1.2,
    physicalGuaranteeMw: 0.45,
    qualifiedGeneration: "Sim",
    owner: "100% para Exemplo Energia",
    city: "São Paulo",
    state: "SP",
    lat: -23.55,
    lng: -46.63,
    operationDate: "2024-01-02",
    validityStartDate: "2020-01-01",
    validityEndDate: "2040-01-01",
    subBasin: "Tietê",
    sourceRecordDate: "2026-05-10",
    cegCode: "UFV.RS.SP.000001-0.1",
  });
});

test("skips unsupported or ungeoreferenced SIGA records", () => {
  assert.equal(
    normalizeSigaEnergyRecord({
      _id: 1,
      NomFonteCombustivel: "Gás natural",
      NumCoordNEmpreendimento: "-23,55",
      NumCoordEEmpreendimento: "-46,63",
    }),
    null,
  );

  assert.equal(
    normalizeSigaEnergyRecord({
      _id: 2,
      DscFaseUsina: "Operação",
      NomFonteCombustivel: "Radiação solar",
      NumCoordNEmpreendimento: "0",
      NumCoordEEmpreendimento: "0",
    }),
    null,
  );
});

test("skips generation projects that are not in operation", () => {
  assert.equal(
    normalizeSigaEnergyRecord({
      _id: 3,
      DscFaseUsina: "Construção não iniciada",
      NomFonteCombustivel: "Radiação solar",
      NumCoordNEmpreendimento: "-23,55",
      NumCoordEEmpreendimento: "-46,63",
    }),
    null,
  );
});
