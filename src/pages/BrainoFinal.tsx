import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import BrainoFooterGame from "@/components/BrainoFooterGame";
/* The jobs are written here rather than read from the site's engine data,
   because this page says a different thing: each one carries what it saves
   you, and the Foundry engines carry the deck's own bullets. The engine files
   stay the source for the pages that use them. */
import "@/components/braino-footer.css";
import "./braino-final.css";

/* ============================================================================
   /braino-final — the one page about Braino.

   Everything about him lives on one page in three tabs: Braino, Braino
   Foundry, and Braino for Mesa School of Business. They are not three
   products. They are three models of one, the way a phone has models: the same
   machine inside, pointed at a different life. The tabs change the story and
   never the thing.

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
  /* The jobs he takes off you, from the site's own engine data. Mesa has none
     of its own yet and the section simply does not appear. */
  handles?: {
    heading: string;
    note: string;
    jobs: { n: string; name: string; job: string; points: string[]; solves: string; state: string }[];
  };
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
    claim: "The models got brilliant.",
    claimTail: "They still cannot reach your screen.",
    painTitle: "The day you have now",
    pain: [
      "The thinking is solved. A model will write the code, draft the mail and plan the trip better than most people would. Then it hands the answer back and you are the one who has to go and do it.",
      "It cannot see what you are looking at, so you paste the page in, crop the screenshot, explain which invoice. Half the day is spent describing your own screen to something that cannot look at it.",
      "And every window starts again from nothing. It has never met your files, your people, or what you decided last month.",
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
    handles: {
      heading: "The three ways he helps",
      note: "All three get better the longer he has been beside you, because the fourth thing he does is remember.",
      jobs: [
        {
          n: "01",
          name: "He reads what is in front of you.",
          job: "Any page, any PDF, any video.",
          points: [
            "Ask him about this contract, this problem, this article, the way you would ask somebody sitting next to you.",
            "Nothing gets pasted anywhere, because he is looking at the same screen you are.",
          ],
          solves: "No screenshots into another tab. He already has the context, so you never start from scratch.",
          state: "Running",
        },
        {
          n: "02",
          name: "He sits through the meeting.",
          job: "A call, a lecture, a two hour video you were never going to finish.",
          points: [
            "He listens the whole way through and hands back notes worth reading.",
            "What was decided, and what you promised and immediately forgot.",
          ],
          solves: "Press record and stop taking notes. They are written by the time you stand up.",
          state: "Running",
        },
        {
          n: "03",
          name: "He goes and does it.",
          job: "Books it, buys it, finds it, fills it in.",
          points: [
            "In your browser, in your accounts, on the sites you already use.",
            "He stops and asks before anything is paid for or sent.",
          ],
          solves: "The twenty minutes of clicking that come after you already knew what you wanted.",
          state: "Running",
        },
      ],
    },
    dayTitle: "An ordinary Tuesday with him",
    day: [
      { at: "9:10", p: "“What is on today?” He reads the day back before you have opened a calendar, because he has one." },
      { at: "9:40", p: "A long article you do not have time for. Nothing gets copied anywhere. “What is the argument, and does it say anything about pricing?” He is looking at the same page you are." },
      { at: "10:15", p: "“This form again.” He fills it from what he already knows about you and stops at the button that submits it." },
      { at: "11:30", p: "An hour on a call. You never touch the keyboard. You stand up and the notes are written, with what was decided and who said they would do what." },
      { at: "1:05", p: "“Put the 6am flight to Delhi in front of me.” He books it to the last screen and waits there, because the next click spends money." },
      { at: "2:40", p: "“Tell Ilu I will send it Friday.” One Ilu in your contacts, no spelling, no number, gone in four seconds." },
      { at: "4:20", p: "“What is this on screen?” He reads the thing you are stuck on and explains it, with no screenshot and no pasting." },
      { at: "6:05", p: "“What did I say I would do?” Four things, three already done, and he remembers the fourth from last month." },
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
    claim: "You can build it.",
    claimTail: "You cannot get seen.",
    painTitle: "The problem nobody solved",
    pain: [
      "A co-founder splits the work. One in three new companies has nobody to split it with, and the half nobody covers is always the same half: getting the thing in front of people.",
      "So it costs you ten hours a week. Posting, messaging, scrolling, for a handful of real conversations, on the days you had meant to build.",
      "We asked eight founders. Eight said distribution was the biggest unsolved problem. None of them pays for a single tool that solves it, because none of those tools does the work. They hand you a dashboard and a calendar and you are still the one typing.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He writes the week.",
        p: "Five posts, drafted from what you actually shipped, in the way you actually write. One update, fitted to LinkedIn, Reddit and Instagram separately, because they are not the same room. You show up every week without writing a word.",
      },
      {
        art: "/os-voice.jpg",
        h: "He gets you named.",
        p: "More than a third of buying now starts with somebody asking an AI, and right now the answer names your competitor. He works on the reviews, the listings and the pages those answers are built from, until it names you.",
      },
      {
        art: "/os-hands.jpg",
        h: "He writes to the right people.",
        p: "Twenty messages a week, one person at a time, each one about them rather than about you. Replies tracked, follow-ups made, nothing dropped on a Thursday because you were shipping.",
      },
      {
        art: "/os-memory.jpg",
        h: "Nothing goes out without your yes.",
        p: "He drafts, you read, you say go. Nothing posts, sends or spends on its own, and he remembers what you decided in March when today contradicts it.",
      },
    ],
    handles: {
      heading: "The engines",
      note: "Four of them, and the fourth is the one nobody sells: three tools that do not know about each other is the actual problem.",
      jobs: [
        {
          n: "01",
          name: "Content",
          job: "You show up every week without writing a word.",
          points: [
            "Five posts a week, drafted from what you actually shipped.",
            "One update, fitted to each platform properly, rather than pasted into all of them.",
            "LinkedIn, Reddit, Instagram.",
          ],
          solves: "Posting stops being a second job you do at midnight.",
          state: "Running",
        },
        {
          n: "02",
          name: "Optics",
          job: "Buyers find you when they ask an AI.",
          points: [
            "More than a third of buying now starts in an AI answer rather than in Google.",
            "Right now that answer names your competitor. He works until it names you.",
            "He finds the gap, a missing page or a thin listing, and fixes it.",
          ],
          solves: "You stop being invisible in the place people now start looking.",
          state: "Next",
        },
        {
          n: "03",
          name: "Outbound",
          job: "Conversations booked, not messages sent.",
          points: [
            "Twenty messages a week, one person at a time.",
            "Written from what they are actually doing, not a template with their name dropped in.",
            "Replies tracked and followed up, nothing dropped.",
          ],
          solves: "The outreach you keep meaning to do on Sunday gets done on Tuesday.",
          state: "Planned",
        },
        {
          n: "04",
          name: "Glue",
          job: "The other three, talking to each other.",
          points: [
            "What Optics finds missing becomes next week's post.",
            "Everything lands in one inbox where you approve it, edit it or bin it.",
            "Nothing goes out without your yes.",
          ],
          solves: "Three tools that do not know about each other is the actual problem.",
          state: "Next",
        },
      ],
    },
    dayTitle: "One week of your work, done",
    day: [
      { at: "Mon", p: "You ship a feature. He was watching you build it and the post about it is already drafted, in your voice, waiting for a yes." },
      { at: "Tue", p: "The same update, rewritten three ways for three places, because a Reddit post that reads like LinkedIn gets buried on Reddit." },
      { at: "Wed", p: "Twenty people who look like your buyers. Twenty messages, one per person, each mentioning the thing they actually did." },
      { at: "Thu", p: "“Who have we not heard back from?” Nine names, sorted by who is worth chasing, with the last thing each of them said." },
      { at: "Fri", p: "Somebody asks an AI for tools like yours. This week you are in the answer, because he spent the week making that true." },
      { at: "Sun", p: "“We said we would not do enterprise this quarter.” He is right, and you had forgotten you said it." },
    ],
    honest:
      "Foundry is Braino pointed at a company, on macOS, in the same private beta. Content, optics and outreach is what he does; handing work to coding agents and checking it comes to Foundry first and has not shipped. Nothing he writes goes anywhere until you say so.",
    cta: { label: "Talk to us about Foundry", to: "/contact" },
    state: "Runs on AffectiveOS \u00b7 For founders",
    accent: "#b8842a",
  },
  {
    key: "mesa",
    tab: "For Mesa",
    who: "For institutions",
    name: "Braino for Mesa School of Business",
    claim: "Mesa is a lot.",
    claimTail: "He makes it lighter.",
    painTitle: "The week a Mesa student has",
    pain: [
      "A case to read before tomorrow, an assignment due Friday, a session you half heard because you were thinking about the last one, and a group chat that is not a system.",
      "Everything about the week lives somewhere else. A portal, a PDF, somebody's photograph of a slide. None of it is in one place and none of it reminds you.",
      "You came here to build something. The evenings go on reconstructing what was already said this afternoon.",
    ],
    does: [
      {
        art: "/os-senses.jpg",
        h: "He sits through the session.",
        p: "Forty minutes written down while you listen, in the words that were actually used. You get to be in the room instead of typing in it, and the one who missed it reads what happened rather than a photograph of a slide.",
      },
      {
        art: "/os-voice.jpg",
        h: "He carries your week.",
        p: "What is due, what is next, what moved, from the school's own timetable and deadlines rather than one more thing for you to keep updated. Ask him the way you would ask a friend.",
      },
      {
        art: "/os-hands.jpg",
        h: "He reads the case with you.",
        p: "He is on the same page you are, so nothing gets pasted anywhere. What is the argument, what is the number that matters, what would the other side say. At one in the morning, which is when the reading happens.",
      },
      {
        art: "/os-memory.jpg",
        h: "He knows where you stand.",
        p: "Attendance, submissions, what is outstanding, answered when you ask instead of on Monday when the office opens. The school's own record, not a guess.",
      },
    ],
    dayTitle: "A week at Mesa with him",
    day: [
      { at: "Mon", p: "A session you were fully in, because you were not taking notes. They were waiting when you got out." },
      { at: "Tue", p: "“What is due this week and in what order?” Three things, the one that is due first at the top." },
      { at: "Wed", p: "A case at midnight. “What is he actually arguing, and where are the numbers?” He is reading it with you, not being handed it." },
      { at: "Thu", p: "You missed one. The notes are there, in the words used in the room, before anyone can screenshot a slide at you." },
      { at: "Fri", p: "“Am I short on attendance?” From the school's own record, at the moment you thought to ask." },
      { at: "Sun", p: "“What did we decide in the group on Wednesday?” He was there. You were also there, and you had forgotten." },
    ],
    honest:
      "This is the same Braino with a school's own timetable, attendance and deadlines connected to him: the institution's own memory, made answerable in the words a student would use. It is an arrangement with the school rather than something a student downloads, and it is live with Mesa School of Business.",
    cta: { label: "Bring him to your institution", to: "/contact" },
    state: "Runs on AffectiveOS \u00b7 Live with Mesa",
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
    q: "Are Braino, Foundry and the school one three products?",
    a: "One product, three models of it, the way a phone has models. The same Braino, the same brain, the same memory. Foundry is the model pointed at your company; the Mesa one is the model with a school's timetable, attendance and deadlines inside him.",
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

/* His footer, the one from his own site, with three corrections the new shape
   forces.
 *
 * Under the hood used to list Braino OS, Human Intelligence and Emotional
 * Intelligence as three things. They are one thing now and it is called
 * AffectiveOS, so the column names it once and links to where the company page
 * explains it.
 *
 * Read loses the knowledge base, which is internal.
 *
 * And every link here points at something that exists. The old first column
 * was anchors on the old landing page, which is not the front door any more,
 * so those anchors now name sections of this page. */
const FOOTER_COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    head: "Braino",
    links: [
      ["What he does", "/braino#what"],
      ["A normal day", "/braino#day"],
      ["Why not another AI tool", "/braino#faq"],
      ["Questions", "/braino#faq"],
      ["Get him", "/waitlist"],
    ],
  },
  {
    head: "The models",
    links: [
      ["Braino", "/braino"],
      ["Braino Foundry", "/braino?model=foundry"],
      ["For institutions", "/braino?model=mesa"],
      ["Braino Code", "/code"],
    ],
  },
  {
    head: "Under the hood",
    links: [
      ["AffectiveOS", "/#technology"],
      ["BrainoHERA", "/brainohera-teaser"],
      ["Meetings", "/meetings"],
    ],
  },
  {
    head: "Read",
    links: [
      ["Braino's journal", "/journal"],
      ["Changelog", "/changelog"],
      ["Founder's letter", "/founder-letter"],
      ["The questions page", "/questions"],
    ],
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
     store and nothing to look up. The url can name one, so /foundry can send
     somebody straight to his, and the address updates when the tab does. */
  const [params, setParams] = useSearchParams();
  const asked = MODELS.findIndex((m) => m.key === params.get("model"));
  const at = asked >= 0 ? asked : 0;
  const setAt = (next: number) => {
    const key = MODELS[next]?.key;
    if (!key) return;
    setParams(next === 0 ? {} : { model: key }, { replace: true });
  };
  const model = MODELS[at];

  /* Changing tab is a deliberate act, so what it changes to is shown at once.
     The reveal observer only ever sees what was on the page when it started,
     and a story that swapped underneath it stayed at opacity zero: the tab
     looked empty, which is exactly the bug. */
  useEffect(() => {
    root.current?.querySelectorAll<HTMLElement>(".bf-story .bf-reveal")
      .forEach((el) => el.classList.add("is-in"));
  }, [at, root]);

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
          <Link to="/braino" className="bf-logo">
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
            Speak.
            <b>Watch it happen.</b>
          </h1>
          <div className="bf-hero-row bf-reveal">
            <p className="bf-hero-one">
              The models are extraordinary now. They write the code, draft the mail, plan
              the trip. What none of them have is your machine: your screen, your files,
              your people, your Tuesday. Braino lives there, and that is the whole
              difference.
            </p>
            <div className="bf-hero-cta">
              <Link to="/waitlist" className="bf-cta">Ask for a seat</Link>
              <a href="#what" className="bf-cta bf-cta-ghost">See what he does</a>
            </div>
          </div>
        </div>
      </header>

      {/* ── Which model ─────────────────────────────────────────────────────
          One product, three models of it, the way a phone has models: same
          machine inside, pointed at a different life. The tabs change the
          story and never the thing, which is why each answers the same four
          questions: the day you have now, what he does about it, what a week
          looks like after, and what is true today. */}
      <div className="bf-switch" id="what">
        <div className="bf-wrap bf-switch-in">
          <p className="bf-switch-note">One Braino · Three models</p>
          <div className="bf-tabs" role="tablist" aria-label="Which model">
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
        </div>
      </div>

      <main className="bf-story">
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

        {/* What he actually holds. The cells above are capabilities; these are
            jobs, with the state of each said out loud, because a page that
            lists a planned engine beside a running one without saying which is
            which is a page that will be found out. */}
        {model.handles && (
          <section className="bf-sec bf-handles">
            <div className="bf-wrap">
              <div className="bf-sec-head bf-reveal">
                <p className="bf-kicker">What he handles</p>
                <h2>{model.handles.heading}</h2>
                <p className="bf-sec-note">{model.handles.note}</p>
              </div>
              <div className={"bf-jobs" + (model.handles.jobs.length > 3 ? " bf-jobs-4" : "")}>
                {model.handles.jobs.map((j) => (
                  <article className="bf-job bf-reveal" key={j.name}>
                    <div className="bf-job-top">
                      <span className="bf-job-n">{j.n}</span>
                      {/* Only when it is not working yet. A badge on everything
                          says nothing: if a thing is on this page and carries
                          no label, it works, and the label is a warning rather
                          than a status light. */}
                      {j.state !== "Running" && (
                        <span className={"bf-job-state is-" + j.state.toLowerCase()}>{j.state}</span>
                      )}
                    </div>
                    <h3>{j.name}</h3>
                    <p className="bf-job-line">{j.job}</p>
                    <ul className="bf-job-points">
                      {j.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                    {/* The reason somebody would want it, which is a different
                        sentence from what it is. */}
                    <p className="bf-job-solves"><i>So</i>{j.solves}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* And what that adds up to, hour by hour, which is the only proof a
            person can feel before they have used it. */}
        <section className="bf-sec bf-day" id="day">
          <div className="bf-wrap">
            <div className="bf-sec-head bf-reveal">
              <p className="bf-kicker">What changes</p>
              <h2>{model.dayTitle}</h2>
              {/* Where it all comes from, said once, here: the four things
                  AffectiveOS gives the Mac are the reason any of the hours
                  below are possible. */}
              <p className="bf-sec-note">
                All of it comes from AffectiveOS, which gives the Mac you already own four
                things it never had: eyes that see the screen you are on, ears that hold an
                hour, a voice you can interrupt, and a memory of you.
              </p>
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

      {/* His footer, as it is on his own site: the columns, then the level
          underneath them. The page ends on his own thing rather than on a
          second version of the company's. */}
      <footer className="braino-footer mario bf-game-mount">
        <nav className="bf-cols" aria-label="Footer">
          {FOOTER_COLUMNS.map((column) => (
            <div className="bf-col" key={column.head}>
              <div className="bf-col-head">{column.head}</div>
              {column.links.map(([label, to]) => (
                <Link key={label + to} to={to}>{label}</Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="bf-game-window">
          <div className="bf-baseline">
            <span className="bf-signoff">
              Braino is a product of Affective. He runs on AffectiveOS.
            </span>
            <span className="bf-legal">
              <Link to="/">Affective</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </span>
          </div>
          <BrainoFooterGame />
        </div>
      </footer>

    </div>
  );
}
