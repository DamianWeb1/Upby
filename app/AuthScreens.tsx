"use client";
import { AnimatePresence, m as motion } from "framer-motion";
import {
  ArrowUpRight,
  Camera,
  Check,
  ChevronLeft,
  Flame,
  LoaderCircle,
  PartyPopper,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Logo } from "./ui";
import { DEFAULT_PROFILE, type ProfileData, supabase } from "./upby-core";

export function AuthWelcome({ onDemo }: { onDemo: () => void }) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const continueWithGoogle = async () => {
    setErrorMessage("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          scopes: "openid email profile",
        },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="auth-page">
      <section className="auth-art">
        <div className="auth-brand"><Logo /><b>UPBY</b></div>
        <div className="auth-orbit" aria-hidden="true">
          <motion.i className="auth-main-icon" animate={{ rotate: [0, 5, 0], y: [0, -6, 0] }} transition={{ duration: 2.8, repeat: Infinity }}>
            <ArrowUpRight />
          </motion.i>
          <motion.i className="auth-float win" animate={{ y: [0, -10, 0] }} transition={{ duration: 2.2, repeat: Infinity }}><Trophy /></motion.i>
          <motion.i className="auth-float streak" animate={{ y: [0, 8, 0] }} transition={{ duration: 2.6, repeat: Infinity }}><Flame /></motion.i>
          <motion.i className="auth-float progress" animate={{ rotate: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity }}><PartyPopper /></motion.i>
        </div>
        <div className="auth-art-copy">
          <span>YOUR PROGRESS, IN ONE PLACE</span>
          <h1>How much are you up by?</h1>
          <p>Log the wins. Record the losses. See the full picture.</p>
        </div>
        <div className="auth-proof">
          <span><b>12</b> day streak</span>
          <span><b>+4.2K</b> this month</span>
          <span><b>#38</b> global</span>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><Logo /><b>UPBY</b></div>
        <div className="auth-copy">
          <span>WELCOME TO UPBY</span>
          <h2>Start tracking your progress.</h2>
          <p>Create your profile and keep every win and loss in one place.</p>
        </div>
        <div className="auth-actions">
          <button className="google-button" onClick={continueWithGoogle} disabled={busy}>
            {busy ? <LoaderCircle className="spin" /> : <i>G</i>}
            Continue with Google
          </button>
          <p className="google-privacy-note"><ShieldCheck />UPBY only receives your basic name, email, and profile picture.</p>
          {errorMessage && <p className="auth-message error">{errorMessage}</p>}
        </div>
        <div className="auth-divider"><span>OR</span></div>
        <button className="demo-button" onClick={onDemo}>Explore the demo <ArrowUpRight /></button>
        <p className="auth-terms">By continuing, you agree to UPBY’s <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
      </section>
    </main>
  );
}

export function Onboarding({ onComplete, onBack, initialProfile = DEFAULT_PROFILE }: { onComplete: (profile: ProfileData, prefs: number[]) => void; onBack: () => void; initialProfile?: ProfileData }) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState(initialProfile.displayName);
  const [username, setUsername] = useState(initialProfile.username);
  const [xProfile, setXProfile] = useState(initialProfile.xProfile === DEFAULT_PROFILE.xProfile && initialProfile.username !== DEFAULT_PROFILE.username ? "" : initialProfile.xProfile);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile.avatarUrl);
  const [privacy, setPrivacy] = useState([true, true, true, false, true, true]);
  const validIdentity = displayName.trim().length > 1 && username.trim().length >= 3;
  const next = () => setStep((value) => Math.min(3, value + 1));
  const previous = () => step === 0 ? onBack() : setStep((value) => Math.max(0, value - 1));
  const privacyLabels = [
    ["Show monetary totals", "Display monthly and yearly UPBY totals"],
    ["Show individual logs", "Let people see your public activity"],
    ["Show losses", "Include losses on your public profile"],
    ["Show screenshots", "Display screenshots attached to public logs"],
    ["Appear in rankings", "Only controls the Global leaderboard"],
    ["Public profile", "Turn this off to hide your full profile from everyone"],
  ];
  return (
    <main className="onboarding-page">
      <aside className="onboarding-preview">
        <div className="auth-brand"><Logo /><b>UPBY</b></div>
        <span>YOUR PROFILE PREVIEW</span>
        <div className="preview-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : displayName.slice(0, 1).toUpperCase()}
          <i />
        </div>
        <h2>{displayName || "Your name"}</h2>
        <b>@{username || "username"}</b>
        {xProfile && <p>𝕏 @{xProfile.replace(/^@/, "")}</p>}
        <div className="preview-score"><span>UP BY THIS MONTH</span><strong>+$0</strong><small>Your first log starts here.</small></div>
        <div className="preview-tags"><span><Flame />0 day streak</span><span><Trophy />0 achievements</span></div>
      </aside>
      <section className="onboarding-form">
        <header>
          <button onClick={previous}><ChevronLeft /></button>
          <div className="onboarding-progress">
            {[0, 1, 2, 3].map((item) => <i className={item <= step ? "active" : ""} key={item} />)}
          </div>
          <span>{step + 1} / 4</span>
        </header>
      <AnimatePresence mode="wait">
          <motion.div className="onboarding-step" key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}>
            {step === 0 && <>
              <span>YOUR IDENTITY</span>
              <h1>What should people call you?</h1>
              <p>This creates your UPBY profile and public link.</p>
              <label><span>DISPLAY NAME</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Your name" /></label>
              <label><span>USERNAME</span><div className="username-field"><b>upby.app/</b><input value={username} onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="username" /><i className={username.length >= 3 ? "available" : ""}>{username.length >= 3 ? <Check /> : null}</i></div></label>
              {username.length >= 3 && <small className="available-copy">@{username} is available</small>}
            </>}
            {step === 1 && <>
              <span>MAKE IT YOURS</span>
              <h1>Add your face and X profile.</h1>
              <p>Both are optional. You can update them later.</p>
              <div className="avatar-upload">
                <div>{avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : displayName.slice(0, 1).toUpperCase()}</div>
                <label><Camera />Choose photo<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : null); reader.readAsDataURL(file); } }} /></label>
                {avatarUrl && <button onClick={() => setAvatarUrl(null)}>Remove</button>}
              </div>
              <label><span>OPTIONAL X PROFILE</span><div className="x-field"><b>𝕏 @</b><input value={xProfile} onChange={(event) => setXProfile(event.target.value.replace(/^@/, ""))} placeholder="yourhandle" /></div></label>
            </>}
            {step === 2 && <>
              <span>YOUR PRIVACY</span>
              <h1>You decide what people see.</h1>
              <p>These settings affect your public profile and leaderboard.</p>
              <div className="onboarding-privacy">
                {privacyLabels.map(([label, copy], index) => <div key={label}><div><b>{label}</b><span>{copy}</span></div><button className={privacy[index] ? "on" : ""} onClick={() => setPrivacy((items) => items.map((item, itemIndex) => itemIndex === index ? !item : item))}><i /></button></div>)}
              </div>
            </>}
            {step === 3 && <>
              <div className="ready-icon"><Check /></div>
              <span>YOU’RE READY</span>
              <h1>Your UPBY profile is set.</h1>
              <p>Start by logging your first win or loss. Every entry builds your progress story.</p>
              <div className="ready-summary"><span><b>@{username}</b>{privacy[5] ? "Public profile" : "Private profile"}</span><span><b>{privacy[4] && privacy[5] ? "Visible" : "Hidden"}</b>Leaderboard status</span><span><b>Private by default</b>Screenshot visibility</span></div>
            </>}
          </motion.div>
        </AnimatePresence>
        <footer>
          {step < 3 ? (
            <button className="onboarding-next" disabled={step === 0 && !validIdentity} onClick={next}>
              CONTINUE <ArrowUpRight />
            </button>
          ) : (
            <button className="onboarding-next finish" onClick={() => onComplete({ displayName: displayName.trim(), username: username.trim(), xProfile: xProfile.trim(), avatarUrl }, privacy.map(Number))}>
              OPEN MY UPBY <ArrowUpRight />
            </button>
          )}
          {step === 1 && <button className="skip-step" onClick={() => { setXProfile(""); next(); }}>Skip for now</button>}
        </footer>
      </section>
    </main>
  );
}
