const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");

const load = (file) => ts.transpile(fs.readFileSync(file, "utf8"), { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 });
const periods = { exports: {} };
vm.createContext(periods);
vm.runInContext(load("app/insight-periods.ts"), periods);
const context = { exports: {}, require: (name) => (name === "./insight-periods" ? periods.exports : require(name)) };
vm.createContext(context);
vm.runInContext(load("app/recap-story-data.ts"), context);
const { buildRecap, personality } = context.exports;
const summarize = (logs, period) => periods.exports.periodSummary(logs, period);

const log = (dateKey, type, amount, category, title = "") => ({ dateKey, type, amount, category, title });
const october = [
  log("2026-10-13", "win", 50, "Content"),
  log("2026-10-14", "win", 40, "Content"),
  log("2026-10-15", "win", 120, "Bounties"),
  log("2026-10-16", "loss", 30, "Trading"),
  log("2026-10-16", "win", 60, "Web3 Jobs"),
  log("2026-10-18", "win", 600, "Bounties", "Bounty payout"),
  log("2026-10-22", "loss", 100, "Trading"),
];

test("builds the full slide flow for an active month", () => {
  const recap = buildRecap(summarize(october, "2026-10"), "2026-10");
  assert.deepEqual([...recap.slides], ["intro", "days", "wins", "biggest", "top", "streak", "losses", "type", "upby", "share"]);
  assert.equal(recap.name, "October");
  assert.equal(recap.totalLogs, 7);
  assert.equal(recap.net, 740);
});

test("finds the biggest single win with its title and share of wins", () => {
  const { biggestWin } = buildRecap(summarize(october, "2026-10"), "2026-10");
  assert.equal(biggestWin.title, "Bounty payout");
  assert.equal(biggestWin.amount, 600);
  assert.equal(biggestWin.date, "Sunday, October 18");
  assert.equal(biggestWin.share, 69);
});

test("reports the longest streak with its real dates", () => {
  const { streak } = buildRecap(summarize(october, "2026-10"), "2026-10");
  assert.equal(streak.length, 4);
  assert.equal(streak.from, "October 13");
  assert.equal(streak.to, "October 16");
  assert.equal(streak.bars.length, 4);
  assert.equal(streak.endsOnBestDay, false);
});

test("lays the calendar out Monday-first and marks $100+ days", () => {
  const recap = buildRecap(summarize(october, "2026-10"), "2026-10");
  assert.equal(recap.offset, 3); // Oct 1 2026 is a Thursday
  assert.equal(recap.calendar.length, 31);
  assert.equal(recap.calendar[17].level, 2); // Oct 18, $600
  assert.equal(recap.calendar[12].level, 1); // Oct 13, $50
  assert.equal(recap.calendar[0].level, 0);
});

test("describes where losses came from", () => {
  assert.equal(buildRecap(summarize(october, "2026-10"), "2026-10").lossSource, "all of them from trading");
});

test("skips slides that have nothing to show", () => {
  const onlyWins = [log("2026-10-02", "win", 20, "Content")];
  const recap = buildRecap(summarize(onlyWins, "2026-10"), "2026-10");
  assert.deepEqual([...recap.slides], ["intro", "days", "wins", "biggest", "type", "upby", "share"]);
});

test("an empty month gets an empty slide instead of zeros", () => {
  assert.deepEqual([...buildRecap(summarize([], "2026-10"), "2026-10").slides], ["intro", "empty"]);
});

test("a year recap groups wins by month", () => {
  const recap = buildRecap(summarize(october, "2026"), "2026");
  assert.equal(recap.isYear, true);
  assert.equal(recap.winsByBucket.length, 12);
  assert.equal(recap.winsByBucket[9].value, 870);
  assert.equal(recap.winsByBucket[9].peak, true);
  assert.equal(recap.monthsActive[9].days, 6);
});

test("picks a personality from the top category", () => {
  assert.equal(personality("Bounties").name, "The Bounty Hunter");
  assert.equal(personality("Content").name, "The Creator");
  assert.equal(personality("Web3 Jobs").name, "The Operator");
  assert.equal(personality("Pottery").name, "The Grinder");
  assert.equal(personality(null).name, "The Grinder");
});

test("a single loss is described on its own", () => {
  const recap = buildRecap(summarize([log("2026-11-03", "loss", 350, "Trading"), log("2026-11-04", "win", 120, "Content")], "2026-11"), "2026-11");
  assert.equal(recap.lossSource, "from trading");
});
