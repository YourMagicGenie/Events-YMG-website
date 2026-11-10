import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/checks.yml", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const browserSmoke = readFileSync(new URL("./browser-smoke.mjs", import.meta.url), "utf8");
const operations = readFileSync(new URL("../docs/CI-OPERATIONS.md", import.meta.url), "utf8");

test("CI is PR-focused, read-only, cancellable and retains only short-lived screenshots", () => {
  assert.match(workflow, /^  pull_request:/m);
  assert.match(workflow, /^  workflow_dispatch:/m);
  assert.doesNotMatch(workflow, /^  push:/m, "successful PR checks are not redundantly rerun after merge");
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /cancel-in-progress: true/);
  assert.match(workflow, /actions\/cache@v4/);
  assert.match(workflow, /- "package-lock\.json"/);
  assert.match(workflow, /retention-days: 3/);
  assert.match(workflow, /timeout-minutes: 5/);
  assert.match(workflow, /^  test:/m);
});

test("routine browser checks stay compact and the full matrix has explicit triggers", () => {
  assert.equal(packageJson.scripts["test:e2e"], "node test/browser-smoke.mjs");
  assert.equal(packageJson.scripts["test:e2e:full"], "node test/browser-smoke.mjs --full-matrix");
  assert.match(browserSmoke, /\?\s*\[320, 360, 390, 430, 540, 541, 768, 850, 851, 1024, 1280, 1440, 1920\]\s*:\s*\[320, 768, 1440\]/);
  assert.match(workflow, /dist\/\*\|src\/worker\.js\|src\/security-headers\.js\|test\/browser-smoke\.mjs/);
  assert.match(workflow, /options: \[quick, full\]/);
  assert.match(operations, /63 seconds/);
  assert.match(operations, /0 billable milliseconds/);
  assert.match(operations, /required PR check/);
});
