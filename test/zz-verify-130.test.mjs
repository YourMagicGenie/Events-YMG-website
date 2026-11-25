import test from "node:test";
import assert from "node:assert/strict";
test("deliberate failure for #130 verification", () => assert.fail("expected failure"));
