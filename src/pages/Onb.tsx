/* Braino Companion onboarding — "his first day on the job".
 *
 * Six steps, about four minutes, and not one typed field. The rule the whole
 * flow obeys: HE EARNS EACH QUESTION BY DOING WORK FIRST. Two earlier versions
 * failed in testing for breaking it — a five-question voice interview felt like
 * a tracker intake form, and a screen of connect buttons felt like settings.
 *
 * The moment the flow exists for is step 3. He reads three months of calendar
 * history and then briefs YOU about your own week, out loud, before he has
 * asked you a single thing about it. Everything before it is setup for that,
 * and everything after it is cheap because he has already proved he was paying
 * attention.
 *
 * This is the WEB build, so the native halves cannot really run here: EventKit,
 * the macOS account name, and Spotify's OAuth all live on the Mac. Those are
 * marked `simulated` and say so on screen rather than pretending. The parts
 * that are real in a browser — the paste-in memory import, every correction,
 * the read-back editing, the whole state machine — are real.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./onb.css";

type Persona = "student" | "founder" | "engineer" | "designer" | "writer" | "corporate" | "other";

type Claim = { id: string; text: string; kind: "pattern" | "task" | "person"; ok: boolean | null };

type Notebook = {
  name: string;
  persona: Persona | null;
  patterns: Claim[];
  tasks: string[];
  people: string[];
  music: string[];
  projects: string[];
  imported: string[];
  priority: string;
};

const EMPTY: Notebook = {
  name: "", persona: null, patterns: [], tasks: [], people: [],
  music: [], projects: [], imported: [], priority: "",
};

/* Seven, because "Other" has to be there and six felt like a quiz. Each one
   changes the greet templates, which features lead, and which power-ups get
   suggested — so the panel on the right is a real preview, not decoration. */
const PERSONAS: { id: Persona; label: string; blurb: string; demo: string[] }[] = [
  { id: "student",   label: "Student",   blurb: "lectures, deadlines, revision",
    demo: ["9:00  Lectures start. He takes the notes.", "14:00  Assignment due Thursday, still untouched.", "Evening  Everything you missed, in one page."] },
  { id: "founder",   label: "Founder",   blurb: "meetings, inbox, shipping",
    demo: ["9:00  Three calls today, one needs prep.", "11:00  Standup. He writes what you promised.", "Evening  Two emails that actually need you."] },
  { id: "engineer",  label: "Engineer",  blurb: "deep work, reviews, context",
    demo: ["9:00  Two hours clear before standup.", "13:00  Review queue: 4 waiting on you.", "Evening  What you shipped, written up."] },
  { id: "designer",  label: "Designer",  blurb: "crits, references, handoff",
    demo: ["10:00  Crit at 2, work not exported yet.", "Afternoon  Refs you saved, gathered.", "Evening  Feedback from the crit, sorted."] },
  { id: "writer",    label: "Writer",    blurb: "drafts, research, dictation",
    demo: ["Morning  Two clear hours. Talk, he types.", "Anytime  Anything you read, summarised.", "Evening  Word count, and what is left."] },
  { id: "corporate", label: "Corporate", blurb: "meetings, follow-ups, reports",
    demo: ["9:00  Four meetings. He sits in all of them.", "Anytime  Everything you agreed to, tracked.", "Evening  Tomorrow's prep, already done."] },
  { id: "other",     label: "Other",     blurb: "he will work it out",
    demo: ["He watches the first week and adapts.", "No template, no assumptions.", "Ask him for anything meanwhile."] },
];

/* The calendar brief, per persona. On the Mac this comes out of three months of
   real EventKit history; here it is a fixed set so the moment can be seen. The
   SHAPE is the contract: three or four claims, each one specific enough to be
   wrong, so correcting them is fast and feels like talking. A vague claim
   ("you're busy midweek") cannot be corrected and teaches him nothing. */
const BRIEF: Record<Persona, Claim[]> = {
  student: [
    { id: "p1", text: "Lectures Monday to Thursday, mostly 9 to 11", kind: "pattern", ok: null },
    { id: "p2", text: "Fridays are almost always free", kind: "pattern", ok: null },
    { id: "p3", text: "You put things off until the night before", kind: "pattern", ok: null },
    { id: "t1", text: "3 reminders already overdue", kind: "task", ok: null },
  ],
  founder: [
    { id: "p1", text: "Standup every weekday at 11", kind: "pattern", ok: null },
    { id: "p2", text: "Thursdays are your heaviest day, 5 calls", kind: "pattern", ok: null },
    { id: "p3", text: "Mornings before 11 are almost always free", kind: "pattern", ok: null },
    { id: "t1", text: "2 follow-ups you marked and never did", kind: "task", ok: null },
  ],
  engineer: [
    { id: "p1", text: "Standup at 10, then nothing until 2", kind: "pattern", ok: null },
    { id: "p2", text: "Wednesdays get eaten by meetings", kind: "pattern", ok: null },
    { id: "p3", text: "You work latest on Tuesdays", kind: "pattern", ok: null },
    { id: "t1", text: "4 reviews sitting in your reminders", kind: "task", ok: null },
  ],
  designer: [
    { id: "p1", text: "Crits on Tuesdays and Fridays, 2pm", kind: "pattern", ok: null },
    { id: "p2", text: "Mornings are yours, nothing booked", kind: "pattern", ok: null },
    { id: "p3", text: "Handoff always lands on a Friday", kind: "pattern", ok: null },
  ],
  writer: [
    { id: "p1", text: "Nothing booked before noon, most days", kind: "pattern", ok: null },
    { id: "p2", text: "Calls cluster on Wednesday afternoons", kind: "pattern", ok: null },
    { id: "p3", text: "Deadlines land at the end of the month", kind: "pattern", ok: null },
  ],
  corporate: [
    { id: "p1", text: "Back to back 10 to 4, most weekdays", kind: "pattern", ok: null },
    { id: "p2", text: "Fridays after 3 are usually clear", kind: "pattern", ok: null },
    { id: "p3", text: "Monday mornings are your only quiet slot", kind: "pattern", ok: null },
    { id: "t1", text: "6 follow-ups with no date on them", kind: "task", ok: null },
  ],
  other: [
    { id: "p1", text: "Your week has no fixed shape yet", kind: "pattern", ok: null },
    { id: "p2", text: "Most of your time is unbooked", kind: "pattern", ok: null },
  ],
};

const PEOPLE_SEED = ["Mom", "Bhaskar", "Ananya", "the standup group"];

/* Spoken lines are typed out rather than dropped in, because he is talking and
   text that appears instantly does not read as speech. 18ms a character is
   about 190 words a minute, which is a person talking normally. */
function useTyped(text: string, on: boolean, speed = 18) {
  const [out, setOut] = useState("");
  const done = out.length >= text.length;
  useEffect(() => {
    if (!on) { setOut(""); return; }
    setOut("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setOut(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, on, speed]);
  return { out, done };
}

/* A notebook row that has just arrived gets the landing animation ONCE. Keyed
   on content, so re-renders do not re-trigger it and the panel never strobes. */
function Row({ children, k }: { children: React.ReactNode; k: string }) {
  const [fresh, setFresh] = useState(true);
  useEffect(() => {
    setFresh(true);
    const id = window.setTimeout(() => setFresh(false), 700);
    return () => window.clearTimeout(id);
  }, [k]);
  return <div className={"onb-row" + (fresh ? " is-new" : "")}>{children}</div>;
}


/* ── What changes about your Mac ───────────────────────────────────────────
 *
 * Three mockups, and each one has to make its own argument without the caption.
 * A screenshot that only makes sense once you have read the sentence above it
 * is decoration; the picture is supposed to be the evidence.
 *
 * The meetings one is a BEFORE and AFTER for that reason. "He takes meeting
 * notes invisibly" is a sentence every notetaker writes. Showing the other
 * tool's bot sitting in the participant list with a name and a recording banner,
 * next to the same call with four people in it and nothing else, is the part
 * nobody else can show.
 */

const SHOWCASE = [
  { id: "meetings", label: "Meetings", claim: "Nobody knows he was there." },
  { id: "dictate",  label: "Dictation", claim: "Talk into any box on the Mac." },
  { id: "does",     label: "Doing",     claim: "He works the Mac himself." },
];

function MacShowcase({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const item = SHOWCASE[i];
  const last = i === SHOWCASE.length - 1;

  return (
    <div className="mac-show">
      <div className="mac-tabs">
        {SHOWCASE.map((s, n) => (
          <button
            key={s.id}
            className={"mac-tab" + (n === i ? " is-on" : "")}
            onClick={() => setI(n)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <p className="mac-claim">{item.claim}</p>

      {item.id === "meetings" && (
        <div className="mac-pair">
          {/* Every other notetaker. The bot has a NAME and it is in the list. */}
          <figure className="mac-figure is-them">
            <figcaption>Every other notetaker</figcaption>
            <div className="mac-win">
              <div className="mac-bar"><i /><i /><i /><em>Weekly sync</em></div>
              <div className="mac-rec"><span className="mac-dot" />Recording</div>
              <ul className="mac-people">
                <li>Ananya Rao</li>
                <li>Bhaskar M</li>
                <li>You</li>
                <li className="is-bot">Otter Notetaker<span>bot</span></li>
              </ul>
            </div>
          </figure>

          <figure className="mac-figure is-him">
            <figcaption>Braino</figcaption>
            <div className="mac-win">
              <div className="mac-bar"><i /><i /><i /><em>Weekly sync</em></div>
              <ul className="mac-people">
                <li>Ananya Rao</li>
                <li>Bhaskar M</li>
                <li>You</li>
              </ul>
              <p className="mac-note">
                Three people in the call. Three people in the list.
              </p>
            </div>
          </figure>
        </div>
      )}

      {item.id === "dictate" && (
        <div className="mac-solo">
          <div className="mac-win">
            <div className="mac-bar"><i /><i /><i /><em>New Message</em></div>
            <div className="mac-mail">
              <p className="mac-field"><b>To</b> bhaskar@mesa.school</p>
              <p className="mac-field"><b>Subject</b> Thursday</p>
              <p className="mac-typed">
                Hey Bhaskar, I can't make Thursday. Can we push it to Monday
                morning<span className="mac-caret" />
              </p>
            </div>
            <div className="mac-mic"><span /><span /><span /><span /><span />Listening</div>
          </div>
          <p className="mac-foot">Double-tap Option. Any app, any text field.</p>
        </div>
      )}

      {item.id === "does" && (
        <div className="mac-solo">
          <div className="mac-win">
            <div className="mac-bar"><i /><i /><i /><em>Finder — Downloads</em></div>
            <div className="mac-files">
              {["Screenshot 2026-09-02.png", "deck-v4-FINAL.key", "invoice_8821.pdf", "IMG_4471.HEIC"].map((f) => (
                <div className="mac-file" key={f}><span className="mac-ico" />{f}</div>
              ))}
            </div>
            <div className="mac-doing"><span className="mac-spin" />Sorting 184 files into folders</div>
          </div>
          <p className="mac-foot">You asked out loud. He opened it and did it.</p>
        </div>
      )}

      <div className="onb-actions">
        {!last && <button className="onb-btn ghost" onClick={() => setI(i + 1)}>Next</button>}
        <button className="onb-btn" onClick={onDone}>{last ? "Got it" : "Skip ahead"}</button>
      </div>
    </div>
  );
}

export default function Onb() {
  const [step, setStep] = useState(0);           // 0..6, 6 = next morning
  const [nb, setNb] = useState<Notebook>(EMPTY);
  const [nameOk, setNameOk] = useState(false);
  const [granted, setGranted] = useState(false);
  const [reading, setReading] = useState(false);
  const [pasted, setPasted] = useState("");
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [priorityPick, setPriorityPick] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const persona = nb.persona;
  const go = useCallback((n: number) => setStep(n), []);

  /* Step 1. On the Mac the name comes from the macOS account and is CONFIRMED,
     never asked. Here there is no account to read, so the flow shows the same
     confirm shape against a placeholder and says where it would come from. */
  const line1 = "Hey. I'm Braino. I run your day so it runs itself.";
  const t1 = useTyped(line1, step === 1);

  const briefLine = useMemo(() => {
    if (!persona) return "";
    const claims = BRIEF[persona].filter((c) => c.kind === "pattern");
    /* Joined, never re-cased. Lower-casing them to make one flowing sentence
       also lower-cased the day names, and "thursdays are your heaviest day"
       reads as a typo in his speech. Each claim keeps its own capitals. */
    const DAYS = /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day/;
    const said = claims.map((c, i) =>
      i === 0 || DAYS.test(c.text) ? c.text : c.text.charAt(0).toLowerCase() + c.text.slice(1),
    ).join(", and ");
    return `Okay, I see it. ${said}. That about right?`;
  }, [persona]);
  const t3 = useTyped(briefLine, step === 4 && granted && !reading);

  /* The grant is one button because it is one decision. Calendar, Reminders and
     Contacts are all EventKit-family on the Mac, so they are one native prompt
     rather than three, and splitting them into three screens is how a flow
     starts feeling like a settings page. */
  function grant() {
    setGranted(true);
    setReading(true);
    window.setTimeout(() => {
      setReading(false);
      setNb((p) => ({
        ...p,
        patterns: persona ? BRIEF[persona] : [],
        tasks: persona ? BRIEF[persona].filter((c) => c.kind === "task").map((c) => c.text) : [],
        people: PEOPLE_SEED,
      }));
    }, 2600);
  }

  function judge(id: string, ok: boolean) {
    setNb((p) => ({ ...p, patterns: p.patterns.map((c) => (c.id === id ? { ...c, ok } : c)) }));
  }

  function editClaim(id: string, text: string) {
    setNb((p) => ({ ...p, patterns: p.patterns.map((c) => (c.id === id ? { ...c, text, ok: true } : c)) }));
  }

  /* The memory import is the one power-up that is fully real in a browser, and
     it is the one nobody else has. A year of context from another assistant,
     pasted in, parsed into the notebook. */
  function importMemory() {
    const lines = pasted.split(/\n+/).map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean).slice(0, 8);
    if (!lines.length) return;
    setNb((p) => ({ ...p, imported: lines }));
    setConnected((c) => ({ ...c, memory: true }));
  }

  function connect(id: string) {
    setConnected((c) => ({ ...c, [id]: true }));
    if (id === "spotify") setNb((p) => ({ ...p, music: ["Arctic Monkeys", "Fred again..", "lofi, most afternoons"] }));
    if (id === "notion")  setNb((p) => ({ ...p, projects: ["Braino", "Mesa coursework"] }));
  }

  const filled =
    (nb.name ? 1 : 0) + (nb.persona ? 1 : 0) + (nb.patterns.length ? 1 : 0) +
    (nb.music.length ? 1 : 0) + (nb.projects.length ? 1 : 0) +
    (nb.imported.length ? 1 : 0) + (nb.priority ? 1 : 0);

  const PRIORITIES = persona === "student"
    ? ["My lecture notes", "Chasing deadlines", "Reading I never finish", "Planning my week"]
    : ["My inbox", "Meeting notes", "Following up on things", "Planning my week"];

  return (
    <div className="onb">
      {/* LEFT: his side. Dark, because this is his world and the notch is black. */}
      <div className="onb-stage">
        <div className="onb-stage-inner">

          {step === 0 && (
            <div className="onb-boot">
              <div className="onb-notch" onClick={() => go(1)}>
                <span className="onb-eye" /><span className="onb-eye" />
              </div>
              <p className="onb-kicker">Braino</p>
              <h1 className="onb-h1">His first day<br />on the job.</h1>
              <p className="onb-sub">About four minutes. Nothing to type.</p>
              <button className="onb-btn" onClick={() => go(1)}>Wake him up</button>
              <p className="onb-fine">A web walkthrough of the Mac flow. The native parts are marked.</p>
            </div>
          )}

          {step === 1 && (
            <div className="onb-say">
              <img className="onb-masc" src="/braino-standing.svg" alt="" />
              <p className="onb-line">{t1.out}<i className="onb-caret" /></p>
              {t1.done && (
                <div className="onb-confirm">
                  <p className="onb-ask">You're <b>Itish</b>, right?</p>
                  <p className="onb-native">from your Mac account, not asked</p>
                  <div className="onb-actions">
                    <button className="onb-btn" onClick={() => { setNb((p) => ({ ...p, name: "Itish" })); setNameOk(true); go(2); }}>That's me</button>
                    <button className="onb-btn ghost" onClick={() => { setNb((p) => ({ ...p, name: "you" })); setNameOk(true); go(2); }}>Not quite</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="onb-block">
              <p className="onb-kicker">Step 2</p>
              <h2 className="onb-h2">What kind of days do I run?</h2>
              <p className="onb-sub">Pick one. The panel shows your Braino, not a generic one.</p>
              <div className="onb-personas">
                {PERSONAS.map((p) => (
                  <button
                    key={p.id}
                    className={"onb-persona" + (persona === p.id ? " is-on" : "")}
                    onClick={() => setNb((n) => ({ ...n, persona: p.id }))}
                  >
                    <b>{p.label}</b><span>{p.blurb}</span>
                  </button>
                ))}
              </div>
              <button className="onb-btn" disabled={!persona} onClick={() => go(3)}>
                {persona ? "That's me" : "Pick one"}
              </button>
            </div>
          )}


          {step === 3 && (
            <div className="onb-block">
              <p className="onb-kicker">Step 3</p>
              <h2 className="onb-h2">What changes about your Mac.</h2>
              <p className="onb-sub">Three things you cannot do today. Tap through them.</p>
              <MacShowcase onDone={() => go(4)} />
            </div>
          )}
          {step === 4 && (
            <div className="onb-block">
              <p className="onb-kicker">Step 4</p>
              {!granted && (
                <>
                  <h2 className="onb-h2">I'll need your calendar.</h2>
                  <p className="onb-sub">
                    Calendar, Reminders and Contacts. One permission on the Mac, not three,
                    and it never leaves the machine.
                  </p>
                  <div className="onb-perm">
                    <span>Calendar</span><span>Reminders</span><span>Contacts</span>
                  </div>
                  <div className="onb-actions">
                    <button className="onb-btn" onClick={grant}>Allow</button>
                    <button className="onb-btn ghost" onClick={() => go(5)}>Not now</button>
                  </div>
                  <p className="onb-native">simulated here. EventKit on the Mac, no OAuth</p>
                </>
              )}

              {granted && reading && (
                <div className="onb-reading">
                  <div className="onb-dots"><i /><i /><i /></div>
                  <p className="onb-sub">Reading the last three months…</p>
                </div>
              )}

              {granted && !reading && (
                <>
                  <h2 className="onb-h2">Here's your week.</h2>
                  <p className="onb-line small">{t3.out}<i className="onb-caret" /></p>
                  {t3.done && (
                    <>
                      <div className="onb-claims">
                        {nb.patterns.filter((c) => c.kind === "pattern").map((c) => (
                          <div key={c.id} className={"onb-claim" + (c.ok === false ? " is-wrong" : c.ok ? " is-ok" : "")}>
                            {editing === c.id ? (
                              <input
                                className="onb-fix"
                                autoFocus
                                defaultValue={c.text}
                                onBlur={(e) => { editClaim(c.id, e.target.value); setEditing(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { editClaim(c.id, (e.target as HTMLInputElement).value); setEditing(null); }
                                  if (e.key === "Escape") setEditing(null);
                                }}
                              />
                            ) : (
                              <>
                                <p>{c.text}</p>
                                <div className="onb-judge">
                                  <button onClick={() => judge(c.id, true)} aria-label="right">Right</button>
                                  <button onClick={() => setEditing(c.id)} aria-label="wrong">Not quite</button>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="onb-fine">Correct anything. On the Mac you just say it out loud.</p>
                      <button className="onb-btn" onClick={() => go(5)}>That's my week</button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="onb-block">
              <p className="onb-kicker">Step 5</p>
              <h2 className="onb-h2">Anything else you want me to know?</h2>
              <p className="onb-sub">All optional. Skip the lot if you like.</p>

              <div className="onb-ups">
                <button className={"onb-up" + (connected.spotify ? " is-on" : "")} onClick={() => connect("spotify")}>
                  <b>Spotify</b><span>{connected.spotify ? "Got your taste" : "So I know what you play"}</span>
                </button>
                <button className={"onb-up" + (connected.notion ? " is-on" : "")} onClick={() => connect("notion")}>
                  <b>Notion</b><span>{connected.notion ? "Found your projects" : "Where your projects live"}</span>
                </button>
                <div className="onb-up is-wide">
                  <b>Bring your memory over</b>
                  <span>Ask ChatGPT or Claude what it knows about you. Paste the answer here.</span>
                  <textarea
                    className="onb-paste"
                    placeholder="paste it here"
                    value={pasted}
                    onChange={(e) => setPasted(e.target.value)}
                    rows={3}
                  />
                  <button className="onb-btn sm" onClick={importMemory} disabled={!pasted.trim()}>
                    {connected.memory ? "Brought it over" : "Bring it over"}
                  </button>
                </div>
                <div className="onb-up is-soon"><b>Gmail</b><span>soon</span></div>
              </div>

              <button className="onb-btn" onClick={() => go(6)}>Done here</button>
            </div>
          )}

          {step === 6 && (
            <div className="onb-block">
              <p className="onb-kicker">Step 6</p>
              <h2 className="onb-h2">Here's everything I know so far.</h2>
              <p className="onb-sub">It's all on the right. Change anything that's wrong.</p>
              <p className="onb-fine">
                {filled} of 7 sections filled, and you have not typed a form field once.
              </p>
              <button className="onb-btn" onClick={() => go(7)}>Looks right</button>
            </div>
          )}

          {step === 7 && !nb.priority && (
            <div className="onb-block">
              <p className="onb-kicker">Step 7</p>
              <h2 className="onb-h2">What should I take off your plate first?</h2>
              <p className="onb-sub">On the Mac you say it. Here, pick one.</p>
              <div className="onb-priorities">
                {PRIORITIES.map((p) => (
                  <button key={p} className={"onb-pri" + (priorityPick === p ? " is-on" : "")} onClick={() => setPriorityPick(p)}>{p}</button>
                ))}
              </div>
              <button className="onb-btn" disabled={!priorityPick} onClick={() => setNb((n) => ({ ...n, priority: priorityPick }))}>
                That one
              </button>
            </div>
          )}

          {step === 7 && nb.priority && (
            <div className="onb-say">
              <img className="onb-masc" src="/braino-standing.svg" alt="" />
              <p className="onb-line">Done. See you tomorrow at nine.</p>
              <p className="onb-fine">He never says "setup complete". He goes back into the notch.</p>
              <button className="onb-btn" onClick={() => go(8)}>Skip to tomorrow morning</button>
            </div>
          )}

          {step === 8 && (
            <div className="onb-morning">
              <p className="onb-kicker">Next morning, 9:00</p>
              <div className="onb-greet">
                <div className="onb-greet-notch"><span className="onb-eye" /><span className="onb-eye" /></div>
                <p className="onb-greet-line">
                  Morning{nb.name && nb.name !== "you" ? `, ${nb.name}` : ""}.{" "}
                  {nb.patterns.find((c) => c.kind === "pattern")?.text.replace(/^You /, "you ") || "Nothing booked yet"}
                  {nb.tasks.length ? `, and ${nb.tasks[0].toLowerCase()}` : ""}.
                  {nb.priority ? ` I've started on ${nb.priority.replace(/^My /, "your ").toLowerCase().replace(/^your /, "your ")}.` : ""}
                </p>
              </div>
              <p className="onb-sub">
                Nobody opened anything. He dropped down on his own, and every word of that
                came from the four minutes above.
              </p>
              <p className="onb-fine">This is where onboarding actually ends.</p>
              <div className="onb-actions">
                <button className="onb-btn ghost" onClick={() => { setNb(EMPTY); setGranted(false); setPasted(""); setConnected({}); setPriorityPick(""); go(0); }}>
                  Run it again
                </button>
                <Link className="onb-btn ghost" to="/">Home</Link>
              </div>
            </div>
          )}
        </div>

        {step > 0 && step < 8 && (
          <div className="onb-progress">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <i key={n} className={n <= step ? "is-done" : undefined} />
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: your side. Paper, because the notebook is yours, not his.
          Every section is shaped to its own data rather than to a common row:
          confirmed patterns get a tick, things you owe get a box, people and
          taste get chips, and the priority gets the only tinted card on the
          page because it is the payoff. A uniform list of hairlines made all
          eight sections read as equally important, which is another way of
          saying none of them did. */}
      <aside className="onb-book">
        <div className="onb-book-head">
          <div>
            <p className="onb-book-title">Your notebook</p>
            <p className="onb-book-sub">{filled ? "Filling in as you talk" : "Nothing in it yet"}</p>
          </div>
          <div className="onb-fill" aria-label={`${filled} of 7 sections`}>
            {[0,1,2,3,4,5,6].map((n) => <i key={n} className={n < filled ? "is-on" : undefined} />)}
          </div>
        </div>

        {filled === 0 && (
          <div className="onb-empty">
            <span className="onb-empty-mark" />
            <p>He hasn't met you yet.</p>
          </div>
        )}

        {nb.name && (
          <div className="onb-id">
            <img src="/braino-standing.svg" alt="" />
            <div>
              <b>{nb.name}</b>
              {nb.persona && <span>{PERSONAS.find((p) => p.id === nb.persona)?.label}</span>}
            </div>
          </div>
        )}

        {nb.persona && step >= 2 && (
          <section className="onb-sec c-blue">
            <h3><i />What a day looks like</h3>
            <div className="onb-day">
              {PERSONAS.find((p) => p.id === nb.persona)!.demo.map((d) => {
                const [when, ...rest] = d.split(/\s{2,}/);
                return (
                  <Row k={d} key={d}>
                    <em className="onb-when">{when}</em>
                    <span>{rest.join(" ")}</span>
                  </Row>
                );
              })}
            </div>
          </section>
        )}

        {nb.patterns.some((c) => c.kind === "pattern") && (
          <section className="onb-sec c-coral">
            <h3><i />Your week</h3>
            {nb.patterns.filter((c) => c.kind === "pattern").map((c) => (
              <Row k={c.text + c.ok} key={c.id}>
                <span className={"onb-tick" + (c.ok ? " is-on" : "")} aria-hidden="true" />
                <span className="onb-txt">{c.text}</span>
              </Row>
            ))}
          </section>
        )}

        {nb.tasks.length > 0 && (
          <section className="onb-sec c-amber">
            <h3><i />Already on your plate</h3>
            {nb.tasks.map((t) => (
              <Row k={t} key={t}>
                <span className="onb-box" aria-hidden="true" />
                <span className="onb-txt">{t}</span>
              </Row>
            ))}
          </section>
        )}

        {nb.people.length > 0 && (
          <section className="onb-sec c-violet">
            <h3><i />People</h3>
            <div className="onb-chips">
              {nb.people.map((x) => <span className="onb-chip" key={x}>{x}</span>)}
            </div>
          </section>
        )}

        {nb.music.length > 0 && (
          <section className="onb-sec c-green">
            <h3><i />What you listen to</h3>
            <div className="onb-chips">
              {nb.music.map((x) => <span className="onb-chip" key={x}>{x}</span>)}
            </div>
          </section>
        )}

        {nb.projects.length > 0 && (
          <section className="onb-sec c-blue">
            <h3><i />What you're working on</h3>
            <div className="onb-chips">
              {nb.projects.map((x) => <span className="onb-chip" key={x}>{x}</span>)}
            </div>
          </section>
        )}

        {nb.imported.length > 0 && (
          <section className="onb-sec c-violet">
            <h3><i />Brought over</h3>
            {nb.imported.map((x, n) => (
              <Row k={x + n} key={x + n}><span className="onb-quote">{x}</span></Row>
            ))}
          </section>
        )}

        {nb.priority && (
          <div className="onb-payoff">
            <p>First thing off your plate</p>
            <b>{nb.priority}</b>
          </div>
        )}
      </aside>
    </div>
  );
}
