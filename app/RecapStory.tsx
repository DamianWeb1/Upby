"use client";
import "@fontsource-variable/bricolage-grotesque";
import "./recap-story.css";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, m as motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { buildRecap, type Recap, type RecapSlideId, type RecapSummary } from "./recap-story-data";
import { trackProductEvent } from "./upby-core";
import { recordRecap } from "./recap-views";

const SITE = "getupby.vercel.app";
const FONT = "'Bricolage Grotesque Variable', 'Avenir Next', sans-serif";
const DURATION: Partial<Record<RecapSlideId, number>> = { days: 7000, top: 7500 };
const DEFAULT_DURATION = 6000;
const THEME: Record<RecapSlideId, string> = {
  intro: "rs-blue", empty: "rs-cream", days: "rs-cream", wins: "rs-purple", biggest: "rs-lime", top: "rs-ink",
  streak: "rs-orange", losses: "rs-coral", type: "rs-navy", upby: "rs-lime", share: "rs-cream",
};

export const recapMoney = (value: number) => {
  const abs = Math.abs(value);
  return "$" + abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: abs >= 1000 ? 0 : 2 });
};
export const recapSigned = (value: number) => (value > 0 ? "+" : value < 0 ? "−" : "") + recapMoney(value);
const plural = (count: number, one: string, many = one + "s") => `${count} ${count === 1 ? one : many}`;
// Shrinks giant numbers so long amounts still fit the width.
const fit = (text: string, base: number, room = 86) => `${Math.min(base, room / Math.max(1, text.length * 0.6))}cqw`;

function CountUp({ value, format, delay = 0.15 }: { value: number; format: (n: number) => string; delay?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let frame = 0, start: number | undefined;
    const tick = (now: number) => {
      start ??= now + delay * 1000;
      const progress = Math.max(0, Math.min(1, (now - start) / 1000));
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay, reduced]);
  const display = reduced ? value : shown;
  return <span aria-label={format(value)}><span aria-hidden="true">{format(Math.abs(value) >= 100 ? Math.round(display) : display)}</span></span>;
}

const rise = (delay = 0) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const } });

function Slide({ id, recap, handle, onShareX, onSave, onReplay, saving, status }: {
  id: RecapSlideId; recap: Recap; handle: string; onShareX: () => void; onSave: () => void; onReplay: () => void; saving: boolean; status: string;
}) {
  const r = recap;
  switch (id) {
    case "intro":
      return <>
        <svg className="rs-chevrons" aria-hidden="true" viewBox="0 0 200 200" fill="none" strokeLinecap="round" strokeLinejoin="round">
          {["M40 150 L100 90 L160 150", "M40 105 L100 45 L160 105", "M40 60 L100 0 L160 60"].map((d, i) => (
            <motion.path key={d} d={d} strokeWidth="22" stroke={i === 0 ? "var(--rs-lime)" : "#fff"} strokeOpacity={i === 2 ? 0.35 : 1}
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 0.15 + i * 0.18, duration: 0.6 }} />
          ))}
        </svg>
        <div className="rs-intro-copy">
          <motion.h1 {...rise(0.2)}>Your {r.name}, all added up.</motion.h1>
          <motion.p {...rise(0.35)}>Every win and loss you logged, turned into one story. Tap to start.</motion.p>
        </div>
        <motion.div className="rs-intro-word" aria-hidden="true" style={{ fontSize: r.isYear ? "40cqw" : "59cqw" }}
          initial={{ y: "40%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} transition={{ delay: 0.1, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>{r.short}</motion.div>
      </>;
    case "empty":
      return <div className="rs-fill rs-between">
        <motion.p className="rs-lead" {...rise(0.1)}>Nothing logged in {r.label} yet.</motion.p>
        <motion.p className="rs-foot" {...rise(0.3)}>Log a win or a loss and your recap fills itself in.</motion.p>
      </div>;
    case "days":
      return <div className="rs-fill rs-between">
        <div>
          <motion.p className="rs-lead" {...rise(0.05)}>You showed up on</motion.p>
          <div className="rs-days-row">
            <motion.span className="rs-giant rs-accent-blue" style={{ fontSize: fit(String(r.activeDays), 48.7, 60) }} initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.1 }}>
              <CountUp value={r.activeDays} format={(n) => String(Math.round(n))} />
            </motion.span>
            <motion.span className="rs-lead" {...rise(0.25)}>{r.activeDays === 1 ? "day" : "days"} this<br />{r.isYear ? "year." : r.name + "."}</motion.span>
          </div>
        </div>
        {r.isYear ? (
          <div className="rs-months" aria-label="Days logged each month">
            {r.monthsActive.map((m, i) => (
              <motion.div key={m.label} className={"rs-month rs-level-" + (m.days >= 10 ? 2 : m.days ? 1 : 0)} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.04 }}>
                <b>{m.label}</b><span>{m.days ? plural(m.days, "day") : "–"}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="rs-calendar">
            <div className="rs-weekdays" aria-hidden="true">{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="rs-grid" aria-label={`Calendar of ${r.label}`}>
              {Array.from({ length: r.offset }, (_, i) => <span key={"b" + i} />)}
              {r.calendar.map((day, i) => (
                <motion.span key={day.day} className={"rs-cell rs-level-" + day.level} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 + i * 0.018 }}>{day.day}</motion.span>
              ))}
            </div>
            <div className="rs-legend"><span><i className="rs-level-1" />Logged</span><span><i className="rs-level-2" />Made {recapMoney(r.strongThreshold)}+</span></div>
          </div>
        )}
        <motion.p className="rs-foot" {...rise(0.9)}>{plural(r.totalLogs, "log")} across the {r.isYear ? "year" : "month"}.{r.streak ? ` Your longest run was ${r.streak.length} days.` : ""}</motion.p>
      </div>;
    case "wins":
      return <div className="rs-fill rs-between">
        <div className="rs-stack">
          <motion.p className="rs-lead" {...rise(0.05)}>You brought in</motion.p>
          <span className="rs-big rs-accent-lime" style={{ fontSize: fit(recapMoney(r.wins), 26.7) }}><CountUp value={r.wins} format={recapMoney} /></span>
          <motion.p className="rs-lead" {...rise(0.3)}>from {plural(r.winCount, "win")}.</motion.p>
          {r.winCount > 1 && <motion.p className="rs-body" {...rise(0.5)}>That works out to about {recapMoney(r.avgWin >= 10 ? Math.round(r.avgWin) : r.avgWin)} every time you logged a win.</motion.p>}
        </div>
        <div className={"rs-bars" + (r.isYear ? " rs-bars-year" : "")} aria-label={`Wins by ${r.isYear ? "month" : "week"}`}>
          {r.winsByBucket.map((b, i) => (
            <div key={b.label + i} className="rs-bar-col">
              <span>{b.label}</span>
              <motion.i className={b.ratio === 0 ? "rs-zero" : b.peak ? "rs-peak" : b.ratio > 0.5 ? "rs-mid" : ""} style={{ height: b.ratio > 0 ? `calc(${b.ratio} * (100% - 22cqw) + 12cqw)` : undefined }}
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.5 + i * 0.08, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }} />
            </div>
          ))}
        </div>
      </div>;
    case "biggest": {
      const win = r.biggestWin!;
      return <div className="rs-fill rs-between">
        <motion.p className="rs-lead" {...rise(0.05)}>Your biggest single win</motion.p>
        <div className="rs-burst-wrap">
          <motion.svg className="rs-burst" aria-hidden="true" viewBox="0 0 200 200" initial={{ rotate: -40, scale: 0.4, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.1 }}>
            <path d="M100 4 L114 52 L156 24 L142 72 L194 74 L152 102 L194 130 L142 128 L156 176 L114 148 L100 196 L86 148 L44 176 L58 128 L6 130 L48 102 L6 74 L58 72 L44 24 L86 52 Z" fill="var(--rs-ink)" />
          </motion.svg>
          <span className="rs-burst-value" style={{ fontSize: fit(recapMoney(win.amount), 26.7, 60) }}><CountUp value={win.amount} format={recapMoney} delay={0.45} /></span>
        </div>
        <motion.div className="rs-stack" {...rise(0.6)}>
          <span className="rs-title">{win.title}</span>
          <span className="rs-sub">{win.date}</span>
          <div className="rs-chips">
            <span className="rs-chip">{win.category}</span>
            <span className="rs-chip rs-chip-solid">{r.winCount === 1 ? "Your only win" : `${win.share}% of your wins`}</span>
          </div>
        </motion.div>
      </div>;
    }
    case "top": {
      const [first, ...rest] = r.top;
      const isBiggest = r.biggestWin?.category === first.name;
      return <div className="rs-fill">
        <motion.p className="rs-heading" {...rise(0.05)}>Where your money came from</motion.p>
        <motion.div className="rs-first" initial={{ opacity: 0, y: 40, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 140, damping: 15, delay: 0.2 }}>
          <div className="rs-first-top"><span className="rs-rank1">1</span><span className="rs-first-amount">{recapSigned(first.net)}</span></div>
          <span className="rs-first-name">{first.name}</span>
          <span className="rs-first-note">{plural(first.count, "log")}{isBiggest ? ", including your biggest win" : ""}</span>
        </motion.div>
        <ol className="rs-rows" start={2}>
          {rest.map((c, i) => (
            <motion.li key={c.name} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.12 }}>
              <span className="rs-rank">{i + 2}</span><span className="rs-row-name">{c.name}</span>
              <span className={c.net < 0 ? "rs-neg" : ""}>{recapSigned(c.net)}</span>
            </motion.li>
          ))}
        </ol>
      </div>;
    }
    case "streak": {
      const s = r.streak!;
      return <div className="rs-fill rs-between">
        <div>
          <motion.p className="rs-lead" {...rise(0.05)}>Your longest streak</motion.p>
          <div className="rs-streak-row">
            <motion.span className="rs-giant" style={{ fontSize: s.length >= 10 ? "52cqw" : "77cqw" }} initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 140, damping: 14, delay: 0.1 }}>{s.length}</motion.span>
            <motion.span className="rs-streak-label" {...rise(0.35)}>days<br />in a row</motion.span>
          </div>
        </div>
        <div className="rs-steps" style={{ "--rs-count": s.bars.length } as CSSProperties}>
          {s.bars.map((bar, i) => (
            <div key={bar.label} className="rs-step">
              <motion.i className={i === s.bars.length - 1 ? "rs-step-last" : ""} style={{ height: `${28 + (72 * (i + 1)) / s.bars.length}%` }}
                initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.45 + i * 0.1, duration: 0.45 }} />
              <span>{bar.label}</span>
            </div>
          ))}
        </div>
        <motion.p className="rs-foot" {...rise(1)}>
          {s.from} to {s.to}.{s.endsOnBestDay ? ` It ended on your biggest day of the ${r.isYear ? "year" : "month"}.` : s.includesBestDay ? ` Your biggest day was part of it.` : ""}
          {s.length > 7 ? " Showing the last 7 days." : ""}
        </motion.p>
      </div>;
    }
    case "losses":
      return <div className="rs-fill rs-between">
        <div className="rs-stack">
          <motion.p className="rs-lead" {...rise(0.05)}>You logged the losses too.</motion.p>
          <span className="rs-big" style={{ fontSize: fit(recapMoney(r.losses), 30.8) }}><CountUp value={r.losses} format={recapMoney} /></span>
          <motion.p className="rs-body rs-strong" {...rise(0.35)}>{r.lossCount === 1 ? `One loss, ${r.lossSource}.` : `Across ${plural(r.lossCount, "loss", "losses")}, ${r.lossSource}.`}</motion.p>
        </div>
        <motion.div className="rs-balance" {...rise(0.5)}>
          <div className="rs-balance-labels"><span>{recapMoney(r.wins)} in</span><span>{recapMoney(r.losses)} out</span></div>
          <div className="rs-balance-bar">
            <motion.i style={{ width: `${r.winShare}%` }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.7, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>{r.winShare >= 18 ? `${r.winShare}%` : ""}</motion.i>
          </div>
        </motion.div>
        <motion.p className="rs-closing" {...rise(0.9)}>Counting the bad days is how you know the good ones add up.</motion.p>
      </div>;
    case "type":
      return <div className="rs-fill rs-between">
        <motion.p className="rs-lead rs-small-lead" {...rise(0.05)}>This {r.isYear ? "year" : "month"}, you were</motion.p>
        <motion.div className="rs-emblem" aria-hidden="true" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 110, damping: 13, delay: 0.2 }}>
          <svg viewBox="0 0 120 120" fill="none" stroke="var(--rs-ink)" strokeWidth="7" strokeLinecap="round">
            <circle cx="60" cy="60" r="44" /><circle cx="60" cy="60" r="24" /><circle cx="60" cy="60" r="6" fill="var(--rs-ink)" />
            <path d="M60 4 V26 M60 94 V116 M4 60 H26 M94 60 H116" />
          </svg>
        </motion.div>
        <motion.div className="rs-stack" {...rise(0.7)}>
          <h2 className="rs-type-name">{r.type.name}</h2>
          <p className="rs-body">{r.type.line}</p>
        </motion.div>
        <motion.div className="rs-chips" {...rise(0.95)}>
          <span className="rs-chip rs-chip-light">Top earner: {r.leader!.name}</span>
          {r.streak && <span className="rs-chip rs-chip-light">{r.streak.length}-day streak</span>}
          <span className="rs-chip rs-chip-light">{r.winShare}% win share</span>
        </motion.div>
      </div>;
    case "upby": {
      const down = r.net < 0, even = r.net === 0;
      return <div className="rs-fill">
        <motion.svg className={"rs-arrow" + (down ? " rs-arrow-down" : "")} aria-hidden="true" viewBox="0 0 200 200" fill="none" stroke="var(--rs-ink)" strokeWidth="34" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M30 170 L170 30" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5, duration: 0.6 }} />
          <motion.path d="M70 30 H170 V130" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.9, duration: 0.5 }} />
        </motion.svg>
        <motion.p className="rs-heading" {...rise(0.05)}>{even ? `All in, you broke even in ${r.name}` : `All in, ${r.name} had you ${down ? "down" : "up"} by`}</motion.p>
        {!even && <span className={"rs-big " + (down ? "rs-accent-red" : "rs-accent-blue")} style={{ fontSize: fit(recapSigned(r.net), 23.6) }}><CountUp value={r.net} format={recapSigned} delay={0.3} /></span>}
        <motion.p className="rs-body rs-strong rs-upby-foot" {...rise(0.8)}>{recapMoney(r.wins)} in, {recapMoney(r.losses)} out, {plural(r.totalLogs, "log")}.{r.isYear ? "" : " Next month starts at zero."}</motion.p>
      </div>;
    }
    case "share":
      return <div className="rs-fill rs-share">
        <motion.div className="rs-card" initial={{ opacity: 0, y: 40, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 130, damping: 16 }}>
          <div className="rs-card-top"><span className="rs-card-handle"><span className="rs-logo">U</span>{handle}</span><span>{r.isYear ? r.name : r.label}</span></div>
          <p className="rs-card-label">{r.net < 0 ? "Down by" : "Up by"}</p>
          <span className="rs-card-net" style={{ fontSize: fit(recapSigned(r.net), 21, 74) }}>{recapSigned(r.net)}</span>
          <div className="rs-card-stats">
            <div><span>Wins</span><b>{r.winCount}</b></div>
            <div>{r.streak ? <><span>Longest streak</span><b>{r.streak.length} days</b></> : <><span>Days logged</span><b>{r.activeDays}</b></>}</div>
            <div><span>Top category</span><b>{r.leader?.name ?? "None yet"}</b></div>
            <div><span>Biggest win</span><b>{r.biggestWin ? recapMoney(r.biggestWin.amount) : "None yet"}</b></div>
          </div>
          <div className="rs-card-type"><b>{r.type.name}</b><span>{SITE}</span></div>
        </motion.div>
        <div className="rs-actions">
          <button type="button" className="rs-btn rs-btn-primary" onClick={onShareX}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" /></svg>
            Share to X
          </button>
          <div className="rs-actions-row">
            <button type="button" className="rs-btn" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save image"}</button>
            <button type="button" className="rs-btn" onClick={onReplay}>Watch again</button>
          </div>
          <p className="rs-status" role="status">{status}</p>
        </div>
      </div>;
  }
}

async function drawShareImage(r: Recap, handle: string) {
  await Promise.all([document.fonts.load(`800 100px "Bricolage Grotesque Variable"`), document.fonts.load(`600 40px "Bricolage Grotesque Variable"`)]).catch(() => undefined);
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Image unavailable");
  const font = (weight: number, size: number) => { c.font = `${weight} ${size}px 'Bricolage Grotesque Variable', 'Avenir Next', sans-serif`; };
  const fitText = (text: string, weight: number, size: number, max: number) => { font(weight, size); while (c.measureText(text).width > max && size > 20) { size -= 4; font(weight, size); } };
  c.fillStyle = "#f5f1e8"; c.fillRect(0, 0, 1080, 1920);
  c.fillStyle = "#1769ff"; c.beginPath(); c.roundRect(70, 200, 940, 1440, 72); c.fill();
  c.fillStyle = "#c8ef43"; c.beginPath(); c.roundRect(140, 270, 84, 84, 24); c.fill();
  c.fillStyle = "#111427"; font(800, 50); c.textAlign = "center"; c.fillText("U", 182, 330);
  c.textAlign = "left"; c.fillStyle = "#fff"; fitText(handle, 700, 44, 400); c.fillText(handle, 250, 327);
  const cardLabel = r.isYear ? r.name : r.label;
  c.textAlign = "right"; fitText(cardLabel, 700, 44, 380); c.fillText(cardLabel, 940, 327);
  c.textAlign = "left"; font(700, 64); c.fillText(r.net < 0 ? "Down by" : "Up by", 140, 540);
  c.fillStyle = "#c8ef43"; fitText(recapSigned(r.net), 800, 250, 800); c.fillText(recapSigned(r.net), 130, 770);
  c.fillStyle = "rgba(255,255,255,.4)"; c.fillRect(140, 900, 800, 4);
  const stats: [string, string][] = [
    ["Wins", String(r.winCount)],
    r.streak ? ["Longest streak", `${r.streak.length} days`] : ["Days logged", String(r.activeDays)],
    ["Top category", r.leader?.name ?? "None yet"],
    ["Biggest win", r.biggestWin ? recapMoney(r.biggestWin.amount) : "None yet"],
  ];
  stats.forEach(([label, value], i) => {
    const x = 140 + (i % 2) * 420, y = 1000 + Math.floor(i / 2) * 210;
    c.fillStyle = "#fff"; font(600, 38); c.fillText(label, x, y);
    fitText(value, 800, 76, 380); c.fillText(value, x, y + 92);
  });
  c.fillStyle = "#111427"; c.beginPath(); c.roundRect(140, 1430, 800, 140, 40); c.fill();
  font(600, 34); const linkWidth = c.measureText(SITE).width;
  c.fillStyle = "#fff"; c.textAlign = "right"; c.fillText(SITE, 896, 1512);
  c.textAlign = "left"; c.fillStyle = "#c8ef43"; fitText(r.type.name, 800, 56, 800 - 88 - linkWidth - 40); c.fillText(r.type.name, 184, 1520);
  c.textAlign = "center"; c.fillStyle = "#111427"; font(700, 46); c.fillText("How much are you up by?", 540, 1780);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Image unavailable"))), "image/png"));
}

export default function RecapStory({ period, recapOverride, profile, userId }: { period: string; recapOverride: RecapSummary; profile?: { username?: string } | null; userId?: string }) {
  const reduced = useReducedMotion();
  const recap = useMemo(() => buildRecap(recapOverride, period), [recapOverride, period]);
  const handle = profile?.username ? `@${profile.username.replace(/^@/, "")}` : "UPBY member";
  const slides = recap.slides;
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [playing, setPlaying] = useState(!reduced);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const press = useRef<{ x: number; y: number; timer: number; held: boolean } | null>(null);
  const tracked = useRef({ completed: false });
  const id = slides[Math.min(index, slides.length - 1)];
  const last = index >= slides.length - 1;

  useEffect(() => {
    void trackProductEvent(userId, "recap_opened", "recap", { kind: recap.isYear ? "year" : "month", slides: slides.length });
    void recordRecap(userId, period, "viewed");
  }, [userId, period, recap.isYear, slides.length]);
  useEffect(() => {
    if (id === "share" && !tracked.current.completed) { tracked.current.completed = true; void trackProductEvent(userId, "recap_completed", "recap", { kind: recap.isYear ? "year" : "month" }); }
  }, [id, userId, recap.isYear]);

  const go = useCallback((next: number) => { setIndex(Math.max(0, Math.min(slides.length - 1, next))); setStatus(""); }, [slides.length]);

  // Auto-advance, drawn straight onto the active progress bar.
  useEffect(() => {
    const fill = fillRef.current;
    if (fill) fill.style.transform = "scaleX(0)";
    if (!playing || held || last) { if (fill && last) fill.style.transform = "scaleX(1)"; return; }
    const duration = DURATION[id] ?? DEFAULT_DURATION;
    let frame = 0, start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / duration);
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
      if (progress >= 1) go(index + 1); else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, id, playing, held, last, go]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const fromControl = (target: EventTarget) => target instanceof Element && Boolean(target.closest("button, a, .rs-card"));
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (fromControl(e.target)) return;
    const timer = window.setTimeout(() => { if (press.current) { press.current.held = true; setHeld(true); } }, 220);
    press.current = { x: e.clientX, y: e.clientY, timer, held: false };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    if (p.held) { setHeld(false); return; }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { go(index + (dx < 0 ? 1 : -1)); return; }
    if (Math.abs(dy) > 50) return;
    const rect = e.currentTarget.getBoundingClientRect();
    go(index + (e.clientX - rect.left < rect.width * 0.3 ? -1 : 1));
  };
  const onPointerCancel = () => { if (press.current) window.clearTimeout(press.current.timer); press.current = null; setHeld(false); };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    else if (e.key === " " && !fromControl(e.target)) { e.preventDefault(); setPlaying((value) => !value); }
  };

  const shareText = `${recap.isYear ? `My ${recap.name}` : `My ${recap.name}`} on UPBY: ${recap.net < 0 ? "down" : "up"} by ${recapSigned(recap.net)}${recap.streak ? ` with a ${recap.streak.length}-day streak` : ""}. ${recap.type.name}.`;
  const onShareX = () => {
    void trackProductEvent(userId, "recap_shared", "recap", { method: "x" });
    const url = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://" + SITE)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const onSave = async () => {
    if (saving) return;
    setSaving(true); setStatus("");
    try {
      const blob = await drawShareImage(recap, handle);
      const file = new File([blob], `upby-recap-${recap.period}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        setStatus("Shared.");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = file.name; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 2000);
        setStatus("Image saved.");
      }
      void trackProductEvent(userId, "recap_shared", "recap", { method: "image" });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setStatus("Couldn't make the image. Please try again.");
    } finally { setSaving(false); }
  };

  return (
    <div className={"rs " + THEME[id]} style={{ fontFamily: FONT }} tabIndex={0} onKeyDown={onKeyDown}
      aria-roledescription="story" aria-label={`Your ${recap.label} recap`}>
      <div className="rs-top">
        <div className="rs-progress">
          {slides.map((slide, i) => (
            <span key={slide} className="rs-seg"><span className="rs-seg-fill" ref={i === index ? fillRef : undefined} style={{ transform: i < index ? "scaleX(1)" : i > index ? "scaleX(0)" : undefined }} /></span>
          ))}
        </div>
        <div className="rs-bar-row">
          <span className="rs-brand"><span className="rs-logo">U</span>UPBY recap</span>
          {!last && <button type="button" className="rs-icon-btn" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause recap" : "Play recap"}>{playing ? <Pause /> : <Play />}</button>}
        </div>
      </div>
      <div className="rs-stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerCancel} onPointerLeave={onPointerCancel}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.section key={id} className="rs-slide" aria-roledescription="slide" aria-label={`${index + 1} of ${slides.length}`}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={{ duration: reduced ? 0.1 : 0.28 }}>
            <Slide id={id} recap={recap} handle={handle} onShareX={onShareX} onSave={() => void onSave()} onReplay={() => { go(0); setPlaying(!reduced); }} saving={saving} status={status} />
          </motion.section>
        </AnimatePresence>
      </div>
      <div className="rs-sr">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0}>Previous slide</button>
        <button type="button" onClick={() => go(index + 1)} disabled={last}>Next slide</button>
      </div>
      {held && <span className="rs-paused" aria-hidden="true">Paused</span>}
    </div>
  );
}
