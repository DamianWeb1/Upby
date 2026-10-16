"use client";
import { ArrowUpRight, Camera, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SCREENSHOT_BUCKET } from "./screenshot-storage";
import { supabase } from "./upby-core";

export function Logo() {
  return (
    <div className="logo">
      <span>U</span>
      <ArrowUpRight />
    </div>
  );
}

export function LoadingProgress({ stalled }: { stalled: boolean }) {
  return (
    <main className="loading-progress" aria-live="polite">
      <header><Logo /><span>{stalled ? "Still loading your account" : "Loading your progress"}</span></header>
      <section className="loading-hero" aria-hidden="true">
        <i className="loading-line short" />
        <i className="loading-line total" />
        <i className="loading-line medium" />
        <div><i /><i /></div>
      </section>
      <section className="loading-list" aria-hidden="true">
        <i className="loading-line short" />
        {[0, 1, 2].map(item => <div key={item}><i /><span><b /><b /></span></div>)}
      </section>
      {stalled && <button onClick={() => window.location.reload()}>TRY AGAIN</button>}
    </main>
  );
}

export function SignedScreenshot({ path, alt, className = "" }: { path: string; alt: string; className?: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl(""); setFailed(false);
    supabase.storage.from(SCREENSHOT_BUCKET).createSignedUrl(path, 600).then(({ data, error }) => {
      if (!active) return;
      if (error || !data?.signedUrl) setFailed(true);
      else setUrl(data.signedUrl);
    });
    return () => { active = false; };
  }, [path]);
  if (failed) return <span className="screenshot-unavailable"><Camera /> Screenshot unavailable</span>;
  if (!url) return <span className="screenshot-loading"><LoaderCircle className="spin" /> Loading screenshot</span>;
  return <img className={className} src={url} alt={alt} loading="lazy" />;
}

export function Title({
  over,
  title,
  action,
}: {
  over: string;
  title: string;
  action?: string;
}) {
  return (
    <div className="title">
      <div>
        <span>{over}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button>
          {action}
          <ArrowUpRight />
        </button>
      )}
    </div>
  );
}

export function Field({ label, children }: any) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
