const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

test("topbar uses the DataTerra logo asset", () => {
  const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  assert.match(html, /class="brand-lockup"/);
  assert.match(html, /src="\.\/assets\/dataterra-logo-header\.png"/);
  assert.match(html, /alt="DataTerra"/);
  assert.match(html, /href="\.\/docs\/manual-dataterra\.pdf"/);
  assert.match(html, /Manual da banca/);
});

test("topbar logo wrapper is unframed and panel tabs stay in one row", () => {
  const css = fs.readFileSync(path.join(rootDir, "styles.css"), "utf8");

  assert.match(css, /\.brand-lockup\s*{[^}]*background:\s*transparent/s);
  assert.match(css, /\.brand-lockup\s*{[^}]*border:\s*0/s);
  assert.match(css, /\.brand-lockup\s*{[^}]*border-radius:\s*0/s);
  assert.match(css, /\.panel-tabs\s*{[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/s);
  assert.match(css, /\.tab-button\s*{[^}]*white-space:\s*nowrap/s);
});

test("review manual exists as HTML and PDF with evaluator-focused content", () => {
  const manualHtmlPath = path.join(rootDir, "docs", "manual-dataterra.html");
  const manualPdfPath = path.join(rootDir, "docs", "manual-dataterra.pdf");

  assert.ok(fs.existsSync(manualHtmlPath), "manual HTML should exist");
  assert.ok(fs.existsSync(manualPdfPath), "manual PDF should exist");

  const manualHtml = fs.readFileSync(manualHtmlPath, "utf8");
  assert.match(manualHtml, /Manual da Solução DataTerra/);
  assert.match(manualHtml, /Quando será utilizada/);
  assert.match(manualHtml, /Como usar a plataforma/);
  assert.match(manualHtml, /Escolher local/);
  assert.match(manualHtml, /Como interpretar o score/);
  assert.match(manualHtml, /Limitações e próximos passos/);
  assert.doesNotMatch(manualHtml, /risco socioambiental/i);
  assert.doesNotMatch(manualHtml, /risco ambiental estimado/i);
});
