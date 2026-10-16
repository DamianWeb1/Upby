import { createClient } from "@supabase/supabase-js";
import { validDateKey } from "./insight-periods";

export type Tab = "home" | "insights" | "leaderboard" | "profile";

export type Log = {
  id: number;
  type: "win" | "loss";
  amount: number;
  category: string;
  title: string;
  date: string;
  dateKey?: string;
  note?: string;
  merchant?: string;
  paymentMethod?: string;
  screenshot?: boolean;
  screenshotPath?: string;
};

export type LogDraft = Omit<Log, "id"> & { screenshotFile?: File | null; removeScreenshot?: boolean };

export type LogRow = {
  id: number | string;
  user_id: string;
  type: "win" | "loss";
  amount: number | string;
  category: string;
  title: string;
  date_label: string;
  date_key: string | null;
  note: string | null;
  merchant: string | null;
  payment_method: string | null;
  screenshot: boolean;
  screenshot_path: string | null;
};

export type ProfileData = { displayName: string; username: string; xProfile: string; avatarUrl: string | null; bio?: string };

export type LeaderboardEntry = {
  rank: number | string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  net: number | string;
  streak: number | string;
};

export type PersistedState = {
  version: 2;
  ownerId: string;
  stage: "auth" | "onboarding" | "app";
  tab: Tab;
  logs: Log[];
  freshStart: boolean;
  profile: ProfileData;
  prefs: number[];
  following: string[];
  customCategories: Array<[string, string]>;
};

export const STORAGE_KEY = "upby:account:v2";

export const DEFAULT_PROFILE: ProfileData = { displayName: "Damian", username: "damian", xProfile: "damian__web", avatarUrl: null, bio: "" };

export const DEFAULT_PREFS = [1, 1, 1, 0, 1, 1];

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);

export const CATS: [[string, string], ...Array<[string, string]>] = [
  ["Bounties", "#6848ff"],
  ["Ambassadorships", "#ff6c64"],
  ["Content", "#ff9f1c"],
  ["Dev", "#1769ff"],
  ["Web3 Jobs", "#b7e32b"],
  ["NFTs", "#8a63ff"],
  ["Predictions", "#ff7d45"],
  ["X Monetization", "#17192d"],
  ["Trading", "#3b82f6"],
  ["Airdrops", "#8bd450"],
  ["Freelance", "#f04f78"],
  ["Other", "#8a8d9c"],
];

export const LOSS_CATS: [[string, string], ...Array<[string, string]>] = [
  ["Expenses", "#ff6c64"],
  ["Tools & subscriptions", "#6848ff"],
  ["Trading loss", "#f04f78"],
  ["Failed project", "#ff9f1c"],
  ["Fees", "#1769ff"],
  ["Refunds", "#8a63ff"],
  ["Other", "#8a8d9c"],
];

export const PAYMENT_METHODS: Record<string, string> = {
  card: "Card",
  bank_transfer: "Bank transfer",
  crypto: "Crypto",
  cash: "Cash",
  other: "Other",
};

export const START: Log[] = [
  {
    id: 1,
    type: "win",
    amount: 350,
    category: "Bounties",
    title: "Project XYZ",
    date: "Today",
    note: "Completed the final bounty task and received payment.",
    screenshot: true,
  },
  {
    id: 2,
    type: "loss",
    amount: 120,
    category: "Trading",
    title: "SOL",
    date: "Yesterday",
    note: "Closed the position and logged the result.",
  },
  {
    id: 3,
    type: "win",
    amount: 700,
    category: "Dev",
    title: "Landing page",
    date: "Sep 6",
    note: "Designed and shipped the complete landing page.",
  },
  {
    id: 4,
    type: "win",
    amount: 480,
    category: "Content",
    title: "Launch campaign",
    date: "Sep 5",
    note: "Created the launch content package.",
  },
];

export const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);

export const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${money(Math.abs(n))}`;

export const logToRow = (log: Log, userId: string): LogRow => ({
  id: log.id,
  user_id: userId,
  type: log.type,
  amount: log.amount,
  category: log.category,
  title: log.title,
  date_label: log.date,
  date_key: log.dateKey || null,
  note: log.note || null,
  merchant: log.type === "loss" ? log.merchant || null : null,
  payment_method: log.type === "loss" ? log.paymentMethod || null : null,
  screenshot: Boolean(log.screenshot),
  screenshot_path: log.screenshotPath || null,
});

export const rowToLog = (row: LogRow): Log => ({
  id: Number(row.id),
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  title: row.title,
  date: row.date_label,
  dateKey: row.date_key || undefined,
  note: row.note || undefined,
  merchant: row.merchant || undefined,
  paymentMethod: row.payment_method || undefined,
  screenshot: Boolean(row.screenshot_path || row.screenshot),
  screenshotPath: row.screenshot_path || undefined,
});

export const trackProductEvent = async (
  userId: string | undefined,
  eventName: string,
  area: string,
  metadata: Record<string, string | number | boolean> = {},
) => {
  if (!userId) return;
  try {
    const { error } = await supabase.from("product_events").insert({ user_id: userId, event_name: eventName, area, metadata });
    if (error) return;
  } catch {
    // Analytics must never interrupt the product experience.
  }
};

export async function authenticatedWrite(action: () => PromiseLike<{ error: any }>) {
  let result = await action();
  if (result.error && (result.error.code === "PGRST303" || /jwt|token.*expired/i.test(result.error.message || ""))) {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
    result = await action();
  }
  if (result.error) throw result.error;
}

export function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function shiftDateKey(key: string, offset: number) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day + offset, 12);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function logGroupLabel(log: Log, today: string) {
  if (!validDateKey(log.dateKey)) return "Date not set";
  if (log.dateKey === today) return "Today";
  if (log.dateKey === shiftDateKey(today, -1)) return "Yesterday";
  return new Date(`${log.dateKey}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
