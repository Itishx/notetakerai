import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const FPS = 30;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const DURATION_IN_FRAMES = 78 * FPS; // matches braino.mp3 (77.87s)

// ─── helpers ──────────────────────────────────────────────────────────────────

function fadeIn(frame: number, durationFrames = 20) {
  return interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── design tokens ────────────────────────────────────────────────────────────

const CREAM = "rgba(255,251,247,0.96)";
const GLASS = "rgba(255,255,255,0.08)";
const GLASS_BORDER = "rgba(255,255,255,0.22)";
const ORANGE = "#e27d39";
const PAGE_BG = "#faf9f7";
const DARK_BG = "#050505";
const TEXT_DARK = "rgba(65,48,40,0.9)";

// ─── shared UI components ─────────────────────────────────────────────────────

function BrainSVG({ size = 60, glow = ORANGE }: { size?: number; glow?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="58" rx="32" ry="28" fill={glow} fillOpacity={0.9} />
      <ellipse cx="50" cy="34" rx="22" ry="22" fill={glow} fillOpacity={0.95} />
      <ellipse cx="42" cy="32" rx="4" ry="4.5" fill="#1a0e08" />
      <ellipse cx="58" cy="32" rx="4" ry="4.5" fill="#1a0e08" />
      <ellipse cx="43.5" cy="30" rx="1.5" ry="1.5" fill="white" fillOpacity={0.6} />
      <ellipse cx="59.5" cy="30" rx="1.5" ry="1.5" fill="white" fillOpacity={0.6} />
      <path d="M 43 40 Q 50 46 57 40" stroke="#1a0e08" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function BrainoBar({ value = "Ask anything…" }: { value?: string }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: CREAM, borderRadius: 100, padding: "7px 7px 7px 18px",
      border: "1px solid rgba(65,48,40,0.1)",
      boxShadow: "0 8px 28px rgba(27,23,19,0.13)",
      width: 280, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <span style={{ flex: 1, fontSize: 14, color: "#A79B92", overflow: "hidden", whiteSpace: "nowrap" }}>
        {value}
      </span>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", background: "#E8786E",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 20, flexShrink: 0,
      }}>{"›"}</div>
    </div>
  );
}

function BrainoRoot({ barValue }: { barValue?: string }) {
  return (
    <div style={{
      position: "absolute", bottom: 20, right: 20,
      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, zIndex: 4,
    }}>
      {barValue !== undefined && <BrainoBar value={barValue} />}
      <div style={{ width: 60, height: 60, filter: `drop-shadow(0 2px 10px ${ORANGE}80)` }}>
        <BrainSVG size={60} />
      </div>
    </div>
  );
}

function BrainoCard({ query, response }: { query?: string; response?: string }) {
  return (
    <div style={{
      background: GLASS, borderRadius: 24, border: `1px solid ${GLASS_BORDER}`,
      backdropFilter: "blur(40px) saturate(180%)", color: "white", overflow: "hidden",
      fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5, padding: "12px 14px 4px" }}>
        {["Speak", "Copy", "×"].map((btn) => (
          <button key={btn} style={{
            border: "none", background: "rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.75)",
            height: 26, padding: "0 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          }}>{btn}</button>
        ))}
      </div>
      <div style={{ padding: "4px 22px 16px" }}>
        {query && (
          <div style={{
            background: "rgba(255,255,255,0.1)", borderRadius: "12px 12px 12px 4px",
            padding: "9px 13px", marginBottom: 12, fontSize: 14,
            color: "rgba(255,255,255,0.68)", lineHeight: 1.5,
          }}>{query}</div>
        )}
        {response && (
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: "rgba(255,255,255,0.92)" }}>{response}</p>
        )}
      </div>
      <div style={{ padding: "10px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 13, color: "rgba(255,255,255,0.38)" }}>
        Follow up{"…"}
      </div>
    </div>
  );
}

function BrowserChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)",
      background: "#131210", boxShadow: "0 40px 100px rgba(0,0,0,0.5)", width: 1120,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 20px",
        background: "rgba(10,10,10,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", gap: 7 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: "50%", background: c, display: "inline-block" }} />
          ))}
        </div>
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "6px 14px", borderRadius: 8,
          background: "rgba(255,255,255,0.06)", fontSize: 13, color: "rgba(255,255,255,0.5)",
          fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        }}>
          {title}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function SceneTitle({ eyebrow, title }: { eyebrow: string; title: string[] }) {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 18);
  const y = interpolate(frame, [0, 18], [20, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", top: 56, left: 80, opacity, transform: `translateY(${y}px)` }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "7px 13px", borderRadius: 999,
        background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
        fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" as const,
        color: "rgba(251,247,241,0.72)", fontFamily: "SF Mono, JetBrains Mono, monospace",
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: ORANGE, boxShadow: `0 0 12px ${ORANGE}` }} />
        {eyebrow}
      </div>
      <h1 style={{
        margin: "12px 0 0", fontSize: 72, lineHeight: 1, letterSpacing: "-0.04em",
        color: "#fbf7f1", fontWeight: 700,
        fontFamily: "NeueHaas, -apple-system, sans-serif",
      }}>
        {title.map((line, i) => <span key={i} style={{ display: "block" }}>{line}</span>)}
      </h1>
    </div>
  );
}

// ─── SCENES ── useCurrentFrame() returns 0 at sequence start inside <Sequence> ─

function SceneIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = interpolate(frame, [0, 4 * fps], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(progress, [0, 1], [0.7, 1]);
  const opacity = interpolate(progress, [0, 0.25], [0, 1], { extrapolateRight: "clamp" });
  const glow = progress > 0.75 ? ORANGE : progress > 0.5 ? "#50e66e" : progress > 0.25 ? "#ffd232" : "#888";

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ opacity, transform: `scale(${scale})`, filter: `drop-shadow(0 0 60px ${glow}60)` }}>
        <BrainSVG size={280} glow={glow} />
      </div>
      <div style={{
        position: "absolute", bottom: 120, left: "50%", transform: "translateX(-50%)",
        opacity: fadeIn(frame, 20),
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "10px 20px", borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.05)",
        color: "rgba(251,247,241,0.68)", fontSize: 13, letterSpacing: "0.08em",
        textTransform: "uppercase" as const, fontFamily: "-apple-system, sans-serif",
        whiteSpace: "nowrap" as const,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ORANGE, boxShadow: `0 0 18px ${ORANGE}CC` }} />
        Introducing Braino
      </div>
    </AbsoluteFill>
  );
}

function SceneTab() {
  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SceneTitle eyebrow="IN YOUR TAB" title={["Your best friend", "for the web."]} />
      <BrowserChrome title="medium.com — The state of AI in 2025">
        <div style={{ position: "relative", background: PAGE_BG, minHeight: 540, padding: "36px 48px", overflow: "hidden" }}>
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ height: 18, background: "rgba(65,48,40,0.15)", borderRadius: 99, width: "65%", marginBottom: 16 }} />
            <div style={{ height: 11, background: "rgba(65,48,40,0.07)", borderRadius: 99, width: "35%", marginBottom: 32 }} />
            {[90, 96, 82, 88, 75, 93, 71, 85, 96, 62, 88].map((w, i) => (
              <div key={i} style={{ height: 9, background: "rgba(65,48,40,0.09)", borderRadius: 99, width: `${w}%`, marginBottom: 14 }} />
            ))}
          </div>
          <BrainoRoot barValue="Ask anything…" />
        </div>
      </BrowserChrome>
    </AbsoluteFill>
  );
}

function SceneChat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = interpolate(frame, [fps, fps + 20], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SceneTitle eyebrow="FEATURE 01" title={["Chat with", "any page."]} />
      <BrowserChrome title="techcrunch.com - Why pricing is hard">
        <div style={{ position: "relative", background: PAGE_BG, minHeight: 540, display: "grid", gridTemplateColumns: "1.1fr 0.9fr" }}>
          <div style={{ padding: "32px 28px 32px 32px", borderRight: "1px solid rgba(65,48,40,0.07)" }}>
            <div style={{ height: 18, background: "rgba(65,48,40,0.15)", borderRadius: 99, width: "72%", marginBottom: 14 }} />
            {[90, 96, 82, 94, 76, 88, 70, 92, 66, 84].map((w, i) => (
              <div key={i} style={{ height: 9, background: "rgba(65,48,40,0.09)", borderRadius: 99, width: `${w}%`, marginBottom: 13 }} />
            ))}
          </div>
          <div style={{ padding: 24, display: "flex", alignItems: "center", opacity: cardOpacity }}>
            <BrainoCard
              query="Can you explain this in simpler words?"
              response="Here's the simple version. The page compares three pricing models — the real tradeoff is setup time, not cost."
            />
          </div>
          <BrainoRoot barValue="Follow up…" />
        </div>
      </BrowserChrome>
    </AbsoluteFill>
  );
}

function SceneAudio() {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SceneTitle eyebrow="FEATURE 02" title={["Lectures & audio,", "simplified."]} />
      <BrowserChrome title="youtube.com — Lecture 14: Distributed Systems">
        <div style={{ position: "relative", background: "#0f0f0f", minHeight: 540 }}>
          <div style={{ background: "#000", height: 300, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "white", fontSize: 32, marginLeft: 4 }}>{"▶"}</span>
            </div>
            <div style={{
              position: "absolute", top: 16, right: 16,
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 13px", borderRadius: 999,
              background: "rgba(14,11,9,0.84)", border: "1px solid rgba(255,255,255,0.15)",
              fontSize: 12, color: "rgba(255,255,255,0.88)", fontFamily: "-apple-system, sans-serif",
            }}>
              {"🎙"} Braino listening
            </div>
            <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 99 }}>
              <div style={{ width: "38%", height: "100%", background: "#ff0000", borderRadius: 99 }} />
            </div>
          </div>
          <div style={{ padding: "20px 28px" }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 18 }}>
              {["Key concepts extracted", "Summary drafted", "Study notes ready"].map((t) => (
                <div key={t} style={{ padding: "6px 13px", borderRadius: 99, background: "rgba(226,125,57,0.14)", border: "1px solid rgba(226,125,57,0.25)", fontSize: 12, color: "#f7d9c3", fontFamily: "-apple-system, sans-serif" }}>{t}</div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
              {Array.from({ length: 32 }).map((_, i) => (
                <div key={i} style={{
                  width: 5, borderRadius: 99,
                  height: `${14 + ((i * 7 + frame * 2) % 28)}px`,
                  background: "linear-gradient(180deg, #f6b57f, #e27d39)",
                }} />
              ))}
            </div>
          </div>
          <BrainoRoot barValue="What were the key takeaways?" />
        </div>
      </BrowserChrome>
    </AbsoluteFill>
  );
}

function SceneMeetings() {
  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SceneTitle eyebrow="FEATURE 03" title={["Meetings that", "remember themselves."]} />
      <BrowserChrome title="meet.google.com — Braino Team Sync">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {[
              { name: "Ananya · PM", tint: "linear-gradient(135deg, #32261f, #47352c)", dot: ORANGE },
              { name: "Ravi · Sales", tint: "linear-gradient(135deg, #1d2831, #314150)", dot: "#79a3d8" },
              { name: "Mina · Design", tint: "linear-gradient(135deg, #1d3028, #2f4d40)", dot: "#62c58a" },
              { name: "Kai · Eng", tint: "linear-gradient(135deg, #2c1f26, #53333f)", dot: "#d78098" },
            ].map((tile) => (
              <div key={tile.name} style={{ position: "relative", height: 200, background: tile.tint, display: "flex", alignItems: "flex-end", padding: 14 }}>
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 999, background: `${tile.dot}33`, border: `1px solid ${tile.dot}66` }} />
                </div>
                <span style={{ fontSize: 12, color: tile.dot, fontFamily: "-apple-system, sans-serif", position: "relative", zIndex: 1 }}>{tile.name}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 24, background: "#0d0c0b", display: "flex", alignItems: "center" }}>
            <BrainoCard response="Decisions: Ship the new launch page first. Keep voice mode in the hero. Action items: Ananya finalizes script, Ravi preps launch list." />
          </div>
        </div>
      </BrowserChrome>
    </AbsoluteFill>
  );
}

function SceneAgent() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const steps = [
    { label: "Open pricing page", note: "Navigation confirmed", doneAt: 0 },
    { label: "Scan plan details", note: "Comparing limits + features", doneAt: fps },
    { label: "Search for team fit", note: "Reviewing collaboration features", doneAt: fps * 2 },
    { label: "Return recommendation", note: "Preparing answer", doneAt: fps * 3 },
  ];

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SceneTitle eyebrow="FEATURE 04" title={["Agent", "Mode."]} />
      <BrowserChrome title="braino.ai / agent mode">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", background: "#0d0c0b" }}>
          <div style={{ padding: 32, borderRight: "1px solid rgba(255,255,255,0.06)", background: PAGE_BG }}>
            <p style={{ margin: 0, fontSize: 18, lineHeight: 1.55, color: TEXT_DARK, fontFamily: "-apple-system, sans-serif" }}>
              {'"Open the pricing page, compare the plans, and shortlist the best fit for a small remote team."'}
            </p>
            <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 13px", borderRadius: 99, background: "rgba(65,48,40,0.07)", border: "1px solid rgba(65,48,40,0.12)", fontSize: 12, color: "rgba(65,48,40,0.7)", fontFamily: "-apple-system, sans-serif" }}>
              Braino can handle the clicks
            </div>
          </div>
          <div style={{ padding: 32 }}>
            {steps.map((step, i) => {
              const isDone = frame > step.doneAt + fps;
              const isActive = frame > step.doneAt && !isDone;
              return (
                <div key={step.label} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999, flexShrink: 0, display: "grid", placeItems: "center",
                    background: isDone ? ORANGE : isActive ? "rgba(226,125,57,0.18)" : "rgba(255,255,255,0.06)",
                    border: isActive ? `1px solid ${ORANGE}66` : "1px solid rgba(255,255,255,0.06)",
                    color: isDone ? "white" : "#f7d9c3", fontSize: 13,
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div style={{ fontFamily: "-apple-system, sans-serif" }}>
                    <div style={{ fontSize: 15, color: "#fbf7f1" }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: "rgba(251,247,241,0.45)", marginTop: 2 }}>{step.note}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(251,247,241,0.35)", fontFamily: "SF Mono, monospace" }}>
                    {isDone ? "done" : isActive ? "live" : "queued"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </BrowserChrome>
    </AbsoluteFill>
  );
}

function SceneMontage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 40 }}>
      <h1 style={{
        fontSize: 120, lineHeight: 1, letterSpacing: "-0.05em", textAlign: "center",
        color: "#fbf7f1", fontWeight: 700, margin: 0,
        fontFamily: "NeueHaas, -apple-system, sans-serif",
      }}>
        {["Everything,", "everywhere."].map((word, i) => (
          <span key={word} style={{ display: "block", opacity: fadeIn(frame - i * 12, 18) }}>{word}</span>
        ))}
      </h1>
      <div style={{ display: "flex", gap: 12, opacity: fadeIn(frame - fps, 20) }}>
        {["Webpage", "Lecture", "Meeting", "Video", "Document", "Product page"].map((label) => (
          <div key={label} style={{
            padding: "8px 16px", borderRadius: 99,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 14, color: "rgba(251,247,241,0.6)", fontFamily: "-apple-system, sans-serif",
          }}>{label}</div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function SceneOutro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 14, stiffness: 100, mass: 0.8 } });
  const opacity = fadeIn(frame, 15);

  return (
    <AbsoluteFill style={{ background: DARK_BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
      <div style={{ transform: `scale(${scale})`, opacity, filter: `drop-shadow(0 0 60px ${ORANGE}80)` }}>
        <BrainSVG size={200} />
      </div>
      <div style={{ textAlign: "center", opacity: fadeIn(frame - 10, 20) }}>
        <h1 style={{
          margin: 0, fontSize: 80, letterSpacing: "-0.04em", color: "#fbf7f1",
          fontFamily: "NeueHaas, -apple-system, sans-serif", fontWeight: 700,
        }}>Braino</h1>
        <p style={{ margin: "12px 0 0", fontSize: 20, color: "rgba(251,247,241,0.6)", fontFamily: "-apple-system, sans-serif" }}>
          Your best friend for the web.
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 16, color: "rgba(251,247,241,0.38)", fontFamily: "SF Mono, monospace", letterSpacing: "0.08em" }}>
          trybraino.com
        </p>
      </div>
    </AbsoluteFill>
  );
}

// ─── ROOT COMPOSITION ─────────────────────────────────────────────────────────

export function BrainoLaunch() {
  const { fps } = useVideoConfig();

  // Scene timings scaled to match 78s audio (proportional from original 56s cut)
  const S = {
    intro:    0,
    tab:       6 * fps,
    chat:     14 * fps,
    audio:    28 * fps,
    meetings: 42 * fps,
    agent:    54 * fps,
    montage:  67 * fps,
    outro:    74 * fps,
  };

  return (
    <AbsoluteFill style={{ background: DARK_BG, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
      <Audio src={staticFile("braino.mp3")} />

      <AbsoluteFill style={{
        background: `
          radial-gradient(circle at 18% 12%, rgba(226,125,57,0.12), transparent 25%),
          radial-gradient(circle at 82% 16%, rgba(255,255,255,0.04), transparent 22%),
          radial-gradient(circle at 50% 100%, rgba(226,125,57,0.14), transparent 38%)
        `,
        pointerEvents: "none",
      }} />

      <Sequence from={S.intro}    durationInFrames={S.tab      - S.intro}>    <SceneIntro />    </Sequence>
      <Sequence from={S.tab}      durationInFrames={S.chat     - S.tab}>      <SceneTab />      </Sequence>
      <Sequence from={S.chat}     durationInFrames={S.audio    - S.chat}>     <SceneChat />     </Sequence>
      <Sequence from={S.audio}    durationInFrames={S.meetings - S.audio}>    <SceneAudio />    </Sequence>
      <Sequence from={S.meetings} durationInFrames={S.agent    - S.meetings}> <SceneMeetings /> </Sequence>
      <Sequence from={S.agent}    durationInFrames={S.montage  - S.agent}>    <SceneAgent />    </Sequence>
      <Sequence from={S.montage}  durationInFrames={S.outro    - S.montage}>  <SceneMontage />  </Sequence>
      <Sequence from={S.outro}    durationInFrames={DURATION_IN_FRAMES - S.outro}> <SceneOutro /> </Sequence>
    </AbsoluteFill>
  );
}
