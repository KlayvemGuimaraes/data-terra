// CSV com campos entre aspas, separadores e quebras de linha internas.
function parseDelimited(text, delimiter = ';') {
    const rows = []; let row = [], field = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c === '"') {
            if (quoted && text[i + 1] === '"') { field += '"'; i++; }
            else quoted = !quoted;
        } else if (!quoted && (c === delimiter || c === '\n')) {
            row.push(field.replace(/\r$/, '').trim()); field = '';
            if (c === '\n') { if (row.some(Boolean)) rows.push(row); row = []; }
        } else field += c;
    }
    if (quoted) throw new Error('CSV com aspas não fechadas');
    if (field || row.length) { row.push(field.trim()); rows.push(row); }
    return rows;
}
module.exports = { parseDelimited };
