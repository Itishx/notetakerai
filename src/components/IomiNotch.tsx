import { useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import NotchFace, { setNotchStatus, typeNotchCaption } from "./NotchFace";
import "./iomi-notch.css";

/* ============================================================================
   IomiNotch — the ONE unified notch nav, used site-wide.

   The MECHANIC (click bar → expand into a dynamic island holding the site's
   nav grid, same easing/timing) is shared everywhere. The BAR's face is not:
   - variant="iomi" (brainos-only): the two-dot eyes + text that swaps
     between "IOMI" (closed) and "BrainOS" (open).
   - variant="plain" (every other page, the default): the normal notch eyes.

   SLEEP + BOOT (plain variant, once per session): on first arrival Braino is
   asleep in the notch — eyes shut, a soft snore. Click him and the page drops
   to black, spotlighting the notch, and it runs the ACTUAL Mac notch boot
   sequence (the verbatim LID_SEQ beats: eyes pop open → doze → island pulses
   "authenticating" → green verdict + glow → wink → greeting glow). His line
   for the moment shows as a SUBTITLE — never spoken. Then the black fades and
   the notch is awake for the rest of the session.
   ============================================================================ */

type IomiNavItem = {
  to: string;
  label: string;
  note: string;
  children?: IomiNavItem[];
};

// Four destinations, deliberately. The notch is the whole site's navigation, so
// everything that lived here competed with everything else: Blog, Letter, Don't
// Blink, Motion Graphics, and Log are all still live pages, just no longer in
// the notch. Reach them from the pages that already link to them.
const IOMI_NAV: IomiNavItem[] = [
  { to: "/", label: "Welcome", note: "three classes" },
  {
    to: "/braino-os",
    label: "BrainoOS",
    note: "the operating system",
    children: [
      { to: "/braino-os", label: "Overview", note: "the operating system" },
      { to: "/human-intelligence", label: "Human Intelligence", note: "the mind that knows" },
      { to: "/emotional-intelligence", label: "Emotional Intelligence", note: "the heart that feels" },
      { to: "/yap-mode", label: "Yap Mode", note: "talk and it types" },
    ],
  },
  { to: "/dashboard", label: "Dashboard", note: "your controls" },
  { to: "/iomi", label: "Iomi", note: "the OS" },
];

// The verbatim first-invoke boot beats (the app's real lifecycle, same as the
// Don't Blink film). State classes are the app's own, applied to the NotchFace.
// The final beat is `captioning`, where the greeting TYPES into the notch's
// caption wing — the "How you doing?" style — instead of any floating subtitle.
// VERBATIM the Mac app's runNotchBoot() beats: eyes form CLOSED in the dark → a
// slow light draws the island's outline → authenticating pulse → the coral wave
// floods through → green verdict, eyes open → the island spreads caption-wide,
// he winks, and the wing types his hello.
const BOOT_SEQ: { cls: string; ms: number; status?: string; caption?: boolean }[] = [
  { cls: "dozing", ms: 900 },                                    // eyes form closed in the dark
  { cls: "dozing nf-shining nf-shine-slow", ms: 2700 },          // slow light draws the outline
  { cls: "dozing nf-auth", ms: 1100, status: "authenticating" }, // authenticating pulse
  { cls: "dozing nf-coral", ms: 760 },                           // the coral wave floods through
  { cls: "nf-auth-ok awake", ms: 700 },                          // green verdict, eyes open
  { cls: "captioning nf-wink awake", ms: 2300, caption: true },  // island spreads, wink, wing types
];

// The caption reacts to the moment — quick click is his "How you doing?"; a slow
// one gets ribbed. Never the same scripted line twice.
function pickGreeting(waitedMs: number, returning: boolean): string {
  const h = new Date().getHours();
  const night = h >= 22 || h < 5;
  if (waitedMs > 8000) return returning ? "You again. Glad you're still here." : "Hey. Took you long enough.";
  if (returning) return night ? "Back already? And up late." : "Back already? Good.";
  if (waitedMs > 3500) return "Glad you're still here.";
  if (night) return "Up late? How you doing?";
  return "How you doing?";
}

type BootPhase = "idle" | "black" | "fading";

// Awake-state is per TAB, and it has to survive two things a plain module variable
// does not: a hard reload (any full navigation re-evaluates this file) and an
// unmount mid-boot (every page mounts its own notch, so navigating away used to
// kill the timer that marked him awake and he would boot again on the next page).
// sessionStorage is exactly per-tab: it survives a refresh, and dies when the tab
// closes, which is the "once per tab" behavior we want.
const WOKE_KEY = "braino-woke-this-session";

function readWoke(): boolean {
  try { return sessionStorage.getItem(WOKE_KEY) === "1"; } catch { return wokeFallback; }
}

// Used only when sessionStorage is blocked (private mode, embedded webviews).
let wokeFallback = false;

export default function IomiNotch({
  nav = IOMI_NAV,
  variant = "plain",
}: {
  nav?: IomiNavItem[];
  variant?: "iomi" | "plain";
}) {
  const [open, setOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<IomiNavItem | null>(null);
  const [music, setMusic] = useState(false); // "now playing" while the footer game runs
  const [watching, setWatching] = useState<string | null>(null); // Braino TV status
  // Asleep on the very first paint of a fresh load (plain variant only), so the
  // eyes render closed immediately — no open-eye flash.
  const [asleep, setAsleep] = useState(() => variant === "plain" && !readWoke());
  const [boot, setBoot] = useState<BootPhase>("idle");
  const mountAt = useRef(Date.now());
  const greetRef = useRef("");
  const ref = useRef<HTMLDivElement>(null);
  const bootFaceRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => () => { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }, []);

  // The footer game broadcasts play/stop; the notch shows a "now playing" pulse.
  useEffect(() => {
    const onMusic = (e: Event) => setMusic(Boolean((e as CustomEvent).detail));
    window.addEventListener("braino-music", onMusic as EventListener);
    return () => window.removeEventListener("braino-music", onMusic as EventListener);
  }, []);

  // Braino TV — "Watching …" status while a teaser plays anywhere on the page
  useEffect(() => {
    const onTV = (e: Event) => setWatching((e as CustomEvent).detail ?? null);
    window.addEventListener("braino-tv-status", onTV as EventListener);
    return () => window.removeEventListener("braino-tv-status", onTV as EventListener);
  }, []);

  const markAwake = () => {
    wokeFallback = true;
    try { sessionStorage.setItem(WOKE_KEY, "1"); } catch { /* storage blocked, fallback covers it */ }
    try { localStorage.setItem("braino-has-visited", "1"); } catch { /* storage blocked */ }
  };

  const runBoot = () => {
    let returning = false;
    try { returning = localStorage.getItem("braino-has-visited") === "1"; } catch { /* storage blocked */ }
    const waited = mountAt.current ? Date.now() - mountAt.current : 0;
    greetRef.current = pickGreeting(waited, returning);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAsleep(false); markAwake(); // no theatrics for reduced-motion
      return;
    }

    // Marked awake at the START, not after the last timer. Navigating away mid-boot
    // used to cancel that final timer, so the flag never got set and the next page
    // played the whole thing again. Once he has started waking, he is awake.
    markAwake();
    setBoot("black");
    let t = 0;
    BOOT_SEQ.forEach((s) => {
      timers.current.push(window.setTimeout(() => {
        const face = bootFaceRef.current;
        if (!face) return;
        face.className = `nf-face on ${s.cls}`;
        setNotchStatus(face, s.status || "");
        if (s.caption) typeNotchCaption(face, greetRef.current, 55); // greeting types into the notch
      }, t));
      t += s.ms;
    });
    timers.current.push(window.setTimeout(() => setBoot("fading"), t));
    timers.current.push(window.setTimeout(() => { setBoot("idle"); setAsleep(false); }, t + 600));
  };

  const onBar = () => {
    if (boot !== "idle") return;              // ignore clicks mid-boot
    if (asleep) { runBoot(); return; }        // asleep → the real boot sequence
    setOpen((current) => {
      if (current) setActiveParent(null);
      return !current;
    });
  };

  const closeNav = () => {
    setOpen(false);
    setActiveParent(null);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveParent(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeParent) setActiveParent(null);
      else setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [activeParent, open]);

  const booting = boot !== "idle";
  const showClosed = asleep && !booting;

  return (
    <div className={"iomi-notch-dock" + (booting ? " booting" : "")}>
      {/* Boot plays IN the notch, in place — no black, the page stays as it is.
          The real NotchFace runs the beats where the notch normally sits. */}
      {booting && (
        <div className={"iomi-boot-face" + (boot === "fading" ? " fading" : "")}>
          <NotchFace ref={bootFaceRef} className="on asleep" />
        </div>
      )}

      {!booting && showClosed && (
        <span className="iomi-snore" aria-hidden="true"><i>z</i><i>z</i><i>z</i></span>
      )}
      {!booting && music && (
        <span className="iomi-music" aria-hidden="true"><i /><i /><i /><i /></span>
      )}
      {!booting && watching && (
        <span className="iomi-watching" aria-hidden="true">Watching {watching}</span>
      )}

      <div ref={ref} className={`iomi-notch${open ? " open" : ""}`} style={booting ? { visibility: "hidden" } : undefined}>
        <div
          className="iomi-notch-bar"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={showClosed ? "Wake Braino" : open ? "Close menu" : "Open menu"}
          onClick={onBar}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onBar(); } }}
        >
          {variant === "iomi" ? (
            <>
              <span className="iomi-notch-eyes"><i className="iomi-notch-eye" /><i className="iomi-notch-eye" /></span>
              <span>{open ? "BrainOS" : "IOMI"}</span>
            </>
          ) : showClosed ? (
            <svg className="iomi-notch-realeyes sleeping" viewBox="32 6 56 46" aria-hidden="true">
              <path d="M 40 23 Q 49 31 58 23" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M 62 23 Q 71 31 80 23" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
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
          <LayoutGroup id="iomi-notch-navigation">
            <AnimatePresence initial={false} mode="popLayout">
              {!activeParent ? (
                <motion.div
                  key="notch-root"
                  className="iomi-notch-view iomi-notch-root"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="iomi-notch-label">Go anywhere</div>
                  <div className="iomi-notch-grid">
                    {nav.map((item) => {
                      const hasChildren = Boolean(item.children?.length);
                      const layoutKey = item.label.toLowerCase().replace(/\s+/g, "-");
                      return (
                        <motion.div
                          layout
                          key={item.label}
                          className={`iomi-notch-item${hasChildren ? " has-children" : ""}`}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Link className="iomi-notch-link" to={item.to} onClick={closeNav}>
                            <span className="iomi-notch-copy">
                              <motion.span className="iomi-notch-name" layoutId={`iomi-name-${layoutKey}`}>
                                {item.label}
                              </motion.span>
                              <motion.span className="iomi-notch-note" layoutId={`iomi-note-${layoutKey}`}>
                                {item.note}
                              </motion.span>
                            </span>
                          </Link>
                          {hasChildren && (
                            <button
                              className="iomi-notch-arrow"
                              type="button"
                              aria-label={`Open ${item.label} pages`}
                              title={`Open ${item.label} pages`}
                              onClick={() => setActiveParent(item)}
                            >
                              <ChevronRight aria-hidden="true" />
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={`notch-parent-${activeParent.label}`}
                  className="iomi-notch-view iomi-notch-parent-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.24 }}
                >
                  <div className="iomi-notch-parent">
                    <button
                      className="iomi-notch-back"
                      type="button"
                      aria-label="Back to all pages"
                      title="Back to all pages"
                      onClick={() => setActiveParent(null)}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <div className="iomi-notch-parent-copy">
                      <motion.h2 layoutId={`iomi-name-${activeParent.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        {activeParent.label}
                      </motion.h2>
                      <motion.p layoutId={`iomi-note-${activeParent.label.toLowerCase().replace(/\s+/g, "-")}`}>
                        {activeParent.note}
                      </motion.p>
                    </div>
                  </div>

                  <motion.nav
                    className="iomi-notch-subpages"
                    aria-label={`${activeParent.label} pages`}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
                    }}
                  >
                    <span className="iomi-notch-label">Inside {activeParent.label}</span>
                    {activeParent.children?.map((child) => (
                      <motion.div
                        key={child.to}
                        variants={{
                          hidden: { opacity: 0, x: 18 },
                          visible: { opacity: 1, x: 0 },
                        }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <Link className="iomi-notch-subpage" to={child.to} onClick={closeNav}>
                          <span>{child.label}</span>
                          <small>{child.note}</small>
                          <ChevronRight aria-hidden="true" />
                        </Link>
                      </motion.div>
                    ))}
                  </motion.nav>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );
}
