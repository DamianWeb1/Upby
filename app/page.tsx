"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m as motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
import MonthlyGoal from "./MonthlyGoal";
import WeeklySummary from "./WeeklySummary";
import { activityStats } from "./activity-stats";
import { currentMonth, shiftMonth, periodLabel, periodSummary, validDateKey, insightMoney, insightSignedMoney, type PeriodSummary } from "./insight-periods";
import { emptyFilters, filterLogs, logTotals, type LogFilters } from "./log-filters";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Flame,
  Globe2,
  Home,
  Lock,
  Medal,
  Plus,
  Search,
  Settings2,
  Share2,
  Sparkles,
  Trophy,
  UserRound,
  X,
  Edit3,
  Trash2,
  TrendingUp,
  TrendingDown,
  Eye,
  UserPlus,
  Crown,
  Star,
  Award,
  CircleDollarSign,
  Download,
  MessageSquare,
  ShieldCheck,
  Zap,
  Target,
  LoaderCircle,
  LogOut,
  PartyPopper,
} from "lucide-react";
type Tab = "home" | "insights" | "profile";
type Log = {
  id: number;
  type: "win" | "loss";
  amount: number;
  category: string;
  title: string;
  date: string;
  dateKey?: string;
  note?: string;
  screenshot?: boolean;
};
type LogRow = {
  id: number | string;
  user_id: string;
  type: "win" | "loss";
  amount: number | string;
  category: string;
  title: string;
  date_label: string;
  date_key: string | null;
  note: string | null;
  screenshot: boolean;
};
type ProfileData = { displayName: string; username: string; xProfile: string; avatarUrl: string | null; bio?: string };
type LeaderboardEntry = {
  rank: number | string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  net: number | string;
  streak: number | string;
};
type PersistedState = {
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
const STORAGE_KEY = "upby:account:v2";
const DEFAULT_PROFILE: ProfileData = { displayName: "Damian", username: "damian", xProfile: "damian__web", avatarUrl: null, bio: "" };
const DEFAULT_PREFS = [1, 1, 1, 0, 1, 1];
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);
const CATS: [[string, string], ...Array<[string, string]>] = [
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
const LOSS_CATS: [[string, string], ...Array<[string, string]>] = [
  ["Expenses", "#ff6c64"],
  ["Tools & subscriptions", "#6848ff"],
  ["Trading loss", "#f04f78"],
  ["Failed project", "#ff9f1c"],
  ["Fees", "#1769ff"],
  ["Refunds", "#8a63ff"],
  ["Other", "#8a8d9c"],
];
const START: Log[] = [
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
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
const signedMoney = (n: number) => `${n > 0 ? "+" : n < 0 ? "-" : ""}${money(Math.abs(n))}`;
const logToRow = (log: Log, userId: string): LogRow => ({
  id: log.id,
  user_id: userId,
  type: log.type,
  amount: log.amount,
  category: log.category,
  title: log.title,
  date_label: log.date,
  date_key: log.dateKey || null,
  note: log.note || null,
  screenshot: Boolean(log.screenshot),
});
const rowToLog = (row: LogRow): Log => ({
  id: Number(row.id),
  type: row.type,
  amount: Number(row.amount),
  category: row.category,
  title: row.title,
  date: row.date_label,
  dateKey: row.date_key || undefined,
  note: row.note || undefined,
  screenshot: row.screenshot,
});
const trackProductEvent = async (
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
const errorMetadata = (
  error: unknown,
  source: string,
  fallbackCode: string,
): Record<string, string | number | boolean> => {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const message = error instanceof Error ? error.message : typeof value.message === "string" ? value.message : "Unknown error";
  return {
    code: fallbackCode,
    source,
    error_code: String(value.code || value.name || "unknown").slice(0, 60),
    status: typeof value.status === "number" ? value.status : 0,
    message: message.slice(0, 180),
    hint: typeof value.hint === "string" ? value.hint.slice(0, 180) : "",
  };
};
function Logo() {
  return (
    <div className="logo">
      <span>U</span>
      <ArrowUpRight />
    </div>
  );
}
function AuthWelcome({ onDemo }: { onDemo: () => void }) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const continueWithGoogle = async () => {
    setErrorMessage("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          scopes: "openid email profile",
        },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-brand"><Logo /><b>UPBY</b></div>
        <div className="auth-orbit" aria-hidden="true">
          <motion.i className="auth-main-icon" animate={{ rotate: [0, 5, 0], y: [0, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity }}>
            <ArrowUpRight />
          </motion.i>
          <motion.i className="auth-float win" animate={{ y: [0, -10, 0] }} transition={{ duration: 2.2, repeat: Infinity }}><Trophy /></motion.i>
          <motion.i className="auth-float streak" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><Flame /></motion.i>
          <motion.i className="auth-float progress" animate={{ rotate: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}><PartyPopper /></motion.i>
        </div>
        <div className="auth-art-copy">
          <span>YOUR PROGRESS, IN ONE PLACE</span>
          <h1>How much are you up by?</h1>
          <p>Log the wins. Record the losses. See the full picture.</p>
        </div>
        <div className="auth-proof">
          <span><b>12</b> day streak</span>
          <span><b>+4.2K</b> this month</span>
          <span><b>#38</b> global</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><Logo /><b>UPBY</b></div>
        <div className="auth-copy">
          <span>WELCOME TO UPBY</span>
          <h2>Start tracking your progress.</h2>
          <p>Create your profile and keep every win and loss in one place.</p>
        </div>
        <div className="auth-actions">
          <button className="google-button" onClick={continueWithGoogle} disabled={busy}>
            {busy ? <LoaderCircle className="spin" /> : <i>G</i>}
            Continue with Google
          </button>
          <p className="google-privacy-note"><ShieldCheck />UPBY only receives your basic name, email, and profile picture.</p>
          {errorMessage && <p className="auth-message error">{errorMessage}</p>}
        </div>
        <div className="auth-divider"><span>OR</span></div>
        <button className="demo-button" onClick={onDemo}>Explore the demo <ArrowUpRight /></button>
        <p className="auth-terms">By continuing, you agree to UPBY’s <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.</p>
      </section>
    </main>
  );
}
function Onboarding({ onComplete, onBack, initialProfile = DEFAULT_PROFILE }: { onComplete: (profile: ProfileData, prefs: number[]) => void; onBack: () => void; initialProfile?: ProfileData }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [username, setUsername] = useState(initialProfile.username);
  const [xProfile, setXProfile] = useState(initialProfile.xProfile === DEFAULT_PROFILE.xProfile && initialProfile.username !== DEFAULT_PROFILE.username ? "" : initialProfile.xProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatarUrl);
  const [privacy, setPrivacy] = useState([true, true, true, false, true, true]);
  const validIdentity = displayName.trim().length > 1 && username.trim().length >= 3;
  const next = () => setStep((value) => Math.min(3, value + 1));
  const previous = () => step === 0 ? onBack() : setStep((value) => Math.max(0, value - 1));
  const privacyLabels = [
    ["Show monetary totals", "Display monthly and yearly UPBY totals"],
    ["Show individual logs", "Let people see your public activity"],
    ["Show losses", "Include losses on your public profile"],
    ["Show screenshots", "Display screenshots attached to public logs"],
    ["Appear in rankings", "Only controls the Global leaderboard"],
    ["Public profile", "Turn this off to hide your full profile from everyone"],
  ];
  return (
    <main className="onboarding-page">
      <aside className="onboarding-preview">
        <div className="auth-brand"><Logo /><b>UPBY</b></div>
        <span>YOUR PROFILE PREVIEW</span>
        <div className="preview-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : displayName.slice(0, 1).toUpperCase()}
          <i />
        </div>
        <h2>{displayName || "Your name"}</h2>
        <b>@{username || "username"}</b>
        {xProfile && <p>𝕏 @{xProfile.replace(/^@/, "")}</p>}
        <div className="preview-score"><span>UP BY THIS MONTH</span><strong>+$0</strong><small>Your first log starts here.</small></div>
        <div className="preview-tags"><span><Flame />0 day streak</span><span><Trophy />0 achievements</span></div>
      </aside>
      <section className="onboarding-form">
        <header>
          <button onClick={previous}><ChevronLeft /></button>
          <div className="onboarding-progress">
            {[0, 1, 2, 3].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}
          </div>
          <span>{step + 1} / 4</span>
        </header>
      <AnimatePresence mode="wait">
          <motion.div className="onboarding-step" key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            {step === 0 && <>
              <span>YOUR IDENTITY</span>
              <h1>What should people call you?</h1>
              <p>This creates your UPBY profile and public link.</p>
              <label><span>DISPLAY NAME</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
              <label><span>USERNAME</span><div className="username-field"><b>upby.app/</b><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username" /><i className={username.length >= 3 ? "available" : ""}>{username.length >= 3 ? <Check /> : null}</i></div></label>
              {username.length >= 3 && <small className="available-copy">@{username} is available</small>}
            </>}
            {step === 1 && <>
              <span>MAKE IT YOURS</span>
              <h1>Add your face and X profile.</h1>
              <p>Both are optional. You can update them later.</p>
              <div className="avatar-upload">
                <div>{avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : displayName.slice(0, 1).toUpperCase()}</div>
                <label><Camera />Choose photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file); } }} /></label>
                {avatarUrl && <button onClick={() => setAvatarUrl(null)}>Remove</button>}
              </div>
              <label><span>OPTIONAL X PROFILE</span><div className="x-field"><b>𝕏 @</b><input value={xProfile} onChange={(event) => setXProfile(event.target.value.replace(/^@/, ""))} placeholder="yourhandle" /></div></label>
            </>}
            {step === 2 && <>
              <span>YOUR PRIVACY</span>
              <h1>You decide what people see.</h1>
              <p>These settings affect your public profile and leaderboard.</p>
              <div className="onboarding-privacy">
                {privacyLabels.map(([label, copy], index) => <div key={label}><div><b>{label}</b><span>{copy}</span></div><button className={privacy[index] ? "on" : ""} onClick={() => setPrivacy((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))}><i /></button></div>)}
              </div>
            </>}
            {step === 3 && <>
              <div className="ready-icon"><Check /></div>
              <span>YOU’RE READY</span>
              <h1>Your UPBY profile is set.</h1>
              <p>Start by logging your first win or loss. Every entry builds your progress story.</p>
              <div className="ready-summary"><span><b>@{username}</b>{privacy[5] ? "Public profile" : "Private profile"}</span><span><b>{privacy[4] && privacy[5] ? "Visible" : "Hidden"}</b>Leaderboard status</span><span><b>Private by default</b>Screenshot visibility</span></div>
            </>}
          </motion.div>
        </AnimatePresence>
        <footer>
          {step < 3 ? (
            <button className="onboarding-next" disabled={step === 0 && !validIdentity} onClick={next}>
              CONTINUE <ArrowUpRight />
            </button>
          ) : (
            <button className="onboarding-next finish" onClick={() => onComplete({ displayName: displayName.trim(), username: username.trim(), xProfile: xProfile.trim(), avatarUrl }, privacy.map(Number))}>
              OPEN MY UPBY <ArrowUpRight />
            </button>
          )}
          {step === 1 && <button className="skip-step" onClick={() => { setXProfile(""); next(); }}>Skip for now</button>}
        </footer>
      </section>
    </main>
  );
}
async function authenticatedWrite(action: () => PromiseLike<{ error: any }>) {
  let result = await action();
  if (result.error && (result.error.code === "PGRST303" || /jwt|token.*expired/i.test(result.error.message || ""))) {
    const { error } = await supabase.auth.refreshSession();
    if (error) throw error;
    result = await action();
  }
  if (result.error) throw result.error;
}
function localToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export default function App() {
  const [calendarDay, setCalendarDay] = useState(localToday);
  useEffect(() => {
    const refresh = () => setCalendarDay(localToday());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  const [stage, setStage] = useState<"auth" | "onboarding" | "app">("auth"),
    [tab, setTab] = useState<Tab>("home"),
    [logs, setLogs] = useState(START),
    [freshStart, setFreshStart] = useState(false),
    [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE),
    [prefs, setPrefs] = useState(DEFAULT_PREFS),
    [following, setFollowing] = useState<string[]>(["Maya"]),
    [customCategories, setCustomCategories] = useState<Array<[string, string]>>([]),
    [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]),
    [followerCount, setFollowerCount] = useState(0),
    [hydrated, setHydrated] = useState(false),
    [authReady, setAuthReady] = useState(false),
    [authUser, setAuthUser] = useState<any>(null),
    [countryCode, setCountryCode] = useState(""),
    [demoMode, setDemoMode] = useState(false),
    [sheet, setSheet] = useState<"win" | "loss" | null>(null),
    [editing, setEditing] = useState<Log | null>(null),
    [board, setBoard] = useState(false),
    [quick, setQuick] = useState(false),
    [share, setShare] = useState<Log | null>(null),
    [success, setSuccess] = useState<Log | null>(null),
    [toast, setToast] = useState("");
  const writing = useRef(false);
  const revision = useRef(0);
  const draftId = useRef<number | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoLog, setUndoLog] = useState<{ log: Log; owner: string | null } | null>(null);
  const [repeatLog, setRepeatLog] = useState<Log | null>(null);
  useEffect(() => {
    setUndoLog(null); setRepeatLog(null); setSaveStatus(""); draftId.current = null;
  }, [authUser?.id]);
  useEffect(() => {
    if (!undoLog || busy) return;
    const timer = window.setTimeout(() => setUndoLog(null), 10000);
    return () => window.clearTimeout(timer);
  }, [undoLog, busy]);
  useEffect(() => {
    let active = true;
    const applyUser = (user: any) => {
      if (!active) return;
      setAuthUser(user);
      if (user) {
        const metadata = user.user_metadata || {};
        const suggestedUsername = String(user.email || "member").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
        const incomingUsername = metadata.username || suggestedUsername || "";
        const incomingXProfile = metadata.x_profile || "";
        setProfile((current) => ({
          displayName: metadata.display_name || metadata.full_name || metadata.name || current.displayName,
          username: incomingUsername || current.username,
          xProfile: incomingXProfile === DEFAULT_PROFILE.xProfile && incomingUsername !== DEFAULT_PROFILE.username
            ? ""
            : incomingXProfile || (metadata.onboarding_complete ? current.xProfile : ""),
          avatarUrl: metadata.upby_avatar_url || (metadata.onboarding_complete ? current.avatarUrl : metadata.avatar_url || current.avatarUrl),
        }));
        setStage(metadata.onboarding_complete ? "app" : "onboarding");
        setDemoMode(false);
      }
      setAuthReady(true);
    };
    void Promise.resolve(supabase.auth.getSession())
      .then(({ data }) => applyUser(data.session?.user || null))
      .catch(() => {
        if (!active) return;
        setAuthUser(null);
        setAuthReady(true);
      });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      applyUser(session?.user || null);
      if (event === "SIGNED_IN" && session?.user) {
        const eventKey = `upby:signed-in:${session.user.id}`;
        if (!window.sessionStorage.getItem(eventKey)) {
          window.sessionStorage.setItem(eventKey, "1");
          void trackProductEvent(session.user.id, "signed_in", "auth", { provider: session.user.app_metadata?.provider || "unknown" });
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!authUser || demoMode) return;
    let active = true;
    void fetch("/api/region", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Region lookup failed")))
      .then((result: { country?: string }) => {
        if (active && /^[A-Z]{2}$/.test(result.country || "")) setCountryCode(result.country || "");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [authUser?.id, demoMode]);
  useEffect(() => {
    if (!authReady) return;
    if (!authUser) {
      setHydrated(true);
      return;
    }
    let active = true;
    const userStorageKey = `${STORAGE_KEY}:${authUser.id}`;
    const applySavedState = (saved: Partial<PersistedState>) => {
      if (!active || saved.version !== 2 || saved.ownerId !== authUser.id) return false;
      if (saved.stage === "onboarding" || saved.stage === "app") setStage(saved.stage);
      if (saved.tab === "home" || saved.tab === "insights" || saved.tab === "profile") setTab(saved.tab);
      setFreshStart(true);
      if (saved.profile && typeof saved.profile.displayName === "string" && typeof saved.profile.username === "string") setProfile({ ...DEFAULT_PROFILE, ...saved.profile });
      if (Array.isArray(saved.prefs) && saved.prefs.length >= 5) {
        const restored = saved.prefs.slice(0, 6).map((value) => Number(Boolean(value)));
        if (restored.length === 5) restored.push(1);
        setPrefs(restored);
      }
      if (Array.isArray(saved.following)) setFollowing(saved.following.filter((value): value is string => typeof value === "string"));
      if (Array.isArray(saved.customCategories)) setCustomCategories(saved.customCategories.filter((item): item is [string, string] => Array.isArray(item) && typeof item[0] === "string" && typeof item[1] === "string"));
      return true;
    };
    const resetAccount = () => {
      if (!active) return;
      setStage(authUser.user_metadata?.onboarding_complete ? "app" : "onboarding");
      setTab("home");
      setLogs([]);
      setFreshStart(true);
      setPrefs(DEFAULT_PREFS);
      setFollowing([]);
      setCustomCategories([]);
    };
    const hydrateAccount = async () => {
      setHydrated(false);
      try {
        const [
          { data: stateData, error: stateError },
          { data: savedProfile, error: savedProfileError },
          { data: followedRows, error: followsError },
          { count: followers, error: followersError },
          { data: logRows, error: logsError },
        ] = await Promise.all([
          supabase.from("user_states").select("state").eq("user_id", authUser.id).maybeSingle(),
          supabase.from("profiles").select("display_name,username,avatar_url,bio,x_profile,show_totals,show_logs,show_losses,show_screenshots,leaderboard_enabled,public_profile_enabled").eq("user_id", authUser.id).maybeSingle(),
          supabase.from("follows").select("followed_id").eq("follower_id", authUser.id),
          supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq("followed_id", authUser.id),
          supabase.from("logs").select("id,user_id,type,amount,category,title,date_label,date_key,note,screenshot").eq("user_id", authUser.id).order("id", { ascending: false }),
        ]);
        const queryErrors = [
          ["user_states", stateError],
          ["profiles", savedProfileError],
          ["following", followsError],
          ["followers", followersError],
          ["logs", logsError],
        ] as const;
        queryErrors.forEach(([source, error]) => {
          if (error) void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, source, "hydrate_query_failed"));
        });

        let localState: Partial<PersistedState> | undefined;
        try {
          const raw = window.localStorage.getItem(userStorageKey);
          localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
        } catch (error) {
          void trackProductEvent(authUser.id, "client_error", "storage", errorMetadata(error, "local_state", "local_state_invalid"));
          window.localStorage.removeItem(userStorageKey);
        }
        const remoteState = stateError ? undefined : stateData?.state as Partial<PersistedState> | undefined;
        const savedState = remoteState && applySavedState(remoteState)
          ? remoteState
          : localState && applySavedState(localState)
            ? localState
            : undefined;
        if (!savedState) resetAccount();

        if (!savedProfileError && savedProfile && active) {
          setProfile((current) => ({
            ...current,
            displayName: savedProfile.display_name || current.displayName,
            username: savedProfile.username || current.username,
            avatarUrl: savedProfile.avatar_url,
            bio: savedProfile.bio || current.bio,
            xProfile: savedProfile.x_profile === DEFAULT_PROFILE.xProfile && savedProfile.username !== DEFAULT_PROFILE.username ? "" : savedProfile.x_profile || "",
          }));
          setPrefs([
            Number(savedProfile.show_totals),
            Number(savedProfile.show_logs),
            Number(savedProfile.show_losses),
            Number(savedProfile.show_screenshots),
            Number(savedProfile.leaderboard_enabled),
            Number(savedProfile.public_profile_enabled),
          ]);
        }

        if (!followsError && active) {
          setFollowing((followedRows || []).map((row: { followed_id: string }) => row.followed_id));
        }
        if (!followersError && active) {
          setFollowerCount(followers || 0);
        }

        if (!logsError) {
          const remoteLogs = (logRows as LogRow[] | null)?.map(rowToLog) || [];
          if (active) setLogs(remoteLogs);
        } else if (active && Array.isArray(localState?.logs)) {
          setLogs(localState.logs);
        }
      } catch (error) {
        void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, "hydrate_account", "hydrate_rejected"));
        try {
          const raw = window.localStorage.getItem(userStorageKey);
          const localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
          if (!localState || !applySavedState(localState)) resetAccount();
          else if (active && Array.isArray(localState.logs)) setLogs(localState.logs);
        } catch (storageError) {
          void trackProductEvent(authUser.id, "client_error", "storage", errorMetadata(storageError, "local_state", "local_state_invalid"));
          window.localStorage.removeItem(userStorageKey);
          resetAccount();
        }
      } finally {
        if (active) setHydrated(true);
      }
    };
    hydrateAccount();
    return () => { active = false; };
  }, [authReady, authUser?.id]);
  useEffect(() => {
    if (!hydrated || !authUser || demoMode) return;
    let active = true;
    let refreshing = false;
    let lastRealtimeError = 0;
    let recoveringAuth = false;
    const refreshLogs = async () => {
      if (refreshing || writing.current) return;
      refreshing = true;
      const requestRevision = revision.current;
      try {
        const { data, error } = await supabase
          .from("logs")
          .select("id,user_id,type,amount,category,title,date_label,date_key,note,screenshot")
          .eq("user_id", authUser.id)
          .order("id", { ascending: false });
        if (error) throw error;
        if (active && !writing.current && requestRevision === revision.current) setLogs((data as LogRow[] | null)?.map(rowToLog) || []);
      } catch (error) {
        void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, "logs", "log_refresh_failed"));
      } finally {
        refreshing = false;
      }
    };
    const onFocus = () => { void refreshLogs(); };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refreshLogs();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const channel = supabase
      .channel(`upby-logs-${authUser.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logs", filter: `user_id=eq.${authUser.id}` },
        () => { void refreshLogs(); },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") { void refreshLogs(); return; }
        if (/jwt|token.*expired/i.test(error?.message || "") && !recoveringAuth) {
          recoveringAuth = true;
          void supabase.auth.refreshSession().then(async ({ data, error: refreshError }) => {
            if (!refreshError && data.session && active) {
              await supabase.realtime.setAuth(data.session.access_token);
              await refreshLogs();
            }
          }).catch(() => undefined).finally(() => { recoveringAuth = false; });
        }

        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && document.visibilityState === "visible" && navigator.onLine && Date.now() - lastRealtimeError > 60000) {
          lastRealtimeError = Date.now();
          void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, "logs_realtime", "realtime_failed"));
        }
      });
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [hydrated, authUser?.id, demoMode]);
  useEffect(() => {
    if (!hydrated || !authUser) return;
    const saved: PersistedState = { version: 2, ownerId: authUser.id, stage, tab, logs, freshStart: true, profile, prefs, following, customCategories };
    const remoteState: PersistedState = { ...saved, logs: [] };
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:${authUser.id}`, JSON.stringify(saved));
    } catch {
      void trackProductEvent(authUser.id, "client_error", "storage", { code: "local_save_failed" });
      setToast("Your browser could not save this update");
    }
    const syncTimer = window.setTimeout(async () => {
      try {
        const { error } = await supabase.from("user_states").upsert(
          { user_id: authUser.id, state: remoteState, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
        if (error) void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, "user_states", "state_sync_failed"));
      } catch (error) {
        void trackProductEvent(authUser.id, "client_error", "sync", errorMetadata(error, "user_states", "state_sync_rejected"));
      }
    }, 500);
    return () => window.clearTimeout(syncTimer);
  }, [hydrated, authUser, stage, tab, logs, freshStart, profile, prefs, following, customCategories]);
  useEffect(() => {
    if (!hydrated || !authUser || stage !== "app" || demoMode) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { error: profileError } = await supabase.from("profiles").upsert({
          user_id: authUser.id,
          display_name: profile.displayName,
          username: profile.username,
          avatar_url: profile.avatarUrl?.startsWith("data:") ? null : profile.avatarUrl,
          bio: profile.bio || "",
          x_profile: profile.xProfile || "",
          show_totals: Boolean(prefs[0]),
          show_logs: Boolean(prefs[1]),
          show_losses: Boolean(prefs[2]),
          show_screenshots: Boolean(prefs[3]),
          leaderboard_enabled: Boolean(prefs[4]),
          public_profile_enabled: Boolean(prefs[5]),
          ...(countryCode ? { country_code: countryCode } : {}),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
        if (profileError) {
          void trackProductEvent(authUser.id, "client_error", "profile", errorMetadata(profileError, "profiles", "profile_sync_failed"));
          return;
        }
        const { data, error } = await supabase.rpc("get_leaderboard", { leaderboard_period: "this_month" });
        if (!error && active) setLeaderboard((data || []) as LeaderboardEntry[]);
      } catch (error) {
        void trackProductEvent(authUser.id, "client_error", "profile", errorMetadata(error, "profiles", "profile_sync_rejected"));
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [hydrated, authUser?.id, stage, demoMode, profile.displayName, profile.username, profile.avatarUrl, profile.bio, profile.xProfile, prefs, logs, countryCode]);
  useEffect(() => {
    if (!hydrated || !authUser || demoMode) return;
    void trackProductEvent(authUser.id, "screen_view", "navigation", { screen: stage === "app" ? tab : stage });
  }, [hydrated, authUser?.id, demoMode, stage, tab]);
  useEffect(() => {
    if (!hydrated || !authUser || demoMode) return;
    const reportError = (code: string) => {
      const key = `upby:runtime-error:${authUser.id}:${code}`;
      const now = Date.now();
      const lastReport = Number(window.sessionStorage.getItem(key) || 0);
      if (now - lastReport < 60_000) return;
      window.sessionStorage.setItem(key, String(now));
      void trackProductEvent(authUser.id, "client_error", "runtime", { code });
    };
    const onError = (event: ErrorEvent) => {
      if (/ResizeObserver loop|Script error/i.test(event.message || "")) return;
      reportError("window_error");
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const name = reason instanceof DOMException ? reason.name : "";
      if (name === "AbortError" || name === "NotAllowedError") return;
      const message = reason instanceof Error ? reason.message : String(reason || "");
      reportError(/failed to fetch|load failed|network/i.test(message) ? "network_rejection" : "unhandled_rejection");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [hydrated, authUser?.id, demoMode]);
  const monthlyStats = useMemo(() => periodSummary(logs, calendarDay.slice(0,7)), [logs, calendarDay]);
  const { wins, losses, net } = monthlyStats;
  const nav = (x: Tab) => {
    setTab(x);
    scrollTo({ top: 0, behavior: "auto" });
  };
  const showSuccess = (log: Log) => {
    setSuccess(log);
    setTimeout(() => setSuccess(null), 1600);
  };
  const persistLog = async (log: Log, operation: "create" | "update" | "restore") => {
    if (writing.current) return;
    writing.current = true; revision.current += 1; setBusy(true); setSaveStatus("Saving entry…");
    try {
      if (authUser) await authenticatedWrite(() => supabase.from("logs").upsert(logToRow(log, authUser.id), { onConflict: "user_id,id" }));
      setLogs(items => [log, ...items.filter(item => item.id !== log.id)].sort((a, b) => b.id - a.id));
      if (operation !== "restore") {
        setSheet(null); setEditing(null); setRepeatLog(null); draftId.current = null;
        showSuccess(log);
      } else setUndoLog(null);
      setSaveStatus(authUser ? "Entry saved" : "Saved in demo");
      if (authUser) void trackProductEvent(authUser.id, operation === "update" ? "log_updated" : "log_created", "logs", { type: log.type, category: log.category });
    } catch (error) {
      if (operation === "restore") setUndoLog({ log, owner: authUser?.id || null });
      setSaveStatus(operation === "restore" ? "Restore failed. Tap Undo to retry." : "Entry not saved. Your draft is still open. Tap Retry.");
      if (authUser) void trackProductEvent(authUser.id, "client_error", "logs", errorMetadata(error, "logs", `${operation}_failed`));
    } finally { writing.current = false; revision.current += 1; setBusy(false); }
  };
  const add = (data: Omit<Log, "id">) => {
    if (!draftId.current) draftId.current = Date.now();
    return persistLog({ ...data, id: draftId.current }, "create");
  };
  const updateLog = (id: number, data: Omit<Log, "id">) => persistLog({ ...data, id }, "update");
  const removeLog = async (id: number) => {
    if (writing.current) return;
    const removed = logs.find(item => item.id === id);
    if (!removed) return;
    writing.current = true; revision.current += 1; setBusy(true); setSaveStatus("Deleting entry…");
    try {
      if (authUser) await authenticatedWrite(() => supabase.from("logs").delete().eq("user_id", authUser.id).eq("id", id));
      setLogs(items => items.filter(item => item.id !== id));
      setEditing(null);
      setUndoLog({ log: removed, owner: authUser?.id || null });
      setSaveStatus("Entry deleted");
      if (authUser) void trackProductEvent(authUser.id, "log_deleted", "logs");
    } catch (error) {
      setSaveStatus("Delete failed. Your entry is still here. Try again.");
      if (authUser) void trackProductEvent(authUser.id, "client_error", "logs", errorMetadata(error, "logs", "delete_failed"));
    } finally { writing.current = false; revision.current += 1; setBusy(false); }
  };
  const signOut = async () => {
    if (authUser) {
      await trackProductEvent(authUser.id, "signed_out", "auth");
      await supabase.auth.signOut();
    }
    setAuthUser(null);
    setDemoMode(false);
    setStage("auth");
    setTab("home");
  };
  if (!hydrated || !authReady) {
    return <main className="auth-loading"><Logo /><LoaderCircle className="spin" /><span>Loading your progress</span></main>;
  }
  if (!authUser && !demoMode) {
    return <AuthWelcome onDemo={() => { setDemoMode(true); setProfile(DEFAULT_PROFILE); setPrefs(DEFAULT_PREFS); setFollowing(["Maya"]); setCustomCategories([]); setFreshStart(false); setLogs(START); setStage("app"); }} />;
  }
  if (stage === "onboarding") {
    return <Onboarding onComplete={async (nextProfile, nextPrefs) => {
      const { error } = await supabase.auth.updateUser({ data: { display_name: nextProfile.displayName, username: nextProfile.username, x_profile: nextProfile.xProfile, upby_avatar_url: nextProfile.avatarUrl?.startsWith("data:") ? null : nextProfile.avatarUrl, onboarding_complete: true } });
      if (error) return;
      void trackProductEvent(authUser?.id, "onboarding_completed", "onboarding");
      setProfile(nextProfile); setPrefs(nextPrefs); setFollowing([]); setCustomCategories([]); setFreshStart(true); setLogs([]); setTab("home"); setStage("app");
    }} onBack={signOut} initialProfile={profile} />;
  }
  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo />
        <nav>
          {(["home", "insights", "profile"] as Tab[]).map((x) => (
            <button
              className={tab === x ? "active" : ""}
              onClick={() => nav(x)}
              key={x}
            >
              {x}
            </button>
          ))}
          <button className="desktop-log" onClick={() => setQuick(true)}>
            <Plus /> Log
          </button>
        </nav>
        <button className="avatar" onClick={() => nav("profile")}>
          {profile.displayName.slice(0, 1).toUpperCase()}
        </button>
      </header>
        {saveStatus && <div className="entry-status" role="status">{saveStatus}</div>}
      {undoLog && <div className="entry-undo" role="status">Entry deleted <button disabled={busy} onClick={() => { if (undoLog.owner === (authUser?.id || null)) void persistLog(undoLog.log, "restore"); }}>Undo</button></div>}
      <AnimatePresence mode="wait">
        <motion.main
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
        >
          {tab === "home" ? (
            <HomeView
              {...{
                net,
                wins,
                losses,
                logs,
                setSheet,
                setBoard,
                setShare,
                setEditing,
                removeLog,
                repeatEntry: (log: Log) => { draftId.current = null; setRepeatLog({ ...log, date: "Today", dateKey: localToday(), screenshot: false }); setSheet(log.type); },
                freshStart,
                profile,
                leaderboard,
                authUserId: authUser?.id,
              }}
            />
          ) : tab === "insights" ? (
            <Insights {...{ net, wins, losses, logs, freshStart, profile }} />
          ) : (
            <Profile {...{ net, wins, losses, logs, freshStart, profile, setProfile, prefs, setPrefs, authUser, demoMode, signOut, followingCount: following.length, followerCount, startLog: () => setQuick(true) }} />
          )}
        </motion.main>
      </AnimatePresence>
      <Bottom tab={tab} nav={nav} add={() => setQuick(true)} />
      <AnimatePresence>
        {quick && (
          <QuickLog
            close={() => setQuick(false)}
            choose={(type) => {
              setQuick(false);
              setSheet(type);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {(sheet || editing) && (
          <LogSheet
            type={editing?.type || sheet}
            initial={editing || repeatLog}
            isRepeat={Boolean(repeatLog && !editing)}
            busy={busy}
            saveError={saveStatus.startsWith("Entry not saved")}
            defaultCategory={logs.find(log => log.type === sheet)?.category}
            close={() => { if (!busy) { setSheet(null); setEditing(null); setRepeatLog(null); draftId.current = null; } }}
            save={(data: Omit<Log, "id">) => editing ? updateLog(editing.id, data) : add(data)}
            remove={editing ? () => removeLog(editing.id) : undefined}
            customCategories={customCategories}
            onAddCustom={(item: [string, string]) => setCustomCategories((items) => items.some(([name]) => name.toLowerCase() === item[0].toLowerCase()) ? items : [...items, item])}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {board && <Leaderboard close={() => setBoard(false)} following={following} setFollowing={setFollowing} freshStart={freshStart} profile={profile} net={net} logs={logs} leaderboard={leaderboard} authUserId={authUser?.id} />}
      </AnimatePresence>
      <AnimatePresence>
        {share && <Share log={share} net={net} displayName={profile.displayName} close={() => setShare(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {success && <LogSuccess log={success} />}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Check />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
function HomeView({
  net,
  wins,
  losses,
  logs,
  setSheet,
  setBoard,
  setShare,
  setEditing,
  removeLog,
  repeatEntry,
  freshStart,
  profile,
  leaderboard,
  authUserId,
}: any) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filters, setFilters] = useState<LogFilters>(emptyFilters);
  const [viewAll, setViewAll] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const filteredLogs = useMemo(() => filterLogs(logs as Log[], filters), [logs, filters]);
  const totals = useMemo(() => logTotals(filteredLogs), [filteredLogs]);
  const categories = useMemo(() => Array.from(new Set((logs as Log[]).map(log => log.category))).sort(), [logs]);
  const hasFilters = Object.values(filters).some(Boolean);
  const browsing = viewAll || hasFilters;
  const shownLogs = filteredLogs.slice(0, browsing ? visibleCount : 5);
  const invalidRange = !!(filters.from && filters.to && filters.from > filters.to);
  const updateFilter = (key: keyof LogFilters, value: string) => {
    setFilters(current => ({ ...current, [key]: value }));
    setVisibleCount(20);
    setExpanded(null);
  };
  const resetFilters = () => { setFilters(emptyFilters); setVisibleCount(20); };
  const formatTotal = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  const [streakDay, setStreakDay] = useState<number | null>(null);
  const firstEntry = freshStart && logs.length === 1 ? logs[0] as Log | undefined : undefined;
  const isEmpty = freshStart && logs.length === 0;
  const activity = activityStats(logs, localToday());
  const streak = activity.current;

  const liveLeaderboard: LeaderboardEntry[] = freshStart && leaderboard.length ? leaderboard : [{ rank: 1, user_id: authUserId, display_name: profile.displayName, username: profile.username, avatar_url: profile.avatarUrl, net, streak }];
  const ownLeaderboardEntry = liveLeaderboard.find((entry) => entry.user_id === authUserId) || liveLeaderboard[0];
  if (isEmpty) {
    return (
      <div className="page first-home">
        <section className="first-hero">
          <div className="first-greeting">
            <p>Good afternoon,</p>
            <h1>{profile.displayName}.</h1>
          </div>
          <div className="first-total">
            <span>YOU’RE UP BY</span>
            <motion.strong initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>$0</motion.strong>
            <b>THIS MONTH</b>
          </div>
          <div className="first-split"><span><i className="win" />$0 wins</span><span><i className="loss" />$0 losses</span></div>
          <div className="hero-actions first-actions">
            <button className="win" onClick={() => setSheet("win")}><TrendingUp />LOG FIRST WIN</button>
            <button className="loss" onClick={() => setSheet("loss")}><TrendingDown />LOG FIRST LOSS</button>
          </div>
        </section>
        <MonthlyGoal key={authUserId || "demo"} client={supabase} userId={authUserId} logs={logs} />
        <section className="first-next">
          <div className="first-next-copy">
            <span>YOUR FIRST ENTRY</span>
            <h2>One log starts everything.</h2>
            <p>Your total, daily net, streak and recent activity will update together.</p>
            <div className="first-flow">
              <div><i><Plus /></i><span><b>Log progress</b><small>Add a win or loss</small></span></div>
              <div><i><Zap /></i><span><b>See it update</b><small>Your month changes instantly</small></span></div>
              <div><i><Flame /></i><span><b>Build a streak</b><small>Any daily log keeps it moving</small></span></div>
            </div>
          </div>
          <div className="first-badge">
            <span>FIRST BADGE</span>
            <motion.i animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 3, repeat: Infinity }}><Trophy /></motion.i>
            <h3>FIRST WIN</h3>
            <p>Log your first win to collect it.</p>
            <b><Lock /> LOCKED</b>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="page">
      <section className="hero">
        <div className="hello">
          <p>Good afternoon,</p>
          <h1>{profile.displayName}.</h1>
        </div>
        <div className="hero-number">
          <span>YOU’RE UP BY</span>
          <motion.strong
            key={net}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            {signedMoney(net)}
          </motion.strong>
          <em>THIS MONTH</em>
          <motion.small
            className="month-comparison"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <><CalendarDays /> Today’s net · {signedMoney(activity.todayNet)}</>
          </motion.small>
        </div>
        <div className="split">
          <span>
            <i className="win" />
            {money(wins)} wins
          </span>
          <span>
            <i className="loss" />
            {money(losses)} losses
          </span>
        </div>
        <div className="hero-actions">
          <button className="win" onClick={() => setSheet("win")}>
            <Plus />
            LOG WIN
          </button>
          <button className="loss" onClick={() => setSheet("loss")}>
            <Plus />
            LOG LOSS
          </button>
        </div>
      </section>
      <MonthlyGoal key={authUserId || "demo"} client={supabase} userId={authUserId} logs={logs} />
      {freshStart && firstEntry && (
        <motion.section className={`first-unlocked ${firstEntry.type}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <i>{firstEntry.type === "win" ? <Trophy /> : <ShieldCheck />}</i>
          <div><span>FIRST ENTRY LOGGED</span><h2>{firstEntry.type === "win" ? "First win collected." : "First loss recorded."}</h2><p>Your Home is live. Today’s net is {signedMoney(activity.todayNet)}.</p></div>
          <div className="first-unlocked-stat"><b>{streak}</b><span>DAY STREAK</span></div>
        </motion.section>
      )}
      <div className="duo">
        <section className="streak block">
          <label>
            <Flame />
            CURRENT STREAK
          </label>
          <div>
            <strong>{streak}</strong>
            <b>
              DAYS
              <br />
              IN A ROW
            </b>
          </div>
          <aside>
            {["M", "T", "W", "T", "F", "S", "S"].map((x, i) => (
              <button
                className={streakDay === i ? "selected-day" : ""}
                onClick={() => setStreakDay(streakDay === i ? null : i)}
                key={i}
              >
                <i className={activity.weekActive[i] ? "done" : ""}>{activity.weekActive[i] && <Check />}</i>
                {x}
              </button>
            ))}
          </aside>
          <AnimatePresence mode="wait">
            <motion.p
              key={streakDay ?? "default"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {streakDay === null
                ? "Your streak counts consecutive days with a win or loss."
                : `${activity.week[streakDay]} · ${activity.weekActive[streakDay] ? "progress logged" : "No log on this day."}`}
            </motion.p>
          </AnimatePresence>
        </section>
        <button className="rank block" onClick={() => setBoard(true)}>
          <label>
            <Globe2 />
            GLOBAL THIS MONTH
          </label>
          <h2>
            YOU’RE <strong>{freshStart ? `#${ownLeaderboardEntry.rank}` : "#38"}</strong>
            <ArrowUpRight />
          </h2>
          {(freshStart ? liveLeaderboard.slice(0, 5).map((entry) => [Number(entry.rank), entry.display_name, signedMoney(Number(entry.net)), entry.user_id]) : [
            [36, "Maya", "+8.1K"],
            [37, "Chris", "+6.4K"],
            [38, "Damian", "+4.3K"],
            [39, "Noah", "+4.1K"],
            [40, "Alex", "+3.8K"],
          ]).map((x) => (
            <div className={freshStart ? x[3] === authUserId ? "me" : "" : x[0] === 38 ? "me" : ""} key={`${x[0]}-${x[1]}`}>
              <b>#{x[0]}</b>
              <span>{x[1]}</span>
              <em>{x[2]}</em>
            </div>
          ))}
        </button>
      </div>
      <section className="recent">
        <div className="title">
          <div><span>YOUR ACTIVITY</span><h2>{browsing ? "Your logs" : "Recent logs"}</h2></div>
          <button onClick={() => { setViewAll(!browsing); resetFilters(); setExpanded(null); }}>
            {browsing ? "Recent only" : "View all"}<ArrowUpRight />
          </button>
        </div>
        <section className="log-browser" aria-label="Search and filter logs">
          <label className="log-search"><Search size={18} /><input type="search" aria-label="Search log titles and notes" placeholder="Search titles or notes" value={filters.query} onChange={e => updateFilter("query", e.target.value)} /></label>
          <details>
            <summary>Filters{hasFilters ? " · Active" : ""}</summary>
            <div className="log-filter-fields">
              <label>Category<select value={filters.category} onChange={e => updateFilter("category", e.target.value)}><option value="">All categories</option>{categories.map(category => <option key={category} value={category}>{category}</option>)}</select></label>
              <label>Entry type<select value={filters.type} onChange={e => updateFilter("type", e.target.value)}><option value="">Wins and losses</option><option value="win">Wins</option><option value="loss">Losses</option></select></label>
              <label>From<input type="date" value={filters.from} onChange={e => updateFilter("from", e.target.value)} /></label>
              <label>To<input type="date" value={filters.to} onChange={e => updateFilter("to", e.target.value)} /></label>
            </div>
          </details>
          {hasFilters && <button className="log-clear" onClick={resetFilters}>Clear filters</button>}
          {invalidRange ? <p role="alert">Choose an end date on or after the start date.</p> : browsing && <div className="log-filter-results" role="status">
            <p>{filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"}{hasFilters ? " matching" : " total"}</p>
            <dl><div><dt>Wins</dt><dd>{formatTotal(totals.wins)}</dd></div><div><dt>Losses</dt><dd>{formatTotal(totals.losses)}</dd></div><div><dt>Net</dt><dd>{formatTotal(totals.net)}</dd></div></dl>
          </div>}
        </section>
        <div>
          {!invalidRange && filteredLogs.length === 0 && <p className="log-no-results">No matching logs. Try another search or clear your filters.</p>}
          {shownLogs.map((l: Log) => (
            <motion.article
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={l.id}
              className={expanded === l.id ? "log-item expanded" : "log-item"}
            >
              <motion.button
                className="log-summary"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 80) setShare(l);
                  if (info.offset.x < -100) removeLog(l.id);
                }}
                onClick={() => setExpanded(expanded === l.id ? null : l.id)}
              >
                <strong className={l.type}>
                  {l.type === "win" ? "+" : "-"}
                  {money(l.amount)}
                </strong>
                <span>
                  <b>{l.category}</b>
                  <small>{l.title}</small>
                </span>
                <time>{l.date}</time>
                <motion.i animate={{ rotate: expanded === l.id ? 90 : 0 }}>
                  <ChevronRight />
                </motion.i>
              </motion.button>
              <AnimatePresence>
                {expanded === l.id && (
                  <motion.div
                    className="log-detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <p>{l.note || "No note added for this log."}</p>
                    <div>
                      {l.screenshot && <span><Camera /> Screenshot attached</span>}
                      <span><CalendarDays /> {l.dateKey ? new Date(`${l.dateKey}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : l.date || "Date unavailable"}</span>
                    </div>
                    <footer>
                      <button onClick={() => setShare(l)}><Share2 /> Share</button>
                      <button onClick={() => setEditing(l)}><Edit3 /> Edit</button>
                      <button onClick={() => repeatEntry(l)}><Plus /> Repeat</button>
                      <button className="delete" onClick={() => removeLog(l.id)}><Trash2 /> Delete</button>
                    </footer>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          ))}
          {browsing && shownLogs.length < filteredLogs.length && <footer className="log-pagination"><button onClick={() => setVisibleCount(count => count + 20)}>Show more ({filteredLogs.length - shownLogs.length} remaining)</button></footer>}
        </div>
      </section>
    </div>
  );
}
function Title({
  over,
  title,
  action,
}: {
  over: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="title">
      <div>
        <span>{over}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button>
          {action}
          <ArrowUpRight />
        </button>
      )}
    </div>
  );
}
function LogSheet({ type, initial, isRepeat = false, busy = false, saveError = false, defaultCategory, close, save, remove, customCategories = [], onAddCustom }: any) {
  const today = localToday();
  let startingDate = initial?.dateKey || today;
  if (!initial?.dateKey && initial?.date === "Yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startingDate = yesterday.toISOString().slice(0, 10);
  } else if (!initial?.dateKey && /^Sep \d+$/.test(initial?.date || "")) {
    startingDate = `2026-09-${String(initial.date.split(" ")[1]).padStart(2, "0")}`;
  }
  const [kind, setKind] = useState<"win" | "loss">(type || "win"),
    [amount, setAmount] = useState(initial ? String(initial.amount) : ""),
    [title, setTitle] = useState(initial?.title || ""),
    [category, setCategory] = useState(initial?.category || defaultCategory || (type === "loss" ? LOSS_CATS[0][0] : CATS[0][0])),
    [note, setNote] = useState(initial?.note || ""),
    [date, setDate] = useState(startingDate),
    [custom, setCustom] = useState(false),
    [customName, setCustomName] = useState(""),
    [customColor, setCustomColor] = useState("#1769ff"),
    [fileName, setFileName] = useState(""),
    [preview, setPreview] = useState<string | null>(null),
    [screenshotAttached, setScreenshotAttached] = useState(Boolean(initial?.screenshot)),
    [confirmDelete, setConfirmDelete] = useState(false);
  const baseCategories = kind === "loss" ? LOSS_CATS : CATS;
  const savedCategories: Array<[string, string]> = [...customCategories, ...baseCategories].filter(
    ([name], index, items) => items.findIndex(([other]) => other.toLowerCase() === name.toLowerCase()) === index,
  );
  const categoryList: Array<[string, string]> = savedCategories.some(([name]) => name === category)
    ? savedCategories
    : [[category, customColor], ...savedCategories];
  const formatDate = (value: string) => {
    const chosen = new Date(`${value}T00:00:00`);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (chosen.toDateString() === now.toDateString()) return "Today";
    if (chosen.toDateString() === yesterday.toDateString()) return "Yesterday";
    return chosen.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const applyCustom = () => {
    if (!customName.trim()) return;
    const nextCategory: [string, string] = [customName.trim(), customColor];
    setCategory(nextCategory[0]);
    onAddCustom?.(nextCategory);
    setCustom(false);
  };
  const changeKind = (nextKind: "win" | "loss") => {
    if (nextKind === kind) return;
    const currentDefaults = kind === "loss" ? LOSS_CATS : CATS;
    const nextDefaults = nextKind === "loss" ? LOSS_CATS : CATS;
    if (currentDefaults.some(([name]) => name === category)) setCategory(nextDefaults[0][0]);
    setKind(nextKind);
  };
  return (
    <motion.div
      className="backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className="sheet log-sheet"
        initial={{ y: 70, opacity: 0, scale: .98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 70, opacity: 0, scale: .98 }}
        transition={{ type: "spring", damping: 29 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <i className="grab" />
        <header>
          <div>
            <span>{isRepeat ? "REPEAT AN ENTRY" : initial ? "UPDATE YOUR ENTRY" : "ADD TO YOUR MONTH"}</span>
            <h2>{isRepeat ? "Repeat progress" : initial ? "Edit progress" : "Log your progress"}</h2>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <div className="toggle">
          <button
            className={kind === "win" ? "win" : ""}
            onClick={() => changeKind("win")}
          >
            ↑ WIN
          </button>
          <button
            className={kind === "loss" ? "loss" : ""}
            onClick={() => changeKind("loss")}
          >
            ↓ LOSS
          </button>
        </div>
        <div className="log-form-grid">
          <div className="log-main-fields">
            <label className="amount">
              <span>AMOUNT</span>
              <div>
                $
                <input
                  inputMode="decimal"
                  aria-label="Amount"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1"))}
                />
              </div>
            </label>
            <div className="amount-presets">
              {[100, 500, 1000].map((value) => <button key={value} onClick={() => setAmount(String(value))}>+{money(value)}</button>)}
            </div>
            <Field label={kind === "loss" ? "EXPENSE OR SETBACK" : "PROJECT OR TITLE"}>
              <input
                placeholder={kind === "loss" ? "What did this cost you?" : "What happened?"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="NOTE · OPTIONAL">
              <textarea
                placeholder="Add a little context"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
          </div>
          <div className="log-side-fields">
            <label className="field-label">{kind === "loss" ? "LOSS CATEGORY" : "CATEGORY"}</label>
            <div className="cats">
              {categoryList.map(([c, color]) => (
                <button
                  key={c}
                  className={c === category ? "selected" : ""}
                  style={{ "--cat": color } as any}
                  onClick={() => setCategory(c)}
                >
                  <i />
                  {c}
                  {c === category && <Check />}
                </button>
              ))}
              <button onClick={() => setCustom(!custom)}><Plus />Custom</button>
            </div>
            <AnimatePresence>
              {custom && (
                <motion.div className="custom-category" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <div className="custom-name-row"><input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Category name" /><button disabled={!customName.trim()} onClick={applyCustom}>ADD</button></div>
                  <div className="color-swatches">
                    {["#1769ff", "#6c4cff", "#ff6c64", "#c8ef43", "#ff9f1c"].map((color) => <button className={customColor === color ? "active" : ""} key={color} aria-label={"Use " + color} style={{ background: color }} onClick={() => setCustomColor(color)} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="log-meta">
              <Field label="DATE">
                <div className="date-field"><CalendarDays /><input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} /></div>
              </Field>
              <Field label="SCREENSHOT · OPTIONAL">
                <div className={screenshotAttached ? "upload-field has-file" : "upload-field"}>
                  {preview ? <img src={preview} alt="Screenshot preview" /> : <Camera />}
                  <label><b>{fileName || (screenshotAttached ? "Screenshot attached" : "Add screenshot")}</b><small>{screenshotAttached ? "Tap to replace" : "PNG or JPG"}</small><input type="file" accept="image/png,image/jpeg" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setFileName(file.name); setPreview(URL.createObjectURL(file)); setScreenshotAttached(true); } }} /></label>
                  {screenshotAttached && <button aria-label="Remove screenshot" onClick={() => { setScreenshotAttached(false); setPreview(null); setFileName(""); }}><X /></button>}
                </div>
              </Field>
            </div>
          </div>
        </div>
        {saveError && <p role="alert">Entry not saved. Check your connection and tap Retry.</p>}
        <div className="sheet-actions">
          {remove && <button disabled={busy} className={confirmDelete ? "sheet-delete confirm" : "sheet-delete"} onClick={() => confirmDelete ? remove() : setConfirmDelete(true)}><Trash2 />{confirmDelete ? "DELETE THIS LOG?" : "DELETE"}</button>}
          <button
            className={`submit ${kind}`}
            disabled={busy || !Number.isFinite(Number(amount)) || Number(amount) <= 0 || !title.trim() || !date}
            onClick={() => save({ type: kind, amount: Number(amount), title: title.trim(), category, date: formatDate(date), dateKey: date, note: note.trim(), screenshot: screenshotAttached })}
          >
            {busy ? "SAVING…" : saveError ? "RETRY" : initial && !isRepeat ? "SAVE CHANGES" : `LOG ${kind.toUpperCase()}`}
            <ArrowUpRight />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
function Field({ label, children }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
const badges = [
  "FIRST WIN",
  "FIRST LOSS",
  "10 WINS",
  "50 WINS",
  "100 WINS",
  "7 DAY STREAK",
  "30 DAY STREAK",
  "$1K MONTH",
  "$5K MONTH",
  "$10K MONTH",
  "TOP 100",
  "TOP 10",
  "#1",
  "COMEBACK",
];
function earnedFrom(logs: Log[], net: number) {
  const winCount = logs.filter((log) => log.type === "win").length;
  const lossCount = logs.filter((log) => log.type === "loss").length;
  const streak = activityStats(logs, localToday()).longest;
  return badges.filter((badge) =>
    badge === "FIRST WIN" ? winCount >= 1 :
    badge === "FIRST LOSS" ? lossCount >= 1 :
    badge === "10 WINS" ? winCount >= 10 :
    badge === "50 WINS" ? winCount >= 50 :
    badge === "100 WINS" ? winCount >= 100 :
    badge === "7 DAY STREAK" ? streak >= 7 :
    badge === "30 DAY STREAK" ? streak >= 30 :
    badge === "$1K MONTH" ? net >= 1000 :
    badge === "$5K MONTH" ? net >= 5000 :
    badge === "$10K MONTH" ? net >= 10000 : false
  );
}
function Insights({ net, wins, losses, logs, freshStart, profile }: any) {
  const [month, setMonth] = useState(() => currentMonth());
  const [pop, setPop] = useState<string | null>(null);
  const [recapPeriod, setRecapPeriod] = useState(() => currentMonth());
  const [periodOpen, setPeriodOpen] = useState(false);
  const [recapYear, setRecapYear] = useState(() => currentMonth().slice(0, 4));
  const summary = useMemo(() => periodSummary(logs as Log[], month), [logs, month]);
  const { wins: activeWins, losses: activeLosses, net: activeNet, winCount, lossCount, dayValues } = summary;
  const monthLabel = periodLabel(month);
  const monthShort = new Date(`${month}-01T12:00:00`).toLocaleDateString("en-US", {month:"short"}).toUpperCase();
  const chartMax = Math.max(1, ...dayValues.map(Math.abs));
  const money = insightMoney, signedMoney = insightSignedMoney;
  const categoryItems = summary.categories.slice(0, 5).map((item, index) => [item.name, signedMoney(item.net), ["big", "mid", "coral", "small", ""][index]]);
  const bestCategory = categoryItems.length ? String(categoryItems[0][0]) : "No logs yet";
  const earned = earnedFrom(logs, net);
  const years = Array.from(new Set([currentMonth().slice(0,4), recapYear, ...(logs as Log[]).filter(log => validDateKey(log.dateKey)).map(log => log.dateKey!.slice(0,4))])).sort().reverse();
  const recapOptions = Array.from({length:12}, (_, index) => `${recapYear}-${String(index+1).padStart(2,"0")}`);
  const recapFor = (period: string) => periodSummary(logs as Log[], period);
  const yearSummary = recapFor(recapYear);
  const undatedCount = (logs as Log[]).filter(log => !validDateKey(log.dateKey)).length;
  return (
    <div className="page insights">
      <WeeklySummary logs={logs} username={profile.username} avatarUrl={profile.avatarUrl} />
      <label className="insight-month-picker">Choose month<input type="month" value={month} max={currentMonth()} onChange={e => { if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value) && e.target.value <= currentMonth()) setMonth(e.target.value); }} /></label>
      {undatedCount > 0 && <p className="insight-date-note">{undatedCount} undated {undatedCount === 1 ? "entry is" : "entries are"} excluded. Edit the entry date to include it in Insights.</p>}
      <section className="insight-hero">
        <div>
          <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
            <ChevronLeft />
          </button>
          <span>YOUR {monthLabel.toUpperCase()}</span>
          <button aria-label="Next month" disabled={month >= currentMonth()} onClick={() => setMonth(shiftMonth(month, 1))}>
            <ChevronRight />
          </button>
        </div>
        <motion.strong
          key={month}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {signedMoney(activeNet)}
        </motion.strong>
        <small>NET PROGRESS</small>
        <div className="daily-bars" aria-label={`Daily progress for ${monthLabel}`}>
          {dayValues.map((value, index) => (
            <i
              key={index}
              className={
                value > 0 ? "positive" : value < 0 ? "negative" : "empty"
              }
              title={`${month}-${String(index + 1).padStart(2, "0")}: ${signedMoney(value)}`}
              style={{ height: value === 0 ? "4%" : Math.max(8, Math.abs(value) / chartMax * 100) + "%" }}
            />
          ))}
        </div>
        <footer className="daily-axis">
          <span>{monthShort} 1</span>
          <b>DAILY NET</b>
          <span>{monthShort} {dayValues.length}</span>
        </footer>
      </section>
      <section className="stats">
        {[
          ["UP BY", signedMoney(activeNet)],
          ["TOTAL WINS", money(activeWins)],
          ["TOTAL LOSSES", money(activeLosses)],
          ["NUMBER OF WINS", String(winCount)],
          ["NUMBER OF LOSSES", String(lossCount)],
          ["LONGEST STREAK", `${summary.longestStreak} day${summary.longestStreak === 1 ? "" : "s"}`],
          ["BEST CATEGORY", bestCategory],
        ].map((x, i) => (
          <div className={i === 0 ? "major" : ""} key={x[0]}>
            <span>{x[0]}</span>
            <b>{x[1]}</b>
          </div>
        ))}
      </section>
      <section className="heat">
        <Title over="DAILY RHYTHM" title="Your month" />
        <div className="heat-days">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
            <span key={day + index}>{day}</span>
          ))}
        </div>
        <div className="heat-grid">
          {Array.from({length:summary.weekdayOffset}, (_, i) => <div key={`blank-${i}`} className="calendar-blank" aria-hidden="true" />)}
          {dayValues.map((value, i) => {
            return (
              <div
                className={value > 0 ? "positive" : value < 0 ? "negative" : "empty"}
                key={i}
              >
                <span>{i + 1}</span>
                <b>{!summary.dayActive[i] ? "No activity" : signedMoney(value)}</b>
              </div>
            );
          })}
        </div>
      </section>
      <section className="mix">
        <Title over="WHERE IT CAME FROM" title="Category mix" />
        <div>
          {categoryItems.length ? categoryItems.map((x) => (
            <motion.button
              whileHover={{ scale: 1.04 }}
              className={x[2]}
              key={x[0]}
            >
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </motion.button>
          )) : <div className="insight-empty"><CircleDollarSign /><b>No categories yet</b><span>Your first log will appear here.</span></div>}
        </div>
      </section>
      <section className="achievements">
        <Title over="YOUR TROPHY CASE" title="Achievements" />
        <div>
          {badges.map((b, i) => (
            <button
              className={earned.includes(b) ? "earned" : "locked"}
              onClick={() => setPop(b)}
              key={b}
            >
              <i className={`b${i % 5}`}>{earned.includes(b) ? <Medal /> : <Lock />}</i>
              <b>{b}</b>
              <span>{earned.includes(b) ? "EARNED" : freshStart && b.includes("WINS") ? `${winCount} logged` : freshStart && b.includes("MONTH") ? `${signedMoney(net)} so far` : "LOCKED"}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="recap">
        <div>
          <span>MONTH OR YEAR</span>
          <h2>Create your recap</h2>
          <p>Review any month or year, then share your totals.</p>
          <div className="year-total">
            <span>{recapYear} TOTAL</span>
            <strong>{signedMoney(yearSummary.net)}</strong>
          </div>
        </div>
        <div className="recap-controls">
          <div className="period-picker">
            <span>PERIOD</span>
            <button className="period-trigger" onClick={() => setPeriodOpen(!periodOpen)}>
              <CalendarDays />
              <b>{periodLabel(recapPeriod)}</b>
              <ChevronDown />
            </button>
            <AnimatePresence>
              {periodOpen && (
                <motion.div
                  className="period-menu"
                  initial={{ opacity: 0, y: 8, scale: .97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: .97 }}
                >
                  <header><span>CHOOSE A RECAP</span><button onClick={() => setPeriodOpen(false)}><X /></button></header>
                  <label className="recap-year-picker">Year<select value={recapYear} onChange={e => { setRecapYear(e.target.value); setRecapPeriod(e.target.value); }}>{years.map(year => <option key={year}>{year}</option>)}</select></label>
                  <div className="month-options">
                    {recapOptions.map((period) => (
                      <button
                        className={recapPeriod === period ? "active" : ""}
                        key={period}
                        onClick={() => { setRecapPeriod(period); setPeriodOpen(false); }}
                      >
                        <span>{periodLabel(period).slice(0, 3).toUpperCase()}</span>
                        <small>{recapFor(period).entries.length ? signedMoney(recapFor(period).wins - recapFor(period).losses) : "No logs"}</small>
                      </button>
                    ))}
                  </div>
                  <button
                    className={recapPeriod === recapYear ? "year-option active" : "year-option"}
                    onClick={() => { setRecapPeriod(recapYear); setPeriodOpen(false); }}
                  >
                    <span><Sparkles /> {recapYear} YEAR RECAP</span>
                    <b>{signedMoney(yearSummary.net)}</b>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setPop("recap")}>
            <Sparkles />
            CREATE RECAP
          </button>
        </div>
      </section>
      <AnimatePresence>
        {pop && <Badge pop={pop} net={net} recapPeriod={recapPeriod} recapOverride={recapFor(recapPeriod)} close={() => setPop(null)} />}
      </AnimatePresence>
    </div>
  );
}
function Badge({ pop, net, recapPeriod, recapOverride, close }: any) {
  return (
    <motion.div
      className="backdrop center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className={pop === "recap" ? "pop recap-pop" : "pop"}
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {pop === "recap" ? (
          <RecapStory period={recapPeriod} recapOverride={recapOverride} />
        ) : (
          <>
            <i className="giant">
              <Trophy />
            </i>
            <span>ACHIEVEMENT</span>
            <h2>{pop}</h2>
            <p>
              {pop.includes("STREAK")
                ? "Log progress consistently for the required number of days."
                : pop.includes("MONTH")
                  ? "Finish a calendar month above this amount."
                  : "Keep logging your progress to earn this badge."}
            </p>
            <div className="badge-progress">
              <span><i style={{ width: pop.includes("10K") ? `${Math.min(100, Math.max(4, net / 100))}%` : pop.includes("5K") ? `${Math.min(100, Math.max(4, net / 50))}%` : pop.includes("1K") ? `${Math.min(100, Math.max(4, net / 10))}%` : pop.includes("TOP") ? "62%" : "78%" }} /></span>
              <small>{pop.includes("MONTH") ? `${signedMoney(net)} progress` : pop.includes("TOP") ? "Keep moving up the leaderboard" : "Progress saved"}</small>
            </div>
          </>
        )}
        <button className="close" onClick={close}>
          <X />
        </button>
      </motion.div>
    </motion.div>
  );
}
function RecapStory({ period, recapOverride }: { period: string; recapOverride: PeriodSummary }) {
  const [slide, setSlide] = useState(0);
  const recap = recapOverride;
  const money = insightMoney;
  const label = periodLabel(period);
  const [shareStatus, setShareStatus] = useState("");
  const shareRecap = async () => {
    const text = `My ${label} on UPBY: ${insightSignedMoney(recap.net)} net. ${money(recap.wins)} wins, ${money(recap.losses)} losses. ${recap.winCount + recap.lossCount} entries.`;
    try {
      if (navigator.share) await navigator.share({title: "My UPBY recap", text});
      else { await navigator.clipboard.writeText(text); setShareStatus("Recap copied. Paste it into your post."); }
    } catch (error) { if (!(error instanceof Error && error.name === "AbortError")) setShareStatus("Sharing failed. Please try again."); }
  };
  const net = recap.wins - recap.losses;
  const isYear = period.length === 4;
  const next = () => setSlide((value) => Math.min(4, value + 1));
  const previous = () => setSlide((value) => Math.max(0, value - 1));
  return (
    <div className="recap-story">
      <div className="story-progress">
        {[0, 1, 2, 3, 4].map((item) => <i className={item <= slide ? "active" : ""} key={item} />)}
      </div>
      <AnimatePresence mode="wait">
        <motion.section
          className={"story-slide story-" + slide}
          key={slide}
          initial={{ opacity: 0, x: 35, rotate: 1 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: -35, rotate: -1 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={.12}
          onDragEnd={(_, info) => info.offset.x < -55 ? next() : info.offset.x > 55 ? previous() : null}
        >
          <Logo />
          {slide === 0 && <>
            <div className="story-icon-stage result-icons">
              <motion.i animate={{ rotate: [0, 8, 0], y: [0, -5, 0] }} transition={{ duration: 2.4, repeat: Infinity }}><ArrowUpRight /></motion.i>
              <Sparkles className="orbit-icon one" />
              <Star className="orbit-icon two" />
              <Zap className="orbit-icon three" />
            </div>
            <span>{isYear ? "YOUR YEAR ON UPBY" : "YOUR " + label.toUpperCase()}</span>
            <h2>{net > 0 ? "+" : ""}{money(net)}</h2>
            <b>{isYear ? "UP BY THIS YEAR" : "UP BY THIS MONTH"}</b>
            <p>{isYear ? "Your dated entries, added up for the year." : "Every log added up to this."}</p>
          </>}
          {slide === 1 && <>
            <div className="story-icon-stage win-icons">
              <motion.i animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.8, repeat: Infinity }}><CircleDollarSign /></motion.i>
              <ArrowUpRight className="orbit-icon one" />
              <Sparkles className="orbit-icon two" />
              <Award className="orbit-icon three" />
            </div>
            <span>THE WINS</span>
            <h2>{money(recap.wins)}</h2>
            <b>YOU KEPT SHOWING UP</b>
            <div className="story-stat"><strong>{recap.winCount}</strong><small>WINS LOGGED</small></div>
            <p>{recap.bestDay !== null ? `Best daily net: ${insightSignedMoney(recap.bestDay)}` : "No entries logged in this period."}</p>
          </>}
          {slide === 2 && <>
            <div className="story-icon-stage loss-icons">
              <motion.i animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><ShieldCheck /></motion.i>
              <TrendingDown className="orbit-icon one" />
              <Target className="orbit-icon two" />
              <ArrowUpRight className="orbit-icon three" />
            </div>
            <span>THE FULL PICTURE</span>
            <h2>{money(recap.losses)}</h2>
            <b>LOSSES LOGGED</b>
            <p>Progress was never hidden. You recorded the hard days and kept moving.</p>
            <div className="story-balance"><span>WINS</span><i style={{ width: Math.round((recap.wins / Math.max(1, recap.wins + recap.losses)) * 100) + "%" }} /><span>LOSSES</span></div>
          </>}
          {slide === 3 && <>
            <div className="story-icon-stage streak-icons">
              <motion.i animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }} transition={{ duration: 1.7, repeat: Infinity }}><Flame /></motion.i>
              <Crown className="orbit-icon one" />
              <Trophy className="orbit-icon two" />
              <Star className="orbit-icon three" />
            </div>
            <span>CONSISTENCY</span>
            <h2>{recap.longestStreak}</h2>
            <b>DAY LONGEST STREAK</b>
            <div className="story-rank"><Trophy /><span>DAYS LOGGED</span><strong>{recap.activeDays}</strong></div>
          </>}
          {slide === 4 && <>
            <div className="story-icon-stage final-icons">
              <motion.i animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}><Crown /></motion.i>
              <Medal className="orbit-icon one" />
              <Share2 className="orbit-icon two" />
              <Sparkles className="orbit-icon three" />
            </div>
            <span>{"MY " + label.toUpperCase()}</span>
            <div className="final-split"><b>{money(recap.wins)}<small>WINS</small></b><b>{money(recap.losses)}<small>LOSSES</small></b></div>
            <h2>{net > 0 ? "+" : ""}{money(net)}</h2>
            <b>UP BY</b>
            <footer>{recap.winCount} WINS · {recap.lossCount} LOSSES<br />{recap.longestStreak} DAY LONGEST STREAK</footer>
          </>}
        </motion.section>
      </AnimatePresence>
      <div className="story-controls">
        <button onClick={previous} disabled={slide === 0}><ChevronLeft /> BACK</button>
        {slide < 4 ? <button onClick={next}>NEXT <ChevronRight /></button> : <button className="story-share" onClick={() => void shareRecap()}><Share2 /> SHARE RECAP</button>}
      </div>
      <small className="swipe-hint" role="status">{shareStatus || "SWIPE OR USE THE BUTTONS"}</small>
    </div>
  );
}
function Profile({ net, wins, losses, logs, freshStart, profile, setProfile, prefs, setPrefs, authUser, demoMode, signOut, followingCount, followerCount, startLog }: any) {
  const [settings, setSettings] = useState(false),
    [publicPreview, setPublicPreview] = useState(false),
    [editingProfile, setEditingProfile] = useState(false),
    [draftProfile, setDraftProfile] = useState<ProfileData>(profile),
    [avatarFile, setAvatarFile] = useState<File | null>(null),
    [savingProfile, setSavingProfile] = useState(false),
    [editError, setEditError] = useState(""),
    [feedbackOpen, setFeedbackOpen] = useState(false),
    [feedbackType, setFeedbackType] = useState("idea"),
    [feedbackMessage, setFeedbackMessage] = useState(""),
    [feedbackStatus, setFeedbackStatus] = useState(""),
    [feedbackBusy, setFeedbackBusy] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(""),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [privacyStatus, setPrivacyStatus] = useState("");
  const activity = activityStats(logs, localToday());
  const streak = activity.current;
  const earned = earnedFrom(logs, net);
  const selectedAchievements = freshStart ? earned.slice(0, 4) : earned;
  const openProfileEditor = () => { setDraftProfile(profile); setAvatarFile(null); setEditError(""); setEditingProfile(true); };
  const updatePrivacy = async (index: number) => {
    const nextPrefs = prefs.map((value: number, itemIndex: number) => itemIndex === index ? Number(!value) : value);
    if (index === 5 && !nextPrefs[5]) nextPrefs[4] = 0;
    setPrefs(nextPrefs);
    if (demoMode || !authUser) return;
    setPrivacyStatus("Saving privacy...");
    const { error } = await supabase.from("profiles").upsert({
      user_id: authUser.id,
      display_name: profile.displayName,
      username: profile.username,
      avatar_url: profile.avatarUrl?.startsWith("data:") ? null : profile.avatarUrl,
      bio: profile.bio || "",
      x_profile: profile.xProfile || "",
      show_totals: Boolean(nextPrefs[0]),
      show_logs: Boolean(nextPrefs[1]),
      show_losses: Boolean(nextPrefs[2]),
      show_screenshots: Boolean(nextPrefs[3]),
      leaderboard_enabled: Boolean(nextPrefs[4]),
      public_profile_enabled: Boolean(nextPrefs[5]),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setPrivacyStatus(error ? "Privacy was not saved. Try again." : "Privacy saved");
    if (!error) window.setTimeout(() => setPrivacyStatus(""), 1600);
  };
  const shareProfile = async () => {
    const url = `${window.location.origin}/${profile.username}`;
    if (navigator.share) await navigator.share({ title: `${profile.displayName} on UPBY`, text: "See how much I am up by.", url }).catch(() => undefined);
    else { await navigator.clipboard.writeText(url); setFeedbackStatus("Profile link copied"); setTimeout(() => setFeedbackStatus(""), 1800); }
    void trackProductEvent(authUser?.id, "profile_shared", "profile");
  };
  const [exportStatus, setExportStatus] = useState("");
  const exportData = async () => {
    setExportStatus("Preparing export…");
    let monthlyGoals: unknown[] = [];
    if (authUser && !demoMode) {
      try {
        const { data, error } = await supabase.from("monthly_goals").select("month,target").eq("user_id", authUser.id).order("month", { ascending: false });
        if (error) throw error;
        monthlyGoals = data || [];
      } catch {
        setExportStatus("Could not load goals for your export. Please try again.");
        return;
      }
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email: authUser?.email || null },
      profile,
      privacy: { showTotals: Boolean(prefs[0]), showLogs: Boolean(prefs[1]), showLosses: Boolean(prefs[2]), showScreenshots: Boolean(prefs[3]), leaderboard: Boolean(prefs[4]), publicProfile: Boolean(prefs[5]) },
      totals: { wins, losses, net },
      logs,
      social: { following: followingCount, followers: followerCount },
      monthlyGoals,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `upby-${profile.username}-data.json`;
    link.click();
    setExportStatus("Export downloaded");
    URL.revokeObjectURL(url);
    void trackProductEvent(authUser?.id, "data_exported", "account");
  };
  const submitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (!authUser || message.length < 3) { setFeedbackStatus("Write a short message first."); return; }
    setFeedbackBusy(true); setFeedbackStatus("");
    const { error } = await supabase.from("feedback").insert({ user_id: authUser.id, type: feedbackType, message });
    setFeedbackBusy(false);
    if (error) { setFeedbackStatus(error.message); return; }
    void trackProductEvent(authUser.id, "feedback_sent", "feedback", { type: feedbackType });
    setFeedbackMessage(""); setFeedbackStatus("Feedback sent. Thank you.");
    setTimeout(() => { setFeedbackOpen(false); setFeedbackStatus(""); }, 1200);
  };
  const deleteAccount = async () => {
    if (!authUser || deleteConfirm !== "DELETE") return;
    setDeleteBusy(true); setDeleteError("");
    const { data: avatarFiles } = await supabase.storage.from("avatars").list(authUser.id, { limit: 100 });
    if (avatarFiles?.length) await supabase.storage.from("avatars").remove(avatarFiles.map((file) => `${authUser.id}/${file.name}`));
    await trackProductEvent(authUser.id, "account_deleted", "account");
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setDeleteError(error.message); setDeleteBusy(false); return; }
    window.localStorage.removeItem(`${STORAGE_KEY}:${authUser.id}`);
    await supabase.auth.signOut();
    window.location.assign("/");
  };
  const saveProfile = async () => {
    setSavingProfile(true);
    let nextProfile = {
      ...draftProfile,
      displayName: draftProfile.displayName.trim(),
      username: draftProfile.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24),
      xProfile: draftProfile.xProfile.replace(/^@/, "").trim(),
      bio: draftProfile.bio?.trim().slice(0, 160) || "",
    };
    if (nextProfile.displayName.length < 2 || nextProfile.username.length < 3) {
      setEditError("Add a display name and a username with at least 3 characters.");
      setSavingProfile(false);
      return;
    }
    if (!demoMode && authUser) {
      if (avatarFile) {
        const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const avatarPath = `${authUser.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, avatarFile, { contentType: avatarFile.type, cacheControl: "31536000" });
        if (uploadError) { setEditError(uploadError.message); setSavingProfile(false); return; }
        const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
        const imageCheck = await fetch(data.publicUrl, { cache: "no-store" });
        if (!imageCheck.ok) { setEditError("The photo uploaded but could not be opened. Please try again."); setSavingProfile(false); return; }
        nextProfile = { ...nextProfile, avatarUrl: data.publicUrl };
      } else if (profile.avatarUrl && !nextProfile.avatarUrl) {
        nextProfile = { ...nextProfile, avatarUrl: null };
      }
      const savedAvatarUrl = nextProfile.avatarUrl?.startsWith("data:") ? null : nextProfile.avatarUrl;
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: authUser.id,
        display_name: nextProfile.displayName,
        username: nextProfile.username,
        avatar_url: savedAvatarUrl,
        bio: nextProfile.bio,
        x_profile: nextProfile.xProfile,
        show_totals: Boolean(prefs[0]),
        show_logs: Boolean(prefs[1]),
        show_losses: Boolean(prefs[2]),
        show_screenshots: Boolean(prefs[3]),
        leaderboard_enabled: Boolean(prefs[4]),
        public_profile_enabled: Boolean(prefs[5]),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (profileError) { setEditError(profileError.message); setSavingProfile(false); return; }
      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      const { error } = await supabase.auth.updateUser({ data: {
        display_name: nextProfile.displayName,
        username: nextProfile.username,
        x_profile: nextProfile.xProfile,
        bio: nextProfile.bio,
        upby_avatar_url: savedAvatarUrl,
        onboarding_complete: true,
      } });
      if (error) { setEditError(error.message); setSavingProfile(false); return; }
      void trackProductEvent(authUser.id, "profile_updated", "profile", { avatar_changed: Boolean(avatarFile) });
    }
    setProfile(nextProfile);
    setSavingProfile(false);
    setEditingProfile(false);
  };
  return (
    <div className={publicPreview ? "page profile public-preview" : "page profile"}>
      <button className="preview-toggle" onClick={() => setPublicPreview(!publicPreview)}>
        <Eye /> {publicPreview ? "EXIT PUBLIC VIEW" : "PREVIEW PUBLIC VIEW"}
      </button>
      <section className="profile-head">
        <button className="settings" onClick={() => setSettings(!settings)}>
          <Settings2 />
        </button>
        <div className="big-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}<i />
        </div>
        <div>
          <span>UPBY MEMBER SINCE 2026</span>
          <h1>{profile.displayName}</h1>
          <b>@{profile.username}</b>
          {profile.xProfile && <a href={`https://x.com/${profile.xProfile.replace(/^@/, "")}`}>𝕏 @{profile.xProfile.replace(/^@/, "")} <ArrowUpRight /></a>}
          <p>{profile.bio || "Building on the internet. Tracking every step."}</p>
        </div>
        <div className="profile-actions">
          <button className="edit-profile" onClick={openProfileEditor}><Edit3 />EDIT PROFILE</button>
          <a className="public" href={`/${profile.username}`}>VIEW PUBLIC PROFILE<ArrowUpRight /></a>
        </div>
      </section>
      <AnimatePresence>
        {editingProfile && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setEditingProfile(false)}>
            <motion.section className="profile-editor" initial={{ y: 28, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>YOUR PROFILE</span><h2>Edit profile</h2></div><button onClick={() => setEditingProfile(false)}><X /></button></header>
              <div className="profile-photo-edit">
                <div>{draftProfile.avatarUrl ? <img src={draftProfile.avatarUrl} alt="Profile preview" /> : draftProfile.displayName.slice(0, 1).toUpperCase()}</div>
                <label><Camera />CHANGE PHOTO<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setEditError("Choose an image smaller than 5 MB."); return; } setAvatarFile(file); const reader = new FileReader(); reader.onload = () => setDraftProfile((current) => ({ ...current, avatarUrl: typeof reader.result === "string" ? reader.result : null })); reader.readAsDataURL(file); }} /></label>
                {draftProfile.avatarUrl && <button onClick={() => { setAvatarFile(null); setDraftProfile((current) => ({ ...current, avatarUrl: null })); }}>REMOVE</button>}
              </div>
              <div className="profile-fields">
                <label><span>DISPLAY NAME</span><input value={draftProfile.displayName} maxLength={40} onChange={(event) => setDraftProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
                <label><span>USERNAME</span><div className="edit-username"><b>@</b><input value={draftProfile.username} maxLength={24} onChange={(event) => setDraftProfile((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} /></div></label>
                <label><span>X ACCOUNT</span><div className="edit-username"><b>@</b><input value={draftProfile.xProfile} maxLength={30} placeholder="yourhandle" onChange={(event) => setDraftProfile((current) => ({ ...current, xProfile: event.target.value.replace(/^@/, "") }))} /></div></label>
                <label className="bio-field"><span>BIO</span><textarea value={draftProfile.bio || ""} maxLength={160} placeholder="Tell people what you do" onChange={(event) => setDraftProfile((current) => ({ ...current, bio: event.target.value }))} /><small>{draftProfile.bio?.length || 0}/160</small></label>
              </div>
              {editError && <p className="profile-edit-error">{editError}</p>}
              <footer><button className="cancel" disabled={savingProfile} onClick={() => setEditingProfile(false)}>CANCEL</button><button className="save" disabled={savingProfile} onClick={saveProfile}>{savingProfile ? <LoaderCircle className="spin" /> : <Check />}{savingProfile ? "SAVING" : "SAVE CHANGES"}</button></footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setFeedbackOpen(false)}>
            <motion.section className="account-modal" initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>HELP SHAPE UPBY</span><h2>Send feedback</h2></div><button onClick={() => setFeedbackOpen(false)}><X /></button></header>
              <div className="feedback-types">{["idea", "bug", "other"].map((type) => <button key={type} className={feedbackType === type ? "active" : ""} onClick={() => setFeedbackType(type)}>{type.toUpperCase()}</button>)}</div>
              <label><span>YOUR MESSAGE</span><textarea value={feedbackMessage} maxLength={600} placeholder="Tell us what should improve" onChange={(event) => setFeedbackMessage(event.target.value)} /><small>{feedbackMessage.length}/600</small></label>
              {feedbackStatus && <p className="account-modal-status">{feedbackStatus}</p>}
              <footer><button className="cancel" disabled={feedbackBusy} onClick={() => setFeedbackOpen(false)}>CANCEL</button><button className="save" disabled={feedbackBusy || feedbackMessage.trim().length < 3} onClick={submitFeedback}>{feedbackBusy ? <LoaderCircle className="spin" /> : <MessageSquare />}{feedbackBusy ? "SENDING" : "SEND"}</button></footer>
            </motion.section>
          </motion.div>
        )}
        {deleteOpen && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !deleteBusy && setDeleteOpen(false)}>
            <motion.section className="account-modal delete-modal" initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>PERMANENT ACTION</span><h2>Delete account</h2></div><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)}><X /></button></header>
              <p>This permanently removes your profile, logs, followers, uploaded avatar, and saved progress.</p>
              <label><span>TYPE DELETE TO CONFIRM</span><input value={deleteConfirm} autoComplete="off" onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())} /></label>
              {deleteError && <p className="account-modal-status error">{deleteError}</p>}
              <footer><button className="cancel" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>CANCEL</button><button className="delete-account" disabled={deleteBusy || deleteConfirm !== "DELETE"} onClick={deleteAccount}>{deleteBusy ? <LoaderCircle className="spin" /> : <Trash2 />}{deleteBusy ? "DELETING" : "DELETE FOREVER"}</button></footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settings && (
          <motion.section
            className="privacy"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Title over="PROFILE SETTINGS" title="Privacy" />
            {[
              ["Public profile", "Turn this off to hide your full profile", 5],
              ["Show monetary totals", "Display amounts on your public profile", 0],
              ["Show individual logs", "Let people see your public activity", 1],
              ["Show losses", "Include losses in public totals and logs", 2],
              ["Show screenshots", "Display screenshots attached to public logs", 3],
              ["Appear in rankings", "Only controls the Global leaderboard", 4],
            ].map(([label, copy, preferenceIndex]) => {
              const i = Number(preferenceIndex);
              const disabled = !prefs[5] && i !== 5;
              return (
              <label key={String(label)} className={disabled ? "privacy-disabled" : ""}>
                <span><b>{label}</b><small>{copy}</small></span>
                <button
                  className={prefs[i] ? "on" : ""}
                  disabled={disabled || privacyStatus === "Saving privacy..."}
                  onClick={() => void updatePrivacy(i)}
                >
                  <i />
                </button>
              </label>
            )})}
            {privacyStatus && <p className={privacyStatus.includes("not") ? "privacy-status error" : "privacy-status"}>{privacyStatus}</p>}
            <div className="account-session">
              <div><b>{demoMode ? "Demo session" : authUser?.email}</b><span>{demoMode ? "Sample data mode" : "Signed in securely with Supabase"}</span></div>
              <button onClick={signOut}><LogOut />{demoMode ? "EXIT DEMO" : "SIGN OUT"}</button>
            </div>
            {!demoMode && <div className="account-tools"><button onClick={exportData}><Download />EXPORT DATA</button><button onClick={() => { setFeedbackStatus(""); setFeedbackOpen(true); }}><MessageSquare />SEND FEEDBACK</button><button className="danger" onClick={() => { setDeleteConfirm(""); setDeleteError(""); setDeleteOpen(true); }}><Trash2 />DELETE ACCOUNT</button></div>}
            {exportStatus && <p role="status">{exportStatus}</p>}
            <nav className="account-links"><a href="/privacy">PRIVACY</a><a href="/terms">TERMS</a></nav>
          </motion.section>
        )}
      </AnimatePresence>
      <section className="profile-score">
        <span>UP BY THIS MONTH</span>
        <strong>{signedMoney(net)}</strong>
        {freshStart && <p className="profile-total-row"><span>{money(wins)} wins</span><span>{money(losses)} losses</span></p>}
        <div>
          <b>
            <Flame />
            {streak} DAY STREAK
          </b>
          <b>
            <Trophy />{freshStart ? earned.length : 7} ACHIEVEMENTS
          </b>
        </div>
      </section>
      <section className="social">
        <div>
          <b>{freshStart ? followingCount : 248}</b>
          <span>FOLLOWING</span>
        </div>
        <div>
          <b>{freshStart ? followerCount : "1,842"}</b>
          <span>FOLLOWERS</span>
        </div>
        <button onClick={shareProfile}>
          SHARE PROFILE
          <Share2 />
        </button>
      </section>
      <section className="selected">
        <Title over="PROUD OF THESE" title="Selected achievements" />
        <div>
          {selectedAchievements.length ? selectedAchievements.map((x) => (
            <span key={x}>
              <Medal />
              {x}
            </span>
          )) : <div className="profile-empty"><Trophy /><b>Your first badge is waiting</b><span>Log your first entry to collect it.</span><button onClick={startLog}>LOG FIRST ENTRY <ArrowUpRight /></button></div>}
        </div>
      </section>
      <section className="public-logs">
        <Title over="VISIBLE TO EVERYONE" title="Public logs" />
        {logs.length ? logs.slice(0, 3).map((l: Log) => (
          <div key={l.id}>
            <span className={l.type}>{l.type.toUpperCase()}</span>
            <b>{l.category}</b>
            <p>{l.title}</p>
            <strong>
              {l.type === "win" ? "+" : "-"}
              {money(l.amount)}
            </strong>
            <time>{l.date}</time>
          </div>
        )) : <div className="public-log-empty"><CircleDollarSign /><b>No public logs yet</b><span>Your public entries will appear here.</span></div>}
      </section>
      <section className="history">
        <Title over="THE LONG VIEW" title="Monthly history" />
        <div>
          {Array.from({length:4}, (_, index) => {
            const month = shiftMonth(currentMonth(), -index);
            return [periodLabel(month), signedMoney(periodSummary(logs as Log[], month).net)];
          }).map((x) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <b className={x[1].startsWith("-") ? "loss" : ""}>{x[1]}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Leaderboard({ close, following, setFollowing, freshStart, profile, net, logs, leaderboard, authUserId }: any) {
  const followLocks = useRef(new Set<string>());
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");
  const [view, setView] = useState("GLOBAL"),
    [period, setPeriod] = useState("THIS MONTH"),
    [selectedUser, setSelectedUser] = useState<any>(null),
    [liveEntries, setLiveEntries] = useState<LeaderboardEntry[]>(leaderboard);
  useEffect(() => {
    if (!freshStart) return;
    let active = true;
    supabase.rpc(view === "FRIENDS" ? "get_friends_leaderboard" : "get_leaderboard", { leaderboard_period: period === "ALL TIME" ? "all_time" : "this_month" })
      .then(({ data, error }) => { if (!error && active) setLiveEntries((data || []) as LeaderboardEntry[]); });
    return () => { active = false; };
  }, [freshStart, period, view, following]);
  const users = useMemo(
    () => freshStart ? (liveEntries.length ? liveEntries.map((entry) => [Number(entry.rank), entry.display_name, entry.username, signedMoney(Number(entry.net)), Number(entry.streak), entry.user_id, entry.avatar_url]) : view === "GLOBAL" ? [
      [1, profile.displayName, profile.username, signedMoney(net), activityStats(logs, localToday()).current, authUserId, profile.avatarUrl],
    ] : [
    ]) : [
      [1, "Zee", "zee", "+24,800", 28],
      [2, "Aria", "ariaup", "+18,420", 41],
      [3, "Kofi", "kofiworks", "+14,900", 19],
      [36, "Maya", "maya", "+8,100", 14],
      [37, "Chris", "chris", "+6,400", 8],
      [38, "Damian", "damian", "+4,280", 12],
      [39, "Noah", "noah", "+4,110", 7],
      [40, "Alex", "alex", "+3,820", 22],
    ],
    [freshStart, liveEntries, profile.displayName, profile.username, profile.avatarUrl, net, logs.length, authUserId, view],
  );
  const visibleUsers = users;
  const toggleFollow = async (user: any) => {
    if (!freshStart) {
      const demoKey = String(user[1]);
      setFollowing((items: string[]) => items.includes(demoKey) ? items.filter((id: string) => id !== demoKey) : [...items, demoKey]);
      return;
    }
    const targetId = String(user[5]);
    if (!targetId || targetId === authUserId) return;
    if (followLocks.current.has(targetId)) return;
    followLocks.current.add(targetId); setFollowBusy(true); setFollowError("");
    const alreadyFollowing = following.includes(targetId);
    try {
      await authenticatedWrite(() => alreadyFollowing
        ? supabase.from("follows").delete().eq("follower_id", authUserId).eq("followed_id", targetId)
        : supabase.from("follows").upsert({ follower_id: authUserId, followed_id: targetId }, { onConflict: "follower_id,followed_id", ignoreDuplicates: true }));
      setFollowing((items: string[]) => alreadyFollowing ? items.filter(id => id !== targetId) : [...new Set([...items, targetId])]);
      void trackProductEvent(authUserId, alreadyFollowing ? "user_unfollowed" : "user_followed", "social");
    } catch (error) {
      setFollowError("Could not save. Please try again.");
      void trackProductEvent(authUserId, "client_error", "social", errorMetadata(error, "follows", "follow_failed"));
    } finally { followLocks.current.delete(targetId); setFollowBusy(false); }

  };
  return (
    <motion.div
      className="leaderboard"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
    >
      <header>
        <button onClick={close}>
          <ChevronLeft />
        </button>
        <Logo />
        <button>
          <Search />
        </button>
      </header>
      {followError && <p role="alert">{followError}</p>}
      <motion.main
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) setView("FRIENDS");
          if (info.offset.x > 80) setView("GLOBAL");
        }}
      >
        <div className="leader-title">
          <span>UPBY WORLD</span>
          <h1>Leaderboard</h1>
          <p>See who is making progress and showing up.</p>
        </div>
        <div className="filters">
          <div>
            {["GLOBAL", "FRIENDS"].map((x) => (
              <button
                className={view === x ? "active" : ""}
                onClick={() => setView(x)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
          <button
            onClick={() =>
              setPeriod(period === "THIS MONTH" ? "ALL TIME" : "THIS MONTH")
            }
          >
            {period}
            <ChevronDown />
          </button>
        </div>
        <div className="top3">
          {visibleUsers.slice(0, 3).map((u, i) => (
            <div
              className={`top n${i + 1}`}
              key={u[0]}
              onClick={() => (freshStart ? u[5] !== authUserId : u[1] !== "Damian") && setSelectedUser(u)}
            >
              <span>#{u[0]}</span>
              <i>{u[6] ? <img src={String(u[6])} alt="" /> : String(u[1])[0]}</i>
              <b>{u[1]}</b>
              <strong>{u[3]}</strong>
              <small>
                <Flame />
                {u[4]} days
              </small>
            </div>
          ))}
        </div>
        <section className="ranking">
          {visibleUsers.slice(3).map((u) => (
            <motion.div
              layout
              className={freshStart ? u[5] === authUserId ? "me" : "" : u[1] === "Damian" ? "me" : ""}
              key={u[1]}
              onClick={() => (freshStart ? u[5] !== authUserId : u[1] !== "Damian") && setSelectedUser(u)}
            >
              <b>#{u[0]}</b>
              <i>{u[6] ? <img src={String(u[6])} alt="" /> : String(u[1])[0]}</i>
              <p>
                <strong>{u[1]}</strong>
                <small>@{u[2]}</small>
              </p>
              <em>{u[3]}</em>
              <small>
                {Number(u[0]) % 2 === 0 ? <TrendingUp /> : <TrendingDown />}
                {Number(u[0]) % 2 === 0 ? "4" : "2"}
              </small>
            </motion.div>
          ))}
        </section>
        {visibleUsers.length === 0 && <div className="leader-empty"><UserPlus /><b>No friends here yet</b><span>Follow UPBY users to build your Friends leaderboard.</span></div>}
        {!freshStart && <div className="pinned-rank"><b>#38</b><span>D · Damian</span><strong>+4,280</strong><em><TrendingUp /> 4</em></div>}
      </motion.main>
      <AnimatePresence>
        {selectedUser && (
          <motion.div className="leader-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)}>
            <motion.section initial={{ y: 40, scale: .94 }} animate={{ y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <button className="close" onClick={() => setSelectedUser(null)}><X /></button>
              <i>{selectedUser[6] ? <img src={String(selectedUser[6])} alt="" /> : String(selectedUser[1])[0]}</i>
              <span>UPBY MEMBER</span>
              <h2>{selectedUser[1]}</h2>
              <p>@{selectedUser[2]}</p>
              <strong>{selectedUser[3]} this month</strong>
              <a className="leader-public-link" href={`/${selectedUser[2]}`}>VIEW PUBLIC PROFILE <ArrowUpRight /></a>
              <button
                className={following.includes(String(freshStart ? selectedUser[5] : selectedUser[1])) ? "follow following" : "follow"}
                disabled={followBusy}
                onClick={() => toggleFollow(selectedUser)}
              >                <UserPlus /> {followBusy ? "SAVING…" : following.includes(String(freshStart ? selectedUser[5] : selectedUser[1])) ? "FOLLOWING" : "FOLLOW"}
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
function Share({ log, net, displayName, close }: any) {
  const ownerName = String(displayName || "YOU").trim().toUpperCase();
  const shareToX = () => {
    const result = `${log.type === "win" ? "+" : "-"}${money(log.amount)}`;
    const text = `${ownerName} logged a ${log.type} on UPBY\n\n${result} · ${log.category}\n${log.title}`;
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`, "_blank", "noopener,noreferrer");
  };
  return (
    <motion.div
      className="backdrop center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={close}
    >
      <motion.div
        className="pop"
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className={`share-card ${log.type}`}>
          <Logo />
          <span>
            {ownerName} LOGGED A {log.type.toUpperCase()}
          </span>
          <strong>
            {log.type === "win" ? "+" : "-"}
            {money(log.amount)}
          </strong>
          <div>
            <b>{log.category.toUpperCase()}</b>
            <p>{log.title.toUpperCase()}</p>
          </div>
          <footer>
            <span>{log.type === "win" ? "UP BY" : "STILL UP BY"}</span>
            <b>{signedMoney(net)} THIS MONTH</b>
          </footer>
        </div>
        <button className="share-x" onClick={shareToX}>
          <Share2 />
          SHARE TO X
        </button>
        <button className="close" onClick={close}>
          <X />
        </button>
      </motion.div>
    </motion.div>
  );
}
function LogSuccess({ log }: { log: Log }) {
  return (
    <motion.div className={`log-success ${log.type}`} initial={{ opacity: 0, y: 24, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .96 }}>
      <div className="success-mark">{log.type === "win" ? <TrendingUp /> : <ShieldCheck />}</div>
      <div><span>{log.type === "win" ? "WIN LOGGED" : "LOSS RECORDED"}</span><strong>{log.type === "win" ? "+" : "-"}{money(log.amount)}</strong><small>Home and Insights updated</small></div>
      <i className="success-dot one" /><i className="success-dot two" /><i className="success-dot three" />
    </motion.div>
  );
}
function QuickLog({ close, choose }: { close: () => void; choose: (type: "win" | "loss") => void }) {
  return (
    <motion.div className="backdrop center quick-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
      <motion.div className="quick-log" initial={{ y: 24, scale: .94 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, opacity: 0 }} onMouseDown={(e) => e.stopPropagation()}>
        <span>WHAT ARE YOU LOGGING?</span>
        <h2>Add progress</h2>
        <div>
          <button className="win" onClick={() => choose("win")}><TrendingUp /><b>Win</b><small>Add something positive</small></button>
          <button className="loss" onClick={() => choose("loss")}><TrendingDown /><b>Loss</b><small>Record it and move on</small></button>
        </div>
        <button className="close" onClick={close}><X /></button>
      </motion.div>
    </motion.div>
  );
}
function Bottom({ tab, nav, add }: any) {
  const items: [[Tab, any], ...[Tab, any][]] = [
    ["home", Home],
    ["insights", BarChart3],
    ["profile", UserRound],
  ];
  return (
    <div className="bottom">
      <button className="add" onClick={add}>
        <Plus />
      </button>
      <nav>
        {items.map(([n, Icon]) => (
          <button
            className={tab === n ? "active" : ""}
            onClick={() => nav(n)}
            key={n}
          >
            {tab === n && <motion.i layoutId="pill" />}
            <Icon />
            <b>{n}</b>
          </button>
        ))}
      </nav>
    </div>
  );
}
