import { retryAuthTiming } from './auth-retry';
import { recapNoticeKey, type RecapStatus } from './recap-prompt';
import { supabase } from './upby-core';

const remember = (userId: string, period: string, status: RecapStatus) => {
  try {
    const key = recapNoticeKey(userId, period);
    if (status === 'viewed' || !localStorage.getItem(key)) localStorage.setItem(key, status);
  } catch {}
};

/** Saves that a member saw a recap popup or viewed a recap. "viewed" is never downgraded to "seen". */
export async function recordRecap(userId: string | undefined, period: string, status: RecapStatus) {
  if (!userId) return;
  remember(userId, period, status);
  const row = { user_id: userId, period, status, updated_at: new Date().toISOString() };
  await retryAuthTiming(() => status === 'viewed'
    ? supabase.from('recap_views').upsert(row, { onConflict: 'user_id,period' })
    : supabase.from('recap_views').upsert(row, { onConflict: 'user_id,period', ignoreDuplicates: true }));
}

/** Statuses for these periods, from the account, merged with what this device remembers. */
export async function loadRecapStatuses(userId: string, periods: string[]) {
  const statuses: Record<string, RecapStatus | undefined> = {};
  for (const period of periods) {
    try {
      const local = localStorage.getItem(recapNoticeKey(userId, period));
      if (local === 'viewed') statuses[period] = 'viewed';
      else if (local) statuses[period] = 'seen'; // older app versions stored "seen"
    } catch {}
  }
  if (!periods.length) return statuses;
  const { data, error } = await retryAuthTiming(() => supabase.from('recap_views').select('period,status').eq('user_id', userId).in('period', periods));
  if (!error) for (const row of (data || []) as { period: string; status: RecapStatus }[]) {
    if (row.status === 'viewed' || !statuses[row.period]) statuses[row.period] = row.status;
  }
  return statuses;
}
