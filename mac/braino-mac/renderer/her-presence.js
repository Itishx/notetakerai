// her-presence.js — the living light. A canvas engine that renders "her" presence.
// Ported from the Claude Design project (Her.html / her-presence.js).
(function () {
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Per-state target parameters. Motion stays a single gentle breathing loop;
  // states differ in scale, brightness, corona activity and warmth only.
  const STATES = {
    idle:        { scale: 1.00, bright: 0.92, wave: 0.06, ring: 0.010, breath: 0.055, warmth: 0.55, spin: 0.10 },
    listening:   { scale: 1.07, bright: 1.12, wave: 0.85, ring: 0.022, breath: 0.040, warmth: 0.72, spin: 0.16 },
    thinking:    { scale: 0.95, bright: 0.80, wave: 0.22, ring: 0.007, breath: 0.030, warmth: 0.34, spin: 0.34 },
    speaking:    { scale: 1.09, bright: 1.18, wave: 0.90, ring: 0.030, breath: 0.050, warmth: 0.66, spin: 0.20 },
    close:       { scale: 1.15, bright: 1.28, wave: 0.14, ring: 0.013, breath: 0.085, warmth: 0.92, spin: 0.08 },
  };

  // Two warmth poles the palette blends between: cooler amber ↔ deep coral.
  const COOL = { glow: [181, 96, 74], mid: [243, 154, 66], core: [255, 226, 190] };
  const WARM = { glow: [232, 120, 110], mid: [233, 130, 96], core: [255, 214, 198] };
  const mixCol = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

  class HerPresence {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.state = 'idle';
      this.p = { ...STATES.idle };       // current (lerped)
      this.t = { ...STATES.idle };       // target
      this.level = 0;                    // external audio 0..1
      this._level = 0;                   // smoothed
      this.time = 0;
      this.rings = [];
      this.ringAcc = 0;
      this.particles = [];
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this._resize = this._resize.bind(this);
      this._frame = this._frame.bind(this);
      window.addEventListener('resize', this._resize);
      this._resize();
      this._seedParticles(46);
      this._raf = requestAnimationFrame(this._frame);
    }

    setState(name) { if (STATES[name]) { this.state = name; this.t = STATES[name]; } }
    setLevel(v) { this.level = clamp(v, 0, 1); }

    _resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.w = w; this.h = h;
      this.canvas.width = w * this.dpr; this.canvas.height = h * this.dpr;
      this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.cx = w / 2; this.cy = h * 0.46;
      this.baseR = Math.min(w, h) * 0.13;
    }

    _seedParticles(n) {
      this.particles = [];
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = this.baseR * (1.2 + Math.random() * 3.2);
        this.particles.push({
          ang, dist, base: dist,
          r: 0.6 + Math.random() * 1.8,
          sp: (0.02 + Math.random() * 0.05) * (Math.random() < 0.5 ? -1 : 1),
          ph: Math.random() * Math.PI * 2,
          a: 0.12 + Math.random() * 0.4,
        });
      }
    }

    // organic radial displacement
    _wobble(ang, t) {
      return (
        Math.sin(ang * 3 + t * 1.1) * 0.5 +
        Math.sin(ang * 5 - t * 0.7) * 0.3 +
        Math.sin(ang * 8 + t * 1.9) * 0.2
      );
    }

    _frame() {
      this._raf = requestAnimationFrame(this._frame);
      const ctx = this.ctx, w = this.w, h = this.h;
      this.time += 0.016;
      const t = this.time;

      // ease current params toward target
      for (const k in this.t) this.p[k] = lerp(this.p[k], this.t[k], 0.045);
      this._level = lerp(this._level, this.level, 0.2);

      const col = {
        glow: mixCol(COOL.glow, WARM.glow, this.p.warmth),
        mid: mixCol(COOL.mid, WARM.mid, this.p.warmth),
        core: mixCol(COOL.core, WARM.core, this.p.warmth),
      };

      // background — deep warm near-black with a soft warm vignette
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#0B0807';
      ctx.fillRect(0, 0, w, h);
      const bg = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, Math.max(w, h) * 0.75);
      bg.addColorStop(0, rgba(col.glow, 0.14 * this.p.bright));
      bg.addColorStop(0.45, rgba(col.glow, 0.04 * this.p.bright));
      bg.addColorStop(1, 'rgba(11,8,7,0)');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      // breathing radius
      const breathe = 1 + Math.sin(t * 0.62) * this.p.breath + Math.sin(t * 0.23) * this.p.breath * 0.4;
      const R = this.baseR * this.p.scale * breathe;
      const flick = this.state === 'thinking' ? (0.9 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03) : 1;

      ctx.globalCompositeOperation = 'lighter';

      // rings — expanding halos
      this.ringAcc += this.p.ring;
      if (this.ringAcc >= 1) { this.ringAcc = 0; this.rings.push({ life: 0 }); }
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const ring = this.rings[i];
        ring.life += 0.006;
        if (ring.life >= 1) { this.rings.splice(i, 1); continue; }
        const rr = R * (1 + ring.life * 2.6);
        const a = (1 - ring.life) * 0.22 * this.p.bright;
        ctx.beginPath(); ctx.arc(this.cx, this.cy, rr, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(col.mid, a); ctx.lineWidth = 1.4; ctx.stroke();
      }

      // particles — drifting warm motes
      for (const pt of this.particles) {
        pt.ang += pt.sp * 0.02 * (1 + this.p.spin);
        const dd = pt.base + Math.sin(t * 0.5 + pt.ph) * this.baseR * 0.25;
        const x = this.cx + Math.cos(pt.ang) * dd;
        const y = this.cy + Math.sin(pt.ang) * dd;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.3 + pt.ph);
        ctx.beginPath(); ctx.arc(x, y, pt.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col.core, pt.a * tw * this.p.bright * 0.7); ctx.fill();
      }

      // outer soft warmth
      const g1 = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, R * 3.4);
      g1.addColorStop(0, rgba(col.glow, 0.30 * this.p.bright * flick));
      g1.addColorStop(0.5, rgba(col.glow, 0.07 * this.p.bright));
      g1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 3.4, 0, Math.PI * 2); ctx.fill();

      // corona — the living membrane / voice body
      const amp = this._level * this.p.wave;
      const N = 120;
      ctx.beginPath();
      for (let i = 0; i <= N; i++) {
        const ang = (i / N) * Math.PI * 2;
        const disp = this._wobble(ang, t) * (0.10 + amp * 0.95);
        const rr = R * (1.16 + disp);
        const x = this.cx + Math.cos(ang) * rr;
        const y = this.cy + Math.sin(ang) * rr;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      const cg = ctx.createRadialGradient(this.cx, this.cy, R * 0.6, this.cx, this.cy, R * 2.2);
      cg.addColorStop(0, rgba(col.mid, 0.0));
      cg.addColorStop(0.7, rgba(col.mid, 0.10 * this.p.bright));
      cg.addColorStop(1, rgba(col.glow, 0));
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = rgba(col.mid, (0.16 + amp * 0.5) * this.p.bright); ctx.lineWidth = 1.2; ctx.stroke();

      // mid amber body
      const g2 = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, R * 1.5);
      g2.addColorStop(0, rgba(col.mid, 0.55 * this.p.bright * flick));
      g2.addColorStop(0.6, rgba(col.mid, 0.16 * this.p.bright));
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 1.5, 0, Math.PI * 2); ctx.fill();

      // hot core
      const g3 = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, R * 0.85);
      g3.addColorStop(0, rgba(col.core, 0.95 * this.p.bright * flick));
      g3.addColorStop(0.45, rgba(col.mid, 0.6 * this.p.bright));
      g3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.85, 0, Math.PI * 2); ctx.fill();

      // bright center pip
      const g4 = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, R * 0.34);
      g4.addColorStop(0, rgba([255, 245, 235], 0.98 * this.p.bright));
      g4.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g4; ctx.beginPath(); ctx.arc(this.cx, this.cy, R * 0.34, 0, Math.PI * 2); ctx.fill();

      ctx.globalCompositeOperation = 'source-over';
    }

    destroy() { cancelAnimationFrame(this._raf); window.removeEventListener('resize', this._resize); }
  }

  window.HerPresence = HerPresence;
})();
