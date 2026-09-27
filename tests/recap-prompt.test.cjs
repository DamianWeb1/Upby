const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs'),vm=require('vm'),ts=require('typescript');
function load(file,requireFn){const c={exports:{},require:requireFn};vm.createContext(c);vm.runInContext(ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),c);return c.exports;}
const periods=load('app/insight-periods.ts');const {dueRecap,recapNoticeKey}=load('app/recap-prompt.ts',()=>periods);
test('first day offers only the previous calendar month',()=>{assert.equal(dueRecap('2026-10-01',['2026-09-30']),'2026-09');assert.equal(dueRecap('2026-10-02',['2026-09-30']),null);assert.equal(dueRecap('2026-10-01',['2025-09-30','2026-10-01']),null);});
test('January prompt selects December of previous year',()=>assert.equal(dueRecap('2027-01-01',['2026-12-31']),'2026-12'));
test('empty or undated months do not prompt',()=>{assert.equal(dueRecap('2026-10-01',[]),null);assert.equal(dueRecap('2026-10-01',[undefined,'invalid','2026-09-31']),null);});
test('dismissal key isolates accounts and months',()=>{assert.notEqual(recapNoticeKey('a','2026-09'),recapNoticeKey('b','2026-09'));assert.notEqual(recapNoticeKey('a','2026-09'),recapNoticeKey('a','2026-10'));});
