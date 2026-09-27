"use client";
import { useEffect, useRef, useState } from 'react';
import { m as motion, useReducedMotion } from 'framer-motion';
import { Sparkles, ArrowUpRight } from 'lucide-react';
import { dueRecap, recapNoticeKey } from './recap-prompt';
import { periodLabel } from './insight-periods';
export default function MonthlyRecapPrompt({userId,today,dates,blocked,onOpen}:{userId:string;today:string;dates:Array<string|undefined>;blocked:boolean;onOpen:(period:string)=>void}) {
  const [dismissed,setDismissed]=useState('');
  const [ready,setReady]=useState('');
  const candidate=dueRecap(today,dates);
  const key=candidate?recapNoticeKey(userId,candidate):'';
  const primary=useRef<HTMLButtonElement>(null);
  const dialog=useRef<HTMLDivElement>(null);
  const reduced=useReducedMotion();
  useEffect(()=>{
    setReady('');
    try { setDismissed(localStorage.getItem(key)==='seen'?key:''); } catch { setDismissed(''); }
    setReady(key);
  },[key]);
  const visible=ready === key && !!candidate && !blocked && dismissed!==key;
  const dismiss=()=>{setDismissed(key);try{localStorage.setItem(key,'seen');}catch{}};
  useEffect(()=>{
    if(!visible)return;
    const previous=document.activeElement as HTMLElement|null;
    primary.current?.focus();
    return ()=>previous?.focus();
  },[visible]);
  if(!visible || !candidate)return null;
  return <div className="backdrop center monthly-recap-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)dismiss();}}>
    <motion.div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="monthly-recap-title" className="monthly-recap-notice" initial={reduced?false:{opacity:0,y:24,scale:.96}} animate={{opacity:1,y:0,scale:1}} onKeyDown={e=>{
      if(e.key==='Escape')dismiss();
      if(e.key==='Tab') {const buttons=dialog.current?.querySelectorAll('button');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
    }}>
      <div className="monthly-recap-emblem"><Sparkles size={38}/></div>
      <span>A MONTH WORTH LOOKING BACK ON</span>
      <h2 id="monthly-recap-title">Your {periodLabel(candidate)} recap is ready.</h2>
      <p>Revisit your wins, expenses and the days you showed up.</p>
      <button ref={primary} onClick={()=>{dismiss();onOpen(candidate);}}>View my recap <ArrowUpRight size={20}/></button>
      <button className="monthly-recap-later" onClick={dismiss}>Not now</button>
      <small>Always available in Insights.</small>
    </motion.div>
  </div>;
}
