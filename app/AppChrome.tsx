"use client";
import { m as motion } from "framer-motion";
import {
  BarChart3,
  Globe2,
  Home,
  Plus,
  Share2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
} from "lucide-react";
import { Logo } from "./ui";
import { type Log, type Tab, money, signedMoney } from "./upby-core";

export function Share({ log, net, displayName, close }: any) {
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

export function LogSuccess({ log }: { log: Log }) {
  return (
    <motion.div className={`log-success ${log.type}`} initial={{ opacity: 0, y: 24, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: .96 }}>
      <div className="success-mark">{log.type === "win" ? <TrendingUp /> : <ShieldCheck />}</div>
      <div><span>{log.type === "win" ? "WIN LOGGED" : "LOSS RECORDED"}</span><strong>{log.type === "win" ? "+" : "-"}{money(log.amount)}</strong><small>Home and Insights updated</small></div>
      <i className="success-dot one" /><i className="success-dot two" /><i className="success-dot three" />
    </motion.div>
  );
}

export function QuickLog({ close, choose }: { close: () => void; choose: (type: "win" | "loss") => void }) {
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

export function Bottom({ tab, nav, add }: any) {
  const items: [[Tab, any], ...[Tab, any][]] = [
    ["home", Home],
    ["insights", BarChart3],
    ["leaderboard", Globe2],
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
            <b>{n === "insights" ? "stats" : n === "leaderboard" ? "rank" : n}</b>
          </button>
        ))}
      </nav>
    </div>
  );
}
