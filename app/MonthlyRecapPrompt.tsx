"use client";
import { useEffect, useRef, useState } from 'react';
import { m as motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowUpRight, PartyPopper } from 'lucide-react';
import { dueRecaps, nextRecapPrompt, recapSessionKey, type RecapStatus } from './recap-prompt';
import { loadRecapStatuses, recordRecap } from './recap-views';
import { periodLabel } from './insight-periods';

const readSession = (userId: string): string[] => {
  try { return JSON.parse(sessionStorage.getItem(recapSessionKey(userId)) || '[]'); } catch { return []; }
};

export default function MonthlyRecapPrompt({userId,today,dates,blocked,onOpen}:{userId:string;today:string;dates:Array<string|undefined>;blocked:boolean;onOpen:(period:string)=>void}) {
  const due = dueRecaps(today, dates);
  const periodsKey = [due.year, due.month].filter(Boolean).join(',');
  const [loaded, setLoaded] = useState<{ key: string; statuses: Record<string, RecapStatus | undefined> } | null>(null);
  const [session, setSession] = useState<string[]>(() => readSession(userId));
  const primary = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!periodsKey) return;
    let active = true;
    void loadRecapStatuses(userId, periodsKey.split(',')).then((statuses) => { if (active) setLoaded({ key: periodsKey, statuses }); });
    return () => { active = false; };
  }, [userId, periodsKey]);

  const prompt = loaded && loaded.key === periodsKey ? nextRecapPrompt(due, loaded.statuses, session) : null;
  const visible = Boolean(prompt) && !blocked;

  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    primary.current?.focus();
    return () => previous?.focus();
  }, [visible]);

  if (!visible || !prompt) return null;
  const isYear = prompt.kind === 'year';
  const hideForSession = () => {
    const next = [...session, prompt.period];
    setSession(next);
    try { sessionStorage.setItem(recapSessionKey(userId), JSON.stringify(next)); } catch {}
  };
  const notNow = () => {
    hideForSession();
    if (!isYear) setLoaded((current) => current && { ...current, statuses: { ...current.statuses, [prompt.period]: 'seen' } });
    void recordRecap(userId, prompt.period, 'seen');
  };
  const view = () => {
    hideForSession();
    setLoaded((current) => current && { ...current, statuses: { ...current.statuses, [prompt.period]: 'viewed' } });
    void recordRecap(userId, prompt.period, 'viewed');
    onOpen(prompt.period);
  };

  return <div className="backdrop center monthly-recap-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)notNow();}}>
    <motion.div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="monthly-recap-title" className={"monthly-recap-notice" + (isYear ? " yearly-recap-notice" : "")} initial={reduced?false:{opacity:0,y:24,scale:.96}} animate={{opacity:1,y:0,scale:1}} onKeyDown={e=>{
      if(e.key==='Escape')notNow();
      if(e.key==='Tab') {const buttons=dialog.current?.querySelectorAll('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }}>
      <div className="monthly-recap-emblem">{isYear ? <PartyPopper size={38}/> : <Sparkles size={38}/>}</div>
      <span>{isYear ? 'NEW YEAR, NEW STORY' : 'A MONTH WORTH LOOKING BACK ON'}</span>
      <h2 id="monthly-recap-title">{isYear ? `Your ${prompt.period} recap is ready.` : `Your ${periodLabel(prompt.period)} recap is ready.`}</h2>
      <p>{isYear ? 'Your whole year of wins, losses and streaks, in one story.' : 'Revisit your wins, expenses and the days you showed up.'}</p>
      <button ref={primary} onClick={view}>{isYear ? `View my ${prompt.period} recap` : 'View my recap'} <ArrowUpRight size={20}/></button>
      <button className="monthly-recap-later" onClick={notNow}>Not now</button>
      <small>{isYear ? `We'll remind you each time you open UPBY until January ${7}.` : 'Always available in Insights.'}</small>
    </motion.div>
  </div>;
}
