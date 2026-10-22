(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.EvaluationCriteria = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const CRITERIA = {
        renewables: {
            label: "Energia renovável",
            defaultWeight: 5,
            groupId: "energy",
        },
        grid: {
            label: "Infraestrutura elétrica",
            defaultWeight: 4,
            groupId: "energy",
        },
        water: {
            label: "Água, bacia e clima",
            defaultWeight: 5,
            groupId: "water",
        },
        connectivity: {
            label: "Conectividade e mercado",
            defaultWeight: 3,
            groupId: "connectivity",
        },
        licensing: {
            label: "Diligência regulatória",
            defaultWeight: 4,
            groupId: "territorial",
        },
        environmental: {
            label: "Restrições ambientais",
            defaultWeight: 3,
            groupId: "territorial",
        },
        substation: {
            label: "Distância de subestação",
            defaultWeight: 3,
            groupId: "energy",
        },
    };

    const GROUPS = [
        {
            id: "water",
            label: "Estresse hídrico",
            description: "Água, bacia e clima. Nota maior indica condições hídricas mais favoráveis, não maior estresse.",
            criteria: ["water"],
        },
        {
            id: "energy",
            label: "Capacidade energética",
            description: "Geração renovável, infraestrutura elétrica e proximidade de subestações. Não comprova capacidade disponível para conexão.",
            criteria: ["renewables", "grid", "substation"],
        },
        {
            id: "connectivity",
            label: "Conectividade",
            description: "Proximidade das rotas de cabos e indicadores regionais. Não comprova atendimento, redundância ou latência.",
            criteria: ["connectivity"],
        },
        {
            id: "territorial",
            label: "Risco social/territorial",
            description: "Diligência regulatória e restrições ambientais. Nota maior é mais favorável; cobertura social e territorial é parcial e não substitui licenciamento.",
            criteria: ["licensing", "environmental"],
        },
    ];

    function getDefaultWeights() {
        return Object.fromEntries(
            Object.entries(CRITERIA).map(([key, criterion]) => [key, criterion.defaultWeight]),
        );
    }

    function toFiniteNumber(value, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    function calculateGroupScore(group, scores, weights) {
        const safeScores = scores && typeof scores === "object" ? scores : {};
        const safeWeights = weights && typeof weights === "object" ? weights : getDefaultWeights();
        let totalWeight = 0;
        let weightedTotal = 0;

        group.criteria.forEach((key) => {
            const weight = toFiniteNumber(safeWeights[key]);
            if (weight <= 0) return;

            totalWeight += weight;
            weightedTotal += toFiniteNumber(safeScores[key]) * weight;
        });

        if (totalWeight === 0) return null;
        return Math.round(weightedTotal / totalWeight);
    }

    function calculateGroupScores(scores, weights) {
        return Object.fromEntries(
            GROUPS.map((group) => [
                group.id,
                calculateGroupScore(group, scores, weights),
            ]),
        );
    }

    return {
        CRITERIA,
        GROUPS,
        getDefaultWeights,
        calculateGroupScores,
    };
});
