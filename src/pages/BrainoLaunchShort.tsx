import { useEffect, useRef, useState } from "react";
import { Mic, MousePointerClick, Pause, Play, RotateCcw } from "lucide-react";

type WakePhase = "sleeping" | "yellow" | "green" | "awake";

type Scene = {
  id: string;
  start: number;
  end: number;
  eyebrow: string;
  title: string[];
  support?: string;
};

const TOTAL_MS = 38_000;
const FADE_MS = 500;

const SCENES: Scene[] = [
  { id: "intro", start: 0, end: 5_000, eyebrow: "INTRODUCING", title: ["Braino"], support: "Your intelligent best friend for the web." },
  { id: "chat", start: 5_000, end: 16_000, eyebrow: "FEATURE 01", title: ["Chat with", "any page."], support: "Ask. Explain. Simplify. Understand." },
  { id: "audio", start: 16_000, end: 25_000, eyebrow: "FEATURE 02", title: ["Lectures &", "audio, simplified."], support: "Braino listens with you — and takes the notes." },
  { id: "agent", start: 25_000, end: 33_000, eyebrow: "FEATURE 03", title: ["Agent", "Mode."], support: "Talk to it in real time. It handles the rest." },
  { id: "outro", start: 33_000, end: 38_000, eyebrow: "trybraino.com", title: ["Braino"], support: "Your best friend for the web." },
];

function clamp(v: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, v));
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function sceneOpacity(scene: Scene, elapsed: number) {
  if (elapsed < scene.start - FADE_MS || elapsed > scene.end + FADE_MS) return 0;
  if (elapsed < scene.start) return clamp((elapsed - (scene.start - FADE_MS)) / FADE_MS);
  if (elapsed > scene.end) return clamp(((scene.end + FADE_MS) - elapsed) / FADE_MS);
  return 1;
}

function sceneProgress(scene: Scene, elapsed: number) {
  return clamp((elapsed - scene.start) / (scene.end - scene.start));
}

const CSS = `
body.ls-active {
  background: #050302;
  overflow: hidden;
}
body.ls-active #sb-brain-mascot-wrapper {
  display: none !important;
}

@keyframes lsRingExpand {
  0%   { transform: scale(0.55); opacity: 0.9; }
  100% { transform: scale(3.2);  opacity: 0; }
}
@keyframes lsFloat {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-7px); }
}
@keyframes lsBlink {
  0%, 90%, 100% { transform: scaleY(1); }
  94%           { transform: scaleY(0.06); }
}
@keyframes lsWave {
  0%, 100% { transform: scaleY(0.28); }
  50%      { transform: scaleY(1); }
}
@keyframes lsPulse {
  0%, 100% { transform: scale(1);    opacity: 0.82; }
  50%      { transform: scale(1.09); opacity: 1; }
}
@keyframes lsGlowPulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.06); }
}
@keyframes lsShimmer {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes lsCursorFloat {
  0%   { transform: translate(0px,  0px); }
  30%  { transform: translate(22px, 14px); }
  65%  { transform: translate(-6px, 28px); }
  100% { transform: translate(0px,  0px); }
}
@keyframes lsTickerIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── SHELL + FRAME ────────────────────────────── */
.ls-shell {
  position: fixed;
  inset: 0;
  background: #050302;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ls-frame {
  position: relative;
  width: min(100vw, calc(100dvh * 16 / 9));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #080604;
}
.ls-scene-layer {
  position: absolute;
  inset: 0;
  will-change: opacity, transform;
}

/* ── LOGO BADGE ───────────────────────────────── */
.ls-logo-badge {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 10;
  pointer-events: none;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px 5px 7px;
  border-radius: 99px;
  background: rgba(8,6,4,0.72);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: rgba(250,248,245,0.82);
  font-size: clamp(10px, 0.78vw, 14px);
  font-weight: 600;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: -0.01em;
}

/* ── INTRO SCENE ──────────────────────────────── */
.ls-intro-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 40%, rgba(226,125,57,0.26) 0%, rgba(226,125,57,0.06) 36%, transparent 60%),
    radial-gradient(circle at 18% 78%, rgba(180,80,40,0.10) 0%, transparent 36%),
    #080604;
}
.ls-intro-rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -10%;
  pointer-events: none;
}
.ls-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid rgba(226,125,57,0.38);
  width: 200px; height: 200px;
  animation: lsRingExpand 3s ease-out infinite;
}
.ls-ring:nth-child(2) { animation-delay: 1s; }
.ls-ring:nth-child(3) { animation-delay: 2s; }

/* ── CHAT SCENE ───────────────────────────────── */
.ls-chat-left {
  position: absolute;
  inset: 0 50% 0 0;
  background: #faf9f7;
  display: flex;
  flex-direction: column;
}
.ls-chat-right {
  position: absolute;
  inset: 0 0 0 50%;
  background: #0d0b09;
  display: flex;
  flex-direction: column;
  padding: clamp(12px, 1.4vw, 22px);
  gap: 8px;
}
.ls-chat-split-glow {
  position: absolute;
  left: 50%;
  top: 0; bottom: 0;
  width: 2px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, transparent 0%, rgba(226,125,57,0.35) 40%, rgba(226,125,57,0.35) 60%, transparent 100%);
  z-index: 2;
}
.ls-browser-chrome {
  height: 36px;
  flex-shrink: 0;
  background: rgba(0,0,0,0.055);
  border-bottom: 1px solid rgba(0,0,0,0.07);
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
}
.ls-browser-dots { display: flex; gap: 5px; }
.ls-browser-dots span { width: 8px; height: 8px; border-radius: 50%; }
.ls-browser-dots span:nth-child(1) { background: #ff5f57; }
.ls-browser-dots span:nth-child(2) { background: #febc2e; }
.ls-browser-dots span:nth-child(3) { background: #28c840; }
.ls-browser-url {
  flex: 1;
  height: 21px;
  border-radius: 99px;
  background: rgba(0,0,0,0.06);
  padding: 0 9px;
  display: flex;
  align-items: center;
  font-size: clamp(9px, 0.62vw, 11px);
  color: rgba(65,48,40,0.45);
  font-family: -apple-system, sans-serif;
}
.ls-article-body {
  flex: 1;
  padding: clamp(12px, 1.4vw, 22px);
  overflow: hidden;
}
.ls-article-line {
  border-radius: 99px;
  background: rgba(65,48,40,0.09);
  margin-bottom: 7px;
}
.ls-chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  flex-shrink: 0;
}
.ls-chat-bubble {
  padding: clamp(8px, 0.85vw, 12px) clamp(10px, 1vw, 14px);
  border-radius: 14px;
  font-size: clamp(10px, 0.8vw, 13.5px);
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.ls-chat-bubble-user {
  background: rgba(226,125,57,0.9);
  color: white;
  border-radius: 14px 14px 4px 14px;
  align-self: flex-end;
  max-width: 82%;
}
.ls-chat-bubble-braino {
  background: rgba(255,255,255,0.055);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px 14px 14px 4px;
  color: rgba(250,248,245,0.88);
  max-width: 92%;
}

/* ── AUDIO SCENE ──────────────────────────────── */
.ls-audio-bg {
  position: absolute;
  inset: 0;
  background: #0a0908;
}
.ls-video-area {
  position: absolute;
  top: 0; left: 0; right: 0;
  bottom: 40%;
  background: #000;
  overflow: hidden;
}
.ls-video-inner {
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, #1c140c 0%, #0c0a08 50%, #080604 100%);
}
.ls-video-tint {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 28% 28%, rgba(255,195,80,0.07), transparent 48%);
}
.ls-video-progress-track {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: rgba(255,255,255,0.12);
}
.ls-video-progress-fill {
  width: 38%;
  height: 100%;
  background: #f00;
}
.ls-play-btn {
  position: relative;
  z-index: 2;
  width: 48px; height: 48px;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: 1.5px solid rgba(255,255,255,0.24);
  display: flex;
  align-items: center;
  justify-content: center;
}
.ls-audio-notes {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  top: 60%;
  padding: clamp(10px, 1.1vw, 18px) clamp(14px, 1.8vw, 28px);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ls-wave-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 28px;
}
.ls-wave-bar {
  width: 4px;
  border-radius: 99px;
  background: linear-gradient(180deg, #f6b57f, #e27d39);
  transform-origin: bottom;
  animation: lsWave 0.9s ease-in-out infinite;
}
.ls-note-tags {
  display: flex;
  gap: 7px;
  flex-wrap: wrap;
}
.ls-note-tag {
  padding: 4px 11px;
  border-radius: 99px;
  background: rgba(226,125,57,0.13);
  border: 1px solid rgba(226,125,57,0.24);
  font-size: clamp(9px, 0.68vw, 12px);
  color: #f7d9c3;
  font-family: -apple-system, sans-serif;
}

/* ── AGENT SCENE ──────────────────────────────── */
.ls-agent-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 66% 34%, rgba(99,102,241,0.065), transparent 40%),
    radial-gradient(circle at 28% 68%, rgba(226,125,57,0.055), transparent 36%),
    #080604;
}
.ls-agent-left {
  position: absolute;
  inset: 0 57% 0 0;
  padding: clamp(16px, 2vw, 32px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(10px, 1.2vw, 18px);
}
.ls-agent-right {
  position: absolute;
  inset: 0 0 0 43%;
  padding: clamp(14px, 1.6vw, 26px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: clamp(8px, 0.9vw, 13px);
}
.ls-agent-cursor {
  position: absolute;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: rgba(226,125,57,0.92);
  border: 2px solid rgba(255,255,255,0.72);
  right: 22%;
  top: 26%;
  animation: lsCursorFloat 2.8s ease-in-out infinite;
  box-shadow: 0 0 16px rgba(226,125,57,0.5);
  z-index: 2;
}
.ls-trace-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: clamp(8px, 0.85vw, 12px) clamp(10px, 1vw, 14px);
  border-radius: 11px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
.ls-trace-row.active {
  background: rgba(226,125,57,0.09);
  border-color: rgba(226,125,57,0.22);
}
.ls-trace-num {
  width: 22px; height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(9px, 0.65vw, 11px);
  font-weight: 600;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(250,248,245,0.55);
  flex-shrink: 0;
}
.ls-trace-num.done {
  background: #e27d39;
  border-color: transparent;
  color: white;
}
.ls-trace-label {
  flex: 1;
  font-size: clamp(10px, 0.8vw, 13px);
  color: rgba(250,248,245,0.84);
}
.ls-trace-status {
  font-size: clamp(9px, 0.65vw, 11px);
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  color: rgba(250,248,245,0.38);
}
.ls-trace-status.live {
  color: #e27d39;
}

/* ── OUTRO SCENE ──────────────────────────────── */
.ls-outro-rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: -10%;
  pointer-events: none;
}
.ls-outro-ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(226,125,57,0.34);
  width: 180px; height: 180px;
  animation: lsRingExpand 2.5s ease-out infinite;
}
.ls-outro-ring:nth-child(2) { animation-delay: 0.83s; }
.ls-outro-ring:nth-child(3) { animation-delay: 1.66s; }

/* ── LOWER VIGNETTE ───────────────────────────── */
.ls-vignette {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 50%;
  background: linear-gradient(
    to top,
    rgba(8,6,4,0.96) 0%,
    rgba(8,6,4,0.82) 20%,
    rgba(8,6,4,0.46) 44%,
    rgba(8,6,4,0.14) 66%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 5;
}

/* ── TEXT OVERLAY ─────────────────────────────── */
.ls-text-zone {
  position: absolute;
  bottom: 64px;
  left: clamp(24px, 3vw, 52px);
  right: clamp(130px, 16vw, 260px);
  z-index: 6;
  pointer-events: none;
}
.ls-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 7px;
  font-size: clamp(9px, 0.65vw, 11px);
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: rgba(226,125,57,0.92);
}
.ls-eyebrow::before {
  content: '';
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #e27d39;
  box-shadow: 0 0 10px rgba(226,125,57,0.9);
  flex-shrink: 0;
}
.ls-headline {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  font-size: clamp(26px, 3.6vw, 64px);
  line-height: 1.0;
  letter-spacing: -0.04em;
  color: #faf8f5;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.ls-headline span { display: block; }
.ls-support {
  margin: 9px 0 0;
  font-size: clamp(11px, 0.95vw, 17px);
  color: rgba(250,248,245,0.58);
  letter-spacing: -0.01em;
  line-height: 1.45;
  max-width: 52ch;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* ── CONTROL BAR ──────────────────────────────── */
.ls-controls {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 7;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 clamp(14px, 1.8vw, 28px);
  background: rgba(8,6,4,0.8);
  border-top: 1px solid rgba(255,255,255,0.05);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.ls-ctrl-btn {
  appearance: none;
  border: none;
  cursor: pointer;
  width: 32px; height: 32px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  color: #faf8f5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, transform 0.15s ease;
  flex-shrink: 0;
}
.ls-ctrl-btn:hover {
  background: rgba(255,255,255,0.14);
  transform: scale(1.06);
}
.ls-progress-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ls-progress-track {
  position: relative;
  height: 3px;
  border-radius: 99px;
  background: rgba(255,255,255,0.1);
  cursor: pointer;
}
.ls-progress-fill {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #e27d39 0%, #f3a963 50%, #e27d39 100%);
  background-size: 200% 100%;
  animation: lsShimmer 3s linear infinite;
  transition: width 0.1s linear;
}
.ls-scene-dots {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.ls-scene-dot {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: clamp(8px, 0.58vw, 10px);
  font-family: 'SF Mono', monospace;
  letter-spacing: 0.05em;
  color: rgba(250,248,245,0.28);
  text-transform: uppercase;
  white-space: nowrap;
  transition: color 0.3s ease;
  flex-shrink: 0;
}
.ls-scene-dot.active {
  color: rgba(250,248,245,0.72);
}
.ls-scene-dot::before {
  content: '';
  width: 4px; height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.18);
  flex-shrink: 0;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.ls-scene-dot.active::before {
  background: #e27d39;
  box-shadow: 0 0 5px rgba(226,125,57,0.8);
}
.ls-timecode {
  font-size: clamp(9px, 0.7vw, 12px);
  font-family: 'SF Mono', 'JetBrains Mono', monospace;
  color: rgba(250,248,245,0.48);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── UTILITY CHIPS ────────────────────────────── */
.ls-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 99px;
  font-size: clamp(9px, 0.65vw, 11px);
  font-family: -apple-system, sans-serif;
}
.ls-chip-orange {
  background: rgba(226,125,57,0.14);
  border: 1px solid rgba(226,125,57,0.28);
  color: #f7d9c3;
}
.ls-chip-white {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  color: rgba(250,248,245,0.72);
}
`;

function BrainSVG({ phase, size = "100%" }: { phase: WakePhase; size?: string | number }) {
  const eyesOpen = phase === "green" || phase === "awake";
  const glow =
    phase === "yellow"
      ? "drop-shadow(0 0 24px rgba(255,210,50,1)) drop-shadow(0 0 48px rgba(255,175,0,0.6))"
      : phase === "green"
        ? "drop-shadow(0 0 24px rgba(80,230,110,1)) drop-shadow(0 0 48px rgba(40,180,70,0.6))"
        : "drop-shadow(0 3px 16px rgba(200,84,74,0.55)) drop-shadow(0 0 28px rgba(200,84,74,0.28))";
  const anim =
    phase === "yellow" || phase === "green"
      ? "lsPulse 0.88s ease-in-out infinite"
      : phase === "awake"
        ? "lsFloat 3s ease-in-out infinite"
        : "none";

  return (
    <div style={{ width: size, aspectRatio: "1", filter: glow, animation: anim, transition: "filter 0.5s ease" }}>
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="ls-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" />
            <stop offset="0.55" stopColor="#E8786E" />
            <stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <linearGradient id="ls-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9645A" />
            <stop offset="1" stopColor="#9C3E36" />
          </linearGradient>
          <radialGradient id="ls-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
        <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="white" transform="scale(1.08) translate(-3.7,-3.7)" />
        <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#ls-dark)" />
        <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#ls-dark)" />
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#ls-fill)" />
        <path d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z" fill="url(#ls-glow)" />
        <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#ls-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#ls-fill)" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#ls-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#ls-fill)" />
        <circle cx="38" cy="48" r="6.5" fill="white" />
        <circle cx="62" cy="48" r="6.5" fill="white" />
        {!eyesOpen ? (
          <>
            <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="38" cy="48" r="3.2" fill="#1B1713" style={{ animation: "lsBlink 4s ease-in-out infinite", transformOrigin: "38px 48px" }} />
            <circle cx="39" cy="46.6" r="1.1" fill="white" />
            <circle cx="62" cy="48" r="3.2" fill="#1B1713" style={{ animation: "lsBlink 4s ease-in-out infinite 0.1s", transformOrigin: "62px 48px" }} />
            <circle cx="63" cy="46.6" r="1.1" fill="white" />
          </>
        )}
        <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
        <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
        {!eyesOpen
          ? <path d="M 46 63 Q 50 61 54 63" fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round" />
          : <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
        }
      </svg>
    </div>
  );
}

function IntroScene({ progress }: { progress: number }) {
  const phase: WakePhase =
    progress < 0.22 ? "sleeping"
    : progress < 0.48 ? "yellow"
    : progress < 0.74 ? "green"
    : "awake";

  return (
    <>
      <div className="ls-intro-bg" />
      <div className="ls-intro-rings" aria-hidden="true">
        <div className="ls-ring" />
        <div className="ls-ring" />
        <div className="ls-ring" />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-10%" }}>
        <div style={{ width: "clamp(130px, 17%, 240px)", transform: `scale(${0.82 + progress * 0.18})`, opacity: clamp(0.3 + progress * 0.9) }}>
          <BrainSVG phase={phase} />
        </div>
      </div>
    </>
  );
}

function ChatScene() {
  const articleWidths = [65, 90, 94, 80, 96, 72, 88, 62, 84, 92, 74, 96, 68, 88, 58, 82, 90, 76];
  return (
    <>
      {/* Article side */}
      <div className="ls-chat-left">
        <div className="ls-browser-chrome">
          <div className="ls-browser-dots"><span /><span /><span /></div>
          <div className="ls-browser-url">techcrunch.com — Why pricing is hard</div>
        </div>
        <div className="ls-article-body">
          <div className="ls-article-line" style={{ height: 13, width: "62%", marginBottom: 9 }} />
          <div className="ls-article-line" style={{ height: 8, width: "36%", marginBottom: 20 }} />
          {articleWidths.map((w, i) => (
            <div key={i} className="ls-article-line" style={{ height: 6.5, width: `${w}%` }} />
          ))}
          <div style={{ marginTop: 14, padding: "7px 11px", borderRadius: 9, background: "rgba(226,125,57,0.07)", border: "1px solid rgba(226,125,57,0.16)", fontSize: "clamp(9px,0.65vw,11px)", color: "rgba(65,48,40,0.55)", fontFamily: "-apple-system,sans-serif", display: "inline-flex", alignItems: "center", gap: 5 }}>
            ✦ Article loaded
          </div>
        </div>
        {/* Braino input bar */}
        <div style={{ padding: "9px 12px", borderTop: "1px solid rgba(65,48,40,0.07)", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          <div style={{ flex: 1, height: 32, borderRadius: 99, background: "rgba(226,125,57,0.07)", border: "1px solid rgba(226,125,57,0.18)", display: "flex", alignItems: "center", padding: "0 13px", fontSize: "clamp(10px,0.72vw,12px)", color: "rgba(65,48,40,0.42)", fontFamily: "-apple-system,sans-serif" }}>
            Ask anything…
          </div>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e27d39", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 18, height: 18 }}><BrainSVG phase="awake" /></div>
          </div>
        </div>
      </div>

      {/* Divider glow */}
      <div className="ls-chat-split-glow" />

      {/* Brain at split */}
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "clamp(36px,4.2%,58px)", aspectRatio: "1", zIndex: 3, filter: "drop-shadow(0 0 18px rgba(226,125,57,0.55))" }}>
        <BrainSVG phase="awake" />
      </div>

      {/* Chat side */}
      <div className="ls-chat-right">
        <div className="ls-chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 18, height: 18 }}><BrainSVG phase="awake" /></div>
            <span style={{ fontSize: "clamp(10px,0.78vw,13px)", color: "#faf8f5", fontWeight: 600, fontFamily: "-apple-system,sans-serif" }}>Braino</span>
          </div>
          <span style={{ fontSize: "clamp(8px,0.6vw,10px)", color: "rgba(250,248,245,0.38)", fontFamily: "SF Mono,monospace" }}>page context ✦</span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <div className="ls-chat-bubble ls-chat-bubble-user">Can you explain this in simpler words?</div>
          <div className="ls-chat-bubble ls-chat-bubble-braino">
            <div style={{ fontSize: "clamp(9px,0.65vw,11px)", fontWeight: 600, color: "#faf8f5", marginBottom: 4 }}>Braino</div>
            Here's the simple version. The article compares three pricing models — the real tradeoff is setup time, not cost.
          </div>
        </div>

        <div style={{ padding: "7px 11px", borderRadius: 10, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.06)", fontSize: "clamp(9px,0.65vw,11px)", color: "rgba(250,248,245,0.28)", fontFamily: "-apple-system,sans-serif" }}>
          Follow up…
        </div>
      </div>
    </>
  );
}

function AudioScene() {
  return (
    <>
      <div className="ls-audio-bg" />
      {/* Video player */}
      <div className="ls-video-area">
        <div className="ls-video-inner" />
        <div className="ls-video-tint" />
        {/* Lecture chips */}
        <div style={{ position: "absolute", top: 12, left: 14, zIndex: 2 }}>
          <div className="ls-chip ls-chip-white">Lecture 14: Distributed Systems</div>
        </div>
        <div style={{ position: "absolute", top: 12, right: 14, zIndex: 2 }}>
          <div className="ls-chip ls-chip-orange">
            <Mic size={9} /> Braino listening
          </div>
        </div>
        {/* Play button */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
          <div className="ls-play-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="white"><path d="M3.5 2.5L13 8L3.5 13.5V2.5Z" /></svg>
          </div>
        </div>
        {/* Progress bar */}
        <div className="ls-video-progress-track">
          <div className="ls-video-progress-fill" />
        </div>
      </div>

      {/* Notes area */}
      <div className="ls-audio-notes">
        <div className="ls-wave-bars" aria-hidden="true">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="ls-wave-bar" style={{ height: `${10 + ((i * 7 + 3) % 20)}px`, animationDelay: `${i * 0.038}s` }} />
          ))}
        </div>
        <div className="ls-note-tags">
          {["✓ Key concepts extracted", "Summary drafted", "Study notes ready"].map((t) => (
            <div key={t} className="ls-note-tag">{t}</div>
          ))}
        </div>
      </div>
    </>
  );
}

function AgentScene() {
  const steps = [
    { label: "Open pricing page",        note: "Navigation confirmed",            status: "done" },
    { label: "Scan plan details",         note: "Comparing limits + features",     status: "done" },
    { label: "Match team requirements",   note: "Reviewing collaboration tier",    status: "active" },
    { label: "Return recommendation",     note: "Preparing answer",                status: "queued" },
  ] as const;

  return (
    <>
      <div className="ls-agent-bg" />

      {/* Left: command */}
      <div className="ls-agent-left">
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(226,125,57,0.16)", border: "1px solid rgba(226,125,57,0.34)", display: "flex", alignItems: "center", justifyContent: "center", animation: "lsGlowPulse 1.6s ease-in-out infinite" }}>
            <Mic size={11} style={{ color: "#f7d9c3" }} />
          </div>
          <span style={{ fontSize: "clamp(8px,0.6vw,10px)", fontFamily: "SF Mono,monospace", letterSpacing: "0.1em", color: "rgba(226,125,57,0.78)", textTransform: "uppercase" }}>Voice command</span>
        </div>

        <div style={{ padding: "clamp(10px,1.1vw,16px)", borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "clamp(11px,0.9vw,15px)", lineHeight: 1.55, color: "rgba(250,248,245,0.86)", fontFamily: "-apple-system,sans-serif" }}>
            "Open the pricing page, compare the plans, and find the best fit for a small remote team."
          </div>
        </div>

        <div className="ls-chip ls-chip-orange" style={{ display: "inline-flex" }}>
          <MousePointerClick size={9} />
          Braino can handle the clicks
        </div>
      </div>

      {/* Right: trace */}
      <div className="ls-agent-right" style={{ position: "relative" }}>
        <div className="ls-agent-cursor" />
        <div style={{ fontSize: "clamp(8px,0.6vw,10px)", fontFamily: "SF Mono,monospace", letterSpacing: "0.09em", color: "rgba(250,248,245,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
          Agent working
        </div>
        {steps.map((item, i) => (
          <div key={item.label} className={`ls-trace-row${item.status === "active" ? " active" : ""}`}>
            <div className={`ls-trace-num${item.status === "done" ? " done" : ""}`}>
              {item.status === "done" ? "✓" : i + 1}
            </div>
            <div className="ls-trace-label">{item.label}</div>
            <span className={`ls-trace-status${item.status === "active" ? " live" : ""}`}>
              {item.status === "active" ? "live" : item.status}
            </span>
          </div>
        ))}
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
          <span style={{ fontSize: "clamp(8px,0.6vw,10px)", fontFamily: "SF Mono,monospace", color: "rgba(226,125,57,0.7)", letterSpacing: "0.06em" }}>Agent Mode active</span>
        </div>
      </div>
    </>
  );
}

function OutroScene({ progress }: { progress: number }) {
  return (
    <>
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(circle at 50% 42%, rgba(226,125,57,${(0.18 + progress * 0.18).toFixed(3)}) 0%, rgba(226,125,57,0.05) 34%, transparent 58%), #080604`,
      }} />
      <div className="ls-outro-rings" aria-hidden="true">
        <div className="ls-outro-ring" />
        <div className="ls-outro-ring" />
        <div className="ls-outro-ring" />
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "-10%" }}>
        <div style={{ width: "clamp(140px, 19%, 260px)", filter: "drop-shadow(0 0 36px rgba(226,125,57,0.52))" }}>
          <BrainSVG phase="awake" />
        </div>
      </div>
    </>
  );
}

export default function BrainoLaunchShort() {
  const elapsedRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [runNonce, setRunNonce] = useState(0);

  useEffect(() => {
    document.body.classList.add("ls-active");
    return () => document.body.classList.remove("ls-active");
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const startedAt = performance.now() - elapsedRef.current;
    const interval = window.setInterval(() => {
      const next = Math.min(TOTAL_MS, performance.now() - startedAt);
      elapsedRef.current = next;
      setElapsedMs(next);
      if (next >= TOTAL_MS) {
        window.clearInterval(interval);
        setIsPlaying(false);
      }
    }, 33);
    return () => window.clearInterval(interval);
  }, [isPlaying, runNonce]);

  const activeScene = SCENES.find((s) => elapsedMs >= s.start && elapsedMs < s.end) ?? SCENES[SCENES.length - 1];

  const restart = () => {
    elapsedRef.current = 0;
    setElapsedMs(0);
    setRunNonce((n) => n + 1);
    setIsPlaying(true);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ls-shell">
        <div className="ls-frame">

          {/* Scene layers */}
          {SCENES.map((scene) => {
            const opacity = sceneOpacity(scene, elapsedMs);
            const progress = sceneProgress(scene, elapsedMs);
            if (opacity === 0) return null;
            return (
              <div
                key={scene.id}
                className="ls-scene-layer"
                style={{ opacity, transform: `scale(${0.988 + opacity * 0.012})` }}
              >
                {scene.id === "intro"  && <IntroScene  progress={progress} />}
                {scene.id === "chat"   && <ChatScene />}
                {scene.id === "audio"  && <AudioScene />}
                {scene.id === "agent"  && <AgentScene />}
                {scene.id === "outro"  && <OutroScene  progress={progress} />}
              </div>
            );
          })}

          {/* Logo badge */}
          <div className="ls-logo-badge">
            <div style={{ width: 18, height: 18 }}><BrainSVG phase="awake" /></div>
            Braino
          </div>

          {/* Lower gradient for text readability */}
          <div className="ls-vignette" />

          {/* Text overlay */}
          <div className="ls-text-zone">
            <div className="ls-eyebrow">{activeScene.eyebrow}</div>
            <h1 className="ls-headline">
              {activeScene.title.map((line) => <span key={line}>{line}</span>)}
            </h1>
            {activeScene.support && <p className="ls-support">{activeScene.support}</p>}
          </div>

          {/* Controls */}
          <div className="ls-controls">
            <button className="ls-ctrl-btn" type="button" onClick={() => setIsPlaying((p) => !p)} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button className="ls-ctrl-btn" type="button" onClick={restart} aria-label="Restart">
              <RotateCcw size={13} />
            </button>

            <div className="ls-progress-area">
              <div className="ls-progress-track">
                <div className="ls-progress-fill" style={{ width: `${(elapsedMs / TOTAL_MS) * 100}%` }} />
              </div>
              <div className="ls-scene-dots">
                {SCENES.map((s) => (
                  <div key={s.id} className={`ls-scene-dot${s.id === activeScene.id ? " active" : ""}`}>
                    {s.eyebrow}
                  </div>
                ))}
              </div>
            </div>

            <div className="ls-timecode">{formatTime(elapsedMs)} / {formatTime(TOTAL_MS)}</div>
          </div>

        </div>
      </div>
    </>
  );
}
