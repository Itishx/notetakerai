import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import "./onboarding-flow.css";

/* Braino setup flow — design study.
   Runs after Google sign-in (so the name and photo are already ours) and
   before any install button appears: he is yours before you have installed him.
   Everything is local state here; wiring writes these to the profile, the
   emotional engine, and the memory engine when "Get Started" points at it. */

const USER = { name: "Itish", email: "itishpande21@gmail.com" };

type Device = "chrome" | "mac" | "both";

const DEVICES: { id: Device; icon: string; name: string; note: string }[] = [
  { id: "chrome", icon: "◎", name: "In my browser", note: "He rides along in Chrome: reads the page, does the tab work, talks." },
  { id: "mac", icon: "⌘", name: "On my Mac", note: "The full companion. Files, apps, screen, voice, the whole machine." },
  { id: "both", icon: "◈", name: "Both", note: "One Braino, one memory, wherever you are working." },
];

const VOICES: { id: string; name: string; note: string }[] = [
  { id: "braino", name: "Braino", note: "His own voice. Warm, a little dry." },
  { id: "calm", name: "Calm", note: "Slower, softer. Good for late nights." },
  { id: "bright", name: "Bright", note: "Quick and awake. Good for mornings." },
  { id: "low", name: "Low", note: "Deeper, steady, fewer words." },
];

const TONES: { id: string; icon: string; name: string; note: string }[] = [
  { id: "warm", icon: "◐", name: "Warm", note: "Reads the room. Checks in when the day looks heavy." },
  { id: "direct", icon: "→", name: "Direct", note: "Answer first, no preamble, no cheerleading." },
  { id: "playful", icon: "✦", name: "Playful", note: "Jokes back. Still gets the work done." },
];

const INTERESTS = ["Studying", "Coding", "Meetings", "Writing", "Shopping", "Staying focused", "Music", "Email", "Research"];

const PERMISSIONS: { id: string; name: string; note: string; on: boolean }[] = [
  { id: "page", name: "The page you are on", on: true, note: "So you never have to paste anything in. Read when you ask, not stored." },
  { id: "screen", name: "Your screen", on: false, note: "Only in the moment you ask him to look. Nothing is recorded." },
  { id: "mic", name: "Your microphone", on: true, note: "For voice. It stays off until you press the hotkey or say his name." },
  { id: "files", name: "Your files", on: false, note: "Mac only. Lets him open, find, and file things for you." },
];

const HOTKEYS: Record<Device, { caps: string[]; name: string; note: string }[]> = {
  chrome: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Tap twice, start speaking." },
    { caps: ["Shift", "Shift"], name: "Let him roam", note: "He steps onto the page and follows along." },
    { caps: ["Esc"], name: "Stop", note: "Cuts him off mid-sentence. Always works." },
  ],
  mac: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Anywhere on the Mac, any app." },
    { caps: ["⌥", "⌥"], name: "Type what you say", note: "Silent dictation straight into the caret." },
    { caps: ["Esc"], name: "Stop", note: "Cuts him off mid-sentence. Always works." },
  ],
  both: [
    { caps: ["Ctrl", "Ctrl"], name: "Talk to him", note: "Same two keys in the browser and on the Mac." },
    { caps: ["⌥", "⌥"], name: "Type what you say", note: "Silent dictation straight into the caret." },
    { caps: ["Shift", "Shift"], name: "Let him roam", note: "He steps onto the page and follows along." },
  ],
};

const MEMORY_HINTS = [
  "I am building a company called Braino.",
  "I study at night and sleep badly.",
  "Keep answers short, I get headaches.",
];

function Walker() {
  return <div className="ob-walker" aria-hidden dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} />;
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<Device | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [tone, setTone] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [perms, setPerms] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PERMISSIONS.map((p) => [p.id, p.on])));
  const [memory, setMemory] = useState("");

  useEffect(() => { document.title = "Set up Braino"; }, []);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const toggleInterest = useCallback((label: string) => {
    setInterests((list) => (list.includes(label) ? list.filter((i) => i !== label) : [...list, label]));
  }, []);

  const steps = useMemo(() => [
    "hello", "device", "voice", "tone", "interests", "permissions", "keys", "memory", "done",
  ] as const, []);
  const total = steps.length;
  const current = steps[step];

  const canContinue =
    current === "device" ? Boolean(device) :
    current === "voice" ? Boolean(voice) :
    current === "tone" ? Boolean(tone) :
    current === "interests" ? interests.length > 0 :
    true;

  const next = () => setStep((s) => Math.min(s + 1, total - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const voiceName = VOICES.find((v) => v.id === voice)?.name ?? "Braino";
  const toneName = TONES.find((t) => t.id === tone)?.name ?? "Warm";
  const deviceName = device === "chrome" ? "Chrome" : device === "mac" ? "Mac" : "Chrome + Mac";
  const liveKeys = HOTKEYS[device ?? "both"];
  const onCount = PERMISSIONS.filter((p) => perms[p.id]).length;

  return (
    <div className="ob-doc">
      <header className="ob-top">
        <div className="ob-top-inner">
          <Link to="/" className="ob-mark"><i />braino</Link>
          <span className="ob-count">{current === "done" ? "All set" : `Step ${step + 1} of ${total - 1}`}</span>
        </div>
        <div className="ob-progress"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
      </header>

      <main className="ob-stage">
        {current === "hello" && (
          <section className="ob-step ob-hello">
            <Walker />
            <p className="ob-eyebrow">Welcome</p>
            <h1 className="ob-h1">Hello, <em>{USER.name}</em>.</h1>
            <p className="ob-lede">
              Before you install anything, let us make him yours. Eight quick questions,
              about two minutes, and he will already know how you like to work.
            </p>
            <div className="ob-avatar"><b>{USER.name.charAt(0)}</b>Signed in<small>{USER.email}</small></div>
          </section>
        )}

        {current === "device" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Where he lives</p>
            <h1 className="ob-h1">Where do you<br /><em>want him?</em></h1>
            <p className="ob-lede">You can add the other one later. Nothing gets left behind, he shares one memory.</p>
            <div className="ob-body ob-cards">
              {DEVICES.map((d) => (
                <button type="button" key={d.id} className={`ob-card${device === d.id ? " is-on" : ""}`} onClick={() => setDevice(d.id)}>
                  <span className="ob-tick">✓</span>
                  <span className="ob-card-icon">{d.icon}</span>
                  <p className="ob-card-name">{d.name}</p>
                  <p className="ob-card-note">{d.note}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {current === "voice" && (
          <section className="ob-step">
            <p className="ob-eyebrow">His voice</p>
            <h1 className="ob-h1">How should<br /><em>he sound?</em></h1>
            <p className="ob-lede">Tap one to hear a line. You can change it any time by just asking him to.</p>
            <div className="ob-body ob-voices">
              {VOICES.map((v) => (
                <button type="button" key={v.id} className={`ob-voice${voice === v.id ? " is-on" : ""}`} onClick={() => setVoice(v.id)}>
                  <span className="ob-wave" aria-hidden><i /><i /><i /><i /></span>
                  <span className="ob-voice-copy"><strong>{v.name}</strong><span>{v.note}</span></span>
                  <span className="ob-play">{voice === v.id ? "Playing" : "Hear it"}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {current === "tone" && (
          <section className="ob-step">
            <p className="ob-eyebrow">His manner</p>
            <h1 className="ob-h1">How should<br /><em>he talk to you?</em></h1>
            <p className="ob-lede">This sets his default. He still reads the moment, so a heavy day sounds different from a good one.</p>
            <div className="ob-body ob-cards">
              {TONES.map((t) => (
                <button type="button" key={t.id} className={`ob-card${tone === t.id ? " is-on" : ""}`} onClick={() => setTone(t.id)}>
                  <span className="ob-tick">✓</span>
                  <span className="ob-card-icon">{t.icon}</span>
                  <p className="ob-card-name">{t.name}</p>
                  <p className="ob-card-note">{t.note}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {current === "interests" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Your work</p>
            <h1 className="ob-h1">What should he<br /><em>be good at first?</em></h1>
            <p className="ob-lede">Pick anything that fits. He starts here and learns the rest by watching how you actually work.</p>
            <div className="ob-body ob-chips">
              {INTERESTS.map((label) => (
                <button type="button" key={label} className={`ob-chip${interests.includes(label) ? " is-on" : ""}`} onClick={() => toggleInterest(label)}>
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {current === "permissions" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Trust</p>
            <h1 className="ob-h1">What he<br /><em>can see.</em></h1>
            <p className="ob-lede">Plainly, with no fine print. Say no to any of it and he still works, just with less to go on.</p>
            <div className="ob-body ob-perms">
              {PERMISSIONS.map((p) => (
                <div className="ob-perm" key={p.id}>
                  <span className="ob-perm-copy"><strong>{p.name}</strong><span>{p.note}</span></span>
                  <button
                    type="button"
                    aria-label={`${perms[p.id] ? "Turn off" : "Turn on"} ${p.name}`}
                    className={`ob-switch${perms[p.id] ? " is-on" : ""}`}
                    onClick={() => setPerms((state) => ({ ...state, [p.id]: !state[p.id] }))}
                  ><i /></button>
                </div>
              ))}
            </div>
            <p className="ob-fineprint">
              {onCount} of {PERMISSIONS.length} on. Every one of these is asked for again by your operating system,
              and you can pull any of them back from his dashboard in one tap.
            </p>
          </section>
        )}

        {current === "keys" && (
          <section className="ob-step">
            <p className="ob-eyebrow">Muscle memory</p>
            <h1 className="ob-h1">Three keys,<br /><em>that is the manual.</em></h1>
            <p className="ob-lede">Tapped twice, quickly. Same everywhere he lives, so your hands only learn this once.</p>
            <div className="ob-body ob-keys">
              {liveKeys.map((k) => (
                <div className="ob-key" key={k.name}>
                  <span className="ob-caps">
                    {k.caps.map((cap, i) => (
                      <span key={`${cap}-${i}`}>
                        {i > 0 && <span className="ob-cap-x">×</span>}
                        <span className="ob-cap">{cap}</span>
                      </span>
                    ))}
                  </span>
                  <span className="ob-key-copy"><strong>{k.name}</strong><span>{k.note}</span></span>
                </div>
              ))}
            </div>
          </section>
        )}

        {current === "memory" && (
          <section className="ob-step">
            <p className="ob-eyebrow">His first memory</p>
            <h1 className="ob-h1">Tell him one<br /><em>thing about you.</em></h1>
            <p className="ob-lede">Anything. He keeps it, and it shows up the first time it matters. This is the moment he stops being a download.</p>
            <div className="ob-body">
              <div className="ob-memory">
                <input
                  value={memory}
                  onChange={(e) => setMemory(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && memory.trim()) next(); }}
                  placeholder="I am building a company and I sleep badly…"
                />
                <button type="button" className="ob-btn is-coral" onClick={next} disabled={!memory.trim()}>Save</button>
              </div>
              <div className="ob-suggests">
                {MEMORY_HINTS.map((hint) => (
                  <button type="button" key={hint} className="ob-suggest" onClick={() => setMemory(hint)}>{hint}</button>
                ))}
              </div>
            </div>
          </section>
        )}

        {current === "done" && (
          <section className="ob-step ob-done">
            <Walker />
            <p className="ob-eyebrow">Ready</p>
            <h1 className="ob-h1">Braino is <em>yours.</em></h1>
            <p className="ob-lede">He is set up and waiting. Installing him is the last thing, not the first.</p>
            <div className="ob-summary">
              <div><span>Voice</span><b>{voiceName}</b></div>
              <div><span>Manner</span><b>{toneName}</b></div>
              <div><span>Lives in</span><b>{deviceName}</b></div>
              <div><span>Good at</span><b>{interests.length ? interests.slice(0, 3).join(", ") : "Learning as he goes"}</b></div>
              <div><span>He can see</span><b>{onCount} of {PERMISSIONS.length}</b></div>
              {memory.trim() && <div><span>Remembers</span><b>{memory.trim()}</b></div>}
            </div>
            <div className="ob-installs">
              {device !== "mac" && <button type="button" className="ob-btn">Add to Chrome</button>}
              {device !== "chrome" && <button type="button" className="ob-btn is-outline">Download for Mac</button>}
            </div>
          </section>
        )}
      </main>

      <footer className="ob-foot">
        <button type="button" className="ob-btn is-quiet" onClick={back} style={{ visibility: step === 0 ? "hidden" : "visible" }}>← Back</button>
        {current === "done" ? (
          <Link to="/" className="ob-skip">Back to trybraino.com</Link>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {(current === "interests" || current === "memory") && (
              <button type="button" className="ob-skip" onClick={next}>Skip</button>
            )}
            <button type="button" className="ob-btn" onClick={next} disabled={!canContinue}>
              {current === "hello" ? "Get started" : "Continue"}
            </button>
          </span>
        )}
      </footer>
    </div>
  );
}
