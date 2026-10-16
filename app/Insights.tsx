"use client";
import { AnimatePresence, MotionConfig, m as motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Award,
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Crown,
  Flame,
  Lock,
  Medal,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { activityStats } from "./activity-stats";
import {
  type PeriodSummary,
  currentMonth,
  insightMoney,
  insightSignedMoney,
  periodLabel,
  periodSummary,
  shiftMonth,
  validDateKey,
} from "./insight-periods";
import RecapValue from "./RecapValue";
import { Logo, Title } from "./ui";
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

export function Insights({ net, logs, freshStart, profile }: any) {
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
        {pop && <Badge pop={pop} net={net} recapPeriod={recapPeriod} recapOverride={recapFor(recapPeriod)} close={() => setPop(null)} />}
      </AnimatePresence>
    </div>
  );
}

export function Badge({ pop, net, recapPeriod, recapOverride, close }: any) {
  return (
    <motion.div
      className="backdrop center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className={pop === "recap" ? "pop recap-pop" : "pop"}
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {pop === "recap" ? (
          <RecapStory period={recapPeriod} recapOverride={recapOverride} />
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

export function RecapStory({ period, recapOverride }: { period: string; recapOverride: PeriodSummary }) {
  const [slide, setSlide] = useState(0);
  const reduced = useReducedMotion();
  const [direction, setDirection] = useState(1);
  const recap = recapOverride;
  const money = insightMoney;
  const label = periodLabel(period);
  const [shareStatus, setShareStatus] = useState("");
  const shareRecap = async () => {
    const text = `My ${label} on UPBY: ${insightSignedMoney(recap.net)} net. ${money(recap.wins)} wins, ${money(recap.losses)} losses. ${recap.winCount + recap.lossCount} entries.`;
    try {
      if (navigator.share) await navigator.share({title: "My UPBY recap", text});
      else { await navigator.clipboard.writeText(text); setShareStatus("Recap copied. Paste it into your post."); }
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setShareStatus("Sharing failed. Please try again."); }
  };
  const net = recap.wins - recap.losses;
  const isYear = period.length === 4;
  const next = () => { setDirection(1); setSlide((value) => Math.min(5, value + 1)); };
  const previous = () => { setDirection(-1); setSlide((value) => Math.max(0, value - 1)); };
  return (
    <MotionConfig reducedMotion="user"><div className="recap-story" onKeyDown={e => {if(e.key === "ArrowRight") next(); if(e.key === "ArrowLeft") previous();}}>
      <div className="story-progress">
        {[0, 1, 2, 3, 4, 5].map((item) => <button aria-label={`Recap page ${item + 1} of 6`} aria-current={item === slide ? "step" : undefined} className={item <= slide ? "active" : ""} key={item} onClick={() => {setDirection(item > slide ? 1 : -1);setSlide(item);}} />)}
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          className={"story-slide story-" + slide}
          key={slide}
          initial={reduced ? false : { opacity: 0, x: direction * 50, scale: .96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={reduced ? {opacity:0} : { opacity: 0, x: direction * -40, scale: .98 }}
          transition={{duration: reduced ? 0 : .32}}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={.12}
          onDragEnd={(_, info) => info.offset.x < -55 ? next() : info.offset.x > 55 ? previous() : null}
        >
          <Logo />
          {slide === 0 && <>
            <div className="story-icon-stage result-icons">
              <motion.i animate={{ rotate: [0, 8, 0], y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: reduced ? 0 : Infinity }}><ArrowUpRight /></motion.i>
              <Sparkles className="orbit-icon one" />
              <Star className="orbit-icon two" />
              <Zap className="orbit-icon three" />
            </div>
            <span>{isYear ? "YOUR YEAR ON UPBY" : "YOUR " + label.toUpperCase()}</span>
            <h2><RecapValue value={net} signed /></h2>
            <b>{isYear ? "UP BY THIS YEAR" : "UP BY THIS MONTH"}</b>
            <p>{isYear ? "Your dated entries, added up for the year." : "Every log added up to this."}</p>
          </>}
          {slide === 1 && <>
            <div className="story-icon-stage win-icons">
              <motion.i animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: reduced ? 0 : Infinity }}><CircleDollarSign /></motion.i>
              <ArrowUpRight className="orbit-icon one" />
              <Sparkles className="orbit-icon two" />
              <Award className="orbit-icon three" />
            </div>
            <span>THE WINS</span>
            <h2><RecapValue value={recap.wins} /></h2>
            <b>YOU KEPT SHOWING UP</b>
            <div className="story-stat"><strong>{recap.winCount}</strong><small>WINS LOGGED</small></div>
            <p>{recap.bestDay !== null ? `Best daily net: ${insightSignedMoney(recap.bestDay)}` : "No entries logged in this period."}</p>
          </>}
          {slide === 2 && <>
            <div className="story-icon-stage loss-icons">
              <motion.i animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2.6, repeat: reduced ? 0 : Infinity }}><ShieldCheck /></motion.i>
              <TrendingDown className="orbit-icon one" />
              <Target className="orbit-icon two" />
              <ArrowUpRight className="orbit-icon three" />
            </div>
            <span>THE FULL PICTURE</span>
            <h2><RecapValue value={recap.losses} /></h2>
            <b>LOSSES LOGGED</b>
            <p>Progress was never hidden. You recorded the hard days and kept moving.</p>
            <div className="story-balance"><span>WINS</span><motion.i initial={{scaleX:reduced ? 1 : 0}} animate={{scaleX:1}} transition={{duration:reduced ? 0 : .9}} style={{ width: Math.round((recap.wins / Math.max(1, recap.wins + recap.losses)) * 100) + "%" }} /><span>LOSSES</span></div>
          </>}
          {slide === 3 && <>
            <div className="story-icon-stage streak-icons">
              <motion.i animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }} transition={{ duration: 1.7, repeat: reduced ? 0 : Infinity }}><Flame /></motion.i>
              <Crown className="orbit-icon one" />
              <Trophy className="orbit-icon two" />
              <Star className="orbit-icon three" />
            </div>
            <span>CONSISTENCY</span>
            <h2><RecapValue value={recap.longestStreak} currency={false} /></h2>
            <b>DAY LONGEST STREAK</b>
            <div className="story-rank"><Trophy /><span>DAYS LOGGED</span><strong>{recap.activeDays}</strong></div>
          </>}
          {slide === 4 && <>
            <div className="story-icon-stage category-icons"><motion.i initial={reduced ? false : {scale:.3,rotate:-25}} animate={{scale:1,rotate:0}} transition={{type:"spring",stiffness:180,damping:14}}><BarChart3 /></motion.i></div>
            <span>WHERE YOUR PROGRESS CAME FROM</span>
            <h3 className="story-category-title">Your category highlights</h3>
            <div className="story-category-list">
              {recap.categories.slice(0,3).map((category,index)=><motion.div key={category.name} initial={reduced ? false : {opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:reduced ? 0 : index*.16}}>
                <header><b>{category.name}</b><strong>{insightSignedMoney(category.net)}</strong></header>
                <div><motion.i initial={{scaleX:reduced ? 1 : 0}} animate={{scaleX:1}} transition={{duration:reduced ? 0 : .8,delay:reduced ? 0 : index*.16}} style={{width:`${Math.max(4,Math.abs(category.net)/Math.max(1,...recap.categories.map(c=>Math.abs(c.net)))*100)}%`}} /></div>
              </motion.div>)}
              {!recap.categories.length && <p>No categories logged in this period.</p>}
            </div>
            <p>Net progress in each category, after losses.</p>
          </>}
          {slide === 5 && <>
            <div className="story-icon-stage final-icons">
              <motion.i animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: reduced ? 0 : Infinity, ease: "linear" }}><Crown /></motion.i>
              <Medal className="orbit-icon one" />
              <Share2 className="orbit-icon two" />
              <Sparkles className="orbit-icon three" />
            </div>
            <span>{"MY " + label.toUpperCase()}</span>
            <div className="final-split"><b>{money(recap.wins)}<small>WINS</small></b><b>{money(recap.losses)}<small>LOSSES</small></b></div>
            <h2><RecapValue value={net} signed /></h2>
            <b>UP BY</b>
            <footer>{recap.winCount} WINS · {recap.lossCount} LOSSES<br />{recap.longestStreak} DAY LONGEST STREAK</footer>
          </>}
        </motion.section>
      </AnimatePresence>
      <div className="story-controls">
        <button onClick={previous} disabled={slide === 0}><ChevronLeft /> BACK</button>
        {slide < 5 ? <button onClick={next}>NEXT <ChevronRight /></button> : <button className="story-share" onClick={() => void shareRecap()}><Share2 /> SHARE RECAP</button>}
      </div>
      <small className="swipe-hint" role="status">{shareStatus || "SWIPE OR USE THE BUTTONS"}</small>
    </div></MotionConfig>
  );
}
