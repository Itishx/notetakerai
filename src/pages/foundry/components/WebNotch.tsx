import React from "react";
import { BrainoMascot } from "@/components/BrainoMascot";
import "./web-notch.css";

/* Braino on the web (2026-10-24). A black notch fixed top centre over the
   app. Folded: his eyes, plus a dot when something is waiting. Open: one
   line of what he says and up to two buttons. Everything he does happens in
   here: no cards or panels beside it. */

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
  talking?: boolean;
  thinking?: boolean;
  hop?: boolean;
  listening?: boolean;
  onMic?: () => void;
};

export default function WebNotch({ open, onOpen, onClose, text, heard, buttons, dot, talking, thinking, hop, listening, onMic }: Props) {
  const cls = ["wn", open && "open", thinking && "thinking", hop && "hop"].filter(Boolean).join(" ");
  return (
    <div className={cls} role="region" aria-label="Braino">
      <button className="wn-fold" onClick={onOpen} aria-label={dot ? "Braino has something for you" : "Talk to Braino"} tabIndex={open ? -1 : 0}>
        <span className="wn-eyes" aria-hidden="true"><i /><i /></span>
        {dot && <span className="wn-dot" aria-hidden="true" />}
      </button>
      <div className="wn-body" aria-hidden={!open}>
        <span className="wn-face" aria-hidden="true"><BrainoMascot variant="foundry" size={40} talking={talking} /></span>
        <div className="wn-say" aria-live="polite">
          <small>{listening ? "Listening" : "Braino"}</small>
          {listening && heard ? <p className="heard">{heard}</p> : <p>{listening && !heard ? "I'm listening." : text}</p>}
        </div>
        <div className="wn-row">
          {!listening && buttons.slice(0, 2).map((b, i) => (
            <button key={b.label} className={`wn-btn${i === 0 ? " main" : ""}`} tabIndex={open ? 0 : -1} onClick={b.onClick}>{b.label}</button>
          ))}
          {onMic && (
            <button className={`wn-mic${listening ? " on" : ""}`} tabIndex={open ? 0 : -1} onClick={onMic} aria-label={listening ? "Stop listening" : "Talk to Braino (or hold Space)"} title={listening ? "Stop" : "Talk (or hold Space)"}>
              <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
          )}
          <button className="wn-x" style={onMic ? undefined : { marginLeft: "auto" }} tabIndex={open ? 0 : -1} onClick={onClose} aria-label="Fold Braino away">
            <svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
