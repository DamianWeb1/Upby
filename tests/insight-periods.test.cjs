const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const ctx={exports:{}};
vm.createContext(ctx);
vm.runInContext(ts.transpile(fs.readFileSync('app/insight-periods.ts','utf8'),{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}),ctx);
const {periodSummary,shiftMonth,validDateKey,periodLabel,currentMonth}=ctx.exports;
const log=(dateKey,amount=1,type='win',category='Work')=>({dateKey,amount,type,category});
test('same month in different years never mixes',()=>{
 const logs=[log('2025-09-01',100),log('2026-09-01',.1),log('2026-09-30',.2),log('2026-10-01',200)];
 const result=periodSummary(logs,'2026-09');
 assert.equal(result.wins,.3); assert.equal(result.winCount,2); assert.equal(result.dayValues[29],.2);
});
test('year totals include only the selected year and include December 31',()=>{
 const result=periodSummary([log('2025-12-31',100),log('2026-01-01',50),log('2026-12-31',10,'loss'),log('2027-01-01',200)],'2026');
 assert.equal(result.net,40); assert.equal(result.winCount,1); assert.equal(result.lossCount,1);
});
test('calendar handles leap years, short months, 31st and weekday offsets',()=>{
 assert.equal(periodSummary([],'2024-02').dayValues.length,29);
 assert.equal(periodSummary([],'2025-02').dayValues.length,28);
 const march=periodSummary([log('2026-03-31',42)],'2026-03');
 assert.equal(march.dayValues.length,31); assert.equal(march.dayValues[30],42); assert.equal(march.weekdayOffset,6);
 assert.equal(periodSummary([],'2026-06').weekdayOffset,0);
});
test('zero net days remain active and longest streak deduplicates multiple logs',()=>{
 const result=periodSummary([log('2026-09-01',10),log('2026-09-01',10,'loss'),log('2026-09-02',5),log('2026-09-04',7)],'2026-09');
 assert.equal(result.longestStreak,2); assert.equal(result.activeDays,3); assert.equal(result.dayActive[0],true); assert.equal(result.dayValues[0],0); assert.equal(result.bestDay,7);
});
test('annual streak spans months and is clipped at selected year',()=>{
 const logs=[log('2025-12-31'),log('2026-01-01'),log('2026-01-31'),log('2026-02-01'),log('2026-02-02')];
 assert.equal(periodSummary(logs,'2026').longestStreak,3);
 assert.equal(periodSummary(logs,'2026-02').longestStreak,2);
});
test('invalid and missing dates do not get assigned to today',()=>{
 assert.equal(validDateKey('2025-02-29'),false); assert.equal(validDateKey('2024-02-29'),true);
 const result=periodSummary([log(undefined),log('2026-02-30'),log('bad')],'2026');
 assert.equal(result.entries.length,0); assert.equal(result.bestDay,null); assert.equal(result.longestStreak,0);
});
test('month navigation crosses years and labels include the year',()=>{
 assert.equal(shiftMonth('2026-01',-1),'2025-12'); assert.equal(shiftMonth('2026-12',1),'2027-01');
 assert.equal(periodLabel('2026-09'),'September 2026'); assert.equal(periodLabel('2025'),'2025 Year');
 assert.equal(currentMonth(new Date(2027,0,1)),'2027-01');
});
test('best day uses daily net and categories preserve negative amounts',()=>{
 const result=periodSummary([log('2026-09-01',10,'loss','Fees'),log('2026-09-02',30,'loss','Fees')],'2026-09');
 assert.equal(result.bestDay,-10); assert.equal(result.net,-40); assert.equal(result.categories[0].net,-40);
});
