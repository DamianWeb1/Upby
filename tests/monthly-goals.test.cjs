const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const ctx = { exports: {} };
vm.createContext(ctx);
vm.runInContext(ts.transpile(fs.readFileSync('app/goal-math.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), ctx);
const { goalProgress, monthKey, validGoal } = ctx.exports;
const log = (type, amount, dateKey) => ({ type, amount, dateKey });
test('only the selected month contributes, with losses subtracted', () => {
  const result = goalProgress([log('win', 100, '2026-09-01'), log('loss', 25, '2026-09-30'), log('win', 900, '2026-08-31'), log('win', 900, '2026-10-01')], '2026-09-01', 150);
  assert.equal(result.net, 75); assert.equal(result.remaining, 75); assert.equal(result.percent, 50);
});
test('negative net increases the remainder without a negative bar', () => {
  const result = goalProgress([log('loss', 30, '2026-09-25')], '2026-09-01', 100);
  assert.equal(result.remaining, 130); assert.equal(result.percent, 0); assert.equal(result.reached, false);
});
test('reaching and exceeding a goal caps the bar at 100', () => {
  const result = goalProgress([log('win', 150, '2026-09-25')], '2026-09-01', 100);
  assert.equal(result.remaining, 0); assert.equal(result.percent, 100); assert.equal(result.reached, true);
});
test('decimal cents do not leave a false remainder', () => {
  const result = goalProgress([log('win', .1, '2026-09-25'), log('win', .2, '2026-09-25')], '2026-09-01', .3);
  assert.equal(result.net, .3); assert.equal(result.remaining, 0); assert.equal(result.reached, true);
});
test('invalid and out-of-range targets are rejected', () => {
  for (const value of ['', '0', '-5', 'NaN', 'Infinity', '1e3', '12.345', '1000000000000']) assert.equal(validGoal(value), false, value);
  for (const value of ['1000', '.50', '12.50']) assert.equal(validGoal(value), true, value);
});
test('month keys use the local calendar, including year rollover', () => {
  assert.equal(monthKey(new Date(2027, 0, 1)), '2027-01-01');
  assert.equal(monthKey(new Date(2026, 11, 31)), '2026-12-01');
});
