import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import IomiNotch from "@/components/IomiNotch";
import BrainoFooter from "@/components/BrainoFooter";
import { Braino, BrainoDefs, useTime } from "@/components/BrainoChar";
import MiniBraino from "@/components/MiniBraino";
import { BRAINO_WALKER_SVG } from "@/components/brainoWalkerSvg";
import { BrainoTVProvider, BrainoTVScreen } from "@/components/BrainoTV";
import EmotionNetwork from "@/components/EmotionNetwork";
import HumanIntelligence from "@/components/HumanIntelligence";
import { ArrowUpRight } from "lucide-react";
import { EXTENSION_DOWNLOAD_URL, EXTENSION_DOWNLOAD_FILENAME, EXTENSION_VERSION } from "@/lib/extensionDownload";
import "../styles/apple.css";
import "./landing.css";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

/* ============================================================================
   / — the landing page.

   The page this replaced was a stack of questions you had to open one at a
   time, a tab row that duplicated the notch, and thirty links out to finished
   pages for an unfinished product. All of that asked the visitor to do the work
   of figuring out what this is. A landing page has to assert.

   The first pass at fixing it swung too far the other way and read as a pitch
   deck: hairlines, big type, nothing to look at. So the argument stays exactly
   as it was and the surface is now the site's own Apple system, with the notch,
   the theme toggle and the real footer that every other page has.

   Free companion first, because that is how anyone meets him, then the turn
   into Distra, because founders with a distribution problem are who this is for.
   Braino Code is deliberately absent: if Distra is the wedge, a second engine on
   the same page dilutes it.
   ============================================================================ */

const SunIcon = () => (<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.4 1.4M17.6 17.6 19 19M19 5l-1.4 1.4M6.4 17.6 5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
const MoonIcon = () => (<svg viewBox="0 0 24 24" fill="none"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>);

const ANCHORS = [
  { href: "#who-is", label: "Who he is" },
  { href: "#does", label: "What he does" },
  { href: "#who", label: "Who it's for" },
  { href: "#why", label: "Why him" },
  { href: "#pricing", label: "Pricing" },
  { href: "#hood", label: "Under the hood" },
];

/* One accent per feature, the same way the deck gives one accent per act: the
   colour is what makes four panels read as four ideas rather than one list. */
/* Free is how you meet him, not a promise about the bill. Tokens cost real
   money, so the honest shape is a real free tier and then usage-based credits.
   Saying "free forever" and then metering would be the one thing that loses
   trust permanently. */
/* Who he is, before what he does. Each card holds the real mascot rig doing the
   thing the copy describes, because "he is a character" is a claim you show
   rather than assert. Same gallery /product-overview uses. */
type MascotMotion = "standing" | "walking" | "dancing" | "moonwalk";

const STORY: Array<{ number: string; label: string; title: string; description: string; art: "face" | "reactions" | MascotMotion }> = [
  { number: "01", label: "A character", title: "He is somebody, not something.",
    description: "A face on your screen with a name, a mood and a way of moving. Not a chat box you open when you remember it exists.", art: "face" },
  { number: "02", label: "A voice", title: "You talk. He talks back.",
    description: "In his own voice, out loud, while you carry on with what you were doing. Typing is the fallback, not the interface.", art: "standing" },
  { number: "03", label: "He is in it", title: "He walks onto the page with you.",
    description: "Not a mascot trapped in a widget in the corner. He is on the thing you are working on, watching the same screen.", art: "walking" },
  { number: "04", label: "An opinion", title: "He will tell you an idea is weak.",
    description: "An assistant that agrees with everything is a slower way of talking to yourself. He pushes back, and he is right often enough to be worth it.", art: "reactions" },
  { number: "05", label: "A memory", title: "He knows what you did last week.",
    description: "One memory across the browser, the Mac and everything he runs. You never have to explain yourself twice.", art: "dancing" },
  { number: "06", label: "And yes", title: "Of course he moonwalks.",
    description: "Hat on, feet forward, gliding backward. A product you talk to every day should be allowed a little theatre.", art: "moonwalk" },
];

function MovingBraino({ motion }: { motion: MascotMotion }) {
  const time = useTime();
  const beat = time * 3.4;
  const travel = motion === "walking" ? Math.sin(time * .72) * 28 : motion === "moonwalk" ? Math.sin(time * .58) * 34 : 0;
  const dancing = motion === "dancing";
  return (
    <div className={`po-moving-braino is-${motion}`} style={{ transform: `translateX(${travel}px)` }} aria-hidden="true">
      <Braino
        size={230} legs gloves idle
        walk={motion === "walking"} moonwalk={motion === "moonwalk"}
        accessory={motion === "moonwalk" ? "fedora" : "none"}
        expr={dancing || motion === "moonwalk" ? "mischief" : "happy"}
        lookX={motion === "walking" ? .45 : 0} lookY={dancing ? -.2 : 0}
        leftArm={dancing ? 42 + Math.sin(beat) * 30 : null}
        rightArm={dancing ? -42 + Math.sin(beat) * 30 : null}
        style={dancing ? { transform: `translateY(${-Math.abs(Math.sin(beat)) * 9}px) rotate(${Math.sin(beat) * 4}deg)`, transformOrigin: "50% 80%" } : undefined}
      />
    </div>
  );
}

const FEATURES = [
  { n: "01", ac: "ac-coral", name: "Chat with whatever is in front of you",
    line: "Any page, any PDF, any video. He is already on it, so there is nothing to paste and nothing to upload." },
  { n: "02", ac: "ac-violet", name: "Notes from anything you listen to",
    line: "A lecture, a podcast, a two hour video. He listens and hands back something you would actually read." },
  { n: "03", ac: "ac-blue", name: "He sits in your meetings",
    line: "No bot in the participant list, invisible to your screen share. Notes at the end, and what you agreed to." },
  { n: "04", ac: "ac-green", name: "Say it, and he does it",
    line: "Books it, buys it, finds it, fills it in. In your browser, signed into your accounts, not a sandbox somewhere else." },
];

const PEOPLE = [
  { id: "student", label: "A student",
    line: "Too much to read, and it is all due Friday.",
    rows: [
      ["Chat with the page", "The forty page PDF you were assigned. Or the LeetCode problem you are stuck on, explained on the page you are stuck on."],
      ["Notes from audio", "A three hour recorded lecture turns into clean notes in about four minutes."],
      ["Meetings", "Group project calls you would otherwise have to remember on your own."],
      ["Delegate", "Find the paper, fill the form, book the slot, rename the forty files."],
    ] },
  { id: "founder", label: "A founder",
    line: "Seven jobs, no one to hand any of them to.",
    rows: [
      ["Chat with the page", "A competitor's pricing page, a contract, a docs page you do not have an hour for. Ask, get the answer."],
      ["Notes from audio", "The podcast you had on at the gym becomes three things worth posting about."],
      ["Meetings", "Investor calls and customer calls. Notes after, and a list of what you promised."],
      ["Delegate", "Book the flight, buy the domain, chase the renewal you keep forgetting."],
    ] },
  { id: "everyone", label: "Everyone else",
    line: "Thirty small frictions a day that nobody should be doing.",
    rows: [
      ["Chat with the page", "Whatever is in front of you. The terms nobody reads, the recipe, the tax page."],
      ["Notes from audio", "The long video you want the substance of and not the forty minutes."],
      ["Meetings", "The standup you zoned out in."],
      ["Delegate", "The booking, the form, the thing in seven tabs."],
    ] },
];

/* The comparison. Read across, not down: the same question answered twice. */
const COMPARE: Array<[string, string, string]> = [
  ["What it is for", "Getting through your day", "Getting your product seen"],
  ["Where he lives", "Your browser, on every page", "X and LinkedIn, with Reddit and Instagram next"],
  ["What he does", "Chats, takes notes, sits in meetings, runs errands", "Learns your writing, posts for you, finds conversations worth entering"],
  ["Who it is for", "Anyone with a screen", "Founders who built something nobody has seen"],
  ["What it costs", "Free to start, then credits for what you use", "Priced on the work he does, not per seat"],
];

/* Credits, not seats. Thinking costs real money per use, so the only honest
   shape is a real free tier and then paying for what you actually spend. The
   numbers are indicative and the page says so: pretending they are settled and
   then changing them is how you lose the people who believed you first. */
const PACKS = [
  { credits: 500, price: 9, blurb: "A few questions a day, a couple of lectures a week." },
  { credits: 1500, price: 20, blurb: "Daily use. Meetings, notes and the odd delegated job." },
  { credits: 5000, price: 50, blurb: "He is in most of your day, most days." },
  { credits: 15000, price: 120, blurb: "Everything, plus Braino Distra running your distribution." },
];

const SPEND = [
  ["Ask about the page you are on", "1 credit"],
  ["Turn an hour of audio into notes", "15 credits"],
  ["Sit in a meeting and write it up", "20 credits"],
  ["Do a job in your browser", "10 credits"],
];

const FAQ = [
  { q: "Is it actually free?",
    a: "There is a real free tier, not a trial. You get a monthly allowance of credits and when it runs out he stops rather than quietly billing you. If you want more, you buy more." },
  { q: "Why credits and not a flat subscription?",
    a: "Because thinking costs real money every single time, and a flat price only works if most people barely use the thing. We would rather charge for what you spend than build a product that quietly hopes you forget about it." },
  { q: "What can he actually see?",
    a: "The page you are on, when you ask. Meetings you start him in. Nothing in the background, nothing while you are not looking, and never another tab you did not point him at." },
  { q: "Does he post or send anything on his own?",
    a: "Not without you. Money, direct messages, deleting anything, and anything published for the first time all stop and ask, at every level of autonomy. He decides how. You decide whether." },
  { q: "Is my data used to train anything?",
    a: "No. What he learns about you stays yours and stays in your account, which is also the only way the memory is worth anything." },
  { q: "Does it work on Windows?",
    a: "The browser Braino works anywhere Chrome does. The Mac companion is macOS only for now, because doing it properly means going deep into one operating system rather than shallow into three." },
  { q: "What happens to my meeting recordings?",
    a: "They stay yours. He is invisible to the participant list and to screen share, there is no bot in the call, and you can delete a recording and its notes together." },
  { q: "Who is building this?",
    a: "One person, so far. That is why the honest sections on this site exist: it is faster to tell you what is not built than to have you find out." },
];

const WHY = [
  { h: "He is already there.", p: "No tab to open, no context to paste. He is on the page you are on and in the meeting you are in, which is most of the work before any answer happens." },
  { h: "He remembers what you did, not just what you told him.", p: "Other assistants remember what you type into them. Braino remembers the pages you were on, the meetings he sat in, and the way you actually write." },
  { h: "He works in your browser, in your accounts.", p: "Signed in as you, on the real internet. Not a separate window that has to ask you to log in again before it can do anything." },
  { h: "He has an opinion.", p: "He will tell you an idea is weak. An assistant that agrees with everything is just a slower way of talking to yourself." },
];

function StampLine({ words, delay = 0, tone = false, whenVisible = false }: {
  words: string[]; delay?: number; tone?: boolean; whenVisible?: boolean;
}) {
  const [shown, setShown] = useState(0);
  const hostRef = useRef<HTMLSpanElement>(null);
  const [armed, setArmed] = useState(!whenVisible);

  // The close sits far down the page, so the stamp waits until it is actually
  // on screen. An animation that finished before you arrived is not one.
  useEffect(() => {
    if (armed || !hostRef.current) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setArmed(true)),
      { threshold: 0.5 },
    );
    io.observe(hostRef.current);
    return () => io.disconnect();
  }, [armed]);

  useEffect(() => {
    if (!armed) return;
    // 110ms apart: fast enough to read as one line landing, slow enough that
    // each word registers as its own hit.
    const timers = words.map((_, i) =>
      window.setTimeout(() => setShown((n) => Math.max(n, i + 1)), delay + i * 110));
    return () => timers.forEach(window.clearTimeout);
  }, [words, delay, armed]);
  return (
    <span ref={hostRef} className={tone ? "tone" : undefined}>
      {words.map((w, i) => (
        <Fragment key={w + i}>
          <span className={"ld-stamp" + (i < shown ? " in" : "")}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll<HTMLElement>(".apple-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.16 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

export default function Landing() {
  const ref = useReveal();
  const [who, setWho] = useState(0);
  const [typed, setTyped] = useState("");
  const [asking, setAsking] = useState(false);
  const [pack, setPack] = useState(1);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [askErr, setAskErr] = useState<string | null>(null);
  // A generated column sits alongside the presets rather than replacing one, so
  // the pills stay clickable and going back is one tap.
  const [custom, setCustom] = useState<{ label: string; line: string; rows: string[][] } | null>(null);
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("braino-apple-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem("braino-apple-theme", dark ? "dark" : "light"); } catch { /* ignore */ }
  }, [dark]);
  useEffect(() => { document.title = "Braino — speak, watch it happen"; }, []);

  const person = custom ?? PEOPLE[who];

  const askBraino = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const q = typed.trim();
    if (!q || asking) return;
    setAsking(true); setAskErr(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/braino-for-you`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ who: q }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload.rows) throw new Error(payload.error || "Could not work that one out.");
      setCustom(payload);
    } catch (err) {
      setAskErr(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAsking(false);
    }
  }, [typed, asking]);

  return (
    <BrainoTVProvider>
    <div className={"apple ld" + (dark ? " dark" : "")} ref={ref}>
      <BrainoDefs />
      <IomiNotch />

      <div className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="ld-anchor-name">Braino</span>
          <div className="an-links">
            {ANCHORS.map((a) => <a key={a.href} href={a.href}>{a.label}</a>)}
            <a href={EXTENSION_DOWNLOAD_URL} className="apple-cta">Get Braino</a>
          </div>
          <button className="apple-theme-toggle" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title="Toggle dark mode">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>

      {/* ── 1. Hero ──────────────────────────────────────────────────── */}
      <header className="apple-hero left ac-coral" id="top">
        <p className="apple-eyebrow">Braino</p>
        <h1 className="apple-display">Speak.<br /><span className="tone">Watch it happen.</span></h1>
        <p className="apple-subhead">
          Braino is an AI that lives on your screen. You talk to him like a person, and he
          actually does the work. Free to start, in your browser.
        </p>
        <div className="apple-hero-cta">
          <a className="apple-dl" href={EXTENSION_DOWNLOAD_URL} download={EXTENSION_DOWNLOAD_FILENAME}>
            Download for Chrome
            <span>v{EXTENSION_VERSION}</span>
          </a>
          <small>Unzip, then Chrome → Extensions → turn on Developer mode → Load unpacked.</small>
        </div>
        <div className="apple-hero-links">
          <a href="#who-is">Who is Braino</a>
          <a href="#distra">For founders</a>
        </div>
      </header>

      <div className="apple-boot">
        <div className="apple-macscreen apple-reveal">
          <BrainoTVScreen className="apple-boot-video" offer={{ src: "/dontblink?embed=1", title: "Don't Blink" }} />
        </div>
      </div>

      {/* ── 2. Who is Braino ─────────────────────────────────────────── */}
      <section className="apple-story ac-coral ld-whois" id="who-is">
        <div className="story-intro apple-reveal">
          <p className="bento-eyebrow">Who is Braino?</p>
          <h2 className="story-introh">Not a tool. <span className="tone">Somebody</span> who is already there.</h2>
          <p className="story-introp">
            He is not another window you open and forget. He is awake to what you are doing,
            genuinely his own person, and quietly good at getting you through the day.
          </p>
          <div className="bento-walker"><MiniBraino size={56} /></div>
        </div>
        <div className="po-character-grid">
          {STORY.map((form) => (
            <article className="po-character-card apple-reveal" key={form.number}>
              <div className={`po-character-art is-${form.art}`}>
                {form.art === "face"
                  ? <img src="/reactions/braino-happy.svg" alt="Braino smiling" />
                  : form.art === "reactions"
                    ? <><img src="/reactions/braino-idle.svg" alt="Braino idle" /><img src="/reactions/braino-happy.svg" alt="Braino happy" /><span dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }} /></>
                    : <MovingBraino motion={form.art} />}
              </div>
              <div className="po-character-copy">
                <span>{form.number} / {form.label}</span>
                <h3>{form.title}</h3>
                <p>{form.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── 3. What he does ──────────────────────────────────────────── */}
      <section className="ld-why-sec apple-reveal" id="does">
        <div className="ld-wrap">
          <p className="apple-eyebrow">What he does</p>
          <h2 className="ld-h2">Four things, <span className="tone">every day.</span></h2>
          <p className="ld-lede">
            This is the free Braino, the one that lives in your browser. No setup beyond installing
            him.
          </p>
          <div className="ld-why">
            {FEATURES.map((f) => (
              <div key={f.n}><b>{f.name}</b><p>{f.line}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Who it is for ─────────────────────────────────────────── */}
      <section className="ld-who apple-reveal" id="who">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Who it is for</p>
          <h2 className="ld-h2">Same four things. <span className="tone">Different day.</span></h2>
          <p className="ld-lede">The four things never change. Only the week around them does. Pick one, or just tell him what you do and he will write yours.</p>

          <div className="ld-pills" role="tablist">
            {PEOPLE.map((p, i) => (
              <button key={p.id} type="button" role="tab" aria-selected={who === i}
                className={!custom && who === i ? "is-on" : undefined}
                onClick={() => { setWho(i); setCustom(null); setAskErr(null); }}>
                {p.label}
              </button>
            ))}
          </div>

          <form className="ld-ask" onSubmit={askBraino}>
            <div className="ld-ask-head">
              <span className={"ld-ask-mascot" + (asking ? " is-thinking" : "")} aria-hidden="true">
                <MiniBraino size={46} />
              </span>
              <label htmlFor="ld-who-input">
                Or just tell him what you do. <em>Braino will tell you how you can use him.</em>
              </label>
            </div>
            <div>
              <input
                id="ld-who-input"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="a paediatric nurse on night shifts"
                disabled={asking}
              />
              <button type="submit" className="ld-btn sm" disabled={asking || !typed.trim()}>
                {asking ? "Thinking..." : "Show me"}
              </button>
            </div>
            {askErr && <p className="ld-ask-miss">{askErr}</p>}
            {custom && !asking && (
              <p className="ld-ask-miss">
                Written for you just now, by him.{" "}
                <button type="button" className="ld-ask-back" onClick={() => { setCustom(null); setTyped(""); }}>
                  Back to the examples
                </button>
              </p>
            )}
          </form>

          <p className="ld-who-line">{custom ? <><span className="ld-who-tag">{custom.label}</span>{custom.line}</> : person.line}</p>
          <div className="ld-rows">
            {person.rows.map(([k, v]) => (
              <div key={k}><b>{k}</b><p>{v}</p></div>
            ))}
          </div>

          {/* The one handoff to the second page. Everyone gets the four things;
              only people building something have the other problem. */}
          <div className="ld-founder-note">
            <div>
              <b>Building something of your own?</b>
              <p>Then you have a second problem: you shipped it and nobody saw it. We wished distribution was as easy as vibe coding, so we made it happen.</p>
            </div>
            <Link to="/distra" className="ld-btn sm">Meet Braino Distra</Link>
          </div>
        </div>
      </section>

      {/* ── 5. Why him ───────────────────────────────────────────────── */}
      <section className="ld-why-sec apple-reveal" id="why">
        <div className="ld-wrap">
          <p className="apple-eyebrow">The obvious question</p>
          <h2 className="ld-h2">Why not just <span className="tone">use ChatGPT?</span></h2>
          <div className="ld-why">
            {WHY.map((w) => <div key={w.h}><b>{w.h}</b><p>{w.p}</p></div>)}
          </div>
        </div>
      </section>

      {/* ── 6. The two Brainos ───────────────────────────────────────── */}
      <section className="ld-kinds apple-reveal" id="kinds">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Braino comes in two</p>
          <h2 className="ld-h2">Same character. <span className="tone">Two jobs.</span></h2>
          <p className="ld-lede">
            The companion is how you meet him. Braino Distra is what you hire once you trust him.
          </p>

          <div className="ld-table-wrap">
            <table className="ld-table">
              <thead>
                <tr>
                  <th />
                  <th><b>Braino</b><span>The companion</span></th>
                  <th className="is-paid"><b>Braino Distra</b><span>The one you hire</span></th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([row, a, bb]) => (
                  <tr key={row}>
                    <th scope="row">{row}</th>
                    <td>{a}</td>
                    <td className="is-paid">{bb}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td><a href={EXTENSION_DOWNLOAD_URL} className="ld-btn sm">Get Braino</a></td>
                  <td className="is-paid"><Link to="/distra" className="ld-btn sm ghost">See Distra</Link></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="ld-fine">
            There is also <strong>HERA</strong>, which is not a third Braino. It is a mode either one
            drops into: hold a key, talk, and the words land at your cursor in whatever app you were
            already in. It never says anything back.
          </p>
        </div>
      </section>

      {/* ── 7. Under the hood ────────────────────────────────────────── */}
      <section className="apple-blog howworks" id="hood">
        <div className="hw-title apple-reveal">
          <p className="be" style={{ color: "var(--ap-violet)" }}>Under the hood</p>
          <h2>Braino OS.</h2>
          <p className="hw-sub">
            Every Braino runs on the same mind. Two engines nobody else bothered to build: the one
            that works out what you actually mean, and the one that reads the moment you are in.
            That is why he feels like someone rather than something.
          </p>
        </div>
        <div className="apple-blog-grid apple-reveal">
          <Link className="hw-card ac-coral" to="/emotional-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><EmotionNetwork /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The heart</span>
              <h3>Emotional Intelligence</h3>
              <p>The most emotionally intelligent AI anyone has built. Twelve trait modules reorder on every message, so he meets bad news differently than he meets banter.</p>
            </div>
            <span className="hw-read">Explore the Emotional Engine <ArrowUpRight /></span>
          </Link>
          <Link className="hw-card ac-blue" to="/human-intelligence">
            <div className="hw-cover"><span className="hw-notch" aria-hidden="true"><i /><i /></span><HumanIntelligence /></div>
            <div className="hw-body">
              <span className="hw-tag"><span className="dot" />The mind</span>
              <h3>Human Intelligence</h3>
              <p>He works a problem the way a person does. Your screen, your memory, the conversation, the time and the place, pulled together to resolve what you actually want.</p>
            </div>
            <span className="hw-read">Explore Human Intelligence <ArrowUpRight /></span>
          </Link>
        </div>
      </section>

      {/* ── 8. Pricing ───────────────────────────────────────────────── */}
      <section className="ld-pricing apple-reveal" id="pricing">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Pricing</p>
          <h2 className="ld-h2">You pay for what <span className="tone">you actually use.</span></h2>
          <p className="ld-lede">
            Not per seat, not per month for a thing you opened twice. Credits, spent when he does
            something, with a real free tier underneath.
          </p>

          <div className="ld-price-grid">
            <div className="ld-price-free">
              <span>Free</span>
              <b>$0</b>
              <p>A monthly allowance of credits, the full character, the full memory. When it runs out he stops rather than quietly billing you.</p>
              <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn sm">Start free</a>
            </div>

            <div className="ld-price-pick">
              <div className="ld-price-head">
                <span>Top up when you need more</span>
                <div className="ld-price-amount">
                  <b>${PACKS[pack].price}</b>
                  <em>/ {PACKS[pack].credits.toLocaleString()} credits</em>
                </div>
              </div>
              <input
                className="ld-price-slider"
                type="range" min={0} max={PACKS.length - 1} step={1} value={pack}
                onChange={(e) => setPack(Number(e.target.value))}
                aria-label="How many credits"
              />
              <div className="ld-price-ticks">
                {PACKS.map((p, i) => (
                  <button key={p.credits} type="button"
                    className={i === pack ? "is-on" : undefined}
                    onClick={() => setPack(i)}>
                    {p.credits >= 1000 ? `${p.credits / 1000}k` : p.credits}
                  </button>
                ))}
              </div>
              <p className="ld-price-blurb">{PACKS[pack].blurb}</p>

              <div className="ld-spend">
                <b>What a credit buys</b>
                {SPEND.map(([what, cost]) => (
                  <div key={what}><span>{what}</span><em>{cost}</em></div>
                ))}
              </div>
            </div>
          </div>

          <p className="ld-fine">
            These numbers are indicative and not settled. Publishing a price we have not tested and
            then quietly changing it is how you lose the people who believed you first, so this says
            so instead.
          </p>
        </div>
      </section>

      {/* ── 9. FAQ ───────────────────────────────────────────────────── */}
      <section className="ld-faq-sec apple-reveal" id="faq">
        <div className="ld-wrap">
          <p className="apple-eyebrow">Questions</p>
          <h2 className="ld-h2">The things people <span className="tone">actually ask.</span></h2>
          <div className="ld-faq">
            {FAQ.map((f, i) => (
              <div key={f.q} className={openFaq === i ? "is-open" : undefined}>
                <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.q}<i aria-hidden="true" />
                </button>
                <div className="ld-faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 10. Close ────────────────────────────────────────────────── */}
      <section className="ld-close apple-reveal">
        <div className="ld-close-art" aria-hidden="true"><Braino size={150} expr="happy" legs gloves /></div>
        <h2 className="apple-display ld-stamp-line">
          <StampLine words={["Speak,"]} whenVisible />
          {" "}
          <StampLine words={["watch", "it", "happen."]} delay={240} tone whenVisible />
        </h2>
        <div className="ld-cta">
          <a href={EXTENSION_DOWNLOAD_URL} className="ld-btn">Get Braino, free</a>
        </div>
      </section>

      <BrainoFooter />
    </div>
    </BrainoTVProvider>
  );
}
