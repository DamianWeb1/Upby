export type LogFilters = { query: string; category: string; type: string; from: string; to: string };
export const emptyFilters: LogFilters = { query: "", category: "", type: "", from: "", to: "" };
type Entry = { title: string; note?: string; category: string; type: string; amount: number; dateKey?: string };
export function filterLogs<T extends Entry>(logs: T[], filters: LogFilters): T[] {
  const query = filters.query.trim().toLowerCase();
  if (filters.from && filters.to && filters.from > filters.to) return [];
  return logs.filter(log =>
    (!query || `${log.title} ${log.note || ""}`.toLowerCase().includes(query)) &&
    (!filters.category || log.category === filters.category) &&
    (!filters.type || log.type === filters.type) &&
    (!filters.from || (!!log.dateKey && log.dateKey >= filters.from)) &&
    (!filters.to || (!!log.dateKey && log.dateKey <= filters.to))
  );
}
export function logTotals(logs: Entry[]) {
  let wins = 0, losses = 0;
  for (const log of logs) {
    const cents = Math.round(log.amount * 100);
    if (log.type === "win") wins += cents;
    if (log.type === "loss") losses += cents;
  }
  return { wins: wins / 100, losses: losses / 100, net: (wins - losses) / 100 };
}
