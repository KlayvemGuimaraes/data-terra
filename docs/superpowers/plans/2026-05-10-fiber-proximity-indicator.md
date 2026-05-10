# Fiber Proximity Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible fiber-cable proximity indicator that scores regions and local sites higher when fiber routes are closer.

**Architecture:** Extend `site-analysis.js` with a focused fiber summary derived from the existing cable distance calculation. Render that summary in the local analysis panel, add a nearest-cable line to the site layer, and extend the existing map legend without introducing a new layer toggle.

**Tech Stack:** Browser JavaScript, Leaflet, Node.js built-in test runner, CSS.

---

### Task 1: Fiber Score Model

**Files:**
- Modify: `test/site-analysis.test.js`
- Modify: `site-analysis.js`

- [ ] **Step 1: Write the failing score test**

Add tests asserting that a nearby cable produces a high score/band and missing cable geometry returns `Sem dado`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/site-analysis.test.js`
Expected: FAIL because `analysis.fiber` is undefined.

- [ ] **Step 3: Implement the minimal fiber summary**

Add a `summarizeFiberProximity(cables, site, radiusKm)` helper and return it as `fiber` from `analyzeSiteResources`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/site-analysis.test.js`
Expected: PASS.

### Task 2: UI Contract For Legend And Local Result

**Files:**
- Modify: `test/ui-contract.test.js`
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Write failing UI contract tests**

Assert the HTML contains a fiber proximity legend item and the app code renders `siteAnalysis.fiber`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ui-contract.test.js`
Expected: FAIL because the legend and render copy do not exist yet.

- [ ] **Step 3: Implement UI rendering**

Extend the existing legend with a fiber item, render a fiber score block in the local analysis, add fiber rows to nearest resources, and style the band badges.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ui-contract.test.js`
Expected: PASS.

### Task 3: Layer Integration And Full Verification

**Files:**
- Modify: `app.js`
- Modify: `styles.css`

- [ ] **Step 1: Add nearest-cable line rendering**

Use the existing `site` layer to draw a line from the selected site to the nearest cable point when cable data is available.

- [ ] **Step 2: Run full tests**

Run: `node --test test/*.test.js`
Expected: all tests pass.

- [ ] **Step 3: Inspect git status**

Run: `git status --short --branch`
Expected: branch `feature/fiber-proximity-indicator` with only the intended files modified.
