import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import "./home.css";

// An honest, founder-voice page on why the agent is sometimes slow / imperfect. Linked from Home.
export default function StraightTalk() {
  return (
    <div className="home">
      <Navbar />

      <article className="home-article">
        {/* ── Hero ── */}
        <section className="home-hero">
          <div className="home-kicker">Straight talk · no excuses</div>
          <h1 className="home-h1">Why Braino is sometimes slow — and why I won't lie to you about it</h1>
          <p className="home-lede">
            You're going to ask Braino to do something, and sometimes he'll take his time, or fumble
            it. I could hide that behind a spinner and a clean marketing line. I'm not going to.
            Here's the actual truth, the way I'd tell a friend.
          </p>
        </section>

        {/* ── Just say it ── */}
        <section className="home-section">
          <div className="home-eyebrow">Let me just say it</div>
          <h2 className="home-h2">Sometimes he's slow. Sometimes he gets it wrong.</h2>
          <p className="home-body">
            Look, I'll be honest with you. Sometimes Braino is slow. Sometimes you tell him to do
            something on a website and he picks the wrong thing. I'm not going to pretend that
            doesn't happen — you'd notice anyway, and I'd rather you hear it straight from me than
            feel like you were sold a lie.
          </p>
          <p className="home-body">
            So let me actually explain <em>why</em>. Not as an excuse — as a map. So you know exactly
            what you're using, and exactly what I'm fighting.
          </p>
        </section>

        {/* ── The two ways ── */}
        <section className="home-section">
          <div className="home-eyebrow">The thing nobody tells you</div>
          <h2 className="home-h2">There are only two ways to do this. That's it. Two.</h2>
          <p className="home-body">
            The first way is how the giants do it — OpenAI, Google, Anthropic. Their agents take a
            screenshot of the screen — basically a photo — and a vision model stares at that photo
            and goes "okay, click here." Then it takes another photo. Then another. It works on
            almost anything, but it is <em>slow</em>, and it is <em>expensive</em>. Every single
            step is a heavy photo plus a heavy AI looking at it. That adds up fast, and it costs a
            fortune to run.
          </p>
          <p className="home-body">
            The second way — the way Braino works — is to actually <em>read</em> the page instead of
            photographing it. The buttons, the links, the structure underneath. No photos. Just read
            it and act. It's fast, it's cheap, and on a normal page it's honestly great. But
            sometimes a page is messy, or built strangely — Google Maps is basically a video game,
            not a webpage — and Braino reads it wrong and clicks the wrong thing.
          </p>
          <p className="home-body">
            Both ways are flawed. There is no magic third option. Not yet — and not for anyone.
          </p>
        </section>

        {/* ── It's an unsolved problem (for everyone) ── */}
        <section className="home-section">
          <div className="home-eyebrow">The honest part</div>
          <h2 className="home-h2">This is an unsolved problem — for everyone.</h2>
          <p className="home-body">
            I want to be clear: this isn't me making an excuse, and it's not me throwing shade at
            anyone. Getting an AI to reliably do things on <em>any</em> website is one of the
            genuinely unsolved problems in the field right now. The best-funded labs in the world are
            still figuring it out — even their browser agents stumble on messy, real-world sites.
            Not because they aren't brilliant. Because the problem is just that hard.
          </p>
          <p className="home-body">
            So when Braino fumbles and plays the wrong video, I'm telling you the honest reason:
            nobody has fully cracked this yet. It's the frontier, and the frontier is messy.
          </p>
          <p className="home-body">
            And look — if the biggest teams on earth are still working it out, I'm not going to stand
            here and promise you that one person building this from his room gets it right a hundred
            percent of the time. I won't pretend that. Anyone who promises you a browser agent that
            "just works, every single time" is selling you something that doesn't exist yet — from
            anyone.
          </p>
        </section>

        {/* ── Why bother ── */}
        <section className="home-section">
          <div className="home-eyebrow">So why am I even doing this</div>
          <h2 className="home-h2">Because "it's hard" isn't where I stop. It's where I aim.</h2>
          <p className="home-body">
            Fair question. If it's this hard, why am I breaking my back over it? Because "hard" is
            exactly where the interesting work is. I'm not trying to win the "do anything, anywhere"
            race — that's a frontier research problem, and it's not the game I can or want to play.
            So I play a different one.
          </p>
          <p className="home-body">
            What I <em>can</em> do — what a small, stubborn team will actually do that they won't
            bother with — is go website by website, the ones you actually live in, and build exact,
            hardcoded paths that skip the guessing entirely. On those, Braino isn't fifty percent.
            He's a hundred. Maps. YouTube. The handful of places that matter to you. No screenshots,
            no guessing, no luck. Just works.
          </p>
        </section>

        {/* ── The deal ── */}
        <section className="home-section">
          <div className="home-eyebrow">What you're actually getting</div>
          <h2 className="home-h2">No fake confidence. No spinner hiding a failure.</h2>
          <p className="home-body">
            Everywhere else, Braino still tries. He just tries <em>honestly</em>. If he's not sure,
            he'll say so. If he fumbles, he'll own it instead of pretending it went fine.
          </p>
          <p className="home-body">
            I'm not selling you magic. I'm selling you something that gets sharper every single day,
            built by someone who actually uses it, who gets annoyed at the exact same things you do,
            and who is too stubborn to ship something that lies to you about what it can do.
          </p>
          <p className="home-body">
            Nobody's cracked this perfectly yet — and I'm not going to pretend I have. But I'll
            out-care anyone building it, and on the things that matter to you, I'll make it just
            work. That's the deal. That's the whole deal.
          </p>
        </section>

        {/* ── Close ── */}
        <section className="home-close">
          <h2 className="home-h2 home-h2-center">Still here? Then let's build it together.</h2>
          <p className="home-body" style={{ textAlign: "center", fontStyle: "italic", opacity: 0.85 }}>
            — Itish, building Braino
          </p>
          <Link className="home-cta" to="/auth">Try Braino →</Link>
          <p className="home-fine">Free to start · Chrome, Arc, Brave, Edge</p>
        </section>
      </article>
    </div>
  );
}
