import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./iomi-notch.css";

/* ============================================================================
   IomiNotch — the ONE unified notch nav, used site-wide.

   The MECHANIC (click bar → expand into a dynamic island holding the site's
   nav grid, same easing/timing) is shared everywhere. The BAR's face is not:
   - variant="iomi" (brainos-only): the two-dot eyes + text that swaps
     between "IOMI" (closed) and "BrainOS" (open) — a distinct identity
     that belongs to that page alone.
   - variant="plain" (every other page, the default): just the normal
     notch eyes, no text label.
   ============================================================================ */

export type IomiNavItem = { to: string; label: string; note: string };

export const IOMI_NAV: IomiNavItem[] = [
  { to: "/", label: "Welcome", note: "three classes" },
  { to: "/saburi", label: "Saburi", note: "the companion" },
  { to: "/iomi", label: "Iomi", note: "the OS" },
  { to: "/telos", label: "Telos", note: "the agent" },
  { to: "/chat", label: "Chat", note: "talk to him" },
  { to: "/dontblink", label: "Don't Blink", note: "the film" },
  { to: "/journal", label: "Blog", note: "built in public" },
  { to: "/dashboard", label: "Dashboard", note: "your controls" },
];

export default function IomiNotch({
  nav = IOMI_NAV,
  variant = "plain",
}: {
  nav?: IomiNavItem[];
  variant?: "iomi" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="iomi-notch-dock">
      <div ref={ref} className={`iomi-notch${open ? " open" : ""}`}>
        {/* The BAR is the button, not the whole notch. When the notch is open the
            panel fills it, so a toggle on the outer element is unreachable —
            it opened once and then every further click landed on the panel. */}
        <div
          className="iomi-notch-bar"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((v) => !v); } }}
        >
          {variant === "iomi" ? (
            <>
              <span className="iomi-notch-eyes"><i className="iomi-notch-eye" /><i className="iomi-notch-eye" /></span>
              <span>{open ? "BrainOS" : "IOMI"}</span>
            </>
          ) : (
            <svg className="iomi-notch-realeyes" viewBox="32 6 56 46" aria-hidden="true">
              <g><circle cx="49" cy="22" r="12" fill="#fff" /><circle cx="49" cy="22" r="6.2" fill="#1B1713" /><circle cx="51.3" cy="19.3" r="2" fill="#fff" /></g>
              <g><circle cx="71" cy="22" r="12" fill="#fff" /><circle cx="71" cy="22" r="6.2" fill="#1B1713" /><circle cx="73.3" cy="19.3" r="2" fill="#fff" /></g>
              <path d="M 36 22 Q 49 28 62 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M 58 22 Q 71 28 84 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <div className="iomi-notch-panel">
          <div className="iomi-notch-label">Go anywhere</div>
          <div className="iomi-notch-grid">
            {nav.map((n) => (
              <Link key={n.label} className="iomi-notch-link" to={n.to} onClick={() => setOpen(false)}>
                {n.label}<span>{n.note}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
