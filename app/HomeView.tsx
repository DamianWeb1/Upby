"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Edit3,
  Flame,
  Lock,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { activityStats } from "./activity-stats";
import { periodSummary, shiftMonth, validDateKey } from "./insight-periods";
import { logDateLabel } from "./log-date";
import { type LogFilters, emptyFilters, filterLogs, logTotals } from "./log-filters";
import MonthlyGoal from "./MonthlyGoal";
import { SignedScreenshot } from "./ui";
import {
  type Log,
  PAYMENT_METHODS,
  localToday,
  logGroupLabel,
  money,
  signedMoney,
  supabase,
} from "./upby-core";

export function HomeView({
  net,
  wins,
  losses,
  logs,
  setSheet,
  setShare,
  setEditing,
  removeLog,
  repeatEntry,
  freshStart,
  profile,
  authUserId,
  calendarDay,
}: any) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [viewAll, setViewAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const filteredLogs = useMemo(() => filterLogs(logs as Log[], filters), [logs, filters]);
  const totals = useMemo(() => logTotals(filteredLogs), [filteredLogs]);
  const categories = useMemo(() => Array.from(new Set((logs as Log[]).map(log => log.category))).sort(), [logs]);
  const hasFilters = Object.values(filters).some(Boolean);
  const browsing = viewAll || hasFilters;
  const shownLogs = filteredLogs.slice(0, browsing ? visibleCount : 2);
  const invalidRange = !!(filters.from && filters.to && filters.from > filters.to);
  const updateFilter = (key: keyof LogFilters, value: string) => {
    setFilters(current => ({ ...current, [key]: value }));
    setVisibleCount(20);
    setExpanded(null);
  };
  const resetFilters = () => { setFilters(emptyFilters); setVisibleCount(20); };
  const formatTotal = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const [streakDay, setStreakDay] = useState<number | null>(null);
  const firstEntry = freshStart && logs.length === 1 ? logs[0] as Log | undefined : undefined;
  const isEmpty = freshStart && logs.length === 0;
  const activity = activityStats(logs, localToday());
  const streak = activity.current;
  const currentPeriod = calendarDay.slice(0, 7);
  const currentMonthEntries = useMemo(
    () => (logs as Log[]).filter(log => validDateKey(log.dateKey) && log.dateKey!.startsWith(currentPeriod)),
    [logs, currentPeriod],
  );
  const monthWinCount = currentMonthEntries.filter(log => log.type === "win").length;
  const winRate = currentMonthEntries.length ? Math.round((monthWinCount / currentMonthEntries.length) * 100) : 0;
  const previousPeriod = shiftMonth(currentPeriod, -1);
  const previousSummary = useMemo(() => periodSummary(logs as Log[], previousPeriod), [logs, previousPeriod]);
  const previousLabel = new Date(`${previousPeriod}-01T12:00:00`).toLocaleDateString("en-US", { month: "long" });
  const monthDifference = net - previousSummary.net;
  const hasPreviousMonth = previousSummary.entries.length > 0;
  const milestones = [7, 14, 30, 60, 100];
  const reachedMilestone = [...milestones].reverse().find(milestone => milestone <= streak) || null;
  const nextMilestone = milestones.find(milestone => milestone > streak) || null;
  const milestoneStart = reachedMilestone || 0;
  const milestoneProgress = nextMilestone ? Math.max(0, Math.min(100, ((streak - milestoneStart) / (nextMilestone - milestoneStart)) * 100)) : 100;
  const shownLogGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; items: Log[] }>();
    for (const log of shownLogs) {
      const key = validDateKey(log.dateKey) ? log.dateKey : "undated";
      const group = groups.get(key);
      if (group) group.items.push(log);
      else groups.set(key, { key, label: logGroupLabel(log, calendarDay), items: [log] });
    }
    return Array.from(groups.values()).sort((a, b) => a.key === "undated" ? 1 : b.key === "undated" ? -1 : b.key.localeCompare(a.key));
  }, [shownLogs, calendarDay]);

  if (isEmpty) {
    return (
      <div className="page first-home">
        <section className="first-hero">
          <div className="first-greeting">
            <p>Good afternoon,</p>
            <h1>{profile.displayName}.</h1>
          </div>
          <div className="first-total">
            <span>YOU’RE UP BY</span>
            <motion.strong initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>$0</motion.strong>
            <b>THIS MONTH</b>
          </div>
          <div className="first-split"><span><i className="win" />$0 wins</span><span><i className="loss" />$0 losses</span></div>
          <div className="hero-actions first-actions">
            <button className="win" onClick={() => setSheet("win")}><TrendingUp />LOG FIRST WIN</button>
            <button className="loss" onClick={() => setSheet("loss")}><TrendingDown />LOG FIRST LOSS</button>
          </div>
        </section>
        <MonthlyGoal key={authUserId || "demo"} client={supabase} userId={authUserId} logs={logs} />
        <section className="first-next">
          <div className="first-next-copy">
            <span>YOUR FIRST ENTRY</span>
            <h2>One log starts everything.</h2>
            <p>Your total, daily net, streak and recent activity will update together.</p>
            <div className="first-flow">
              <div><i><Plus /></i><span><b>Log progress</b><small>Add a win or loss</small></span></div>
              <div><i><Zap /></i><span><b>See it update</b><small>Your month changes instantly</small></span></div>
              <div><i><Flame /></i><span><b>Build a streak</b><small>Any daily log keeps it moving</small></span></div>
            </div>
          </div>
          <div className="first-badge">
            <span>FIRST BADGE</span>
            <motion.i animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 3, repeat: Infinity }}><Trophy /></motion.i>
            <h3>FIRST WIN</h3>
            <p>Log your first win to collect it.</p>
            <b><Lock /> LOCKED</b>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="page">
      <section className="hero">
        <div className="hello">
          <p>Good afternoon,</p>
          <h1>{profile.displayName}.</h1>
        </div>
        <div className="hero-number">
          <span>YOU’RE UP BY</span>
          <motion.strong
            key={net}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {signedMoney(net)}
          </motion.strong>
          <em>THIS MONTH</em>
          <motion.small
            className="month-comparison"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {hasPreviousMonth
              ? <><TrendingUp /> {monthDifference === 0 ? `Same as ${previousLabel}` : `${money(Math.abs(monthDifference))} ${monthDifference > 0 ? "ahead of" : "behind"} ${previousLabel}`}</>
              : <><CalendarDays /> Today’s net · {signedMoney(activity.todayNet)}</>}
          </motion.small>
        </div>
        <motion.div className="hero-rate" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }}>
          <div>
            <svg viewBox="0 0 100 100" role="img" aria-label={`${winRate}% win rate this month`}>
              <circle className="hero-rate-track" cx="50" cy="50" r="42" pathLength="100" />
              <motion.circle
                className="hero-rate-value"
                cx="50"
                cy="50"
                r="42"
                pathLength="100"
                initial={{ strokeDasharray: "0 100" }}
                animate={{ strokeDasharray: `${winRate} 100` }}
                transition={{ duration: .8, ease: "easeOut" }}
              />
            </svg>
            <strong>{winRate}%</strong>
          </div>
          <span>WIN RATE</span>
          <small>{monthWinCount} of {currentMonthEntries.length} entries</small>
        </motion.div>
        <div className="split">
          <span>
            <i className="win" />
            {money(wins)} wins
          </span>
          <span>
            <i className="loss" />
            {money(losses)} losses
          </span>
        </div>
        <div className="hero-actions">
          <button className="win" onClick={() => setSheet("win")}>
            <Plus />
            LOG WIN
          </button>
          <button className="loss" onClick={() => setSheet("loss")}>
            <Plus />
            LOG LOSS
          </button>
        </div>
      </section>
      <MonthlyGoal key={authUserId || "demo"} client={supabase} userId={authUserId} logs={logs} />
      {freshStart && firstEntry && (
        <motion.section className={`first-unlocked ${firstEntry.type}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <i>{firstEntry.type === "win" ? <Trophy /> : <ShieldCheck />}</i>
          <div><span>FIRST ENTRY LOGGED</span><h2>{firstEntry.type === "win" ? "First win collected." : "First loss recorded."}</h2><p>Your Home is live. Today’s net is {signedMoney(activity.todayNet)}.</p></div>
          <div className="first-unlocked-stat"><b>{streak}</b><span>DAY STREAK</span></div>
        </motion.section>
      )}
      <div className="home-overview">
        {!browsing && <section className="streak block">
          <label>
            <Flame />
            CURRENT STREAK
          </label>
          <div>
            <strong>{streak}</strong>
            <b>
              DAYS
              <br />
              IN A ROW
            </b>
          </div>
          {reachedMilestone && <div className="streak-milestone"><Trophy /> {reachedMilestone}-DAY MILESTONE REACHED</div>}
          <div className="streak-goal">
            <span><i style={{ width: `${milestoneProgress}%` }} /></span>
            <small>{nextMilestone ? `${nextMilestone - streak} day${nextMilestone - streak === 1 ? "" : "s"} to your ${nextMilestone}-day milestone` : "Top streak milestone reached"}</small>
          </div>
          <aside>
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
              <button
                className={streakDay === i ? "selected-day" : ""}
                onClick={() => setStreakDay(streakDay === i ? null : i)}
                key={i}
              >
                <i className={activity.weekActive[i] ? "done" : ""}>{activity.weekActive[i] && <Check />}</i>
                {x}
              </button>
            ))}
          </aside>
          <AnimatePresence mode="wait">
            <motion.p
              key={streakDay ?? "default"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {streakDay === null
                ? "Your streak counts consecutive days with a win or loss."
                : `${activity.week[streakDay]} · ${activity.weekActive[streakDay] ? "progress logged" : "No log on this day."}`}
            </motion.p>
          </AnimatePresence>
        </section>}
      <section className={browsing ? "recent browsing" : "recent"}>
        <div className="title">
          <div><span>YOUR ACTIVITY</span><h2>{browsing ? "Your logs" : "Recent logs"}</h2></div>
          <button onClick={() => { setViewAll(!browsing); resetFilters(); setExpanded(null); }}>
            {browsing ? "Show less" : "Show all"}<ArrowUpRight />
          </button>
        </div>
        {browsing && <section className="log-browser" aria-label="Search and filter logs">
          <label className="log-search"><Search size={18} /><input type="search" aria-label="Search log titles, notes and payees" placeholder="Search titles, notes or payees" value={filters.query} onChange={e => updateFilter("query", e.target.value)} /></label>
          <details>
            <summary>Filters{hasFilters ? " · Active" : ""}</summary>
            <div className="log-filter-fields">
              <label>Category<select value={filters.category} onChange={e => updateFilter("category", e.target.value)}><option value="">All categories</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
              <label>Entry type<select value={filters.type} onChange={e => updateFilter("type", e.target.value)}><option value="">Wins and losses</option><option value="win">Wins</option><option value="loss">Losses</option></select></label>
              <label>From<input type="date" value={filters.from} onChange={e => updateFilter("from", e.target.value)} /></label>
              <label>To<input type="date" value={filters.to} onChange={e => updateFilter("to", e.target.value)} /></label>
            </div>
          </details>
          {hasFilters && <button className="log-clear" onClick={resetFilters}>Clear filters</button>}
          {invalidRange ? <p role="alert">Choose an end date on or after the start date.</p> : browsing && <div className="log-filter-results" role="status">
            <p>{filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}{hasFilters ? " matching" : " total"}</p>
            <dl><div><dt>Wins</dt><dd>{formatTotal(totals.wins)}</dd></div><div><dt>Losses</dt><dd>{formatTotal(totals.losses)}</dd></div><div><dt>Net</dt><dd>{formatTotal(totals.net)}</dd></div></dl>
          </div>}
        </section>}
        <div>
          {!invalidRange && filteredLogs.length === 0 && <p className="log-no-results">No matching logs. Try another search or clear your filters.</p>}
          {shownLogGroups.map(group => <section className="log-date-group" key={group.key}>
            <h3>{group.label}</h3>
            {group.items.map((l: Log) => <motion.article
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={l.id}
              className={expanded === l.id ? "log-item expanded" : "log-item"}
            >
              <motion.button
                className="log-summary"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80) setShare(l);
                  if (info.offset.x < -100) removeLog(l.id);
                }}
                onClick={() => setExpanded(expanded === l.id ? null : l.id)}
              >
                <strong className={l.type}>
                  {l.type === "win" ? "+" : "-"}
                  {money(l.amount)}
                </strong>
                <span>
                  <b>{l.category}</b>
                  <small>{l.title}</small>
                  {l.note && <em>{l.note}</em>}
                </span>
                <time dateTime={l.dateKey}>{logDateLabel(l.dateKey, l.date, calendarDay)}</time>
                <motion.i animate={{ rotate: expanded === l.id ? 90 : 0 }}>
                  <ChevronRight />
                </motion.i>
              </motion.button>
              <AnimatePresence>
                {expanded === l.id && (
                  <motion.div
                    className="log-detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <p>{l.note || "No note added for this log."}</p>
                    <div>
                      {l.screenshot && <span><Camera /> Screenshot attached</span>}
                      {l.type === "loss" && l.merchant && <span><CircleDollarSign /> Paid to {l.merchant}</span>}
                      {l.type === "loss" && l.paymentMethod && <span><CreditCard /> {PAYMENT_METHODS[l.paymentMethod] || l.paymentMethod}</span>}
                      <span><CalendarDays /> {l.dateKey ? new Date(`${l.dateKey}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : l.date || "Date unavailable"}</span>
                    </div>
                    {l.screenshotPath && <SignedScreenshot path={l.screenshotPath} alt={`${l.title} screenshot`} className="log-screenshot-image" />}
                    <footer>
                      <button onClick={() => setShare(l)}><Share2 /> Share</button>
                      <button onClick={() => setEditing(l)}><Edit3 /> Edit</button>
                      <button onClick={() => repeatEntry(l)}><Plus /> Repeat</button>
                      <button className="delete" onClick={() => removeLog(l.id)}><Trash2 /> Delete</button>
                    </footer>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>)}
          </section>)}
          {browsing && shownLogs.length < filteredLogs.length && <footer className="log-pagination"><button onClick={() => setVisibleCount(count => count + 20)}>Show more ({filteredLogs.length - shownLogs.length} remaining)</button></footer>}
        </div>
      </section>
      </div>
    </div>
  );
}
