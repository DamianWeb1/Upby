const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), vm = require('vm'), ts = require('typescript');
function load(file, requireFn) { const c = { exports: {}, require: requireFn }; vm.createContext(c); vm.runInContext(ts.transpile(fs.readFileSync(file, 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), c); return c.exports; }
const periods = load('app/insight-periods.ts');
const { dueRecaps, nextRecapPrompt, recapNoticeKey } = load('app/recap-prompt.ts', () => periods);
const plain = (value) => JSON.parse(JSON.stringify(value));

test('last month is offered during days 1 to 7, not after', () => {
  assert.equal(dueRecaps('2026-11-01', ['2026-10-30']).month, '2026-10');
  assert.equal(dueRecaps('2026-11-07', ['2026-10-30']).month, '2026-10');
  assert.equal(dueRecaps('2026-11-08', ['2026-10-30']).month, null);
});

test('no popup without logs in that month', () => {
  assert.equal(dueRecaps('2026-11-02', ['2026-09-30', '2026-11-01']).month, null);
  assert.deepEqual(plain(dueRecaps('2026-11-02', [undefined, 'invalid', '2026-10-32'])), { month: null, year: null });
});

test('January 1 to 7 offers last year and December', () => {
  assert.deepEqual(plain(dueRecaps('2027-01-03', ['2026-12-31'])), { month: '2026-12', year: '2026' });
  assert.equal(dueRecaps('2027-01-08', ['2026-12-31']).year, null);
  assert.equal(dueRecaps('2026-02-02', ['2025-06-01']).year, null);
});

test('month popup shows once per account, either button counts', () => {
  const due = { month: '2026-10', year: null };
  assert.deepEqual(plain(nextRecapPrompt(due, {}, [])), { period: '2026-10', kind: 'month' });
  assert.equal(nextRecapPrompt(due, { '2026-10': 'seen' }, []), null);
  assert.equal(nextRecapPrompt(due, { '2026-10': 'viewed' }, []), null);
});

test('year popup keeps coming back until the recap is viewed', () => {
  const due = { month: '2026-12', year: '2026' };
  assert.deepEqual(plain(nextRecapPrompt(due, { '2026': 'seen' }, [])), { period: '2026', kind: 'year' });
  assert.equal(nextRecapPrompt(due, { '2026': 'seen' }, ['2026']), null, 'Not now hides it for this session only');
  assert.deepEqual(plain(nextRecapPrompt(due, { '2026': 'viewed' }, [])), { period: '2026-12', kind: 'month' }, 'December shows once the year is viewed');
  assert.equal(nextRecapPrompt(due, { '2026': 'viewed' }, ['2026']), null, 'but not in the same visit');
});

test('keys isolate accounts and periods', () => {
  assert.notEqual(recapNoticeKey('a', '2026-09'), recapNoticeKey('b', '2026-09'));
  assert.notEqual(recapNoticeKey('a', '2026-09'), recapNoticeKey('a', '2026'));
});
