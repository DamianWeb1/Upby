"use client";
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { insightMoney, insightSignedMoney } from './insight-periods';
export default function RecapValue({value,currency=true,signed=false}:{value:number;currency?:boolean;signed?:boolean}) {
 const reduced=useReducedMotion();
 const [display,setDisplay]=useState(value);
 useEffect(()=>{
  if(reduced){setDisplay(value);return;}
  let frame=0,start:number|undefined;
  const tick=(now:number)=>{start??=now;const progress=Math.min(1,(now-start)/950);setDisplay(value*(1-Math.pow(1-progress,3)));if(progress<1)frame=requestAnimationFrame(tick);};
  setDisplay(0);frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[value,reduced]);
 const format=(n:number)=>currency?(signed?insightSignedMoney(n):insightMoney(n)):String(Math.round(n));
 return <span aria-label={format(value)}><span aria-hidden="true">{format(display)}</span></span>;
}
