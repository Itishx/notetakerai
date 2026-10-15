import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { BrainoMascot } from "@/components/BrainoMascot";

/* /connected (2026-10-15): where a sign in lands after Google, Spotify and the
   rest. Supabase functions may not serve web pages (they come back as code on
   screen), so the callbacks redirect here with the result instead. The tab
   tries to close itself; if the browser will not let it, it says so. */
export default function Connected() {
  const [params] = useSearchParams();
  const ok = params.get("ok") !== "0";
  const service = params.get("service") || "your account";
  const detail = params.get("msg") || "";
  useEffect(() => {
    document.title = ok ? `Connected · ${service}` : "Couldn't connect";
    if (!ok) return;
    const t = window.setTimeout(() => window.close(), 1800);
    return () => window.clearTimeout(t);
  }, [ok, service]);
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f4f2ec", color: "#16150f", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif" }}>
      <div style={{ width: "min(420px, 100%)", textAlign: "center", padding: "40px 32px", borderRadius: 24, background: "#fdfcf8", border: "1px solid #e4e0d6", boxShadow: "0 30px 80px -50px rgba(0,0,0,.4)" }}>
        <BrainoMascot size={96} />
        <h1 style={{ margin: "18px 0 0", font: "600 28px/1.15 'SF Pro Display', -apple-system, sans-serif", letterSpacing: "-0.03em" }}>
          {ok ? `Connected to ${service}` : `Couldn't connect ${service}`}
        </h1>
        {detail && <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.5, color: "#5a574f" }}>{detail}</p>}
        <p style={{ margin: "18px 0 0", fontSize: 13, color: "#8a877e" }}>
          {ok ? "You can close this tab and go back to Braino." : "Go back to Braino and try again."}
        </p>
        <button type="button" onClick={() => window.close()} style={{ marginTop: 20, padding: "11px 20px", border: 0, borderRadius: 999, background: "#16150f", color: "#f4f2ec", font: "600 14px -apple-system, sans-serif", cursor: "pointer" }}>
          Close
        </button>
      </div>
    </main>
  );
}
