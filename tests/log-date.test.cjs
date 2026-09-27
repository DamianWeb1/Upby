const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const context = { exports: {}, Intl, Date };
vm.createContext(context);
vm.runInContext(ts.transpile(fs.readFileSync("app/log-date.ts", "utf8"), {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
}), context);

const { logDateLabel } = context.exports;

test("uses the date key instead of a stale saved Today label", () => {
  assert.equal(logDateLabel("2026-09-20", "Today", "2026-09-27"), "Sep 20");
});

test("shows Today and Yesterday relative to the current local date", () => {
  assert.equal(logDateLabel("2026-09-27", "Sep 27", "2026-09-27"), "Today");
  assert.equal(logDateLabel("2026-09-26", "Today", "2026-09-27"), "Yesterday");
});

test("includes the year outside the current year", () => {
  assert.equal(logDateLabel("2025-12-31", "Today", "2026-02-01"), "Dec 31, 2025");
});

test("keeps legacy labels when no valid date key exists", () => {
  assert.equal(logDateLabel(undefined, "Sep 5", "2026-09-27"), "Sep 5");
  assert.equal(logDateLabel(undefined, undefined, "2026-09-27"), "Date unavailable");
});
