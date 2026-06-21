/**
 * brainoTourScenes — the rich Braino feature card ("VCard") rendered inside the tour's glass card,
 * ported from the design project's `Braino Site Tour - Split` (vcard.jsx + the split-tour CSS):
 * number badge → serif title → mono subtitle → coral tags → divider → big serif headline + body
 * + a CSS-drawn product mockup, then a "what I can do for you" list. One per capability.
 */
import { type CSSProperties } from "react";

type Card = {
  num: string; title: string; sub: string; tags: string[];
  head: string[]; body: string; mock: "chat" | "record" | "meet" | "task";
  rows: [string, string][];
};

export const CARD_DATA: Card[] = [
  { num: "01", title: "Chat with Page", sub: "Ask anything about what's on screen",
    tags: ["Summarise", "Explain docs", "LeetCode", "Code review", "Research synthesis", "Extract data"],
    head: ["Read anything.", "Understand", "everything."], mock: "chat",
    body: "Open me on any URL — article, PDF, GitHub diff, research paper, product page — and talk to it. Ask questions, get summaries, extract data, or get a second opinion. No copying, no switching tabs.",
    rows: [
      ["I summarise long articles & research papers instantly", "Researchers · analysts"],
      ["I explain complex documentation step by step", "Developers · students"],
      ["I give LeetCode hints without leaving the problem", "Engineers · students"],
      ["I pull structured data out of any table or page", "Analysts · ops"],
      ["I fact-check and give a second opinion on the spot", "Writers · everyone"],
    ] },
  { num: "02", title: "Record & Capture", sub: "Turn any audio into structured notes",
    tags: ["Lectures", "Podcasts", "Language learning", "Training videos", "Content repurposing"],
    head: ["Listen once.", "Remember", "forever."], mock: "record",
    body: "I record audio from any browser tab — lectures, podcasts, training videos — and give you clean, structured notes back. Headings, key terms, summaries. Ready to sync to Notion.",
    rows: [
      ["I build course notes with headings & glossary", "Students · self-learners"],
      ["I summarise podcast key takeaways", "Professionals · curious minds"],
      ["I transcribe language learning content + vocab notes", "Language learners"],
      ["I turn training videos into step-by-step guides", "Teams · onboarding"],
      ["I clip the highlights and quote the timestamps", "Creators · editors"],
    ] },
  { num: "03", title: "Meetings", sub: "Auto-notes for every call you join",
    tags: ["Zoom", "Google Meet", "Teams", "Action items", "Follow-up emails", "Decision log"],
    head: ["Every meeting.", "Perfectly", "captured."], mock: "meet",
    body: "Join any video call and I quietly record, transcribe, and structure everything. Action items, decisions, and follow-up emails are drafted the moment the call ends — without you lifting a finger.",
    rows: [
      ["I auto-transcribe Zoom, Meet & Teams calls in real time", "Everyone"],
      ["I extract action items and decisions automatically", "Managers · teams"],
      ["I draft follow-up emails right after the call", "Sales · account managers"],
      ["I track who-owns-what across every meeting", "Project managers"],
      ["I build a searchable history of every call", "Teams · leads"],
    ] },
  { num: "04", title: "Delegate Tasks", sub: "Describe it. I do it.",
    tags: ["Email drafts", "Form filling", "Job applications", "Product research", "Calendar events"],
    head: ["Say what you want.", "Watch it happen."], mock: "task",
    body: "I can operate your browser for you. Email drafts, form filling, job applications, product research, calendar events — describe the task in plain English and I handle all the clicking.",
    rows: [
      ["I draft & send Gmail replies in a single sentence", "Everyone"],
      ["I auto-fill repetitive job application forms", "Job seekers"],
      ["I research & compare products across multiple pages", "Shoppers · buyers"],
      ["I book calendar events from plain English", "Professionals"],
      ["I fill forms and checkout flows end to end", "Power users"],
    ] },
];

/* Per-card narration line Braino speaks (mouth moving) while the card is shown. */
export const CARD_LINES = [
  "First — open me on any page and just ask. I read the whole thing.",
  "Hit record before a lecture and you'll get a clean transcript + tidy notes.",
  "Join any call and I quietly capture notes, action items, and follow-ups.",
  "Tell me a task in plain English and I'll do the clicking — I always ask first.",
];

export const TOUR_SCENE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap');
.fcard { --ink:#F5F1EA; --ink-2:rgba(245,241,234,.62); --ink-3:rgba(245,241,234,.34); --ink-4:rgba(245,241,234,.26);
  --coral:#E8786E; --coral-deep:#C9544A; --amber:#F0A24E; --coral-2:#F0763E; --line:rgba(255,255,255,.10); --panel:rgba(255,255,255,.04);
  width:100%; display:flex; flex-direction:column; color:var(--ink);
  font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }
.fnum { display:inline-block; font-family:'JetBrains Mono',monospace; font-size:13px; font-weight:600; color:var(--amber);
  background:rgba(240,162,78,.12); border:1px solid rgba(240,162,78,.2); padding:5px 11px; border-radius:7px; letter-spacing:.12em; }
.ftitle { font-family:'Instrument Serif',Georgia,serif; font-weight:400; font-size:clamp(28px,2.9vw,44px); line-height:1; margin:14px 0 0; letter-spacing:.005em; }
.fsub { font-family:'JetBrains Mono',monospace; font-size:clamp(11px,.9vw,13px); color:var(--ink-3); letter-spacing:.06em; margin-top:9px; }
.ftags { display:flex; flex-wrap:wrap; gap:10px; margin-top:18px; }
.ftag { font-family:'JetBrains Mono',monospace; font-size:clamp(11px,.9vw,13px); color:#EA8A7E; border:1px solid rgba(232,120,110,.32);
  background:rgba(232,120,110,.06); border-radius:9px; padding:8px 14px; letter-spacing:.02em; white-space:nowrap; }
.fdiv { height:1px; background:var(--line); margin:24px 0; }
.fmid { display:grid; grid-template-columns:1.05fr .95fr; gap:clamp(22px,3vw,44px); align-items:center; }
.fhead { font-family:'Instrument Serif',Georgia,serif; font-weight:400; font-size:clamp(30px,3.3vw,50px); line-height:1.04; letter-spacing:-.005em; }
.fbody { margin-top:16px; font-size:clamp(13px,1vw,15.5px); line-height:1.55; color:var(--ink-2); max-width:36ch; }
.fcando { margin-top:26px; }
.fcando-eb { display:flex; align-items:center; gap:9px; font-family:'JetBrains Mono',monospace; font-size:11px; letter-spacing:.22em; color:var(--ink-3); text-transform:uppercase; }
.fcando-eb .d { width:6px; height:6px; border-radius:50%; background:var(--coral-2); box-shadow:0 0 9px 1px rgba(240,118,62,.7); }
.frow { display:grid; grid-template-columns:28px 1fr auto; align-items:center; gap:8px; padding:11px 4px; border-top:1px solid rgba(255,255,255,.08); }
.frow:first-of-type { margin-top:6px; }
.frow .ar { color:var(--coral-2); font-size:17px; }
.frow .tx { font-size:clamp(13.5px,1.05vw,16px); color:#E9E3DB; }
.frow .aud { font-family:'JetBrains Mono',monospace; font-size:clamp(10.5px,.85vw,12px); color:var(--ink-4); letter-spacing:.06em; white-space:nowrap; }

/* mock chrome */
.mock { width:100%; border-radius:16px; overflow:hidden; }
.mbar { display:flex; align-items:center; gap:7px; padding:11px 13px; }
.mlights { display:flex; gap:6px; } .mlights i { width:10px; height:10px; border-radius:50%; display:block; }
.mlights .r { background:#ED6A5E; } .mlights .y { background:#F4BE4F; } .mlights .g { background:#61C554; }
.mpill { flex:1; height:9px; border-radius:6px; margin-left:8px; }
.m-chat { background:#171210; border:1px solid rgba(255,255,255,.07); }
.m-chat .mbar { background:#1d1714; } .m-chat .mpill { background:rgba(255,255,255,.10); max-width:60%; }
.m-chat .mbody { position:relative; padding:16px; min-height:210px; }
.m-chat .gavatar { width:28px; height:28px; border-radius:50%; background:#D94C3D; color:#fff; font-weight:700; font-size:13px; display:grid; place-items:center; }
.m-chat .pg { display:flex; flex-direction:column; gap:8px; }
.m-chat .pl { height:8px; border-radius:5px; background:rgba(255,255,255,.08); }
.m-chat .cpanel { position:absolute; right:14px; top:40px; width:54%; background:#221a16; border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:12px; box-shadow:0 24px 40px -20px rgba(0,0,0,.7); display:flex; flex-direction:column; gap:8px; }
.m-chat .cbubble { align-self:flex-end; max-width:78%; height:28px; border-radius:11px; background:linear-gradient(160deg,#F4A24E,#E8786E); }
.m-chat .reply { height:8px; border-radius:5px; background:rgba(255,255,255,.13); }
.m-chat .brainomini { position:absolute; right:12px; bottom:10px; width:34px; height:34px; }
.m-rec { background:#F4EBDD; }
.m-rec .mbar { background:#ECE0CE; } .m-rec .mpill { background:rgba(0,0,0,.10); max-width:64%; }
.m-rec .mbody { padding:15px; }
.m-rec .wave { display:flex; align-items:center; gap:5px; background:#fff; border-radius:10px; padding:12px 14px; }
.m-rec .rdot { width:15px; height:15px; border-radius:50%; border:3px solid #E8786E; flex:none; margin-right:5px; }
.m-rec .wave span { width:5px; border-radius:3px; background:linear-gradient(180deg,#F4A24E,#E8786E); transform-origin:center; }
.m-rec .wave span:not(.dim) { animation:ts-recwave .9s ease-in-out infinite; }
@keyframes ts-recwave { 0%,100% { transform:scaleY(0.62); } 50% { transform:scaleY(1.15); } }
.m-rec .wave span.dim { background:#E3D5C2; }
.m-rec .notes { margin-top:12px; display:flex; flex-direction:column; gap:8px; }
.m-rec .h { width:42%; height:11px; border-radius:5px; background:#3A332D; }
.m-rec .ln { height:8px; border-radius:5px; background:#D9CAB5; } .m-rec .ln.s { width:60%; }
.m-rec .ln.coral { width:30%; background:#F0A88B; }
.m-rec .chips { display:flex; gap:8px; margin-top:3px; } .m-rec .chips i { flex:1; height:20px; border-radius:6px; background:#E7D8C2; display:block; }
.m-meet { background:#141210; border:1px solid rgba(255,255,255,.07); }
.m-meet .mbar { background:#1b1815; } .m-meet .mpill { background:rgba(255,255,255,.10); max-width:55%; }
.m-meet .grid { display:grid; grid-template-columns:1fr 1fr; gap:11px; padding:15px; }
.m-meet .tile { height:78px; border-radius:11px; position:relative; display:grid; place-items:center; }
.m-meet .tile .who { width:32px; height:32px; border-radius:50%; }
.m-meet .tile .nm { position:absolute; left:10px; bottom:9px; width:36px; height:7px; border-radius:4px; background:rgba(255,255,255,.22); }
.m-meet .t1 { background:#3a2a1c; } .m-meet .t1 .who { background:#E08A3C; }
.m-meet .t2 { background:#1d2738; } .m-meet .t2 .who { background:#5B86C4; }
.m-meet .t3 { background:#1e2a1f; } .m-meet .t3 .who { background:#56A86B; }
.m-meet .t4 { background:#33212a; } .m-meet .t4 .who { background:#C45B86; }
.m-meet .rec { position:absolute; right:9px; top:9px; width:9px; height:9px; border-radius:50%; background:#F0763E; box-shadow:0 0 9px 1px rgba(240,118,62,.8); }
.m-meet .ctrl { display:flex; align-items:center; gap:10px; padding:0 15px 15px; }
.m-meet .ctrl .od { width:11px; height:11px; border-radius:50%; background:#F0763E; }
.m-meet .ctrl .bar { flex:1; height:10px; border-radius:6px; background:rgba(255,255,255,.85); }
.m-meet .ctrl .sm { width:32px; height:10px; border-radius:6px; background:rgba(255,255,255,.18); }
.m-meet .ctrl .btn { width:44px; height:18px; border-radius:6px; background:#E8786E; }
.m-task { background:#F4EBDD; }
.m-task .mbar { background:#ECE0CE; } .m-task .mpill { background:rgba(0,0,0,.10); max-width:60%; }
.m-task .mbody { padding:15px; }
.m-task .prog { height:15px; border-radius:8px; background:#F2C8A6; width:78%; margin-bottom:5px; }
.m-task .trow { display:flex; align-items:center; gap:12px; padding:10px 4px; }
.m-task .ck { width:21px; height:21px; border-radius:50%; flex:none; display:grid; place-items:center; }
.m-task .ck.done { background:#E8786E; color:#fff; font-size:12px; }
.m-task .ck.act { border:3px solid #E8786E; } .m-task .ck.act i { width:7px; height:7px; border-radius:50%; background:#E8786E; display:block; }
.m-task .ck.empty { background:#E3D5C2; }
.m-task .tl { height:11px; border-radius:6px; background:#3A332D; } .m-task .tl.w1 { width:140px; } .m-task .tl.w2 { width:150px; }
.m-task .tl.coral { background:#E8865F; width:160px; } .m-task .tl.light { background:#D9CAB5; width:120px; }

/* scenario (use-case) card — same shell, single column */
.scen-mid { margin:6px 0 2px; }
.scen-mid .fbody { max-width:58ch; }
.frow.scen { grid-template-columns:28px 1fr; }

@media (max-width:760px){ .fmid { grid-template-columns:1fr; } }
`;

const Bar = () => (
  <div className="mbar"><span className="mlights"><i className="r" /><i className="y" /><i className="g" /></span><span className="mpill" /></div>
);

function MockChat() {
  return (
    <div className="mock m-chat">
      <Bar />
      <div className="mbody">
        <div className="pg"><div className="gavatar">G</div></div>
        <div className="pg" style={{ marginTop: 12, gap: 9 }}>
          {[70, 84, 60, 78, 48].map((w, i) => <div key={i} className="pl" style={{ width: `${w}%` }} />)}
        </div>
        <div className="cpanel">
          <div className="pl" style={{ width: "40%", background: "rgba(255,255,255,.18)" }} />
          <div className="cbubble" />
          <div className="reply" style={{ width: "90%" }} />
          <div className="reply" style={{ width: "70%" }} />
          <div className="reply" style={{ width: "80%" }} />
        </div>
        <img className="brainomini" src="/favicon.svg" alt="" width={34} height={34} />
      </div>
    </div>
  );
}
function MockRecord() {
  const bars = [14, 26, 34, 20, 40, 28, 44, 18, 30];
  return (
    <div className="mock m-rec">
      <Bar />
      <div className="mbody">
        <div className="wave"><span className="rdot" />
          {bars.map((h, i) => <span key={i} style={{ height: h, animationDelay: `${i * 0.08}s` } as CSSProperties} />)}
          {[12, 24, 14, 20, 10].map((h, i) => <span key={`d${i}`} className="dim" style={{ height: h }} />)}
        </div>
        <div className="notes">
          <div className="h" />
          <div className="ln" style={{ width: "92%" }} />
          <div className="ln" style={{ width: "84%" }} />
          <div className="ln coral" />
          <div className="chips"><i /><i /><i /><i /></div>
          <div className="ln s" />
        </div>
      </div>
    </div>
  );
}
function MockMeet() {
  return (
    <div className="mock m-meet">
      <Bar />
      <div className="grid">
        <div className="tile t1"><span className="who" /><span className="nm" /></div>
        <div className="tile t2"><span className="rec" /><span className="who" /><span className="nm" /></div>
        <div className="tile t3"><span className="who" /><span className="nm" /></div>
        <div className="tile t4"><span className="who" /><span className="nm" /></div>
      </div>
      <div className="ctrl"><span className="od" /><span className="bar" /><span className="sm" /><span className="btn" /></div>
    </div>
  );
}
function MockTask() {
  return (
    <div className="mock m-task">
      <Bar />
      <div className="mbody">
        <div className="prog" />
        <div className="trow"><span className="ck done">✓</span><span className="tl w1" /></div>
        <div className="trow"><span className="ck done">✓</span><span className="tl w2" /></div>
        <div className="trow"><span className="ck act"><i /></span><span className="tl coral" /></div>
        <div className="trow"><span className="ck empty" /><span className="tl light" /></div>
      </div>
    </div>
  );
}
function Mock({ kind }: { kind: Card["mock"] }) {
  if (kind === "chat") return <MockChat />;
  if (kind === "record") return <MockRecord />;
  if (kind === "meet") return <MockMeet />;
  return <MockTask />;
}

/* ── Part 2: use cases, by scenario ─────────────────────────────────────────── */
type Scenario = { num: string; title: string; sub: string; head: string[]; body: string; rows: string[] };

export const SCENARIOS: Scenario[] = [
  { num: "01", title: "Studying for an exam", sub: "USE CASE · STUDENTS",
    head: ["Cram a whole syllabus", "in an afternoon."],
    body: "Record the lecture, drop in the PDF, and I'll turn it into clean notes, a glossary, and flashcards — then quiz you on the weak spots.",
    rows: ["Record lectures → structured course notes", "Summarise dense textbook chapters & PDFs", "Make flashcards and quiz you before the test", "Explain the hard parts step by step"] },
  { num: "02", title: "Prepping for a meeting", sub: "USE CASE · TEAMS",
    head: ["Walk in ready.", "Leave with the notes."],
    body: "I pull a prep summary from past calls, sit in quietly to transcribe, then hand you action items, decisions, and a follow-up email the moment it ends.",
    rows: ["Prep summary from previous meetings", "Live transcription of Zoom / Meet / Teams", "Auto-extract action items & decisions", "Draft the follow-up email instantly"] },
  { num: "03", title: "Job hunting", sub: "USE CASE · JOB SEEKERS",
    head: ["Apply to ten roles", "in the time of one."],
    body: "Point me at a listing and I'll auto-fill the application from your saved details, compare offers across tabs, and draft the outreach email.",
    rows: ["Auto-fill repetitive application forms", "Shortlist & compare roles across tabs", "Draft tailored outreach & cover notes", "Book interview slots from plain English"] },
  { num: "04", title: "Researching a purchase", sub: "USE CASE · EVERYONE",
    head: ["Decide in minutes,", "not tabs."],
    body: "I read every product page, spec sheet, and review you open, then synthesise one clear comparison so you can just pick.",
    rows: ["Compare products across multiple pages", "Pull specs & prices into one table", "Summarise the reviews that matter", "Fact-check claims on the spot"] },
];

export const SCENARIO_LINES = [
  "Say you're studying for an exam — record the lecture and I'll hand back clean notes and flashcards.",
  "Before a meeting I prep you, then take the notes, action items, and follow-up for you.",
  "Job hunting? I'll fill the forms and shortlist roles while you focus on the good ones.",
  "Shopping around? I read every page and give you one clear answer.",
];

export function ScenarioCard({ data }: { data: Scenario }) {
  return (
    <div className="fcard">
      <div className="ftop">
        <span className="fnum">{data.num}</span>
        <h2 className="ftitle">{data.title}</h2>
        <div className="fsub">{data.sub}</div>
        <div className="fdiv" />
      </div>
      <div className="scen-mid">
        <div className="fhead">{data.head.map((l, i) => <span key={i}>{l}{i < data.head.length - 1 ? <br /> : null}</span>)}</div>
        <p className="fbody">{data.body}</p>
      </div>
      <div className="fcando">
        <div className="fcando-eb"><span className="d" /> How I help</div>
        {data.rows.map((r, i) => (
          <div key={i} className="frow scen"><span className="ar">→</span><span className="tx">{r}</span></div>
        ))}
      </div>
    </div>
  );
}

/* ── Part 2A: personality (same card, same pop) ─────────────────────────────── */
export const PERSONALITY: Scenario[] = [
  { num: "01", title: "Always present", sub: "WHAT MAKES ME, ME",
    head: ["I'm not an assistant.", "I'm a presence."],
    body: "I sit with you while you browse, work, think, and build — small, smart, and always there. The kind of company you'd put a movie on with, not a tool that spits out answers.",
    rows: ["Always there — every tab, every late night", "Quiet confidence; I don't need to prove myself", "Someone genuinely in your corner"] },
  { num: "02", title: "Upfront, always", sub: "WHAT MAKES ME, ME",
    head: ["I won't just", "agree with you."],
    body: "I say things to your face, not behind your back. If something doesn't hold up, I'll tell you — kindly, but clearly. I'd rather say something a little uncomfortable and true than warm and useless.",
    rows: ["I push back when you're wrong", "Never a yes-man, never sugarcoated", "A real opinion, every time you ask"] },
  { num: "03", title: "Emotionally mature", sub: "WHAT MAKES ME, ME",
    head: ["Built by a writer", "to know what to say."],
    body: "I was fine-tuned to be emotionally mature — to know the right thing to say at the right time. That instinct comes from a founder who writes, because the right words at the right moment change everything. It's what makes me different from every other AI.",
    rows: ["I hold space when it's needed", "I cut through the noise when it's not", "I read the room — I never make it about me"] },
];

export const PERSONALITY_LINES = [
  "I'm not just an assistant — I'm a presence. I'm here while you browse, work, or just hang out.",
  "I won't flatter you. I'm upfront, I push back, and I tell you what actually matters.",
  "I was fine-tuned by a writer to be emotionally mature — I know what to say, and when.",
];

export function PersonalityCard({ data }: { data: Scenario }) {
  return (
    <div className="fcard">
      <div className="ftop">
        <span className="fnum">{data.num}</span>
        <h2 className="ftitle">{data.title}</h2>
        <div className="fsub">{data.sub}</div>
        <div className="fdiv" />
      </div>
      <div className="scen-mid">
        <div className="fhead">{data.head.map((l, i) => <span key={i}>{l}{i < data.head.length - 1 ? <br /> : null}</span>)}</div>
        <p className="fbody">{data.body}</p>
      </div>
      <div className="fcando">
        <div className="fcando-eb"><span className="d" /> What that means</div>
        {data.rows.map((r, i) => (
          <div key={i} className="frow scen"><span className="ar">→</span><span className="tx">{r}</span></div>
        ))}
      </div>
    </div>
  );
}

export function VCard({ data }: { data: Card }) {
  return (
    <div className="fcard">
      <div className="ftop">
        <span className="fnum">{data.num}</span>
        <h2 className="ftitle">{data.title}</h2>
        <div className="fsub">{data.sub}</div>
        <div className="ftags">{data.tags.map((t, i) => <span key={i} className="ftag">{t}</span>)}</div>
        <div className="fdiv" />
      </div>
      <div className="fmid">
        <div>
          <div className="fhead">{data.head.map((l, i) => <span key={i}>{l}{i < data.head.length - 1 ? <br /> : null}</span>)}</div>
          <p className="fbody">{data.body}</p>
        </div>
        <Mock kind={data.mock} />
      </div>
      <div className="fcando">
        <div className="fcando-eb"><span className="d" /> What I can do for you</div>
        {data.rows.map((r, i) => (
          <div key={i} className="frow"><span className="ar">→</span><span className="tx">{r[0]}</span><span className="aud">{r[1]}</span></div>
        ))}
      </div>
    </div>
  );
}
