import { shiftMonth, validDateKey } from './insight-periods';

export const RECAP_WINDOW_DAYS = 7;
export type RecapStatus = 'seen' | 'viewed';
export type RecapPrompt = { period: string; kind: 'month' | 'year' };

/** Recaps that can be offered today: last month during days 1–7, and last year during January 1–7. */
export function dueRecaps(today: string, dates: Array<string | undefined>) {
  if (!validDateKey(today) || Number(today.slice(8, 10)) > RECAP_WINDOW_DAYS) return { month: null, year: null };
  const logged = dates.filter(validDateKey);
  const lastMonth = shiftMonth(today.slice(0, 7), -1);
  const lastYear = String(Number(today.slice(0, 4)) - 1);
  return {
    month: logged.some((date) => date.slice(0, 7) === lastMonth) ? lastMonth : null,
    year: today.slice(5, 7) === '01' && logged.some((date) => date.slice(0, 4) === lastYear) ? lastYear : null,
  };
}

/**
 * Which popup to show now.
 * Year: every app open until the recap is actually viewed ("Not now" only hides it for this session).
 * Month: once per account; either button counts.
 * Only one popup per session: if the year popup was dismissed this session, the month waits for the next open.
 */
export function nextRecapPrompt(
  due: { month: string | null; year: string | null },
  statuses: Record<string, RecapStatus | undefined>,
  dismissedThisSession: string[],
): RecapPrompt | null {
  if (due.year && dismissedThisSession.includes(due.year)) return null;
  if (due.year && statuses[due.year] !== 'viewed') {
    return dismissedThisSession.includes(due.year) ? null : { period: due.year, kind: 'year' };
  }
  if (due.month && !statuses[due.month] && !dismissedThisSession.includes(due.month)) return { period: due.month, kind: 'month' };
  return null;
}

export const recapNoticeKey = (userId: string, period: string) => `upby:recap-notice:${userId}:${period}`;
export const recapSessionKey = (userId: string) => `upby:recap-session:${userId}`;
