const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const context = { exports: {} };
vm.createContext(context);
vm.runInContext(ts.transpile(fs.readFileSync("app/screenshot-storage.ts", "utf8"), {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
}), context);
const { screenshotFileError, screenshotObjectPath, MAX_SCREENSHOT_BYTES } = context.exports;

test("accepts supported screenshot formats within the size limit", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.equal(screenshotFileError({ type, size: MAX_SCREENSHOT_BYTES }), "");
});

test("rejects unsupported files and oversized images", () => {
  assert.match(screenshotFileError({ type: "image/gif", size: 20 }), /PNG/);
  assert.match(screenshotFileError({ type: "image/png", size: MAX_SCREENSHOT_BYTES + 1 }), /8 MB/);
});

test("stores each screenshot under its owner and log", () => {
  assert.equal(screenshotObjectPath("user-1", 42, "random-id", "image/webp"), "user-1/42/random-id.webp");
  assert.equal(screenshotObjectPath("user-1", 42, "random-id", "image/jpeg"), "user-1/42/random-id.jpg");
});
