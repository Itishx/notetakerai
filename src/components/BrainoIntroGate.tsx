/**
 * BrainoIntroGate — the full mascot-led onboarding for `/` (PreLaunch). One persistent overlay:
 * Braino climbs the bottom liquid-glass bar and the user types "yes" to walk through each part.
 *
 *   greeting → features → askUsecases → usecases → askSignup → signup → authing → welcome
 *
 * ASK phases show the bar's "Type yes…" input + a spoken prompt; CONTENT phases (features/usecases)
 * open the draggable glass card and the bar's arrow becomes Next. After the use cases, Braino asks
 * to sign up; on "yes" he glows and "tap me" → Google OAuth. On return he shuts his eyes (auth),
 * then welcomes the user by name. Part 4 (set-up) is parked.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";
import { GradientBackground } from "@/components/ui/paper-design-shader-background";
import {
  CARD_DATA, CARD_LINES, VCard, SCENARIOS, SCENARIO_LINES, ScenarioCard,
  PERSONALITY, PERSONALITY_LINES, PersonalityCard, TOUR_SCENE_CSS,
} from "./brainoTourScenes";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Phase = "greeting" | "features" | "askUsecases" | "usecases" | "askPersonality" | "personality" | "askSignup" | "signup" | "authing" | "welcome";
type ContentKind = "features" | "usecases" | "personality";
type TourVariant = "onboarding" | "homepage";
const SET = { features: CARD_DATA, usecases: SCENARIOS, personality: PERSONALITY };
const LINES = { features: CARD_LINES, usecases: SCENARIO_LINES, personality: PERSONALITY_LINES };

const GREETING = "Hello. I'm Braino. Are you ready to see all that I can do?";
const HOMEPAGE_GREETING = "I just got a quick idea. Let me walk you through it.";
const HOMEPAGE_BRIDGE_LINES: Record<"askUsecases" | "askPersonality", string> = {
  askUsecases: "That was the core toolkit. Now let me show you where this actually helps.",
  askPersonality: "And one more thing, because this is the part that makes me feel less like a normal app.",
};
const HOMEPAGE_DONE_LINE = "That is the quick tour. The rest of the website is right here.";
const ASK_LINES: Record<string, string> = {
  askUsecases: "That was it for what I can do! Want to see how people actually use me?",
  askPersonality: "Would you like to see what makes me unique?",
  askSignup: "If I caught your attention — want to get started and add me to your browser?",
};
const SIGNUP_LINE = "Tap me to sign up with Google →";

const GATE_WALKER_SVG = BRAINO_WALKER_SVG
  .replaceAll("sbwk-fill", "sbig-fill").replaceAll("sbwk-dark", "sbig-dark").replaceAll("sbwk-glow", "sbig-glow");

const GLASS_FILTER_SVG = `<defs><filter id="__sb_glass_filter__" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/><feComponentTransfer in="turbulence" result="mapped"><feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/><feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/><feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/></feComponentTransfer><feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/><feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lightingColor="white" result="specLight"><fePointLight x="-200" y="-200" z="300"/></feSpecularLighting><feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/><feDisplacementMap in="SourceGraphic" in2="softMap" scale="200" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`;

const GATE_CSS = `
.bg-overlay {
  position: fixed; inset: 0; z-index: 2147483600; background: #0E0D0C;
  overflow: hidden; isolation: isolate; transition: opacity 0.6s ease, transform 0.6s ease;
  will-change: opacity, transform; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.bg-overlay.bg-exit { opacity: 0; transform: scale(1.04); }

.bg-lane { position: absolute; inset: 0; z-index: 4; pointer-events: none; }
.bg-walker { position: absolute; left: 0; top: 0; width: 64px; will-change: transform; }
.bg-walker #__sbwk_flip__ { transform-origin: center; display: block; }
.bg-walker.bg-glow { animation: bg-glow 0.85s ease-in-out 1; }
@keyframes bg-glow { 0%,100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.4)); }
  45% { filter: drop-shadow(0 0 26px rgba(255,210,120,1)) drop-shadow(0 0 50px rgba(255,170,70,0.6)); } }
.bg-walker.bg-pulse { pointer-events: auto; cursor: pointer; animation: bg-pulse 1.3s ease-in-out infinite; }
@keyframes bg-pulse { 0%,100% { filter: drop-shadow(0 2px 12px rgba(232,120,110,0.5)); }
  50% { filter: drop-shadow(0 0 26px rgba(232,120,110,1)) drop-shadow(0 0 48px rgba(248,169,91,0.6)); } }
.bg-walker.bg-auth { animation: bg-auth 0.9s ease-in-out infinite; }
@keyframes bg-auth { 0%,100% { filter: drop-shadow(0 2px 10px rgba(200,84,74,0.3)); }
  50% { filter: drop-shadow(0 0 30px rgba(255,210,50,1)) drop-shadow(0 0 55px rgba(255,175,0,0.65)); } }

/* speech bubble — content.js #__sbwk_say__, widened so text spreads horizontally */
.bg-overlay #__sbwk_say__ {
  position: absolute; left: 50%; bottom: calc(100% - 4px);
  transform: translateX(-50%) translateY(4px) scale(0.9);
  background: rgba(27,23,19,0.92); color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px; font-weight: 600; line-height: 1.2; padding: 5px 10px; border-radius: 12px;
  white-space: normal; max-width: 400px; min-width: 200px; text-align: center;
  pointer-events: none; opacity: 0; z-index: 6;
  transition: opacity .18s ease, transform .18s ease; box-shadow: 0 4px 14px rgba(27,23,19,0.28);
}
.bg-overlay #__sbwk_say__.show { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
.bg-overlay #__sbwk_say__::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%);
  border: 5px solid transparent; border-top-color: rgba(27,23,19,0.92); }

/* liquid-glass bar at the bottom — Braino's perch */
.bg-overlay #__sb_bar__ {
  position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) scale(0.94);
  display: flex; align-items: center; gap: 8px; background: rgba(255,251,247,0.12); border-radius: 100px;
  isolation: isolate; overflow: visible; padding: 10px 10px 10px 28px; border: 1px solid rgba(255,255,255,0.5);
  box-shadow: 0 8px 32px rgba(27,23,19,0.18), 0 2px 8px rgba(27,23,19,0.08),
              inset 2px 2px 1px rgba(255,255,255,0.65), inset -1px -1px 1px rgba(255,255,255,0.3);
  width: min(680px, calc(100vw - 48px));
  backdrop-filter: blur(6px) saturate(180%); -webkit-backdrop-filter: blur(6px) saturate(180%);
  pointer-events: none; opacity: 0; z-index: 2;
  transition: opacity 0.42s cubic-bezier(0.34,1.1,0.64,1), transform 0.42s cubic-bezier(0.34,1.1,0.64,1);
}
.bg-overlay #__sb_bar__::before { content: ""; position: absolute; inset: 0; border-radius: inherit;
  backdrop-filter: blur(16px) saturate(200%); -webkit-backdrop-filter: blur(16px) saturate(200%);
  filter: url(#__sb_glass_filter__); z-index: -1; pointer-events: none; }
.bg-overlay #__sb_bar__.open { opacity: 1; pointer-events: all; transform: translateX(-50%) scale(1); }
.bg-overlay #__sb_bar__.sb-climb #__sb_input__,
.bg-overlay #__sb_bar__.sb-climb .sb-bar-icon-btn { opacity: 0; pointer-events: none; }
.bg-overlay #__sb_bar__.bg-tour #__sb_input__ { display: none; }
.bg-overlay #__sb_input__ {
  flex: 1; border: none; outline: none; background: transparent; font-size: 16px; color: #1B1713;
  min-width: 0; padding: 0; line-height: 1.4;
  text-shadow: 0 0 4px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.7), 0 1px 1px rgba(255,255,255,0.8);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; transition: opacity 0.3s ease;
}
.bg-overlay #__sb_input__::placeholder { color: #4A3D34; }
.bg-overlay.bg-home-tour #__sb_input__ { display: none; }
.bg-tour-skip {
  position: fixed; top: 20px; right: 20px; z-index: 7;
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 38px; padding: 8px 14px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.24); background: rgba(16,12,11,0.46);
  color: rgba(255,255,255,0.88); backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 12px; font-weight: 650; cursor: pointer;
  box-shadow: 0 10px 30px rgba(0,0,0,0.26);
}
.bg-tour-skip:hover { background: rgba(16,12,11,0.66); color: #fff; }
.bg-overlay .sb-bar-icon-btn {
  width: 42px; height: 42px; border-radius: 50%; border: none; background: #E8786E; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  transition: background 0.15s, opacity 0.3s ease; padding: 0; margin-left: auto;
}
.bg-overlay .sb-bar-icon-btn:hover { background: #C9544A; }

/* feature/use-case card (liquid glass) — draggable + resizable */
.bg-card {
  position: fixed; top: 8vh; left: 50%; z-index: 3;
  width: min(940px, calc(100vw - 40px)); height: 67vh;
  min-width: 360px; min-height: 280px; max-width: calc(100vw - 24px); max-height: 84vh;
  display: flex; flex-direction: column; overflow: hidden; resize: both;
  border-radius: 26px; border: 1px solid rgba(255,255,255,0.20); background: rgba(16,12,11,0.34);
  box-shadow: 0 40px 100px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3),
              inset 2px 2px 1px rgba(255,255,255,0.22), inset -1px -1px 1px rgba(255,255,255,0.12);
  backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);
  isolation: isolate; color: #F5F1EA; pointer-events: none;
  opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.96);
  transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1);
}
.bg-card::before { content: ""; position: absolute; inset: 0; border-radius: inherit;
  backdrop-filter: blur(22px) saturate(200%); -webkit-backdrop-filter: blur(22px) saturate(200%);
  filter: url(#__sb_glass_filter__); z-index: -1; pointer-events: none; }
.bg-card.show { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0) scale(1); }
.bg-card-grab { flex: none; height: 24px; display: flex; align-items: center; justify-content: center;
  cursor: grab; user-select: none; color: rgba(245,241,234,0.30); font-size: 13px; }
.bg-card-grab:active { cursor: grabbing; }
.bg-card-scroll { flex: 1; min-height: 0; overflow: auto; padding: 2px clamp(24px,2.6vw,46px) clamp(20px,2vw,36px); }
.bg-card-scroll::-webkit-scrollbar { width: 5px; }
.bg-card-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 99px; }
.bg-pop { animation: bg-pop .5s cubic-bezier(.22,1.3,.4,1) both; }
@keyframes bg-pop { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }

@media (prefers-reduced-motion: reduce) {
  .bg-overlay, .bg-overlay #__sb_bar__, .bg-overlay #__sbwk_say__, .bg-card { transition-duration: 0.2s; }
  .bg-walker.bg-glow, .bg-walker.bg-pulse, .bg-walker.bg-auth { animation: none; }
}
`;

export default function BrainoIntroGate({
  onFinish,
  variant = "onboarding",
}: {
  onFinish?: () => void;
  variant?: TourVariant;
}) {
  const isHomeTour = variant === "homepage";
  const walkerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const talkingRef = useRef(false);
  const talkTimerRef = useRef<number | undefined>(undefined);
  const eyesClosedRef = useRef(false);
  const autoTourStartedRef = useRef(false);
  const homeTourFinishedRef = useRef(false);

  const resumingRef = useRef<boolean>(!isHomeTour && (() => { try { return localStorage.getItem("sb_onb") === "signup"; } catch { return false; } })());
  const { user, profile, loading } = useAuth();

  const [phase, setPhase] = useState<Phase>(resumingRef.current ? "authing" : "greeting");
  const [view, setView] = useState<{ kind: ContentKind; step: number }>({ kind: "features", step: 0 });
  const [perchedReady, setPerchedReady] = useState(false);

  const speak = (ms: number) => {
    talkingRef.current = true;
    window.clearTimeout(talkTimerRef.current);
    talkTimerRef.current = window.setTimeout(() => { talkingRef.current = false; }, ms);
  };
  const sayLine = (text: string, ms = 2900) => {
    const say = sayRef.current; if (!say) return;
    say.classList.remove("show"); say.textContent = text;
    window.setTimeout(() => { sayRef.current?.classList.add("show"); speak(ms); }, 170);
  };
  const showBarInput = (placeholder: string) => {
    const bar = barRef.current, input = inputRef.current; if (!bar) return;
    bar.classList.remove("bg-tour", "sb-climb");
    if (isHomeTour) {
      bar.classList.add("bg-tour");
      return;
    }
    if (input) { input.placeholder = placeholder; input.value = ""; window.setTimeout(() => input.focus(), 120); }
  };

  // ── rig: climb on first visit, otherwise perch immediately (resuming from Google) ──
  useEffect(() => {
    const walker = walkerRef.current, bar = barRef.current, say = sayRef.current;
    if (!walker || !bar || !say) return;
    const root = walker.querySelector("#__sbwk_root__") as SVGGElement | null;
    const flip = walker.querySelector("#__sbwk_flip__") as HTMLElement | null;
    if (!root) return;
    if (flip) flip.style.transform = "scaleX(1)";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resuming = resumingRef.current;

    bar.classList.add("open", "sb-climb");

    const el = {
      la: root.querySelector("#__sbwk_la__"), laBg: root.querySelector("#__sbwk_la_bg__"),
      ra: root.querySelector("#__sbwk_ra__"), raBg: root.querySelector("#__sbwk_ra_bg__"),
      ll: root.querySelector("#__sbwk_ll__"), rl: root.querySelector("#__sbwk_rl__"),
      eyeL: root.querySelector("#__sbwk_eye_l__"), eyeR: root.querySelector("#__sbwk_eye_r__"),
      pupL: root.querySelector("#__sbwk_pupil_l__"), pupR: root.querySelector("#__sbwk_pupil_r__"),
      smile: root.querySelector("#__sbwk_smile__") as SVGElement | null,
      talk: root.querySelector("#__sbwk_talk__") as SVGElement | null,
      te: root.querySelector("#__sbwk_te__") as SVGElement | null,
      ti: root.querySelector("#__sbwk_ti__") as SVGElement | null,
    };
    const setArms = (l: number, r: number) => {
      const lt = l ? `rotate(${l} 22 53)` : "", rt = r ? `rotate(${r} 78 53)` : "";
      el.la?.setAttribute("transform", lt); el.laBg?.setAttribute("transform", lt);
      el.ra?.setAttribute("transform", rt); el.raBg?.setAttribute("transform", rt);
    };
    const setLegs = (l: number, r: number) => {
      el.ll?.setAttribute("transform", l ? `rotate(${l} 44 74)` : "");
      el.rl?.setAttribute("transform", r ? `rotate(${r} 56 74)` : "");
    };
    const setEyes = (sy: number) => {
      const v = Math.max(0.05, sy);
      el.eyeL?.setAttribute("transform", `translate(38,48) scale(1,${v}) translate(-38,-48)`);
      el.eyeR?.setAttribute("transform", `translate(62,48) scale(1,${v}) translate(-62,-48)`);
    };
    const setGaze = (gx: number, gy: number) => {
      el.pupL?.setAttribute("transform", `translate(${gx} ${gy})`);
      el.pupR?.setAttribute("transform", `translate(${gx} ${gy})`);
    };
    const animateMouth = (now: number) => {
      if (talkingRef.current) {
        const t = now / 1000;
        const o = Math.max(0, Math.min(1, (0.5 + 0.5 * Math.sin(t * 13.5)) * (0.55 + 0.45 * Math.sin(t * 7.7 + 1.3)) * (0.7 + 0.3 * Math.sin(t * 23))));
        const ry = 1.4 + o * 4.2, rx = 4 - o * 0.5;
        if (el.smile) (el.smile as HTMLElement).style.display = "none";
        if (el.talk) (el.talk as HTMLElement).style.display = "block";
        el.te?.setAttribute("rx", String(rx)); el.te?.setAttribute("ry", String(ry));
        if (el.ti) {
          if (o > 0.25) { (el.ti as HTMLElement).style.display = "block"; el.ti.setAttribute("cy", String(61.8 + ry * 0.4)); el.ti.setAttribute("rx", String(rx * 0.62)); el.ti.setAttribute("ry", String(ry * 0.5)); }
          else { (el.ti as HTMLElement).style.display = "none"; }
        }
      } else {
        if (el.smile) (el.smile as HTMLElement).style.display = "";
        if (el.talk) (el.talk as HTMLElement).style.display = "none";
      }
    };

    const barRect = bar.getBoundingClientRect();
    const perchX = barRect.left + barRect.width / 2 - 32;
    const perchTop = barRect.top - 74;
    const FLOOR_TY = 74;
    const START_TY = Math.max(170, window.innerHeight + 40 - perchTop);
    const ENTRY_X = Math.max(6, perchX - 150);
    const place = (x: number, ty: number) => { walker.style.transform = `translate(${x}px, ${perchTop + ty}px)`; };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    let raf = 0, ph = "pop", pStart = performance.now(), perched = false, blinkAt = performance.now() + 2600;
    const nextP = (p: string) => { ph = p; pStart = performance.now(); };

    const onPerched = () => {
      if (perched) return;
      perched = true;
      walker.classList.add("bg-glow");
      setPerchedReady(true);
      window.setTimeout(() => { say.classList.add("show"); speak(isHomeTour ? 3200 : 2600); }, 280);
      window.setTimeout(() => {
        walker.classList.remove("bg-glow");
        bar.classList.remove("sb-climb");
        if (isHomeTour) bar.classList.add("bg-tour");
        else inputRef.current?.focus();
      }, 1000);
    };

    if (resuming) {
      // came back from Google — sit perched, eyes shut, gold auth glow (the auth effect drives the rest)
      place(perchX, 0); setArms(0, 0); setLegs(0, 0); setGaze(0, 0); setEyes(0.06);
      eyesClosedRef.current = true; perched = true; ph = "perch"; walker.classList.add("bg-auth");
    } else {
      place(ENTRY_X, START_TY); setArms(0, 0); setLegs(0, 0); setEyes(1); setGaze(0, -0.55);
    }

    const step = (now: number) => {
      const e = now - pStart;
      if (ph === "pop") {
        const k = easeOut(Math.min(1, e / 1700));
        place(ENTRY_X, lerp(START_TY, FLOOR_TY, k)); setGaze(0, -0.4);
        if (k >= 1) nextP("walk");
      } else if (ph === "walk") {
        const k = Math.min(1, e / 1900);
        place(lerp(ENTRY_X, perchX, ease(k)), FLOOR_TY);
        const s = (e / 1000) * 7.5;
        setLegs(Math.max(0, Math.sin(s)) * 16, Math.max(0, Math.sin(s + Math.PI)) * 16);
        setGaze(1.6, 0);
        if (k >= 1) { setLegs(0, 0); nextP("reach"); }
      } else if (ph === "reach") {
        const k = ease(Math.min(1, e / 850));
        place(perchX, FLOOR_TY - lerp(0, 6, k));
        setArms(lerp(0, -122, k), lerp(0, 122, k)); setGaze(0, -0.8);
        if (k >= 1) nextP("grip");
      } else if (ph === "grip") {
        const k = ease(Math.min(1, e / 1050));
        place(perchX, lerp(FLOOR_TY - 6, FLOOR_TY - 44, k));
        setArms(lerp(-122, -100, k), lerp(122, 100, k)); setLegs(lerp(0, 18, k), lerp(0, 18, k));
        if (k >= 1) nextP("mantle");
      } else if (ph === "mantle") {
        const k = ease(Math.min(1, e / 1050));
        place(perchX, lerp(FLOOR_TY - 44, 0, k));
        setArms(lerp(-100, -26, k), lerp(100, 26, k)); setLegs(lerp(18, 0, easeOut(k)), lerp(18, 0, easeOut(k)));
        if (k >= 1) { setArms(0, 0); setLegs(0, 0); nextP("perch"); }
      } else if (ph === "perch") {
        place(perchX, 0);
        setArms(0, -28 + Math.sin(e / 45) * 18);
        if (eyesClosedRef.current) { setEyes(0.06); setGaze(0, 0); }
        else { setGaze(0, 0); if (now > blinkAt) { const bk = (now - blinkAt) / 120; setEyes(bk < 1 ? 1 - bk : bk < 2 ? bk - 1 : (blinkAt = now + 2600 + Math.random() * 2600, 1)); } }
        if (!resuming) onPerched();
      }
      animateMouth(now);
      raf = requestAnimationFrame(step);
    };

    if (reduce && !resuming) { place(perchX, 0); setArms(0, 0); setLegs(0, 0); setEyes(1); setGaze(0, 0); ph = "perch"; pStart = performance.now(); onPerched(); }
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(talkTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── resume after Google: once auth resolves, welcome by name (or fall back to the sign-up ask) ──
  useEffect(() => {
    if (!resumingRef.current || loading) return;
    if (user) {
      try { localStorage.removeItem("sb_onb"); } catch { /* noop */ }
      const md = (user.user_metadata || {}) as { full_name?: string; name?: string };
      const name = (profile?.display_name || md.full_name || md.name || user.email?.split("@")[0] || "there").split(" ")[0];
      const t = window.setTimeout(() => {
        eyesClosedRef.current = false;
        walkerRef.current?.classList.remove("bg-auth");
        resumingRef.current = false;
        setPhase("welcome");
        sayLine(`Hello, ${name}. It's time to set me up before we can get started.`, 4500);
      }, 1700);
      return () => window.clearTimeout(t);
    } else {
      try { localStorage.removeItem("sb_onb"); } catch { /* noop */ }
      eyesClosedRef.current = false;
      walkerRef.current?.classList.remove("bg-auth");
      resumingRef.current = false;
      setPhase("askSignup");
      showBarInput("Type yes…");
      sayLine(ASK_LINES.askSignup);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const finishHomeTour = () => {
    if (homeTourFinishedRef.current) return;
    homeTourFinishedRef.current = true;
    sayRef.current?.classList.remove("show");
    overlayRef.current?.classList.add("bg-exit");
    window.setTimeout(() => onFinish?.(), 620);
  };

  // ── phase transitions ──
  const enterContent = (kind: ContentKind) => {
    setPhase(kind);
    setView({ kind, step: 0 });
    barRef.current?.classList.add("bg-tour");          // hide input, arrow = Next
    sayLine(LINES[kind][0]);
  };
  // A chapter just ended: close the card, hold a beat, then introduce the next part.
  const pauseThenAsk = (p: "askUsecases" | "askPersonality" | "askSignup") => {
    if (isHomeTour) {
      setPhase(p);
      sayRef.current?.classList.remove("show");
      if (p === "askSignup") {
        window.setTimeout(() => {
          sayLine(HOMEPAGE_DONE_LINE, 2300);
          window.setTimeout(finishHomeTour, 1900);
        }, 650);
        return;
      }
      const nextKind: ContentKind = p === "askUsecases" ? "usecases" : "personality";
      window.setTimeout(() => {
        sayLine(HOMEPAGE_BRIDGE_LINES[p], 2400);
        window.setTimeout(() => enterContent(nextKind), 1350);
      }, 750);
      return;
    }
    setPhase(p);                                        // cardOpen → false, card fades closed
    sayRef.current?.classList.remove("show");
    window.setTimeout(() => { showBarInput("Type yes…"); sayLine(ASK_LINES[p]); }, 1000);
  };
  const enterSignup = () => {
    setPhase("signup");
    barRef.current?.classList.add("sb-climb");          // bar = bare glass pill (no controls)
    walkerRef.current?.classList.add("bg-pulse");       // glow + clickable
    sayLine(SIGNUP_LINE, 6000);
  };
  const goToStep = (i: number) => { setView(v => ({ ...v, step: i })); sayLine(LINES[view.kind][i]); };

  const advanceContent = () => {
    if (view.step < SET[view.kind].length - 1) goToStep(view.step + 1);
    else if (view.kind === "features") pauseThenAsk("askUsecases");
    else if (view.kind === "usecases") pauseThenAsk("askPersonality");
    else pauseThenAsk("askSignup");
  };

  const onBarBtn = () => {
    if (isHomeTour) {
      if (phase === "features" || phase === "usecases" || phase === "personality") { advanceContent(); return; }
      if (phase === "greeting") { enterContent("features"); return; }
      if (phase === "askUsecases") { enterContent("usecases"); return; }
      if (phase === "askPersonality") { enterContent("personality"); return; }
      if (phase === "askSignup") { finishHomeTour(); return; }
    }
    if (phase === "features" || phase === "usecases" || phase === "personality") { advanceContent(); return; }
    // ask phases — require a typed answer
    if ((inputRef.current?.value || "").trim().length === 0) { inputRef.current?.focus(); return; }
    inputRef.current?.blur();
    if (phase === "greeting") enterContent("features");
    else if (phase === "askUsecases") enterContent("usecases");
    else if (phase === "askPersonality") enterContent("personality");
    else if (phase === "askSignup") enterSignup();
  };

  const onBrainoClick = () => {
    if (phase !== "signup") return;
    try { localStorage.setItem("sb_onb", "signup"); } catch { /* noop */ }
    void supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  };

  // drag the card by its grab strip
  const onCardDown = (e: ReactPointerEvent<HTMLElement>) => {
    const card = cardRef.current; if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.transform = "none"; card.style.left = `${r.left}px`; card.style.top = `${r.top}px`;
    dragRef.current = { x: e.clientX, y: e.clientY, ox: r.left, oy: r.top };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ }
  };
  const onCardMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = dragRef.current, card = cardRef.current; if (!d || !card) return;
    card.style.left = `${Math.max(8, Math.min(window.innerWidth - 120, d.ox + (e.clientX - d.x)))}px`;
    card.style.top = `${Math.max(8, Math.min(window.innerHeight - 90, d.oy + (e.clientY - d.y)))}px`;
  };
  const onCardUp = (e: ReactPointerEvent<HTMLElement>) => { dragRef.current = null; try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* noop */ } };

  const cardOpen = phase === "features" || phase === "usecases" || phase === "personality";

  useEffect(() => {
    if (!isHomeTour || !perchedReady || phase !== "greeting" || autoTourStartedRef.current) return;
    autoTourStartedRef.current = true;
    const timer = window.setTimeout(() => enterContent("features"), 2450);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHomeTour, perchedReady, phase]);

  useEffect(() => {
    if (!isHomeTour || !cardOpen || homeTourFinishedRef.current) return;
    const line = LINES[view.kind][view.step] || "";
    const words = line.split(/\s+/).filter(Boolean).length;
    const waitMs = Math.max(3600, Math.min(7600, words * 220));
    const timer = window.setTimeout(() => advanceContent(), waitMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHomeTour, cardOpen, phase, view.kind, view.step]);

  return (
    <div ref={overlayRef} className={`bg-overlay${isHomeTour ? " bg-home-tour" : ""}`} role="dialog" aria-label="Braino onboarding">
      <GradientBackground />
      <style>{TOUR_SCENE_CSS}</style>
      <style>{GATE_CSS}</style>
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true" dangerouslySetInnerHTML={{ __html: GLASS_FILTER_SVG }} />
      {isHomeTour && (
        <button type="button" className="bg-tour-skip" onClick={finishHomeTour}>
          Skip the interactive tour. Just view the website as is.
        </button>
      )}

      <div ref={cardRef} className={`bg-card${cardOpen ? " show" : ""}`} aria-hidden={!cardOpen}>
        <div className="bg-card-grab" onPointerDown={onCardDown} onPointerMove={onCardMove} onPointerUp={onCardUp} onPointerCancel={onCardUp}>⠿</div>
        <div className="bg-card-scroll">
          <div key={`${view.kind}-${view.step}`} className="bg-pop">
            {view.kind === "features" ? <VCard data={CARD_DATA[view.step]} />
              : view.kind === "usecases" ? <ScenarioCard data={SCENARIOS[view.step]} />
              : <PersonalityCard data={PERSONALITY[view.step]} />}
          </div>
        </div>
      </div>

      <div className="bg-lane">
        <div ref={walkerRef} className="bg-walker" onClick={onBrainoClick}>
          <div ref={sayRef} id="__sbwk_say__">{isHomeTour ? HOMEPAGE_GREETING : GREETING}</div>
          <div id="__sbwk_flip__" dangerouslySetInnerHTML={{ __html: GATE_WALKER_SVG }} />
        </div>
      </div>

      <div ref={barRef} id="__sb_bar__">
        <input ref={inputRef} id="__sb_input__" placeholder="Type yes…" autoComplete="off" spellCheck={false}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onBarBtn(); } }} />
        <button className="sb-bar-icon-btn" title="Continue" onClick={onBarBtn} aria-label="Continue">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
        </button>
      </div>
    </div>
  );
}
