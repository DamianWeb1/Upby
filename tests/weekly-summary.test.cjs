const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const ctx = { exports: {} };
vm.createContext(ctx);
vm.runInContext(ts.transpile(fs.readFileSync('app/weekly-summary.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), ctx);
const { weekBounds, weeklySummary } = ctx.exports;
const log = (type, amount, dateKey, category='Work') => ({type,amount,dateKey,category});
test('weeks start Monday and include Sunday across year boundaries',()=>{
 const week=weekBounds(new Date(2027,0,3,23));
 assert.equal(week.from,'2026-12-28'); assert.equal(week.to,'2027-01-03');
 const monday=weekBounds(new Date(2027,0,4));
 assert.equal(monday.from,'2027-01-04');
 assert.equal(weekBounds(new Date(2027,0,4),-1).from,'2026-12-28');
});
test('weekly totals include boundaries, exclude undated and other weeks, preserve cents',()=>{
 const summary=weeklySummary([log('win',.1,'2026-09-21'),log('win',.2,'2026-09-27'),log('loss',.4,'2026-09-23'),log('win',100,'2026-09-20'),log('win',100,'2026-09-28'),log('win',100)],'2026-09-21','2026-09-27');
 assert.equal(summary.wins,.3); assert.equal(summary.losses,.4); assert.equal(summary.net,-.1); assert.equal(summary.count,3);
});
test('top categories include losses and custom names and rank by combined amount',()=>{
 const summary=weeklySummary([log('win',10,'2026-09-21','Custom'),log('loss',50,'2026-09-21','Fees'),log('win',30,'2026-09-21','Mixed'),log('loss',30,'2026-09-21','Mixed'),log('win',5,'2026-09-21','Other')],'2026-09-21','2026-09-27');
 assert.equal(summary.categories.length,3); assert.equal(summary.categories[0].name,'Mixed'); assert.equal(summary.categories[0].volume,60); assert.equal(summary.categories[0].net,0); assert.equal(summary.categories[1].name,'Fees');
});
test('empty weeks have no fabricated stats',()=>{
 const summary=weeklySummary([],'2026-09-21','2026-09-27');
 assert.equal(summary.net,0); assert.equal(summary.count,0); assert.equal(summary.categories.length,0);
});
