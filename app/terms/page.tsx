import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <main className="legal-page">
      <a className="legal-back" href="/">U↗ UPBY</a>
      <span>LAST UPDATED SEPTEMBER 20, 2026</span>
      <h1>Terms of Use</h1>
      <p>These terms apply when you create an account or use UPBY.</p>
      <section>
        <h2>Your account</h2>
        <p>You are responsible for your account activity and the accuracy of the progress you log. Do not use UPBY to impersonate another person, abuse the service, or publish unlawful content.</p>
      </section>
      <section>
        <h2>Your content</h2>
        <p>You keep ownership of the profile details, logs, notes, and images you add. You give UPBY permission to store and display them only as needed to provide the service and follow your privacy settings.</p>
      </section>
      <section>
        <h2>Progress information</h2>
        <p>UPBY is a personal progress tracker. It is not a bank, wallet, accounting service, trading platform, or source of financial advice. Review your own records before relying on totals shown in the app.</p>
      </section>
      <section>
        <h2>Availability</h2>
        <p>We work to keep UPBY available and your data synced, but access may occasionally be interrupted for maintenance, provider issues, or product changes.</p>
      </section>
      <section>
        <h2>Changes</h2>
        <p>UPBY may update these terms as the product grows. The latest version will remain available on this page.</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p><a href="https://x.com/damian__web" target="_blank" rel="noreferrer">Send a question on X ↗</a></p>
      </section>
      <nav className="legal-links"><a href="/privacy">Privacy</a><a href="https://x.com/damian__web" target="_blank" rel="noreferrer">Feedback</a></nav>
    </main>
  );
}
