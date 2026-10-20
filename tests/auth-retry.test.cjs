const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const context = { exports: {}, setTimeout };
vm.createContext(context);
vm.runInContext(ts.transpile(fs.readFileSync("app/auth-retry.ts", "utf8"), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), context);
const { retryAuthTiming, isAuthTimingError } = context.exports;
const noWait = async () => {};
const future = { error: { code: "PGRST303", message: "JWT issued at future" }, status: 401 };

test("retries the JWT timing error and returns the good result", async () => {
  let calls = 0;
  const result = await retryAuthTiming(async () => (++calls < 2 ? future : { error: null, data: [1] }), [1, 1], noWait);
  assert.equal(calls, 2);
  assert.equal(result.error, null);
});

test("gives up after the last retry and returns the error", async () => {
  let calls = 0;
  const result = await retryAuthTiming(async () => { calls++; return future; }, [1, 1], noWait);
  assert.equal(calls, 3);
  assert.equal(result.error.code, "PGRST303");
});

test("treats an empty 401 from a count query as the same glitch", () => {
  assert.equal(isAuthTimingError({ error: { message: "" }, status: 401 }), true);
});

test("does not retry real errors", async () => {
  let calls = 0;
  await retryAuthTiming(async () => { calls++; return { error: { code: "42501", message: "permission denied" }, status: 403 }; }, [1, 1], noWait);
  assert.equal(calls, 1);
  assert.equal(isAuthTimingError({ error: null }), false);
});
