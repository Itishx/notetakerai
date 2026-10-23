import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, Lit, useAffReveal, useLitWords, useGrowHero } from "@/components/affPage";
import { BrainoMascot } from "@/components/BrainoMascot";
import { DayScroll } from "./BrainoFinal";
import "./affective.css";
import "./affective-home.css";
import "./affectiveos-page.css";
import "./braino-final.css";
import "./braino-page.css";
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
  { key: "Get found", sub: "Optics", h: "SEO, AEO and GEO.", p: "Asks Google and AI the questions your buyers ask, sees who gets named, and writes the fixes so it starts being you." },
  { key: "Be seen", sub: "Content", h: "Posts, articles, launch places.", p: "Writes in your voice for X, LinkedIn and Reddit, plans the week, and gets you listed where new products get found." },
  { key: "Reach people", sub: "Outreach", h: "Reddit, X, LinkedIn, Quora, forums.", p: "Finds real people asking for what you made today, and writes one honest reply to each." },
];

/* Product shots (2026-10-23): drawn in code from what /foundry/app really
   shows, for a sample product, RentOnTime. */
function Browser({ path, children }: { path: string; children: ReactNode }) {
  return (
    <div className="fl-br">
      <div className="fl-br-bar"><i /><i /><i /><span>affctve.com/foundry/app{path}</span></div>
      <div className="fl-br-body">{children}</div>
    </div>
  );
}
function ShotFirstRun() {
  const rows = [
    ["done", "Get found", "Optics", "Checks if AI and Google name you when buyers ask.", "Asked 8 buyer questions. Named in 0, a bigger rival in 5."],
    ["done", "Reach people", "Outreach", "Finds real people asking for this today.", "Found 23 people on Reddit, X, LinkedIn and Quora."],
    ["working", "Be seen", "Content", "Writes posts from what the other two found.", "Writing post 4 of 6"],
  ];
  return (
    <Browser path="">
      <div className="fs-run">
        <p className="fs-k">RentOnTime</p>
        <h4>Braino Foundry is working on it.</h4>
        <p className="fs-sub">Three engines, one after another. About two minutes. 74s so far.</p>
        <ul>{rows.map(([s, f, n, j, now]) => (
          <li key={f} className={s}><span className="fs-ic">{s === "done" ? "✓" : <i />}</span><div><p className="fs-name"><b>{f}</b><span>{n}</span></p><p className="fs-job">{j}</p><p className="fs-now">{now}</p></div></li>
        ))}</ul>
      </div>
    </Browser>
  );
}
function ShotDashboard() {
  const t = [["16", "AI answers checked", "8 buyer questions, asked 2 times each", "o"], ["23", "people found asking", "on 4 platforms", "r"], ["23", "messages written", "one per person, in your voice", "r"], ["8", "posts and articles written", "6 posts, 2 articles", "c"], ["5", "fixes ready to publish", "so AI and Google name you", "o"], ["4", "launch listings written", "for directories that send visitors", "c"]];
  return (
    <Browser path="">
      <div className="fs-dash">
        <p className="fs-k">What Braino Foundry has done for you</p>
        <h4>Here is the work, done. It is waiting for your yes.</h4>
        <div className="fs-tiles">{t.map(([n, l, sub, e]) => <div key={l} className={"fs-tile " + e}><b>{n}</b><span>{l}</span><small>{sub}</small></div>)}</div>
        <div className="fs-next"><p className="fs-k">If you act on it</p><p><b>23 real people</b> who asked for this today hear from you. That is where first users come from.</p></div>
      </div>
    </Browser>
  );
}
function ShotPerson() {
  return (
    <Browser path="">
      <div className="fs-person">
        <div className="fs-chips">{["All 23", "Reddit 11", "X 5", "LinkedIn 3", "Quora 4"].map((c, i) => <span key={c} className={i === 1 ? "on" : ""}>{c}</span>)}</div>
        <article>
          <p className="fs-plat"><span>Reddit</span> r/IndianStartups · 3h</p>
          <b className="fs-t">"Running 3 PGs and half my weekend goes to chasing rent on WhatsApp. Any app for this?"</b>
          <p className="fs-why">Owns PGs and asks for a tool by name. Close to buying.</p>
          <div className="fs-msg"><small>Your reply, in your voice</small><p>Same problem got us building RentOnTime. It sends tenants a polite reminder on the 1st and a nudge on the 5th, so you stop being the bad guy. Happy to set it up for your 3 PGs, free for a month.</p></div>
          <div className="fs-acts"><b>Approve, open the post</b><span>Edit</span><u>Skip</u></div>
        </article>
      </div>
    </Browser>
  );
}
function ShotLaunch() {
  const places = [["Product Hunt", "Free", "Goes up now", 3, "Listing written"], ["Peerlist", "Free", "Goes up now", 2, "Listing written"], ["AlternativeTo", "Free", "Takes days", 3, "Listing written"], ["Indie Hackers", "Free", "Goes up now", 2, "Listing written"], ["BetaList", "Free or paid", "Takes weeks", 2, "Write it"], ["r/SideProject", "Free", "Goes up now", 2, "Write it"]] as const;
  return (
    <Browser path="">
      <div className="fs-launch">
        <p className="fs-k">Launch places</p>
        <div className="fs-grid">{places.map(([n, c, a, s, st]) => (
          <div key={n} className="fs-place"><b>{n}</b><small>{c} · {a}</small><span className="fs-str">{[1, 2, 3].map((k) => <i key={k} className={k <= s ? "on" : ""} />)}</span><em className={st === "Write it" ? "" : "ok"}>{st}</em></div>
        ))}</div>
      </div>
    </Browser>
  );
}
function ShotWeek() {
  const wk: [string, string[]][] = [["Mon", ["X: Chasing rent is the worst job"]], ["Tue", ["LinkedIn: What 40 PG owners told us"]], ["Wed", ["Reddit: How I stopped chasing rent"]], ["Thu", ["Article: Best rent apps for PGs"]], ["Fri", ["X: A tenant thanked us"]], ["Sat", []], ["Sun", []]];
  return (
    <Browser path="">
      <div className="fs-week">
        <p className="fs-k">When to post this week</p>
        <div className="fs-cal">{wk.map(([d, items]) => <div key={d}><small>{d}</small>{items.map((x) => <p key={x}>{x}</p>)}</div>)}</div>
      </div>
    </Browser>
  );
}
const SHOTS: [string, string, () => JSX.Element][] = [
  ["First two minutes", "Three engines go to work on what you built.", ShotFirstRun],
  ["Dashboard", "What Braino Foundry did for you, in plain numbers.", ShotDashboard],
  ["Reach people", "A real person asking today, with your reply ready.", ShotPerson],
  ["Launch places", "Where new products get listed, with the listing written.", ShotLaunch],
  ["Your week", "Posts planned on the days they do best.", ShotWeek],
];
function Shots() {
  const [i, setI] = useState(0);
  const Shot = SHOTS[i][2];
  return (
    <div className="fl-shots aff-reveal">
      <div className="fl-tabs fl-shot-tabs" role="tablist">{SHOTS.map(([t], k) => <button key={t} role="tab" aria-selected={k === i} className={k === i ? "on" : ""} onClick={() => setI(k)}>{t}</button>)}</div>
      <p className="fl-shot-cap">{SHOTS[i][1]}</p>
      <div className="fl-shot" key={i}><Shot /></div>
    </div>
  );
}

/* Foundry on the Mac: the /braino day scroll, fed a founder's day. */
const MAC_DAY = [
  { at: "8:30 am", p: "“Foundry found 6 people asking about PG rent apps overnight.” His good morning, before your coffee." },
  { at: "8:40 am", p: "“Send it.” A PG owner on Reddit, your reply under it in the notch. Sent, from your own browser." },
  { at: "9:00 am", p: "Your LinkedIn post goes out at the hour your buyers scroll. You said yes to it last night." },
  { at: "10:15 am", p: "“Riya replied. She asks if it works with UPI.” An answer is ready. You say “send it”, and UPI becomes next week’s post." },
  { at: "11:00 am", p: "“List us on Product Hunt.” He fills it in and stops at payment. Pay $39? Your call." },
  { at: "12:30 pm", p: "“Can ChatGPT find us yet?” He checks your buyers’ questions. Named in 2 of 8, up from 0 last week." },
  { at: "2:00 pm", p: "“Write the FAQ page.” Done, in your voice, with where it goes and how to add it." },
  { at: "3:30 pm", p: "Three people messaged on Monday never answered. Gentle follow-ups are ready for your yes." },
  { at: "5:00 pm", p: "A Quora question about late rent. He drafts a full answer that mentions you once, honestly." },
  { at: "6:00 pm", p: "“How did this week go?” 14 messages, 4 replies, 1 call booked." },
  { at: "9:30 pm", p: "You close the laptop. Tomorrow’s posts are written and waiting. He never sends anything without you." },
];
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
          <p className="fl-lead aff-reveal">Every day, founders post the same thing on Reddit and X: "I built it, I launched it, and nobody came." Building is now as easy as describing your app. What if getting it seen was just as easy? There you go. We made it happen for you.</p>
        </div>
      </section>

      <section className="ah-os" id="engines">
        <div className="aff-wrap">
          <BrainoMascot variant="foundry" size={88} className="fl-mascot" />
          <p className="ah-kicker">The fix</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="Meet Braino Foundry, your CMO." /></h2>
          <p className="fl-lead aff-reveal">Braino becomes your chief marketing officer. He runs your marketing and distribution on autopilot, all in one place, and you only say yes. Getting seen brings your first users. Some of them pay.</p>
          <ul className="fl-eng aff-reveal">
            {ENGINES.map((e, i) => <li key={e.key} className={`fl-e${i}`}><small>{e.key}<span>{e.sub}</span></small><h3>{e.h}</h3><p>{e.p}</p></li>)}
          </ul>
        </div>
      </section>

      <section className="ah-os" id="see">
        <div className="aff-wrap">
          <p className="ah-kicker">The product</p>
          <h2 className="aff-h1 ah-os-line" data-lit><Lit text="See what you get in the first minute." /></h2>
          <p className="fl-lead aff-reveal">A sample run for RentOnTime, rent reminders for PG owners.</p>
          <Shots />
        </div>
      </section>

      <section className="ah-os" id="braino">
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
            <div><small>On the web · open to try</small><h3>A dashboard and a few clicks.</h3><p>Works on Chrome and Windows. Approve copies the text and opens the site, so you post it.</p><Link to="/foundry/app" className="aff-cta">Open Braino Foundry</Link></div>
            <div><small>On your Mac · coming</small><h3>Your voice and the notch.</h3><p>Ask out loud. He posts in your own logged in browser, only after your yes. Braino Mac is in private beta.</p><Link to="/braino#early-access" className="aff-cta aff-cta-ghost">Join the waitlist</Link></div>
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

      <AffFooter />
    </div>
  );
}
