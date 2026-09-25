export type DatedEntry = { type: string; amount: number; dateKey?: string; category: string };
export const currentMonth = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
export function shiftMonth(month: string, offset: number) {
  const [year, number] = month.split('-').map(Number);
  return currentMonth(new Date(year, number - 1 + offset, 1, 12));
}
export function periodLabel(period: string) {
  return period.length === 4 ? `${period} Year` : new Date(`${period}-01T12:00:00`).toLocaleDateString('en-US', {month:'long',year:'numeric'});
}
export function validDateKey(key?: string): key is string {
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const date = new Date(`${key}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === key;
}
export function periodSummary<T extends DatedEntry>(logs: T[], period: string) {
  const entries = logs.filter(log => validDateKey(log.dateKey) && (period.length === 4 ? log.dateKey.slice(0,4) : log.dateKey.slice(0,7)) === period);
  let wins = 0, losses = 0, winCount = 0, lossCount = 0;
  const days = new Map<string, number>(), categories = new Map<string, number>();
  for (const log of entries) {
    const cents = Math.round(log.amount * 100);
    const signed = log.type === 'win' ? cents : -cents;
    if (log.type === 'win') { wins += cents; winCount++; } else { losses += cents; lossCount++; }
    days.set(log.dateKey!, (days.get(log.dateKey!) || 0) + signed);
    categories.set(log.category, (categories.get(log.category) || 0) + signed);
  }
  let longestStreak = 0, run = 0, previous = -Infinity;
  for (const key of Array.from(days.keys()).sort()) {
    const day = Date.parse(`${key}T00:00:00Z`) / 86400000;
    run = day === previous + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run); previous = day;
  }
  const [year, month] = period.split('-').map(Number);
  const dayCount = month ? new Date(year, month, 0).getDate() : 0;
  const dayValues = Array.from({length:dayCount}, (_, index) => (days.get(`${period}-${String(index + 1).padStart(2,'0')}`) || 0) / 100);
  return { entries, wins:wins/100, losses:losses/100, net:(wins-losses)/100, winCount, lossCount, longestStreak, activeDays:days.size,
    bestDay: days.size ? Math.max(...days.values())/100 : null, dayValues,
    dayActive: Array.from({length:dayCount},(_,index)=>days.has(`${period}-${String(index+1).padStart(2,'0')}`)),
    weekdayOffset: month ? (new Date(year,month-1,1,12).getDay()+6)%7 : 0,
    categories:Array.from(categories,([name,value])=>({name,net:value/100})).sort((a,b)=>b.net-a.net || a.name.localeCompare(b.name)) };
}
export type PeriodSummary = ReturnType<typeof periodSummary>;
export const insightMoney = (value: number) => value.toLocaleString('en-US', {style:'currency',currency:'USD',maximumFractionDigits:2});
export const insightSignedMoney = (value: number) => `${value>0?'+':''}${insightMoney(value)}`;
