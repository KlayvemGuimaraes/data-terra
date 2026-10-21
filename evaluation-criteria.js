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
            groupId: "resources",
        },
        grid: {
            label: "Infraestrutura elétrica",
            defaultWeight: 4,
            groupId: "feasibility",
        },
        water: {
            label: "Segurança hídrica (WUI)",
            defaultWeight: 5,
            groupId: "resources",
        },
        connectivity: {
            label: "Conectividade e mercado",
            defaultWeight: 3,
            groupId: "feasibility",
        },
        licensing: {
            label: "Segurança regulatória",
            defaultWeight: 4,
            groupId: "feasibility",
        },
        environmental: {
            label: "Restrições ambientais",
            defaultWeight: 3,
            groupId: "territorial",
        },
        substation: {
            label: "Distância de subestação",
            defaultWeight: 3,
            groupId: "territorial",
        },
    };

    const GROUPS = [
        {
            id: "resources",
            label: "Recursos e impacto",
            description: "Indicadores de geração renovável e impacto hídrico estimado.",
            criteria: ["renewables", "water"],
        },
        {
            id: "feasibility",
            label: "Viabilidade estimada",
            description: "Estimativas preliminares de infraestrutura, conectividade e contexto regulatório.",
            criteria: ["grid", "connectivity", "licensing"],
        },
        {
            id: "territorial",
            label: "Riscos territoriais",
            description: "Distância geodésica a subestações ONS e presença municipal de UCs de proteção integral (CNUC). Cobertura parcial; não comprova sobreposição nem substitui licenciamento.",
            criteria: ["environmental", "substation"],
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

    function getCriterionKeys(criterionKeys) {
        const keys = Array.isArray(criterionKeys) ? criterionKeys : Object.keys(CRITERIA);
        return Array.from(new Set(keys)).filter((key) => Object.hasOwn(CRITERIA, key));
    }

    function calculateWeightedScore(scores, weights, criterionKeys) {
        const safeScores = scores && typeof scores === "object" ? scores : {};
        const safeWeights = weights && typeof weights === "object" ? weights : getDefaultWeights();
        let totalWeight = 0;
        let weightedTotal = 0;

        getCriterionKeys(criterionKeys).forEach((key) => {
            const weight = toFiniteNumber(safeWeights[key]);
            if (weight <= 0) return;

            totalWeight += weight;
            weightedTotal += toFiniteNumber(safeScores[key]) * weight;
        });

        if (totalWeight === 0) return 0;
        return Math.round(weightedTotal / totalWeight);
    }

    function calculateGroupScores(scores, weights) {
        return Object.fromEntries(
            GROUPS.map((group) => [
                group.id,
                calculateWeightedScore(scores, weights, group.criteria),
            ]),
        );
    }

    return {
        CRITERIA,
        GROUPS,
        getDefaultWeights,
        calculateWeightedScore,
        calculateGroupScores,
    };
});
