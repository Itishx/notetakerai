import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NOTCH_PILL_INNER, NOTCH_SHINE_MARKUP, NOTCH_SONAR_MARKUP } from "@/components/NotchFace";
import "@/components/notch-face.css";
import "./web-notch.css";

/* Braino on the web (2026-10-24, rebuilt the same day). This is the Mac app's
   own notch, not a lookalike: the art is NotchFace's verbatim port of
   mac/braino-mac/renderer/index.html #notch-face, the state classes are the
   app's (on, home, awake, dozing, blink, listen, speak, busy), and the open
   sheet is the app's short answer surface (nf-answer-open nf-answer-short)
   ported from braino-mac.css. Everything he says happens inside it. */

export type NotchButton = { label: string; onClick: () => void };

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  text: string;
  /* What you are saying, live, while he listens. */
  heard?: string;
  buttons: NotchButton[];
  dot: boolean;
  /* True only while his voice is actually playing, so the mouth moves with it. */
  talking?: boolean;
  thinking?: boolean;
  hop?: boolean;
  listening?: boolean;
  onMic?: () => void;
};

/* The Mac's numbers: blink every 2.8 to 6.4 s for 260 ms (nfScheduleBlink),
   and he stays awake for 30 minutes after you last engaged him
   (AMBIENT_AWAKE_WINDOW_MS), then dozes with his lids down. */
const AWAKE_MS = 30 * 60 * 1000;

export default function WebNotch({ open, onOpen, onClose, text, heard, buttons, dot, talking, thinking, hop, listening, onMic }: Props) {
  const [blink, setBlink] = useState(false);
  const [engagedAt, setEngagedAt] = useState(() => Date.now());
  const [, tick] = useState(0);
  const rowRef = useRef<HTMLSpanElement>(null);
  const [h, setH] = useState(146);

  useEffect(() => {
    let t = 0;
    const next = () => { t = window.setTimeout(() => { setBlink(true); window.setTimeout(() => setBlink(false), 260); next(); }, 2800 + Math.random() * 3600); };
    next();
    return () => window.clearTimeout(t);
  }, []);
  const engaged = open || listening || talking || thinking;
  useEffect(() => { if (engaged) setEngagedAt(Date.now()); }, [engaged]);
  useEffect(() => { const i = window.setInterval(() => tick((n) => n + 1), 60_000); return () => window.clearInterval(i); }, []);
  const awake = engaged || Date.now() - engagedAt < AWAKE_MS;

  // The sheet grows to the copy, like the app's --nf-answer-short-height.
  const shown = listening ? heard || "I'm listening." : text;
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (el) setH(Math.max(146, Math.min(320, el.offsetHeight + 53 + 18)));
  }, [shown, open, buttons.length]);

  const cls = [
    "nf-face wn-notch on home",
    awake ? "awake" : "dozing",
    blink && "blink",
    listening && "listen mic-live",
    talking && "speak",
    thinking && !open && "busy",
    open && "nf-answer-open nf-answer-short",
    hop && "wn-hop",
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} role="region" aria-label="Braino" style={{ ["--nf-answer-short-height" as string]: `${h}px` } as React.CSSProperties}>
      <div className="wn-contents" dangerouslySetInnerHTML={{ __html: NOTCH_SONAR_MARKUP }} />
      <div className="nf-pill" onClick={open ? undefined : onOpen}>
        <div className="wn-contents" dangerouslySetInnerHTML={{ __html: NOTCH_PILL_INNER }} />
        {!open && (
          <button className="wn-hit" onClick={onOpen} aria-label={dot ? "Braino has something for you" : "Talk to Braino"} />
        )}
        {dot && !open && <span className="wn-dot" aria-hidden="true" />}
        <section className="nf-answer-surface" aria-live="polite" aria-hidden={!open}>
          <div className="nf-answer-short-row">
            <span ref={rowRef}>
              <small>{listening ? "Listening" : "Braino"}</small>
              <strong className={`nf-answer-short-text${listening ? " wn-heard" : ""}`}>{shown}</strong>
              {(onMic || (!listening && buttons.length > 0)) && (
                <span className="wn-row">
                  {!listening && buttons.slice(0, 2).map((b, i) => (
                    <button key={b.label} className={`wn-btn${i === 0 ? " main" : ""}`} tabIndex={open ? 0 : -1} onClick={b.onClick}>{b.label}</button>
                  ))}
                  {onMic && (
                    <button className={`wn-mic${listening ? " on" : ""}`} tabIndex={open ? 0 : -1} onClick={onMic} aria-label={listening ? "Send" : "Talk to Braino (or hold Control)"} title={listening ? "Send" : "Talk (or hold Control)"}>
                      <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
                    </button>
                  )}
                </span>
              )}
            </span>
            <button className="nf-answer-done" type="button" tabIndex={open ? 0 : -1} onClick={onClose}>Done</button>
          </div>
        </section>
      </div>
      <div className="wn-contents" dangerouslySetInnerHTML={{ __html: NOTCH_SHINE_MARKUP }} />
    </div>
  );
}
