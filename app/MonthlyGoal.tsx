"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Target, Check } from "lucide-react";
import { goalProgress, monthKey, validGoal } from "./goal-math";

const money = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);

export default function MonthlyGoal({ client, userId, logs }: {
  client: SupabaseClient;
  userId?: string;
  logs: Array<{ type: string; amount: number; dateKey?: string }>;
}) {
  const [month, setMonth] = useState(() => monthKey());
  const [target, setTarget] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const writing = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; generation.current++; }; }, []);

  const load = useCallback(async () => {
    if (writing.current) return;
    const request = ++generation.current;
    if (!userId) { setReady(true); return; }
    try {
      const { data, error } = await client.from("monthly_goals").select("target").eq("user_id", userId).eq("month", month).maybeSingle();
      if (error) throw error;
      if (alive.current && request === generation.current) {
        setTarget(data ? Number(data.target) : null); setReady(true); setFailed(false); setMessage("");
      }
    } catch {
      if (alive.current && request === generation.current) { setFailed(true); setMessage("Could not load your goal. Please retry."); }
    }
  }, [client, userId, month]);

  useEffect(() => {
    setReady(false); setTarget(null); setEditing(false); setMessage("");
    void load();
    const resume = () => {
      if (document.visibilityState !== "visible" || writing.current) return;
      const current = monthKey();
      if (current !== month) setMonth(current);
      else void load();
    };
    const timer = window.setInterval(() => { if (!writing.current) setMonth(monthKey()); }, 60000);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      generation.current++;
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [load, month]);

  const save = async (remove = false) => {
    if (writing.current || (!remove && !validGoal(draft))) return;
    if (month !== monthKey()) { setMonth(monthKey()); return; }
    writing.current = true; generation.current++; setBusy(true); setFailed(false); setMessage("Saving goal…");
    try {
      if (userId) {
        const write = () => remove
          ? client.from("monthly_goals").delete().eq("user_id", userId).eq("month", month)
          : client.from("monthly_goals").upsert({ user_id: userId, month, target: Number(draft), updated_at: new Date().toISOString() }, { onConflict: "user_id,month" }).select("target").single();
        let result = await write();
        if (result.error?.code === "PGRST303") {
          const refresh = await client.auth.refreshSession();
          if (refresh.error) throw refresh.error;
          result = await write();
        }
        if (result.error) throw result.error;
      }
      if (!alive.current) return;
      setTarget(remove ? null : Number(draft)); setEditing(false);
      setMessage(userId ? remove ? "Goal removed" : "Goal saved" : "Demo goal updated");
    } catch {
      if (alive.current) { setFailed(true); setMessage("Goal was not saved. Check your connection and try again."); }
    } finally { writing.current = false; if (alive.current) setBusy(false); }
  };

  const progress = goalProgress(logs, month, target || 0);
  const label = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date(month + "T12:00:00"));
  return <section className="monthly-goal" aria-label="Monthly net earnings goal">
    <header><div><span><Target size={16} /> {label.toUpperCase()}</span><h2>Your monthly goal</h2></div>
      {ready && !editing && <button onClick={() => { setDraft(target ? String(target) : ""); setEditing(true); setMessage(""); }}>{target ? "Edit goal" : "Set goal"}</button>}
    </header>
    {!ready ? <p>{failed ? "Your saved goal is temporarily unavailable." : "Loading goal…"}</p> : target ? <>
      <div className="goal-numbers"><strong>{money(progress.net)}</strong><span>of {money(target)}</span></div>
      <div className="goal-track" role="progressbar" aria-label="Monthly goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percent)}><i style={{ width: `${progress.percent}%` }} /></div>
      <p>{progress.reached ? <><Check size={16} /> Goal reached. Keep going!</> : `${money(progress.remaining)} to go`}</p>
    </> : <p>Choose a target for your net earnings this month.</p>}
    <small>Wins minus losses for this month. Your goal is private.</small>
    {editing && <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <label htmlFor="monthly-goal-amount">Monthly target ($)</label>
      <div className="goal-editor"><input id="monthly-goal-amount" inputMode="decimal" autoFocus value={draft} disabled={busy} placeholder="1000" onChange={event => setDraft(event.target.value)} /><button disabled={busy || !validGoal(draft)} type="submit">{busy ? "Saving…" : "Save goal"}</button></div>
      {draft && !validGoal(draft) && <p>Enter a positive amount with up to two decimal places.</p>}
      <div className="goal-secondary"><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>{target !== null && <button type="button" disabled={busy} onClick={() => void save(true)}>Remove goal</button>}</div>
    </form>}
    {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    {!ready && failed && <button onClick={() => void load()}>Retry</button>}
  </section>;
}
