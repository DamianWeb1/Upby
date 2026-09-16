"use client";

import { use, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ArrowUpRight, Flame, Medal, Share2, Trophy, UserPlus } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "",
);

type PublicLog = {
  id: number;
  type: "win" | "loss";
  amount: number | null;
  category: string;
  title: string;
  date_label: string;
};

type PublicProfile = {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string;
  x_profile: string;
  member_since: number;
  show_totals: boolean;
  wins: number | null;
  losses: number | null;
  net: number | null;
  streak: number;
  following_count: number;
  follower_count: number;
  logs: PublicLog[];
};

const money = (value: number) => `$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const signedMoney = (value: number) => `${value > 0 ? "+" : value < 0 ? "-" : ""}${money(value)}`;

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [{ data }, { data: sessionData }] = await Promise.all([
        supabase.rpc("get_public_profile", { profile_username: decodeURIComponent(username) }),
        supabase.auth.getSession(),
      ]);
      if (!active) return;
      const loadedProfile = data as PublicProfile | null;
      const currentUserId = sessionData.session?.user?.id || null;
      setProfile(loadedProfile);
      setViewerId(currentUserId);
      if (loadedProfile && currentUserId && currentUserId !== loadedProfile.user_id) {
        const { data: followRow } = await supabase.from("follows").select("followed_id").eq("follower_id", currentUserId).eq("followed_id", loadedProfile.user_id).maybeSingle();
        if (active) setFollowing(Boolean(followRow));
      }
      if (active) setLoading(false);
    };
    load();
    return () => { active = false; };
  }, [username]);

  const toggleFollow = async () => {
    if (!viewerId) { window.location.href = "/"; return; }
    if (!profile || viewerId === profile.user_id || followBusy) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    setProfile((current) => current ? { ...current, follower_count: Math.max(0, current.follower_count + (next ? 1 : -1)) } : current);
    const request = next
      ? supabase.from("follows").insert({ follower_id: viewerId, followed_id: profile.user_id })
      : supabase.from("follows").delete().eq("follower_id", viewerId).eq("followed_id", profile.user_id);
    const { error } = await request;
    if (error) {
      setFollowing(!next);
      setProfile((current) => current ? { ...current, follower_count: Math.max(0, current.follower_count + (next ? -1 : 1)) } : current);
    }
    setFollowBusy(false);
  };

  const shareProfile = async () => {
    const shareData = { title: profile ? `${profile.display_name} on UPBY` : "UPBY", url: window.location.href };
    if (navigator.share) await navigator.share(shareData);
    else await navigator.clipboard.writeText(window.location.href);
  };

  if (loading) return <main className="public-page public-loading"><div className="public-avatar" /><p>Loading profile...</p></main>;
  if (!profile) return <main className="public-page public-missing"><a href="/"><ArrowLeft /> Back to UPBY</a><h1>Profile not found.</h1><p>This username does not exist or has changed.</p></main>;

  const ownProfile = viewerId === profile.user_id;
  const badges = [profile.logs.length ? "FIRST LOG" : null, profile.streak >= 7 ? "7 DAY STREAK" : null, Number(profile.net) >= 1000 ? "$1K MONTH" : null].filter(Boolean);

  return (
    <main className="public-page">
      <header>
        <a href="/"><ArrowLeft /> Back to UPBY</a>
        <button onClick={shareProfile}><Share2 /> Share</button>
      </header>
      <section className="public-identity">
        <div className="public-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt={`${profile.display_name} profile`} /> : profile.display_name.slice(0, 1).toUpperCase()}<i /></div>
        <span>UPBY MEMBER SINCE {profile.member_since}</span>
        <h1>{profile.display_name}</h1>
        <b>@{profile.username}</b>
        {profile.x_profile && <a href={`https://x.com/${profile.x_profile.replace(/^@/, "")}`} target="_blank" rel="noreferrer">𝕏 @{profile.x_profile.replace(/^@/, "")} <ArrowUpRight /></a>}
        <p>{profile.bio || "Tracking every step."}</p>
        {!ownProfile && <button disabled={followBusy} className={following ? "follow following" : "follow"} onClick={toggleFollow}><UserPlus /> {following ? "FOLLOWING" : "FOLLOW"}</button>}
        <div className="public-social-counts"><span><b>{profile.following_count}</b> Following</span><span><b>{profile.follower_count}</b> Followers</span></div>
      </section>
      <section className="public-result">
        <span>UP BY THIS MONTH</span>
        <strong>{profile.net === null ? "PRIVATE" : signedMoney(Number(profile.net))}</strong>
        <div>
          {profile.wins !== null && <b>{money(Number(profile.wins))} wins</b>}
          {profile.losses !== null && <b>{money(Number(profile.losses))} losses</b>}
          <b><Flame /> {profile.streak} day streak</b>
        </div>
      </section>
      <section className="public-badges">
        <span>SELECTED ACHIEVEMENTS</span>
        <div>{badges.length ? badges.map((badge) => <b key={badge}><Medal />{badge}</b>) : <b><Trophy />FIRST BADGE WAITING</b>}</div>
      </section>
      <section className="public-feed">
        <span>RECENT PUBLIC LOGS</span>
        {profile.logs.length ? profile.logs.map((log) => <article key={log.id}><i className={log.type}>{log.type.toUpperCase()}</i><div><b>{log.category}</b><p>{log.title}</p></div><strong>{log.amount === null ? "PRIVATE" : `${log.type === "win" ? "+" : "-"}${money(Number(log.amount))}`}</strong><time>{log.date_label}</time></article>) : <div className="public-feed-empty"><b>No public logs</b><p>This member has not shared any logs yet.</p></div>}
      </section>
    </main>
  );
}
