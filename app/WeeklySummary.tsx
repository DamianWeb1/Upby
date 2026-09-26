"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { weekBounds, weeklySummary, type WeeklyLog } from "./weekly-summary";

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const dateLabel = (key: string) => new Date(key + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function WeeklySummary({ logs, username, avatarUrl }: { logs: WeeklyLog[]; username: string; avatarUrl?: string }) {
  const [anchor, setAnchor] = useState<Date | null>(null);
  const [offset, setOffset] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") setAnchor(new Date()); };
    setAnchor(new Date());
    document.addEventListener("visibilitychange", refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { document.removeEventListener("visibilitychange", refresh); window.clearInterval(timer); };
  }, []);
  const bounds = anchor ? weekBounds(anchor, offset) : null;
  const summary = useMemo(() => bounds ? weeklySummary(logs, bounds.from, bounds.to) : null, [logs, bounds?.from, bounds?.to]);
  if (!bounds || !summary) return null;
  const period = `${dateLabel(bounds.from)} – ${dateLabel(bounds.to)}`;
  const move = (next: number) => { setOffset(next); setStatus(""); };
  const makeCard = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1600; canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image unavailable");
    context.fillStyle = "#17182f"; context.fillRect(0, 0, canvas.width, canvas.height);
    const text = (value: string, x: number, y: number, size: number, color = "#fffdf6", maxWidth = 1040) => {
      context.fillStyle = color;
      context.font = `700 ${size}px Arial, sans-serif`;
      context.fillText(value, x, y, maxWidth);
    };
    text("UPBY ↗", 80, 105, 46, "#d4f15d");
    // Load with CORS so the exported canvas stays downloadable.
    const avatar = avatarUrl ? await new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      const timer = window.setTimeout(() => { img.onload = null; img.onerror = null; resolve(null); }, 4000);
      img.crossOrigin = "anonymous";
      img.onload = () => { window.clearTimeout(timer); resolve(img); };
      img.onerror = () => { window.clearTimeout(timer); resolve(null); };
      img.src = avatarUrl;
    }) : null;
    context.save();
    context.beginPath(); context.arc(954, 87, 38, 0, Math.PI * 2); context.clip();
    context.fillStyle = "#d4f15d"; context.fillRect(916, 49, 76, 76);
    if (avatar && avatar.naturalWidth && avatar.naturalHeight) {
      const side = Math.min(avatar.naturalWidth, avatar.naturalHeight);
      context.drawImage(avatar, (avatar.naturalWidth - side) / 2, (avatar.naturalHeight - side) / 2, side, side, 916, 49, 76, 76);
    } else {
      context.textAlign = "center";
      text((username || "U").replace(/^@/, "").slice(0, 1).toUpperCase(), 954, 101, 38, "#17182f", 60);
    }
    context.restore();
    text(username ? `@${username.replace(/^@/, "")}` : "UPBY member", 1012, 101, 30, "#fffdf6", 508);
    context.fillStyle = "#35364e";
    context.fillRect(80, 150, 1440, 1);
    text(offset === 0 ? "MY WEEK SO FAR" : "MY WEEK IN REVIEW", 80, 220, 32);
    context.textAlign = "right";
    text(period, 1520, 220, 25, "#c6c7d4", 700);
    context.textAlign = "left";
    const panel = (x: number, y: number, width: number, height: number) => {
      context.fillStyle = "#22233d";
      context.beginPath(); context.roundRect(x, y, width, height, 24); context.fill();
    };
    panel(80, 268, 704, 468);
    panel(816, 268, 704, 468);
    text("NET PROGRESS", 116, 328, 23, "#c6c7d4");
    text(money(summary.net), 116, 458, 100, "#d4f15d", 632);
    context.fillStyle = "#3a3b52";
    context.fillRect(116, 515, 632, 1);
    text("WINS", 116, 579, 21, "#c6c7d4");
    text("EXPENSES / LOSSES", 445, 579, 21, "#c6c7d4", 303);
    text(money(summary.wins), 116, 647, 42, "#fffdf6", 293);
    text(money(summary.losses), 445, 647, 42, "#ff8980", 303);
    text("TOP CATEGORIES", 852, 328, 23, "#c6c7d4", 330);
    context.textAlign = "right";
    text("TOTAL AMOUNT", 1484, 328, 18, "#c6c7d4", 230);
    context.textAlign = "left";
    summary.categories.forEach((category, index) => {
      const y = 425 + index * 110;
      text(category.name, 852, y, 28, "#fffdf6", 355);
      context.textAlign = "right";
      text(money(category.volume), 1484, y, 30, "#d4f15d", 250);
      context.textAlign = "left";
      if (index < summary.categories.length - 1) {
        context.fillStyle = "#3a3b52"; context.fillRect(852, y + 40, 632, 1);
      }
    });
    text(`${summary.count} ${summary.count === 1 ? "entry" : "entries"} logged`, 80, 820, 24, "#c6c7d4", 704);
    context.textAlign = "right";
    text("getupby.vercel.app", 1520, 820, 24, "#d4f15d", 704);
    context.textAlign = "left";
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image unavailable")), "image/png"));
  };
  const exportCard = async (share: boolean) => {
    if (busy) return;
    setBusy(true); setStatus("");
    try {
      const blob = await makeCard();
      const file = new File([blob], `upby-week-${bounds.from}.png`, { type: "image/png" });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "My UPBY week" });
        setStatus("Card shared.");
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = file.name; link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        setStatus(share ? "Card downloaded. Attach it to your post." : "Card downloaded.");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) setStatus("Could not create your card. Please try again.");
    } finally { setBusy(false); }
  };
  return <section className="weekly-summary" aria-label="Weekly summary">
    <header><div><span>WEEKLY SUMMARY</span><h2>{offset === 0 ? "Your week so far" : "Your week in review"}</h2></div>
      <div className="weekly-navigation"><button aria-label="Previous week" onClick={() => move(offset - 1)}><ChevronLeft /></button><button aria-label="Next week" disabled={offset === 0} onClick={() => move(Math.min(0, offset + 1))}><ChevronRight /></button></div>
    </header>
    <p className="weekly-period">{period} · Monday to Sunday</p>
    {offset < 0 && <button className="weekly-current" onClick={() => move(0)}>Back to this week</button>}
    <div className="weekly-net"><span>NET PROGRESS</span><strong>{money(summary.net)}</strong></div>
    <dl className="weekly-totals"><div><dt>Wins</dt><dd>{money(summary.wins)}</dd></div><div><dt>Expenses / losses</dt><dd>{money(summary.losses)}</dd></div><div><dt>Entries</dt><dd>{summary.count}</dd></div></dl>
    {summary.count ? <><h3>Top categories</h3><p className="weekly-caption">Ranked by total wins and expenses / losses combined.</p><ul>{summary.categories.map(category => <li key={category.name}><span>{category.name}</span><b>{money(category.volume)}</b></li>)}</ul>
      <p className="weekly-caption">Your card includes these totals and categories. Sharing is optional.</p>
      <div className="weekly-actions"><button disabled={busy} onClick={() => void exportCard(true)}><Share2 size={18} />Share card</button><button disabled={busy} onClick={() => void exportCard(false)}><Download size={18} />Save image</button></div></>
      : <p>No entries this week. Your summary updates when you add a dated log.</p>}
    <p className="weekly-status" role="status">{status}</p>
  </section>;
}
