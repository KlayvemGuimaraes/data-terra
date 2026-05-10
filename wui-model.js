(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.WuiModel = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const AQUEDUCT_SOURCE = "WRI Aqueduct 4.0 province baseline bws Tot";

    const WATER_USE_PRESETS = {
        conservative: {
            label: "Conservador",
            intensity: 0.3,
            description: "Baixo consumo, boas práticas de resfriamento e reuso.",
        },
        standard: {
            label: "Padrão",
            intensity: 1,
            description: "Operação típica para triagem preliminar.",
        },
        intensive: {
            label: "Intensivo",
            intensity: 2.5,
            description: "Uso elevado de água ou refrigeração evaporativa intensa.",
        },
    };

    const AQUEDUCT_STRESS_BY_STATE = {
        AC: { score: 0, category: 0, label: "Low (<10%)" },
        AL: { score: 0.7996324, category: 0, label: "Low (<10%)" },
        AM: { score: 0, category: 0, label: "Low (<10%)" },
        AP: { score: 0, category: 0, label: "Low (<10%)" },
        BA: { score: 0.767937592, category: 0, label: "Low (<10%)" },
        CE: { score: 1.992651452, category: 1, label: "Low - Medium (10-20%)" },
        DF: { score: 0.453172514, category: 0, label: "Low (<10%)" },
        ES: { score: 0, category: 0, label: "Low (<10%)" },
        GO: { score: 0.353193539, category: 0, label: "Low (<10%)" },
        MA: { score: 0.002347666, category: 0, label: "Low (<10%)" },
        MG: { score: 0.332455037, category: 0, label: "Low (<10%)" },
        MS: { score: 0.035614899, category: 0, label: "Low (<10%)" },
        MT: { score: 0, category: 0, label: "Low (<10%)" },
        PA: { score: 0.169082458, category: 0, label: "Low (<10%)" },
        PB: { score: 2.263497287, category: 2, label: "Medium - High (20-40%)" },
        PE: { score: 1.98018208, category: 1, label: "Low - Medium (10-20%)" },
        PI: { score: 0.953282864, category: 0, label: "Low (<10%)" },
        PR: { score: 0, category: 0, label: "Low (<10%)" },
        RJ: { score: 0.942077463, category: 0, label: "Low (<10%)" },
        RN: { score: 1.711609642, category: 1, label: "Low - Medium (10-20%)" },
        RO: { score: 0, category: 0, label: "Low (<10%)" },
        RR: { score: 0, category: 0, label: "Low (<10%)" },
        RS: { score: 1.447242736, category: 1, label: "Low - Medium (10-20%)" },
        SC: { score: 1.218781903, category: 1, label: "Low - Medium (10-20%)" },
        SE: { score: 0.74512057, category: 0, label: "Low (<10%)" },
        SP: { score: 1.137287117, category: 1, label: "Low - Medium (10-20%)" },
        TO: { score: 0.875676491, category: 0, label: "Low (<10%)" },
    };

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function toNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function getAqueductStressByState(state) {
        const code = String(state || "").toUpperCase();
        const stress = AQUEDUCT_STRESS_BY_STATE[code];

        if (!stress) {
            return {
                state: code || "NA",
                score: 0,
                category: 0,
                label: "Sem dado Aqueduct",
                source: AQUEDUCT_SOURCE,
            };
        }

        return { state: code, ...stress, source: AQUEDUCT_SOURCE };
    }

    function classifyImpact(score) {
        if (score >= 76) return "Alto";
        if (score >= 51) return "Substancial";
        if (score >= 26) return "Moderado";
        return "Baixo";
    }

    function calculateWuiAssessment(input) {
        const state = input?.state;
        const stress = getAqueductStressByState(state);
        const waterUseIntensityLPerKwh = clamp(
            toNumber(input?.waterUseIntensityLPerKwh, WATER_USE_PRESETS.standard.intensity),
            0,
            5,
        );
        const itLoadMw = clamp(toNumber(input?.itLoadMw, 50), 1, 500);
        const normalizedUse = clamp(waterUseIntensityLPerKwh / 3, 0, 1);
        const normalizedStress = clamp(stress.score / 5, 0, 1);
        const impactScore = Math.round(
            100 * normalizedUse * (0.35 + 0.65 * normalizedStress),
        );
        const annualWaterMegaliters = Math.round(
            (waterUseIntensityLPerKwh * itLoadMw * 1000 * 8760) / 1000000,
        );

        return {
            state: stress.state,
            waterUseIntensityLPerKwh,
            itLoadMw,
            annualWaterMegaliters,
            impactScore,
            suitabilityScore: clamp(100 - impactScore, 0, 100),
            impactClass: classifyImpact(impactScore),
            stress,
            source: "WUI-proxy inspirado em The Green Grid WUI + WRI Aqueduct 4.0",
        };
    }

    function applyWuiToScores(scores, input) {
        const assessment = calculateWuiAssessment(input);
        return {
            ...scores,
            water: assessment.suitabilityScore,
        };
    }

    return {
        AQUEDUCT_STRESS_BY_STATE,
        WATER_USE_PRESETS,
        applyWuiToScores,
        calculateWuiAssessment,
        getAqueductStressByState,
    };
});
