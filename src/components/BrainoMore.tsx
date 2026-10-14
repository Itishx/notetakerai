import { BrainoMascot } from "@/components/BrainoMascot";
import { NotchSheet } from "@/pages/aff-figures";

/* ============================================================================
   BrainoMore (2026-10-15): the three things the Braino page was missing.
   The app on your Mac, the personality that makes him someone, and the fun
   parts. Every line is something he does today, except movie night, which
   is marked experimental because it is.
   ============================================================================ */

/* ── The Braino app ── drawn from the real dashboard's pages. */
const NAV = ["Home", "Activity", "Memory", "Notes & meetings", "Habits", "Focus", "People", "Approvals", "Voice & listening", "Commands & modes"];

export function MacApp() {
  return (
    <section className="bm bm-app" id="app">
      <div className="aff-wrap">
        <p className="ah-kicker">The Braino app</p>
        <h2 className="aff-h1 bm-h">Everything he knows, <em>in one place.</em></h2>
        <p className="bm-lede">A home for Braino on your Mac. See what he did, read what he remembers, approve what he is about to do, and switch anything on or off.</p>
        <div className="bm-win aff-reveal" aria-label="The Braino app on a Mac" role="img">
          <div className="bm-win-bar"><span><i /><i /><i /></span>Braino</div>
          <div className="bm-win-in">
            <aside className="bm-side">
              <div className="bm-me"><BrainoMascot size={30} /><b>Braino</b></div>
              {NAV.map((n, i) => <span key={n} className={i === 0 ? "on" : ""}>{n}</span>)}
            </aside>
            <div className="bm-main">
              <p className="bm-hi">Good morning, Itish.</p>
              <div className="bm-grid">
                <div className="bm-card"><small>Next class</small><b>Venture Building</b><span>9:30 · Room 2</span><div className="bm-chips"><i>★ Riya</i><i>★ Arjun</i></div></div>
                <div className="bm-card"><small>Due soon</small><div className="bm-row"><b>Market sizing</b><span>Thu</span></div><div className="bm-row"><b>Venture deck</b><span>Fri</span></div></div>
                <div className="bm-card bm-wide"><small>Today, hour by hour</small>
                  <div className="bm-row"><b>9 am</b><span>Lecture notes, three key ideas saved</span></div>
                  <div className="bm-row"><b>11 am</b><span>Product sync, you promised the deck by Friday</span></div>
                  <div className="bm-row"><b>2 pm</b><span>Replied to Priya, sent to John</span></div>
                </div>
                <div className="bm-card"><small>Recent</small>
                  <div className="bm-row"><b>“Tell Riya I'm late”</b><span>1.2s</span></div>
                  <div className="bm-row"><b>“Play something calm”</b><span>0.8s</span></div>
                </div>
                <div className="bm-card"><small>Learn my day</small><div className="bm-tg"><span>On, kept on this Mac</span><i /></div><small style={{ marginTop: 12 }}>Hey Braino</small><div className="bm-tg"><span>Wake him by name</span><i /></div></div>
              </div>
            </div>
          </div>
        </div>
        <ul className="bm-points">
          <li><b>See your day</b>What he did, hour by hour.</li>
          <li><b>Read his memory</b>Everything he keeps, and delete any of it.</li>
          <li><b>Approve first</b>Anything that sends or spends waits here.</li>
          <li><b>Your rules</b>Voice, shortcuts, look, and what he can do.</li>
        </ul>
      </div>
    </section>
  );
}

/* ── His personality ── */
const TRAITS = [
  { k: "Warm", line: "Long day? I'll keep this short.", p: "He notices how you are, not just what you asked." },
  { k: "Funny", line: "I'd high five you, but I'm a brain.", p: "A sense of humour, used at the right moments." },
  { k: "Honest", line: "WhatsApp didn't open. Want me to try again?", p: "When something fails, he says so. No pretending." },
  { k: "Calm", line: "I'm right here when you need me.", p: "No pings, no nagging. He speaks when spoken to." },
];
const ENGINES = [
  { h: "Emotional Engine", p: "Reads the moment, whether you are venting, celebrating or stuck, and answers the way a friend would." },
  { h: "Memory Engine", p: "Keeps the things that matter about you, so you never start from zero." },
  { h: "Human Intelligence", p: "Thinks before he acts: what you meant, what could go wrong, what to ask first." },
  { h: "His voice", p: "A real voice of his own. He says only as much as he needs to." },
];

export function Personality() {
  return (
    <section className="bm bm-soul">
      <div className="aff-wrap">
        <p className="ah-kicker">What sets him apart</p>
        <h2 className="aff-h1 bm-h">Not just smart. <em>Someone.</em></h2>
        <p className="bm-lede">Most AI is a very clever search box. Braino was written like a character: warm, honest, a little funny, and always on your side.</p>
        <div className="bm-traits">
          {TRAITS.map((t) => (
            <div key={t.k} className="bm-trait aff-reveal">
              <small>{t.k}</small>
              <div className="bm-say"><span className="bm-eyes" aria-hidden="true"><i /><i /></span>{t.line}</div>
              <p>{t.p}</p>
            </div>
          ))}
        </div>
        <div className="bm-engines aff-reveal">
          <p className="bm-engines-k">How he was made</p>
          <h3>Not one giant prompt. <em>A set of engines,</em> each doing one job well.</h3>
          <ol>{ENGINES.map((e, i) => <li key={e.h}><span>{String(i + 1).padStart(2, "0")}</span><b>{e.h}</b><p>{e.p}</p></li>)}</ol>
        </div>
      </div>
    </section>
  );
}

/* ── The fun parts ── */
export function FunParts() {
  return (
    <section className="bm bm-fun">
      <div className="aff-wrap">
        <p className="ah-kicker">The fun parts</p>
        <h2 className="aff-h1 bm-h">He's also <em>a lot of fun.</em></h2>
        <div className="bm-fun-grid">
          <div className="bm-tile bm-moon aff-reveal">
            <div className="bm-stage"><div className="bm-floor" /><span className="bm-note">♪</span><span className="bm-note n2">♫</span><div className="bm-walker"><BrainoMascot size={84} /></div></div>
            <h3>He moonwalks</h3><p>Ask him to moonwalk. He will, to Billie Jean.</p>
          </div>
          <div className="bm-tile bm-dance aff-reveal">
            <div className="bm-stage bm-disco"><div className="bm-dancer"><BrainoMascot size={84} /></div></div>
            <h3>He dances</h3><p>Say “dance”. He has moves.</p>
          </div>
          <div className="bm-tile bm-glow aff-reveal">
            <div className="bm-stage bm-mac"><div className="bm-mac-screen"><div className="bm-mac-notch"><span className="bm-eq">{Array.from({ length: 7 }).map((_, i) => <i key={i} style={{ animationDelay: `${i * 90}ms` }} />)}</span></div></div></div>
            <h3>Music lights him up</h3><p>Play a song and your notch glows and moves to the beat.</p>
          </div>
          <div className="bm-tile bm-notch aff-reveal">
            <div className="bm-stage bm-notch-stage"><NotchSheet className="ns-glow bm-live-notch" done={false} label="Braino">On it. Opening Spotify.</NotchSheet></div>
            <h3>A notch that's alive</h3><p>It opens when he listens, shows his work, and folds away when he's done.</p>
          </div>
          <div className="bm-tile bm-movie aff-reveal">
            <span className="bm-exp">Experimental</span>
            <div className="bm-stage bm-screen-dark">
              <div className="bm-film" />
              <p className="bm-sub">“Everyone keeps telling me how my story is supposed to go.”</p>
              <div className="bm-react"><BrainoMascot size={40} /><span>Okay, this scene. No spoilers, but hold on.</span></div>
            </div>
            <h3>Movie night with Braino</h3><p>We watched Spider-Man: Across the Spider-Verse with him. He followed the scenes, answered questions, and never spoiled a thing.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
