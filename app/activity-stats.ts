import { validDateKey, type DatedEntry } from './insight-periods';
export function activityStats(logs: DatedEntry[], today: string) {
  const todayNumber = Date.parse(`${today}T00:00:00Z`) / 86400000;
  const dates = Array.from(new Set(logs.filter(log => validDateKey(log.dateKey) && log.dateKey <= today).map(log => log.dateKey!))).sort();
  const numbers = dates.map(date => Date.parse(`${date}T00:00:00Z`) / 86400000);
  let longest = 0, run = 0, previous = -Infinity;
  for (const day of numbers) { run = day === previous + 1 ? run + 1 : 1; longest = Math.max(longest, run); previous = day; }
  let current = 0;
  const last = numbers[numbers.length - 1];
  if (last >= todayNumber - 1) {
    for (let i = numbers.length - 1; i >= 0 && numbers[i] === last - current; i--) current++;
  }
  const weekday = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const week = Array.from({length:7}, (_, i) => new Date((todayNumber - weekday + i) * 86400000).toISOString().slice(0,10));
  const set = new Set(dates);
  const todayCents = logs.filter(log => log.dateKey === today).reduce((total, log) => total + (log.type === 'win' ? 1 : -1) * Math.round(log.amount * 100), 0);
  return { current, longest, week, weekActive: week.map(date => set.has(date)), todayNet:todayCents/100 };
}
