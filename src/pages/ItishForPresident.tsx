import { useEffect, useRef, useState } from "react";
import BrainoWalker from "@/components/BrainoWalker";
import BrainoFooterGame from "@/components/BrainoFooterGame";
import "@/components/braino-footer.css";
import "./affective.css";
import "./itish-president.css";

/* ============================================================================
   /itish-for-president — the campaign page.

   One scroll: the ask, why me, the five minutes in full, and the game.

   It borrows the Affective page's design rather than inventing one, because
   the person running is the person who built that page. Same paper, same
   hairline grid with no gutters, same split of roles between the serif and
   the sans: the serif makes claims, the sans explains. Everything prefixed
   ifp- is the part Affective does not already have a shape for.

   The speech is printed exactly as it was written, Hinglish and all. A
   campaign letter that has been tidied into business English is a different
   person's campaign.
   ============================================================================ */

/* The five reasons, in the shape Affective gives its capabilities: a picture
   that fills the cell to the hairline, and the words indented under it. The
   pictures are not here yet, and a cell says so quietly rather than breaking:
   drop a file at each path below and the placeholder disappears. */
const WHY = [
  {
    h: "A people's person.",
    art: "/itish/why-1.jpg",
    body:
      "I am the friend people call at 2am for advice. Writix, the page I started after a heartbreak, has helped 15,000 people feel better. My audience calls me their unpaid therapist.",
  },
  {
    h: "A poet first.",
    art: "/itish/why-2.jpg",
    body:
      "Poets are deeply over-feelers anyway, so I read people and their emotions a little better than the rest. That is the moat. And from Shah Rukh Khan: whoever you are talking to, make them feel special.",
  },
  {
    h: "A risk-taker.",
    art: "/itish/why-3.jpg",
    body:
      "At 20, in the pre-AI era, I started a marketing agency. No article read, no idea what I was walking into. Bas ek chul thi, ki karna hai, toh kiya. I do not wait to be ready. I jump.",
  },
  {
    h: "Trusted with a team.",
    art: "/itish/why-4.jpg",
    body:
      "Seven friends, all of them 17 to 19, and I got the work done through the chaos. Non-trusting teens put their trust in a first-timer. Leadership is not a title, it is trust, and they gave me theirs.",
  },
  {
    h: "Nobody gets left behind.",
    art: "/itish/why-5.jpg",
    body:
      "Mesa throws us into the ocean with BYOB. I did that with my team, and I did not let them drown. It was a tough swim. We made it back together, which is the only version that counts.",
  },
];

/* The five minutes, printed. `lift` marks the two paragraphs that are said
   louder in the room, so the page can say them louder too without a single
   word of the speech being changed to get the emphasis. */
const SPEECH: { text: string; lift?: boolean }[] = [
  {
    text:
      "Hi, my name is Itish, Itish Pande. How many of you here have watched Chak De India or are at least familiar with the sattar minute reference? Team India had sattar minute to win. I have only 5 to convince you why I should be the first president of the first cohort of Forge. So let's lock in.",
  },
  {
    text:
      "One of the best realisations I had about myself as a kid was that I'm a people's person. When it comes to being around people, I'm a natural. Which means I've been the friend people call at 2am for advice. My writing page, Writix, which I started after a heartbreak, has helped 15,000 people feel better. My audience calls me their unpaid therapist, because before I was a founder, I'm a poet. And poets are deeply over-feelers anyway, so I tend to understand people and human emotions just a little bit better than the rest. That's my moat, as you could call it. And I learnt this from Shah Rukh Khan: that when you talk to someone, no matter who it is, make them feel special and important. And I believe being a poet makes it all the more effortless for me.",
  },
  {
    text:
      "At 20, in the pre-AI era, I started a marketing agency. No knowledge of how it works. Never read an article. No idea about clients asking for the 26th small change at 3am. Bas ek chul thi, ki karna hai, toh kiya. That's the risk-taker in me. I don't wait to be ready. I jump.",
  },
  {
    text:
      "I had a team of 7, all my friends. Of course, where else would I get unpaid interns from? Everyone was 17 to 19. We've all been teenagers, we know it's chaos. And I still got them to get the work done. The most beautiful part? Those non-trusting teens put their trust in me. Itish kuch bana raha hai, yeh humein lead karega. Uska khud first time tha, but maine kar liya. Because leadership isn't a title. It's trust. And they gave me theirs.",
  },
  {
    text:
      "Just like Mesa is throwing us into the ocean with BYOB, I did that with my team. We dove in and figured out how to swim. And just like Mesa won't let us drown, I didn't let them either. It was a tough swim, but we made it back. Because I don't leave my people behind.",
  },
  {
    text:
      "And I believe that's what you need too, right? Someone with the risk-taking appetite to dive in head first into the ocean, and lead you back to the shore. Or, when it gets dark, to lead you to the light at the other end of the tunnel.",
  },
  {
    text:
      "Look, let's leave the presidential race out of this for the next two minutes, and allow me to speak from the heart. My intention, regardless of whether I win or not, is simple. I'm here to make you win. I don't want to be the only one winning at the end of Forge. I want all of you to come with me, because I see that potential in each and every one of you, and it has blown my mind. This is the first time I've been around people who are so like-minded and so smart. And because I'm a people person, I have that knack to notice the little things about people. The talents, or well, their latents. My genuine wish, as a president or just as a person, is to help you realise that about yourself. I want it for each and every person sitting in this room today, just as much as I want it for myself, without a single shred of envy in this heart. It comes from the deepest place of love. Because aap jeetoge, toh main toh jeet hi jaunga.",
  },
  {
    lift: true,
    text:
      "So if you want a president who understands you like a poet, jumps in like a founder, leads with trust, and never lets anyone drown, then I'm your guy. Standing right here, telling you, Itish hai na, Itish sambhaal lega. Aapki khushi, aapka dard, aapki haar, aapki jeet. Har aise lamhe mein, agar aap peeche mudke dekhoge, toh aapko Itish aapke saath khada hua dikhega. In simple terms, I'm never going to give you up, never going to let you down",
  },
  {
    text:
      "And because I said I'll recognise your talents and help you shine, let me do it right now, because actions speak louder than words. Peter, my guy, can I have you on the stage please?",
  },
];

/* A picture that has not arrived yet says so, quietly, instead of leaving a
   broken frame in the middle of the argument. Verbatim behaviour from the
   Affective page, which is where the design comes from. */
function Shot({ art, label, className = "" }: { art: string; label: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <div className={`aff-four-art aff-rise ${className}`.trim()}>
      {missing
        ? <span className="aff-four-wait">{label}</span>
        : (
          <img
            src={art}
            alt=""
            width={341}
            height={415}
            loading="lazy"
            decoding="async"
            onError={() => setMissing(true)}
          />
        )}
    </div>
  );
}

/* Sections arrive rather than sit there, and they are visible at rest if the
   observer never runs: a page parked at opacity 0 waiting on JavaScript is how
   a campaign site ships looking empty. */
function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const els = root.current?.querySelectorAll<HTMLElement>(".aff-reveal");
    if (!els?.length) return;
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

export default function ItishForPresident() {
  const root = useReveal();
  /* Braino walks the bottom of the page the whole way down, and dances while
     the closing section is on screen. Same walker as everywhere else, so he
     can still be grabbed, flung and moonwalked at. */
  const [dancing, setDancing] = useState(false);
  const closing = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = closing.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([entry]) => setDancing(entry.isIntersecting),
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.title = "Itish for President";
    const prev = document.body.style.background;
    document.body.style.background = "#f4f2ec";
    return () => { document.body.style.background = prev; };
  }, []);

  return (
    <div className="aff ifp" ref={root}>
      <nav className="aff-nav is-tight">
        <div className="aff-nav-in">
          <a href="#top" className="ifp-logo">Itish</a>
          <div className="aff-nav-links">
            <a href="#why">Why me</a>
            <a href="#letter">The five minutes</a>
            <a href="#game">Braino</a>
          </div>
        </div>
      </nav>

      {/* ── The ask ────────────────────────────────────────────────────────
          Team India had seventy minutes. He has five. The clock is the whole
          hero, because the clock is how the speech opens in the room. */}
      <header className="aff-hero ifp-hero" id="top">
        <div className="aff-wrap">
          <div className="aff-hero-row aff-reveal">
            <h1 className="aff-h1 ifp-h1">
              <span className="aff-h1-line">Itish for President.</span>
              <b>First cohort. Forge.</b>
            </h1>
            <div className="aff-hero-side">
              <p className="aff-hero-one">
                Team India had sattar minute to win. I have five to convince you. So
                let's lock in.
              </p>
              <div className="aff-hero-cta">
                <a href="#why" className="aff-cta">Here's why me</a>
                <a href="#letter" className="aff-cta aff-cta-ghost">Read the five minutes</a>
              </div>
            </div>
          </div>
        </div>

        {/* The same honest strip Affective runs under its first claim: the
            facts of the thing, in one ink, before any persuading starts. */}
        <div className="aff-strip">
          <div className="aff-wrap aff-strip-in">
            <p className="aff-strip-label">What I am</p>
            <ul className="aff-strip-names">
              <li>Poet</li>
              <li>Founder</li>
              <li>People's person</li>
            </ul>
            <p className="aff-strip-note">In that order</p>
          </div>
        </div>
      </header>

      {/* ── The note ───────────────────────────────────────────────────────
          The one thing a campaign page is usually too polite to say: most of
          this room has already decided, and this page is not written for
          them. Said first, because saying it is the argument. */}
      <section className="aff-sec ifp-note-sec" id="note">
        <div className="aff-wrap">
          <div className="ifp-note aff-reveal">
            <p className="ifp-note-kicker">A note before I start</p>
            <p className="ifp-note-lead">
              Look, I know that despite all this campaigning, we are all loyal to someone.
            </p>
            <p>
              To ask you to vote for me when I know some of you have already made up your
              mind would be pointless. I am not going to do that.
            </p>
            <p className="ifp-note-punch">
              But there are those of you still on the fence. You are my ICP for this last
              attempt at campaigning. So here is why me.
            </p>
          </div>
        </div>
      </section>

      {/* ── Why me ─────────────────────────────────────────────────────────
          Five cells in one sheet: three across the top, two across the
          bottom, sharing every hairline. Same boxes as the senses. */}
      <section className="aff-sec" id="why">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">For the ones still on the fence</p>
            <h2>Here's why me.</h2>
            <p>
              Five things, none of them a promise. All five have already happened, and
              every one of them happened to somebody else before it happened to me.
            </p>
          </div>
        </div>

        <div className="aff-wrap">
          <div className="aff-grid ifp-five">
            {WHY.map((d, i) => (
              <article className="aff-four-item aff-reveal" key={d.h} style={{ transitionDelay: `${i * 90}ms` }}>
                <Shot art={d.art} label={d.h.replace(".", "")} />
                <div className="aff-four-say">
                  <h3>{d.h}</h3>
                  <p>{d.body}</p>
                </div>
              </article>
            ))}
          </div>
          <p className="ifp-five-foot aff-reveal">
            Understands you like a poet. Jumps in like a founder. Leads with trust.
          </p>
        </div>
      </section>

      {/* ── The letter ─────────────────────────────────────────────────────
          The speech itself, on paper, word for word. Hinglish kept, because
          the half of it that lands hardest is in Hinglish. */}
      <section className="aff-sec ifp-letter-sec" id="letter">
        <div className="aff-wrap">
          <div className="aff-sec-head aff-reveal">
            <p className="aff-sec-kicker">The five minutes, in full</p>
            <h2>What I said, exactly as I said it.</h2>
            <p>
              No tidying up afterwards. This is the speech, the way it was written to be
              spoken in that room.
            </p>
          </div>

          <article className="ifp-letter aff-reveal">
            <p className="ifp-letter-to">To the first cohort of Forge,</p>
            {SPEECH.map((p) => (
              <p key={p.text.slice(0, 42)} className={p.lift ? "ifp-letter-lift" : undefined}>
                {p.text}
              </p>
            ))}

            {/* The line before this one hands the stage over, so the page
                hands it over too: the clip runs here, where Peter walks up,
                rather than being filed somewhere as an attachment. */}
            <figure className="ifp-letter-film">
              <video
                src="/president-peter.mp4"
                controls
                playsInline
                preload="metadata"
                poster="/president-peter.jpg"
              />
              <figcaption>And then this happened.</figcaption>
            </figure>

            <p className="ifp-letter-sign">Itish Pande</p>
            <p className="ifp-letter-role">Running for President. First cohort, Forge.</p>
          </article>
        </div>
      </section>

      {/* ── The close ──────────────────────────────────────────────────────
          Where Braino stops walking and dances, because the page has stopped
          arguing. */}
      <section className="aff-sec ifp-close" ref={closing}>
        <div className="aff-wrap">
          <p className="ifp-close-line aff-reveal">
            Itish hai na. Itish sambhaal lega.
          </p>
          <p className="ifp-close-sub aff-reveal">
            Aap jeetoge, toh main toh jeet hi jaunga.
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────
          Braino's own footer game, dropped in as it is. Its styles live on
          .braino-footer, which carries the tokens it draws with, so it comes
          across inside that wrapper rather than being reimplemented here. */}
      <div className="braino-footer mario ifp-game-mount" id="game">
        <div className="bf-game-window">
          <div className="bf-baseline">
            <span className="bf-signoff">Itish for President · First cohort, Forge</span>
            <span className="bf-legal">Braino runs the footer. Arrow keys.</span>
          </div>
          <BrainoFooterGame />
        </div>
      </div>

      {/* He walks the bottom of the page, and dances at the close. */}
      <BrainoWalker dancing={dancing} />
    </div>
  );
}
