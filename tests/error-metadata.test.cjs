const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const context = { exports: {} };
vm.createContext(context);
vm.runInContext(ts.transpile(fs.readFileSync("app/error-metadata.ts", "utf8"), {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
}), context);

const { errorMetadata } = context.exports;

test("keeps the real message and code from a Supabase error", () => {
  const meta = errorMetadata({ message: "permission denied", code: "42501", hint: "check RLS" }, "logs", "log_refresh_failed");
  assert.equal(meta.message, "permission denied");
  assert.equal(meta.error_code, "42501");
  assert.equal(meta.hint, "check RLS");
  assert.equal(meta.code, "log_refresh_failed");
});

test("uses the HTTP status when a count query returns an empty error", () => {
  const meta = errorMetadata({ message: "", code: "" }, "followers", "hydrate_query_failed", { status: 503, statusText: "" });
  assert.equal(meta.status, 503);
  assert.equal(meta.message, "HTTP 503 with no error body");
});

test("prefers status text over a generic fallback", () => {
  const meta = errorMetadata({ message: "" }, "followers", "hydrate_query_failed", { status: 401, statusText: "Unauthorized" });
  assert.equal(meta.message, "Unauthorized");
});

test("explains errors with no status as likely network failures", () => {
  const meta = errorMetadata({ message: "" }, "followers", "hydrate_query_failed", { status: 0 });
  assert.equal(meta.message, "No error details (likely network or offline)");
});

test("never sends a blank message", () => {
  for (const input of [undefined, null, "oops", {}, { message: "   " }]) {
    assert.notEqual(String(errorMetadata(input, "x", "y").message).trim(), "");
  }
});
