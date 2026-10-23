import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, Lit, useAffReveal, useLitWords, useGrowHero } from "@/components/affPage";
import { BrainoMascot } from "@/components/BrainoMascot";
import FoundryFooterGame from "@/components/FoundryFooterGame";
import "@/components/foundry-footer.css";
import { DayScroll } from "./BrainoFinal";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./braino-final.css";
import "./braino-page.css";
import "./foundry/foundry.css";
import "./foundry/first-run.css";
import "./foundry/components/brandmap.css";
import { Bars, Funnel, Meter, Ring, WeekStrip } from "./foundry/components/charts";
import { PLATFORM_LABEL, PostPreview } from "./foundry/components/previews";
import { faviconOf } from "./foundry/launchPlaces";
import { PERSON_PLATFORM_LABEL, whereOf } from "./foundry/store";
import { SAMPLE } from "./foundry-sample";
import "./foundry-landing.css";

/* Braino Foundry (2026-10-22). Built from the homepage's own pieces (affPage,
   affective-home.css): the hero and its growing picture, lit lines, the
   product box, the questions and the closing block, so it reads as one site. */
/* Pricing, from the plan of record (2026-10-23): Free, Foundry at the founding
   price, and Done for you as its own tab. Never credits. */
const PLANS = [
  { name: "Free", price: "$0", per: "to try", line: "See where you stand, today.", items: ["1 project", "1 full run of all three engines", "Who AI and Google name instead of you", "Your first posts, and people asking with a reply ready"], cta: ["Start free", "/foundry/app"] },
  { name: "Foundry", price: "$33", per: "a month", line: "Founding price for the first 50, locked. Then $83.", items: ["Every engine: Get found, Be seen, Reach people", "Autopilot runs it again every week", "Launch places and a week of posts, planned", "Braino Pro included", "Nothing goes out without your yes"], cta: ["Start free, upgrade later", "/foundry/app"], hot: true },
];
const DONE = ["Braino Foundry, run for you every week", "A person finishes what Braino can't: listings, forms, the fiddly bits", "Replies to the people asking, in your voice, after your yes", "A short weekly note: what went out, who replied, who bought"];
function Pricing() {
  const [t, setT] = useState<"foundry" | "done">("foundry");
  return (
    <div className="fl-price aff-reveal">
      <div className="fl-tabs" role="tablist">
        <button role="tab" aria-selected={t === "foundry"} className={t === "foundry" ? "on" : ""} onClick={() => setT("foundry")}>Braino Foundry</button>
        <button role="tab" aria-selected={t === "done"} className={t === "done" ? "on" : ""} onClick={() => setT("done")}>Done for you</button>
      </div>
      {t === "foundry" ? (
        <div className="fl-plans" key="f">
          {PLANS.map((pl) => (
            <article key={pl.name} className={`fl-plan${pl.hot ? " hot" : ""}`}>
              <p className="fl-plan-n">{pl.name}</p>
              <p className="fl-plan-p"><b>{pl.price}</b><span>{pl.per}</span></p>
              <p className="fl-plan-l">{pl.line}</p>
              <ul>{pl.items.map((x) => <li key={x}>{x}</li>)}</ul>
              <Link to={pl.cta[1]} className={`aff-cta${pl.hot ? "" : " aff-cta-ghost"}`}>{pl.cta[0]}</Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="fl-done" key="d">
          <div>
            <p className="fl-plan-n">Done for you</p>
            <p className="fl-plan-p"><b>$299</b><span>a month, and up</span></p>
            <p className="fl-done-l">No time at all? Braino does the work, and a person finishes what Braino can't. You approve from your phone.</p>
            <Link to="/contact" className="aff-cta">Talk to us</Link>
          </div>
          <ul>{DONE.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

const ENGINES = [
  { key: "Get found", sub: "Optics", h: "SEO, AEO and GEO.", p: "Your SEO agency. Gets you found on Google and named by AI.",
    does: [
      "Asks ChatGPT-style AI and Google the questions your buyers really search, 3 times each",
      "Shows who gets named instead of you, word for word, with sources",
      "Checks if AI can even read your site, and what blocks it",
      "Finds real searches from Google autocomplete, People also ask and Reddit",
      "Writes the fix for every gap: FAQ pages, comparison pages, answers",
      "Re-checks every week and shows if AI names you more",
    ], gets: "A score, the gaps, and every fix written and ready" },
  { key: "Be seen", sub: "Content", h: "Posts, articles, launch places.", p: "Your content team. Puts you in front of buyers every week.",
    does: [
      "Writes posts for X, LinkedIn, Reddit, Instagram and Threads, in your voice",
      "Every topic comes from something real: a buyer's words or an AI gap",
      "Plans the week: what goes out, where, and at what time",
      "Picks your best 18 of 56 launch places: Product Hunt, Hacker News, BetaList and more",
      "Writes each listing to that site's rules, with the maker's first comment",
      "Writes long articles that AI and Google quote",
    ], gets: "A full week of posts and your launch listings, ready for a yes" },
  { key: "Reach people", sub: "Outreach", h: "Reddit, X, LinkedIn, Quora, forums.", p: "Your sales rep. Finds the people asking today and starts the conversation.",
    does: [
      "Finds people asking for what you made, today, on 5 platforms",
      "Scores how ready each one is to buy, from how they wrote it",
      "Writes one honest reply per person, shaped for each platform",
      "Paste their answer and it drafts yours, toward a call or a payment",
      "Follows up after 3 days of silence, for your yes",
      "Tracks everyone: Found, Messaged, Replied, Talking, Paid",
    ], gets: "Real people, a reply each, and a pipeline to your first paying customer" },
];

/* Product shots (2026-10-23, rebuilt): the real /foundry/app styles (foundry.css,
   first-run.css, brandmap.css) and its own charts and post previews, fed a
   static sample project, RentOnTime. Drawn at app width, then scaled to fit. */
function Browser({ path, theme, children }: { path: string; theme: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ s: 1, w: 960, h: 0 });
  useLayoutEffect(() => {
    const o = outer.current, n = inner.current;
    if (!o || !n) return;
    const measure = () => {
      const cw = o.clientWidth;
      const w = cw >= 760 ? Math.max(960, cw) : 620;
      const s = Math.min(1, cw / w);
      setFit({ s, w, h: n.offsetHeight * s });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o); ro.observe(n);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="fl-br">
      <div className="fl-br-bar"><i /><i /><i /><span>affctve.com/foundry/app{path}</span></div>
      <div className="fl-br-body" ref={outer} style={{ height: fit.h || undefined }}>
        <div ref={inner} className="fx fl-fx" data-theme={theme} style={{ width: fit.w, transform: `scale(${fit.s})` }}>{children}</div>
      </div>
    </div>
  );
}
const Check = () => <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
function ShotFirstRun() {
  const rows: [string, string, string, string, string][] = [
    ["optics", "done", "Get found", "Optics", "Checks if AI and Google name you when buyers ask."],
    ["outreach", "done", "Reach people", "Outreach", "Finds real people asking for this today."],
    ["content", "working", "Be seen", "Content", "Writes posts from what the other two found."],
  ];
  const now: Record<string, string> = { optics: "Named in 1 of 8 AI answers", outreach: "23 people found", content: "Writing post 4 of 6" };
  return (
    <div className="fr fl-fr">
      <div className="fr-in">
        <div className="fr-mascot"><BrainoMascot variant="foundry" size={84} /></div>
        <p className="fr-kicker">{SAMPLE.memory.product.name}</p>
        <h1>Braino Foundry is working on it.</h1>
        <p className="fr-sub">Three engines, one after another. About two minutes. 74s so far.</p>
        <div className="fr-bar" aria-hidden><span style={{ width: "72%" }} /></div>
        <ul className="fr-engines">{rows.map(([id, s, f, n, j]) => (
          <li key={id} className={`fr-eng e-${id} ${s}`}>
            <span className="fr-icon" aria-hidden>{s === "done" ? <Check /> : <i />}</span>
            <div className="fr-text"><p className="fr-name"><b>{f}</b><span>{n}</span></p><p className="fr-job">{j}</p><p className="fr-now">{now[id]}</p></div>
            <span className="fr-state">{s === "done" ? "Done" : "Working"}</span>
          </li>
        ))}</ul>
        <ul className="fr-feed">{SAMPLE.memory.activity.map((a) => <li key={a.id}><span className={`fr-dot w-${a.who}`} />{a.text}</li>)}</ul>
      </div>
    </div>
  );
}
function ShotDashboard() {
  const tiles = [[16, "AI answers checked", "8 buyer questions, asked 2 times each", "optics"], [23, "people found asking", "on 4 platforms", "outreach"], [23, "messages written", "one per person, in your voice", "outreach"], [8, "posts and articles written", "6 posts, 2 articles", "content"], [5, "fixes ready to publish", "so AI and Google name you", "optics"], [4, "launch listings written", "for directories that send visitors", "content"]] as const;
  return (
    <div className="fx-page fl-page">
      <section className="fx-done">
        <header><span className="fx-eyebrow">What Braino Foundry has done for you</span><h2>Here is the work, done. It is waiting for your yes.</h2></header>
        <div className="fx-done-grid">{tiles.map(([n, l, s, e]) => <div key={l} className={`fx-done-t ${e}`}><b className="fx-num">{n}</b><span>{l}</span><small>{s}</small></div>)}</div>
      </section>
      <section className="fx-sec"><header className="fx-sec-h"><h2>Pipeline</h2></header><Funnel counts={{ found: 23, messaged: 9, replied: 4, talking: 2, paid: 1 }} /></section>
    </div>
  );
}
function ShotFound() {
  const o = SAMPLE.optics!;
  return (
    <div className="fx-page fl-page">
      <div className="fx-grid2">
        <section className="fx-sec"><header className="fx-sec-h"><h2>Your score</h2></header>
          <div className="fx-vis"><Ring n={1} of={8} label="named" />
            <div className="fx-vis-t"><div><b className="fx-num">1 of 8</b><span>AI answers name you</span></div><div><b className="fx-num">6%</b><span>of every name AI gave is you</span></div></div>
          </div>
        </section>
        <section className="fx-sec"><header className="fx-sec-h"><h2>Named instead of you</h2></header>
          <Bars you={{ name: "RentOnTime", value: 1 }} rows={[{ name: "NoBroker", value: 5 }, { name: "RentOk", value: 4 }, { name: "Stanza", value: 2 }]} />
        </section>
      </div>
      <section className="fx-sec"><header className="fx-sec-h"><h2>Question by question</h2></header>
        <div className="fx-qgrid" role="table">
          <div className="fx-qgrid-h" role="row"><span>Buyer question</span><span>AI named you, out of 3 tries</span><span>Google page one</span></div>
          {o.answers.map((a, i) => (
            <details key={a.question} className="fx-qrow" role="row"><summary>
              <span>{a.question}</span>
              <span className={`fx-yes ${(a.hits || 0) > 1 ? "y" : a.hits ? "m" : "n"}`}>{a.hits ? `${a.hits} of 3 tries` : "Never (0 of 3)"}</span>
              <span className={`fx-yes ${i === 3 ? "y" : i < 2 ? "n" : "na"}`}>{i === 3 ? "Yes" : i < 2 ? "No" : "Not searched"}</span>
            </summary></details>
          ))}
        </div>
      </section>
    </div>
  );
}
function ShotPeople() {
  return (
    <div className="fx-page fl-page">
      <div className="fx-tabs" role="tablist">{[["All", 23], ["Reddit", 11], ["X", 5], ["LinkedIn", 3], ["Quora", 4]].map(([k, n], i) => <button key={k} role="tab" aria-selected={i === 0} tabIndex={-1}>{k} <span>{n}</span></button>)}</div>
      <div className="fx-grid2">{SAMPLE.people.map((x) => (
        <article key={x.id} className={`fx-person ${x.stage}`}>
          <header><span className="fx-plat"><span className="fx-pchip">{PERSON_PLATFORM_LABEL[x.platform]}</span> {whereOf(x)}</span><span className="fx-chip waiting">Waiting for you</span></header>
          <span className="fx-person-t">{x.title}</span>
          <p className="fx-person-b">{x.body}</p>
          <Meter value={x.intent} label="How ready" />
          <p className="fx-faint">{x.why}</p>
          <div className="fx-msg"><small>Your message</small><p>{x.message}</p></div>
          <footer className="fx-acts"><span className="fx-btn sm">Approve, open the post</span><span className="fx-ghost">Edit</span><span className="fx-link">Skip</span></footer>
        </article>
      ))}</div>
    </div>
  );
}
function ShotSeen() {
  return (
    <div className="fx-page fl-page">
      <div className="fx-grid2">
        <section className="fx-sec"><header className="fx-sec-h"><h2>LinkedIn, Tuesday 9:00</h2></header><PostPreview post={SAMPLE.posts[0]} name="Riya Sharma" /></section>
        <section className="fx-sec"><header className="fx-sec-h"><h2>X, Monday 8:30</h2></header><PostPreview post={SAMPLE.posts[1]} name="RentOnTime" /></section>
      </div>
      <section className="fx-sec"><header className="fx-sec-h"><h2>When to post this week</h2></header>
        <WeekStrip items={SAMPLE.posts.map((x) => ({ day: x.day, time: x.time, label: PLATFORM_LABEL[x.platform], status: x.status }))} />
      </section>
    </div>
  );
}
function ShotLaunch() {
  const places = [["Product Hunt", "producthunt.com", "Free", "Goes up now", 3, "live", "The big launch day. Best on a Tuesday."], ["Peerlist", "peerlist.io", "Free", "Goes up now", 2, "submitted", "Indian makers, a weekly launch board."], ["AlternativeTo", "alternativeto.net", "Free", "Takes days", 3, "todo", "Shows up when people search for NoBroker alternatives."], ["Indie Hackers", "indiehackers.com", "Free", "Goes up now", 2, "todo", "Founders who share how they got users."], ["BetaList", "betalist.com", "Free or paid", "Takes weeks", 2, "todo", "Early adopters looking for new tools."], ["r/SideProject", "reddit.com", "Free", "Goes up now", 2, "todo", "A friendly crowd for a first post."]] as const;
  const st = { todo: "To do", submitted: "Submitted", live: "Live" };
  return (
    <div className="fx-page fl-page">
      <div className="fx-lp-bar"><b>2 of 56 submitted, 1 live</b><span>Picked for: b2c, india</span></div>
      <ul className="fx-lp">{places.map(([n, host, c, a, s, status, note]) => (
        <li key={n} className={status}>
          <div className="fx-lp-n"><img src={faviconOf(`https://${host}`)} alt="" width={16} height={16} loading="lazy" /><b>{n}</b><span className={`fx-lp-st ${status}`}>{st[status]}</span></div>
          <p>{note}</p>
          <div className="fx-lp-c"><span className="fx-chip">{c}</span><span className="fx-chip">{a}</span><span className="fx-chip fx-lp-dots">{[1, 2, 3].map((i) => <i key={i} className={i <= s ? "on" : ""} />)}</span></div>
          <div className="fx-lp-a"><span className="fx-btn sm">{status === "todo" ? "Write my listing" : "Open my listing"}</span></div>
        </li>
      ))}</ul>
    </div>
  );
}
const SHOTS: [string, string, string, () => JSX.Element][] = [
  ["First run", "Three engines go to work on what you built.", "", ShotFirstRun],
  ["Dashboard", "What Braino Foundry did for you, in plain numbers.", "", ShotDashboard],
  ["Get found", "Whether AI names you when buyers ask, and who it names instead.", "/optics", ShotFound],
  ["Reach people", "Real people asking today, with your reply ready.", "/outreach", ShotPeople],
  ["Be seen", "Your posts, the way they will look, on the days they do best.", "/content", ShotSeen],
  ["Launch places", "Where new products get listed, with the listing written.", "/content", ShotLaunch],
];
function Shots({ theme }: { theme: string }) {
  const [i, setI] = useState(0);
  const [t, cap, path, Shot] = SHOTS[i];
  return (
    <div className="fl-shots aff-reveal">
      <div className="fl-tabs fl-shot-tabs" role="tablist">{SHOTS.map(([n], k) => <button key={n} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)}>{n}</button>)}</div>
      <p className="fl-shot-cap">{cap}</p>
      <div className="fl-shot" key={t}><Browser path={path} theme={theme}><Shot /></Browser></div>
    </div>
  );
}

/* Foundry on the Mac: the /braino day scroll, fed a founder's day. */
const MAC_DAY = [
  { at: "8:30 am", say: "Morning. I found 6 people asking about PG rent apps overnight.", you: "Show me." },
  { at: "8:40 am", say: "r/india: \u201cAny app to track rent for my PG?\u201d Your reply is ready.", you: "Send it." },
  { at: "8:41 am", say: "Sent." },
  { at: "9:00 am", say: "Your LinkedIn post is live." },
  { at: "10:15 am", say: "Riya replied. She asks if it works with UPI. I wrote an answer.", you: "Send it." },
  { at: "11:00 am", say: "Product Hunt is filled in. It\u2019s $39 to skip the queue. Pay?", you: "Not now." },
  { at: "12:30 pm", say: "ChatGPT names you in 2 of 8 now. Up from 0." },
  { at: "2:00 pm", say: "Your FAQ page is written. Want the steps to add it?", you: "Yes." },
  { at: "3:30 pm", say: "3 people didn\u2019t answer since Monday. Follow-ups ready.", you: "Send them." },
  { at: "5:00 pm", say: "Someone on Quora asked about late rent. Answer drafted.", you: "Post it." },
  { at: "6:00 pm", say: "This week: 14 messages, 4 replies, 1 call booked." },
];
/* Where it runs: the web app, open to try, and Braino on the Mac, in private beta. */
const WHERE = [
  { k: "On the web", tag: "Open to try", h: "A dashboard and a few clicks.", p: "Works in any browser, on Chrome and Windows too.", does: ["Run all three engines on what you built", "Read every post, reply and listing before it goes", "Approve copies the text and opens the site", "You post it yourself, in your own account"], cta: ["Open Braino Foundry", "/foundry/app"], mac: false },
  { k: "On your Mac", tag: "Private beta", h: "Your voice and the notch.", p: "Braino, with glasses. You talk, he does the work.", does: ["Ask out loud: \u201cwho asked about us today?\u201d", "He reads you the reply and waits for your yes", "He posts in your own browser, logged in as you", "Good morning updates on what came in overnight"], cta: ["Join the waitlist", "/braino#early-access"], mac: true },
] as const;
const COMPARE: [string, string, string][] = [
  ["What it is", "Your companion for everyday life", "Braino as your co-founder"],
  ["What it does", "Notes, messages, music, the small jobs of your day", "Runs distribution for your startup"],
  ["How you use it", "By voice, on your Mac", "On the web, or by voice inside Braino"],
  ["Looks like", "Braino", "Braino, with glasses"],
];

/* "How it works": a short guide that opens over the page. */
const GUIDE = [
  ["Tell it what you're building", "Three quick questions. A link helps, but your own words are enough."],
  ["It checks where you're invisible", "It asks AI and Google what your buyers ask, and shows who gets named instead of you."],
  ["It does the work", "The pages, posts and replies that fix each gap, written in your voice."],
  ["You say yes", "Nothing goes out on its own. Approve, and it copies the text and opens the site."],
  ["It runs again every week", "Your brand gets more visible on autopilot, with you in the loop."],
];
function Guide({ onClose }: { onClose: () => void }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === "Escape" && onClose(); window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="fl-guide-wrap" onClick={onClose}>
      <div className="fl-guide" role="dialog" aria-label="How Braino Foundry works" onClick={(e) => e.stopPropagation()}>
        <button className="fl-guide-x" onClick={onClose} aria-label="Close">×</button>
        <p className="ah-kicker">How it works</p>
        <h3>More people find you every week. You only say yes.</h3>
        <ol>{GUIDE.map(([h, p], i) => <li key={h}><span>{i + 1}</span><div><b>{h}</b><p>{p}</p></div></li>)}</ol>
        <Link to="/foundry/app" className="aff-cta">Start now</Link>
      </div>
    </div>
  );
}

const FAQS = [
  { q: "Is Braino Foundry a different app from Braino?", a: "It is Braino, doing one job: your marketing. Same mascot, same memory, one sign-in. Use it on the web now, or inside Braino on your Mac once you are in the beta." },
  { q: "How much of my time does it take?", a: "About ten minutes a week. You read what it wrote, change anything that doesn't sound like you, and say yes." },
  { q: "Does it post for me?", a: "Never on its own. On the web, Approve copies the text and opens the site so you post it. On the Mac, Braino posts in your own browser after your yes." },
  { q: "Is this a content generator?", a: "No. It starts from what your buyers are asking right now, then writes the posts that answer it and finds the people asking." },
  { q: "How is Foundry on the web different from Foundry on the Mac?", a: "On the web, Foundry is the engine we built. It finds, writes and prepares everything, and you approve with a click and post it yourself. On the Mac, inside Braino, it is a different experience, as close to Jarvis as it gets. You talk, and Braino does everything for you, posting in your own browser after your yes. That is what makes him Braino. The Mac app is in private beta." },
  { q: "Do I need a Mac?", a: "No. The web app works on Chrome and Windows. The Mac version is in private beta." },
  { q: "What do I need to start?", a: "A few lines about what you're building. A website or a doc helps, but your own words are enough." },
];

export default function FoundryLanding() {
  const { theme, toggle } = useAffTheme();
  const root = useAffReveal([]);
  const [guide, setGuide] = useState(false);
  useLitWords([]);
  useGrowHero();
  useEffect(() => { document.title = "Braino Foundry · Your CMO"; }, []);
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff bf bp fl" data-theme={theme} ref={root}>
      <AffNav braino brand={["Braino Foundry", "/foundry"]} theme={theme} onToggle={toggle} links={[["How it works", "#engines"], ["Pricing", "#pricing"], ["Done for you", "#pricing"], ["Braino", "/braino"]]} go={["Start free", "/foundry/app"]} />
      {guide && <Guide onClose={() => setGuide(false)} />}

      <header className="aff-hero">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1">
              <span className="aff-h1-line">You built it.</span>
              <b>Now get seen, and get paid.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                Braino Foundry is Braino as your CMO. He gets you found, gets you seen, and finds the people asking for what you made. You tell him what you built. You only say yes.
              </p>
              <div className="aff-hero-cta">
                <Link to="/foundry/app" className="aff-cta">Start free</Link>
                <button type="button" className="aff-cta aff-cta-ghost" onClick={() => setGuide(true)}>How it works</button>
              </div>
            </div>
          </div>
        </div>
        <figure className="aff-hero-shot" data-grow>
          <img src="/braino-waitlist-forest.jpg" alt="A dark forest with one small tree lit up in a clearing." width={1600} height={657} loading="eager" decoding="async" />
        </figure>
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">Gets you seen where buyers look</p>
            <ul className="aff-strip-names fl-where">
              {["ChatGPT", "Google", "Reddit", "LinkedIn", "X", "Threads"].map((n) => <li key={n}><span>{n}</span></li>)}
            </ul>
          </div>
        </div>
      </header>

      <section className="ah-os" id="problem">
        <div className="aff-wrap">
          <p className="ah-kicker">The problem</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="Building got easy. Getting seen did not." /></h2>
          <div className="fl-prob aff-reveal">
            <p className="fl-prob-k">What founders post, every day, on Reddit and X</p>
            <div className="fl-prob-q">
              <blockquote>"I built it, I launched it, and nobody came."</blockquote>
              <blockquote>"Three months of building. Twelve sign-ups. All friends."</blockquote>
              <blockquote>"How do you get your first users? I have tried everything."</blockquote>
            </div>
            <div className="fl-prob-turn">
              <p>Building is now as easy as describing your app.</p>
              <p><b>What if getting it seen was just as easy?</b> There you go. We made it happen for you.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ah-os" id="engines">
        <div className="aff-wrap">
          <p className="ah-kicker">The fix</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="Meet Braino Foundry, your CMO." /></h2>
          <p className="fl-lead aff-reveal">Braino becomes your chief marketing officer. He runs your marketing and distribution on autopilot, all in one place, and you only say yes. Getting seen brings your first users. Some of them pay.</p>
          <ul className="fl-eng aff-reveal">
            {ENGINES.map((e, i) => (
              <li key={e.key} className={`fl-e${i}`}>
                <small>{e.key}<span>{e.sub}</span></small>
                <h3>{e.h}</h3>
                <p>{e.p}</p>
                <ul className="fl-does">{e.does.map((d) => <li key={d}>{d}</li>)}</ul>
                <p className="fl-gets"><b>You get</b>{e.gets}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ah-os fl-nums-sec" id="numbers">
        <div className="aff-wrap">
          <p className="ah-kicker">Every run, done for you</p>
          <div className="fl-nums aff-reveal">
            <div><b>24</b><span>AI answers checked</span><small>8 buyer questions, asked 3 times each</small></div>
            <div><b>5</b><span>platforms searched for people</span><small>Reddit, X, LinkedIn, Quora, forums</small></div>
            <div><b>56</b><span>launch places ranked</span><small>your best 18 picked, each listing written</small></div>
            <div><b>3</b><span>engines, one memory</span><small>each one feeds the other two</small></div>
            <div><b>0</b><span>things sent without your yes</span><small>you approve everything</small></div>
            <div><b>2 min</b><span>to your first full run</span><small>from your website to your dashboard</small></div>
          </div>
        </div>
      </section>

      <section className="ah-os" id="see">
        <div className="aff-wrap">
          <p className="ah-kicker">The product</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="See what you get in the first minute." /></h2>
          <p className="fl-lead aff-reveal">A sample run for RentOnTime, rent reminders for PG owners.</p>
          <Shots theme={theme} />
        </div>
      </section>

      <section className="ah-os fl-mid" id="braino">
        <div className="aff-wrap">
          <p className="ah-kicker">Braino and Braino Foundry</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="One Braino. Two jobs." /></h2>
          <p className="fl-lead aff-reveal">Same mascot, same memory, one sign-in. Foundry just wears glasses.</p>
          <div className="fl-cmp aff-reveal">
            <div className="fl-cmp-h"><span /><div><BrainoMascot size={56} /><b>Braino</b></div><div><BrainoMascot variant="foundry" size={56} /><b>Braino Foundry</b></div></div>
            {COMPARE.map(([k, a, b]) => <div key={k} className="fl-cmp-r"><span>{k}</span><p>{a}</p><p>{b}</p></div>)}
          </div>
        </div>
      </section>

      <section className="ah-os bp-day" id="where">
        <div className="aff-wrap">
          <p className="ah-kicker">Where it runs</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="On the web, or inside Braino on your Mac." /></h2>
          <div className="fl-two aff-reveal">
            {WHERE.map((w) => (
              <div key={w.k} className={w.mac ? "mac" : ""}>
                <small><span className="fl-two-ic" aria-hidden="true">{w.mac ? <BrainoMascot variant="foundry" size={30} /> : <svg viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="14" rx="2.5" /><path d="M3 9h18" /><circle cx="6" cy="6.8" r=".6" /><circle cx="8.2" cy="6.8" r=".6" /></svg>}</span>{w.k}<em>{w.tag}</em></small>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
                <ul className="fl-does">{w.does.map((d) => <li key={d}>{d}</li>)}</ul>
                <Link to={w.cta[1]} className={w.mac ? "aff-cta aff-cta-ghost" : "aff-cta"}>{w.cta[0]}</Link>
              </div>
            ))}
          </div>
          <p className="bf-ds-hint aff-reveal">A founder's day on the Mac. Scroll <i aria-hidden="true">↓</i></p>
        </div>
        <DayScroll day={MAC_DAY} date="Fri 23 Oct" />
      </section>

      <section className="ah-os" id="pricing">
        <div className="aff-wrap">
          <p className="ah-kicker">Pricing</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="Your buyers are asking. Be the one they find." /></h2>
          <Pricing />
        </div>
      </section>

      <section className="hb2-faq">
        <div className="aff-wrap hb2-faq-split">
          <div className="hb2-faq-side">
            <h3 className="hb2-faq-h aff-reveal">Questions</h3>
            <p>Anything else? <Link to="/foundry/app">Try it</Link> and see for yourself.</p>
          </div>
          <div className="hb2-faq-list">
            {FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}<i aria-hidden="true">+</i></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="hb-end">
        <div className="hb-end-glow" aria-hidden="true" />
        <div className="aff-wrap hb-end-in aff-reveal">
          <h2 className="aff-h1 hb-end-line">You built it. Now let people <span className="hb-end-braino">find it.</span></h2>
          <p className="hb-end-p">Right now someone is asking for exactly what you made, and someone else is answering. Tell Braino Foundry what you built. The first run is free and takes about two minutes.</p>
          <div className="hb-go">
            <Link to="/foundry/app" className="aff-cta">Start free</Link>
            <a href="#pricing" className="aff-cta aff-cta-ghost">See pricing</a>
          </div>
        </div>
      </section>

      {/* Foundry's footer: the words, then Flappy Founder last (2026-10-23). */}
      <footer className="ff-footer">
        <div className="bft">
          <div className="bft-top">
            <div className="bft-brand">
              <BrainoMascot variant="foundry" size={64} className="ff-him" />
              <p className="bft-name">Braino Foundry</p>
              <p className="bft-line">Braino for founders. He finds the people who need what you built, writes the posts and the messages, and tells you what is working.</p>
              <Link to="/foundry/app" className="bft-cta">Start free</Link>
            </div>
            <nav className="bft-cols" aria-label="Footer">
              <div><h4>Foundry</h4><a href="#engines">How it works</a><a href="#pricing">Pricing</a><Link to="/foundry/app">Open Foundry</Link><Link to="/braino">Meet Braino</Link></div>
              <div><h4>Company</h4><Link to="/">Affective</Link><Link to="/affectiveos">AffectiveOS</Link><Link to="/trust">Trust &amp; privacy</Link><Link to="/contact">Contact</Link></div>
              <div><h4>Connect</h4><a href="https://www.instagram.com/brainocells/" target="_blank" rel="noreferrer">Instagram</a><a href="https://x.com/brainosays" target="_blank" rel="noreferrer">X (Twitter)</a></div>
            </nav>
          </div>
          <div className="bft-privacy">
            <span className="bft-lock" aria-hidden="true"><svg viewBox="0 0 16 18"><rect x="2" y="8" width="12" height="9" rx="2.5" fill="currentColor" /><path d="M4.5 8V5.5a3.5 3.5 0 0 1 7 0V8" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg></span>
            <p><b>Your privacy.</b> Nothing is posted or sent without your yes. You approve every post and every message first.</p>
            <Link to="/trust" className="bft-more">How we handle your data →</Link>
          </div>
          <div className="bft-base">
            <span>© 2026 Affective · Made in Bengaluru · Braino Foundry</span>
            <span className="bft-legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span>
          </div>
        </div>
        <div className="ff-game-window">
          <FoundryFooterGame />
        </div>
      </footer>
    </div>
  );
}
