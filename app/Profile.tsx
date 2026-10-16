"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronRight,
  CircleDollarSign,
  Download,
  Edit3,
  Eye,
  Flame,
  LoaderCircle,
  LogOut,
  Medal,
  MessageSquare,
  Settings2,
  Share2,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { activityStats } from "./activity-stats";
import { currentMonth, periodLabel, periodSummary, shiftMonth } from "./insight-periods";
import { earnedFrom } from "./Insights";
import { logDateLabel } from "./log-date";
import { SCREENSHOT_BUCKET } from "./screenshot-storage";
import { Title } from "./ui";
import {
  type Log,
  type ProfileData,
  STORAGE_KEY,
  localToday,
  money,
  signedMoney,
  supabase,
  trackProductEvent,
} from "./upby-core";

export function Profile({ net, wins, losses, logs, freshStart, profile, setProfile, prefs, setPrefs, authUser, demoMode, signOut, followingCount, followerCount, startLog }: any) {
  const [settings, setSettings] = useState(false),
    [publicPreview, setPublicPreview] = useState(false),
    [editingProfile, setEditingProfile] = useState(false),
    [draftProfile, setDraftProfile] = useState<ProfileData>(profile),
    [avatarFile, setAvatarFile] = useState<File | null>(null),
    [savingProfile, setSavingProfile] = useState(false),
    [editError, setEditError] = useState(""),
    [feedbackOpen, setFeedbackOpen] = useState(false),
    [feedbackType, setFeedbackType] = useState("idea"),
    [feedbackMessage, setFeedbackMessage] = useState(""),
    [feedbackStatus, setFeedbackStatus] = useState(""),
    [feedbackBusy, setFeedbackBusy] = useState(false),
    [deleteOpen, setDeleteOpen] = useState(false),
    [deleteConfirm, setDeleteConfirm] = useState(""),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [privacyStatus, setPrivacyStatus] = useState("");
  const activity = activityStats(logs, localToday());
  const streak = activity.current;
  const earned = earnedFrom(logs, net);
  const selectedAchievements = freshStart ? earned.slice(0, 4) : earned;
  const openProfileEditor = () => { setDraftProfile(profile); setAvatarFile(null); setEditError(""); setEditingProfile(true); };
  const updatePrivacy = async (index: number) => {
    const nextPrefs = prefs.map((value: number, itemIndex: number) => itemIndex === index ? Number(!value) : value);
    if (index === 5 && !nextPrefs[5]) nextPrefs[4] = 0;
    setPrefs(nextPrefs);
    if (demoMode || !authUser) return;
    setPrivacyStatus("Saving privacy...");
    const { error } = await supabase.from("profiles").upsert({
      user_id: authUser.id,
      display_name: profile.displayName,
      username: profile.username,
      avatar_url: profile.avatarUrl?.startsWith("data:") ? null : profile.avatarUrl,
      bio: profile.bio || "",
      x_profile: profile.xProfile || "",
      show_totals: Boolean(nextPrefs[0]),
      show_logs: Boolean(nextPrefs[1]),
      show_losses: Boolean(nextPrefs[2]),
      show_screenshots: Boolean(nextPrefs[3]),
      leaderboard_enabled: Boolean(nextPrefs[4]),
      public_profile_enabled: Boolean(nextPrefs[5]),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    setPrivacyStatus(error ? "Privacy was not saved. Try again." : "Privacy saved");
    if (!error) window.setTimeout(() => setPrivacyStatus(""), 1600);
  };
  const shareProfile = async () => {
    const url = `${window.location.origin}/${profile.username}`;
    if (navigator.share) await navigator.share({ title: `${profile.displayName} on UPBY`, text: "See how much I am up by.", url }).catch(() => undefined);
    else { await navigator.clipboard.writeText(url); setFeedbackStatus("Profile link copied"); setTimeout(() => setFeedbackStatus(""), 1800); }
    void trackProductEvent(authUser?.id, "profile_shared", "profile");
  };
  const [exportStatus, setExportStatus] = useState("");
  const exportData = async () => {
    setExportStatus("Preparing export…");
    let monthlyGoals: unknown[] = [];
    if (authUser && !demoMode) {
      try {
        const { data, error } = await supabase.from("monthly_goals").select("month,target").eq("user_id", authUser.id).order("month", { ascending: false });
        if (error) throw error;
        monthlyGoals = data || [];
      } catch {
        setExportStatus("Could not load goals for your export. Please try again.");
        return;
      }
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      account: { email: authUser?.email || null },
      profile,
      privacy: { showTotals: Boolean(prefs[0]), showLogs: Boolean(prefs[1]), showLosses: Boolean(prefs[2]), showScreenshots: Boolean(prefs[3]), leaderboard: Boolean(prefs[4]), publicProfile: Boolean(prefs[5]) },
      totals: { wins, losses, net },
      logs,
      social: { following: followingCount, followers: followerCount },
      monthlyGoals,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `upby-${profile.username}-data.json`;
    link.click();
    setExportStatus("Export downloaded");
    URL.revokeObjectURL(url);
    void trackProductEvent(authUser?.id, "data_exported", "account");
  };
  const submitFeedback = async () => {
    const message = feedbackMessage.trim();
    if (!authUser || message.length < 3) { setFeedbackStatus("Write a short message first."); return; }
    setFeedbackBusy(true); setFeedbackStatus("");
    const { error } = await supabase.from("feedback").insert({ user_id: authUser.id, type: feedbackType, message });
    setFeedbackBusy(false);
    if (error) { setFeedbackStatus(error.message); return; }
    void trackProductEvent(authUser.id, "feedback_sent", "feedback", { type: feedbackType });
    setFeedbackMessage(""); setFeedbackStatus("Feedback sent. Thank you.");
    setTimeout(() => { setFeedbackOpen(false); setFeedbackStatus(""); }, 1200);
  };
  const deleteAccount = async () => {
    if (!authUser || deleteConfirm !== "DELETE") return;
    setDeleteBusy(true); setDeleteError("");
    const { data: screenshotRows, error: screenshotQueryError } = await supabase.from("logs").select("screenshot_path").eq("user_id", authUser.id).not("screenshot_path", "is", null);
    if (screenshotQueryError) { setDeleteError("Could not prepare your files for deletion. Please try again."); setDeleteBusy(false); return; }
    const screenshotPaths = (screenshotRows || []).map(row => row.screenshot_path).filter((path): path is string => Boolean(path));
    if (screenshotPaths.length) {
      const { error: screenshotDeleteError } = await supabase.storage.from(SCREENSHOT_BUCKET).remove(screenshotPaths);
      if (screenshotDeleteError) { setDeleteError("Could not remove your private screenshots. Please try again."); setDeleteBusy(false); return; }
    }
    const { data: avatarFiles } = await supabase.storage.from("avatars").list(authUser.id, { limit: 100 });
    if (avatarFiles?.length) await supabase.storage.from("avatars").remove(avatarFiles.map((file) => `${authUser.id}/${file.name}`));
    await trackProductEvent(authUser.id, "account_deleted", "account");
    const { error } = await supabase.rpc("delete_my_account");
    if (error) { setDeleteError(error.message); setDeleteBusy(false); return; }
    window.localStorage.removeItem(`${STORAGE_KEY}:${authUser.id}`);
    await supabase.auth.signOut();
    window.location.assign("/");
  };
  const saveProfile = async () => {
    setSavingProfile(true);
    let nextProfile = {
      ...draftProfile,
      displayName: draftProfile.displayName.trim(),
      username: draftProfile.username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24),
      xProfile: draftProfile.xProfile.replace(/^@/, "").trim(),
      bio: draftProfile.bio?.trim().slice(0, 160) || "",
    };
    if (nextProfile.displayName.length < 2 || nextProfile.username.length < 3) {
      setEditError("Add a display name and a username with at least 3 characters.");
      setSavingProfile(false);
      return;
    }
    if (!demoMode && authUser) {
      if (avatarFile) {
        const extension = avatarFile.type === "image/png" ? "png" : avatarFile.type === "image/webp" ? "webp" : "jpg";
        const avatarPath = `${authUser.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(avatarPath, avatarFile, { contentType: avatarFile.type, cacheControl: "31536000" });
        if (uploadError) { setEditError(uploadError.message); setSavingProfile(false); return; }
        const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
        const imageCheck = await fetch(data.publicUrl, { cache: "no-store" });
        if (!imageCheck.ok) { setEditError("The photo uploaded but could not be opened. Please try again."); setSavingProfile(false); return; }
        nextProfile = { ...nextProfile, avatarUrl: data.publicUrl };
      } else if (profile.avatarUrl && !nextProfile.avatarUrl) {
        nextProfile = { ...nextProfile, avatarUrl: null };
      }
      const savedAvatarUrl = nextProfile.avatarUrl?.startsWith("data:") ? null : nextProfile.avatarUrl;
      const { error: profileError } = await supabase.from("profiles").upsert({
        user_id: authUser.id,
        display_name: nextProfile.displayName,
        username: nextProfile.username,
        avatar_url: savedAvatarUrl,
        bio: nextProfile.bio,
        x_profile: nextProfile.xProfile,
        show_totals: Boolean(prefs[0]),
        show_logs: Boolean(prefs[1]),
        show_losses: Boolean(prefs[2]),
        show_screenshots: Boolean(prefs[3]),
        leaderboard_enabled: Boolean(prefs[4]),
        public_profile_enabled: Boolean(prefs[5]),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (profileError) { setEditError(profileError.message); setSavingProfile(false); return; }
      setProfile(nextProfile);
      setDraftProfile(nextProfile);
      const { error } = await supabase.auth.updateUser({ data: {
        display_name: nextProfile.displayName,
        username: nextProfile.username,
        x_profile: nextProfile.xProfile,
        bio: nextProfile.bio,
        upby_avatar_url: savedAvatarUrl,
        onboarding_complete: true,
      } });
      if (error) { setEditError(error.message); setSavingProfile(false); return; }
      void trackProductEvent(authUser.id, "profile_updated", "profile", { avatar_changed: Boolean(avatarFile) });
    }
    setProfile(nextProfile);
    setSavingProfile(false);
    setEditingProfile(false);
  };
  return (
    <div className={publicPreview ? "page profile public-preview" : "page profile"}>
      <button className="preview-toggle" onClick={() => setPublicPreview(!publicPreview)}>
        <Eye /> {publicPreview ? "EXIT PUBLIC VIEW" : "PREVIEW PUBLIC VIEW"}
      </button>
      <section className="profile-head">
        <button className="settings" onClick={() => setSettings(!settings)}>
          <Settings2 />
        </button>
        <div className="big-avatar">
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}<i />
        </div>
        <div>
          <span>UPBY MEMBER SINCE 2026</span>
          <h1>{profile.displayName}</h1>
          <b>@{profile.username}</b>
          {profile.xProfile && <a href={`https://x.com/${profile.xProfile.replace(/^@/, "")}`}>𝕏 @{profile.xProfile.replace(/^@/, "")} <ArrowUpRight /></a>}
          <p>{profile.bio || "Building on the internet. Tracking every step."}</p>
        </div>
        <div className="profile-actions">
          <button className="edit-profile" onClick={openProfileEditor}><Edit3 />EDIT PROFILE</button>
          <a className="public" href={`/${profile.username}`}>VIEW PUBLIC PROFILE<ArrowUpRight /></a>
        </div>
      </section>
      <section className="profile-menu" aria-label="Account actions">
        <button onClick={() => setSettings(!settings)}><span><Settings2 /><b>Settings</b><small>Privacy and account controls</small></span><ChevronRight /></button>
        <button onClick={exportData}><span><Download /><b>Export data</b><small>Download your UPBY history</small></span><ChevronRight /></button>
        {!demoMode && <button onClick={() => { setFeedbackStatus(""); setFeedbackOpen(true); }}><span><MessageSquare /><b>Send feedback</b><small>Share an idea or report an issue</small></span><ChevronRight /></button>}
        <button className="danger" onClick={signOut}><span><LogOut /><b>{demoMode ? "Exit demo" : "Log out"}</b><small>{demoMode ? "Return to sign in" : authUser?.email}</small></span><ChevronRight /></button>
        {exportStatus && <p role="status">{exportStatus}</p>}
      </section>
      <AnimatePresence>
        {editingProfile && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setEditingProfile(false)}>
            <motion.section className="profile-editor" initial={{ y: 28, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 20, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>YOUR PROFILE</span><h2>Edit profile</h2></div><button onClick={() => setEditingProfile(false)}><X /></button></header>
              <div className="profile-photo-edit">
                <div>{draftProfile.avatarUrl ? <img src={draftProfile.avatarUrl} alt="Profile preview" /> : draftProfile.displayName.slice(0, 1).toUpperCase()}</div>
                <label><Camera />CHANGE PHOTO<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 5 * 1024 * 1024) { setEditError("Choose an image smaller than 5 MB."); return; } setAvatarFile(file); const reader = new FileReader(); reader.onload = () => setDraftProfile((current) => ({ ...current, avatarUrl: typeof reader.result === "string" ? reader.result : null })); reader.readAsDataURL(file); }} /></label>
                {draftProfile.avatarUrl && <button onClick={() => { setAvatarFile(null); setDraftProfile((current) => ({ ...current, avatarUrl: null })); }}>REMOVE</button>}
              </div>
              <div className="profile-fields">
                <label><span>DISPLAY NAME</span><input value={draftProfile.displayName} maxLength={40} onChange={(event) => setDraftProfile((current) => ({ ...current, displayName: event.target.value }))} /></label>
                <label><span>USERNAME</span><div className="edit-username"><b>@</b><input value={draftProfile.username} maxLength={24} onChange={(event) => setDraftProfile((current) => ({ ...current, username: event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))} /></div></label>
                <label><span>X ACCOUNT</span><div className="edit-username"><b>@</b><input value={draftProfile.xProfile} maxLength={30} placeholder="yourhandle" onChange={(event) => setDraftProfile((current) => ({ ...current, xProfile: event.target.value.replace(/^@/, "") }))} /></div></label>
                <label className="bio-field"><span>BIO</span><textarea value={draftProfile.bio || ""} maxLength={160} placeholder="Tell people what you do" onChange={(event) => setDraftProfile((current) => ({ ...current, bio: event.target.value }))} /><small>{draftProfile.bio?.length || 0}/160</small></label>
              </div>
              {editError && <p className="profile-edit-error">{editError}</p>}
              <footer><button className="cancel" disabled={savingProfile} onClick={() => setEditingProfile(false)}>CANCEL</button><button className="save" disabled={savingProfile} onClick={saveProfile}>{savingProfile ? <LoaderCircle className="spin" /> : <Check />}{savingProfile ? "SAVING" : "SAVE CHANGES"}</button></footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {feedbackOpen && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setFeedbackOpen(false)}>
            <motion.section className="account-modal" initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>HELP SHAPE UPBY</span><h2>Send feedback</h2></div><button onClick={() => setFeedbackOpen(false)}><X /></button></header>
              <div className="feedback-types">{["idea", "bug", "other"].map((type) => <button key={type} className={feedbackType === type ? "active" : ""} onClick={() => setFeedbackType(type)}>{type.toUpperCase()}</button>)}</div>
              <label><span>YOUR MESSAGE</span><textarea value={feedbackMessage} maxLength={600} placeholder="Tell us what should improve" onChange={(event) => setFeedbackMessage(event.target.value)} /><small>{feedbackMessage.length}/600</small></label>
              {feedbackStatus && <p className="account-modal-status">{feedbackStatus}</p>}
              <footer><button className="cancel" disabled={feedbackBusy} onClick={() => setFeedbackOpen(false)}>CANCEL</button><button className="save" disabled={feedbackBusy || feedbackMessage.trim().length < 3} onClick={submitFeedback}>{feedbackBusy ? <LoaderCircle className="spin" /> : <MessageSquare />}{feedbackBusy ? "SENDING" : "SEND"}</button></footer>
            </motion.section>
          </motion.div>
        )}
        {deleteOpen && (
          <motion.div className="backdrop center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => !deleteBusy && setDeleteOpen(false)}>
            <motion.section className="account-modal delete-modal" initial={{ y: 24, scale: .96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
              <header><div><span>PERMANENT ACTION</span><h2>Delete account</h2></div><button disabled={deleteBusy} onClick={() => setDeleteOpen(false)}><X /></button></header>
              <p>This permanently removes your profile, logs, followers, uploaded avatar, and saved progress.</p>
              <label><span>TYPE DELETE TO CONFIRM</span><input value={deleteConfirm} autoComplete="off" onChange={(event) => setDeleteConfirm(event.target.value.toUpperCase())} /></label>
              {deleteError && <p className="account-modal-status error">{deleteError}</p>}
              <footer><button className="cancel" disabled={deleteBusy} onClick={() => setDeleteOpen(false)}>CANCEL</button><button className="delete-account" disabled={deleteBusy || deleteConfirm !== "DELETE"} onClick={deleteAccount}>{deleteBusy ? <LoaderCircle className="spin" /> : <Trash2 />}{deleteBusy ? "DELETING" : "DELETE FOREVER"}</button></footer>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {settings && (
          <motion.section
            className="privacy"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <Title over="PROFILE SETTINGS" title="Privacy" />
            {[
              ["Public profile", "Turn this off to hide your full profile", 5],
              ["Show monetary totals", "Display amounts on your public profile", 0],
              ["Show individual logs", "Let people see your public activity", 1],
              ["Show losses", "Include losses in public totals and logs", 2],
              ["Show screenshots", "Display screenshots attached to public logs", 3],
              ["Appear in rankings", "Only controls the Global leaderboard", 4],
            ].map(([label, copy, preferenceIndex]) => {
              const i = Number(preferenceIndex);
              const disabled = !prefs[5] && i !== 5;
              return (
              <label key={String(label)} className={disabled ? "privacy-disabled" : ""}>
                <span><b>{label}</b><small>{copy}</small></span>
                <button
                  className={prefs[i] ? "on" : ""}
                  disabled={disabled || privacyStatus === "Saving privacy..."}
                  onClick={() => void updatePrivacy(i)}
                >
                  <i />
                </button>
              </label>
            )})}
            {privacyStatus && <p className={privacyStatus.includes("not") ? "privacy-status error" : "privacy-status"}>{privacyStatus}</p>}
            <div className="account-session">
              <div><b>{demoMode ? "Demo session" : authUser?.email}</b><span>{demoMode ? "Sample data mode" : "Signed in securely with Supabase"}</span></div>
              <button onClick={signOut}><LogOut />{demoMode ? "EXIT DEMO" : "SIGN OUT"}</button>
            </div>
            {!demoMode && <div className="account-tools"><button onClick={exportData}><Download />EXPORT DATA</button><button onClick={() => { setFeedbackStatus(""); setFeedbackOpen(true); }}><MessageSquare />SEND FEEDBACK</button><button className="danger" onClick={() => { setDeleteConfirm(""); setDeleteError(""); setDeleteOpen(true); }}><Trash2 />DELETE ACCOUNT</button></div>}
            {exportStatus && <p role="status">{exportStatus}</p>}
            <nav className="account-links"><Link href="/privacy">PRIVACY</Link><Link href="/terms">TERMS</Link></nav>
          </motion.section>
        )}
      </AnimatePresence>
      <section className="profile-score">
        <span>UP BY THIS MONTH</span>
        <strong>{signedMoney(net)}</strong>
        {freshStart && <p className="profile-total-row"><span>{money(wins)} wins</span><span>{money(losses)} losses</span></p>}
        <div>
          <b>
            <Flame />
            {streak} DAY STREAK
          </b>
          <b>
            <Trophy />{freshStart ? earned.length : 7} ACHIEVEMENTS
          </b>
        </div>
      </section>
      <section className="social">
        <div>
          <b>{freshStart ? followingCount : 248}</b>
          <span>FOLLOWING</span>
        </div>
        <div>
          <b>{freshStart ? followerCount : "1,842"}</b>
          <span>FOLLOWERS</span>
        </div>
        <button onClick={shareProfile}>
          SHARE PROFILE
          <Share2 />
        </button>
      </section>
      <section className="selected">
        <Title over="PROUD OF THESE" title="Selected achievements" />
        <div>
          {selectedAchievements.length ? selectedAchievements.map((x) => (
            <span key={x}>
              <Medal />
              {x}
            </span>
          )) : <div className="profile-empty"><Trophy /><b>Your first badge is waiting</b><span>Log your first entry to collect it.</span><button onClick={startLog}>LOG FIRST ENTRY <ArrowUpRight /></button></div>}
        </div>
      </section>
      <section className="public-logs">
        <Title over="VISIBLE TO EVERYONE" title="Public logs" />
        {logs.length ? logs.slice(0, 3).map((l: Log) => (
          <div key={l.id}>
            <span className={l.type}>{l.type.toUpperCase()}</span>
            <b>{l.category}</b>
            <p>{l.title}</p>
            <strong>
              {l.type === "win" ? "+" : "-"}
              {money(l.amount)}
            </strong>
            <time dateTime={l.dateKey}>{logDateLabel(l.dateKey, l.date, localToday())}</time>
          </div>
        )) : <div className="public-log-empty"><CircleDollarSign /><b>No public logs yet</b><span>Your public entries will appear here.</span></div>}
      </section>
      <section className="history">
        <Title over="THE LONG VIEW" title="Monthly history" />
        <div>
          {Array.from({length:4}, (_, index) => {
            const month = shiftMonth(currentMonth(), -index);
            return [periodLabel(month), signedMoney(periodSummary(logs as Log[], month).net)];
          }).map((x) => (
            <div key={x[0]}>
              <span>{x[0]}</span>
              <b className={x[1].startsWith("-") ? "loss" : ""}>{x[1]}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
