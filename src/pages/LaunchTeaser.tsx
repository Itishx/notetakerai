import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  CheckCheck,
  Headphones,
  Mic,
  MousePointerClick,
  Pause,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Video,
} from "lucide-react";

type WakePhase = "sleeping" | "yellow" | "green" | "awake";

type Scene = {
  id: string;
  start: number;
  end: number;
  label: string;
  eyebrow: string;
  title: string[];
  support?: string;
  voiceover: string;
};

const TOTAL_DURATION_MS = 78_000; // fallback — real duration comes from onLoadedMetadata
const FADE_MS = 650;

const SCENES: Scene[] = [
  {
    id: "intro",
    start: 0,
    end: 4_000,
    label: "0:00-0:04",
    eyebrow: "INTRO",
    title: ["Introducing", "Braino"],
    support: "A premium mascot-led reveal, built from the product UI.",
    voiceover: "Introducing Braino — your intelligent best friend for the web.",
  },
  {
    id: "tab",
    start: 4_000,
    end: 10_000,
    label: "0:04-0:10",
    eyebrow: "IN YOUR TAB",
    title: ["Your best friend", "for the web."],
    support: "Braino lives inside the tab and keeps track of the page context with you.",
    voiceover:
      "When you open a webpage, Braino lives right there inside your tab. It understands what you're looking at, what you're reading, and what you need help with.",
  },
  {
    id: "chat",
    start: 10_000,
    end: 20_000,
    label: "0:10-0:20",
    eyebrow: "FEATURE 01",
    title: ["Chat with", "any page."],
    support: "\"Here's the simple version.\"",
    voiceover:
      "You can chat with any page. Ask Braino to explain it, summarize it, simplify confusing parts, or help you understand what the page is really saying.",
  },
  {
    id: "audio",
    start: 20_000,
    end: 30_000,
    label: "0:20-0:30",
    eyebrow: "FEATURE 02",
    title: ["Lectures & audio,", "simplified."],
    support: "\"Key points. Summary. Notes.\"",
    voiceover:
      "When you're watching a lecture or listening to audio, Braino listens with you. It captures the key points, turns them into clean notes, and helps you learn faster without drowning in information.",
  },
  {
    id: "meetings",
    start: 30_000,
    end: 39_000,
    label: "0:30-0:39",
    eyebrow: "FEATURE 03",
    title: ["Meetings that", "remember themselves."],
    support: "\"Summary ready. Action items found.\"",
    voiceover:
      "During meetings and calls, Braino keeps track of what matters. It follows the conversation, remembers the important points, and gives you summaries, decisions, and action items when the call ends.",
  },
  {
    id: "agent",
    start: 39_000,
    end: 48_000,
    label: "0:39-0:48",
    eyebrow: "FEATURE 04",
    title: ["Agent", "Mode."],
    support: "\"Tell me what to do. I'll handle the clicks.\"",
    voiceover:
      "And when you switch on Agent Mode, Braino can do more than answer. You can talk to it in real time, and it can click, search, compare, navigate, and get things done for you.",
  },
  {
    id: "montage",
    start: 48_000,
    end: 53_000,
    label: "0:48-0:53",
    eyebrow: "FINAL MONTAGE",
    title: ["Everything,", "everywhere."],
    support: "Webpage. Lecture. Meeting. Video. Document. Product page.",
    voiceover:
      "So whether you're reading, learning, working, watching, or browsing, Braino is there with you.",
  },
  {
    id: "outro",
    start: 53_000,
    end: 56_000,
    label: "0:53-0:56",
    eyebrow: "LOGO ENDING",
    title: ["Braino"],
    support: "Your best friend for the web.",
    voiceover: "Braino. Your best friend for the web.",
  },
];

const LAUNCH_VIDEO_CSS = `
  body.sb-launch-video {
    background: #050505;
  }

  body.sb-launch-video #sb-brain-mascot-wrapper {
    display: none !important;
  }

  @keyframes lvFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes lvPulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.07); opacity: 1; }
  }

  @keyframes lvBlink {
    0%, 88%, 100% { transform: scaleY(1); }
    92% { transform: scaleY(0.09); }
  }

  @keyframes lvWave {
    0%, 100% { transform: scaleY(0.38); }
    50% { transform: scaleY(1); }
  }

  @keyframes lvCursorPulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(226,125,57,0.42); }
    50% { transform: scale(1.08); box-shadow: 0 0 0 14px rgba(226,125,57,0); }
  }

  @keyframes lvShimmer {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% 50%; }
  }

  .lv-shell {
    min-height: 100dvh;
    color: #fbf7f1;
    font-family: "NeueHaas", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background:
      radial-gradient(circle at 18% 12%, rgba(226,125,57,0.14), transparent 24%),
      radial-gradient(circle at 82% 16%, rgba(255,255,255,0.06), transparent 22%),
      radial-gradient(circle at 50% 100%, rgba(226,125,57,0.16), transparent 38%),
      #050505;
    overflow: hidden;
  }

  .lv-stage {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
    padding: 24px 28px 88px;
  }

  .lv-header {
    position: relative;
    z-index: 5;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;
  }

  .lv-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(12,12,12,0.68);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    font-family: "SF Mono", "JetBrains Mono", monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(251,247,241,0.7);
  }

  .lv-pill strong {
    color: #fbf7f1;
    font-weight: 600;
  }

  .lv-copy {
    position: relative;
    z-index: 5;
    flex-shrink: 0;
    width: min(480px, 100%);
    pointer-events: none;
    margin-bottom: 12px;
  }

  .lv-copy.centered {
    align-self: center;
    text-align: center;
    width: min(760px, 100%);
  }

  .lv-scene-tag {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    font-family: "SF Mono", "JetBrains Mono", monospace;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(251,247,241,0.72);
  }

  .lv-scene-tag::before {
    content: "";
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #e27d39;
    box-shadow: 0 0 14px rgba(226,125,57,0.7);
  }

  .lv-headline {
    margin: 12px 0 0;
    font-size: clamp(32px, 4vw, 60px);
    line-height: 1;
    letter-spacing: -0.04em;
    color: #fbf7f1;
    text-wrap: balance;
  }

  .lv-headline-line {
    display: block;
  }

  .lv-support {
    margin: 12px 0 0;
    max-width: 42ch;
    font-size: 15px;
    line-height: 1.55;
    color: rgba(251,247,241,0.68);
    letter-spacing: -0.015em;
  }

  .lv-copy.centered .lv-support {
    margin-left: auto;
    margin-right: auto;
  }

  .lv-canvas {
    position: relative;
    z-index: 1;
    flex: 1;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .lv-scene-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    transition: opacity 0.34s ease, transform 0.34s ease;
  }

  .lv-window {
    position: relative;
    width: min(860px, calc(100vw - 60px));
    border-radius: 22px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
      rgba(19,16,14,0.9);
    box-shadow:
      0 40px 100px rgba(0,0,0,0.42),
      0 0 0 1px rgba(255,255,255,0.04) inset;
  }

  .lv-window-compact {
    width: min(820px, calc(100vw - 60px));
  }

  .lv-window-top {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 18px;
    background: rgba(10,10,10,0.72);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .lv-window-dots {
    display: flex;
    gap: 8px;
  }

  .lv-window-dots span {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    opacity: 0.85;
  }

  .lv-window-dots span:nth-child(1) { background: #ff5f57; }
  .lv-window-dots span:nth-child(2) { background: #febc2e; }
  .lv-window-dots span:nth-child(3) { background: #28c840; }

  .lv-address {
    flex: 1;
    height: 34px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    color: rgba(251,247,241,0.62);
    font-size: 13px;
  }

  .lv-window-body {
    position: relative;
    min-height: 420px;
    padding: 20px;
    background:
      radial-gradient(circle at top left, rgba(226,125,57,0.08), transparent 30%),
      linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)),
      #12100e;
  }

  .lv-grid-2 {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 18px;
    height: 100%;
  }

  .lv-card {
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.04);
    box-shadow: 0 20px 60px rgba(0,0,0,0.22);
  }

  .lv-card-soft {
    background: rgba(251,247,241,0.06);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .lv-recording-wrap {
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.08);
    background: #0c0a09;
  }

  .lv-recording-wrap::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, rgba(10,10,10,0.06), rgba(10,10,10,0.4)),
      radial-gradient(circle at top right, rgba(226,125,57,0.08), transparent 28%);
    pointer-events: none;
  }

  .lv-recording {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.96) contrast(1.04);
  }

  .lv-brain-badge {
    position: absolute;
    right: 18px;
    bottom: 18px;
    width: 74px;
    height: 74px;
    padding: 6px;
    border-radius: 22px;
    background: rgba(14,11,10,0.8);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 18px 50px rgba(0,0,0,0.28);
  }

  .lv-status-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 999px;
    padding: 8px 12px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(251,247,241,0.75);
    font-size: 12px;
  }

  .lv-status-chip svg {
    width: 13px;
    height: 13px;
  }

  .lv-article {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 22px;
  }

  .lv-kicker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 18px;
  }

  .lv-line {
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
  }

  .lv-line-strong {
    background: linear-gradient(90deg, rgba(251,247,241,0.82), rgba(251,247,241,0.48));
  }

  .lv-glass-panel {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 20px;
    border-radius: 24px;
    background: rgba(18,14,12,0.72);
    border: 1px solid rgba(255,255,255,0.12);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .lv-message {
    align-self: flex-start;
    max-width: 88%;
    border-radius: 18px 18px 18px 6px;
    padding: 12px 14px;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .lv-message.user {
    align-self: flex-end;
    border-radius: 18px 18px 6px 18px;
    background: rgba(226,125,57,0.95);
    color: white;
  }

  .lv-message strong {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    letter-spacing: -0.02em;
  }

  .lv-message p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: inherit;
  }

  .lv-audio-top {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 18px;
    margin-bottom: 18px;
  }

  .lv-mini-video {
    position: relative;
    overflow: hidden;
    min-height: 152px;
  }

  .lv-mini-video::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(226,125,57,0.18), rgba(255,255,255,0.02));
    z-index: 1;
  }

  .lv-headphones {
    position: absolute;
    inset: 0;
    z-index: 2;
    pointer-events: none;
  }

  .lv-headphones::before {
    content: "";
    position: absolute;
    left: 50%;
    top: 22px;
    width: 84px;
    height: 42px;
    transform: translateX(-50%);
    border: 5px solid rgba(251,247,241,0.78);
    border-bottom: 0;
    border-radius: 84px 84px 0 0;
  }

  .lv-headphones::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at calc(50% - 48px) 72px, rgba(251,247,241,0.92) 0 13px, transparent 14px),
      radial-gradient(circle at calc(50% + 48px) 72px, rgba(251,247,241,0.92) 0 13px, transparent 14px);
  }

  .lv-wave {
    display: flex;
    align-items: end;
    gap: 6px;
    height: 56px;
    margin-top: 8px;
  }

  .lv-wave span {
    width: 8px;
    border-radius: 999px;
    background: linear-gradient(180deg, #f6b57f, #e27d39);
    transform-origin: center bottom;
    animation: lvWave 0.9s ease-in-out infinite;
  }

  .lv-note-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .lv-note-pill {
    padding: 11px 12px;
    border-radius: 14px;
    background: rgba(226,125,57,0.12);
    border: 1px solid rgba(226,125,57,0.2);
    color: #f7d9c3;
    font-size: 12px;
    letter-spacing: -0.01em;
  }

  .lv-meeting-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .lv-meeting-tile {
    position: relative;
    min-height: 160px;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
  }

  .lv-avatar {
    position: absolute;
    inset: auto auto 16px 16px;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(10,10,10,0.42);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(251,247,241,0.8);
    font-size: 12px;
  }

  .lv-avatar-dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.85;
  }

  .lv-summary-panel {
    position: absolute;
    right: 18px;
    bottom: 18px;
    width: min(320px, calc(100% - 36px));
    padding: 18px;
  }

  .lv-agent-grid {
    display: grid;
    grid-template-columns: 0.95fr 1.05fr;
    gap: 18px;
    height: 100%;
  }

  .lv-prompt {
    padding: 16px 18px;
    border-radius: 20px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .lv-trace {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 18px;
  }

  .lv-trace-step {
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255,255,255,0.045);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .lv-trace-step.active {
    background: rgba(226,125,57,0.12);
    border-color: rgba(226,125,57,0.25);
  }

  .lv-trace-step small {
    display: block;
    margin-top: 3px;
    color: rgba(251,247,241,0.46);
    font-size: 11px;
  }

  .lv-cursor {
    position: absolute;
    right: 24%;
    top: 34%;
    width: 24px;
    height: 24px;
    border-radius: 999px;
    background: rgba(226,125,57,0.96);
    border: 2px solid rgba(255,255,255,0.82);
    animation: lvCursorPulse 1.4s ease-in-out infinite;
    z-index: 2;
  }

  .lv-montage {
    width: min(1100px, calc(100vw - 56px));
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: 16px;
  }

  .lv-montage-card {
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(255,255,255,0.05);
    min-height: 170px;
    position: relative;
  }

  .lv-montage-card.wide {
    grid-column: span 7;
  }

  .lv-montage-card.tall {
    grid-column: span 5;
  }

  .lv-montage-card.medium {
    grid-column: span 4;
  }

  .lv-montage-center {
    position: absolute;
    inset: 50% auto auto 50%;
    transform: translate(-50%, -50%);
    width: 170px;
    height: 170px;
    z-index: 4;
    pointer-events: none;
  }

  .lv-outro {
    text-align: center;
  }

  .lv-outro-mark {
    width: 220px;
    height: 220px;
    margin: 0 auto;
    animation: lvPulse 1.8s ease-in-out infinite;
  }

  .lv-controls {
    position: absolute;
    left: 50%;
    bottom: 16px;
    z-index: 6;
    width: min(1020px, calc(100% - 56px));
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
    border-radius: 16px;
    background: rgba(8,8,8,0.82);
    border: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }

  .lv-controls-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lv-button {
    appearance: none;
    border: 0;
    cursor: pointer;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fbf7f1;
    background: rgba(255,255,255,0.08);
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .lv-button:hover {
    transform: translateY(-1px);
    background: rgba(255,255,255,0.12);
  }

  .lv-progress-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .lv-progress {
    position: relative;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: rgba(255,255,255,0.08);
  }

  .lv-progress-fill {
    position: absolute;
    inset: 0 auto 0 0;
    border-radius: inherit;
    background: linear-gradient(90deg, #e27d39, #f3aa63, #fbf7f1);
    background-size: 180% 180%;
    animation: lvShimmer 4s linear infinite;
  }

  .lv-markers {
    display: flex;
    align-items: center;
    gap: 4px;
    overflow: hidden;
  }

  .lv-marker {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 7px;
    border-radius: 999px;
    background: transparent;
    color: rgba(251,247,241,0.35);
    font-family: "SF Mono", "JetBrains Mono", monospace;
    font-size: 9px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .lv-marker.active {
    color: #fbf7f1;
    background: rgba(255,255,255,0.08);
  }

  .lv-timecode {
    font-family: "SF Mono", "JetBrains Mono", monospace;
    font-size: 12px;
    color: rgba(251,247,241,0.58);
  }

  @media (max-width: 960px) {
    .lv-stage {
      padding: 16px 16px 96px;
    }

    .lv-copy {
      width: 100%;
    }

    .lv-copy.centered {
      width: 100%;
    }

    .lv-canvas {
      align-items: flex-start;
      padding-top: 8px;
    }

    .lv-window,
    .lv-window-compact,
    .lv-montage {
      width: calc(100vw - 32px);
    }

    .lv-window-body {
      min-height: 380px;
      padding: 14px;
    }

    .lv-grid-2,
    .lv-agent-grid,
    .lv-audio-top {
      grid-template-columns: 1fr;
    }

    .lv-meeting-grid {
      grid-template-columns: 1fr;
    }

    .lv-note-grid {
      grid-template-columns: 1fr;
    }

    .lv-summary-panel {
      position: relative;
      right: auto;
      bottom: auto;
      width: 100%;
      margin-top: 12px;
    }

    .lv-controls {
      width: calc(100% - 32px);
      bottom: 12px;
      flex-direction: column;
      align-items: stretch;
    }

    .lv-montage {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .lv-montage-card.wide,
    .lv-montage-card.tall,
    .lv-montage-card.medium {
      grid-column: span 1;
    }

    .lv-montage-center {
      width: 110px;
      height: 110px;
    }
  }
`;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function formatTime(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sceneOpacity(scene: Scene, elapsedMs: number) {
  if (elapsedMs < scene.start - FADE_MS || elapsedMs > scene.end + FADE_MS) {
    return 0;
  }

  if (elapsedMs < scene.start) {
    return clamp((elapsedMs - (scene.start - FADE_MS)) / FADE_MS);
  }

  if (elapsedMs > scene.end) {
    return clamp(((scene.end + FADE_MS) - elapsedMs) / FADE_MS);
  }

  return 1;
}

function sceneProgress(scene: Scene, elapsedMs: number) {
  return clamp((elapsedMs - scene.start) / (scene.end - scene.start));
}

function currentSceneFor(elapsedMs: number) {
  return SCENES.find((scene) => elapsedMs >= scene.start && elapsedMs < scene.end) ?? SCENES[SCENES.length - 1];
}

function BrainSVG({ phase }: { phase: WakePhase }) {
  const eyesOpen = phase === "green" || phase === "awake";
  const pulsing = phase === "yellow" || phase === "green";
  const floating = phase === "awake";

  const glowFilter =
    phase === "yellow"
      ? "drop-shadow(0 0 28px rgba(255,210,50,1)) drop-shadow(0 0 56px rgba(255,175,0,0.65))"
      : phase === "green"
        ? "drop-shadow(0 0 28px rgba(80,230,110,1)) drop-shadow(0 0 56px rgba(40,180,70,0.65))"
        : "drop-shadow(0 4px 18px rgba(200,84,74,0.6)) drop-shadow(0 0 32px rgba(200,84,74,0.3))";

  return (
    <div
      style={{
        filter: glowFilter,
        animation: pulsing ? "lvPulse 0.85s ease-in-out infinite" : floating ? "lvFloat 3s ease-in-out infinite" : "none",
        transition: "filter 0.6s ease",
        width: "100%",
        height: "100%",
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%", overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="lt-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" />
            <stop offset="0.55" stopColor="#E8786E" />
            <stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <linearGradient id="lt-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D9645A" />
            <stop offset="1" stopColor="#9C3E36" />
          </linearGradient>
          <radialGradient id="lt-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" />
            <stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M 60 78 C 64 84 75 86 80 80 C 86 76 85 67 81 65 L 62 65 Z" fill="white" />
        <path d="M 47 82 L 47 90 Q 50 93 53 90 L 53 82 Z" fill="white" />
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" />
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="white"
          transform="scale(1.08) translate(-3.7,-3.7)"
        />
        <path d="M 47 80 L 47 88 Q 50 91 53 88 L 53 80 Z" fill="url(#lt-dark)" />
        <path d="M 60 76 C 64 82 73 84 78 78 C 84 74 83 67 79 65 L 62 65 Z" fill="url(#lt-dark)" />
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#lt-fill)"
        />
        <path
          d="M 50 8 C 55 6 64 6 68 12 C 76 10 84 16 82 24 C 90 26 92 36 86 42 C 92 46 90 56 82 58 C 86 60 85 70 76 70 C 72 78 60 80 52 76 C 50 80 50 80 50 78 C 50 80 50 80 48 76 C 40 80 28 78 24 70 C 15 70 14 60 18 58 C 10 56 8 46 14 42 C 8 36 10 26 18 24 C 16 16 24 10 32 12 C 36 6 45 6 50 8 Z"
          fill="url(#lt-glow)"
        />
        <path d="M 50 8 Q 49 30 50 50 Q 51 65 50 78" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.55" />
        <path d="M 30 14 Q 26 22 30 28 Q 24 33 28 40 Q 22 44 26 52 Q 22 58 28 64 Q 24 70 32 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 38 12 Q 36 22 42 26 Q 38 32 44 36 Q 38 44 44 50 Q 38 58 44 64 Q 40 72 46 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 70 14 Q 74 22 70 28 Q 76 33 72 40 Q 78 44 74 52 Q 78 58 72 64 Q 76 70 68 72" fill="none" stroke="#8A2F28" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        <path d="M 62 12 Q 64 22 58 26 Q 62 32 56 36 Q 62 44 56 50 Q 62 58 56 64 Q 60 72 54 74" fill="none" stroke="#8A2F28" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
        <path d="M 22 52 Q 8 50 6 60 Q 6 66 14 67" fill="none" stroke="url(#lt-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="6" cy="63" r="5.5" fill="url(#lt-fill)" />
        <path d="M 78 52 Q 92 50 94 60 Q 94 66 86 67" fill="none" stroke="url(#lt-fill)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="94" cy="63" r="5.5" fill="url(#lt-fill)" />
        <circle cx="38" cy="48" r="6.5" fill="white" />
        <circle cx="62" cy="48" r="6.5" fill="white" />
        {!eyesOpen ? (
          <>
            <path d="M 31.5 48 Q 38 54 44.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 55.5 48 Q 62 54 68.5 48" fill="none" stroke="#1B1713" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="38" cy="48" r="3.2" fill="#1B1713" style={{ animation: "lvBlink 4s ease-in-out infinite", transformOrigin: "38px 48px" }} />
            <circle cx="39" cy="46.6" r="1.1" fill="white" />
            <circle cx="62" cy="48" r="3.2" fill="#1B1713" style={{ animation: "lvBlink 4s ease-in-out infinite 0.1s", transformOrigin: "62px 48px" }} />
            <circle cx="63" cy="46.6" r="1.1" fill="white" />
          </>
        )}
        <ellipse cx="28" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
        <ellipse cx="72" cy="58" rx="3.5" ry="2" fill="#E14A48" opacity="0.35" />
        {!eyesOpen ? (
          <path d="M 46 63 Q 50 61 54 63" fill="none" stroke="#1B1713" strokeWidth="1.5" strokeLinecap="round" />
        ) : (
          <path d="M 45 61 Q 50 65 55 61" fill="none" stroke="#1B1713" strokeWidth="1.8" strokeLinecap="round" />
        )}
      </svg>
    </div>
  );
}

function BrowserWindow({
  children,
  compact = false,
  title = "trybraino.com",
}: {
  children: ReactNode;
  compact?: boolean;
  title?: string;
}) {
  return (
    <div className={`lv-window${compact ? " lv-window-compact" : ""}`}>
      <div className="lv-window-top">
        <div className="lv-window-dots">
          <span />
          <span />
          <span />
        </div>
        <div className="lv-address">
          <span>{title}</span>
          <Sparkles aria-hidden="true" />
        </div>
      </div>
      <div className="lv-window-body">{children}</div>
    </div>
  );
}

function BrainoBar({ value = "Ask anything…" }: { value?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: "rgba(255,251,247,0.96)",
      borderRadius: 100,
      padding: "7px 7px 7px 18px",
      border: "1px solid rgba(65,48,40,0.1)",
      boxShadow: "0 8px 28px rgba(27,23,19,0.13), 0 2px 8px rgba(27,23,19,0.07)",
      backdropFilter: "blur(20px)",
      width: 248, maxWidth: "calc(100% - 72px)",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <span style={{ flex: 1, fontSize: 13, color: "#A79B92", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {value}
      </span>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#E8786E", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>›</div>
    </div>
  );
}

function BrainoCard({ query, response, children }: { query?: string; response?: string; children?: ReactNode }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.08)",
      borderRadius: 24,
      border: "1px solid rgba(255,255,255,0.22)",
      boxShadow: "0 40px 100px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)",
      backdropFilter: "blur(40px) saturate(180%)",
      color: "white",
      overflow: "hidden",
      width: "100%",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, padding: "12px 14px 4px" }}>
        {["Speak", "Copy", "×"].map((btn) => (
          <button key={btn} style={{
            border: "none", background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)",
            height: 26, padding: "0 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "default",
            fontFamily: "inherit",
          }}>{btn}</button>
        ))}
      </div>
      <div style={{ padding: "4px 22px 16px" }}>
        {query && (
          <div style={{
            background: "rgba(255,255,255,0.1)", borderRadius: "12px 12px 12px 4px",
            padding: "9px 13px", marginBottom: 12, fontSize: 13,
            color: "rgba(255,255,255,0.68)", lineHeight: 1.5,
          }}>{query}</div>
        )}
        {response && <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,0.92)" }}>{response}</p>}
        {children}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.1)", fontSize: 12, color: "rgba(255,255,255,0.38)" }}>
        Follow up…
      </div>
    </div>
  );
}

function BrainoRoot({ barValue, children }: { barValue?: string; children?: ReactNode }) {
  return (
    <div style={{
      position: "absolute", bottom: 14, right: 14,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8,
      zIndex: 4, pointerEvents: "none",
    }}>
      {children}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {barValue !== undefined && <BrainoBar value={barValue} />}
        <div style={{ width: 52, height: 52, flexShrink: 0, filter: "drop-shadow(0 2px 10px rgba(200,84,74,0.5))" }}>
          <BrainSVG phase="awake" />
        </div>
      </div>
    </div>
  );
}

function IntroVisual({ progress }: { progress: number }) {
  const phase: WakePhase = progress < 0.3 ? "sleeping" : progress < 0.55 ? "yellow" : progress < 0.78 ? "green" : "awake";

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: 240,
          height: 240,
          margin: "0 auto",
          transform: `scale(${0.84 + progress * 0.16})`,
          opacity: clamp(0.4 + progress * 0.8),
        }}
      >
        <BrainSVG phase={phase} />
      </div>
      <div
        style={{
          marginTop: 26,
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.09)",
          background: "rgba(255,255,255,0.05)",
          color: "rgba(251,247,241,0.68)",
          fontSize: 12,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#e27d39",
            boxShadow: "0 0 18px rgba(226,125,57,0.82)",
          }}
        />
        Soft orange glow · browser tab wake-up
      </div>
    </div>
  );
}

function TabVisual() {
  return (
    <BrowserWindow title="medium.com — The state of AI in 2025">
      <div style={{ position: "relative", background: "#faf9f7", minHeight: 420, padding: "28px 32px", overflow: "hidden" }}>
        <div style={{ maxWidth: 500, margin: "0 auto" }}>
          <div style={{ height: 13, background: "rgba(65,48,40,0.15)", borderRadius: 99, width: "68%", marginBottom: 12 }} />
          <div style={{ height: 8, background: "rgba(65,48,40,0.07)", borderRadius: 99, width: "38%", marginBottom: 24 }} />
          {[90, 96, 82, 88, 75, 93, 71, 85, 96, 62, 88, 74].map((w, i) => (
            <div key={i} style={{ height: 7, background: "rgba(65,48,40,0.09)", borderRadius: 99, width: `${w}%`, marginBottom: 11 }} />
          ))}
        </div>
        <div style={{
          position: "absolute", top: 14, left: 14,
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "6px 10px", borderRadius: 999,
          background: "rgba(226,125,57,0.1)", border: "1px solid rgba(226,125,57,0.22)",
          fontSize: 11, color: "rgba(65,48,40,0.7)",
          fontFamily: "-apple-system, sans-serif",
        }}>
          <Search size={10} />
          Page context locked
        </div>
        <BrainoRoot barValue="Ask anything…" />
      </div>
    </BrowserWindow>
  );
}

function ChatVisual() {
  return (
    <BrowserWindow title="techcrunch.com - Why pricing is hard">
      <div style={{ position: "relative", background: "#faf9f7", minHeight: 420, display: "grid", gridTemplateColumns: "1.1fr 0.9fr" }}>
        <div style={{ padding: "24px 20px 24px 24px", borderRight: "1px solid rgba(65,48,40,0.07)" }}>
          <div style={{ height: 13, background: "rgba(65,48,40,0.15)", borderRadius: 99, width: "72%", marginBottom: 10 }} />
          <div style={{ height: 8, background: "rgba(65,48,40,0.07)", borderRadius: 99, width: "40%", marginBottom: 20 }} />
          {[90, 96, 82, 94, 76, 88, 70, 92, 66, 84, 78].map((w, i) => (
            <div key={i} style={{ height: 7, background: "rgba(65,48,40,0.09)", borderRadius: 99, width: `${w}%`, marginBottom: 11 }} />
          ))}
          <div style={{
            marginTop: 18, padding: "9px 12px", borderRadius: 10,
            background: "rgba(226,125,57,0.08)", border: "1px solid rgba(226,125,57,0.18)",
            fontSize: 11, color: "rgba(65,48,40,0.55)", fontFamily: "-apple-system, sans-serif",
          }}>✦ Article loaded</div>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column" }}>
          <BrainoCard
            query="Can you explain this in simpler words?"
            response="Here's the simple version. The page compares three pricing models — the real tradeoff is setup time, not cost."
          />
        </div>
        <BrainoRoot barValue="Follow up…" />
      </div>
    </BrowserWindow>
  );
}

function AudioVisual() {
  return (
    <BrowserWindow title="youtube.com — Lecture 14: Distributed Systems">
      <div style={{ position: "relative", background: "#0f0f0f", minHeight: 420 }}>
        <div style={{ background: "#000", height: 220, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={22} style={{ color: "white", marginLeft: 3 }} />
          </div>
          <div style={{
            position: "absolute", top: 12, right: 12,
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "6px 10px", borderRadius: 999,
            background: "rgba(14,11,9,0.84)", border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 11, color: "rgba(255,255,255,0.88)",
            backdropFilter: "blur(12px)",
            fontFamily: "-apple-system, sans-serif",
          }}>
            <Mic size={10} />
            Braino listening
          </div>
          <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 99 }}>
            <div style={{ width: "38%", height: "100%", background: "#ff0000", borderRadius: 99 }} />
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {["Key concepts extracted", "Summary drafted", "Study notes ready"].map((t) => (
              <div key={t} style={{ padding: "5px 11px", borderRadius: 99, background: "rgba(226,125,57,0.14)", border: "1px solid rgba(226,125,57,0.25)", fontSize: 11, color: "#f7d9c3", fontFamily: "-apple-system, sans-serif" }}>{t}</div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 32 }}>
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} style={{ width: 4, borderRadius: 99, height: `${12 + ((i * 7) % 18)}px`, background: "linear-gradient(180deg, #f6b57f, #e27d39)", animation: "lvWave 0.9s ease-in-out infinite", animationDelay: `${i * 0.055}s` }} />
            ))}
          </div>
        </div>
        <BrainoRoot barValue="What were the key takeaways?" />
      </div>
    </BrowserWindow>
  );
}

function MeetingsVisual() {
  return (
    <BrowserWindow title="braino.ai / meeting memory">
      <div className="lv-meeting-grid">
        {[
          { name: "Ananya · PM", tint: "linear-gradient(135deg, #32261f, #47352c)", dot: "#e27d39" },
          { name: "Ravi · Sales", tint: "linear-gradient(135deg, #1d2831, #314150)", dot: "#79a3d8" },
          { name: "Mina · Design", tint: "linear-gradient(135deg, #1d3028, #2f4d40)", dot: "#62c58a" },
          { name: "Kai · Eng", tint: "linear-gradient(135deg, #2c1f26, #53333f)", dot: "#d78098" },
        ].map((tile) => (
          <div key={tile.name} className="lv-meeting-tile" style={{ background: tile.tint }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 999,
                  background: `${tile.dot}33`,
                  border: `1px solid ${tile.dot}66`,
                  boxShadow: `0 0 40px ${tile.dot}22`,
                }}
              />
            </div>
            <div className="lv-avatar" style={{ color: tile.dot }}>
              <span className="lv-avatar-dot" />
              <span>{tile.name}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="lv-summary-panel" style={{ padding: 0 }}>
        <BrainoCard>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ padding: "5px 10px", borderRadius: 99, background: "rgba(226,125,57,0.2)", border: "1px solid rgba(226,125,57,0.3)", fontSize: 11, color: "#f7d9c3", fontFamily: "-apple-system, sans-serif" }}>✓ Summary ready</div>
            <div style={{ padding: "5px 10px", borderRadius: 99, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 11, color: "rgba(255,255,255,0.7)", fontFamily: "-apple-system, sans-serif" }}>✦ Action items found</div>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}><strong style={{ color: "white" }}>Decisions:</strong> Ship the new launch page first. Keep voice mode in the hero narrative.</p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "rgba(255,255,255,0.88)" }}><strong style={{ color: "white" }}>Action items:</strong> Ananya finalizes script, Ravi preps launch list, Kai wires the product proof.</p>
        </BrainoCard>
      </div>
    </BrowserWindow>
  );
}

function AgentVisual() {
  return (
    <BrowserWindow compact title="braino.ai / agent mode">
      <div className="lv-agent-grid">
        <div className="lv-card" style={{ padding: 18, position: "relative", overflow: "hidden", background: "#faf9f7" }}>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="lv-prompt">
              <div style={{ fontSize: 12, color: "rgba(251,247,241,0.48)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Real-time command
              </div>
              <div style={{ fontSize: 15, color: "#1a1208", lineHeight: 1.5 }}>
                "Open the pricing page, compare the plans, and shortlist the best fit for a small remote team."
              </div>
            </div>
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span className="lv-status-chip" style={{ background: "rgba(65,48,40,0.07)", border: "1px solid rgba(65,48,40,0.12)", color: "rgba(65,48,40,0.7)" }}>
                <MousePointerClick aria-hidden="true" size={12} />
                Braino can handle the clicks
              </span>
            </div>
          </div>
        </div>

        <div className="lv-card" style={{ padding: 18, position: "relative" }}>
          <div className="lv-cursor" />
          <div className="lv-trace">
            {[
              { step: "Open pricing page", note: "Navigation confirmed", done: true },
              { step: "Scan plan details", note: "Comparing limits + features", done: true },
              { step: "Search for team fit", note: "Reviewing collaboration features", done: false, active: true },
              { step: "Return recommendation", note: "Preparing answer", done: false },
            ].map((item, index) => (
              <div key={item.step} className={`lv-trace-step${item.active ? " active" : ""}`}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: item.done ? "#e27d39" : item.active ? "rgba(226,125,57,0.18)" : "rgba(255,255,255,0.06)",
                    border: item.active ? "1px solid rgba(226,125,57,0.4)" : "1px solid rgba(255,255,255,0.06)",
                    color: item.done ? "white" : "#f7d9c3",
                    fontSize: 12,
                  }}
                >
                  {item.done ? "✓" : index + 1}
                </div>
                <div style={{ color: "#fbf7f1", fontSize: 14 }}>
                  {item.step}
                  <small>{item.note}</small>
                </div>
                <span className="lv-timecode">{item.done ? "done" : item.active ? "live" : "queued"}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span className="lv-status-chip">
              <Mic aria-hidden="true" />
              Talk to Braino in real time
            </span>
            <span className="lv-timecode">Agent Mode active</span>
          </div>
        </div>
      </div>
    </BrowserWindow>
  );
}

function MontageVisual() {
  return (
    <div className="lv-montage">
      <div className="lv-montage-card wide" style={{ background: "#faf9f7", padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[72, 92, 80, 95, 68, 88].map((w, i) => (
            <div key={i} style={{ height: 7, background: "rgba(65,48,40,0.1)", borderRadius: 99, width: `${w}%` }} />
          ))}
        </div>
        <BrainoRoot barValue="Summarize this page" />
      </div>
      <div className="lv-montage-card tall" style={{ padding: 16 }}>
        <div className="lv-glass-panel" style={{ height: "100%" }}>
          <span className="lv-status-chip">
            <CheckCheck aria-hidden="true" />
            Chat with any page
          </span>
          <div className="lv-message user">
            <strong>User</strong>
            <p>Summarize this product page.</p>
          </div>
          <div className="lv-message">
            <strong>Braino</strong>
            <p>Clear answer, fewer tabs, faster understanding.</p>
          </div>
        </div>
      </div>
      <div className="lv-montage-card medium" style={{ padding: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <span className="lv-status-chip">
            <Headphones aria-hidden="true" />
            Learn with it
          </span>
          <div className="lv-wave" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span
                key={index}
                style={{
                  height: `${20 + ((index * 12) % 26)}px`,
                  animationDelay: `${index * 0.07}s`,
                }}
              />
            ))}
          </div>
          <div className="lv-note-pill">Key points</div>
          <div className="lv-note-pill">Clean notes</div>
        </div>
      </div>
      <div className="lv-montage-card medium" style={{ padding: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <span className="lv-status-chip">
            <Video aria-hidden="true" />
            Meet with it
          </span>
          <div className="lv-line lv-line-strong" style={{ width: "72%" }} />
          <div className="lv-line" style={{ width: "94%" }} />
          <div className="lv-line" style={{ width: "78%" }} />
          <div className="lv-note-pill">Decisions</div>
          <div className="lv-note-pill">Action items</div>
        </div>
      </div>
      <div className="lv-montage-card wide" style={{ padding: 16 }}>
        <div className="lv-card" style={{ height: "100%", padding: 18 }}>
          <span className="lv-status-chip">
            <MousePointerClick aria-hidden="true" />
            Act with it
          </span>
          <div className="lv-trace" style={{ marginTop: 14 }}>
            <div className="lv-trace-step active">
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: "rgba(226,125,57,0.18)",
                  border: "1px solid rgba(226,125,57,0.4)",
                  color: "#f7d9c3",
                  fontSize: 12,
                }}
              >
                1
              </div>
              <div style={{ color: "#fbf7f1", fontSize: 14 }}>
                Search, compare, navigate
                <small>Tell me what to do. I'll handle the clicks.</small>
              </div>
              <span className="lv-timecode">live</span>
            </div>
          </div>
        </div>
      </div>
      <div className="lv-montage-center">
        <BrainSVG phase="awake" />
      </div>
    </div>
  );
}

function OutroVisual({ progress }: { progress: number }) {
  return (
    <div className="lv-outro">
      <div
        style={{
          position: "relative",
          width: 300,
          height: 300,
          margin: "0 auto 24px",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "22px",
            borderRadius: "999px",
            background: "radial-gradient(circle, rgba(226,125,57,0.34), rgba(226,125,57,0.08), transparent 72%)",
            transform: `scale(${1 + progress * 0.16})`,
            opacity: 0.7 + progress * 0.3,
          }}
        />
        <div className="lv-outro-mark">
          <BrainSVG phase="awake" />
        </div>
      </div>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.06)",
          color: "rgba(251,247,241,0.7)",
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#e27d39",
            boxShadow: "0 0 18px rgba(226,125,57,0.82)",
          }}
        />
        Braino logo bloom
      </div>
    </div>
  );
}

export default function LaunchTeaser() {
  const rootRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const elapsedRef = useRef(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalMs, setTotalMs] = useState(TOTAL_DURATION_MS);
  const [isPlaying, setIsPlaying] = useState(true);
  const [runNonce, setRunNonce] = useState(0);

  useEffect(() => {
    document.body.classList.add("sb-launch-video");
    if (audioRef.current) audioRef.current.volume = 0.72;
    return () => document.body.classList.remove("sb-launch-video");
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const startedAt = performance.now() - elapsedRef.current;

    const interval = window.setInterval(() => {
      const next = Math.min(totalMs, performance.now() - startedAt);
      elapsedRef.current = next;
      setElapsedMs(next);

      if (next >= totalMs) {
        window.clearInterval(interval);
        setIsPlaying(false);
      }
    }, 33);

    return () => window.clearInterval(interval);
  }, [isPlaying, runNonce, totalMs]);

  useEffect(() => {
    const videos = rootRef.current?.querySelectorAll<HTMLVideoElement>('video[data-launch-recording="true"]');
    if (!videos) return;

    videos.forEach((video) => {
      if (isPlaying) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });

    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      void audio.play().catch(() => undefined);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  const activeScene = currentSceneFor(elapsedMs);
  const isCenteredCopy = activeScene.id === "intro" || activeScene.id === "montage" || activeScene.id === "outro";

  const restart = () => {
    elapsedRef.current = 0;
    setElapsedMs(0);
    setRunNonce((current) => current + 1);
    setIsPlaying(true);

    const videos = rootRef.current?.querySelectorAll<HTMLVideoElement>('video[data-launch-recording="true"]');
    videos?.forEach((video) => {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    });

    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }
  };

  return (
    <>
      <style>{LAUNCH_VIDEO_CSS}</style>
      <audio
        ref={audioRef}
        src="/braino.mp3"
        preload="auto"
        onLoadedMetadata={(e) => setTotalMs(Math.round((e.currentTarget.duration || TOTAL_DURATION_MS / 1000) * 1000))}
      />

      <div ref={rootRef} className="lv-shell">
        <div className="lv-stage">
          <div className="lv-header">
            <div className="lv-pill">
              <strong>Braino Launch Video</strong>
              <span>Synced visual draft</span>
            </div>
            <div className="lv-pill">
              <span>{activeScene.label}</span>
              <strong>{formatTime(elapsedMs)} / {formatTime(totalMs)}</strong>
            </div>
          </div>

          <div className={`lv-copy${isCenteredCopy ? " centered" : ""}`}>
            <div className="lv-scene-tag">{activeScene.eyebrow}</div>
            <h1 className="lv-headline">
              {activeScene.title.map((line) => (
                <span key={line} className="lv-headline-line">
                  {line}
                </span>
              ))}
            </h1>
            {activeScene.support ? <p className="lv-support">{activeScene.support}</p> : null}
          </div>

          <div className="lv-canvas" aria-hidden="true">
            {SCENES.map((scene) => {
              const opacity = sceneOpacity(scene, elapsedMs);
              const progress = sceneProgress(scene, elapsedMs);

              return (
                <div
                  key={scene.id}
                  className="lv-scene-layer"
                  style={{
                    opacity,
                    transform: `translateY(${(1 - opacity) * 24}px) scale(${0.985 + opacity * 0.015})`,
                  }}
                >
                  {scene.id === "intro" ? <IntroVisual progress={progress} /> : null}
                  {scene.id === "tab" ? <TabVisual /> : null}
                  {scene.id === "chat" ? <ChatVisual /> : null}
                  {scene.id === "audio" ? <AudioVisual /> : null}
                  {scene.id === "meetings" ? <MeetingsVisual /> : null}
                  {scene.id === "agent" ? <AgentVisual /> : null}
                  {scene.id === "montage" ? <MontageVisual /> : null}
                  {scene.id === "outro" ? <OutroVisual progress={progress} /> : null}
                </div>
              );
            })}
          </div>

          <div className="lv-controls">
            <div className="lv-controls-left">
              <button className="lv-button" type="button" onClick={() => setIsPlaying((current) => !current)} aria-label={isPlaying ? "Pause launch video" : "Play launch video"}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button className="lv-button" type="button" onClick={restart} aria-label="Restart launch video">
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="lv-progress-wrap">
              <div className="lv-progress">
                <div className="lv-progress-fill" style={{ width: `${(elapsedMs / totalMs) * 100}%` }} />
              </div>
              <div className="lv-markers">
                {SCENES.map((scene) => (
                  <span key={scene.id} className={`lv-marker${scene.id === activeScene.id ? " active" : ""}`}>
                    {scene.eyebrow}
                  </span>
                ))}
              </div>
            </div>

            <div className="lv-timecode">{activeScene.label}</div>
          </div>
        </div>
      </div>
    </>
  );
}
