const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const dayNumber = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
};

export function logDateLabel(dateKey: string | undefined, savedLabel: string | undefined, today: string) {
  if (!dateKey || !DATE_KEY.test(dateKey) || !DATE_KEY.test(today)) return savedLabel || "Date unavailable";
  const difference = dayNumber(today) - dayNumber(dateKey);
  if (difference === 0) return "Today";
  if (difference === 1) return "Yesterday";
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(year !== Number(today.slice(0, 4)) ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}
