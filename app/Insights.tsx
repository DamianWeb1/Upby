"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Lock,
  Medal,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { activityStats } from "./activity-stats";
import {
  currentMonth,
  insightMoney,
  insightSignedMoney,
  periodLabel,
  periodSummary,
  shiftMonth,
  validDateKey,
} from "./insight-periods";
import RecapStory from "./RecapStory";
import { Title } from "./ui";
import { type Log, localToday, signedMoney } from "./upby-core";
import WeeklySummary from "./WeeklySummary";

export const badges = [
  "FIRST WIN",
  "FIRST LOSS",
  "10 WINS",
  "50 WINS",
  "100 WINS",
  "7 DAY STREAK",
  "30 DAY STREAK",
  "$1K MONTH",
  "$5K MONTH",
  "$10K MONTH",
  "TOP 100",
  "TOP 10",
  "#1",
  "COMEBACK",
];

export function earnedFrom(logs: Log[], net: number) {
  const winCount = logs.filter((log) => log.type === "win").length;
  const lossCount = logs.filter((log) => log.type === "loss").length;
  const streak = activityStats(logs, localToday()).longest;
  return badges.filter((badge) =>
    badge === "FIRST WIN" ? winCount >= 1 :
    badge === "FIRST LOSS" ? lossCount >= 1 :
    badge === "10 WINS" ? winCount >= 10 :
    badge === "50 WINS" ? winCount >= 50 :
    badge === "100 WINS" ? winCount >= 100 :
    badge === "7 DAY STREAK" ? streak >= 7 :
    badge === "30 DAY STREAK" ? streak >= 30 :
    badge === "$1K MONTH" ? net >= 1000 :
    badge === "$5K MONTH" ? net >= 5000 :
    badge === "$10K MONTH" ? net >= 10000 : false
  );
}

export function Insights({ net, logs, freshStart, profile, authUserId }: any) {
  const [month, setMonth] = useState(() => currentMonth());
  const [pop, setPop] = useState<string | null>(null);
  const [recapPeriod, setRecapPeriod] = useState(() => currentMonth());
  const [periodOpen, setPeriodOpen] = useState(false);
  const [recapYear, setRecapYear] = useState(() => currentMonth().slice(0, 4));
  const summary = useMemo(() => periodSummary(logs as Log[], month), [logs, month]);
  const { wins: activeWins, losses: activeLosses, net: activeNet, winCount, lossCount, dayValues } = summary;
  const monthLabel = periodLabel(month);
  const monthShort = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {month:"short"}).toUpperCase();
  const chartMax = Math.max(1, ...dayValues.map(Math.abs));
  const money = insightMoney, signedMoney = insightSignedMoney;
  const categoryItems = summary.categories.slice(0, 5).map((item, index) => [item.name, signedMoney(item.net), ["big", "mid", "coral", "small", ""][index]]);
  const bestCategory = categoryItems.length ? String(categoryItems[0][0]) : "No logs yet";
  const biggestWin = summary.entries
    .filter(entry => entry.type === "win")
    .reduce<Log | null>((largest, entry) => !largest || entry.amount > largest.amount ? entry : largest, null);
  const biggestWinValue = biggestWin
    ? `${money(biggestWin.amount)} · ${new Date(`${biggestWin.dateKey!}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : "No wins yet";
  const earned = earnedFrom(logs, net);
  const years = Array.from(new Set([currentMonth().slice(0,4), recapYear, ...(logs as Log[]).filter(log => validDateKey(log.dateKey)).map(log => log.dateKey!.slice(0,4))])).sort().reverse();
  const recapOptions = Array.from({length:12}, (_, index) => `${recapYear}-${String(index+1).padStart(2,"0")}`);
  const recapFor = (period: string) => periodSummary(logs as Log[], period);
  const yearSummary = recapFor(recapYear);
  const undatedCount = (logs as Log[]).filter(log => !validDateKey(log.dateKey)).length;
  return (
    <div className="page insights">
      <WeeklySummary logs={logs} username={profile.username} avatarUrl={profile.avatarUrl} />
      <label className="insight-month-picker">Choose month<input type="month" value={month} max={currentMonth()} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value) && e.target.value <= currentMonth()) setMonth(e.target.value); }} /></label>
      {undatedCount > 0 && <p className="insight-date-note">{undatedCount} undated {undatedCount === 1 ? "entry is" : "entries are"} excluded. Edit the entry date to include it in Insights.</p>}
      <section className="insight-hero">
        <div>
          <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft />
          </button>
          <span>YOUR {monthLabel.toUpperCase()}</span>
          <button aria-label="Next month" disabled={month >= currentMonth()} onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight />
          </button>
        </div>
        <motion.strong
          key={month}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {signedMoney(activeNet)}
        </motion.strong>
        <small>NET PROGRESS</small>
        <div className="daily-bars" aria-label={`Daily progress for ${monthLabel}`}>
          {dayValues.map((value, index) => (
            <i
              key={index}
              className={
                value > 0 ? "positive" : value < 0 ? "negative" : "empty"
              }
              title={`${month}-${String(index + 1).padStart(2, "0")}: ${signedMoney(value)}`}
              style={{ height: value === 0 ? "4%" : Math.max(8, Math.abs(value) / chartMax * 100) + "%" }}
            />
          ))}
        </div>
        <footer className="daily-axis">
          <span>{monthShort} 1</span>
          <b>DAILY NET</b>
          <span>{monthShort} {dayValues.length}</span>
        </footer>
      </section>
      <section className="stats">
        {[
          ["UP BY", signedMoney(activeNet)],
          ["TOTAL WINS", money(activeWins)],
          ["TOTAL LOSSES", money(activeLosses)],
          ["NUMBER OF WINS", String(winCount)],
          ["NUMBER OF LOSSES", String(lossCount)],
          ["LONGEST STREAK", `${summary.longestStreak} day${summary.longestStreak === 1 ? "" : "s"}`],
          ["BIGGEST WIN", biggestWinValue],
          ["BEST CATEGORY", bestCategory],
        ].map((x, i) => (
          <div className={i === 0 ? "major" : ""} key={x[0]}>
            <span>{x[0]}</span>
            <b>{x[1]}</b>
          </div>
        ))}
      </section>
      <section className="heat">
        <Title over="DAILY RHYTHM" title="Your month" />
        <div className="heat-days">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={day + index}>{day}</span>
          ))}
        </div>
        <div className="heat-grid">
          {Array.from({length:summary.weekdayOffset}, (_, i) => <div key={`blank-${i}`} className="calendar-blank" aria-hidden="true" />)}
          {dayValues.map((value, i) => {
            return (
              <div
                className={value > 0 ? "positive" : value < 0 ? "negative" : "empty"}
                key={i}
              >
                <span>{i + 1}</span>
                <b>{!summary.dayActive[i] ? "No activity" : signedMoney(value)}</b>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mix">
        <Title over="WHERE IT CAME FROM" title="Category mix" />
        <div>
          {categoryItems.length ? categoryItems.map((x) => (
            <motion.button
              whileHover={{ scale: 1.04 }}
              className={x[2]}
              key={x[0]}
            >
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </motion.button>
          )) : <div className="insight-empty"><CircleDollarSign /><b>No categories yet</b><span>Your first log will appear here.</span></div>}
        </div>
      </section>
      <section className="achievements">
        <Title over="YOUR TROPHY CASE" title="Achievements" />
        <div>
          {badges.map((b, i) => (
            <button
              className={earned.includes(b) ? "earned" : "locked"}
              onClick={() => setPop(b)}
              key={b}
            >
              <i className={`b${i % 5}`}>{earned.includes(b) ? <Medal /> : <Lock />}</i>
              <b>{b}</b>
              <span>{earned.includes(b) ? "EARNED" : freshStart && b.includes("WINS") ? `${winCount} logged` : freshStart && b.includes("MONTH") ? `${signedMoney(net)} so far` : "LOCKED"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="recap">
        <div>
          <span>MONTH OR YEAR</span>
          <h2>Create your recap</h2>
          <p>Review any month or year, then share your totals.</p>
          <div className="year-total">
            <span>{recapYear} TOTAL</span>
            <strong>{signedMoney(yearSummary.net)}</strong>
          </div>
        </div>
        <div className="recap-controls">
          <div className="period-picker">
            <span>PERIOD</span>
            <button className="period-trigger" onClick={() => setPeriodOpen(!periodOpen)}>
              <CalendarDays />
              <b>{periodLabel(recapPeriod)}</b>
              <ChevronDown />
            </button>
            <AnimatePresence>
              {periodOpen && (
                <motion.div
                  className="period-menu"
                  initial={{ opacity: 0, y: 8, scale: .97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: .97 }}
                >
                  <header><span>CHOOSE A RECAP</span><button onClick={() => setPeriodOpen(false)}><X /></button></header>
                  <label className="recap-year-picker">Year<select value={recapYear} onChange={e => { setRecapYear(e.target.value); setRecapPeriod(e.target.value); }}>{years.map(year => <option key={year}>{year}</option>)}</select></label>
                  <div className="month-options">
                    {recapOptions.map((period) => (
                      <button
                        className={recapPeriod === period ? "active" : ""}
                        key={period}
                        onClick={() => { setRecapPeriod(period); setPeriodOpen(false); }}
                      >
                        <span>{periodLabel(period).slice(0, 3).toUpperCase()}</span>
                        <small>{recapFor(period).entries.length ? signedMoney(recapFor(period).wins - recapFor(period).losses) : "No logs"}</small>
                      </button>
                    ))}
                  </div>
                  <button
                    className={recapPeriod === recapYear ? "year-option active" : "year-option"}
                    onClick={() => { setRecapPeriod(recapYear); setPeriodOpen(false); }}
                  >
                    <span><Sparkles /> {recapYear} YEAR RECAP</span>
                    <b>{signedMoney(yearSummary.net)}</b>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setPop("recap")}>
            <Sparkles />
            CREATE RECAP
          </button>
        </div>
      </section>
      <AnimatePresence>
        {pop && <Badge pop={pop} net={net} recapPeriod={recapPeriod} recapOverride={recapFor(recapPeriod)} profile={profile} userId={authUserId} close={() => setPop(null)} />}
      </AnimatePresence>
    </div>
  );
}

export function Badge({ pop, net, recapPeriod, recapOverride, close, profile, userId }: any) {
  return (
    <motion.div
      className="backdrop center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className={pop === "recap" ? "pop recap-pop rs-pop" : "pop"}
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {pop === "recap" ? (
          <RecapStory period={recapPeriod} recapOverride={recapOverride} profile={profile} userId={userId} />
        ) : (
          <>
            <i className="giant">
              <Trophy />
            </i>
            <span>ACHIEVEMENT</span>
            <h2>{pop}</h2>
            <p>
              {pop.includes("STREAK")
                ? "Log progress consistently for the required number of days."
                : pop.includes("MONTH")
                  ? "Finish a calendar month above this amount."
                  : "Keep logging your progress to earn this badge."}
            </p>
            <div className="badge-progress">
              <span><i style={{ width: pop.includes("10K") ? `${Math.min(100, Math.max(4, net / 100))}%` : pop.includes("5K") ? `${Math.min(100, Math.max(4, net / 50))}%` : pop.includes("1K") ? `${Math.min(100, Math.max(4, net / 10))}%` : pop.includes("TOP") ? "62%" : "78%" }} /></span>
              <small>{pop.includes("MONTH") ? `${signedMoney(net)} progress` : pop.includes("TOP") ? "Keep moving up the leaderboard" : "Progress saved"}</small>
            </div>
          </>
        )}
        <button className="close" onClick={close}>
          <X />
        </button>
      </motion.div>
    </motion.div>
  );
}

