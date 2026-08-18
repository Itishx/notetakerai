import { Link } from "react-router-dom";
import "../styles/apple.css";
import "./braino-for-x.css";

/* ============================================================================
   /braino-for-x — the public page for the X engine.

   Distra is engine two of Braino Foundry, and X is the first surface it runs.
   This page argues for it in the Apple product-page language the rest of the
   site uses: what the problem actually is, what he does about it, and where
   the line is drawn on autonomy. The product surfaces themselves (/x, /x/setup,
   /x/voice) are black; this is the light page that explains them.

   Honest by construction: the site is a waitlist, this runs on the founder's
   own account first, and the page says so rather than implying a shipped SaaS.
   ============================================================================ */

const STEPS = [
  { n: "01", t: "Connect X", d: "One click through X's own screen. It is a key card, not your password, and you can cancel it from your X settings whenever you like." },
  { n: "02", t: "He reads 200 of your posts", d: "Twenty seconds. He pulls your history with how each post performed and works out how you actually write, so you never have to describe your own voice in a text box." },
  { n: "03", t: "You correct him", d: "He shows you what he found, in plain sentences. Where he is right, leave it. Where he is wrong, say so. What you write outranks what he guessed, on every post, forever." },
  { n: "04", t: "Pick your topics and your rhythm", d: "What you write about, how often, and the hours he is never allowed to post in." },
  { n: "05", t: "Set the leash", d: "Ask me everything, approve once, or run it. You can change it any day, and he drops back a level by himself if anything looks wrong." },
  { n: "06", t: "Then it is three taps a day", d: "He writes overnight from what you actually shipped. You wake up, approve or reject, close the laptop." },
];

const DOES = [
  { t: "Learns how you write", d: "Not a tone dropdown. Two hundred real posts, ranked by what worked, read for sentence rhythm, how you open, whether you joke and what kind, and the words you actually reuse." },
  { t: "Writes in the morning, from real work", d: "He reads what you built yesterday and turns it into drafts. You are never staring at an empty box wondering what to say." },
  { t: "Picks the hour", d: "From your own history, not a best-practice blog post. Your 9:15 is not somebody else's 9:00." },
  { t: "Refuses, out loud", d: "Near duplicates, quiet hours, daily caps, the kill switch. When he declines to post something he tells you which gate caught it and why." },
  { t: "Checks it landed", d: "He reads the post back off X after publishing and stores the permalink. Claiming to have posted is not the same as posting." },
  { t: "Tells you the truth weekly", d: "Which kind of post worked, which flopped, and what to do differently. Tied to your numbers, not to averages." },
];

const GATES = ["Anything that spends money", "Sending a DM", "Deleting anything", "Following or unfollowing", "Changing a price or a promise"];

export default function BrainoForX() {
  return (
    <div className="apple bfx">
      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Braino for X</span>
          <div className="an-links">
            <a href="#why">Why</a>
            <a href="#voice">Your voice</a>
            <a href="#setup">Setup</a>
            <a href="#control">Control</a>
            <Link to="/x" className="apple-cta">Open it</Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="bfx-wrap bfx-hero">
        <p className="bfx-kicker">Braino for X</p>
        <h1 className="bfx-h1">You built the thing.<br /><span className="tone">Now somebody has to say so.</span></h1>
        <p className="bfx-lede">
          Braino runs your X account the way a co-founder would. He learns how you write by
          reading you, drafts from what you actually shipped, posts at your hours, and shows you
          every decision he made, including the ones where he refused.
        </p>
        <div className="bfx-cta-row">
          <Link to="/x/setup" className="bfx-btn">Set it up</Link>
          <Link to="/x?demo" className="bfx-btn is-quiet">See the dashboard</Link>
        </div>
        <p className="bfx-fine">Free while Braino is in waitlist. Runs on the founder's own account first.</p>
      </header>

      {/* ── Why ──────────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="why">
        <p className="bfx-kicker">Why we built it</p>
        <h2 className="bfx-h2">Building got cheap. <span className="tone">Being seen did not.</span></h2>
        <p className="bfx-lede">
          Every funded company in this market sells you the building. Cursor, Lovable, all of them.
          Nobody sells you the being seen. So a founder ships something real on Tuesday and by
          Friday nobody has heard of it, and the reason is never the product. It is that posting
          consistently in your own voice is a job, and it is the seventh job you are already doing
          badly.
        </p>
        <div className="bfx-versus">
          <div>
            <b>What a scheduler does</b>
            <ul>
              <li>Posts what you already wrote</li>
              <li>At a time you picked</li>
              <li>In whatever voice you typed that day</li>
              <li>And tells you nothing afterwards</li>
            </ul>
          </div>
          <div className="is-on">
            <b>What Braino does</b>
            <ul>
              <li>Writes it, from work you actually did</li>
              <li>At the hour your own numbers say</li>
              <li>In the voice he learned by reading you</li>
              <li>Then tells you what worked and why</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Voice ────────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="voice">
        <p className="bfx-kicker">The part everyone else gets wrong</p>
        <h2 className="bfx-h2">Nobody can describe <span className="tone">their own voice.</span></h2>
        <p className="bfx-lede">
          Every tool asks you to fill in a box labelled brand tone. You type something like
          "friendly but professional" and get back writing that sounds like nobody. Braino does not
          ask. He reads two hundred of your posts, ranked by what actually performed, and works it
          out.
        </p>
        <div className="bfx-cards">
          <article>
            <span>He measures</span>
            <h3>How long your posts really are</h3>
            <p>
              Median length, how many run under eighty characters, how often you break lines. Numbers,
              not adjectives. Then he holds a floor, so you never get a four word post that says
              nothing. Length is a voice decision, not a limit.
            </p>
          </article>
          <article>
            <span>He reads</span>
            <h3>How you think, not just how you type</h3>
            <p>
              Whether you argue from experience or from a number. Whether you open with the conclusion
              or build to it. What you never do. He writes himself a set of rules from your own
              writing, and you can read them.
            </p>
          </article>
          <article>
            <span>You override</span>
            <h3>What he read is not the final word</h3>
            <p>
              He learned who you have been. You know who you are trying to be. Everything you tell him
              by hand outranks everything he inferred, permanently, and you can star your own posts
              and say "this one is exactly me".
            </p>
          </article>
        </div>
      </section>

      {/* ── The week ─────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec">
        <p className="bfx-kicker">The week has a shape</p>
        <h2 className="bfx-h2">Seven posts about seven things<br /><span className="tone">still read as seven opinions.</span></h2>
        <p className="bfx-lede">
          Topics say what a post is about. Nothing normally says what it is. So Braino rotates the
          shape of the writing across the week, and you decide the rotation.
        </p>
        <div className="bfx-week">
          {[
            ["Mon", "What I shipped"], ["Tue", "Teach something"], ["Wed", "An opinion"],
            ["Thu", "Something that happened"], ["Fri", "Numbers and receipts"],
            ["Sat", "Disagree with the room"], ["Sun", "Ask them"],
          ].map(([d, f]) => (
            <div key={d}><span>{d}</span><b>{f}</b></div>
          ))}
        </div>
      </section>

      {/* ── What he does ─────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec">
        <p className="bfx-kicker">What he actually does</p>
        <h2 className="bfx-h2">Six jobs, <span className="tone">every day.</span></h2>
        <div className="bfx-grid">
          {DOES.map((d) => (
            <div key={d.t}><b>{d.t}</b><p>{d.d}</p></div>
          ))}
        </div>
      </section>

      {/* ── Setup ────────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="setup">
        <p className="bfx-kicker">Setting it up</p>
        <h2 className="bfx-h2">Three minutes, <span className="tone">once.</span></h2>
        <ol className="bfx-steps">
          {STEPS.map((s) => (
            <li key={s.n}><i>{s.n}</i><div><b>{s.t}</b><p>{s.d}</p></div></li>
          ))}
        </ol>
        <div className="bfx-cta-row">
          <Link to="/x/setup" className="bfx-btn">Start setup</Link>
        </div>
      </section>

      {/* ── Control ──────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="control">
        <p className="bfx-kicker">Where the line is</p>
        <h2 className="bfx-h2">He decides how. <span className="tone">You decide whether.</span></h2>
        <p className="bfx-lede">
          Nobody should hand their account to an agent and walk away, and we are not asking anyone
          to. Three levels, set by you, changed any day. He drops back a level by himself if
          anything looks wrong.
        </p>
        <div className="bfx-levels">
          <div><b>Ask me everything</b><p>He writes. You approve every post.</p></div>
          <div className="is-on"><b>Approve once</b><p>You approve the post. He picks the hour, publishes, checks it landed, reports back.</p></div>
          <div><b>Run it</b><p>He fills the queue and publishes on his own schedule. You can veto anything in it.</p></div>
        </div>
        <p className="bfx-kicker" style={{ marginTop: 52 }}>He always stops and asks before these</p>
        <div className="bfx-gates">{GATES.map((g) => <span key={g}>{g}</span>)}</div>
      </section>

      {/* ── Honest ───────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec bfx-honest">
        <p className="bfx-kicker">The honest bit</p>
        <h2 className="bfx-h2 sm">What this does <span className="tone">not</span> do yet.</h2>
        <ul>
          <li><b>It will not make you go viral.</b> It makes you consistent, in your own voice, without the job feeling like a job. Those are different promises and only one of them is keepable.</li>
          <li><b>Impressions and follower attribution are not available.</b> They need a paid X API tier. Engagement counts and daily follower snapshots are real and live.</li>
          <li><b>Replies and conversation hunting are not built yet.</b> For a small account that is the bigger growth lever, and it is next.</li>
          <li><b>trybraino.com is a waitlist.</b> Braino for X runs on the founder's own account first. Distra's first customer is Braino.</li>
        </ul>
      </section>

      {/* ── Close ────────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-close">
        <h2 className="bfx-h1 sm">Let him read you.</h2>
        <p className="bfx-lede">One dollar, twenty seconds, once. Then see whether he got you right.</p>
        <div className="bfx-cta-row">
          <Link to="/x/setup" className="bfx-btn">Set up Braino for X</Link>
          <Link to="/x?demo" className="bfx-btn is-quiet">Look at the dashboard first</Link>
        </div>
      </section>

      <footer className="apple-foot">
        Braino for X is the first surface of Distra, the distribution engine of Braino Foundry.
        The full plan for every other platform is at <Link to="/distra">/distra</Link>. Platform
        pricing and limits were checked in August 2026 and all of them move.
      </footer>
    </div>
  );
}
