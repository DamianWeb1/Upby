export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function goalProgress(logs: Array<{ type: string; amount: number; dateKey?: string }>, month: string, target: number) {
  const netCents = logs.reduce((total, log) => {
    if (!log.dateKey?.startsWith(month.slice(0, 7) + "-") || !Number.isFinite(log.amount)) return total;
    return total + Math.round(log.amount * 100) * (log.type === "loss" ? -1 : 1);
  }, 0);
  const targetCents = Math.round(target * 100);
  return {
    net: netCents / 100,
    remaining: Math.max(0, targetCents - netCents) / 100,
    percent: targetCents > 0 ? Math.max(0, Math.min(100, netCents / targetCents * 100)) : 0,
    reached: targetCents > 0 && netCents >= targetCents,
  };
}

export function validGoal(value: string) {
  return /^(?:\d{1,12}(\.\d{1,2})?|\.\d{1,2})$/.test(value.trim()) && Number(value) > 0;
}
