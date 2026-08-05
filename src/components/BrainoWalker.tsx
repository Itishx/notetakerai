/**
 * BrainoWalker — the browser-extension's walking mascot, ported to the website.
 * Coral brain with arms + legs that strolls across the bottom of the page, follows the
 * cursor with its eyes, can be grabbed + flung (tumbles with a reaction face, then walks
 * back), and — on its own, ambiently — occasionally moonwalks (fedora on) and puts on specs.
 * Self-contained: no auth / chat / network. Behaviour ported 1:1 from extension/content.js.
 */
import { useEffect, useRef } from "react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";

const W = 64;   // walker width (px)

export default function BrainoWalker({
  perchTargetId = "pg2-hero-bar",
  alwaysPerched = false,
}: {
  // The id of the element Braino should walk ON TOP of (his feet rest on its top edge).
  perchTargetId?: string;
  // When true he always stays perched on that bar (e.g. the chat input bar) instead of
  // only perching while the hero is in view.
  alwaysPerched?: boolean;
} = {}) {
  const laneRef = useRef<HTMLDivElement>(null);
  const walkerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const lane = laneRef.current;
    const walker = walkerRef.current;
    if (!lane || !walker) return;
    const root = walker.querySelector("#__sbwk_root__") as SVGGElement | null;
    const flip = walker.querySelector("#__sbwk_flip__") as HTMLElement | null;
    if (!root) return;
    const q = (sel: string) => root.querySelector(sel) as SVGElement | null;

    // ── state ──
    let raf = 0, throwRaf = 0, moonRaf = 0;
    let start = performance.now(), last = start;
    let posX = 40, dirX = 1;
    let walking = true, waving = false, busy = false;
    let throwMode = false, thrown = false, moonwalking = false, glassesOn = false;
    let tx = 0, ty = 0, rot = 0;
    let reaction: string | null = null, reactStart = 0;
    let waveTimer: number | undefined, autoTimer: number | undefined;
    let sayTimer: number | undefined;
    // cursor (for eye-follow)
    let mouseX = -1, mouseY = -1, mouseAt = 0;

    // While "perched" the walker stands on the homepage hero's cinema bar (#pg2-hero-bar);
    // the lane is sized/positioned over that bar so he strolls on it. On scroll he comes out
    // of the mockup and the lane glides to the bottom of the viewport (CSS transition).
    let perched = false;
    const viewportMaxX = () => Math.max(40, (lane.clientWidth || window.innerWidth) - W - 6);

    // ── footer platformer: jump (↑/Space) and land on `.sb-bridge` ledges ──
    let jumpY = 0, jumpV = 0, airborne = false, onBridge = false;
    // The highest surface top (px above the lane floor) that is under his feet
    // AND at or below height `y` — so he lands on the topmost ledge beneath him,
    // and drops to the next one down when he walks off. Floor is 0.
    const surfaceUnderFeet = (y: number) => {
      const bridges = document.querySelectorAll<HTMLElement>(".sb-bridge");
      const lr = lane.getBoundingClientRect();
      const cx = lr.left + posX + W / 2;
      let best = 0;
      bridges.forEach((br) => {
        const r = br.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right) {
          const h = lr.bottom - r.top;
          if (h <= y + 10 && h > best) best = h;
        }
      });
      return best;
    };

    const roamLanePos = () => {
      lane.style.top = `${window.innerHeight - 96 - 16}px`;
      lane.style.left = "0px";
      lane.style.width = `${window.innerWidth}px`;
    };
    const perchLanePos = (bar: HTMLElement) => {
      const r = bar.getBoundingClientRect();
      lane.style.top = `${r.top - 96}px`;     // walker feet (lane bottom) rest on the bar top
      lane.style.left = `${r.left}px`;
      lane.style.width = `${r.width}px`;
    };
    const applyLanePos = () => {
      const bar = document.getElementById(perchTargetId);
      if (perched && bar) perchLanePos(bar);
      else roamLanePos();
    };
    const updatePerch = () => {
      const bar = document.getElementById(perchTargetId);
      const want = !!bar && (alwaysPerched || window.scrollY < 40) && !thrown && !moonwalking;
      if (want !== perched) perched = want;
      applyLanePos();
      if (perched) posX = Math.max(6, Math.min(posX, viewportMaxX()));
    };

    const applyThrow = () => {
      walker.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
      const say = walker.querySelector("#__sbwk_say__") as HTMLElement | null;
      if (say) say.style.transform = `translateX(-50%) rotate(${-rot}deg)`;
    };

    const say = (text: string) => {
      let b = walker.querySelector("#__sbwk_say__") as HTMLElement | null;
      if (!b) {
        b = document.createElement("div");
        b.id = "__sbwk_say__";
        Object.assign(b.style, {
          position: "absolute", left: "50%", bottom: "calc(100% - 4px)",
          transform: "translateX(-50%) translateY(4px) scale(0.9)",
          background: "rgba(27,23,19,0.92)", color: "#fff", fontSize: "12px",
          fontWeight: "600", lineHeight: "1.2", padding: "5px 10px", borderRadius: "12px",
          whiteSpace: "nowrap", pointerEvents: "none", opacity: "0", zIndex: "6",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
          transition: "opacity .18s ease, transform .18s ease",
          boxShadow: "0 4px 14px rgba(27,23,19,0.28)",
        } as CSSStyleDeclaration);
        walker.appendChild(b);
      }
      b.textContent = text;
      requestAnimationFrame(() => {
        if (!b) return;
        b.style.opacity = "1";
        b.style.transform = "translateX(-50%) translateY(0) scale(1)";
      });
      window.clearTimeout(sayTimer);
      sayTimer = window.setTimeout(() => { if (b) b.style.opacity = "0"; }, 1500);
    };

    const setGlasses = (on: boolean) => {
      glassesOn = on;
      q("#__sbwk_specs__")?.setAttribute("display", on ? "inline" : "none");
    };

    // ── normal walk tick ──
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - start) / 1000;
      const moving = walking;

      if (moving && !throwMode) {
        const maxX = viewportMaxX();
        let x = posX + dirX * 74 * dt;
        if (x >= maxX) { x = maxX; dirX = -1; }
        else if (x <= 6) { x = 6; dirX = 1; }
        posX = x;
      }
      // jump physics + bridge/floor landing
      if (!throwMode && !perched) {
        if (airborne) {
          jumpV -= 2000 * dt; jumpY += jumpV * dt;
          const surf = surfaceUnderFeet(jumpY);
          if (jumpV < 0 && jumpY <= surf) { jumpY = surf; jumpV = 0; airborne = false; onBridge = surf > 6; }
          else if (jumpY <= 0) { jumpY = 0; jumpV = 0; airborne = false; onBridge = false; }
        } else {
          // standing: keep the surface under his feet; walk off an edge → fall
          const support = surfaceUnderFeet(jumpY);
          if (support >= jumpY - 4) { jumpY = support; onBridge = support > 6; }
          else { airborne = true; jumpV = 0; onBridge = false; }
        }
      } else { jumpY = 0; airborne = false; onBridge = false; }

      if (!throwMode) walker.style.transform = `translate(${posX}px, ${-jumpY}px)`;
      if (flip) flip.style.transform = `scaleX(${dirX})`;

      // leg / arm walk cycle
      const s = t * 4.5;
      const Lp = Math.sin(s), Rp = Math.sin(s + Math.PI);
      const ll = moving ? Math.max(0, Lp) * 5 : 0, rl = moving ? Math.max(0, Rp) * 5 : 0;
      const ls = moving ? Math.max(0, Lp) * 8 : 0, rs = moving ? Math.max(0, Rp) * 8 : 0;
      const waddle = moving ? Math.sin(s) * 3.4 : 0;
      const walkBob = moving ? (-Math.abs(Math.sin(s)) * 2 - 0.4) : 0;
      const breath = 1 + 0.014 * Math.sin(t * 1.7);
      const bob = Math.sin(t * 1.7 + 0.6) * 0.8;
      const bp = t % 3.4;
      const blink = bp < 0.13 ? Math.sin((bp / 0.13) * Math.PI) : 0;
      const eyeSy = Math.max(0.06, 1 - blink);
      const rightAngle = waving ? (-28 + Math.sin(t * 11) * 16) : 0;

      root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
      const legL = q("#__sbwk_ll__"), legR = q("#__sbwk_rl__");
      const raBg = q("#__sbwk_ra_bg__"), raFg = q("#__sbwk_ra__");
      legL?.setAttribute("transform", `translate(0 ${-ll}) rotate(${ls} 44 74)`);
      legR?.setAttribute("transform", `translate(0 ${-rl}) rotate(${rs} 56 74)`);
      const raTx = rightAngle ? `rotate(${rightAngle} 78 53)` : "";
      raBg?.setAttribute("transform", raTx); raFg?.setAttribute("transform", raTx);

      const eyeL = q("#__sbwk_eye_l__"), eyeR = q("#__sbwk_eye_r__");
      const mouthG = q("#__sbwk_mouth__"), reactG = q("#__sbwk_react__");

      if (reaction) {
        eyeL?.setAttribute("display", "none"); eyeR?.setAttribute("display", "none");
        mouthG?.setAttribute("display", "none"); reactG?.setAttribute("display", "inline");
        const key = reaction === "scared" ? "rs" : reaction === "celebrate" ? "rc" : "rt";
        ["rs", "rc", "rt"].forEach((k) => q("#__sbwk_" + k + "__")?.setAttribute("display", k === key ? "inline" : "none"));
        const rt2 = (now - reactStart) / 1000;
        if (reaction === "scared") {
          const sw = q("#__sbwk_sweat__"); if (sw) { const d = (rt2 * 26) % 22; sw.setAttribute("transform", `translate(${-d * 0.25} ${d})`); sw.setAttribute("opacity", String(Math.max(0, 1 - d / 22))); }
        } else if (reaction === "tears") {
          const tl = q("#__sbwk_tear_l__"), tr = q("#__sbwk_tear_r__"); const d = (rt2 * 22) % 14; const op = String(Math.max(0, 1 - d / 14));
          if (tl) { tl.setAttribute("transform", `translate(${-d * 0.18} ${d})`); tl.setAttribute("opacity", op); }
          if (tr) { tr.setAttribute("transform", `translate(${d * 0.18} ${d})`); tr.setAttribute("opacity", op); }
        } else {
          q("#__sbwk_confetti__")?.setAttribute("transform", `rotate(${Math.sin(now / 120) * 12} 50 30) translate(0 ${Math.sin(now / 90) * 2})`);
        }
      } else {
        reactG?.setAttribute("display", "none");
        eyeL?.setAttribute("display", "inline"); eyeR?.setAttribute("display", "inline"); mouthG?.setAttribute("display", "inline");
        eyeL?.setAttribute("transform", `translate(38,48) scale(1,${eyeSy}) translate(-38,-48)`);
        eyeR?.setAttribute("transform", `translate(62,48) scale(1,${eyeSy}) translate(-62,-48)`);

        // gaze: follow the cursor if it moved recently, else look the way he walks
        const pupL = q("#__sbwk_pupil_l__"), pupR = q("#__sbwk_pupil_r__");
        let gx = (moving ? 2.4 : 0), gy = 0;
        if (now - mouseAt < 2500 && mouseX >= 0) {
          const r = walker.getBoundingClientRect();
          const ex = r.left + r.width * 0.5, ey = r.top + r.height * 0.42;
          let dx = mouseX - ex, dy = mouseY - ey;
          const dist = Math.hypot(dx, dy) || 1;
          const mf = Math.min(dist / 220, 1);
          gx = (dx / dist) * 2.4 * mf * (dirX < 0 ? -1 : 1);  // un-flip X
          gy = (dy / dist) * 1.8 * mf;
        }
        pupL?.setAttribute("transform", `translate(${gx} ${gy})`);
        pupR?.setAttribute("transform", `translate(${gx} ${gy})`);
      }

      raf = requestAnimationFrame(tick);
    };

    // ── throw ──
    const launch = (vx: number, vy: number) => {
      thrown = true; throwMode = true; walking = false;
      const picks = [
        { key: "scared", say: "AAAH!" }, { key: "celebrate", say: "WHEEE!" }, { key: "tears", say: "HAHAHA!" },
      ];
      const p = picks[Math.floor(Math.random() * picks.length)];
      reaction = p.key; reactStart = performance.now(); say(p.say);

      const Wd = window.innerWidth, Hd = window.innerHeight, wh = 78;
      const minTX = 4, maxTX = Wd - W - 4;
      const minTY = -(Hd - 16 - wh) + 8, maxTY = 0;
      let velX = Math.max(-2800, Math.min(2800, vx)), velY = Math.max(-2800, Math.min(2800, vy));
      if (Math.abs(velX) < 140 && Math.abs(velY) < 140) velY = -760;
      const g = 2800, rest = 0.62; let rotV = velX / 90;
      let l = performance.now(); const s0 = l;
      if (throwRaf) cancelAnimationFrame(throwRaf);
      const step = (now: number) => {
        const dt = Math.min(0.032, (now - l) / 1000); l = now;
        velY += g * dt; tx += velX * dt; ty += velY * dt; rot += rotV * dt;
        if (tx < minTX) { tx = minTX; velX = -velX * rest; rotV = -rotV * rest; }
        if (tx > maxTX) { tx = maxTX; velX = -velX * rest; rotV = -rotV * rest; }
        if (ty < minTY) { ty = minTY; velY = -velY * rest; }
        if (ty > maxTY) { ty = maxTY; velY = -velY * rest; velX *= 0.72; rotV *= 0.6; }
        applyThrow();
        const elapsed = (now - s0) / 1000;
        const settled = Math.abs(velX) < 70 && Math.abs(velY) < 70 && (maxTY - ty) < 2;
        if (elapsed < 2.4 && !settled) throwRaf = requestAnimationFrame(step);
        else returnToFloor();
      };
      throwRaf = requestAnimationFrame(step);
    };

    const returnToFloor = () => {
      if (throwRaf) { cancelAnimationFrame(throwRaf); throwRaf = 0; }
      const fromX = tx, fromY = ty, fromR = rot;
      const toX = Math.max(6, Math.min(tx, viewportMaxX()));
      const dur = 620, s0 = performance.now();
      const ease = (now: number) => {
        const k = Math.min(1, (now - s0) / dur), e = 1 - Math.pow(1 - k, 3);
        tx = fromX + (toX - fromX) * e; ty = fromY + (0 - fromY) * e; rot = fromR + (0 - fromR) * e;
        applyThrow();
        if (k < 1) throwRaf = requestAnimationFrame(ease);
        else {
          throwRaf = 0; posX = toX; tx = 0; ty = 0; rot = 0;
          thrown = false; throwMode = false; walking = true;
          window.setTimeout(() => { reaction = null; }, 500);
        }
      };
      throwRaf = requestAnimationFrame(ease);
    };

    // ── moonwalk (faithful: mirrored legs, continuous backward glide, fedora) ──
    const moonwalk = (durationMs = 11000) => {
      if (moonwalking || thrown) return;
      moonwalking = true; throwMode = true; walking = false; reaction = null;
      const mwR = q("#__sbwk_mw_r__"), mwRh = q("#__sbwk_mw_rh__"), mwL = q("#__sbwk_mw_l__"), mwLh = q("#__sbwk_mw_lh__");
      q("#__sbwk_ll__")?.setAttribute("display", "none");
      q("#__sbwk_rl__")?.setAttribute("display", "none");
      q("#__sbwk_moonlegs__")?.setAttribute("display", "inline");
      q("#__sbwk_fedora__")?.setAttribute("display", "inline");
      if (flip) flip.style.transform = "scaleX(1)";
      q("#__sbwk_pupil_l__")?.setAttribute("transform", "translate(0.95 0)");
      q("#__sbwk_pupil_r__")?.setAttribute("transform", "translate(0.95 0)");
      say("Hee-hee! 🕺");

      const laneW = window.innerWidth, wrap = laneW + W, X0 = laneW - W, SPEED = 80;
      const s0 = performance.now();
      const step = (now: number) => {
        const t = (now - s0) / 1000;
        const x = X0 - ((t * SPEED) % wrap);
        walker.style.transform = `translateX(${x}px)`;
        const ph = Math.sin(t * 4.0);
        const heelR = Math.max(0, ph) * 42, heelL = Math.max(0, -ph) * 42;
        const slideR = Math.max(0, -ph) * 10, slideL = Math.max(0, ph) * 10;
        mwR?.setAttribute("transform", `translate(${12 + slideR} 0)`);
        mwRh?.setAttribute("transform", `rotate(${-heelR} 24 101)`);
        mwL?.setAttribute("transform", `translate(${slideL} 0)`);
        mwLh?.setAttribute("transform", `rotate(${-heelL} 24 101)`);
        const waddle = ph * 1.0, walkBob = -Math.abs(ph) * 1.0 - 0.3;
        const breath = 1 + 0.014 * Math.sin(t * 1.7), bob = Math.sin(t * 1.7 + 0.6) * 0.8;
        root.setAttribute("transform", `rotate(${waddle} 50 50) translate(0 ${bob + walkBob}) scale(${breath})`);
        if (now - s0 < durationMs) moonRaf = requestAnimationFrame(step);
        else endMoonwalk(x);
      };
      moonRaf = requestAnimationFrame(step);
    };
    const endMoonwalk = (xResume: number) => {
      if (moonRaf) { cancelAnimationFrame(moonRaf); moonRaf = 0; }
      q("#__sbwk_fedora__")?.setAttribute("display", "none");
      q("#__sbwk_moonlegs__")?.setAttribute("display", "none");
      q("#__sbwk_ll__")?.setAttribute("display", "inline");
      q("#__sbwk_rl__")?.setAttribute("display", "inline");
      q("#__sbwk_pupil_l__")?.setAttribute("transform", "translate(0 0)");
      q("#__sbwk_pupil_r__")?.setAttribute("transform", "translate(0 0)");
      moonwalking = false; throwMode = false; walking = true;
      posX = Math.max(6, Math.min(xResume, viewportMaxX()));
    };

    // ── ambient personality: occasional moonwalk + specs ──
    const scheduleAmbient = () => {
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => {
        if (!thrown && !moonwalking && !busy && !perched) {
          const roll = Math.random();
          if (roll < 0.45) moonwalk();
          else { setGlasses(!glassesOn); say(glassesOn ? "How do I look? 🤓" : "Specs off"); }
        }
        scheduleAmbient();
      }, 22000 + Math.random() * 22000);
    };

    // ── pointer: grab → throw, tap → wave ──
    let dragging = false, dragMoved = false, lpx = 0, lpy = 0, lpt = 0, vX = 0, vY = 0;
    const onDown = (e: PointerEvent) => {
      if (thrown || moonwalking) return;
      dragging = true; dragMoved = false;
      try { walker.setPointerCapture(e.pointerId); } catch { /* noop */ }
      throwMode = true;
      if (perched) {
        // grabbed off the hero bar — drop to the roaming lane but keep him under the cursor
        const wr = walker.getBoundingClientRect();
        const savedTransition = lane.style.transition;
        lane.style.transition = "none";
        perched = false; applyLanePos();
        const lr = lane.getBoundingClientRect();
        tx = wr.left - lr.left; ty = wr.top - lr.top;
        requestAnimationFrame(() => { lane.style.transition = savedTransition; });
      } else { tx = posX; ty = 0; }
      rot = 0;
      lpx = e.clientX; lpy = e.clientY; lpt = performance.now(); vX = 0; vY = 0;
      walker.style.cursor = "grabbing"; e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now(), dt = Math.max(0.001, (now - lpt) / 1000);
      const dx = e.clientX - lpx, dy = e.clientY - lpy;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragMoved = true;
      tx += dx; ty += dy; vX = dx / dt; vY = dy / dt; lpx = e.clientX; lpy = e.clientY; lpt = now;
      applyThrow();
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false; walker.style.cursor = "grab";
      try { walker.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      if (!dragMoved) {
        throwMode = false; tx = 0; ty = 0; rot = 0;
        if (!busy) { busy = true; walking = false; waving = true; window.clearTimeout(waveTimer); waveTimer = window.setTimeout(() => { waving = false; }, 1600); window.setTimeout(() => { busy = false; walking = true; }, 2200); }
        return;
      }
      launch(vX, vY);
    };
    const onMouse = (e: MouseEvent) => { mouseX = e.clientX; mouseY = e.clientY; mouseAt = performance.now(); };
    const onResize = () => { applyLanePos(); posX = Math.max(6, Math.min(posX, viewportMaxX())); };

    // ↑ / Space makes him jump — but only when a footer bridge is near the
    // bottom of the viewport, so the key never hijacks normal page scrolling.
    const onJumpKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" && e.key !== " " && e.key !== "ArrowUp") return;
      if (perched || thrown || moonwalking || airborne) return;
      const lr = lane.getBoundingClientRect();
      let near = false;
      document.querySelectorAll<HTMLElement>(".sb-bridge").forEach((br) => {
        const r = br.getBoundingClientRect();
        if (r.top < lr.bottom + 40 && r.bottom > lr.bottom - 360) near = true;
      });
      if (!near) return;
      e.preventDefault();
      jumpV = 720; airborne = true; onBridge = false;
      if (Math.random() < 0.35) say("Wheee!");
    };

    walker.addEventListener("pointerdown", onDown);
    walker.addEventListener("pointermove", onMove);
    walker.addEventListener("pointerup", onUp);
    walker.addEventListener("pointercancel", onUp);
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", updatePerch, { passive: true });
    window.addEventListener("keydown", onJumpKey, { passive: false });

    posX = Math.min(Math.max(40, window.innerWidth * 0.5), viewportMaxX());
    updatePerch();
    raf = requestAnimationFrame(tick);
    scheduleAmbient();

    return () => {
      cancelAnimationFrame(raf); cancelAnimationFrame(throwRaf); cancelAnimationFrame(moonRaf);
      window.clearTimeout(waveTimer); window.clearTimeout(autoTimer); window.clearTimeout(sayTimer);
      walker.removeEventListener("pointerdown", onDown);
      walker.removeEventListener("pointermove", onMove);
      walker.removeEventListener("pointerup", onUp);
      walker.removeEventListener("pointercancel", onUp);
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", updatePerch);
      window.removeEventListener("keydown", onJumpKey);
    };
  }, []);

  return (
    <div
      ref={laneRef}
      style={{
        position: "fixed", top: "calc(100dvh - 112px)", left: 0, width: "100vw", height: 96,
        pointerEvents: "none", zIndex: 99998, overflow: "visible",
        transition: "top .55s cubic-bezier(0.25,0.46,0.45,0.94), left .55s ease, width .55s ease",
      }}
    >
      <div
        ref={walkerRef}
        style={{
          position: "absolute", bottom: 0, width: W, pointerEvents: "auto",
          cursor: "grab", touchAction: "none", userSelect: "none", willChange: "transform",
        }}
      >
        <div id="__sbwk_flip__" style={{ transformOrigin: "center", display: "block" }}
          dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />
        <div id="__sbwk_shadow__" style={{
          position: "absolute", left: "50%", bottom: -4, width: 42, height: 8,
          transform: "translateX(-50%)", borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(120,60,40,.26), transparent 78%)",
        }} />
      </div>
    </div>
  );
}
