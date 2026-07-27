import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import NotchFace, { setNotchStatus } from "@/components/NotchFace";
import NotchReveal from "@/components/NotchReveal";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import "./home-os.css";

/* ============================================================================
   HomeOS — the redesigned homepage. "Meet Braino · a voice for your system."
   Dark-first cinematic editorial. The star sequences:
     · hero: launch video autoplaying with a sprite walker pacing its roof,
       and the REAL global <BrainoWalker/> perched on #pg2-hero-bar below.
     · the becoming: scroll-driven, textless. Screen goes black, two closed
       eyes appear, the notch outline glows around them, the eyes open, and
       the scene releases. From then on a persistent notch (the app's real
       component, see NotchFace) rides the top of the viewport and watches
       the cursor.
     · the MacBook bento: the notch runs runNotchBoot()'s beats VERBATIM
       (timings + classes + status strings from braino-mac.js), then a full
       voice session: listen -> captions (sideways stretch) -> speak -> down.
   ============================================================================ */

const VIDEO_SRC = "/Braino_Final.MP4";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ramp = (p: number, a: number, b: number) => clamp((p - a) / (b - a), 0, 1);

/* ── sprite walker (the extension's exact art) that paces a lane ── */
export function LaneWalker({ span = 84, period = 14, flowers = false }: { span?: number; period?: number; flowers?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = BRAINO_WALKER_SVG;
    const q = (id: string) => host.querySelector<SVGElement>(`#${id}`);
    const ll = q("__sbwk_ll__"), rl = q("__sbwk_rl__");
    const la = q("__sbwk_la__"), ra = q("__sbwk_ra__");
    const laB = q("__sbwk_la_bg__"), raB = q("__sbwk_ra_bg__");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      host.style.left = "44%";
      return;
    }
    let raf = 0, lastBloom = 0;
    const t0 = performance.now();
    const bloom = (now: number) => {
      if (!flowers || now - lastBloom < 620 || !host.parentElement) return;
      lastBloom = now;
      const f = document.createElement("span");
      f.className = "hos-flower";
      f.textContent = ["✿", "❀", "✾", "❁", "✽"][Math.floor(Math.random() * 5)];
      f.style.left = host.style.left || "50%";
      f.style.setProperty("--fdx", `${Math.random() * 44 - 22}px`);
      f.style.setProperty("--frot", `${Math.random() * 70 - 35}deg`);
      host.parentElement.appendChild(f);
      window.setTimeout(() => f.remove(), 2700);
    };
    const step = (now: number) => {
      const t = (now - t0) / 1000;
      const u = (t % period) / period;
      const fwd = u < 0.5;
      const k = fwd ? u * 2 : (1 - u) * 2;
      const ph = t * 7;
      const legL = Math.sin(ph) * 17, legR = Math.sin(ph + Math.PI) * 17;
      const armL = Math.sin(ph + Math.PI) * 13, armR = Math.sin(ph) * 13;
      ll?.setAttribute("transform", `rotate(${legL} 44 74)`);
      rl?.setAttribute("transform", `rotate(${legR} 56 74)`);
      la?.setAttribute("transform", `rotate(${armL} 22 53)`);
      laB?.setAttribute("transform", `rotate(${armL} 22 53)`);
      ra?.setAttribute("transform", `rotate(${armR} 78 53)`);
      raB?.setAttribute("transform", `rotate(${armR} 78 53)`);
      host.style.left = `${3 + k * span}%`;
      host.style.transform = `translateY(${-Math.abs(Math.sin(ph)) * 2.5}px) scaleX(${fwd ? 1 : -1})`;
      bloom(now);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [span, period]);
  return <div className="walker" ref={hostRef} />;
}

/* ── the MacBook lid notch: the app's real lifecycle, verbatim beats ── */
export const LID_SEQ: { cls: string; ms: number; status?: string; cap?: string; label: string }[] = [
  { cls: "",                    ms: 900,  label: "boot · his eyes pop up, open" },
  { cls: "dozing",              ms: 700,  label: "they close" },
  { cls: "dozing nf-auth",      ms: 1500, status: "authenticating", label: "the island extends and <b>pulses</b>" },
  { cls: "nf-auth-ok awake",    ms: 700,  label: "green verdict · eyes open <b>with the glow</b>" },
  { cls: "awake nf-wink",       ms: 850,  label: "…and he <b>winks</b>" },
  { cls: "nf-greet awake",      ms: 1100, label: "the greeting glow · no spoken line" },
  { cls: "dozing wake-armed",   ms: 2100, label: "dozing · wake word armed, on-device" },
  { cls: "awake mic-live",      ms: 650,  label: "double-tap <b>Control</b>" },
  { cls: "listen mic-live",     ms: 2300, label: "listening · the island opens up" },
  { cls: "captioning mic-live", ms: 3000, cap: "organize my desktop", label: "it stretches <b>sideways</b> for what he heard" },
  { cls: "speak mic-live",      ms: 3100, label: "he answers · one small talking mouth" },
  { cls: "dozing wake-armed",   ms: 2300, label: "response done · the island goes back down" },
];

export function LidNotchShow() {
  const notchRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const notch = notchRef.current, phase = phaseRef.current;
    if (!notch || !phase) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      notch.className = "nf-face on home nf-auth-ok awake";
      phase.innerHTML = "green verdict · eyes open with the glow";
      return;
    }
    let i = 0, timer = 0, typeTimer = 0;
    const beat = () => {
      const s = LID_SEQ[i % LID_SEQ.length];
      notch.className = `nf-face on home ${s.cls}`;
      setNotchStatus(notch, s.status || "");
      phase.innerHTML = s.label;
      const cap = notch.querySelector<HTMLElement>(".nf-cap-l");
      if (cap) cap.textContent = "";
      window.clearInterval(typeTimer);
      if (s.cap && cap) {
        let ci = 0;
        typeTimer = window.setInterval(() => {
          if (!notch.classList.contains("captioning")) { window.clearInterval(typeTimer); return; }
          cap.textContent = s.cap!.slice(0, ++ci);
          if (ci >= s.cap!.length) window.clearInterval(typeTimer);
        }, 60);
      }
      i++;
      timer = window.setTimeout(beat, s.ms);
    };
    beat();
    return () => { window.clearTimeout(timer); window.clearInterval(typeTimer); };
  }, []);
  return (
    <div className="hos-lidwrap">
      <div className="hos-lid">
        <div className="hos-screenlet">
          <NotchFace ref={notchRef} id="hosLidNotch" className="on home" />
        </div>
      </div>
      <div className="hos-lidbase" />
      <div className="hos-lidphase" ref={phaseRef} />
    </div>
  );
}


/* ── NotchNav: the navigation IS the notch. A black island fixed top-centre,
   his eyes (and talking mouth) in the middle, menu links in the wings. With
   narrator on, [data-narrate] sections dim the links and type into the left
   wing while the mouth runs — nav and narrator are ONE notch. ── */
/* Every page gets the same notch, and clicking his EYES opens it into the
   dynamic island — the same mechanic the Mac app uses. Rewritten here rather
   than per-page so all six pages that already import NotchNav inherit it. */
/* The live log — moved here from the founder letter, because this is where it
   deserves to be. A running resume of ideas, newest first. New entries go on
   top; nothing gets deleted, because the wrong turns are the point. */
const HOME_LOG: { when: string; title: string; body: string; now?: boolean }[] = [
  { when: "July 2026", now: true, title: "BrainOS · IOMI",
    body: "He stops being an app you open and becomes the layer you talk to, named the way an operating system names itself: the OS, then the release. IOMI is not an acronym I'm going to unpack. It means something to me, and it happens to look and sound exactly right." },
  { when: "July 2026", title: "Hands-free is the actual goal",
    body: "Not an assistant with a voice bolted on. An operating system you drive by speaking: say it, and watch it happen. Everything else on this list is in service of that one sentence." },
  { when: "July 2026", title: "Still arguing with myself about the line",
    body: "Speak, watch it happen. Just ask. Ask Braino. I have more than these and I haven't picked one, which I think is honest to admit in public." },
  { when: "July 2026", title: "A vertical for widgets",
    body: "If he's the layer, then things get to live on him. Widgets are the shape that takes: small, single-purpose, always present, and eventually not all written by me." },
  { when: "July 2026", title: "The standard I'm holding this to",
    body: "Apple's marketing, Apple's hype, Apple's quality, Apple's ecosystem. Not as a pose. Those are the products that made me love this stuff, and the only way I know to say thank you is to work at their level." },
  { when: "June 2026", title: "Braino Co-work",
    body: "He can already see the screen, so stop making him wait to be asked. Work the parallel track instead." },
  { when: "May 2026", title: "The Mac app",
    body: "He moves into the notch. Presence instead of software. This is the one that blew past what three months of extension work ever did." },
  { when: "Feb 2026", title: "The Chrome extension",
    body: "Three months, full polish, basically no users. It was the tuition, and I'd pay it again." },
  { when: "Late 2025", title: "SideBrain",
    body: "A sidebar that remembered things. Everything starts smaller than it ends." },
];

const NN_ISLAND = [
  { to: "/", label: "Home", note: "the assistant" },
  { to: "/brainos", label: "BrainOS", note: "IOMI" },
  { to: "/browser", label: "Browser", note: "the extension" },
  { to: "/jarvis", label: "Jarvis", note: "voice-first" },
  { to: "/dontblink", label: "Don't Blink", note: "the film" },
  { to: "/journal", label: "Journal", note: "built in public" },
  { to: "/founder-letter", label: "Letter", note: "why" },
];

/* Shown only until he has been woken — the dare that makes the reveal land. */
function NotchInvite() {
  const [asleep, setAsleep] = useState(() => {
    try { return localStorage.getItem("sbNotchAwake") !== "1"; } catch { return false; }
  });
  useEffect(() => {
    if (!asleep) return;
    const id = window.setInterval(() => {
      try { if (localStorage.getItem("sbNotchAwake") === "1") setAsleep(false); } catch { /* ignore */ }
    }, 600);
    return () => window.clearInterval(id);
  }, [asleep]);
  if (!asleep) return null;
  return (
    <section className="hos-clickeyes">
      <p>He&apos;s been blinking at you this whole time.</p>
      <span>Click the eyes.</span>
    </section>
  );
}

export function NotchNav({ narrator = false }: { narrator?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [islandOpen, setIslandOpen] = useState(false);
  /* First visit shows ONLY his eyes, following the cursor — no notch, no
     links, nothing. Clicking them asks your name, then plays the real boot
     sequence and the nav assembles itself. After that it is remembered. */
  const [awake, setAwake] = useState(() => {
    try { return localStorage.getItem("sbNotchAwake") === "1"; } catch { return true; }
  });
  const [naming, setNaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (!islandOpen) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIslandOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIslandOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [islandOpen]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pupils = el.querySelectorAll<SVGElement>(".np");
    const capEl = el.querySelector<HTMLElement>(".nn-cap");
    let narrating = false, currentKey = "", narrTimer = 0, typeTimer = 0;
    /* the nav boots like the notch it is: eyes closed, light sweeps the
       island, eyes open, wink — then a glitter heartbeat every 5 seconds */
    let traceSeq = 0;
    const trace = (dur = 900) => {
      if (reduced) return;
      const r = el.getBoundingClientRect();
      const w = r.width, h = r.height, rad = 20, inset = 1.2;
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("class", "nn-trace");
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const gid = `nnTraceGrad${++traceSeq}`;
      const defs = document.createElementNS(ns, "defs");
      const grad = document.createElementNS(ns, "linearGradient");
      grad.setAttribute("id", gid);
      grad.setAttribute("x1", "0"); grad.setAttribute("y1", "0");
      grad.setAttribute("x2", "1"); grad.setAttribute("y2", "1");
      [["0", "#FFFFFF"], [".45", "#CFE0FF"], [".8", "#7AA2FF"], ["1", "#F0A86B"]].forEach(([o, c]) => {
        const st = document.createElementNS(ns, "stop");
        st.setAttribute("offset", o); st.setAttribute("stop-color", c);
        grad.appendChild(st);
      });
      defs.appendChild(grad);
      svg.appendChild(defs);
      const d = `M ${inset} ${inset} H ${w - inset} V ${h - rad} Q ${w - inset} ${h - inset} ${w - rad} ${h - inset} H ${rad} Q ${inset} ${h - inset} ${inset} ${h - rad} Z`;
      const mk = (cls: string) => {
        const p = document.createElementNS(ns, "path");
        p.setAttribute("class", cls);
        p.setAttribute("d", d);
        p.setAttribute("stroke", `url(#${gid})`);
        p.setAttribute("fill", "none");
        svg.appendChild(p);
        return p;
      };
      const glow = mk("tglow"), core = mk("tcore");
      el.appendChild(svg);
      const len = core.getTotalLength();
      [glow, core].forEach((p) => {
        p.style.strokeDasharray = String(len);
        p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: dur, easing: "cubic-bezier(.3,.5,.3,1)", fill: "forwards" });
      });
      window.setTimeout(() => svg.classList.add("fade"), dur + 200);
      window.setTimeout(() => svg.remove(), dur + 800);
    };
    const sparks = (n: number) => {
      if (reduced) return;
      for (let k = 0; k < n; k++) {
        const sp = document.createElement("span");
        sp.className = "nn-spark";
        sp.style.left = `${8 + Math.random() * 84}%`;
        sp.style.top = `${4 + Math.random() * 24}px`;
        sp.style.animationDelay = `${Math.random() * 0.35}s`;
        el.appendChild(sp);
        window.setTimeout(() => sp.remove(), 1500);
      }
    };
    const bootTimers: number[] = [];
    /* asleep: the eyes track the cursor and nothing else exists yet */
    if (!awake) {
      el.classList.add("nn-preboot");
      const onMove = (ev: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = clamp((ev.clientX - cx) / 260, -1, 1);
        const dy = clamp((ev.clientY - cy) / 220, -1, 1);
        pupils.forEach((pp) => pp.style.transform = `translate(${dx * 3.4}px, ${dy * 2.6}px)`);
      };
      window.addEventListener("mousemove", onMove);
      return () => { window.removeEventListener("mousemove", onMove); el.classList.remove("nn-preboot"); };
    }
    el.classList.remove("nn-preboot");
    /* Boot ONCE per session. Every page renders its own <NotchNav/>, so a route
       change unmounts and remounts this — which replayed the whole wake
       sequence on every navigation and made the site feel like it was
       reloading. The flag lives in sessionStorage so it still boots fresh in a
       new tab, just not on every internal link. */
    let alreadyBooted = false;
    try { alreadyBooted = sessionStorage.getItem("sbNotchBooted") === "1"; } catch { /* private mode */ }
    if (alreadyBooted) el.classList.add("booted-instant");
    if (!reduced && !alreadyBooted) {
      try { sessionStorage.setItem("sbNotchBooted", "1"); } catch { /* private mode */ }
      /* the WHOLE page waits: nav boots first, wink lands, wings spread,
         and only then does the rest of the site fade in */
      document.body.classList.add("nn-booting");
      el.classList.add("booting", "asleep");
      bootTimers.push(window.setTimeout(() => { el.classList.add("glint"); trace(950); }, 400));
      /* the Braino overlay: coral floods left to right, then the eyes open */
      bootTimers.push(window.setTimeout(() => el.classList.add("coralwave"), 1300));
      bootTimers.push(window.setTimeout(() => el.classList.remove("coralwave"), 2200));
      bootTimers.push(window.setTimeout(() => { el.classList.remove("glint", "asleep"); }, 1500));
      bootTimers.push(window.setTimeout(() => {
        el.classList.add("wink");
        sparks(3);
        window.setTimeout(() => el.classList.remove("wink"), 700);
      }, 1650));
      /* only after the wink do the wings spread and the menu arrives */
      bootTimers.push(window.setTimeout(() => el.classList.remove("booting"), 2450));
      /* and only after the wings does the page itself appear */
      bootTimers.push(window.setTimeout(() => document.body.classList.remove("nn-booting"), 2700));
    }
    const glitterTimer = window.setInterval(() => {
      if (reduced || narrating || el.classList.contains("glint")) return;
      el.classList.add("glint");
      sparks(3);
      window.setTimeout(() => el.classList.remove("glint"), 1100);
    }, 5000);
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dx = Math.max(-3.2, Math.min(3.2, (e.clientX - (r.left + r.width / 2)) / innerWidth * 14));
      const dy = Math.max(-1.2, Math.min(3, (e.clientY - r.bottom) / innerHeight * 10));
      pupils.forEach((p) => { p.style.transform = `translate(${dx}px,${dy}px)`; });
    };
    addEventListener("mousemove", onMove, { passive: true });
    let blinkTimer = 0;
    if (!reduced) {
      blinkTimer = window.setInterval(() => {
        if (narrating || Math.random() < 0.4) return;
        el.classList.add("bl");
        window.setTimeout(() => el.classList.remove("bl"), 260);
      }, 4400);
    }
    let io: IntersectionObserver | null = null;
    if (narrator) {
      const setIdle = () => { narrating = false; el.classList.remove("talking"); if (capEl) capEl.textContent = ""; };
      const narrate = (key: string, line: string) => {
        if (key === currentKey) return;
        currentKey = key;
        narrating = true;
        window.clearTimeout(narrTimer);
        window.clearInterval(typeTimer);
        el.classList.add("talking");
        if (capEl) {
          capEl.textContent = "";
          let ci = 0;
          typeTimer = window.setInterval(() => {
            if (!el.classList.contains("talking")) { window.clearInterval(typeTimer); return; }
            capEl.textContent = line.slice(0, ++ci);
            if (ci >= line.length) window.clearInterval(typeTimer);
          }, 55);
        }
        narrTimer = window.setTimeout(setIdle, line.length * 55 + 2400);
        try { const a = new Audio(`/narration/${key}.mp3`); a.volume = 0.8; a.play().catch(() => {}); } catch { /* no file */ }
      };
      io = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          if (!document.body.classList.contains("hos-notched")) return;
          const t = e.target as HTMLElement;
          narrate(t.id || t.dataset.narrate!, t.dataset.narrate!);
        });
      }, { rootMargin: "-38% 0px -38% 0px" });
      document.querySelectorAll<HTMLElement>("[data-narrate]").forEach((sec) => io!.observe(sec));
    }
    return () => {
      removeEventListener("mousemove", onMove);
      window.clearInterval(blinkTimer);
      window.clearTimeout(narrTimer);
      window.clearInterval(typeTimer);
      window.clearInterval(glitterTimer);
      bootTimers.forEach((t) => window.clearTimeout(t));
      document.body.classList.remove("nn-booting");
      io?.disconnect();
    };
  }, [narrator, awake]);
  return (
    <nav className={`notchnav${islandOpen ? " nn-open" : ""}`} ref={ref} aria-label="Primary">
      <div className="nn-row">
      <div className="nn-links l">
        <Link to="/">Home</Link>
        <Link to="/browser">Browser</Link>
        <Link to="/jarvis">Jarvis</Link>
      </div>
      {/* his REAL eyes — verbatim nf-mini geometry from the app's notch.
          They are also the button: click the eyes, the island opens. */}
      <svg
        className="nn-face"
        viewBox="32 6 56 46"
        role="button"
        tabIndex={0}
        aria-expanded={islandOpen}
        aria-label={islandOpen ? "Close menu" : "Open menu"}
        onClick={() => (awake ? setIslandOpen((v) => !v) : setNaming(true))}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); awake ? setIslandOpen((v) => !v) : setNaming(true); } }}
      >
        <g className="ne nn-eye"><circle cx="49" cy="22" r="12" fill="#fff" /><circle className="np" cx="49" cy="22" r="6.2" fill="#1B1713" /><circle cx="51.3" cy="19.3" r="2" fill="#fff" /></g>
        <g className="ne nn-eye nn-eye-r"><circle cx="71" cy="22" r="12" fill="#fff" /><circle className="np" cx="71" cy="22" r="6.2" fill="#1B1713" /><circle cx="73.3" cy="19.3" r="2" fill="#fff" /></g>
        <path className="nn-lid" d="M 36 22 Q 49 28 62 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
        <path className="nn-lid" d="M 58 22 Q 71 28 84 22" fill="none" stroke="#F4E4DC" strokeWidth="2.6" strokeLinecap="round" />
        <ellipse className="nn-mouth" cx="60" cy="42" rx="4.6" ry="3.2" fill="#E8786E" />
      </svg>
      <div className="nn-links r">
        <Link to="/founder-letter">Letter</Link>
        <a href={EXTENSION_DOWNLOAD_URL} download>Install</a>
      </div>
      <span className="nn-cap" aria-live="polite" />
      </div>
      {naming && !awake ? (
        <form
          className="nn-name"
          onSubmit={(e) => {
            e.preventDefault();
            const n = nameDraft.trim();
            try {
              if (n) localStorage.setItem("sbUserName", n);
              localStorage.setItem("sbNotchAwake", "1");
            } catch { /* private mode: he just wakes anyway */ }
            setNaming(false);
            setAwake(true);   // re-runs the effect, which plays the real boot
          }}
        >
          <label htmlFor="nn-name-input">Before he opens his eyes — what should he call you?</label>
          <div className="nn-name-row">
            <input
              id="nn-name-input"
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="your name"
              maxLength={40}
            />
            <button type="submit">Wake him</button>
          </div>
        </form>
      ) : null}
      <div className="nn-island">
        <div className="nn-island-label">Go anywhere</div>
        <div className="nn-island-grid">
          {NN_ISLAND.map((n) => (
            <Link key={n.to} to={n.to} className="nn-island-link" onClick={() => setIslandOpen(false)}>
              {n.label}<span>{n.note}</span>
            </Link>
          ))}
        </div>
        {/* Dashboard is not a page like the others — it is YOUR side of the
            product, so it gets its own row rather than a slot in the grid. */}
        <Link to="/dashboard" className="nn-island-dash" onClick={() => setIslandOpen(false)}>
          <span className="nn-dash-l">Dashboard</span>
          <span className="nn-dash-n">your controls, memory and voice commands</span>
        </Link>
      </div>
    </nav>
  );
}

/* ── a small looping notch for the fork card: dozes, wakes, listens ── */
function NotchLoop() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.className = "nf-face on home listen mic-live"; return; }
    const SEQ = [
      { cls: "dozing wake-armed", ms: 2400 },
      { cls: "awake mic-live", ms: 800 },
      { cls: "listen mic-live", ms: 2800 },
      { cls: "awake mic-live", ms: 700 },
    ];
    let i = 0, timer = 0;
    const beat = () => {
      el.className = `nf-face on home ${SEQ[i % SEQ.length].cls}`;
      timer = window.setTimeout(beat, SEQ[i % SEQ.length].ms);
      i++;
    };
    beat();
    return () => window.clearTimeout(timer);
  }, []);
  return <NotchFace ref={ref} className="on home dozing wake-armed" />;
}

type BrainoSpritePose = "present" | "memory" | "speak" | "browser";

function BrainoSprite({ pose }: { pose: BrainoSpritePose }) {
  const hostRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    host.innerHTML = BRAINO_WALKER_SVG;
  }, []);

  return <div className={`braino-sprite is-${pose}`} ref={hostRef} aria-hidden="true" />;
}

function MascotMoment({ kind }: { kind: "present" | "memory" | "speak" }) {
  return (
    <div className={`identity-mascot is-${kind}`} aria-hidden="true">
      {kind === "present" && (
        <>
          <div className="im-page">
            <span style={{ width: "82%" }} />
            <span style={{ width: "68%" }} />
            <span style={{ width: "48%" }} />
          </div>
          <div className="im-cursor" />
          <BrainoSprite pose="present" />
        </>
      )}

      {kind === "memory" && (
        <>
          <span className="im-ring r1" />
          <span className="im-ring r2" />
          <span className="im-ring r3" />
          <span className="im-memory-dot d1" />
          <span className="im-memory-dot d2" />
          <span className="im-memory-dot d3" />
          <BrainoSprite pose="memory" />
        </>
      )}

      {kind === "speak" && (
        <>
          <div className="im-speech-bars">
            {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
          </div>
          <BrainoSprite pose="speak" />
        </>
      )}
    </div>
  );
}

function BrowserBrainoGraphic() {
  return (
    <div className="qa-graphic qa-browser-graphic" aria-hidden="true">
      <div className="qb-window">
        <div className="qb-top"><span /><span /><span /></div>
        <div className="qb-page">
          <span style={{ width: "74%" }} />
          <span style={{ width: "92%" }} />
          <span style={{ width: "56%" }} />
          <span style={{ width: "81%" }} />
        </div>
        <div className="qb-dock">
          <span />
          <i />
        </div>
      </div>
      <BrainoSprite pose="browser" />
    </div>
  );
}

function MacNotchGraphic() {
  return (
    <div className="qa-graphic qa-mac-graphic" aria-hidden="true">
      <div className="qm-lid">
        <div className="qm-screen">
          <NotchFace className="on home listen mic-live" />
          <div className="qm-files">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
      <div className="qm-base" />
    </div>
  );
}

function Q3DanceBraino() {
  const t = useTime();
  const moveDuration = 2.8;
  const index = Math.floor(t / moveDuration) % 6;
  const local = t % moveDuration;
  const b = local * 3.4;
  const phase = Math.sin(b);
  const groove = Math.abs(Math.sin(b));
  const softStep = (v: number) => v * v * (3 - 2 * v);

  let pose = {
    tx: phase * 8,
    ty: 0,
    rot: 0,
    sx: 1,
    sy: 1 - groove * 0.045,
    leftArm: 42 + phase * 26,
    rightArm: -42 + phase * 26,
    expr: "happy",
    lookX: phase * 0.4,
    lookY: 0,
    hands: "glove",
    moonwalk: false,
    accessory: "none",
  };

  if (index === 1) {
    const stab = Math.tanh(Math.sin(local * 2.6) * 2.3);
    pose = {
      ...pose,
      tx: stab * 7,
      sy: 1 - Math.abs(Math.sin(local * 5.2)) * 0.04,
      leftArm: -10,
      rightArm: -82 - stab * 56,
      expr: "mischief",
      lookX: 0.45,
      lookY: -0.42,
    };
  } else if (index === 2) {
    const raw = (local % 2) / 2;
    const sweep = raw < 0.78 ? softStep(raw / 0.78) : 1 - (raw - 0.78) / 0.22;
    pose = {
      ...pose,
      tx: (sweep - 0.5) * 6,
      sy: 1 - Math.abs(Math.sin(raw * Math.PI)) * 0.035,
      leftArm: 102,
      rightArm: -128 + sweep * 100,
      expr: "grin",
      lookX: -0.35 + sweep * 0.7,
    };
  } else if (index === 3) {
    const push = Math.abs(Math.sin(local * 3.9));
    const lean = Math.sin(local * 1.95);
    pose = {
      ...pose,
      tx: lean * 5,
      ty: -push * 14,
      sy: 1,
      leftArm: 116 + push * 20,
      rightArm: -116 - push * 20,
      expr: "grin",
      lookX: lean * 0.28,
      lookY: -0.45,
    };
  } else if (index === 4) {
    const point = Math.tanh(Math.sin(local * 3) * 2.6);
    pose = {
      ...pose,
      tx: point * 5,
      sy: 1 - Math.abs(Math.sin(local * 3)) * 0.05,
      leftArm: 130 - point * 25,
      rightArm: -130 - point * 25,
      expr: "mischief",
      lookX: -0.4,
      lookY: -0.45,
      hands: "point",
    };
  } else if (index === 5) {
    pose = {
      ...pose,
      tx: 0,
      sy: 1 - 0.045 * Math.abs(Math.sin(local * 4.2)),
      leftArm: 8,
      rightArm: -16,
      expr: "mischief",
      lookX: 0.45,
      lookY: 0.05,
      moonwalk: true,
      accessory: "fedora",
    };
  }

  const lift = clamp(-pose.ty / 16, 0, 1);
  const shadowScale = 1 - lift * 0.2 + Math.abs(pose.tx) / 90;

  return (
    <div className="q3-dance" aria-hidden="true">
      <div className="q3-dance-glow" />
      <div className="q3-dance-floor" />
      <div className="q3-dance-shadow" style={{ transform: `translateX(-50%) scaleX(${shadowScale})` }} />
      <div
        className="q3-dancer"
        style={{
          transform: `translate(calc(-50% + ${pose.tx}px), ${pose.ty}px) rotate(${pose.rot}deg) scaleX(${pose.sx}) scaleY(${pose.sy})`,
        }}
      >
        <Braino
          size={250}
          legs
          gloves
          hands={pose.hands}
          leftArm={pose.leftArm}
          rightArm={pose.rightArm}
          expr={pose.expr}
          lookX={pose.lookX}
          lookY={pose.lookY}
          moonwalk={pose.moonwalk}
          accessory={pose.accessory}
          idle
        />
      </div>
    </div>
  );
}

/* ── RevealGate: the boot reveal; once you scroll past it, the notch never
   leaves (body.hos-notched arms the narrator). ── */
export function RevealGate() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const check = () => {
      ticking = false;
      const r = el.getBoundingClientRect();
      document.body.classList.toggle("hos-notched", r.bottom < 120);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } };
    addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => { removeEventListener("scroll", onScroll); document.body.classList.remove("hos-notched"); };
  }, []);
  return <div ref={ref}><NotchReveal /></div>;
}

/* ── the narrator notch: fixed at the top after the reveal. His pupils follow
   the cursor; and as each [data-narrate] section crosses the middle of the
   viewport, the island spreads caption-wide, the talking mouth runs, and the
   wing types that section's line — the interactive tour, living in the notch.
   If a voice file exists at /narration/<id>.mp3 it plays too. ── */
export function LiveNotch() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pupils = el.querySelectorAll<SVGElement>(".nf-pupil-l, .nf-pupil-r");
    const cap = () => el.querySelector<HTMLElement>(".nf-cap-l");
    let narrating = false, currentKey = "", narrTimer = 0, typeTimer = 0;
    let dozing = false, dozeTimer = 0;
    const setIdle = () => {
      narrating = false;
      el.className = "nf-face on home awake mic-live";
      const c = cap();
      if (c) c.textContent = "";
    };
    const doze = (on: boolean) => {
      if (narrating) return;
      dozing = on;
      el.classList.toggle("dozing", on);
      el.classList.toggle("awake", !on);
      el.classList.toggle("wake-armed", on);
      el.classList.toggle("mic-live", !on);
    };
    const narrate = (key: string, line: string) => {
      if (key === currentKey) return;
      currentKey = key;
      narrating = true;
      dozing = false;
      window.clearTimeout(narrTimer);
      window.clearInterval(typeTimer);
      el.className = "nf-face on home awake captioning speak mic-live";
      const c = cap();
      if (c) {
        c.textContent = "";
        let ci = 0;
        typeTimer = window.setInterval(() => {
          if (!el.classList.contains("captioning")) { window.clearInterval(typeTimer); return; }
          c.textContent = line.slice(0, ++ci);
          if (ci >= line.length) window.clearInterval(typeTimer);
        }, 55);
      }
      narrTimer = window.setTimeout(setIdle, line.length * 55 + 2400);
      /* his voice, if a recording exists (drop files in public/narration/) */
      try { const a = new Audio(`/narration/${key}.mp3`); a.volume = 0.8; a.play().catch(() => {}); } catch { /* no file, no problem */ }
    };
    const secs = Array.from(document.querySelectorAll<HTMLElement>("[data-narrate]"));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        if (!document.body.classList.contains("hos-notched")) return;
        const t = e.target as HTMLElement;
        narrate(t.id || t.dataset.narrate!, t.dataset.narrate!);
      });
    }, { rootMargin: "-38% 0px -38% 0px" });
    secs.forEach((sec) => io.observe(sec));
    const onMove = (e: MouseEvent) => {
      if (dozing) doze(false);
      window.clearTimeout(dozeTimer);
      dozeTimer = window.setTimeout(() => doze(true), 9000);
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      const dx = Math.max(-3.4, Math.min(3.4, (e.clientX - (r.left + r.width / 2)) / innerWidth * 14));
      const dy = Math.max(-1.2, Math.min(3.2, (e.clientY - r.bottom) / innerHeight * 10));
      pupils.forEach((pp) => { pp.style.transform = `translate(${dx}px,${dy}px)`; });
    };
    addEventListener("mousemove", onMove, { passive: true });
    let blinkTimer = 0;
    if (!reduced) {
      blinkTimer = window.setInterval(() => {
        if (dozing || narrating || Math.random() < 0.4) return;
        el.classList.add("blink");
        window.setTimeout(() => el.classList.remove("blink"), 260);
      }, 4200);
    }
    return () => {
      io.disconnect();
      removeEventListener("mousemove", onMove);
      window.clearTimeout(dozeTimer);
      window.clearTimeout(narrTimer);
      window.clearInterval(typeTimer);
      window.clearInterval(blinkTimer);
      document.body.classList.remove("hos-notched");
    };
  }, []);
  return <NotchFace ref={ref} id="hosLiveNotch" className="on home awake mic-live" />;
}

export default function HomeOS() {
    /* reveal on scroll */
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    document.querySelectorAll(".hos .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="hos">
      <BrainoDefs />
      {/* gradient defs so the walker sprite + global walker render coral */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      <NotchNav />

      {/* ── hero ── */}
      <header className="hos-hero" id="top">
        <div className="wrap">
          <h1 className="mega" aria-label="Meet Braino.">
            {"Meet Braino".split("").map((ch, i) => (
              <span key={i} className="bl" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>{ch === " " ? "\u00A0" : ch}</span>
            ))}
            <span className="bl dot" style={{ animationDelay: `${0.1 + 11 * 0.05}s` }}>.</span>
          </h1>
          <p className="sub">A personal assistant for your computer, your browser, and everything in between. He sleeps in your notch, wakes when you call, and gets it done out loud.</p>
          <div className="ctas">
            <a className="btn" href={EXTENSION_DOWNLOAD_URL} download><Download size={16} /> Get Braino</a>
            <Link className="btn ghost" to="/founder-letter">Read the founder letter →</Link>
          </div>
          <div className="tiny">Free to start · Chrome · Arc · Brave · Edge · and now macOS</div>
        </div>

        {/* the real global BrainoWalker perches and walks on this bar */}
        <div className="hos-dock">
          <div className="hos-dockbar" id="pg2-hero-bar">
            <span className="ph">Ask Braino anything…</span>
            <span className="mode">⚡ Auto</span>
            <span className="send">↑</span>
          </div>
        </div>

      </header>

      <NotchInvite />

      {/* the homepage is now three things: where to go next, the real FAQ, and
          the live log — the running record of what he is becoming */}
      <section className="hos-faqx">
        <div className="sp-wrap">
          <div className="qa reveal">
            <div className="eyebrow">q1</div>
            <h2 className="qa-q">Where can I read more<span className="fork-dot">?</span></h2>
            <div className="qa-doors">
              <Link to="/founder-letter" className="ll-card">
                <div className="eyebrow">the whole story</div>
                <div className="ll-title">The founder letter<span className="fork-dot">.</span></div>
                <p>Why he exists, who he's for, and why his father can't sleep. With the notch running live inside the article.</p>
                <span className="fork-btn">Read it</span>
              </Link>
              <Link to="/journal" className="ll-card">
                <div className="eyebrow">the documentation</div>
                <div className="ll-title">The Braino Journal<span className="fork-dot">.</span></div>
                <p>How he's built, one article at a time: the emotional engine, the notch, whatever ships next.</p>
                <span className="fork-btn">Open it</span>
              </Link>
            </div>
          </div>

          <div className="qa reveal">
            <div className="eyebrow">q2 · fair things to ask</div>
            <h2 className="qa-q">The actual FAQ<span className="fork-dot">.</span></h2>
            <div className="qa-faq-split">
              <div className="qa-faq-segment">
                <div className="qa-faq-head">
                  <h3>Browser</h3>
                  <span>2025</span>
                </div>
                <div className="hos-faq">
                  <details>
                    <summary>What does Browser Braino do?</summary>
                    <p>He lives on every tab, reads the page you're on, explains it, records lectures and YouTube, sends notes to Notion, sits in meetings, and delegates browser clicks.</p>
                  </details>
                  <details>
                    <summary>Which browsers does he run on?</summary>
                    <p>Chrome, Arc, Brave and Edge. One account, one Braino, with your notes and memories following him across the browser.</p>
                  </details>
                  <details>
                    <summary>Does Delegate actually click for me?</summary>
                    <p>Yes. You describe the outcome, and he drives the live page: clicking, typing and navigating at about a second a step.</p>
                  </details>
                </div>
              </div>

              <div className="qa-faq-segment">
                <div className="qa-faq-head">
                  <h3>Mac</h3>
                  <span>2026 · end goal</span>
                </div>
                <div className="hos-faq">
                  <details>
                    <summary>What does Jarvis do on Mac?</summary>
                    <p>He lives in the notch and runs the whole machine by voice: opening apps, finding files, drafting mail, controlling music, and helping while you work.</p>
                  </details>
                  <details>
                    <summary>Can he delete files?</summary>
                    <p>Only with a hard safety check. Finding and organizing can be voice-first, but destructive actions like deleting files require Touch ID.</p>
                  </details>
                  <details>
                    <summary>Does he watch my screen all the time?</summary>
                    <p>Co-work mode is intentional and visible. When it's on, he can understand what's happening and offer help; when it's off, he stays out of the way.</p>
                  </details>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── the live log: a resume of ideas, not a changelog ── */}
      <section className="hos-faqx hos-loglane">
        <div className="sp-wrap">
          <div className="qa reveal">
            <div className="eyebrow">q3 · the live log</div>
            <h2 className="qa-q">Where is this going<span className="fork-dot">?</span></h2>
            <p className="qa-a">
              Not finished, and not supposed to be. This is the running record of what Braino is
              becoming, written as it happens rather than cleaned up afterwards. It keeps updating.
              Newest first.
            </p>
            <ol className="hl-log">
              {HOME_LOG.map((e) => (
                <li className={`hl-item${e.now ? " now" : ""}`} key={e.title}>
                  <div className="hl-when">{e.when}{e.now ? <b>now</b> : null}</div>
                  <h3 className="hl-title">{e.title}</h3>
                  <p className="hl-body">{e.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
