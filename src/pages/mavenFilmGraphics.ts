/* Maven launch film: the pill-only graphic beats, drawn on a 1920x1080 canvas.
   Every state is ported 1:1 from the real app (mac/maven/renderer/island.css +
   island.js): the wake-up, the resting blink, the edge light (warm = Write,
   blue = Do, green = done), the curious tilt, the three bottom spots, and the
   Do bar growing out of the pill. Each draw(c, t) is a pure function of t. */

type Ctx = CanvasRenderingContext2D;
export type Graphic = { id: string; dur: number; draw: (c: Ctx, t: number) => void };

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
// the app's --spring and --settle curves
const SPRING = [0, .038, .131, .25, .378, .503, .616, .715, .797, .862, .913, .952, .979, .998, 1.009, 1.016, 1.019, 1.02, 1.019, 1.017, 1.014, 1.012, 1.009, 1.007, 1.005, 1.004, 1];
const SETTLE = [0, .06, .187, .331, .468, .588, .686, .765, .826, .872, .907, .933, .952, .966, .976, .983, .988, .992, 1];
const curve = (arr: number[], p: number) => { p = clamp(p); const f = p * (arr.length - 1), i = Math.floor(f); return i >= arr.length - 1 ? 1 : lerp(arr[i], arr[i + 1], f - i); };
const spring = (p: number) => curve(SPRING, p), settle = (p: number) => curve(SETTLE, p);

export const W = 1920, H = 1080;
const CX = W / 2, CY = H / 2;
const INK = "#f6f3ea", BODY = "#0d0d0c";
type Tint = "warm" | "blue";
const TINT: Record<Tint | "green", { c: number[]; g: number[] }> = {
  warm: { c: [255, 236, 220], g: [255, 190, 150] }, blue: { c: [207, 227, 255], g: [90, 150, 255] }, green: { c: [120, 235, 160], g: [70, 220, 120] },
};
export const SF = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif';

export function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, h / 2, w / 2); c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
type CapOpts = { op?: number; scale?: number; rot?: number };
function capsule(c: Ctx, cx: number, cy: number, w: number, h: number, S: number, o: CapOpts = {}) {
  c.save(); c.globalAlpha = o.op ?? 1; c.translate(cx, cy); c.rotate(((o.rot || 0) * Math.PI) / 180); c.scale(o.scale ?? 1, o.scale ?? 1); c.translate(-cx, -cy);
  c.shadowColor = "rgba(0,0,0,.5)"; c.shadowBlur = 20 * S; c.shadowOffsetY = 8 * S; rr(c, cx - w / 2, cy - h / 2, w, h, h / 2); c.fillStyle = BODY; c.fill();
  c.shadowColor = "transparent"; c.lineWidth = S; c.strokeStyle = "rgba(255,255,255,.14)"; c.stroke(); c.restore();
}
type EyeOpts = { op?: number; scale?: number; rot?: number; w?: number; h?: number; h0?: number; dx?: number; dy?: number; blink?: number };
function eyes(c: Ctx, cx: number, cy: number, S: number, o: EyeOpts = {}) {
  const ew = (o.w ?? 6) * S, eh = (o.h ?? 13) * S, gap = 9 * S, sy = o.blink ?? 1;
  c.save(); c.globalAlpha = o.op ?? 1; c.translate(cx, cy); c.rotate(((o.rot || 0) * Math.PI) / 180); c.scale(o.scale ?? 1, o.scale ?? 1);
  [-1, 1].forEach((side, i) => {
    const ex = side * (gap / 2 + ew / 2) + (o.dx || 0) * S, ey = (o.dy || 0) * S, h = (i === 0 && o.h0 ? o.h0 * S : eh) * sy;
    rr(c, ex - ew / 2, ey - h / 2, ew, Math.max(h, 1), Math.min(4 * S, h / 2)); c.fillStyle = INK; c.fill();
  });
  c.restore();
}
type EdgeOpts = { tint?: Tint; warm?: number; tail?: number; fade?: number; done?: boolean; bright?: number };
/* paintEdge, 1:1: a point with a fading tail running round the capsule outline. */
function edgeLight(c: Ctx, cx: number, cy: number, w: number, h: number, S: number, head: number, o: EdgeOpts) {
  const r = h / 2, L = w - h, per = 2 * L + Math.PI * h, n = Math.round(o.tail ?? 26), T = TINT[o.tint || "warm"];
  const at = (d: number): [number, number] => {
    d = ((d % per) + per) % per;
    if (d < L) return [cx - L / 2 + d, cy - r]; d -= L;
    if (d < Math.PI * r) { const a = -Math.PI / 2 + d / r; return [cx + L / 2 + Math.cos(a) * r, cy + Math.sin(a) * r]; } d -= Math.PI * r;
    if (d < L) return [cx + L / 2 - d, cy + r]; d -= L;
    const a = Math.PI / 2 + d / r; return [cx - L / 2 + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const mix = (a: number, b: number) => Math.round(b + (a - b) * (o.warm ?? 1));
  const C = T.c.map((v, i) => mix(v, TINT.green.c[i])), G = T.g.map((v, i) => mix(v, TINT.green.g[i]));
  c.save(); c.shadowColor = `rgb(${G})`; c.shadowBlur = 8 * S; const h0 = (head % 1) * per;
  for (let i = 0; i < n; i++) {
    const [x, y] = at(h0 - i * (per / 90));
    c.fillStyle = `rgba(${C},${(1 - (i / n) * (o.done ? 0.35 : 1)) * (o.bright ?? 1) * (o.fade ?? 1)})`;
    c.beginPath(); c.arc(x, y, Math.max(0.5, 1.6 - (i / n) * 1.1) * S, 0, Math.PI * 2); c.fill();
  }
  c.restore();
}
const voice = (t: number) => clamp(0.15 + 0.55 * Math.abs(Math.sin(t / 260)) * (0.6 + 0.4 * Math.sin(t / 97)) + 0.25 * Math.max(0, Math.sin(t / 610)));
const blinkAt = (t: number, times: number[], len = 120) => (times.some((b) => t >= b && t < b + len) ? 0.12 : 1);
function headAt(t0: number, t: number, speed: (s: number) => number) { let h = 0; for (let s = t0; s < t; s += 16.7) h += speed(s); return h; }
const listenSpeed = (s: number) => 0.004 + voice(s) * 0.022;
function doneLight(c: Ctx, cx: number, cy: number, w: number, h: number, S: number, head: number, d: number) {
  edgeLight(c, cx, cy, w, h, S, head, { tint: "warm", warm: Math.pow(0.88, d / 16.7), tail: 90 - 64 * Math.pow(0.9, d / 16.7), fade: clamp(1 - Math.max(0, d - 450) / 350), done: true });
}

const S = 3, PW = 58 * S, PH = 30 * S;

export const GRAPHICS: Record<string, Graphic> = {
  /* Entrance: black. A golden point draws the capsule's outline from the top
     centre both ways; where it closes, the pill fills in. The eyes start as a
     thin line (shut), spring open, one blink. Then it rests and breathes. */
  wake: { id: "wake", dur: 3400, draw(c, t) {
    const r = PH / 2, L = PW - PH, per = 2 * L + Math.PI * PH;
    const at = (d: number): [number, number] => {
      d = ((d % per) + per) % per;
      if (d < L / 2) return [CX + d, CY - r]; d -= L / 2;
      if (d < Math.PI * r) { const a = -Math.PI / 2 + d / r; return [CX + L / 2 + Math.cos(a) * r, CY + Math.sin(a) * r]; } d -= Math.PI * r;
      if (d < L) return [CX + L / 2 - d, CY + r]; d -= L;
      if (d < Math.PI * r) { const a = Math.PI / 2 + d / r; return [CX - L / 2 + Math.cos(a) * r, CY + Math.sin(a) * r]; } d -= Math.PI * r;
      return [CX - L / 2 + d, CY - r];
    };
    const draw = spring(seg(t, 200, 1500)) * 0.5, fill = seg(t, 1400, 1800), lineOut = 1 - seg(t, 1700, 2300);
    if (fill > 0) {
      const b = t > 2600 ? 1 + 0.04 * Math.sin(((t - 2600) / 4200) * Math.PI * 2) ** 2 : 1;
      capsule(c, CX, CY, PW, PH, S, { op: fill, scale: b });
      // eyes: a thin line, then open on a spring, one blink
      const open = spring(seg(t, 1900, 2300));
      eyes(c, CX, CY, S, { op: fill, scale: b, blink: (0.12 + 0.88 * open) * blinkAt(t, [2900]) });
    }
    if (draw > 0 && lineOut > 0) {
      c.save(); c.lineCap = "round"; c.lineWidth = 2.2 * S; c.shadowColor = "rgba(255,190,90,1)"; c.shadowBlur = 14 * S;
      c.strokeStyle = `rgba(255,214,140,${lineOut})`;
      for (const dir of [1, -1]) {
        c.beginPath(); const steps = 120;
        for (let i = 0; i <= steps; i++) { const [x, y] = at(dir * per * draw * (i / steps)); i ? c.lineTo(x, y) : c.moveTo(x, y); }
        c.stroke();
      }
      // the bright head of the line
      if (draw < 0.5) for (const dir of [1, -1]) { const [x, y] = at(dir * per * draw); c.fillStyle = "#fff6e0"; c.beginPath(); c.arc(x, y, 2.6 * S, 0, 7); c.fill(); }
      c.restore();
    }
  } },
  listen: { id: "listen", dur: 3000, draw(c, t) {
    const on = t > 350;
    capsule(c, CX, CY, PW, PH, S); eyes(c, CX, CY, S, on ? { h: 11, dy: -2 } : {});
    if (on) edgeLight(c, CX, CY, PW, PH, S, headAt(350, t, listenSpeed), { tint: "warm", bright: 0.6 + 0.4 * voice(t) });
  } },
  done: { id: "done", dur: 2600, draw(c, t) {
    const lis = t < 1000, head = headAt(0, Math.min(t, 1000), listenSpeed) + (t > 1000 ? headAt(1000, t, () => 0.006) : 0);
    capsule(c, CX, CY, PW, PH, S); eyes(c, CX, CY, S, lis ? { h: 11, dy: -2 } : {});
    if (lis) edgeLight(c, CX, CY, PW, PH, S, head, { tint: "warm", bright: 0.6 + 0.4 * voice(t) }); else doneLight(c, CX, CY, PW, PH, S, head, t - 1000);
  } },
  spots: { id: "spots", dur: 3600, draw(c, t) {
    const spots = [CX, W * 0.2, W * 0.8, CX], y = H * 0.8, i = Math.min(3, Math.floor(t / 900)), lt = t - i * 900, from = i ? spots[i - 1] : CX, to = spots[i];
    const m = i ? spring(seg(lt, 60, 560)) : 1, x = lerp(from, to, m), drag = i > 0 && lt > 60 && lt < 560;
    capsule(c, x, y, PW, PH, S); eyes(c, x, y, S, { dx: drag ? Math.sign(to - from) * 2 : 0 });
  } },
  takes: { id: "takes", dur: 3600, draw(c, t) {
    const takes = [[100, 900], [1300, 2100], [2500, 3200]]; let lis = false, done = -1, head = 0;
    for (const [a, b] of takes) {
      if (t >= a && t < b) { lis = true; head = headAt(a, t, (s) => listenSpeed(s * 1.3)); }
      else if (t >= b && t < b + 800) { done = t - b; head = headAt(a, b, (s) => listenSpeed(s * 1.3)) + headAt(b, t, () => 0.006); }
    }
    capsule(c, CX, CY, PW, PH, S); eyes(c, CX, CY, S, lis ? { h: 11, dy: -2 } : {});
    if (lis) edgeLight(c, CX, CY, PW, PH, S, head, { tint: "warm", bright: 0.6 + 0.4 * voice(t * 1.3) }); else if (done >= 0) doneLight(c, CX, CY, PW, PH, S, head, done);
  } },
  curious: { id: "curious", dur: 5200, draw(c, t) {
    const cur = spring(seg(t, 1100, 1600)) - settle(seg(t, 2600, 3000)), lis1 = t > 100 && t < 1000, lis2 = t > 3300 && t < 4300;
    const head = lis1 ? headAt(100, t, listenSpeed) : lis2 ? headAt(3300, t, listenSpeed) : headAt(3300, 4300, listenSpeed) + headAt(4300, t, () => 0.006);
    capsule(c, CX, CY, PW, PH, S, { rot: -6 * cur });
    eyes(c, CX, CY, S, lis1 || lis2 ? { h: 11, dy: -2 } : { rot: -6 * cur, dx: 3 * cur, h0: 13 - 4 * cur, blink: blinkAt(t, [2000]) });
    if (lis1 || lis2) edgeLight(c, CX, CY, PW, PH, S, head, { tint: "warm", bright: 0.6 + 0.4 * voice(t) });
    else if (t > 4300 && t < 5100) doneLight(c, CX, CY, PW, PH, S, head, t - 4300);
  } },
  send: { id: "send", dur: 7400, draw(c, t) {
    const s = 2, pw = 58 * s, ph = 30 * s, by = CY + ph / 2;   // always dead centre
    const K: Record<string, number[]> = { pill: [pw, ph, ph / 2], think: [480 * s, 34 * s, 17 * s], ask: [480 * s, 86 * s, 20 * s], sent: [120 * s, 44 * s, 22 * s] };
    const phases: [string, number][] = [["pill", 0], ["think", 1300], ["ask", 2900], ["sent", 5000], ["pill", 6000]];
    let a = K.pill, b = K.pill, p = 1, cur = "pill", since = t;
    phases.forEach(([name, at], i) => {
      if (t >= at) { a = i ? K[phases[i - 1][0]] : K.pill; b = K[name]; cur = name; since = t - at; const back = name === "pill" && i > 0; p = (back ? settle : spring)(since / (back ? 360 : 520)); }
    });
    const w = lerp(a[0], b[0], p), h = lerp(a[1], b[1], p), r = lerp(a[2], b[2], p), x = CX - w / 2, y = CY - h / 2;
    if (cur === "pill" && t < 1300) {
      const on = t > 200; capsule(c, CX, by - ph / 2, pw, ph, s); eyes(c, CX, by - ph / 2, s, on ? { h: 11, dy: -2 } : {});
      if (on) edgeLight(c, CX, by - ph / 2, pw, ph, s, headAt(200, t, listenSpeed), { tint: "blue", bright: 0.6 + 0.4 * voice(t) });
      return;
    }
    if (cur === "pill" && p >= 1) { capsule(c, CX, by - ph / 2, pw, ph, s); eyes(c, CX, by - ph / 2, s); return; }
    c.save();
    if (cur === "think") { c.shadowColor = "rgba(90,150,255,.35)"; c.shadowBlur = 18 * s; }
    if (cur === "sent") { c.shadowColor = "rgba(80,220,130,.9)"; c.shadowBlur = 10 * s; }
    rr(c, x, y, w, h, r); c.fillStyle = "#0b0b0a"; c.fill(); c.shadowBlur = 0; c.lineWidth = s; c.strokeStyle = "rgba(255,255,255,.12)"; c.stroke();
    if (cur === "sent") { c.lineWidth = 1.5 * s; c.strokeStyle = "#8ff0b0"; c.stroke(); }
    c.save(); rr(c, x, y, w, h, r); c.clip();
    const ein = clamp((since - 130) / 220);
    if (cur === "pill") eyes(c, CX, y + h / 2, s);
    if (cur === "think") {
      const per = 2 * (w + h), hd = ((since / 1300) % 1) * per; c.shadowColor = "rgba(110,165,255,.9)"; c.shadowBlur = 6 * s;
      for (let i = 0; i < 40; i++) {
        const d = (((hd - (i * per) / 220) % per) + per) % per; let px: number, py: number;
        if (d < w) { px = x + d; py = y; } else if (d < w + h) { px = x + w; py = y + d - w; } else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; } else { px = x; py = y + h - (d - 2 * w - h); }
        c.fillStyle = `rgba(170,205,255,${(1 - i / 40) * 0.95})`; c.beginPath(); c.arc(px, py, 1.5 * s, 0, 7); c.fill();
      }
      c.shadowBlur = 0; eyes(c, x + 22 * s, y + h / 2, s * 0.85, { h: 8, dx: 1 + Math.sin(since / 380), dy: -2 });
      c.globalAlpha = ein; c.font = `600 ${12.5 * s}px ${SF}`; c.textBaseline = "middle";
      const tx = "Tell Rahul I’m running late", tw = c.measureText(tx).width, sx = x + 44 * s;
      const g = c.createLinearGradient(sx, 0, sx + tw, 0), sh = ((since / 1600) % 1) * 1.4 - 0.2, dim = "rgba(246,243,234,.45)";
      g.addColorStop(0, dim); g.addColorStop(clamp(sh - 0.15), dim); g.addColorStop(clamp(sh), "#fff"); g.addColorStop(clamp(sh + 0.15), dim); g.addColorStop(1, dim);
      c.fillStyle = g; c.fillText(tx, sx, y + h / 2);
    }
    if (cur === "ask") {
      eyes(c, x + 22 * s, y + 21.5 * s, s * 0.85, { h: 11 }); c.globalAlpha = ein; const px = x + 44 * s, ty = y + 15 * s; c.textBaseline = "top";
      c.font = `600 ${12.5 * s}px ${SF}`; c.fillStyle = INK; c.fillText("Tell Rahul", px, ty);
      c.font = `500 ${12.5 * s}px ${SF}`; c.fillStyle = "rgba(246,243,234,.55)"; c.textAlign = "right"; c.fillText("WhatsApp", x + w - 12 * s, ty); c.textAlign = "left";
      const py = y + 44 * s, bw = w - 56 * s - 200 * s; rr(c, px, py, bw, 30 * s, 8 * s); c.fillStyle = "rgba(255,255,255,.07)"; c.fill();
      c.font = `${13 * s}px ${SF}`; c.fillStyle = "rgba(246,243,234,.92)"; c.textBaseline = "middle"; c.fillText("I’m running late.", px + 10 * s, py + 15 * s);
      const press = since > 1600 ? Math.sin(seg(since, 1600, 1800) * Math.PI) : 0; let ax = x + w - 12 * s;
      ([["Cancel", "esc", false], ["Edit", "", false], ["Send", "⏎", true]] as [string, string, boolean][]).forEach(([lb, kb, yes]) => {
        c.font = `600 ${12 * s}px ${SF}`; const lw = c.measureText(lb).width; c.font = `${10 * s}px Menlo, monospace`;
        const kw = kb ? c.measureText(kb).width + 5 * s : 0, bw2 = lw + kw + 22 * s; ax -= bw2;
        c.save();
        if (yes && press) { const k = 1 - 0.08 * press; c.translate(ax + bw2 / 2, py + 15 * s); c.scale(k, k); c.translate(-(ax + bw2 / 2), -(py + 15 * s)); }
        rr(c, ax, py + 3 * s, bw2, 24 * s, 12 * s); c.fillStyle = yes ? INK : "rgba(255,255,255,.12)"; c.fill();
        c.fillStyle = yes ? "#0d0d0c" : INK; c.font = `600 ${12 * s}px ${SF}`; c.fillText(lb, ax + 11 * s, py + 15 * s);
        if (kb) { c.globalAlpha = ein * 0.6; c.font = `${10 * s}px Menlo, monospace`; c.fillText(kb, ax + 11 * s + lw + 5 * s, py + 15 * s); }
        c.restore(); ax -= 6 * s;
      });
    }
    if (cur === "sent") {
      eyes(c, x + 22 * s, y + h / 2, s * 0.94); c.globalAlpha = clamp((since - 120) / 180);
      c.font = `600 ${13 * s}px ${SF}`; c.fillStyle = INK; c.textBaseline = "middle"; c.fillText("Sent.", x + 44 * s, y + h / 2);
    }
    c.restore(); c.restore();
  } },
  rest: { id: "rest", dur: 3000, draw(c, t) {
    const b = 1 + 0.04 * Math.sin((t / 4200) * Math.PI * 2) ** 2;
    capsule(c, CX, CY, PW * 1.4, PH * 1.4, S, { scale: b }); eyes(c, CX, CY, S * 1.4, { scale: b, blink: blinkAt(t, [1300, 1560], 110) });
  } },
};
