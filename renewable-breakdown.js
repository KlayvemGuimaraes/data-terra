(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.RenewableBreakdown = factory();
    }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
    const TYPE_ORDER = ["Hidro", "Solar", "Biomassa", "Eólica"];

    function toNumber(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : 0;
    }

    function isSameText(a, b) {
        return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
    }

    function summarizePlants(plants, scope, scopeLabel) {
        const capacityByType = new Map(TYPE_ORDER.map((type) => [type, 0]));
        let totalCapacityMw = 0;

        plants.forEach((plant) => {
            const capacity = toNumber(plant.capacity_mw);
            if (!capacityByType.has(plant.type)) capacityByType.set(plant.type, 0);
            capacityByType.set(plant.type, capacityByType.get(plant.type) + capacity);
            totalCapacityMw += capacity;
        });

        const orderedTypes = [
            ...TYPE_ORDER,
            ...Array.from(capacityByType.keys()).filter((type) => !TYPE_ORDER.includes(type)).sort(),
        ];

        return {
            scope,
            scopeLabel,
            totalCapacityMw: Math.round(totalCapacityMw * 100) / 100,
            totalPlants: plants.length,
            types: orderedTypes.map((type) => {
                const capacityMw = Math.round((capacityByType.get(type) || 0) * 100) / 100;
                const percentage = totalCapacityMw > 0
                    ? Math.round((capacityMw / totalCapacityMw) * 100)
                    : 0;

                return { type, capacityMw, percentage };
            }),
        };
    }

    function buildRenewableBreakdown(energyRows, region) {
        const localPlants = energyRows.filter((plant) =>
            isSameText(plant.city, region.name) && isSameText(plant.state, region.state),
        );

        if (localPlants.length > 0) {
            return summarizePlants(localPlants, "municipality", "Município");
        }

        const statePlants = energyRows.filter((plant) => isSameText(plant.state, region.state));
        if (statePlants.length > 0) {
            return summarizePlants(statePlants, "state", "Estado");
        }

        return summarizePlants([], "none", "Sem geração registrada");
    }

    return { buildRenewableBreakdown };
});
