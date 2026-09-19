import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./braino-final.css";

/* ============================================================================
   /braino-final — the one page about Braino.

   Everything about him lives on one page in three tabs: Braino, Braino
   Foundry, and Braino for Mesa School of Business. They are not three
   products. They are one product and the two places it is pointed, so the tabs
   change the story and never the thing.

   Written from the reader's side of the screen. Every section starts with the
   day they actually have, in their own words, before a single sentence about
   what we built. Nobody has ever wanted screen awareness; they want to stop
   describing their screen to a robot.

   The page borrows the company page's grammar on purpose: warm paper, hairline
   boxes, serif for claims and the system face for him. A different look would
   say he came from somewhere else.
   ============================================================================ */

type Model = {
  key: string;
  tab: string;
  who: string;
  name: string;
  claim: string;
  claimTail: string;
  /* The day they have now, before anything is sold. */
  painTitle: string;
  pain: string[];
  /* What he does about it, as things somebody would notice. */
  does: { art: string; h: string; p: string }[];
  /* One ordinary day, after. */
  dayTitle: string;
  day: { at: string; p: string }[];
  /* What is true today, said plainly, including what is not. */
  honest: string;
  cta: { label: string; to: string };
  state: string;
  accent: string;
};

const MODELS: Model[] = [
  {
    key: "braino",
    tab: "Braino",
    who: "For everyone",
    name: "Braino",
    claim: "You already know what to do.",
    claimTail: "You just have to go and do it.",
    painTitle: "The day you have now",
    pain: [
      "Every answer you get comes with a job attached. Open the tab, find the file, fill the form, write the reply. The thinking took a second and the doing takes the afternoon.",
      "You explain your own screen to a chat box, paste half of it in, and it still asks which invoice you meant.",
      "You sat through the whole meeting and took no notes, because you were in the meeting.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He is already there.",
        p: "Nothing to open, nothing to paste. He lives in your browser and in your Mac's notch, on whatever you are looking at, so asking him costs the same as thinking it.",
      },
      {
        art: "/os-voice.jpg",
        h: "He sits through the meeting.",
        p: "An hour of a lecture or a call, written down while you listen. You close the laptop and the notes are already there, with what was decided and who said they would do what.",
      },
      {
        art: "/os-hands.jpg",
        h: "He knows your people.",
        p: "Who you message on a Friday, which Ravi you meant, what you told him last month. You stop introducing yourself to your own software every morning.",
      },
      {
        art: "/os-memory.jpg",
        h: "He asks before he acts.",
        p: "Nothing bought, sent, posted or deleted until you say yes. That is a rule in the code rather than a line in a prompt, which is the only version of that promise worth having.",
      },
    ],
    dayTitle: "An ordinary Tuesday with him",
    day: [
      { at: "9:10", p: "“What is on today?” He reads it back before you have opened anything." },
      { at: "11:30", p: "An hour on a call. You never touch the keyboard. The notes are written by the time you stand up." },
      { at: "2:40", p: "“Reply to this one and say I will send it Friday.” He writes it, shows you, and waits." },
      { at: "6:05", p: "“What did I say I would do?” Four things, three of them already done." },
    ],
    honest:
      "Braino is in private beta on macOS and Chrome. Everything on this page is something he does today. Windows is not on the list yet, and we would rather say so than pretend.",
    cta: { label: "Ask for a seat", to: "/waitlist" },
    state: "Runs on AffectiveOS · Private beta",
    accent: "#d9645b",
  },
  {
    key: "foundry",
    tab: "Braino Foundry",
    who: "For founders",
    name: "Braino Foundry",
    claim: "You are building it.",
    claimTail: "Nobody has heard of it.",
    painTitle: "The day you have now",
    pain: [
      "The product gets built because you love that part. The posting, the outreach and the follow-ups do not, because there is one of you and it is already midnight.",
      "You explain your own company to a fresh chat window every morning. It has never met your last three decisions.",
      "Twenty people said maybe. You remember four of them.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He knows your company.",
        p: "What you are building, who you have spoken to, what you decided last month and why. You stop briefing your own software before you can use it.",
      },
      {
        art: "/os-voice.jpg",
        h: "He does the posting.",
        p: "The updates, the replies, the thread you meant to write on Sunday. He drafts, you say yes, it goes out. The half of the company that never gets done, done.",
      },
      {
        art: "/os-hands.jpg",
        h: "He chases the follow-ups.",
        p: "The people who said maybe, the mail nobody answered, the call you were going to make on Tuesday. He keeps the list and he works it.",
      },
      {
        art: "/os-memory.jpg",
        h: "He tells you the truth.",
        p: "A co-founder who only ever agrees is a mirror. He remembers what you decided in March and says so when today contradicts it.",
      },
    ],
    dayTitle: "A week with a co-founder",
    day: [
      { at: "Mon", p: "You ship a feature. He writes the post about it and holds it for your yes." },
      { at: "Tue", p: "Eleven people saw it and two replied. He drafts both replies before you have read them." },
      { at: "Thu", p: "“Who have we not heard back from?” Nine names, sorted by who is worth chasing." },
      { at: "Sun", p: "“We said we would not do enterprise this quarter.” He is right and you had forgotten." },
    ],
    honest:
      "Foundry is Braino pointed at a company. It is the same software, the same beta, on macOS. Handing work to coding agents and checking it comes to Foundry first, and it has not shipped.",
    cta: { label: "Talk to us about Foundry", to: "/contact" },
    state: "Runs on AffectiveOS · For founders",
    accent: "#b8842a",
  },
  {
    key: "mesa",
    tab: "For Mesa School of Business",
    who: "For institutions",
    name: "Braino for Mesa School of Business",
    claim: "Nobody should have to ask",
    claimTail: "which room the class is in.",
    painTitle: "The day your students have now",
    pain: [
      "The timetable lives in a portal nobody opens twice. The room number lives in a group chat. The deadline lives in somebody's screenshot.",
      "They missed one class and now they are reconstructing it from three people's notes.",
      "The office answers on Monday. The question was at eleven on Saturday night.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He knows the timetable.",
        p: "The school's own, not one they keep updating. What is on today, which room, who is teaching, what moved. Ask him in the words you would use out loud.",
      },
      {
        art: "/os-voice.jpg",
        h: "He sits through the lecture.",
        p: "Forty minutes of it, written down while they listen. The one who missed it reads what was actually said, not somebody's photograph of a slide.",
      },
      {
        art: "/os-hands.jpg",
        h: "He knows where they stand.",
        p: "Attendance, deadlines, what is due on Friday. Not a dashboard they have to remember to open, an answer when they ask.",
      },
      {
        art: "/os-memory.jpg",
        h: "He is awake at eleven on a Saturday.",
        p: "The questions the office answers on Monday get answered on Saturday, in their own words, from the school's own information.",
      },
    ],
    dayTitle: "A week inside a school",
    day: [
      { at: "Mon", p: "“What is my next class?” Room, time and who is teaching, before they have opened the portal." },
      { at: "Wed", p: "They miss one. The notes from it are waiting when they open the laptop." },
      { at: "Fri", p: "“What is due?” Three things, with the one that is due first at the top." },
      { at: "Sat", p: "“Am I short on attendance?” He answers, from the school's own record." },
    ],
    honest:
      "This is the same Braino with a school's own timetable, attendance and deadlines connected to him. It is a deal with the institution rather than something a student downloads, and it is live with Mesa School of Business.",
    cta: { label: "Bring him to your institution", to: "/contact" },
    state: "Runs on AffectiveOS · Live with Mesa",
    accent: "#2f6fed",
  },
];

/* The questions people actually ask, answered without a word anybody would
   have to look up, and including the ones about what we did not build. */
const FAQ = [
  {
    q: "What is Braino, in one line?",
    a: "Somebody who lives on your Mac and in your browser, sees what you are looking at, and goes and does the things you would otherwise do yourself.",
  },
  {
    q: "Is this a chatbot?",
    a: "The opposite. A chatbot answers and leaves you to it. He goes and does the thing, on the screen you are already on, and then checks that it worked before he tells you it did.",
  },
  {
    q: "Do I have to move to a new app?",
    a: "No. He works inside what you already use: your browser, your Mac, your mail, your college portal. There is nothing to migrate and nothing to set up.",
  },
  {
    q: "Can he do something I did not ask for?",
    a: "No. Anything that spends money, sends a message, posts publicly or deletes something stops and waits for you to say yes. That is enforced in the code, not requested in an instruction.",
  },
  {
    q: "Are Braino, Foundry and the school version three products?",
    a: "One product, in three places. The same Braino, the same brain, the same memory. Foundry is him pointed at your company, and the school version is him with a school's timetable and attendance inside him.",
  },
  {
    q: "Did you build the AI itself?",
    a: "No. The models that think are built by labs with more money than us. We build everything between the model and your machine: the seeing, the hearing, the doing, the remembering, and the part that stops him sending the wrong thing.",
  },
  {
    q: "What can I use today?",
    a: "Braino is in private beta on macOS and Chrome. The school version is live with Mesa School of Business. Handing work to coding agents is coming to Foundry first and has not shipped.",
  },
  {
    q: "What does it do with what it sees?",
    a: "It answers you. He reads the screen when you ask him something about it, and what is private is never written down. Nothing is sold, and there is no version of this where that changes.",
  },
];

function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".bf-reveal");
    if (!els?.length) return;
    // Visible at rest if the observer never runs. A page parked at opacity 0
    // waiting on JS is how a site ships looking empty.
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return root;
}

export default function BrainoFinal() {
  const root = useReveal();
  /* Which of the three is open. A number on the page: there is nothing to
     store and nothing to look up. */
  const [at, setAt] = useState(0);
  const model = MODELS[at];

  useEffect(() => {
    document.title = "Braino";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="bf" ref={root} style={{ ["--acc" as string]: model.accent }}>
      <nav className="bf-nav">
        <div className="bf-nav-in">
          <Link to="/braino-final" className="bf-logo">
            <img src="/braino-standing.svg" alt="" width={104} height={127} aria-hidden="true" />
            <span>Braino</span>
          </Link>
          <div className="bf-nav-links">
            <a href="#what">What he does</a>
            <a href="#day">A normal day</a>
            <a href="#faq">Questions</a>
            <Link to="/waitlist">Get him</Link>
          </div>
        </div>
      </nav>

      {/* ── The claim ───────────────────────────────────────────────────────
          The reader's own sentence first, and the answer to it under that. No
          feature is mentioned on the first screen, because nobody has ever
          been sold a feature they had not yet felt the need for. */}
      <header className="bf-hero">
        <div className="bf-wrap">
          <p className="bf-eyebrow bf-reveal">Braino</p>
          <h1 className="bf-h1 bf-reveal">
            Stop doing the bit
            <b>after the answer.</b>
          </h1>
          <div className="bf-hero-row bf-reveal">
            <p className="bf-hero-one">
              Every AI on earth will tell you what to do. Braino is the one who gets up and
              does it, on the machine in front of you, and asks first when it matters.
            </p>
            <div className="bf-hero-cta">
              <Link to="/waitlist" className="bf-cta">Ask for a seat</Link>
              <a href="#what" className="bf-cta bf-cta-ghost">See what he does</a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Who this one is for ─────────────────────────────────────────────
          One product, three places it is pointed. The tabs change the story and
          never the thing, which is why the same four questions are answered in
          each: what your day looks like now, what he does about it, what a week
          looks like after, and what is honestly true today. */}
      <div className="bf-switch" id="what">
        <div className="bf-wrap bf-switch-in">
          <div className="bf-tabs" role="tablist" aria-label="Which Braino">
            {MODELS.map((m, i) => (
              <button
                key={m.key}
                type="button"
                role="tab"
                aria-selected={i === at}
                className={i === at ? "on" : ""}
                style={{ ["--dot" as string]: m.accent }}
                onClick={() => setAt(i)}
              >
                <i aria-hidden="true" />
                <span>{m.tab}</span>
                <small>{m.who}</small>
              </button>
            ))}
          </div>
          <p className="bf-switch-note">One Braino. Three places he is pointed.</p>
        </div>
      </div>

      <main className="bf-story" key={model.key}>
        {/* The day they have now, in their words, before a word about us. */}
        <section className="bf-sec bf-pain">
          <div className="bf-wrap">
            <div className="bf-sec-head bf-reveal">
              <p className="bf-kicker">{model.painTitle}</p>
              <h2>
                {model.claim}
                <b>{model.claimTail}</b>
              </h2>
            </div>
            <div className="bf-pain-cols bf-reveal">
              {model.pain.map((line) => <p key={line}>{line}</p>)}
            </div>
          </div>
        </section>

        {/* What he does about it. */}
        <section className="bf-sec">
          <div className="bf-wrap">
            <div className="bf-sec-head bf-reveal">
              <p className="bf-kicker">What he does about it</p>
              <h2>{model.name}</h2>
            </div>
            <div className="bf-grid bf-reveal">
              {model.does.map((d, i) => (
                <article className="bf-cell" key={d.h} style={{ transitionDelay: `${i * 90}ms` }}>
                  <div className="bf-cell-art">
                    <img src={d.art} alt="" width={341} height={415} loading="lazy" decoding="async" />
                  </div>
                  <div className="bf-cell-say">
                    <h3>{d.h}</h3>
                    <p>{d.p}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* And what that adds up to, hour by hour, which is the only proof a
            person can feel before they have used it. */}
        <section className="bf-sec bf-day" id="day">
          <div className="bf-wrap">
            <div className="bf-sec-head bf-reveal">
              <p className="bf-kicker">What changes</p>
              <h2>{model.dayTitle}</h2>
            </div>
            <ol className="bf-day-list bf-reveal">
              {model.day.map((d) => (
                <li key={d.at}>
                  <span className="bf-day-at">{d.at}</span>
                  <p>{d.p}</p>
                </li>
              ))}
            </ol>
            <div className="bf-honest bf-reveal">
              <p className="bf-honest-label">What is true today</p>
              <p>{model.honest}</p>
              <p className="bf-honest-go">
                <Link to={model.cta.to}>{model.cta.label}<i aria-hidden="true">→</i></Link>
                <span>{model.state}</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Questions ─────────────────────────────────────────────────────── */}
      <section className="bf-sec bf-faq-sec" id="faq">
        <div className="bf-wrap">
          <div className="bf-faq-in">
            <div className="bf-faq-head bf-reveal">
              <h2>Questions you may have.</h2>
              <p>Including the ones about what we did not build.</p>
            </div>
            {/* details/summary, so it works with no JavaScript and with a
                keyboard. */}
            <div className="bf-faq bf-reveal">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>
                    <span>{f.q}</span>
                    <i aria-hidden="true" />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bf-foot">
        <div className="bf-wrap">
          <div className="bf-foot-in">
            <div>
              <p className="bf-foot-mark">Braino</p>
              <p>
                A product of Affective. He runs on AffectiveOS, which is the part that
                gives the Mac you already own eyes, ears, a voice, hands and a memory.
              </p>
            </div>
            <nav className="bf-foot-col">
              <h4>Braino</h4>
              <Link to="/braino-final">Braino</Link>
              <Link to="/foundry">Braino Foundry</Link>
              <Link to="/contact">For institutions</Link>
            </nav>
            <nav className="bf-foot-col">
              <h4>Company</h4>
              <Link to="/affective">Affective</Link>
              <Link to="/waitlist">Get him</Link>
              <Link to="/contact">Contact</Link>
            </nav>
          </div>
          <p className="bf-foot-rule">
            Everything on this page is something the software does today. Nothing here is a
            roadmap.
          </p>
        </div>
      </footer>
    </div>
  );
}
