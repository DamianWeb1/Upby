const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/page.tsx', 'utf8');
function harness(fail = false) {
  let rows = [], undo, status, writes = [], release;
  const gate = new Promise(resolve => release = resolve);
  let blocked = false;
  const context = {
    writing: {current:false}, revision: {current:0}, draftId: {current:null},
    authUser: {id:'owner'}, logs: [],
    showSuccess() {}, setBusy() {}, setSaveStatus(v) {status=v}, setSheet() {}, setEditing() {}, setRepeatLog() {},
    setUndoLog(v) {undo=v}, setLogs(fn) {rows=fn(rows); context.logs=rows},
    logToRow: (l, owner) => ({...l, owner}), trackProductEvent: async()=>{}, errorMetadata:()=>({}),
    supabase: { from() { return {
      upsert(row) { writes.push(row); return (async()=>{if(blocked) await gate; return {error: fail ? new Error('Offline') : null}})() },
      delete() {return {eq() {return this}, then(resolve) {return Promise.resolve({error:null}).then(resolve)}}}
    }}, auth:{refreshSession:async()=>({error:null})}},
  };
  vm.createContext(context);
  const helper=source.slice(source.indexOf('async function authenticatedWrite'),source.indexOf('function localToday'));
  const actions=source.slice(source.indexOf('  const persistLog ='),source.indexOf('  const signOut ='));
  vm.runInContext(ts.transpile(helper+actions+'\nglobalThis.actions = {add, removeLog, persistLog};', {target:ts.ScriptTarget.ES2022}), context);
  return {context, get rows(){return rows},get undo(){return undo},get status(){return status},writes,
    fail(v){fail=v}, block(){blocked=true},release(){blocked=false;release()},...context.actions};
}
const entry={type:'win',amount:12.50,title:'Work',category:'Freelance',date:'Today',dateKey:'2026-09-25',note:'',screenshot:false};
test('double tap creates one entry while request is pending',async()=>{
 const h=harness();h.block();const first=h.add(entry);await h.add(entry);assert.equal(h.writes.length,1);h.release();await first;assert.equal(h.rows.length,1);
});
test('failed save retains ID so retry does not create a second entry',async()=>{
 const h=harness(true);await h.add(entry);assert.equal(h.rows.length,0);assert.match(h.status,/not saved/);h.fail(false);await h.add(entry);assert.equal(h.writes[0].id,h.writes[1].id);assert.equal(h.rows.length,1);assert.equal(h.rows[0].amount,12.5);
});
test('undo restores deleted entry with its original ID',async()=>{
 const h=harness();await h.add(entry);const id=h.rows[0].id;await h.removeLog(id);assert.equal(h.rows.length,0);assert.equal(h.undo.owner,'owner');await h.persistLog(h.undo.log,'restore');assert.equal(h.rows[0].id,id);assert.equal(h.undo,null);
});
test('failed undo keeps restore available',async()=>{
 const h=harness();await h.add(entry);await h.removeLog(h.rows[0].id);h.fail(true);await h.persistLog(h.undo.log,'restore');assert.ok(h.undo);assert.equal(h.rows.length,0);
});
test('expired session refreshes once and retries the same write', async()=>{
 const helper=source.slice(source.indexOf('async function authenticatedWrite'),source.indexOf('function localToday'));
 let refreshes=0, attempts=0;
 const ctx={supabase:{auth:{refreshSession:async()=>{refreshes++;return {error:null}}}}};
 vm.createContext(ctx);vm.runInContext(ts.transpile(helper,{target:ts.ScriptTarget.ES2022}),ctx);
 await ctx.authenticatedWrite(async()=>({error:++attempts===1?{code:'PGRST303',message:'JWT expired'}:null}));
 assert.equal(refreshes,1);assert.equal(attempts,2);
});
test('permission failures do not trigger session retries', async()=>{
 const helper=source.slice(source.indexOf('async function authenticatedWrite'),source.indexOf('function localToday'));
 let refreshes=0;
 const ctx={supabase:{auth:{refreshSession:async()=>{refreshes++;return {error:null}}}}};
 vm.createContext(ctx);vm.runInContext(ts.transpile(helper,{target:ts.ScriptTarget.ES2022}),ctx);
 await assert.rejects(()=>ctx.authenticatedWrite(async()=>({error:new Error('Permission denied')})));
 assert.equal(refreshes,0);
});
