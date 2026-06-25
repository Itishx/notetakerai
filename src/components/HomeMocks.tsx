/* ============================================================
   HomeMocks.tsx — feature mockups that reuse Braino's ACTUAL
   on-page UI from content.js: the wide liquid-glass bar with the
   walking Braino perched on top. Listening states (lectures /
   meetings) put his specs on + a coral sonar pulse, exactly like
   headphone mode in the extension.
   ============================================================ */
import { useEffect, useState } from "react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";

// Braino's reading specs (from content.js __sbwk_specs__), drawn on top of the face.
const SPECS = '<g id="__mk_specs__">'
  + '<circle cx="38" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>'
  + '<circle cx="62" cy="48" r="9.2" fill="none" stroke="#1B1713" stroke-width="3" opacity="0.92"/>'
  + '<path d="M 47.2 48 L 52.8 48" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>'
  + '<path d="M 28.8 46 Q 24 45 21 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>'
  + '<path d="M 71.2 46 Q 76 45 79 49" fill="none" stroke="#1B1713" stroke-width="2.2" stroke-linecap="round" opacity="0.92"/>'
  + '</g>';
const WALKER = BRAINO_WALKER_SVG;
const WALKER_SPECS = BRAINO_WALKER_SVG.replace("</g></svg>", SPECS + "</g></svg>");

function useTyping(full: string, { cps = 26, hold = 2400 } = {}) {
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let raf = 0, t0 = 0, phase: "type" | "hold" | "clear" = "type", holdStart = 0;
    const step = (now: number) => {
      if (!t0) t0 = now;
      if (phase === "type") {
        const n = Math.max(0, Math.min(full.length, Math.floor(((now - t0) / 1000) * cps)));
        setText(full.slice(0, n));
        if (n >= full.length) { phase = "hold"; holdStart = now; setDone(true); }
      } else if (phase === "hold") {
        if (now - holdStart > hold) { phase = "clear"; setDone(false); }
      } else { setText(""); t0 = now + 600; phase = "type"; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [full, cps, hold]);
  return { text, done };
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
);
const HpIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" /><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
);

// The real liquid-glass bar + Braino perched on top.
function BrainoBar({ specs = false, listening = false, children }: { specs?: boolean; listening?: boolean; children: React.ReactNode }) {
  return (
    <div className="mkbar-wrap">
      <div className={`mkbar-braino${listening ? " listening" : ""}`}>
        {listening && <><span className="mksonar" /><span className="mksonar d2" /></>}
        <div className="mkwalk" dangerouslySetInnerHTML={{ __html: specs ? WALKER_SPECS : WALKER }} />
      </div>
      <div className={`mkbar${listening ? " listening" : ""}`}>{children}</div>
    </div>
  );
}

/* ── Read anything → drafts an email in the floating bar ── */
export function ChatMock() {
  const { text, done } = useTyping("Draft an email to Priya — I'm running 10 minutes late");
  return (
    <div className="mk">
      <div className="mk-page">
        <div className="mk-head"><span className="mk-dot r" /><span className="mk-dot y" /><span className="mk-dot g" /><span className="mk-url">mail.google.com</span></div>
        <div className="mk-rows">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className={`mk-row${i === 1 ? " on" : ""}`} key={i}>
              <span className="mk-av" /><span className="mk-l" style={{ width: `${54 + ((i * 9) % 26)}%` }} /><span className="mk-t" />
            </div>
          ))}
        </div>
      </div>

      <div className={`mk-card${done ? " show" : ""}`}>
        <div className="mk-card-head"><span className="mk-brainmini" /><b>Braino</b></div>
        <span className="mk-l b" style={{ width: "94%" }} />
        <span className="mk-l b" style={{ width: "82%" }} />
        <span className="mk-l b" style={{ width: "88%" }} />
        <div className="mk-chip">Opening Gmail · drafting ✏️</div>
      </div>

      <BrainoBar>
        <span className="mkbar-q">{text || <span className="mkbar-ph">What's on your mind?</span>}{text && <i className="mk-caret" />}</span>
        <span className="mkbar-mode">⚡ Auto</span>
        <span className="mkbar-send"><SendIcon /></span>
      </BrainoBar>
    </div>
  );
}

/* ── Lectures → Braino listens with specs while a lecture plays ── */
export function RecordMock() {
  const bars = Array.from({ length: 18 }, (_, i) => 0.3 + ((i * 37) % 70) / 100);
  return (
    <div className="mk">
      <div className="mk-page">
        <div className="mk-head"><span className="mk-dot r" /><span className="mk-dot y" /><span className="mk-dot g" /><span className="mk-url">youtube.com · lecture</span></div>
        <div className="mk-lecture">
          <div className="mk-video"><span className="mk-play">▶</span><span className="mk-vbadge">● LIVE</span></div>
          <div className="mk-l" style={{ width: "70%", margin: "12px 0 8px" }} />
          <div className="mk-l" style={{ width: "48%" }} />
        </div>
      </div>

      <div className="mk-notes">
        <div className="mk-card-head"><span className="mk-brainmini" /><b>Notes → Notion</b></div>
        {[0, 1, 2, 3].map((i) => (
          <div className="mk-note" key={i} style={{ animationDelay: `${0.5 + i * 0.6}s` }}>
            <span className="mk-bullet" /><span className="mk-l b" style={{ width: `${86 - i * 11}%` }} />
          </div>
        ))}
      </div>

      <BrainoBar specs listening>
        <span className="mkbar-icon coral"><HpIcon /></span>
        <span className="mkbar-q listening">Listening — recording the lecture…</span>
        <span className="mkbar-eq">{bars.map((h, i) => <span key={i} style={{ ["--h" as string]: h, animationDelay: `${(i % 9) * 0.08}s` }} />)}</span>
      </BrainoBar>
    </div>
  );
}

/* ── Meetings → Braino sits in, specs on, writing the recap ── */
export function MeetingsMock() {
  return (
    <div className="mk">
      <div className="mk-page mk-dark">
        <div className="mk-tiles">
          {[0, 1, 2, 3].map((i) => (
            <div className={`mk-tile${i === 0 ? " speaking" : ""}`} key={i}><span className="mk-face" /></div>
          ))}
        </div>
      </div>

      <div className="mk-card mk-card-meet show">
        <div className="mk-card-head"><span className="mk-brainmini" /><b>Live recap</b></div>
        {[0, 1, 2].map((i) => (
          <div className="mk-note" key={i} style={{ animationDelay: `${0.5 + i * 0.7}s` }}>
            <span className="mk-bullet" /><span className="mk-l b" style={{ width: `${90 - i * 16}%` }} />
          </div>
        ))}
        <div className="mk-chip">3 action items captured</div>
      </div>

      <BrainoBar specs listening>
        <span className="mkbar-icon coral"><HpIcon /></span>
        <span className="mkbar-q listening">In your meeting — I'll write the recap.</span>
      </BrainoBar>
    </div>
  );
}

export const HOME_MOCKS: Record<string, () => JSX.Element> = {
  chat: ChatMock,
  record: RecordMock,
  meetings: MeetingsMock,
};
