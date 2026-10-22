(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TerritorialModel = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const normalize = v => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    const finite = v => v !== null && v !== '' && Number.isFinite(Number(v));
    function inRing(point, ring) {
        const [x, y] = point; let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
            const [a, b] = ring[j], [c, d] = ring[i];
            const cross = (x - a) * (d - b) - (y - b) * (c - a);
            if (Math.abs(cross) < 1e-10 && x >= Math.min(a, c) && x <= Math.max(a, c) && y >= Math.min(b, d) && y <= Math.max(b, d)) return true;
            if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
        }
        return inside;
    }
    function contains(point, geometry) {
        const polygons = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : [];
        return polygons.some(rings => rings.length && inRing(point, rings[0]) && !rings.slice(1).some(r => inRing(point, r)));
    }
    function segmentDistanceKm(point, a, b) {
        const sx = 111.32 * Math.cos(point[1] * Math.PI / 180), sy = 111.32;
        const ax = (a[0] - point[0]) * sx, ay = (a[1] - point[1]) * sy;
        const bx = (b[0] - point[0]) * sx, by = (b[1] - point[1]) * sy;
        const dx = bx - ax, dy = by - ay;
        const t = dx * dx + dy * dy ? clamp(-(ax * dx + ay * dy) / (dx * dx + dy * dy), 0, 1) : 0;
        return Math.hypot(ax + t * dx, ay + t * dy);
    }
    function distance(point, geometry) {
        if (contains(point, geometry)) return 0;
        let lines = [];
        if (geometry?.type === 'LineString') lines = [geometry.coordinates];
        if (geometry?.type === 'MultiLineString' || geometry?.type === 'Polygon') lines = geometry.coordinates;
        if (geometry?.type === 'MultiPolygon') lines = geometry.coordinates.flat();
        let nearest = Infinity;
        for (const line of lines) for (let i = 1; i < line.length; i++) nearest = Math.min(nearest, segmentDistanceKm(point, line[i - 1], line[i]));
        return nearest;
    }
    function basinScore(basin) {
        const scores = { baixo: 90, mediano: 75, moderado: 75, alto: 50, 'muito alto': 30, critico: 15, intermitente: 20 };
        return scores[normalize(basin?.class)] ?? 50;
    }
    function climateAssessment(parameters, fillValue = -999) {
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const valid = (v, min, max) => finite(v) && Number(v) !== fillValue && Number(v) >= min && Number(v) <= max;
        const t = parameters?.T2M_MAX, rain = parameters?.PRECTOTCORR, rh = parameters?.RH2M;
        if (!months.every(m => valid(t?.[m], -70, 65) && valid(rain?.[m], 0, 100) && valid(rh?.[m], 0, 100))) return { score: 50, status: 'unavailable' };
        const maxTemperature = Math.max(...months.map(m => Number(t[m])));
        const dryMonths = months.filter(m => Number(rain[m]) < 1).length;
        const humidity = months.reduce((sum, m) => sum + Number(rh[m]), 0) / 12;
        // Heurística de triagem, não padrão de projeto de refrigeração.
        const score = Math.round(clamp(100 - Math.max(0, maxTemperature - 28) * 4 - dryMonths * 3 - Math.max(0, humidity - 75) * 0.5, 10, 100));
        return { status: 'ok', score, maxTemperature, dryMonths, humidity: Math.round(humidity * 10) / 10 };
    }
    function assess(live = {}, baseScores = {}) {
        const environment = live.environment;
        const overlaps = environment?.items?.filter(x => x.atPoint) || [];
        const integral = overlaps.some(x => normalize(x.group) === 'protecao integral');
        const complete = ['environment', 'basin', 'transmission', 'climate'].every(k => live[k]?.status === 'ok');
        const environmentScore = integral ? 15 : overlaps.length ? 40 : environment?.status === 'ok' ? 70 : baseScores.environmental ?? 58;
        const transmission = live.transmission;
        const d = transmission?.nearestDistanceKm;
        const lineScore = transmission?.status === 'ok' ? (d == null ? 25 : d <= 5 ? 90 : d <= 20 ? 75 : d <= 50 ? 55 : 35) : 40;
        const basin = live.basin?.status === 'ok' ? basinScore(live.basin) : 50;
        const climate = live.climate?.status === 'ok' ? live.climate.score : 50;
        const licensing = integral ? 20 : overlaps.length ? 40 : 60;
        const rules = [
            { title: 'Competência e enquadramento', text: 'Confirmar com o órgão ambiental competente o enquadramento da atividade e o procedimento aplicável. Sem aprovação ou dispensa automática.', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp140.htm' },
            { title: 'Licenciamento e uso do solo', text: 'Consultar exigências estaduais/municipais, zoneamento, atividade, porte, obras associadas e a Lei Geral do Licenciamento. Essas regras locais ainda exigem confirmação do empreendedor.', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15190.htm' },
            { title: 'Uso de água', text: 'Se houver captação própria ou lançamento, verificar outorga ou hipótese de dispensa com o órgão gestor. O consumo estimado não comprova disponibilidade hídrica.', url: 'https://www.gov.br/ana/pt-br/regulacao/principais-servicos/outorgas-emitidas' },
        ];
        if (overlaps.length) rules.push({ title: 'Unidade de conservação no ponto', text: 'Consultar categoria, ato de criação, plano de manejo e gestor das UCs identificadas. Compatibilidade de uso precisa de avaliação específica (SNUC).', url: 'https://www.planalto.gov.br/ccivil_03/leis/l9985.htm' });
        if (overlaps.some(x => normalize(x.sphere) === 'federal' && normalize(x.category) !== 'area de protecao ambiental')) rules.push({ title: 'Verificação de competência federal', text: 'Localização em UC federal, exceto APA, exige verificar competência da União conforme art. 7º, XIV, d, da LC 140. Consultar o Ibama.', url: 'https://www.gov.br/ibama/pt-br/assuntos/laf/sobre' });
        const warnings = [];
        if (!complete) warnings.push('Consulta territorial incompleta ou em andamento: verifique a cobertura de cada fonte e os valores de reserva antes de decidir.');
        if (integral) warnings.push('Ponto em UC de proteção integral: consultar gestor, categoria e plano de manejo. A interseção exige diligência específica e não representa decisão legal sobre o empreendimento.');
        else if (overlaps.length) warnings.push('Ponto em UC: verificar compatibilidade com a categoria, o plano de manejo e o órgão competente.');
        warnings.push('FUNAI, INCRA, APPs, zonas de amortecimento, embargos e regras municipais específicas não têm cobertura geométrica nesta versão.');
        return {
            scores: { ...baseScores, grid: lineScore, water: Math.round((baseScores.water ?? 50) * 0.3 + basin * 0.5 + climate * 0.2), environmental: environmentScore, licensing },
            complete,
            rules, warnings, overlaps,
        };
    }
    return { contains, distance, segmentDistanceKm, basinScore, climateAssessment, assess, normalize };
});
