const assert = require("node:assert/strict");
const test = require("node:test");

const { fetchOptionalJson } = require("../api-client");

test("returns fallback data when an optional endpoint is unavailable", async () => {
  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  global.fetch = async () => ({
    ok: false,
    status: 404,
    statusText: "Not Found",
  });
  console.warn = () => {};

  try {
    const result = await fetchOptionalJson("/api/municipalities", []);
    assert.deepEqual(result, []);
  } finally {
    global.fetch = originalFetch;
    console.warn = originalWarn;
  }
});
