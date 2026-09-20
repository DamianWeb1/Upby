import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <a className="legal-back" href="/">U↗ UPBY</a>
      <span>LAST UPDATED SEPTEMBER 20, 2026</span>
      <h1>Privacy Policy</h1>
      <p>UPBY stores the information needed to run your account and sync your progress across devices.</p>
      <section>
        <h2>Information we collect</h2>
        <p>When you sign in with Google, UPBY receives your basic name, email address, and profile picture. We also store the profile details, privacy choices, categories, wins, losses, notes, and images you choose to add.</p>
      </section>
      <section>
        <h2>How we use it</h2>
        <p>We use your information to authenticate your account, save your progress, calculate insights, display leaderboards, and create the public profile features you enable.</p>
      </section>
      <section>
        <h2>Product analytics</h2>
        <p>UPBY records basic feature-use counts and generic error categories so we can improve reliability. Analytics do not include your log amounts, titles, notes, email address, or private profile content.</p>
      </section>
      <section>
        <h2>Public information</h2>
        <p>Your username and display name form your public profile. Your totals, individual logs, losses, screenshots, and leaderboard visibility follow the privacy controls in your Profile settings.</p>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>UPBY uses Supabase for authentication, database storage, and uploaded images. Vercel hosts the application. Google provides optional account sign-in.</p>
      </section>
      <section>
        <h2>Control and removal</h2>
        <p>You may edit your profile, change privacy choices, export your data, or permanently delete your account inside Profile settings. Account deletion removes your profile, logs, social connections, feedback, and uploaded avatar.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p><a href="https://x.com/damian__web" target="_blank" rel="noreferrer">Send a privacy request on X ↗</a></p>
      </section>
      <nav className="legal-links"><a href="/terms">Terms</a><a href="https://x.com/damian__web" target="_blank" rel="noreferrer">Feedback</a></nav>
    </main>
  );
}
