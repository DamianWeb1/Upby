"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bottom, LogSuccess, QuickLog, Share } from "./AppChrome";
import { AuthWelcome, Onboarding } from "./AuthScreens";
import { errorMetadata } from "./error-metadata";
import { HomeView } from "./HomeView";
import { periodSummary } from "./insight-periods";
import { Badge, Insights } from "./Insights";
import { Leaderboard } from "./Leaderboard";
import { LogSheet } from "./LogSheet";
import MonthlyRecapPrompt from "./MonthlyRecapPrompt";
import { Profile } from "./Profile";
import { SCREENSHOT_BUCKET, screenshotObjectPath } from "./screenshot-storage";
import { LoadingProgress, Logo } from "./ui";
import {
  DEFAULT_PREFS,
  DEFAULT_PROFILE,
  type LeaderboardEntry,
  type Log,
  type LogDraft,
  type LogRow,
  type PersistedState,
  type ProfileData,
  START,
  STORAGE_KEY,
  type Tab,
  authenticatedWrite,
  localToday,
  logToRow,
  rowToLog,
  supabase,
  trackProductEvent,
} from "./upby-core";

export default function App() {
  const [calendarDay, setCalendarDay] = useState(localToday);
  const [monthlyRecap, setMonthlyRecap] = useState<string | null>(null);
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
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const writing = useRef(false);
  const revision = useRef(0);
  const draftId = useRef<number | null>(null);
  const currentScreen = useRef("");
  const authUserId: string | undefined = authUser?.id;
  const authUserRef = useRef(authUser);
  useEffect(() => {
    authUserRef.current = authUser;
  }, [authUser]);
  const [saveStatus, setSaveStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [undoLog, setUndoLog] = useState<{ log: Log; owner: string | null } | null>(null);
  const [repeatLog, setRepeatLog] = useState<Log | null>(null);
  useEffect(() => {
    if (hydrated && authReady) { setAuthTimedOut(false); return; }
    const timer = window.setTimeout(() => setAuthTimedOut(true), 10000);
    return () => window.clearTimeout(timer);
  }, [hydrated, authReady]);
  useEffect(() => {
    setUndoLog(null); setRepeatLog(null); setMonthlyRecap(null); setSaveStatus(""); draftId.current = null;
  }, [authUserId]);
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
    if (!authUserId || demoMode) return;
    let active = true;
    void fetch("/api/region", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Region lookup failed")))
      .then((result: { country?: string }) => {
        if (active && /^[A-Z]{2}$/.test(result.country || "")) setCountryCode(result.country || "");
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [authUserId, demoMode]);
  useEffect(() => {
    if (!authReady) return;
    if (!authUserId) {
      setHydrated(true);
      return;
    }
    let active = true;
    const userStorageKey = `${STORAGE_KEY}:${authUserId}`;
    const applySavedState = (saved: Partial<PersistedState>) => {
      if (!active || saved.version !== 2 || saved.ownerId !== authUserId) return false;
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
      setStage(authUserRef.current?.user_metadata?.onboarding_complete ? "app" : "onboarding");
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
        const responses = await Promise.all([
          supabase.from("user_states").select("state").eq("user_id", authUserId).maybeSingle(),
          supabase.from("profiles").select("display_name,username,avatar_url,bio,x_profile,show_totals,show_logs,show_losses,show_screenshots,leaderboard_enabled,public_profile_enabled").eq("user_id", authUserId).maybeSingle(),
          supabase.from("follows").select("followed_id").eq("follower_id", authUserId),
          supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq("followed_id", authUserId),
          supabase.from("logs").select("id,user_id,type,amount,category,title,date_label,date_key,note,merchant,payment_method,screenshot,screenshot_path").eq("user_id", authUserId).order("id", { ascending: false }),
        ]);
        const [
          { data: stateData, error: stateError },
          { data: savedProfile, error: savedProfileError },
          { data: followedRows, error: followsError },
          { count: followers, error: followersError },
          { data: logRows, error: logsError },
        ] = responses;
        const querySources = ["user_states", "profiles", "following", "followers", "logs"] as const;
        responses.forEach((response, index) => {
          if (response.error) void trackProductEvent(authUserId, "client_error", "sync", errorMetadata(response.error, querySources[index], "hydrate_query_failed", response));
        });

        let localState: Partial<PersistedState> | undefined;
        try {
          const raw = window.localStorage.getItem(userStorageKey);
          localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
        } catch (error) {
          void trackProductEvent(authUserId, "client_error", "storage", errorMetadata(error, "local_state", "local_state_invalid"));
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
        void trackProductEvent(authUserId, "client_error", "sync", errorMetadata(error, "hydrate_account", "hydrate_rejected"));
        try {
          const raw = window.localStorage.getItem(userStorageKey);
          const localState = raw ? JSON.parse(raw) as Partial<PersistedState> : undefined;
          if (!localState || !applySavedState(localState)) resetAccount();
          else if (active && Array.isArray(localState.logs)) setLogs(localState.logs);
        } catch (storageError) {
          void trackProductEvent(authUserId, "client_error", "storage", errorMetadata(storageError, "local_state", "local_state_invalid"));
          window.localStorage.removeItem(userStorageKey);
          resetAccount();
        }
      } finally {
        if (active) setHydrated(true);
      }
    };
    hydrateAccount();
    return () => { active = false; };
  }, [authReady, authUserId]);
  useEffect(() => {
    if (!hydrated || !authUserId || demoMode) return;
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
          .select("id,user_id,type,amount,category,title,date_label,date_key,note,merchant,payment_method,screenshot,screenshot_path")
          .eq("user_id", authUserId)
          .order("id", { ascending: false });
        if (error) throw error;
        if (active && !writing.current && requestRevision === revision.current) setLogs((data as LogRow[] | null)?.map(rowToLog) || []);
      } catch (error) {
        void trackProductEvent(authUserId, "client_error", "sync", errorMetadata(error, "logs", "log_refresh_failed"));
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
    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) void refreshLogs();
    }, 30000);
    const channel = supabase
      .channel(`upby-logs-${authUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logs", filter: `user_id=eq.${authUserId}` },
        () => { void refreshLogs(); },
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") { void refreshLogs(); return; }
        const realtimeMessage = error?.message || "";
        const authTimingError = /jwt|token.*expired|issued at future/i.test(realtimeMessage);
        const transientConnectionError = /transport failure|socket closed|heartbeat timeout/i.test(realtimeMessage);
        if (authTimingError && !recoveringAuth) {
          recoveringAuth = true;
          void supabase.auth.refreshSession().then(async ({ data, error: refreshError }) => {
            if (!refreshError && data.session && active) {
              await supabase.realtime.setAuth(data.session.access_token);
              await refreshLogs();
            }
          }).catch(() => undefined).finally(() => { recoveringAuth = false; });
        }

        if ((status === "CHANNEL_ERROR" || status === "TIMED_OUT") && !authTimingError && !transientConnectionError && document.visibilityState === "visible" && navigator.onLine && Date.now() - lastRealtimeError > 60000) {
          lastRealtimeError = Date.now();
          void trackProductEvent(authUserId, "client_error", "sync", errorMetadata(error, "logs_realtime", "realtime_failed"));
        }
      });
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onFocus);
      window.clearInterval(pollTimer);
      void supabase.removeChannel(channel);
    };
  }, [hydrated, authUserId, demoMode]);
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
    if (!hydrated || !authUserId || stage !== "app" || demoMode) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const { error: profileError } = await supabase.from("profiles").upsert({
          user_id: authUserId,
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
          void trackProductEvent(authUserId, "client_error", "profile", errorMetadata(profileError, "profiles", "profile_sync_failed"));
          return;
        }
        const { data, error } = await supabase.rpc("get_leaderboard", { leaderboard_period: "this_month" });
        if (!error && active) setLeaderboard((data || []) as LeaderboardEntry[]);
      } catch (error) {
        void trackProductEvent(authUserId, "client_error", "profile", errorMetadata(error, "profiles", "profile_sync_rejected"));
      }
    }, 700);
    return () => { active = false; window.clearTimeout(timer); };
  }, [hydrated, authUserId, stage, demoMode, profile.displayName, profile.username, profile.avatarUrl, profile.bio, profile.xProfile, prefs, logs, countryCode]);
  useEffect(() => {
    currentScreen.current = stage === "app" ? tab : stage;
  }, [stage, tab]);
  useEffect(() => {
    if (!hydrated || !authUserId || demoMode) return;
    void trackProductEvent(authUserId, "screen_view", "navigation", { screen: stage === "app" ? tab : stage });
  }, [hydrated, authUserId, demoMode, stage, tab]);
  useEffect(() => {
    if (!hydrated || !authUserId || demoMode) return;
    const reportError = (code: string, details: Record<string, string | number> = {}) => {
      const key = `upby:runtime-error:${authUserId}:${code}`;
      const now = Date.now();
      const lastReport = Number(window.sessionStorage.getItem(key) || 0);
      if (now - lastReport < 60_000) return;
      window.sessionStorage.setItem(key, String(now));
      void trackProductEvent(authUserId, "client_error", "runtime", { code, ...details });
    };
    const runtimeDetails = (error: unknown, fallback: string, file = "", line = 0, column = 0) => {
      const stack = error instanceof Error && error.stack ? error.stack.split("\n").slice(0, 3).join(" | ") : "";
      let path = file;
      try { path = file ? new URL(file).pathname : ""; } catch {}
      return {
        message: ((error instanceof Error && error.message) || fallback || "No error message").slice(0, 180),
        error_code: (error instanceof Error ? error.name : "unknown").slice(0, 60),
        source: `${path}${line ? `:${line}:${column}` : ""}`.slice(0, 120) || "unknown",
        hint: stack.slice(0, 180),
        screen: currentScreen.current,
      };
    };
    const onError = (event: ErrorEvent) => {
      if (/ResizeObserver loop|Script error/i.test(event.message || "")) return;
      reportError("window_error", runtimeDetails(event.error, event.message, event.filename, event.lineno, event.colno));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const name = reason instanceof DOMException ? reason.name : "";
      if (name === "AbortError" || name === "NotAllowedError") return;
      const message = reason instanceof Error ? reason.message : String(reason || "");
      reportError(/failed to fetch|load failed|network/i.test(message) ? "network_rejection" : "unhandled_rejection", runtimeDetails(reason, message));
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [hydrated, authUserId, demoMode]);
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
  const persistLog = async (log: Log, operation: "create" | "update" | "restore", screenshotFile?: File | null, removeScreenshot = false) => {
    if (writing.current) return;
    writing.current = true; revision.current += 1; setBusy(true); setSaveStatus("Saving entry…");
    const existingPath = logs.find(item => item.id === log.id)?.screenshotPath;
    let uploadedPath: string | undefined;
    try {
      let nextLog = log;
      if (authUser && screenshotFile) {
        uploadedPath = screenshotObjectPath(authUser.id, log.id, crypto.randomUUID(), screenshotFile.type);
        const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).upload(uploadedPath, screenshotFile, {
          contentType: screenshotFile.type,
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        nextLog = { ...log, screenshot: true, screenshotPath: uploadedPath };
      } else if (removeScreenshot) {
        nextLog = { ...log, screenshot: false, screenshotPath: undefined };
      }
      if (authUser) await authenticatedWrite(() => supabase.from("logs").upsert(logToRow(nextLog, authUser.id), { onConflict: "user_id,id" }));
      if (authUser && existingPath && existingPath !== nextLog.screenshotPath) {
        const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).remove([existingPath]);
        if (error) void trackProductEvent(authUser.id, "client_error", "storage", errorMetadata(error, "log_screenshot", "old_screenshot_cleanup_failed"));
      }
      setLogs(items => [nextLog, ...items.filter(item => item.id !== nextLog.id)].sort((a, b) => b.id - a.id));
      if (operation !== "restore") {
        setSheet(null); setEditing(null); setRepeatLog(null); draftId.current = null;
        showSuccess(nextLog);
      } else setUndoLog(null);
      setSaveStatus(authUser ? "Entry saved" : "Saved in demo");
      if (authUser) void trackProductEvent(authUser.id, operation === "update" ? "log_updated" : "log_created", "logs", { type: nextLog.type, category: nextLog.category, screenshot: Boolean(nextLog.screenshotPath) });
    } catch (error) {
      if (authUser && uploadedPath) await supabase.storage.from(SCREENSHOT_BUCKET).remove([uploadedPath]);
      if (operation === "restore") setUndoLog({ log, owner: authUser?.id || null });
      setSaveStatus(operation === "restore" ? "Restore failed. Tap Undo to retry." : "Entry not saved. Your draft is still open. Tap Retry.");
      if (authUser) void trackProductEvent(authUser.id, "client_error", "logs", errorMetadata(error, "logs", `${operation}_failed`));
    } finally { writing.current = false; revision.current += 1; setBusy(false); }
  };
  const add = (data: LogDraft) => {
    if (!draftId.current) draftId.current = Date.now();
    const { screenshotFile, removeScreenshot, ...log } = data;
    return persistLog({ ...log, id: draftId.current }, "create", screenshotFile, removeScreenshot);
  };
  const updateLog = (id: number, data: LogDraft) => {
    const { screenshotFile, removeScreenshot, ...log } = data;
    return persistLog({ ...log, id }, "update", screenshotFile, removeScreenshot);
  };
  const removeLog = async (id: number) => {
    if (writing.current) return;
    const removed = logs.find(item => item.id === id);
    if (!removed) return;
    writing.current = true; revision.current += 1; setBusy(true); setSaveStatus("Deleting entry…");
    try {
      if (authUser) await authenticatedWrite(() => supabase.from("logs").delete().eq("user_id", authUser.id).eq("id", id));
      let undoLogValue = removed;
      if (authUser && removed.screenshotPath) {
        const { error } = await supabase.storage.from(SCREENSHOT_BUCKET).remove([removed.screenshotPath]);
        if (error) void trackProductEvent(authUser.id, "client_error", "storage", errorMetadata(error, "log_screenshot", "deleted_screenshot_cleanup_failed"));
        else undoLogValue = { ...removed, screenshot: false, screenshotPath: undefined };
      }
      setLogs(items => items.filter(item => item.id !== id));
      setEditing(null);
      setUndoLog({ log: undoLogValue, owner: authUser?.id || null });
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
    return <LoadingProgress stalled={authTimedOut} />;
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
          {(["home", "insights", "leaderboard", "profile"] as Tab[]).map((x) => (
            <button
              className={tab === x ? "active" : ""}
              onClick={() => nav(x)}
              key={x}
            >
              {x === "insights" ? "Stats" : x === "leaderboard" ? "Rank" : x}
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
                calendarDay,
              }}
            />
          ) : tab === "insights" ? (
            <Insights {...{ net, wins, losses, logs, freshStart, profile, authUserId }} />
          ) : tab === "leaderboard" ? (
            <Leaderboard embedded close={() => nav("home")} following={following} setFollowing={setFollowing} freshStart={freshStart} profile={profile} net={net} logs={logs} leaderboard={leaderboard} authUserId={authUser?.id} />
          ) : (
            <Profile {...{ net, wins, losses, logs, freshStart, profile, setProfile, prefs, setPrefs, authUser, demoMode, signOut, followingCount: following.length, followerCount, startLog: () => setQuick(true) }} />
          )}
        </motion.main>
      </AnimatePresence>
      <Bottom tab={tab} nav={nav} add={() => setQuick(true)} />
      {hydrated && authUser?.id && !demoMode && <MonthlyRecapPrompt key={authUser.id} userId={authUser.id} today={calendarDay} dates={logs.map(log=>log.dateKey)} blocked={Boolean(quick || sheet || editing || board || share || success || monthlyRecap || tab !== "home")} onOpen={setMonthlyRecap} />}
      <AnimatePresence>{monthlyRecap && <Badge pop="recap" net={net} recapPeriod={monthlyRecap} recapOverride={periodSummary(logs,monthlyRecap)} profile={profile} userId={authUserId} close={()=>setMonthlyRecap(null)} />}</AnimatePresence>
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
            save={(data: LogDraft) => editing ? updateLog(editing.id, data) : add(data)}
            remove={editing ? () => removeLog(editing.id) : undefined}
            customCategories={customCategories}
            onAddCustom={(item: [string, string]) => setCustomCategories((items) => items.some(([name]) => name.toLowerCase() === item[0].toLowerCase()) ? items : [...items, item])}
            onUpdateCustom={(currentName: string, next: [string, string]) => setCustomCategories((items) => {
              const duplicate = items.some(([name]) => name.toLowerCase() === next[0].toLowerCase() && name.toLowerCase() !== currentName.toLowerCase());
              if (duplicate) return items;
              return items.map((item) => item[0] === currentName ? next : item);
            })}
            onRemoveCustom={(name: string) => setCustomCategories((items) => items.filter(([itemName]) => itemName !== name))}
            onMoveCustom={(name: string, direction: -1 | 1) => setCustomCategories((items) => {
              const index = items.findIndex(([itemName]) => itemName === name);
              const nextIndex = index + direction;
              if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items;
              const next = [...items];
              [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
              return next;
            })}
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
