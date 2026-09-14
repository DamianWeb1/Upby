"use client";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Flame, Medal, Share2, UserPlus } from "lucide-react";

export default function DamianProfile() {
  const [following, setFollowing] = useState(false);
  return (
    <main className="public-page">
      <header>
        <a href="/"><ArrowLeft /> Back to UPBY</a>
        <button><Share2 /> Share</button>
      </header>
      <section className="public-identity">
        <div className="public-avatar">D<i /></div>
        <span>UPBY MEMBER SINCE 2026</span>
        <h1>Damian</h1>
        <b>@damian</b>
        <a href="https://x.com/damian__web">𝕏 @damian__web <ArrowUpRight /></a>
        <p>Building on the internet. Tracking every step.</p>
        <button className={following ? "follow following" : "follow"} onClick={() => setFollowing(!following)}>
          <UserPlus /> {following ? "FOLLOWING" : "FOLLOW"}
        </button>
      </section>
      <section className="public-result">
        <span>UP BY THIS MONTH</span>
        <strong>+$4,280</strong>
        <div><b>$4,920 wins</b><b>$640 losses</b><b><Flame /> 12 day streak</b></div>
      </section>
      <section className="public-badges">
        <span>SELECTED ACHIEVEMENTS</span>
        <div>{["FIRST WIN", "30 DAY STREAK", "$5K MONTH", "TOP 100"].map((badge) => <b key={badge}><Medal />{badge}</b>)}</div>
      </section>
      <section className="public-feed">
        <span>RECENT PUBLIC LOGS</span>
        {[
          ["WIN", "Bounties", "Project XYZ", "+$350", "Today"],
          ["LOSS", "Trading", "SOL", "-$120", "Yesterday"],
          ["WIN", "Dev", "Landing page", "+$700", "Sep 6"],
        ].map((log) => <article key={log[2]}><i className={log[0].toLowerCase()}>{log[0]}</i><div><b>{log[1]}</b><p>{log[2]}</p></div><strong>{log[3]}</strong><time>{log[4]}</time></article>)}
      </section>
      <section className="public-history">
        <span>MONTHLY HISTORY</span>
        <div>{[["September","+$4,280"],["August","+$3,180"],["July","-$420"],["June","+$1,940"]].map((month) => <article key={month[0]}><span>{month[0]}</span><b>{month[1]}</b></article>)}</div>
      </section>
    </main>
  );
}
