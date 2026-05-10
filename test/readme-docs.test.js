const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

test("README opens with data sources and evaluator-focused project context", () => {
  const readme = fs.readFileSync(path.join(rootDir, "README.md"), "utf8");
  const firstSections = readme.slice(0, 2200);

  assert.match(firstSections, /## Fontes e bases usadas/);
  assert.match(firstSections, /ANEEL/);
  assert.match(firstSections, /SNIS/);
  assert.match(firstSections, /WRI Aqueduct/);
  assert.match(firstSections, /The Green Grid/);
  assert.match(firstSections, /TeleGeography/);
  assert.match(firstSections, /Municípios Brasileiros/);
  assert.match(readme, /## Arquitetura resumida/);
  assert.match(readme, /## O que é dado real e o que é estimado/);
  assert.match(readme, /## Deploy na Vercel/);
});
