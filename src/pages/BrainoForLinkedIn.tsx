import { Link } from "react-router-dom";
import "../styles/apple.css";
import "./braino-for-x.css";
import "./braino-for-linkedin.css";

/* /braino-for-linkedin — the public page for the LinkedIn engine.
   Same structure as /braino-for-x, LinkedIn's blue and white instead of black.
   The argument differs in one important way: on X the post is the unit, on
   LinkedIn the comment is, and the page has to say so rather than selling
   automated posting as the growth story. */

const NUMBERS = [
  { n: "561%", l: "more reach from a founder's own profile than a company page" },
  { n: "8–15×", l: "the algorithmic weight of a comment versus a like" },
  { n: "70%", l: "of a post's reach is decided in the first 60 minutes" },
  { n: "13×", l: "engagement gap between a 3 second skim and a 60 second read" },
];

const STEPS = [
  { n: "01", t: "Connect LinkedIn", d: "One click. He gets exactly one permission: post on your behalf. He cannot read your feed, your messages or your connections, and you can revoke it whenever you like." },
  { n: "02", t: "Tell him how you talk", d: "On X he reads your history and works it out. LinkedIn does not let a member app read your own posts, so here you tell him, seeded from whatever your X setup already learned." },
  { n: "03", t: "Pick your topics and rhythm", d: "One post a day is the right answer on LinkedIn, and he will argue with you if you set it higher. Plus the hours he is never allowed to post in." },
  { n: "04", t: "Set the leash", d: "Tighter defaults than X on purpose. A restricted LinkedIn account costs a founder a year of business development." },
  { n: "05", t: "Then it is two things a day", d: "Approve the post he wrote. Paste one post you want to comment on and send what he drafts. Five minutes." },
];

export default function BrainoForLinkedIn() {
  return (
    <div className="apple bfx bfl">
      <nav className="apple-anchors">
        <div className="apple-anchors-inner">
          <span className="an-name">Braino for LinkedIn</span>
          <div className="an-links">
            <a href="#why">Why</a>
            <a href="#comments">Comments</a>
            <a href="#setup">Setup</a>
            <a href="#honest">Limits</a>
            <Link to="/linkedin" className="apple-cta">Open it</Link>
          </div>
        </div>
      </nav>

      <header className="bfx-wrap bfx-hero">
        <p className="bfx-kicker">Braino for LinkedIn</p>
        <h1 className="bfx-h1">The easiest room<br /><span className="tone">to grow in.</span></h1>
        <p className="bfx-lede">
          LinkedIn rewards showing up more than any other platform, and punishes cross-posting more
          than any other platform. Braino writes for this room specifically, posts it on your
          profile, and drafts the comments that actually grow you.
        </p>
        <div className="bfx-cta-row">
          <Link to="/linkedin/setup" className="bfx-btn">Set it up</Link>
          <Link to="/channels" className="bfx-btn is-quiet">All channels</Link>
        </div>
        <p className="bfx-fine">Runs on the official LinkedIn API only. No browser automation, ever, on this platform.</p>
      </header>

      {/* ── The numbers ──────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="why">
        <p className="bfx-kicker">Why LinkedIn is worth the effort</p>
        <h2 className="bfx-h2">Four numbers that decide <span className="tone">the whole strategy.</span></h2>
        <div className="bfl-numbers">
          {NUMBERS.map((x) => <div key={x.n}><b>{x.n}</b><p>{x.l}</p></div>)}
        </div>
        <p className="bfx-lede" style={{ marginTop: 34 }}>
          Read together they say something specific: post from your own profile, write something
          worth spending a minute on, be there in the first hour, and spend most of your effort in
          other people's comment sections rather than your own feed.
        </p>
      </section>

      {/* ── Comments ─────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="comments">
        <p className="bfx-kicker">The part that actually grows you</p>
        <h2 className="bfx-h2">Posting is not <span className="tone">the growth engine.</span></h2>
        <p className="bfx-lede">
          If you have four hundred followers, your post reaches four hundred people on a good day.
          A thoughtful comment on somebody with a hundred thousand reaches a slice of a hundred
          thousand. That is the whole game, and it is why most LinkedIn advice about posting
          cadence is beside the point.
        </p>
        <div className="bfx-versus">
          <div>
            <b>What that costs you today</b>
            <ul>
              <li>An hour of scrolling to find posts worth answering</li>
              <li>Then thinking of something that is not "great post"</li>
              <li>Ten times a day, every day</li>
              <li>So you do it for a week and stop</li>
            </ul>
          </div>
          <div className="is-on">
            <b>What Braino does</b>
            <ul>
              <li>You paste a post into the dashboard</li>
              <li>He writes three real comments in your voice</li>
              <li>One agrees and extends, one disagrees, one asks</li>
              <li>You copy the good one and send it</li>
            </ul>
          </div>
        </div>
        <p className="bfx-fine" style={{ marginTop: 26 }}>
          He never sends them himself. LinkedIn's comment API sits behind partner access we do not
          have, and an auto-posted comment reads like a bot to everyone including the author. The
          expensive part was never the click.
        </p>
      </section>

      {/* ── Writing for the room ─────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec">
        <p className="bfx-kicker">Same person, different room</p>
        <h2 className="bfx-h2">He does not cross-post <span className="tone">your X.</span></h2>
        <p className="bfx-lede">
          Identical text on both platforms is the clearest tell that an account is automated. X
          rewards the blunt line. LinkedIn rewards a hook on line one, a blank line, and 150 to 300
          words that earn the read. He keeps your thinking and your humour, and translates the form.
        </p>
        <div className="bfx-cards">
          <article>
            <span>Line one</span>
            <h3>The only line most people see</h3>
            <p>Before "see more" there is one line, and it has to earn the click on its own. No cliffhangers, no colon-and-list tease. Just the most interesting true thing you have.</p>
          </article>
          <article>
            <span>The middle</span>
            <h3>Worth a minute of someone's day</h3>
            <p>A 60 second read outperforms a 3 second skim by 13 times, because dwell time is what the ranking model rewards. Short paragraphs, real numbers, one idea properly finished.</p>
          </article>
          <article>
            <span>Banned</span>
            <h3>Everything LinkedIn is full of</h3>
            <p>"Thrilled to announce", "let that sink in", "agree?", one-word-per-line posts, hashtag stacks, and the story about the taxi driver who taught you about business.</p>
          </article>
        </div>
      </section>

      {/* ── Setup ────────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec" id="setup">
        <p className="bfx-kicker">Setting it up</p>
        <h2 className="bfx-h2">Three minutes, <span className="tone">once.</span></h2>
        <ol className="bfx-steps">
          {STEPS.map((s) => <li key={s.n}><i>{s.n}</i><div><b>{s.t}</b><p>{s.d}</p></div></li>)}
        </ol>
        <div className="bfx-cta-row"><Link to="/linkedin/setup" className="bfx-btn">Start setup</Link></div>
      </section>

      {/* ── Safety ───────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec">
        <p className="bfx-kicker">Not getting restricted</p>
        <h2 className="bfx-h2">The official API, <span className="tone">and nothing else.</span></h2>
        <p className="bfx-lede">
          LinkedIn's User Agreement prohibits third-party automation including headless browsers and
          detectable extensions. Roughly 40% of accounts using non-compliant tools were restricted
          between January and March 2026, and browser extensions carry around 60% higher detection
          risk because injected code is visible to their detectors.
        </p>
        <p className="bfx-lede" style={{ marginTop: 18 }}>
          Braino ships a browser extension. It will never touch LinkedIn. Every action here goes
          through the sanctioned member API, which is why some things on this page are marked as
          not available rather than quietly worked around.
        </p>
        <div className="bfx-gates">
          {["No connection requests", "No DMs", "No auto-commenting", "No likes or follows", "No browser automation"].map((g) => <span key={g}>{g}</span>)}
        </div>
      </section>

      {/* ── Honest ───────────────────────────────────────────────────── */}
      <section className="bfx-wrap bfx-sec bfx-honest" id="honest">
        <p className="bfx-kicker">The honest bit</p>
        <h2 className="bfx-h2 sm">What this does <span className="tone">not</span> do.</h2>
        <ul>
          <li><b>No analytics.</b> Reading your own LinkedIn posts needs Community Management access, which takes weeks to months and a registered entity. Until then the dashboard shows no follower count and no post performance, and says so rather than inventing numbers.</li>
          <li><b>No carousels.</b> Document posts are the best performing format on LinkedIn by a distance, and no API on earth can publish them. Everyone makes those by hand.</li>
          <li><b>No auto-commenting.</b> Same partner-access wall. He drafts, you send.</li>
          <li><b>No company pages.</b> Same wall again, and your personal profile outperforms the page by 561% anyway.</li>
          <li><b>trybraino.com is a waitlist.</b> This runs on the founder's own account first.</li>
        </ul>
      </section>

      <section className="bfx-wrap bfx-close">
        <h2 className="bfx-h1 sm">Show up every day.</h2>
        <p className="bfx-lede">Without it being a job you quietly stop doing after a week.</p>
        <div className="bfx-cta-row">
          <Link to="/linkedin/setup" className="bfx-btn">Set up Braino for LinkedIn</Link>
          <Link to="/braino-for-x" className="bfx-btn is-quiet">See the X engine</Link>
        </div>
      </section>

      <footer className="apple-foot">
        Braino for LinkedIn is the second surface of Distra, the distribution engine of Braino
        Foundry. The full plan for every platform is at <Link to="/braino?view=foundry#distra">Braino Foundry</Link>. LinkedIn
        limits, rates and approval requirements were checked in August 2026 and all of them move.
      </footer>
    </div>
  );
}
