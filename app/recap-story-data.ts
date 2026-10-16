import { periodLabel, type DatedEntry } from "./insight-periods";

export type RecapEntry = DatedEntry & { title?: string };
export type RecapSummary = {
  entries: RecapEntry[];
  wins: number;
  losses: number;
  net: number;
  winCount: number;
  lossCount: number;
  longestStreak: number;
  activeDays: number;
  categories: { name: string; net: number }[];
};

export type RecapSlideId = "intro" | "empty" | "days" | "wins" | "biggest" | "top" | "streak" | "losses" | "type" | "upby" | "share";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STRONG_DAY = 100;

const dayNumber = (key: string) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyDate = (key: string) => new Date(`${key}T12:00:00Z`);
export const longDate = (key: string) => keyDate(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const shortDay = (key: string) => `${WEEKDAYS[keyDate(key).getUTCDay()]} ${keyDate(key).getUTCDate()}`;
const monthDay = (key: string) => keyDate(key).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

const PERSONALITIES: { match: RegExp; name: string; line: (category: string) => string }[] = [
  { match: /bount/i, name: "The Bounty Hunter", line: () => "Bounties paid you more than anything else. You find the task, ship it and get paid." },
  { match: /airdrop|farm/i, name: "The Airdrop Farmer", line: () => "Airdrops led your wins. You put in the early work and collected." },
  { match: /giveaway|raffle|contest/i, name: "The Giveaway Hunter", line: () => "Giveaways came through for you. You entered, you showed up, you won." },
  { match: /content|post|creat|clip|video|writ|thread|kol/i, name: "The Creator", line: (c) => `${c} brought in the most. Your posts did the heavy lifting.` },
  { match: /job|salary|work|freelanc|gig|client|ambassador|role/i, name: "The Operator", line: (c) => `${c} carried your month. Steady work, steady pay.` },
  { match: /trad|futures|spot|perp/i, name: "The Trader", line: () => "Trading led your wins. You read the market and took your shot." },
  { match: /nft|mint|collect/i, name: "The Collector", line: () => "NFTs did the most for you. You knew what to pick up and when." },
  { match: /gambl|bet|casino|sport/i, name: "The Risk Taker", line: (c) => `${c} paid off most. You backed yourself and it landed.` },
];

export function personality(category: string | null) {
  if (!category) return { name: "The Grinder", line: "Your wins came from all over. You kept stacking, one log at a time." };
  const found = PERSONALITIES.find((p) => p.match.test(category));
  return found
    ? { name: found.name, line: found.line(category) }
    : { name: "The Grinder", line: `${category} led the way, with wins from all over. You kept stacking, one log at a time.` };
}

export function buildRecap(summary: RecapSummary, period: string) {
  const isYear = period.length === 4;
  const [year, month] = period.split("-").map(Number);
  const label = periodLabel(period);
  const name = isYear ? String(year) : new Date(year, month - 1, 1, 12).toLocaleDateString("en-US", { month: "long" });
  const short = isYear ? String(year) : MONTHS_SHORT[month - 1];
  const entries = summary.entries.filter((entry) => entry.dateKey);
  const totalLogs = entries.length;

  // Per-day totals
  const dayNet = new Map<string, number>();
  for (const entry of entries) {
    const signed = entry.type === "win" ? entry.amount : -entry.amount;
    dayNet.set(entry.dateKey!, (dayNet.get(entry.dateKey!) || 0) + signed);
  }
  const days = Array.from(dayNet.keys()).sort();

  // Calendar (month) or month grid (year)
  const dayCount = isYear ? 0 : new Date(year, month, 0).getDate();
  const offset = isYear ? 0 : (new Date(year, month - 1, 1, 12).getDay() + 6) % 7;
  const calendar = Array.from({ length: dayCount }, (_, index) => {
    const key = `${period}-${String(index + 1).padStart(2, "0")}`;
    const value = dayNet.get(key);
    return { day: index + 1, level: value === undefined ? 0 : value >= STRONG_DAY ? 2 : 1 };
  });
  const monthsActive = isYear
    ? MONTHS_SHORT.map((label, index) => {
        const prefix = `${period}-${String(index + 1).padStart(2, "0")}`;
        return { label, days: days.filter((key) => key.startsWith(prefix)).length };
      })
    : [];

  // Wins over time: weeks for a month, months for a year
  const winsByBucket: { label: string; value: number }[] = isYear
    ? MONTHS_SHORT.map((label) => ({ label: label.slice(0, 1), value: 0 }))
    : Array.from({ length: Math.ceil(dayCount / 7) }, (_, index) => ({ label: `Wk ${index + 1}`, value: 0 }));
  for (const entry of entries) {
    if (entry.type !== "win") continue;
    const bucket = isYear ? Number(entry.dateKey!.slice(5, 7)) - 1 : Math.floor((Number(entry.dateKey!.slice(8, 10)) - 1) / 7);
    if (winsByBucket[bucket]) winsByBucket[bucket].value += entry.amount;
  }
  const bucketMax = Math.max(0, ...winsByBucket.map((bucket) => bucket.value));

  // Biggest single win
  const winsList = entries.filter((entry) => entry.type === "win");
  const biggest = winsList.reduce<RecapEntry | null>((best, entry) => (!best || entry.amount > best.amount ? entry : best), null);
  const biggestWin = biggest
    ? {
        title: biggest.title?.trim() || biggest.category,
        amount: biggest.amount,
        category: biggest.category,
        date: longDate(biggest.dateKey!),
        share: summary.wins > 0 ? Math.round((biggest.amount / summary.wins) * 100) : 0,
      }
    : null;

  // Categories with entry counts
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.category, (counts.get(entry.category) || 0) + 1);
  const top = summary.categories.slice(0, 5).map((category) => ({ ...category, count: counts.get(category.name) || 0 }));
  const leader = summary.categories.find((category) => category.net > 0) || null;

  // Longest streak, with its dates
  let run: string[] = [], bestRun: string[] = [];
  for (const key of days) {
    run = run.length && dayNumber(key) === dayNumber(run[run.length - 1]) + 1 ? [...run, key] : [key];
    if (run.length > bestRun.length) bestRun = run;
  }
  const bestDayKey = days.reduce<string | null>((best, key) => (!best || dayNet.get(key)! > dayNet.get(best)! ? key : best), null);
  const streak = bestRun.length >= 2
    ? {
        length: bestRun.length,
        from: monthDay(bestRun[0]),
        to: monthDay(bestRun[bestRun.length - 1]),
        bars: bestRun.slice(-7).map((key) => ({ label: shortDay(key), value: Math.max(0, dayNet.get(key) || 0) })),
        includesBestDay: bestDayKey !== null && bestRun.includes(bestDayKey) && (dayNet.get(bestDayKey) || 0) > 0,
        endsOnBestDay: bestDayKey === bestRun[bestRun.length - 1] && (dayNet.get(bestDayKey) || 0) > 0,
      }
    : null;

  // Losses
  const lossByCategory = new Map<string, number>();
  for (const entry of entries) if (entry.type !== "win") lossByCategory.set(entry.category, (lossByCategory.get(entry.category) || 0) + entry.amount);
  const lossLeader = Array.from(lossByCategory).sort((a, b) => b[1] - a[1])[0];
  const lossCategories = lossByCategory.size;
  const lossSource = !lossLeader
    ? ""
    : summary.lossCount === 1
      ? `from ${lossLeader[0].toLowerCase()}`
      : lossCategories === 1
      ? `all of them from ${lossLeader[0].toLowerCase()}`
      : lossLeader[1] / summary.losses >= 0.5
        ? `mostly from ${lossLeader[0].toLowerCase()}`
        : `spread across ${lossCategories} categories`;
  const total = summary.wins + summary.losses;
  const winShare = total > 0 ? Math.round((summary.wins / total) * 100) : 0;

  const type = personality(leader?.name ?? null);

  const slides: RecapSlideId[] = ["intro"];
  if (!totalLogs) slides.push("empty");
  else {
    slides.push("days");
    if (summary.winCount) slides.push("wins", "biggest");
    if (top.length >= 2) slides.push("top");
    if (streak) slides.push("streak");
    if (summary.lossCount) slides.push("losses");
    if (leader) slides.push("type");
    slides.push("upby", "share");
  }

  return {
    period, isYear, label, name, short, totalLogs,
    wins: summary.wins, losses: summary.losses, net: summary.net,
    winCount: summary.winCount, lossCount: summary.lossCount,
    activeDays: summary.activeDays, strongThreshold: STRONG_DAY,
    calendar, offset, monthsActive,
    winsByBucket: winsByBucket.map((bucket) => ({ ...bucket, ratio: bucketMax > 0 ? bucket.value / bucketMax : 0, peak: bucketMax > 0 && bucket.value === bucketMax })),
    avgWin: summary.winCount ? summary.wins / summary.winCount : 0,
    biggestWin, top, leader, streak, lossSource, winShare, type, slides,
  };
}

export type Recap = ReturnType<typeof buildRecap>;
