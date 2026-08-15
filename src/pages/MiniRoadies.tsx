import { useEffect, useRef, useState } from "react";
import BrainoWalker from "@/components/BrainoWalker";
import "./mini-roadies.css";

/* ============================================================================
   /n — "Mini Roadies Task". The kinetic film that used to sit on this route is
   parked (it now lives at /n/film) with a note on the page saying it's saved
   for the 22nd. The route is the letter itself, verbatim, set as a Medium-style
   editorial piece in the film's palette.

   Every string below is the author's text, unedited. The layout is the only
   thing this file adds: an editorial column, the scored sections as a
   scorecard, and one button — "make the letter come to life" — that lights the
   perimeter of the screen, walks the real Braino in along the bottom, and
   starts the song.
   ============================================================================ */

/* Drop the track at public/n-song.mp3 and it plays; until it's there the page
   falls back to the film's own track so the button still does something. */
const SONG_CANDIDATES = ["/n-song.mp3", "/she-needs-him.mp3"];

const OPENER =
  "Hi. I’m the highest I’ve ever been. Level 15. In fact, I’ve never been high enough before to even be able to articulate the understanding or the LAVALS of the highness I’ve been blessed with always, but ten drops of whatever angelic prashad that is, will get you here.";

const BEAT = "Point being Mayo House";

const INTRO =
  "— I’m also at the highest level of emotional clarity powered by the ItishOS so I wrote my basic analysis of our compatibility but purely from my perspective of if we would make a good fit. I’m just sending it dude because the actual roadies task we can do face to face but this is my mini version of that.";

const LEGEND: { k: string; v: string }[] = [
  {
    k: "before E",
    v: "is you (from what I think of you: honest assessment no because of your hold or whatever rational emotionless ranking)",
  },
  { k: "after E", v: "is me" },
];

type Item = { id: string; nav: string; title: string; you?: string; me?: string; note?: string; body?: string[]; aside?: string; shimmerWord?: string };

const ITEMS: Item[] = [
  { id: "hot", nav: "Hot", title: "Hot people dating hot people", you: "12", me: "10", note: "(10/10)" },
  {
    id: "backchodi",
    nav: "Backchodi",
    title: "Backchodi compatible factor",
    you: "10",
    me: "15",
    note: "(I’m just more. I’m a madman, 10/10 regardless) (prove me wrong)",
  },
  {
    id: "ei",
    nav: "EI",
    title: "Emotional intelligence",
    you: "10",
    me: "10",
    note: "(you’re a literal psychologist koi shak kar ke dikhaye)",
  },
  {
    id: "ambition",
    nav: "Ambition",
    title: "Ambition",
    body: [
      "You’re so busy you need a break. And same. So I feel career wise, straight up power couple potential.",
    ],
  },
  {
    id: "adult",
    nav: "Adult",
    title: "Adult stuff",
    body: [
      "Yep still on my fucking knees. I’m sorry to bring this up but I have to but I’m toh genuinely baffled by the ex who kept you waiting a month, was he gay? As a man I don’t claim him bro sorry straight up but gotta tell you it just BAFFLED THE FUCK OUT OF ME WHEN YOU TOLD ME it bugs me every time ki UNFUCKINGBELIEVABLE. Kya tha woh haath mein sona ho aur bheek mangte hai Akshay Kumar meme same dude. Sorry but w me, i out of respect for you just can’t seem to number it, but coughs, these days im a man of execution so actions speak louder than words im so sorry but 😂😂😂😭😭😭😭😭🫣",
    ],
  },
  {
    id: "adult-2",
    nav: "Adult II",
    title: "Adult stuff, part 2",
    shimmerWord: "Check.",
    body: [
      "of course that section has to be the longest but no that’s because I ranted but if to keep it short. Check.",
    ],
  },
  {
    id: "values",
    nav: "Values",
    title: "Values",
    body: [
      "Mostly I feel match hai. Apan hi match hai re Lawrence and Mayo house — universe ne hi dikhaya and it just feels like it has stuck now. Call it my way of.. ahem.. subconscious manifesting. Now usually people don’t know subconscious but because I’m at a dangerous level of emotional clarity in general and also right fucking now, I just know it’s there. And I’m keeping it there— for the windows of my heart have no problem when the breeze in question is you",
    ],
  },
  {
    id: "rizz",
    nav: "Rizz",
    title: "Last neeche rizz",
    body: [
      "sorry to overstep how can a woman not fall in love with a man like me bro I would fall in love with me dude I’m so extreme. And I happen to be a poet so like double lottery lagi hai meri yaar",
    ],
    aside: "(apni bhi lagwale)",
  },
];

/* the anchor rail in the header — the letter's own table of contents */
const ANCHORS = [
  { id: "letter", nav: "Letter" },
  { id: "key", nav: "The key" },
  ...ITEMS.map((it) => ({ id: it.id, nav: it.nav })),
  { id: "photos", nav: "Photos" },
  { id: "invite", nav: "The 22nd" },
];

const CLOSE =
  "I just also feel, for the second time, we’ve stumbled paths, in a decade — the same way we did before: started by me randomly drunk / emo texting you and you reacting well to it — especially right now when I had no fucking plans of even wanting to like someone and who did the universe just choose? The endgame potential woman bro Seedha straight up you aise bhi nahi koi from scratch new na bhai Seedha 8 year old target hit kar diya behenchod universe firki leta meri ";

/* the last clause carries the whole letter, so it gets italics */
const CLOSE_EM = "but I’m not complaining";

/* Three polaroids at the bottom of the letter, reading straight out of
   public/. Each slot tries a few spellings because phone exports land as .JPG
   as often as .jpg — first one that loads wins, and a slot with nothing behind
   it stays an empty polaroid rather than a broken image. */
const PHOTOS = [
  ["/n1.JPG", "/n1.jpg", "/n1.jpeg", "/n1.png", "/n.JPG", "/n.jpg"],
  ["/n2.JPG", "/n2.jpg", "/n2.jpeg", "/n2.png"],
  ["/n3.JPG", "/n3.jpg", "/n3.jpeg", "/n3.png"],
];

function Polaroid({ srcs, n }: { srcs: string[]; n: number }) {
  const [tried, setTried] = useState(0);
  // the window takes the photo's own aspect once it loads (phone shots come in
  // portrait as often as landscape) so nothing ever gets cropped to fit
  const [ratio, setRatio] = useState<number | null>(null);
  const dead = tried >= srcs.length;
  return (
    <figure className={`mr-pola${dead ? " is-empty" : ""}`}>
      <div className="mr-pola-win" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
        {dead ? (
          <span className="mr-pola-slot">photo {n}</span>
        ) : (
          <img
            src={srcs[tried]}
            alt=""
            onError={() => setTried((t) => t + 1)}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
            }}
          />
        )}
      </div>
      <figcaption className="mr-pola-chin" />
    </figure>
  );
}


/* ---------------------------------------------------------------------------
   The gate. The letter does not open on its own: one question stands in front
   of it, and only the person it was written for can finish the phrase. The
   answer lives in the Values section ("Apan hi match hai re Lawrence and Mayo
   house"), so the question is that same phrase with its two names taken out.

   Spelling is deliberately forgiving. Nobody spells Lawrence the same way
   twice, and a letter should not bounce someone for a missing "w". Mayo is the
   half that has to be right, because Mayo is the half that means something.
   --------------------------------------------------------------------------- */

const norm = (v: string) => v.toLowerCase().replace(/[^a-z]/g, "");

// plain Levenshtein, small strings only
function dist(a: string, b: string) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const isLawrence = (v: string) => {
  const t = norm(v);
  if (!t) return false;
  return dist(t, "lawrence") <= 3 || /^(law|lau|lor|lar)/.test(t);
};
const isMayo = (v: string) => {
  const t = norm(v);
  return !!t && dist(t, "mayo") <= 1;
};

/* Both names may land in either box (or both in the first, if someone types the
   whole phrase into it), so the check reads the pair as one answer. */
function opensTheLetter(first: string, second: string) {
  const words = `${first} ${second}`.split(/[^A-Za-z]+/).filter(Boolean);
  return words.some(isMayo) && words.some(isLawrence);
}

function Gate({ onOpen }: { onOpen: () => void }) {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [wrong, setWrong] = useState(false);
  const firstRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (opensTheLetter(first, second)) { onOpen(); return; }
    setWrong(true);
    window.setTimeout(() => setWrong(false), 700);
  };

  return (
    <div className="mr mr-gate-page">
      <div className="mr-glow" aria-hidden="true" />
      <form className={`mr-gate${wrong ? " is-wrong" : ""}`} onSubmit={submit}>
        <div className="mr-gate-eyebrow">one question</div>
        <h1 className="mr-gate-h">Complete the following</h1>

        <div className="mr-gate-line">
          <input
            ref={firstRef}
            className="mr-blank"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            aria-label="first word"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="mr-gate-and">and</span>
          <input
            className="mr-blank"
            value={second}
            onChange={(e) => setSecond(e.target.value)}
            aria-label="second word"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="mr-gate-fixed">house</span>
        </div>

        <button className="mr-gate-btn" type="submit">
          <span className="dot" />
          open the letter
        </button>
        <p className="mr-gate-foot">{wrong ? "not it. you know this one." : "if this is for you, you already know."}</p>
      </form>
    </div>
  );
}

/* The index, built the way the site's "GO ANYWHERE" block is built: every row
   is a rule with the name pinned to one edge and its chapter to the other. No
   stacking, no centring. Used by both the masthead menu and the footer. */
function ChapterList({ active, onPick }: { active?: string; onPick?: () => void }) {
  return (
    <div className="mr-chapters">
      {ANCHORS.map((a, i) => (
        <a
          key={a.id}
          href={`#${a.id}`}
          className={`mr-chapter${active === a.id ? " is-on" : ""}`}
          onClick={onPick}
        >
          <span className="mr-chapter-name">{a.nav}</span>
          <span className="mr-chapter-no">Chapter {String(i + 1).padStart(2, "0")}</span>
        </a>
      ))}
    </div>
  );
}

/* Light up one word inside a paragraph without touching the author's string:
   the copy stays verbatim in ITEMS, the shimmer is applied at render. */
function withShimmer(text: string, word?: string) {
  if (!word) return text;
  const at = text.indexOf(word);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="mr-shimmer">{word}</span>
      {text.slice(at + word.length)}
    </>
  );
}

/* ---------------------------------------------------------------------------
   The ask. The film that used to close the page is parked at /n/film; what
   closes it now is the actual question, with a Yes she cannot catch and a No
   that refuses itself. The Yes button leaves the layout on first approach and
   goes anywhere on screen, so there is no corner to trap it in.
   --------------------------------------------------------------------------- */
/* The message she gets the moment she says yes. Author's words. */
const YES_NOTE =
  "I’m telling you right now, almost a week before: keep your entire day free. I do not care how busy you are. Keep it free. No curfew please. No curfew please, 25 ho abhi se bol lo kuch important kaam hai, busy rahungi bahar rahungi. And then I leave for Bangalore dude, so maximum time possible, because that’s the only way I like it.";

/* He runs, but not forever. Four dodges is enough of a bit: after that he gives
   up, walks back to his place in the card, turns red and lets her catch him. */
const DODGE_LIMIT = 4;

function Invite() {
  const [yesAt, setYesAt] = useState<{ x: number; y: number } | null>(null);
  const [dodges, setDodges] = useState(0);
  const [said, setSaid] = useState(false);
  const [noOpen, setNoOpen] = useState(false);
  const yesRef = useRef<HTMLButtonElement | null>(null);
  const caught = dodges >= DODGE_LIMIT;

  const flee = () => {
    if (caught) return;
    const nextCount = dodges + 1;
    setDodges(nextCount);
    if (nextCount >= DODGE_LIMIT) { setYesAt(null); return; } // gives up, comes home
    const el = yesRef.current;
    const w = el?.offsetWidth || 120;
    const h = el?.offsetHeight || 48;
    const pad = 16;
    const maxX = Math.max(pad, window.innerWidth - w - pad);
    const maxY = Math.max(pad, window.innerHeight - h - pad);
    // keep hopping until the new spot is a real distance from the old one, so it
    // never "runs away" two pixels and sits back down under the cursor
    const from = yesAt || (el ? { x: el.getBoundingClientRect().left, y: el.getBoundingClientRect().top } : null);
    let next = { x: pad, y: pad };
    for (let i = 0; i < 12; i++) {
      next = { x: pad + Math.random() * (maxX - pad), y: pad + Math.random() * (maxY - pad) };
      if (!from) break;
      if (Math.hypot(next.x - from.x, next.y - from.y) > Math.min(window.innerWidth, window.innerHeight) * 0.35) break;
    }
    setYesAt(next);
  };

  if (said) {
    return (
      <section className="mr-invite is-said" id="invite">
        <p className="mr-invite-eyebrow">Unplugged Collective</p>
        <h2 className="mr-invite-q">See you on the 22nd.</h2>
        <p className="mr-invite-note">{YES_NOTE}</p>
      </section>
    );
  }

  return (
    <section className="mr-invite" id="invite">
      <p className="mr-invite-eyebrow">The 22nd</p>
      <h2 className="mr-invite-q">Would you like to come to Unplugged Collective with me?</h2>
      <p className="mr-invite-sub">For the sake of it, just try clicking on No for once.</p>

      <div className="mr-invite-btns">
          <button
            ref={yesRef}
            type="button"
            className={`mr-yes${yesAt ? " is-loose" : ""}${caught ? " is-caught" : ""}`}
            style={yesAt ? { left: `${yesAt.x}px`, top: `${yesAt.y}px` } : undefined}
            onMouseEnter={caught ? undefined : flee}
            onPointerDown={caught ? undefined : (e) => { e.preventDefault(); flee(); }}
            onTouchStart={caught ? undefined : (e) => { e.preventDefault(); flee(); }}
            onFocus={caught ? undefined : flee}
            onClick={() => { if (caught) setSaid(true); }}
          >
            Yes
          </button>

          <button
            type="button"
            className={`mr-no${noOpen ? " is-open" : ""}`}
            onClick={() => setNoOpen(true)}
          >
          <span className="mr-no-word">No</span>
          <span className="mr-no-more"><span>, not an option</span></span>
        </button>
      </div>
    </section>
  );
}

export default function MiniRoadies() {
  // Once she has answered, she should not have to answer again on every scroll
  // back or refresh. Session-scoped: closing the tab re-arms the gate.
  const [unlocked, setUnlocked] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem("mr-open") === "1",
  );
  const [alive, setAlive] = useState(false);
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState("letter");
  const [openNotch, setOpenNotch] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const polaRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // one card per press, so the arrows always land on a snap point
  const scrollPolas = (dir: number) => {
    const track = polaRef.current;
    if (!track) return;
    const card = track.querySelector(".mr-pola") as HTMLElement | null;
    const stride = card ? card.offsetWidth + 26 : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * stride, behavior: "smooth" });
  };

  // personal page, not a marketing one — keep it out of search results
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    const prevTitle = document.title;
    document.title = "Mini Roadies Task";
    return () => {
      meta.remove();
      document.title = prevTitle;
    };
  }, []);

  // light up whichever section is currently under the header
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit?.target.id) setActive(hit.target.id);
      },
      { rootMargin: "-140px 0px -62% 0px", threshold: 0 },
    );
    ANCHORS.forEach((a) => {
      const el = document.getElementById(a.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [unlocked]);

  /* The perimeter disco. Verbatim port of the Mac's light show
     (braino-mac.js lightShowFrame): a hue that free-runs at 14 deg/sec and
     JUMPS 34 to 74 degrees on every beat, plus a flash that spikes on the beat
     and decays at 2.6/sec, the beat itself wobbling around 118bpm. Same
     numbers, so the letter strobes the way the MacBook does when he puts the
     headphones on, instead of the flat white edge it had. */
  useEffect(() => {
    const el = rootRef.current;
    if (!alive || !el) return;
    let raf = 0;
    let last = 0;
    let hue = 12;
    let flash = 0;
    let nextBeatAt = performance.now() + 200;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;

      if (now >= nextBeatAt) {
        const bpm = 118 + Math.sin(now / 5000) * 8;
        nextBeatAt = now + (60000 / bpm) * (0.92 + Math.random() * 0.16);
        flash = Math.min(1, flash + 0.75);
        hue = (hue + 34 + Math.random() * 40) % 360;
      }
      hue = (hue + dt * 14) % 360;
      flash = Math.max(0, flash - dt * 2.6);

      el.style.setProperty("--music-hue", String(Math.round(hue)));
      el.style.setProperty("--music-flash", flash.toFixed(3));
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      el.style.removeProperty("--music-hue");
      el.style.removeProperty("--music-flash");
    };
  }, [alive]);

  // Walk the candidate list until one actually loads. A 404 makes play() reject
  // in some browsers and quietly RESOLVE in others, which is why this went
  // silent: it "succeeded" on a file that was not there and never reached the
  // fallback. Ask the server first, then play.
  const play = async () => {
    const el = audioRef.current;
    if (!el) return;
    for (const src of SONG_CANDIDATES) {
      try {
        const head = await fetch(src, { method: "HEAD" });
        if (!head.ok) continue;
      } catch {
        continue; // not reachable — next candidate
      }
      try {
        el.src = src;
        el.loop = true;
        el.volume = 0.85;
        el.load();
        await el.play();
        return;
      } catch {
        /* blocked or undecodable — try the next one */
      }
    }
  };

  const toggle = () => {
    const next = !alive;
    setAlive(next);
    if (next) void play();
    else audioRef.current?.pause();
  };

  useEffect(() => () => audioRef.current?.pause(), []);

  if (!unlocked) {
    return (
      <Gate
        onOpen={() => {
          try { sessionStorage.setItem("mr-open", "1"); } catch { /* private mode — gate just re-asks */ }
          setUnlocked(true);
        }}
      />
    );
  }

  return (
    <div ref={rootRef} className={`mr${alive ? " is-alive" : ""}${dark ? " is-dark" : ""}`}>
      <div className="mr-glow" aria-hidden="true" />

      {/* Masthead, built like the Creatish article bar: the name sits dead
          centre, everything functional is pushed out to the two edges, and the
          section list drops from the chevron instead of crowding the line. */}
      <header className={`mr-mast${openNotch ? " is-open" : ""}`}>
        <div className="mr-mast-bar">
          <div className="mr-mast-left" />

          <button
            className="mr-mast-name"
            onClick={() => setOpenNotch((o) => !o)}
            aria-expanded={openNotch}
          >
            Lawrence and Mayo House
            <span className={`mr-mast-chev${openNotch ? " is-open" : ""}`} aria-hidden="true">⌄</span>
          </button>

          <div className="mr-mast-right">
            <button
              className="mr-theme"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "switch to light" : "switch to dark"}
              title={dark ? "light" : "dark"}
            >
              {dark ? (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4.2" />
                  <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.5 14.5A8.6 8.6 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11Z" />
                </svg>
              )}
            </button>
            <a className="mr-mast-link" href="#invite">The 22nd</a>
            <span className="mr-mast-avatar" aria-hidden="true">N</span>
          </div>
        </div>

        <nav className="mr-mast-menu" aria-label="sections">
          <div className="mr-mast-menu-inner">
            <div className="mr-chapters-eyebrow">Go anywhere</div>
            <ChapterList active={active} onPick={() => setOpenNotch(false)} />
          </div>
        </nav>
      </header>

      <article className="mr-article">
        <header className="mr-head" id="letter">
          <div className="mr-eyebrow">Level 15</div>
          <h1 className="mr-title">Mini Roadies Task</h1>
          <div className="mr-rule" />
          <div className="mr-alive-wrap">
            <button className="mr-alive-btn" onClick={toggle}>
              <span className="dot" />
              {alive ? "let the letter rest" : "make the letter come to life"}
            </button>
          </div>
        </header>

        <p className="mr-opener">{OPENER}</p>
        <p className="mr-beat">{BEAT}</p>
        <p>{INTRO}</p>

        <div className="mr-legend" id="key">
          {LEGEND.map((row) => (
            <div className="mr-legend-row" key={row.k}>
              <span className="mr-legend-k">{row.k}</span>
              <span className="mr-legend-v">{row.v}</span>
            </div>
          ))}
        </div>

        <ol className="mr-scores">
          {ITEMS.map((it) => (
            <li className="mr-item" key={it.title} id={it.id}>
              <h2 className="mr-item-h">{it.title}</h2>
              {it.you && (
                <div className="mr-score">
                  <span className="mr-shimmer">{it.you}</span>
                  <span className="e">E</span>
                  <span className="mr-shimmer">{it.me}</span>
                </div>
              )}
              {it.note && <p className="mr-note">{it.note}</p>}
              {it.body?.map((p, i) => (
                <p key={i}>{withShimmer(p, it.shimmerWord)}</p>
              ))}
              {it.aside && <p className="mr-aside">{it.aside}</p>}
            </li>
          ))}
        </ol>

        <p className="mr-close">
          {CLOSE}
          <mark className="mr-mark">
            {CLOSE_EM}
            <span className="mr-mark-tag" aria-hidden="true">Top highlight</span>
          </mark>
        </p>

        <section className="mr-gal" id="photos">
          <div className="mr-gal-head">
            <div className="mr-chapters-eyebrow">The evidence</div>
            <div className="mr-gal-arrows">
              <button onClick={() => scrollPolas(-1)} aria-label="previous photo">‹</button>
              <button onClick={() => scrollPolas(1)} aria-label="next photo">›</button>
            </div>
          </div>
          <div className="mr-polas" ref={polaRef}>
            {PHOTOS.map((srcs, i) => (
              <Polaroid key={srcs[0]} srcs={srcs} n={i + 1} />
            ))}
          </div>
        </section>

        <Invite />
      </article>

      {alive && <BrainoWalker dancing />}
      <audio ref={audioRef} preload="none" />
    </div>
  );
}
