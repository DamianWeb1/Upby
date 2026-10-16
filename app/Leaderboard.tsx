"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  Flame,
  Search,
  TrendingDown,
  TrendingUp,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { activityStats } from "./activity-stats";
import { errorMetadata } from "./error-metadata";
import { Logo } from "./ui";
import { type LeaderboardEntry, authenticatedWrite, localToday, signedMoney, supabase, trackProductEvent } from "./upby-core";

export function Leaderboard({ close, following, setFollowing, freshStart, profile, net, logs, leaderboard, authUserId, embedded = false }: any) {
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
      .then(({ data, error }) => { if (!error && active) setLiveEntries(((data || []) as LeaderboardEntry[]).filter(entry => Number(entry.net) !== 0)); });
    return () => { active = false; };
  }, [freshStart, period, view, following]);
  const users = useMemo(
    () => freshStart ? (liveEntries.length ? liveEntries.filter(entry => Number(entry.net) !== 0).map((entry) => [Number(entry.rank), entry.display_name, entry.username, signedMoney(Number(entry.net)), Number(entry.streak), entry.user_id, entry.avatar_url]) : view === "GLOBAL" && net !== 0 ? [
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
    [freshStart, liveEntries, profile.displayName, profile.username, profile.avatarUrl, net, logs, authUserId, view],
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
      className={embedded ? "leaderboard embedded" : "leaderboard"}
      initial={embedded ? false : { x: "100%" }}
      animate={{ x: 0 }}
      exit={embedded ? undefined : { x: "100%" }}
    >
      {!embedded && <header>
        <button onClick={close}>
          <ChevronLeft />
        </button>
        <Logo />
        <button>
          <Search />
        </button>
      </header>}
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
