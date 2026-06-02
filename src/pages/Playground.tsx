import { useState } from "react";
import Navbar from "@/components/Navbar";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME } from "@/lib/extensionDownload";

// ─── shared styles ─────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = { maxWidth: 860, margin: "0 auto", padding: "0 28px" };

const eyebrow: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--sb-ink-3)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const pip: React.CSSProperties = {
  width: 6, height: 6, borderRadius: "50%",
  background: "var(--sb-accent)",
  boxShadow: "0 0 10px var(--sb-accent)",
  display: "inline-block",
};

const divider: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--sb-ink-4)",
  margin: "56px 0",
  opacity: 0.35,
};

// ─── Prompt chip ───────────────────────────────────────────────────────────────

function Chip({ text, onClick, active }: { text: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "var(--sb-accent)" : "var(--sb-bg-2)",
        color: active ? "#fff" : "var(--sb-ink-2)",
        border: active ? "1px solid var(--sb-accent)" : "1px solid var(--sb-ink-4)",
        borderRadius: 999,
        padding: "7px 16px",
        fontSize: 13,
        cursor: "pointer",
        transition: "all 0.15s",
        fontFamily: "inherit",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </button>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      ...eyebrow,
      marginBottom: 20,
      paddingBottom: 10,
      borderBottom: "1px solid var(--sb-ink-4)",
      opacity: 0.7,
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}>
      <span style={pip} />
      {children}
    </div>
  );
}

// ─── Article section ───────────────────────────────────────────────────────────

function ArticleSection() {
  return (
    <section>
      <SectionLabel>Opinion — The Braino Gazette</SectionLabel>
      <h2 style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontWeight: 400,
        fontSize: "clamp(26px, 4vw, 40px)",
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        marginBottom: 8,
        color: "var(--sb-ink)",
      }}>
        AI assistants are boring.<br />
        <em style={{ color: "var(--sb-accent-deep)" }}>Here's what's actually going wrong.</em>
      </h2>
      <p style={{ fontSize: 13, color: "var(--sb-ink-3)", marginBottom: 28 }}>
        Jun 2, 2026 · 4 min read · The Braino Gazette
      </p>

      {[
        `Most AI assistants feel like talking to a very confident intern. They know a lot, they answer fast, but there's something hollow about the interaction — like the responses were written by someone who read a lot about helpfulness but has never actually helped anyone. You ask a question and you get an answer shaped like politeness: opener, content, closer. Every time.`,
        `The problem isn't capability. These models are extraordinarily capable. The problem is the interaction design. Product teams decided that "assistant" meant deferential, cheerful, and relentlessly agreeable. So you get tools that never push back, never say "that's a bad idea," never tell you something you don't want to hear. They optimize for the user feeling good at the end of a turn, not for the user actually being helped.`,
        `There's a word for this in human relationships: sycophancy. And it's corrosive. When an AI validates every idea you have, you stop using it as a thinking partner and start using it as an applause machine. The calibration drifts. You become worse at your work, not better, because the feedback loop is broken.`,
        `What would it look like to fix this? Start with honesty. An AI companion that says "I don't think that's the right approach" when it genuinely doesn't is more valuable than one that says "Great idea, here's how to do it!" Pushback isn't rudeness — it's respect. It means the system is treating you like someone who can handle truth, not someone who needs to be managed.`,
        `The second thing is presence. Not just answering questions, but noticing what's on screen, remembering the conversation, understanding context you didn't explicitly spell out. The best human colleagues don't need everything explained from scratch. They've been in the room. They've been paying attention. An AI that reads the page you're on and responds as if it actually digested that information is a fundamentally different tool than one that waits for explicit prompts.`,
        `The third is voice. Not just speech synthesis — actual conversational rhythm. Short when that's what's needed. Long when it isn't. Not reading you a bullet list. Not summarizing back what you just said. Talking to you the way a sharp person in the room would talk to you: directly, without ceremony.`,
        `That's the whole thesis. AI companions that act like they have opinions, that hold context, and that speak like people — not like corporate chatbots doing a customer service impression. It's not a solved problem. But it's a solvable one.`,
      ].map((para, i) => (
        <p key={i} style={{
          fontSize: 17,
          lineHeight: 1.75,
          color: "var(--sb-ink-2)",
          marginBottom: 22,
        }}>
          {para}
        </p>
      ))}
    </section>
  );
}

// ─── Hot take section ──────────────────────────────────────────────────────────

const TAKES = [
  { claim: "Voice mode is the future of AI interfaces, not chat.", for: "Faster, more natural, hands-free. Chat is a workaround for the fact that we couldn't do voice well.", against: "Chat gives you a record, lets you think before you send, and works in public spaces. Voice is context-dependent." },
  { claim: "LLMs will never replace search.", for: "Search returns sources. LLMs return synthesized answers that can be confidently wrong. You need to verify anyway.", against: "The synthesis step is exactly the value. You still click sources when it matters. Most questions don't require that." },
  { claim: "AI tools make senior engineers more productive but junior engineers worse.", for: "Juniors miss the learning loop. They accept the first plausible answer and never build the intuition for why it's wrong.", against: "Every generation said the same about calculators, Stack Overflow, Google. Juniors still learn, just faster and with more context." },
];

function HotTakesSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <SectionLabel>Hot takes — pick a side</SectionLabel>
      <p style={{ fontSize: 15, color: "var(--sb-ink-3)", marginBottom: 28 }}>
        Three claims. Ask Braino which side it agrees with.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {TAKES.map((t, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--sb-ink-4)",
              borderRadius: 12,
              overflow: "hidden",
              background: "var(--sb-bg-2)",
            }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                padding: "18px 22px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontSize: 19,
                fontWeight: 400,
                color: "var(--sb-ink)",
                lineHeight: 1.3,
              }}
            >
              <span>{t.claim}</span>
              <span style={{
                fontSize: 18,
                color: "var(--sb-ink-3)",
                transform: open === i ? "rotate(45deg)" : "none",
                transition: "transform 0.2s",
                flexShrink: 0,
                marginTop: 2,
              }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: "0 22px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={{
                  background: "rgba(76,175,80,0.08)",
                  border: "1px solid rgba(76,175,80,0.2)",
                  borderRadius: 8, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", color: "#4caf50", marginBottom: 8, textTransform: "uppercase" }}>For</div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--sb-ink-2)", margin: 0 }}>{t.for}</p>
                </div>
                <div style={{
                  background: "rgba(244,67,54,0.08)",
                  border: "1px solid rgba(244,67,54,0.2)",
                  borderRadius: 8, padding: "14px 16px",
                }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", letterSpacing: "0.1em", color: "#ef5350", marginBottom: 8, textTransform: "uppercase" }}>Against</div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--sb-ink-2)", margin: 0 }}>{t.against}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Code section ──────────────────────────────────────────────────────────────

const CODE_SNIPPET = `// This function works. But does it work well?
// Ask Braino to review it.

async function fetchUserData(userId) {
  try {
    const res = await fetch(\`/api/users/\${userId}\`);
    const data = await res.json();

    if (data.error) {
      console.log("something went wrong");
      return null;
    }

    return data;
  } catch (e) {
    return null;
  }
}

// Called everywhere like this:
const user = await fetchUserData(req.params.id);
if (user.name) {
  renderProfile(user);
}`;

function CodeSection() {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(CODE_SNIPPET).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <section>
      <SectionLabel>Code review sandbox</SectionLabel>
      <p style={{ fontSize: 15, color: "var(--sb-ink-3)", marginBottom: 20 }}>
        Select the snippet below, then ask Braino to review it. It will spot the bugs.
      </p>
      <div style={{
        position: "relative",
        background: "#0E0C0A",
        border: "1px solid #2a2520",
        borderRadius: 12,
        overflow: "hidden",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 18px",
          borderBottom: "1px solid #2a2520",
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["#ff5f57", "#ffbd2e", "#28ca41"].map((c) => (
              <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.8 }} />
            ))}
          </div>
          <button
            onClick={copy}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: copied ? "#4caf50" : "#6B6059",
              fontSize: 12, fontFamily: "monospace",
              transition: "color 0.2s",
            }}
          >
            {copied ? "copied ✓" : "copy"}
          </button>
        </div>
        <pre style={{
          margin: 0,
          padding: "20px 22px",
          fontSize: 13.5,
          lineHeight: 1.7,
          color: "#c9c0b8",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          overflowX: "auto",
          userSelect: "text",
        }}>
          <code>{CODE_SNIPPET}</code>
        </pre>
      </div>
    </section>
  );
}

// ─── Stats section ─────────────────────────────────────────────────────────────

const STATS = [
  { label: "Monthly active AI tools per knowledge worker", value: "7.4", note: "up from 2.1 in 2023" },
  { label: "% of workers who say AI saves them 2+ hrs/day", value: "31%", note: "self-reported" },
  { label: "% who say it's made their work worse", value: "18%", note: "often cite over-reliance" },
  { label: "Average context switches per hour", value: "23", note: "tools, tabs, messages" },
  { label: "Time spent reformatting AI output", value: "40 min/day", note: "median, knowledge workers" },
  { label: "% who've had an AI confidently hallucinate on them", value: "71%", note: "at least once in 30 days" },
];

function StatsSection() {
  return (
    <section>
      <SectionLabel>Data snapshot — 2026</SectionLabel>
      <p style={{ fontSize: 15, color: "var(--sb-ink-3)", marginBottom: 24 }}>
        Ask Braino what these numbers actually mean.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
        {STATS.map((s, i) => (
          <div key={i} style={{
            background: "var(--sb-bg-2)",
            border: "1px solid var(--sb-ink-4)",
            borderRadius: 10,
            padding: "18px 20px",
          }}>
            <div style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: 34,
              color: "var(--sb-accent)",
              lineHeight: 1,
              marginBottom: 8,
            }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13.5, color: "var(--sb-ink-2)", lineHeight: 1.5, marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--sb-ink-3)", fontStyle: "italic" }}>
              {s.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Prompt suggestions ────────────────────────────────────────────────────────

const PROMPTS = [
  "Summarise this page",
  "What's the main argument here?",
  "Do you agree with the AI assistants take?",
  "Review the code snippet",
  "Which hot take do you side with?",
  "What's most surprising in the data?",
  "Push back on something on this page",
];

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Playground() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* Hero */}
      <section style={{ padding: "120px 0 60px", textAlign: "center" }}>
        <div style={{ ...wrap, maxWidth: 700 }}>
          <span style={eyebrow}><span style={pip} /> Braino Playground</span>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            fontSize: "clamp(42px, 6vw, 72px)",
            lineHeight: 1.05,
            letterSpacing: "-0.025em",
            margin: "14px auto 20px",
          }}>
            Test Braino on something{" "}
            <em style={{ color: "var(--sb-accent)", fontStyle: "italic" }}>worth testing.</em>
          </h1>
          <p style={{
            fontSize: 18,
            lineHeight: 1.65,
            color: "var(--sb-ink-2)",
            maxWidth: 520,
            margin: "0 auto 40px",
          }}>
            A sandbox page built for one thing: giving Braino actual content to work with. Open the extension, then try the prompts below.
          </p>

          {/* install nudge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            background: "var(--sb-accent-soft)",
            border: "1px solid var(--sb-accent)",
            borderRadius: 10,
            padding: "12px 20px",
            fontSize: 14,
            color: "var(--sb-ink-2)",
            marginBottom: 48,
          }}>
            <span style={{ fontSize: 18 }}>🧠</span>
            <span>Don't see Braino?{" "}
              <a
                href={EXTENSION_DOWNLOAD_URL}
                download={EXTENSION_DOWNLOAD_FILENAME}
                style={{ color: "var(--sb-accent)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Install the extension
              </a>
              {" "}then come back.
            </span>
          </div>
        </div>
      </section>

      {/* Prompt chips */}
      <section style={{ padding: "0 0 52px" }}>
        <div style={{ ...wrap, maxWidth: 860 }}>
          <p style={{ fontSize: 13, color: "var(--sb-ink-3)", marginBottom: 14, fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Try asking Braino —
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {PROMPTS.map((p) => (
              <Chip
                key={p}
                text={p}
                active={active === p}
                onClick={() => setActive(active === p ? null : p)}
              />
            ))}
          </div>
          {active && (
            <div style={{
              marginTop: 16,
              padding: "14px 18px",
              background: "var(--sb-accent-soft)",
              border: "1px solid var(--sb-accent)",
              borderRadius: 10,
              fontSize: 14,
              color: "var(--sb-ink-2)",
              lineHeight: 1.6,
            }}>
              <strong style={{ color: "var(--sb-ink)" }}>Say or type: </strong>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--sb-accent-deep)" }}>
                "{active}"
              </span>
              <span style={{ color: "var(--sb-ink-3)", marginLeft: 8 }}>— Braino can see everything on this page</span>
            </div>
          )}
        </div>
      </section>

      {/* Content */}
      <section style={{ padding: "0 0 100px" }}>
        <div style={wrap}>
          <ArticleSection />
          <hr style={divider} />
          <HotTakesSection />
          <hr style={divider} />
          <CodeSection />
          <hr style={divider} />
          <StatsSection />

          {/* Bottom CTA */}
          <hr style={divider} />
          <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
            <p style={{ fontSize: 15, color: "var(--sb-ink-3)", marginBottom: 20 }}>
              Everything on this page was built to be read, questioned, and discussed with Braino.
            </p>
            <a
              href={EXTENSION_DOWNLOAD_URL}
              download={EXTENSION_DOWNLOAD_FILENAME}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "var(--sb-accent)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "13px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "none",
                boxShadow: "0 4px 20px rgba(226,125,57,0.35)",
                transition: "opacity 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              Get Braino
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
