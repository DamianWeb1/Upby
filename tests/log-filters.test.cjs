const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const ctx = { exports: {} };
vm.createContext(ctx);
vm.runInContext(ts.transpile(fs.readFileSync('app/log-filters.ts', 'utf8'), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), ctx);
const { filterLogs, logTotals, emptyFilters } = ctx.exports;
const logs = [
  {id:1, title:'Design work', note:'Paid by Alice', category:'My category', type:'win',amount:100.10,dateKey:'2026-09-01'},
  {id:2, title:'Hosting',category:'Expenses',type:'loss',amount:20.20,dateKey:'2026-09-30'},
  {id:3,title:'Other work',category:'My category',type:'win',amount:0.20,dateKey:'2026-10-01'},
  {id:4,title:'Legacy',category:'Other',type:'win',amount:5}
];
const run = filters => filterLogs(logs, {...emptyFilters,...filters});
test('search finds titles and optional notes, ignoring case and outer spaces',()=>{
 assert.equal(run({query:' ALICE '})[0].id,1);
 assert.equal(run({query:'work'}).length,2);
 assert.equal(run({query:'missing'}).length,0);
});
test('category, type, search and dates combine without changing source',()=>{
 const before=JSON.stringify(logs);
 const result=run({category:'My category',type:'win',query:'design',from:'2026-09-01',to:'2026-09-30'});
 assert.equal(result.length,1); assert.equal(result[0].id,1);
 assert.equal(JSON.stringify(logs),before);
 assert.equal(run({category:'My category',type:'loss'}).length,0);
});
test('date boundaries inclusive, unknown dates excluded only with date filters',()=>{
 assert.equal(run({from:'2026-09-01',to:'2026-09-30'}).length,2);
 assert.equal(run({to:'2026-09-30'}).length,2);
 assert.equal(run({from:'2026-10-01'}).length,1);
 assert.equal(run({}).length,4);
 assert.equal(run({from:'2026-10-01',to:'2026-09-01'}).length,0);
});
test('totals preserve cents and include every result beyond page size',()=>{
 const result=logTotals(run({from:'2026-09-01'}));
 assert.equal(result.wins,100.30); assert.equal(result.losses,20.20); assert.equal(result.net,80.10);
 assert.equal(logTotals(Array.from({length:35},()=>logs[0])).wins,3503.50);
 assert.equal(logTotals([]).net,0);
});
