import { ImageResponse } from "next/og";

export const alt = "UPBY, track every win and loss";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f6f1e7",
        color: "#111329",
        fontFamily: "Arial, sans-serif",
        padding: "64px 70px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 86, height: 72, display: "flex", alignItems: "center", justifyContent: "center", background: "#2864f0", color: "white", borderRadius: 22, border: "4px solid #111329", boxShadow: "0 9px 0 #111329", fontSize: 42, fontWeight: 900 }}>U↗</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, letterSpacing: 7 }}>UPBY</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 900, letterSpacing: -5, lineHeight: 0.95, maxWidth: 900 }}>HOW MUCH ARE YOU UP BY?</div>
          <div style={{ display: "flex", marginTop: 25, fontSize: 25, color: "#535568" }}>Log the wins. Record the losses. See the full picture.</div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            ["#c8ef43", "WINS"],
            ["#ff746b", "LOSSES"],
            ["#ffa735", "STREAKS"],
            ["#8a63ff", "PROGRESS"],
          ].map(([color, label]) => (
            <div key={label} style={{ display: "flex", background: color, border: "3px solid #111329", borderRadius: 999, padding: "11px 20px", fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>{label}</div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", width: 290, height: 290, borderRadius: 999, border: "36px solid #2864f0", right: -75, top: -80, opacity: 0.16 }} />
      <div style={{ position: "absolute", width: 190, height: 190, borderRadius: 999, background: "#c8ef43", right: 45, bottom: -105, border: "4px solid #111329" }} />
    </div>,
    size,
  );
}
