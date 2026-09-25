"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Activity, AlertTriangle, ArrowLeft, CheckCircle2, Globe2, MessageSquare, RefreshCw, ScrollText, UserCheck, Users } from "lucide-react";

type DashboardData = {
  totalUsers: number;
  signupsToday: number;
  completedOnboarding: number;
  activeToday: number;
  activeSevenDays: number;
  totalLogs: number;
  logsToday: number;
  errorsToday: number;
  feedbackTotal: number;
  dailyActivity: Array<{ day: string; users: number; events: number }>;
  topFeatures: Array<{ event: string; count: number; users: number }>;
  userRegions: Array<{ country: string; users: number }>;
  recentErrors: Array<{ createdAt: string; area: string; code: string; source: string; errorCode: string; status: number; message: string; hint: string }>;
  recentFeedback: Array<{ createdAt: string; name: string; type: string; message: string }>;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);

const titleCase = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const shortDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value));
const shortTime = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const countryName = (value: string) => {
  if (!value || value === "unknown") return "Unknown";
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(value) || value; }
  catch { return value; }
};

export default function FounderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "signed-out" | "denied" | "error">("loading");
  const [email, setEmail] = useState("");

  const loadDashboard = useCallback(async () => {
    setStatus("loading");
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setStatus("signed-out");
      return;
    }
    setEmail(user.email || "Founder account");
    const { data: dashboard, error } = await supabase.rpc("get_founder_dashboard");
    if (error) {
      setStatus(error.code === "42501" ? "denied" : "error");
      return;
    }
    setData(dashboard as DashboardData);
    setStatus("ready");
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  if (status !== "ready" || !data) {
    return (
      <main className="founder-gate">
        <a href="/"><ArrowLeft /> BACK TO UPBY</a>
        <div className="founder-gate-card">
          <span>PRIVATE AREA</span>
          <h1>{status === "loading" ? "Loading dashboard" : status === "signed-out" ? "Sign in first" : status === "denied" ? "Access denied" : "Dashboard unavailable"}</h1>
          <p>{status === "loading" ? "Checking your founder access." : status === "signed-out" ? "Sign in to UPBY with your founder account, then open this page again." : status === "denied" ? "This account is not approved for founder analytics." : "The analytics database setup is incomplete or temporarily unavailable."}</p>
          {status !== "loading" && <button onClick={() => void loadDashboard()}><RefreshCw /> TRY AGAIN</button>}
        </div>
      </main>
    );
  }

  const completion = data.totalUsers ? Math.round((data.completedOnboarding / data.totalUsers) * 100) : 0;
  const maxActivity = Math.max(1, ...data.dailyActivity.map((item) => item.events));
  const cards = [
    { label: "TOTAL USERS", value: data.totalUsers, detail: `+${data.signupsToday} today`, icon: Users, tone: "blue" },
    { label: "ACTIVE TODAY", value: data.activeToday, detail: `${data.activeSevenDays} in 7 days`, icon: Activity, tone: "lime" },
    { label: "TOTAL LOGS", value: data.totalLogs, detail: `+${data.logsToday} today`, icon: ScrollText, tone: "orange" },
    { label: "ONBOARDING", value: `${completion}%`, detail: `${data.completedOnboarding} completed`, icon: UserCheck, tone: "purple" },
    { label: "APP ERRORS", value: data.errorsToday, detail: "last 24 hours", icon: AlertTriangle, tone: "coral" },
    { label: "FEEDBACK", value: data.feedbackTotal, detail: "messages received", icon: MessageSquare, tone: "paper" },
  ];

  return (
    <main className="founder-page">
      <header className="founder-header">
        <div><a href="/"><ArrowLeft /> UPBY</a><span>PRIVATE FOUNDER VIEW</span><h1>Product pulse.</h1><p>Live usage, growth, feedback, and reliability in one place.</p></div>
        <div className="founder-session"><i /><span>SIGNED IN AS</span><b>{email}</b><button onClick={() => void loadDashboard()} aria-label="Refresh dashboard"><RefreshCw /></button></div>
      </header>

      <section className="founder-stats">
        {cards.map(({ label, value, detail, icon: Icon, tone }) => <article className={`founder-stat ${tone}`} key={label}><Icon /><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>

      <section className="founder-grid">
        <article className="founder-panel founder-activity">
          <header><div><span>LAST 7 DAYS</span><h2>Activity</h2></div><b>{data.activeSevenDays} USERS</b></header>
          <div className="founder-bars">
            {data.dailyActivity.map((item) => <div key={item.day}><b>{item.events}</b><i style={{ height: `${Math.max(8, (item.events / maxActivity) * 100)}%` }} /><span>{shortDate(item.day)}</span></div>)}
          </div>
        </article>

        <article className="founder-panel">
          <header><div><span>FEATURES</span><h2>Most used</h2></div></header>
          <div className="founder-list">
            {data.topFeatures.length ? data.topFeatures.map((item, index) => <div key={item.event}><b>#{index + 1}</b><span>{titleCase(item.event)}<small>{item.users} users</small></span><strong>{item.count}</strong></div>) : <p>No feature events yet.</p>}
          </div>
        </article>

        <article className="founder-panel">
          <header><div><span>AUDIENCE</span><h2>User regions</h2></div><Globe2 className="founder-panel-icon" /></header>
          <div className="founder-list founder-regions">
            {(data.userRegions || []).length ? data.userRegions.map((item, index) => <div key={item.country}><b>#{index + 1}</b><span>{countryName(item.country)}<small>{item.country === "unknown" ? "Updates when they return" : item.country}</small></span><strong>{item.users}</strong></div>) : <p>Regions appear as members return to UPBY.</p>}
          </div>
        </article>

        <article className="founder-panel">
          <header><div><span>RELIABILITY</span><h2>Recent errors</h2></div><b className={data.errorsToday ? "founder-bad" : "founder-good"}>{data.errorsToday ? <AlertTriangle /> : <CheckCircle2 />}{data.errorsToday ? `${data.errorsToday} FOUND` : "ALL CLEAR"}</b></header>
          <div className="founder-feed">
            {data.recentErrors.length ? data.recentErrors.map((item, index) => <div key={`${item.createdAt}-${index}`}><i className="error" /><span><b>{titleCase(item.code)}</b><small>{titleCase(item.source || item.area)}{item.errorCode ? ` · ${item.errorCode}` : ""}{item.status ? ` · ${item.status}` : ""} · {shortTime(item.createdAt)}</small>{item.message && <em>{item.message}</em>}{item.hint && <em className="hint">{item.hint}</em>}</span></div>) : <p>No errors recorded in the last seven days.</p>}
          </div>
        </article>

        <article className="founder-panel">
          <header><div><span>USER VOICE</span><h2>Latest feedback</h2></div></header>
          <div className="founder-feedback">
            {data.recentFeedback.length ? data.recentFeedback.map((item, index) => <blockquote key={`${item.createdAt}-${index}`}><span>{item.type.toUpperCase()} · {shortTime(item.createdAt)}</span><p>{item.message}</p><b>{item.name}</b></blockquote>) : <p>No feedback received yet.</p>}
          </div>
        </article>
      </section>
    </main>
  );
}
