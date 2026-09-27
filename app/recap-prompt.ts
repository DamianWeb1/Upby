import { shiftMonth, validDateKey } from './insight-periods';
export function dueRecap(today: string, dates: Array<string | undefined>) {
  if (!validDateKey(today) || today.slice(-2) !== '01') return null;
  const previous = shiftMonth(today.slice(0,7), -1);
  return dates.some(date => validDateKey(date) && date.slice(0,7) === previous) ? previous : null;
}
export const recapNoticeKey = (userId: string, period: string) => `upby:recap-notice:${userId}:${period}`;
