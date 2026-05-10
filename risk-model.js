(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.RiskModel = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const riskColors = {
        high: "#1f9d63",
        medium: "#c58a14",
        low: "#c54532",
    };

    function classifyRiskImpact(impactScore) {
        const score = Number.isFinite(Number(impactScore)) ? Number(impactScore) : 0;

        if (score >= 51) {
            return { label: "Risco substancial", className: "low" };
        }
        if (score >= 26) {
            return { label: "Risco moderado", className: "medium" };
        }
        return { label: "Baixo risco hídrico", className: "high" };
    }

    function getRiskOverlayStyle(impactScore) {
        const risk = classifyRiskImpact(impactScore);
        const score = Number.isFinite(Number(impactScore)) ? Number(impactScore) : 0;

        return {
            color: riskColors[risk.className],
            fillColor: riskColors[risk.className],
            fillOpacity: score >= 51 ? 0.2 : 0.12,
            opacity: 0.75,
            radius: score >= 51 ? 18 : score >= 26 ? 14 : 10,
            weight: 1,
        };
    }

    return { classifyRiskImpact, getRiskOverlayStyle };
});
