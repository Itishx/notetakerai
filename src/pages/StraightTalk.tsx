import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { serif, readFont, mono, wrap, Eyebrow, Section, heroCta } from "@/lib/editorial";
import "./home.css";

/* An honest, founder-voice page on why the agent is sometimes slow / imperfect.
   Linked from Home. Editorial "Medium theme": Instrument Serif heads, Newsreader
   body, mono pip eyebrows, alternating --sb-* token bands. */

const accentEm: React.CSSProperties = { fontStyle: "italic", color: "var(--sb-accent-deep)" };
const h2Style: React.CSSProperties = {
  fontFamily: serif, fontWeight: 400, fontSize: "clamp(30px,4.2vw,50px)", lineHeight: 1.05,
  letterSpacing: "-0.022em", color: "var(--sb-ink)", margin: "14px 0 0",
};
const bodyStyle: React.CSSProperties = {
  fontFamily: readFont, fontSize: 20, lineHeight: 1.75, color: "var(--sb-ink)", margin: "20px 0 0",
};
const col = { ...wrap, maxWidth: 720 } as React.CSSProperties;

export default function StraightTalk() {
  return (
    <div style={{ background: "var(--sb-bg)", color: "var(--sb-ink)", minHeight: "100vh" }}>
      <Navbar />

      {/* ── Hero ── */}
      <section style={{ padding: "132px 0 8px" }}>
        <div style={{ ...wrap, maxWidth: 820 }}>
          <Eyebrow>Straight talk · no excuses</Eyebrow>
          <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(42px,6vw,76px)", lineHeight: 1.02, letterSpacing: "-0.03em", color: "var(--sb-ink)", margin: "18px 0 0" }}>
            Why Braino is sometimes slow, and why I <em style={accentEm}>won't lie</em> to you about it
          </h1>
          <p style={{ fontFamily: readFont, fontSize: 23, lineHeight: 1.55, color: "var(--sb-ink-2)", maxWidth: 660, margin: "22px 0 0" }}>
            You're going to ask Braino to do something, and sometimes he'll take his time, or fumble
            it. I could hide that behind a spinner and a clean marketing line. I'm not going to.
            Here's the actual truth, the way I'd tell a friend.
          </p>
        </div>
      </section>

      {/* ── Just say it ── */}
      <Section tone="2" pad="80px 0">
        <div style={col}>
          <Eyebrow>Let me just say it</Eyebrow>
          <h2 style={h2Style}>Sometimes he's slow. Sometimes he gets it wrong.</h2>
          <p style={bodyStyle}>
            Look, I'll be honest with you. Sometimes Braino is slow. Sometimes you tell him to do
            something on a website and he picks the wrong thing. I'm not going to pretend that
            doesn't happen. You'd notice anyway, and I'd rather you hear it straight from me than
            feel like you were sold a lie.
          </p>
          <p style={bodyStyle}>
            So let me actually explain <em>why</em>. Not as an excuse, as a map. So you know exactly
            what you're using, and exactly what I'm fighting.
          </p>
        </div>
      </Section>

      {/* ── The two ways ── */}
      <Section tone="1" pad="80px 0">
        <div style={col}>
          <Eyebrow>The thing nobody tells you</Eyebrow>
          <h2 style={h2Style}>There are only two ways to do this. That's it. Two.</h2>
          <p style={bodyStyle}>
            The first way is how the giants do it, OpenAI, Google, Anthropic. Their agents take a
            screenshot of the screen (basically a photo) and a vision model stares at that photo
            and goes "okay, click here." Then it takes another photo. Then another. It works on
            almost anything, but it is <em>slow</em>, and it is <em>expensive</em>. Every single
            step is a heavy photo plus a heavy AI looking at it. That adds up fast, and it costs a
            fortune to run.
          </p>
          <p style={bodyStyle}>
            The second way, the way Braino works, is to actually <em>read</em> the page instead of
            photographing it. The buttons, the links, the structure underneath. No photos. Just read
            it and act. It's fast, it's cheap, and on a normal page it's honestly great. But
            sometimes a page is messy, or built strangely (Google Maps is basically a video game,
            not a webpage) and Braino reads it wrong and clicks the wrong thing.
          </p>
          <p style={bodyStyle}>
            Both ways are flawed. There is no magic third option. Not yet, and not for anyone.
          </p>
        </div>
      </Section>

      {/* ── It's an unsolved problem (for everyone) ── */}
      <Section tone="2" pad="80px 0">
        <div style={col}>
          <Eyebrow>The honest part</Eyebrow>
          <h2 style={h2Style}>This is an unsolved problem, for everyone.</h2>
          <p style={bodyStyle}>
            I want to be clear: this isn't me making an excuse, and it's not me throwing shade at
            anyone. Getting an AI to reliably do things on <em>any</em> website is one of the
            genuinely unsolved problems in the field right now. The best-funded labs in the world are
            still figuring it out. Even their browser agents stumble on messy, real-world sites.
            Not because they aren't brilliant. Because the problem is just that hard.
          </p>
          <p style={bodyStyle}>
            So when Braino fumbles and plays the wrong video, I'm telling you the honest reason:
            nobody has fully cracked this yet. It's the frontier, and the frontier is messy.
          </p>
          <p style={bodyStyle}>
            And look, if the biggest teams on earth are still working it out, I'm not going to stand
            here and promise you that one person building this from his room gets it right a hundred
            percent of the time. I won't pretend that. Anyone who promises you a browser agent that
            "just works, every single time" is selling you something that doesn't exist yet, from
            anyone.
          </p>
        </div>
      </Section>

      {/* ── Why bother ── */}
      <Section tone="1" pad="80px 0">
        <div style={col}>
          <Eyebrow>So why am I even doing this</Eyebrow>
          <h2 style={h2Style}>Because "it's hard" isn't where I stop. It's where I aim.</h2>
          <p style={bodyStyle}>
            Fair question. If it's this hard, why am I breaking my back over it? Because "hard" is
            exactly where the interesting work is. I'm not trying to win the "do anything, anywhere"
            race, that's a frontier research problem, and it's not the game I can or want to play.
            So I play a different one.
          </p>
          <p style={bodyStyle}>
            What I <em>can</em> do, what a small, stubborn team will actually do that they won't
            bother with, is go website by website, the ones you actually live in, and build exact,
            hardcoded paths that skip the guessing entirely. On those, Braino isn't fifty percent.
            He's a hundred. Maps. YouTube. The handful of places that matter to you. No screenshots,
            no guessing, no luck. Just works.
          </p>
        </div>
      </Section>

      {/* ── The deal ── */}
      <Section tone="2" pad="80px 0">
        <div style={col}>
          <Eyebrow>What you're actually getting</Eyebrow>
          <h2 style={h2Style}>No fake confidence. No spinner hiding a failure.</h2>
          <p style={bodyStyle}>
            Everywhere else, Braino still tries. He just tries <em>honestly</em>. If he's not sure,
            he'll say so. If he fumbles, he'll own it instead of pretending it went fine.
          </p>
          <p style={bodyStyle}>
            I'm not selling you magic. I'm selling you something that gets sharper every single day,
            built by someone who actually uses it, who gets annoyed at the exact same things you do,
            and who is too stubborn to ship something that lies to you about what it can do.
          </p>
          <p style={bodyStyle}>
            Nobody's cracked this perfectly yet, and I'm not going to pretend I have. But I'll
            out-care anyone building it, and on the things that matter to you, I'll make it just
            work. That's the deal. That's the whole deal.
          </p>
        </div>
      </Section>

      {/* ── Close ── */}
      <Section tone="1" pad="90px 0 104px">
        <div style={{ ...col, textAlign: "center" }}>
          <h2 style={{ ...h2Style, fontSize: "clamp(32px,4.6vw,52px)", margin: 0 }}>Still here? Then let's build it together.</h2>
          <p style={{ fontFamily: readFont, fontSize: 19, fontStyle: "italic", color: "var(--sb-ink-3)", margin: "18px 0 0" }}>
            Itish, building Braino
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "28px 0 0" }}>
            <Link to="/auth" style={heroCta}>Try Braino →</Link>
          </div>
          <p style={{ ...mono, fontSize: 12, color: "var(--sb-ink-3)", marginTop: 18 }}>Free to start · Chrome, Arc, Brave, Edge</p>
        </div>
      </Section>

      <SiteFooter />
    </div>
  );
}
