"use client";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Share2 } from "lucide-react";
import { weekBounds, weeklySummary, type WeeklyLog } from "./weekly-summary";

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const dateLabel = (key: string) => new Date(key + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default function WeeklySummary({ logs }: { logs: WeeklyLog[] }) {
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
    canvas.width = 1200; canvas.height = 1200;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image unavailable");
    context.fillStyle = "#17182f"; context.fillRect(0, 0, 1200, 1200);
    const text = (value: string, x: number, y: number, size: number, color = "#fffdf6", maxWidth = 1040) => {
      context.fillStyle = color;
      context.font = `700 ${size}px Arial, sans-serif`;
      context.fillText(value, x, y, maxWidth);
    };
    text("UPBY ↗", 80, 115, 48, "#d4f15d");
    text(offset === 0 ? "MY WEEK SO FAR" : "MY WEEK IN REVIEW", 80, 215, 30);
    text(period, 80, 268, 26, "#c6c7d4");
    text(money(summary.net), 80, 420, 110, "#d4f15d");
    text("NET PROGRESS", 80, 475, 26);
    text("WINS", 80, 585, 24, "#c6c7d4");
    text("EXPENSES / LOSSES", 650, 585, 24, "#c6c7d4");
    text(money(summary.wins), 80, 645, 44, "#fffdf6", 480);
    text(money(summary.losses), 650, 645, 44, "#ff8980", 470);
    text("TOP CATEGORIES · BY TOTAL AMOUNT", 80, 755, 23, "#c6c7d4");
    summary.categories.forEach((category, index) => {
      const y = 822 + index * 65;
      text(category.name, 80, y, 30, "#fffdf6", 620);
      context.textAlign = "right";
      text(money(category.volume), 1120, y, 30, "#fffdf6", 350);
      context.textAlign = "left";
    });
    text(`${summary.count} ${summary.count === 1 ? "entry" : "entries"} logged`, 80, 1080, 25, "#c6c7d4");
    text("getupby.vercel.app", 80, 1135, 26, "#d4f15d");
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
