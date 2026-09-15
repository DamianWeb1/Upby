"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@supabase/supabase-js";
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
type ProfileData = { displayName: string; username: string; xProfile: string; avatarUrl: string | null };
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
const DEFAULT_PROFILE: ProfileData = { displayName: "Damian", username: "damian", xProfile: "damian__web", avatarUrl: null };
const DEFAULT_PREFS = [1, 1, 1, 0, 1];
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
    maximumFractionDigits: 0,
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
        <p className="auth-terms">By continuing, you agree to UPBY’s Terms and Privacy Policy.</p>
      </section>
    </main>
  );
}
function Onboarding({ onComplete, onBack, initialProfile = DEFAULT_PROFILE }: { onComplete: (profile: ProfileData, prefs: number[]) => void; onBack: () => void; initialProfile?: ProfileData }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [username, setUsername] = useState(initialProfile.username);
  const [xProfile, setXProfile] = useState(initialProfile.xProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatarUrl);
  const [privacy, setPrivacy] = useState([true, true, true, false, true]);
  const validIdentity = displayName.trim().length > 1 && username.trim().length >= 3;
  const next = () => setStep((value) => Math.min(3, value + 1));
  const previous = () => step === 0 ? onBack() : setStep((value) => Math.max(0, value - 1));
  const privacyLabels = [
    ["Show monetary totals", "Display monthly and yearly UPBY totals"],
    ["Show individual logs", "Let people see your public activity"],
    ["Show losses", "Include losses on your public profile"],
    ["Show screenshots", "Display screenshots attached to public logs"],
    ["Join the leaderboard", "Appear in Global rankings by default"],
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
              <div className="ready-summary"><span><b>@{username}</b>Your public profile</span><span><b>{privacy[4] ? "Visible" : "Hidden"}</b>Leaderboard status</span><span><b>Private by default</b>Screenshot visibility</span></div>
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
          {step === 1 && <button className="skip-step" onClick={next}>Skip for now</button>}
        </footer>
      </section>
    </main>
  );
}
export default function App() {
  const [stage, setStage] = useState<"auth" | "onboarding" | "app">("auth"),
    [tab, setTab] = useState<Tab>("home"),
    [logs, setLogs] = useState(START),
    [freshStart, setFreshStart] = useState(false),
    [profile, setProfile] = useState<ProfileData>(DEFAULT_PROFILE),
    [prefs, setPrefs] = useState(DEFAULT_PREFS),
    [following, setFollowing] = useState<string[]>(["Maya"]),
    [customCategories, setCustomCategories] = useState<Array<[string, string]>>([]),
    [hydrated, setHydrated] = useState(false),
    [authReady, setAuthReady] = useState(false),
    [authUser, setAuthUser] = useState<any>(null),
    [demoMode, setDemoMode] = useState(false),
    [sheet, setSheet] = useState<"win" | "loss" | null>(null),
    [editing, setEditing] = useState<Log | null>(null),
    [board, setBoard] = useState(false),
    [quick, setQuick] = useState(false),
    [share, setShare] = useState<Log | null>(null),
    [success, setSuccess] = useState<Log | null>(null),
    [toast, setToast] = useState("");
  useEffect(() => {
    let active = true;
    const applyUser = (user: any) => {
      if (!active) return;
      setAuthUser(user);
      if (user) {
        const metadata = user.user_metadata || {};
        const suggestedUsername = String(user.email || "member").split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
        setProfile((current) => ({
          displayName: metadata.display_name || metadata.full_name || metadata.name || current.displayName,
          username: metadata.username || suggestedUsername || current.username,
          xProfile: metadata.x_profile || current.xProfile,
          avatarUrl: metadata.avatar_url || current.avatarUrl,
        }));
        setStage(metadata.onboarding_complete ? "app" : "onboarding");
        setDemoMode(false);
      }
      setAuthReady(true);
    };
    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user || null));
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);
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
      if (Array.isArray(saved.prefs) && saved.prefs.length === 5) setPrefs(saved.prefs.map((value) => Number(Boolean(value))));
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
        const { data: stateData, error: stateError } = await supabase
          .from("user_states")
          .select("state")
          .eq("user_id", authUser.id)
          .maybeSingle();
        if (stateError) throw stateError;
        const raw = window.localStorage.getItem(userStorageKey);
        const localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
        const remoteState = stateData?.state as Partial<PersistedState> | undefined;
        const savedState = remoteState && applySavedState(remoteState)
          ? remoteState
          : localState && applySavedState(localState)
            ? localState
            : undefined;
        if (!savedState) resetAccount();

        const { data: logRows, error: logsError } = await supabase
          .from("logs")
          .select("id,user_id,type,amount,category,title,date_label,date_key,note,screenshot")
          .eq("user_id", authUser.id)
          .order("id", { ascending: false });
        if (logsError) throw logsError;
        if (logRows?.length) {
          if (active) setLogs((logRows as LogRow[]).map(rowToLog));
        } else {
          const legacyLogs = Array.isArray(localState?.logs) && localState.logs.length
            ? localState.logs
            : Array.isArray(savedState?.logs)
              ? savedState.logs
              : [];
          if (legacyLogs.length) {
            const { error: migrationError } = await supabase
              .from("logs")
              .upsert(legacyLogs.map((log) => logToRow(log, authUser.id)), { onConflict: "user_id,id" });
            if (migrationError) throw migrationError;
          }
          if (active) setLogs(legacyLogs);
        }
      } catch {
        try {
          const raw = window.localStorage.getItem(userStorageKey);
          const localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
          if (!localState || !applySavedState(localState)) resetAccount();
          else if (active && Array.isArray(localState.logs)) setLogs(localState.logs);
        } catch {
          window.localStorage.removeItem(userStorageKey);
          resetAccount();
        }
        if (active) setToast("Cloud sync is unavailable. Progress is still saved on this device.");
      } finally {
        if (active) setHydrated(true);
      }
    };
    hydrateAccount();
    return () => { active = false; };
  }, [authReady, authUser?.id]);
  useEffect(() => {
    if (!hydrated || !authUser) return;
    const saved: PersistedState = { version: 2, ownerId: authUser.id, stage, tab, logs, freshStart: true, profile, prefs, following, customCategories };
    const remoteState: PersistedState = { ...saved, logs: [] };
    try {
      window.localStorage.setItem(`${STORAGE_KEY}:${authUser.id}`, JSON.stringify(saved));
    } catch {
      setToast("Your browser could not save this update");
    }
    const syncTimer = window.setTimeout(async () => {
      const { error } = await supabase.from("user_states").upsert(
        { user_id: authUser.id, state: remoteState, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (error) setToast("Cloud sync is unavailable. Progress is still saved on this device.");
    }, 500);
    return () => window.clearTimeout(syncTimer);
  }, [hydrated, authUser, stage, tab, logs, freshStart, profile, prefs, following, customCategories]);
  const trackedLogs = logs.filter((log) => !log.dateKey || new Date(`${log.dateKey}T00:00:00`).getMonth() === new Date().getMonth());
  const wins =
      (freshStart ? 0 : 3390) +
      trackedLogs
        .filter((x) => x.type === "win")
        .reduce((a, b) => a + b.amount, 0),
    losses =
      (freshStart ? 0 : 520) +
      trackedLogs
        .filter((x) => x.type === "loss")
        .reduce((a, b) => a + b.amount, 0),
    net = wins - losses;
  const nav = (x: Tab) => {
    setTab(x);
    scrollTo({ top: 0, behavior: "smooth" });
  };
  const showSuccess = (log: Log) => {
    setSuccess(log);
    setTimeout(() => setSuccess(null), 1600);
  };
  const add = (x: Omit<Log, "id">) => {
    const l = { ...x, id: Date.now() };
    setLogs((v) => [l, ...v]);
    if (authUser) {
      void supabase.from("logs").insert(logToRow(l, authUser.id)).then(({ error }) => {
        if (error) setToast("This log is saved locally but has not synced yet.");
      });
    }
    setSheet(null);
    showSuccess(l);
    if (x.type === "win") setTimeout(() => setShare(l), 1750);
  };
  const updateLog = (id: number, data: Omit<Log, "id">) => {
    const updated = { ...data, id };
    setLogs((items) => items.map((item) => item.id === id ? updated : item));
    if (authUser) {
      void supabase.from("logs").update(logToRow(updated, authUser.id)).eq("user_id", authUser.id).eq("id", id).then(({ error }) => {
        if (error) setToast("Your edit is saved locally but has not synced yet.");
      });
    }
    setEditing(null);
    showSuccess(updated);
  };
  const removeLog = (id: number) => {
    setLogs((items) => items.filter((item) => item.id !== id));
    if (authUser) {
      void supabase.from("logs").delete().eq("user_id", authUser.id).eq("id", id).then(({ error }) => {
        if (error) setToast("The log was removed locally but the cloud update failed.");
      });
    }
    setToast("Log removed");
    setTimeout(() => setToast(""), 1800);
  };
  const signOut = async () => {
    if (authUser) await supabase.auth.signOut();
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
      const { error } = await supabase.auth.updateUser({ data: { display_name: nextProfile.displayName, username: nextProfile.username, x_profile: nextProfile.xProfile, avatar_url: nextProfile.avatarUrl?.startsWith("data:") ? null : nextProfile.avatarUrl, onboarding_complete: true } });
      if (error) return;
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
                freshStart,
                profile,
              }}
            />
          ) : tab === "insights" ? (
            <Insights {...{ net, wins, losses, logs, freshStart }} />
          ) : (
            <Profile {...{ net, wins, losses, logs, freshStart, profile, prefs, setPrefs, authUser, demoMode, signOut }} />
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
            initial={editing}
            close={() => { setSheet(null); setEditing(null); }}
            save={(data: Omit<Log, "id">) => editing ? updateLog(editing.id, data) : add(data)}
            remove={editing ? () => { removeLog(editing.id); setEditing(null); } : undefined}
            customCategories={customCategories}
            onAddCustom={(item: [string, string]) => setCustomCategories((items) => items.some(([name]) => name.toLowerCase() === item[0].toLowerCase()) ? items : [...items, item])}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {board && <Leaderboard close={() => setBoard(false)} following={following} setFollowing={setFollowing} />}
      </AnimatePresence>
      <AnimatePresence>
        {share && <Share log={share} net={net} close={() => setShare(null)} />}
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
  freshStart,
  profile,
}: any) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [streakDay, setStreakDay] = useState<number | null>(null);
  const firstEntry = freshStart ? logs[0] as Log | undefined : undefined;
  const isEmpty = freshStart && logs.length === 0;
  const streak = freshStart ? (logs.length ? 1 : 0) : 12;
  const todayIndex = (new Date().getDay() + 6) % 7;
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
            +{money(net)}
          </motion.strong>
          <em>THIS MONTH</em>
          <motion.small
            className="month-comparison"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {freshStart ? <><CalendarDays /> Today’s net · {net >= 0 ? "+" : "-"}{money(Math.abs(net))}</> : <><TrendingUp /> $1,100 ahead of August</>}
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
      {freshStart && firstEntry && (
        <motion.section className={`first-unlocked ${firstEntry.type}`} initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <i>{firstEntry.type === "win" ? <Trophy /> : <ShieldCheck />}</i>
          <div><span>FIRST ENTRY LOGGED</span><h2>{firstEntry.type === "win" ? "First win collected." : "First loss recorded."}</h2><p>Your Home is live. Today’s net is {net >= 0 ? "+" : "-"}{money(Math.abs(net))}.</p></div>
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
                <i className={(freshStart ? i === todayIndex : i < 6) ? "done" : ""}>{(freshStart ? i === todayIndex : i < 6) && <Check />}</i>
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
                ? freshStart ? "Your streak counts days you log, not consecutive wins." : "Log today to reach 13 days."
                : freshStart ? (streakDay === todayIndex ? "Today · progress logged" : "No log on this day yet.")
                : streakDay < 6
                  ? (streakDay === 0 ? "Monday" : streakDay === 1 ? "Tuesday" : streakDay === 2 ? "Wednesday" : streakDay === 3 ? "Thursday" : streakDay === 4 ? "Friday" : "Saturday") + " · progress logged"
                  : "No log yet. Add one to keep your streak."}
            </motion.p>
          </AnimatePresence>
        </section>
        <button className="rank block" onClick={() => setBoard(true)}>
          <label>
            <Globe2 />
            GLOBAL THIS MONTH
          </label>
          <h2>
            YOU’RE <strong>{freshStart ? "#184" : "#38"}</strong>
            <ArrowUpRight />
          </h2>
          {(freshStart ? [
            [182, "Nia", "+210"],
            [183, "Owen", "+175"],
            [184, "Damian", net >= 0 ? `+${money(net)}` : `-${money(Math.abs(net))}`],
            [185, "Liam", "+95"],
            [186, "Zee", "+80"],
          ] : [
            [36, "Maya", "+8.1K"],
            [37, "Chris", "+6.4K"],
            [38, "Damian", "+4.3K"],
            [39, "Noah", "+4.1K"],
            [40, "Alex", "+3.8K"],
          ]).map((x) => (
            <div className={x[0] === (freshStart ? 184 : 38) ? "me" : ""} key={x[0]}>
              <b>#{x[0]}</b>
              <span>{x[1]}</span>
              <em>{x[2]}</em>
            </div>
          ))}
        </button>
      </div>
      <section className="recent">
        <Title over="THE LATEST" title="Recent logs" action="View all" />
        <div>
          {logs.slice(0, 5).map((l: Log) => (
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
                      <span><CalendarDays /> {l.dateKey ? new Date(`${l.dateKey}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "September 8, 2026"}</span>
                    </div>
                    <footer>
                      <button onClick={() => setShare(l)}><Share2 /> Share</button>
                      <button onClick={() => setEditing(l)}><Edit3 /> Edit</button>
                      <button className="delete" onClick={() => removeLog(l.id)}><Trash2 /> Delete</button>
                    </footer>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          ))}
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
function LogSheet({ type, initial, close, save, remove, customCategories = [], onAddCustom }: any) {
  const today = new Date().toISOString().slice(0, 10);
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
    [category, setCategory] = useState(initial?.category || "Bounties"),
    [note, setNote] = useState(initial?.note || ""),
    [date, setDate] = useState(startingDate),
    [custom, setCustom] = useState(false),
    [customName, setCustomName] = useState(""),
    [customColor, setCustomColor] = useState("#1769ff"),
    [fileName, setFileName] = useState(""),
    [preview, setPreview] = useState<string | null>(null),
    [screenshotAttached, setScreenshotAttached] = useState(Boolean(initial?.screenshot)),
    [confirmDelete, setConfirmDelete] = useState(false);
  const savedCategories: Array<[string, string]> = [...customCategories, ...CATS];
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
            <span>{initial ? "UPDATE YOUR ENTRY" : "ADD TO YOUR MONTH"}</span>
            <h2>{initial ? "Edit progress" : "Log your progress"}</h2>
          </div>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <div className="toggle">
          <button
            className={kind === "win" ? "win" : ""}
            onClick={() => setKind("win")}
          >
            ↑ WIN
          </button>
          <button
            className={kind === "loss" ? "loss" : ""}
            onClick={() => setKind("loss")}
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
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                />
              </div>
            </label>
            <div className="amount-presets">
              {[100, 500, 1000].map((value) => <button key={value} onClick={() => setAmount(String(value))}>+{money(value)}</button>)}
            </div>
            <Field label="PROJECT OR TITLE">
              <input
                placeholder="What happened?"
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
            <label className="field-label">CATEGORY</label>
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
        <div className="sheet-actions">
          {initial && <button className={confirmDelete ? "sheet-delete confirm" : "sheet-delete"} onClick={() => confirmDelete ? remove() : setConfirmDelete(true)}><Trash2 />{confirmDelete ? "DELETE THIS LOG?" : "DELETE"}</button>}
          <button
            className={`submit ${kind}`}
            disabled={!Number(amount) || !title.trim() || !date}
            onClick={() => save({ type: kind, amount: Number(amount), title: title.trim(), category, date: formatDate(date), dateKey: date, note: note.trim(), screenshot: screenshotAttached })}
          >
            {initial ? "SAVE CHANGES" : `LOG ${kind.toUpperCase()}`}
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
  const streak = logs.length ? 1 : 0;
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
const recapOptions = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
  "2026 Year",
];
const recapData: Record<string, { wins: number; losses: number; logs: string; streak: string; rank: string }> = {
  January: { wins: 1820, losses: 260, logs: "9 WINS · 2 LOSSES", streak: "6 DAY STREAK", rank: "#92 GLOBAL" },
  February: { wins: 2240, losses: 410, logs: "11 WINS · 3 LOSSES", streak: "8 DAY STREAK", rank: "#81 GLOBAL" },
  March: { wins: 2680, losses: 530, logs: "12 WINS · 4 LOSSES", streak: "10 DAY STREAK", rank: "#70 GLOBAL" },
  April: { wins: 1950, losses: 380, logs: "8 WINS · 3 LOSSES", streak: "7 DAY STREAK", rank: "#76 GLOBAL" },
  May: { wins: 3140, losses: 620, logs: "14 WINS · 5 LOSSES", streak: "12 DAY STREAK", rank: "#58 GLOBAL" },
  June: { wins: 2460, losses: 520, logs: "10 WINS · 4 LOSSES", streak: "9 DAY STREAK", rank: "#61 GLOBAL" },
  July: { wins: 1180, losses: 1600, logs: "7 WINS · 8 LOSSES", streak: "5 DAY STREAK", rank: "#108 GLOBAL" },
  August: { wins: 3860, losses: 680, logs: "16 WINS · 5 LOSSES", streak: "11 DAY STREAK", rank: "#47 GLOBAL" },
  September: { wins: 4920, losses: 640, logs: "18 WINS · 5 LOSSES", streak: "12 DAY STREAK", rank: "#38 GLOBAL" },
  October: { wins: 0, losses: 0, logs: "NO LOGS YET", streak: "0 DAY STREAK", rank: "UNRANKED" },
  November: { wins: 0, losses: 0, logs: "NO LOGS YET", streak: "0 DAY STREAK", rank: "UNRANKED" },
  December: { wins: 0, losses: 0, logs: "NO LOGS YET", streak: "0 DAY STREAK", rank: "UNRANKED" },
  "2026 Year": { wins: 24250, losses: 5040, logs: "105 WINS · 39 LOSSES", streak: "21 DAY LONGEST STREAK", rank: "#38 BEST RANK" },
};
const progressDays = [
  { day: 1, value: 220 },
  { day: 3, value: 510 },
  { day: 5, value: 390 },
  { day: 8, value: 1040 },
  { day: 11, value: 860 },
  { day: 14, value: 1610 },
  { day: 17, value: 2310 },
  { day: 20, value: 2090 },
  { day: 23, value: 3180 },
  { day: 26, value: 3770 },
  { day: 30, value: 4280 },
];
function ProgressPath() {
  const [active, setActive] = useState(8);
  const points = progressDays.map((item, i) => ({
    ...item,
    x: 18 + i * 46.4,
    y: 128 - (item.value / 4280) * 96,
  }));
  const line = points.map((point) => point.x + "," + point.y).join(" ");
  const current = points[active];
  return (
    <div className="progress-path">
      <div className="progress-tip" style={{ left: (current.x / 500) * 100 + "%" }}>
        <b>{current.value >= 0 ? "+" : ""}{money(current.value)}</b>
        <span>SEP {current.day}</span>
      </div>
      <svg viewBox="0 0 500 150" role="img" aria-label="Interactive monthly progress path">
        <defs>
          <linearGradient id="pathFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8ef43" stopOpacity=".48" />
            <stop offset="100%" stopColor="#c8ef43" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={line + " 482,145 18,145"} fill="url(#pathFill)" />
        <motion.polyline
          points={line}
          fill="none"
          stroke="#c8ef43"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: .8 }}
        />
        {points.map((point, i) => (
          <circle
            key={point.day}
            cx={point.x}
            cy={point.y}
            r={i === active ? 8 : 5}
            fill={i === active ? "#fffdf7" : "#c8ef43"}
            stroke="#171b38"
            strokeWidth="3"
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
          />
        ))}
      </svg>
      <footer><span>SEP 1</span><span>DRAG OR TAP A POINT</span><span>SEP 30</span></footer>
    </div>
  );
}
function Insights({ net, wins, losses, logs, freshStart }: any) {
  const [month, setMonth] = useState(0),
    [pop, setPop] = useState<string | null>(null),
    [recapPeriod, setRecapPeriod] = useState("September"),
    [periodOpen, setPeriodOpen] = useState(false),
    months = ["September", "August", "July", "June"];
  const nums = freshStart ? [net, 0, 0, 0] : [net, 3180, -420, 1940];
  const demoDayValues = [
    220, 450, 0, -120, 680, 310, 0, 540, 760, -80,
    420, 0, 910, 350, -240, 620, 480, 0, 700, -160,
    840, 390, 0, 560, 290, 0, 0, 0, 0, 0,
  ];
  const monthIndexes = [8, 7, 6, 5];
  const activeLogs = freshStart ? logs.filter((log: Log) => log.dateKey ? new Date(`${log.dateKey}T00:00:00`).getMonth() === monthIndexes[month] : month === 0) : logs;
  const activeWins = freshStart ? activeLogs.filter((log: Log) => log.type === "win").reduce((total: number, log: Log) => total + log.amount, 0) : wins;
  const activeLosses = freshStart ? activeLogs.filter((log: Log) => log.type === "loss").reduce((total: number, log: Log) => total + log.amount, 0) : losses;
  const activeNet = freshStart ? activeWins - activeLosses : nums[month];
  const winCount = freshStart ? activeLogs.filter((log: Log) => log.type === "win").length : 18;
  const lossCount = freshStart ? activeLogs.filter((log: Log) => log.type === "loss").length : 5;
  const streak = freshStart ? (logs.length ? 1 : 0) : 12;
  const freshDays = Array.from({ length: 30 }, () => 0);
  activeLogs.forEach((log: Log) => {
    const day = log.dateKey ? new Date(`${log.dateKey}T00:00:00`).getDate() : new Date().getDate();
    freshDays[Math.min(29, day - 1)] += log.type === "win" ? log.amount : -log.amount;
  });
  const dayValues = freshStart ? freshDays : demoDayValues;
  const categoryTotals = activeLogs.reduce((totals: Record<string, number>, log: Log) => {
    totals[log.category] = (totals[log.category] || 0) + (log.type === "win" ? log.amount : -log.amount);
    return totals;
  }, {});
  const categoryItems = freshStart
    ? (Object.entries(categoryTotals) as Array<[string, number]>).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 5).map(([name, value], index) => [name, signedMoney(value), ["big", "mid", "coral", "small", ""][index]])
    : [["Bounties", "$1,850", "big"], ["Dev", "$1,420", "mid"], ["Content", "$840", "coral"], ["X Money", "$510", "small"], ["Other", "$300", ""]];
  const bestCategory = categoryItems.length ? String(categoryItems[0][0]) : "No logs yet";
  const earned = freshStart ? earnedFrom(logs, net) : badges.slice(0, 7);
  const recapFor = (period: string) => {
    if (!freshStart) return recapData[period];
    const periodLogs = period === "2026 Year" ? logs : logs.filter((log: Log) => {
      const logMonth = log.dateKey ? new Date(`${log.dateKey}T00:00:00`).toLocaleDateString("en-US", { month: "long" }) : "September";
      return logMonth === period;
    });
    const periodWins = periodLogs.filter((log: Log) => log.type === "win").reduce((total: number, log: Log) => total + log.amount, 0);
    const periodLosses = periodLogs.filter((log: Log) => log.type === "loss").reduce((total: number, log: Log) => total + log.amount, 0);
    const periodWinCount = periodLogs.filter((log: Log) => log.type === "win").length;
    const periodLossCount = periodLogs.filter((log: Log) => log.type === "loss").length;
    return { wins: periodWins, losses: periodLosses, logs: periodLogs.length ? `${periodWinCount} WINS · ${periodLossCount} LOSSES` : "NO LOGS YET", streak: `${periodLogs.length ? 1 : 0} DAY STREAK`, rank: periodLogs.length ? "#184 GLOBAL" : "UNRANKED" };
  };
  return (
    <div className="page insights">
      <section className="insight-hero">
        <div>
          <button onClick={() => setMonth(Math.min(3, month + 1))}>
            <ChevronLeft />
          </button>
          <span>YOUR {months[month].toUpperCase()}</span>
          <button onClick={() => setMonth(Math.max(0, month - 1))}>
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
        <div className="daily-bars" aria-label={`Daily progress for ${months[month]}`}>
          {dayValues.map((value, index) => (
            <i
              key={index}
              className={
                value > 0 ? "positive" : value < 0 ? "negative" : "empty"
              }
              style={{ height: value === 0 ? "14%" : Math.max(24, Math.abs(value) / 9.5) + "%" }}
            />
          ))}
        </div>
        <footer className="daily-axis">
          <span>{months[month].slice(0, 3).toUpperCase()} 1</span>
          <b>DAILY NET</b>
          <span>{months[month].slice(0, 3).toUpperCase()} 30</span>
        </footer>
      </section>
      <section className="stats">
        {[
          ["UP BY", signedMoney(activeNet)],
          ["TOTAL WINS", money(activeWins)],
          ["TOTAL LOSSES", money(activeLosses)],
          ["NUMBER OF WINS", String(winCount)],
          ["NUMBER OF LOSSES", String(lossCount)],
          ["LONGEST STREAK", freshStart ? `${streak} day${streak === 1 ? "" : "s"}` : "21 days"],
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
          {Array.from({ length: 30 }, (_, i) => {
            const value = dayValues[i];
            return (
              <div
                className={value > 0 ? "positive" : value < 0 ? "negative" : "empty"}
                key={i}
              >
                <span>{i + 1}</span>
                <b>{value === 0 ? "No activity" : (value > 0 ? "+" : "") + money(value)}</b>
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
          <p>Turn any month or your full year into one shareable card.</p>
          <div className="year-total">
            <span>2026 TOTAL</span>
            <strong>{freshStart ? signedMoney(net) : "+$19,210"}</strong>
          </div>
        </div>
        <div className="recap-controls">
          <div className="period-picker">
            <span>PERIOD</span>
            <button className="period-trigger" onClick={() => setPeriodOpen(!periodOpen)}>
              <CalendarDays />
              <b>{recapPeriod}</b>
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
                  <div className="month-options">
                    {recapOptions.slice(0, 12).map((period) => (
                      <button
                        className={recapPeriod === period ? "active" : ""}
                        key={period}
                        onClick={() => { setRecapPeriod(period); setPeriodOpen(false); }}
                      >
                        <span>{period.slice(0, 3).toUpperCase()}</span>
                        <small>{recapFor(period).wins || recapFor(period).losses ? signedMoney(recapFor(period).wins - recapFor(period).losses) : "No logs"}</small>
                      </button>
                    ))}
                  </div>
                  <button
                    className={recapPeriod === "2026 Year" ? "year-option active" : "year-option"}
                    onClick={() => { setRecapPeriod("2026 Year"); setPeriodOpen(false); }}
                  >
                    <span><Sparkles /> 2026 YEAR RECAP</span>
                    <b>{freshStart ? signedMoney(net) : "+$19,210"}</b>
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
function RecapStory({ period, recapOverride }: { period: string; recapOverride?: { wins: number; losses: number; logs: string; streak: string; rank: string } }) {
  const [slide, setSlide] = useState(0);
  const recap = recapOverride || recapData[period] || recapData.September;
  const net = recap.wins - recap.losses;
  const isYear = period === "2026 Year";
  const liveRecap = Boolean(recapOverride);
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
            <span>{isYear ? "YOUR YEAR ON UPBY" : "YOUR " + period.toUpperCase()}</span>
            <h2>{net > 0 ? "+" : ""}{money(net)}</h2>
            <b>{isYear ? "UP BY THIS YEAR" : "UP BY THIS MONTH"}</b>
            <p>{isYear ? "Twelve months. One number." : "Every log added up to this."}</p>
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
            <div className="story-stat"><strong>{liveRecap ? recap.logs.split(" ")[0] : isYear ? "105" : period === "September" ? "18" : recap.logs.split(" ")[0]}</strong><small>WINS LOGGED</small></div>
            <p>{recap.wins ? `Best day: +${money(recap.wins)}` : "No wins logged in this period."}</p>
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
            <h2>{liveRecap ? recap.streak.split(" ")[0] : isYear ? "21" : period === "September" ? "12" : recap.streak.split(" ")[0]}</h2>
            <b>{isYear ? "DAY LONGEST STREAK" : "DAY STREAK"}</b>
            <div className="story-rank"><Trophy /><span>BEST POSITION</span><strong>{recap.rank.split(" ")[0]}</strong></div>
          </>}
          {slide === 4 && <>
            <div className="story-icon-stage final-icons">
              <motion.i animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: "linear" }}><Crown /></motion.i>
              <Medal className="orbit-icon one" />
              <Share2 className="orbit-icon two" />
              <Sparkles className="orbit-icon three" />
            </div>
            <span>{isYear ? "MY 2026" : "MY " + period.toUpperCase()}</span>
            <div className="final-split"><b>{money(recap.wins)}<small>WINS</small></b><b>{money(recap.losses)}<small>LOSSES</small></b></div>
            <h2>{net > 0 ? "+" : ""}{money(net)}</h2>
            <b>UP BY</b>
            <footer>{recap.logs}<br />{recap.streak} · {recap.rank}</footer>
          </>}
        </motion.section>
      </AnimatePresence>
      <div className="story-controls">
        <button onClick={previous} disabled={slide === 0}><ChevronLeft /> BACK</button>
        {slide < 4 ? <button onClick={next}>NEXT <ChevronRight /></button> : <button className="story-share"><Share2 /> SHARE RECAP</button>}
      </div>
      <small className="swipe-hint">SWIPE OR USE THE BUTTONS</small>
    </div>
  );
}
function Profile({ net, wins, losses, logs, freshStart, profile, prefs, setPrefs, authUser, demoMode, signOut }: any) {
  const [settings, setSettings] = useState(false),
    [publicPreview, setPublicPreview] = useState(false);
  const streak = freshStart ? (logs.length ? 1 : 0) : 12;
  const earned = freshStart ? earnedFrom(logs, net) : ["FIRST WIN", "30 DAY STREAK", "$5K MONTH", "TOP 100"];
  const selectedAchievements = freshStart ? earned.slice(0, 4) : earned;
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
          <p>Building on the internet. Tracking every step.</p>
        </div>
        {freshStart ? <button className="public" onClick={() => setPublicPreview(true)}>VIEW PUBLIC PROFILE<ArrowUpRight /></button> : <a className="public" href="/damian">VIEW PUBLIC PROFILE<ArrowUpRight /></a>}
      </section>
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
              "Show monetary totals",
              "Show individual logs",
              "Show losses",
              "Show screenshots",
              "Join global leaderboard",
            ].map((x, i) => (
              <label key={x}>
                {x}
                <button
                  className={prefs[i] ? "on" : ""}
                  onClick={() =>
                    setPrefs((v: number[]) => v.map((n: number, j: number) => (j === i ? +!n : n)))
                  }
                >
                  <i />
                </button>
              </label>
            ))}
            <div className="account-session">
              <div><b>{demoMode ? "Demo session" : authUser?.email}</b><span>{demoMode ? "Sample data mode" : "Signed in securely with Supabase"}</span></div>
              <button onClick={signOut}><LogOut />{demoMode ? "EXIT DEMO" : "SIGN OUT"}</button>
            </div>
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
          <b>{freshStart ? 0 : 248}</b>
          <span>FOLLOWING</span>
        </div>
        <div>
          <b>{freshStart ? 0 : "1,842"}</b>
          <span>FOLLOWERS</span>
        </div>
        <button>
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
          )) : <div className="profile-empty"><Trophy /><b>Your first badge is waiting</b><span>Log progress to collect it.</span></div>}
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
          {(freshStart ? [
            ["SEP", signedMoney(net)],
            ["AUG", "$0"],
            ["JUL", "$0"],
            ["JUN", "$0"],
          ] : [
            ["SEP", "+$4,280"],
            ["AUG", "+$3,180"],
            ["JUL", "-$420"],
            ["JUN", "+$1,940"],
          ]).map((x) => (
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
function Leaderboard({ close, following, setFollowing }: any) {
  const [view, setView] = useState("GLOBAL"),
    [period, setPeriod] = useState("THIS MONTH"),
    [selectedUser, setSelectedUser] = useState<any>(null);
  const users = useMemo(
    () => [
      [1, "Zee", "zee", "+24,800", 28],
      [2, "Aria", "ariaup", "+18,420", 41],
      [3, "Kofi", "kofiworks", "+14,900", 19],
      [36, "Maya", "maya", "+8,100", 14],
      [37, "Chris", "chris", "+6,400", 8],
      [38, "Damian", "damian", "+4,280", 12],
      [39, "Noah", "noah", "+4,110", 7],
      [40, "Alex", "alex", "+3,820", 22],
    ],
    [],
  );
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
          {users.slice(0, 3).map((u, i) => (
            <div className={`top n${i + 1}`} key={u[0]}>
              <span>#{u[0]}</span>
              <i>{String(u[1])[0]}</i>
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
          {users.slice(3).map((u) => (
            <motion.div
              layout
              className={u[1] === "Damian" ? "me" : ""}
              key={u[1]}
              onClick={() => u[1] !== "Damian" && setSelectedUser(u)}
            >
              <b>#{u[0]}</b>
              <i>{String(u[1])[0]}</i>
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
        <div className="pinned-rank"><b>#38</b><span>D · Damian</span><strong>+4,280</strong><em><TrendingUp /> 4</em></div>
      </motion.main>
      <AnimatePresence>
        {selectedUser && (
          <motion.div className="leader-profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)}>
            <motion.section initial={{ y: 40, scale: .94 }} animate={{ y: 0, scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <button className="close" onClick={() => setSelectedUser(null)}><X /></button>
              <i>{String(selectedUser[1])[0]}</i>
              <span>UPBY MEMBER</span>
              <h2>{selectedUser[1]}</h2>
              <p>@{selectedUser[2]}</p>
              <strong>{selectedUser[3]} this month</strong>
              <button
                className={following.includes(String(selectedUser[1])) ? "follow following" : "follow"}
                onClick={() => setFollowing((items: string[]) => items.includes(String(selectedUser[1])) ? items.filter((x: string) => x !== String(selectedUser[1])) : [...items, String(selectedUser[1])])}
              >                <UserPlus /> {following.includes(String(selectedUser[1])) ? "FOLLOWING" : "FOLLOW"}
              </button>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
function Share({ log, net, close }: any) {
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
            {log.type === "win"
              ? "DAMIAN LOGGED A WIN"
              : `-${money(log.amount)} TODAY`}
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
            <b>+{money(net)} THIS MONTH</b>
          </footer>
        </div>
        <button className="share-x">
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
