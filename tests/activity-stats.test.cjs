const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'), vm=require('node:vm'), ts=require('typescript');
function load(file,requireFn) { const c={exports:{},require:requireFn};vm.createContext(c);vm.runInContext(ts.transpile(fs.readFileSync(file,'utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),c);return c.exports; }
const periods=load('app/insight-periods.ts');
const {activityStats}=load('app/activity-stats.ts',()=>periods);
const log=(dateKey,amount=1,type='win')=>({dateKey,amount,type,category:'Work'});
test('current streak accepts yesterday until today is over, then expires',()=>{
 const logs=[log('2026-09-23'),log('2026-09-24')];
 assert.equal(activityStats(logs,'2026-09-25').current,2);
 assert.equal(activityStats(logs,'2026-09-26').current,0);
});
test('duplicate days and loss logs count once and gaps break streak',()=>{
 const r=activityStats([log('2026-09-20'),log('2026-09-22'),log('2026-09-23'),log('2026-09-23',2,'loss')],'2026-09-23');
 assert.equal(r.current,2);assert.equal(r.longest,2);
});
test('streak crosses month and year boundaries without future or undated entries',()=>{
 const r=activityStats([log('2025-12-30'),log('2025-12-31'),log('2026-01-01'),log('2026-01-02'),log(undefined)],'2026-01-01');
 assert.equal(r.current,3);assert.equal(r.longest,3);
});
test('today net is separate from month and preserves cents',()=>{
 const logs=[log('2025-09-26',500),log('2026-09-25',50),log('2026-09-26',.1),log('2026-09-26',.2),log('2026-09-26',.4,'loss')];
 assert.equal(activityStats(logs,'2026-09-26').todayNet,-.1);
 assert.equal(periods.periodSummary(logs,'2026-09').net,49.9);
});
test('week marks use real Monday to Sunday dates, no future checks',()=>{
 const r=activityStats([log('2026-09-21'),log('2026-09-25'),log('2026-09-27')],'2026-09-26');
 assert.equal(r.week[0],'2026-09-21');assert.equal(r.week[6],'2026-09-27');
 assert.equal(r.weekActive[0],true);assert.equal(r.weekActive[4],true);assert.equal(r.weekActive[5],false);assert.equal(r.weekActive[6],false);
 assert.equal(activityStats([],'2026-09-26').current,0);
});
