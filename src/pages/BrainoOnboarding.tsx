import { useEffect, type CSSProperties } from "react";
import "../../mac/braino-mac/renderer/onboard.css";
import onboardUrl from "../../mac/braino-mac/renderer/onboard.js?url";

/* The Mac onboarding, on the website, from the very same file
   (mac/braino-mac/renderer/onboard.js + onboard.css). Design it here and the
   Mac app shows exactly this. The Mac's own pieces (his voice, real
   permissions, "try me") are stood in for: Allow turns green when tapped,
   and the lines light up at reading speed instead of being spoken. */
type Perm = { id: string; label: string; ok: boolean };

export default function BrainoOnboarding() {
  useEffect(() => {
    const perms: Perm[] = [
      { id: "microphone", label: "Microphone", ok: false },
      { id: "accessibility", label: "Accessibility", ok: false },
      { id: "screen", label: "Screen Recording", ok: false },
      { id: "contacts", label: "Contacts", ok: false },
    ];
    const w = window as unknown as Record<string, unknown>;
    const prevApi = w.brainoMac;
    w.OB_IMG_BASE = "/";
    // Design helpers: /braino-onboarding?scene=meetings&hold=1 opens one scene and keeps it up.
    const q = new URLSearchParams(window.location.search);
    w.OB_START = q.get("scene") || "";
    w.OB_HOLD = q.get("hold") === "1";
    w.brainoMac = {
      setupSnapshot: async () => ({ ok: true, name: "", answers: {}, permissions: perms.map((p) => ({ ...p })) }),
      setupPermissions: async () => ({ ok: true, permissions: perms.map((p) => ({ ...p })) }),
      setupAsk: async (id: string) => { const p = perms.find((x) => x.id === id); if (p) p.ok = true; return { ok: true }; },
      setupSave: async () => ({ ok: true }),
      // Connect Nexus, stood in: any mesa_pat_ token "connects".
      mesaOpenDeveloper: async () => { window.open("https://students.mesaschool.co.in/student/developer?view=console", "_blank"); return { ok: true }; },
      mesaTokenSave: async (t: string) => (/^mesa_pat_/.test(String(t)) ? { ok: true, name: "A Mesa student", program: "PGP" } : { ok: false, error: "That doesn't look like a Nexus token. It starts with mesa_pat_." }),
      mesaTokenStatus: async () => ({ connected: false }),
    };
    const script = document.createElement("script");
    script.src = onboardUrl;
    document.body.appendChild(script);
    document.title = "Welcome to Braino";
    return () => { script.remove(); w.brainoMac = prevApi; };
  }, []);

  return (
    <div className="ob-app" style={{ "--ob-logo": "url(/affective-logo.png)", height: "100vh" } as CSSProperties}>
      <header className="ob-top">
        <span className="ob-mark">Affective</span>
        <button type="button" className="ob-sound" id="ob-sound">Sound on</button>
      </header>
      <main className="ob-stage" id="ob-stage" aria-live="polite" />
      <footer className="ob-foot">
        <button type="button" className="ob-back" id="ob-back">Back</button>
        <div className="ob-dots" id="ob-dots" />
        <span className="ob-count" id="ob-count" />
      </footer>
    </div>
  );
}
