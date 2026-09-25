export type WeeklyLog = { type: string; amount: number; dateKey?: string; category: string };
export function calendarKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function weekBounds(anchor: Date, offset = 0) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), 12);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7 + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { from: calendarKey(start), to: calendarKey(end) };
}
export function weeklySummary(logs: WeeklyLog[], from: string, to: string) {
  let wins = 0, losses = 0, count = 0;
  const categories = new Map<string, { wins: number; losses: number }>();
  for (const log of logs) {
    if (!log.dateKey || log.dateKey < from || log.dateKey > to || !["win", "loss"].includes(log.type)) continue;
    const amount = Math.round(log.amount * 100);
    const category = categories.get(log.category) || { wins: 0, losses: 0 };
    if (log.type === "win") { wins += amount; category.wins += amount; }
    else { losses += amount; category.losses += amount; }
    categories.set(log.category, category);
    count++;
  }
  return {
    wins: wins / 100, losses: losses / 100, net: (wins - losses) / 100, count,
    categories: Array.from(categories, ([name, value]) => ({ name, volume: (value.wins + value.losses) / 100, net: (value.wins - value.losses) / 100 }))
      .sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name)).slice(0, 3),
  };
}
