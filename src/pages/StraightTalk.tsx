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

        {/* ── Even OpenAI ── */}
        <section className="home-section">
          <div className="home-eyebrow">And here's the part that says it all</div>
          <h2 className="home-h2">OpenAI couldn't crack it. With billions.</h2>
          <p className="home-body">
            They built the screenshot kind. They called it Operator. Billions of dollars, the
            smartest people on the planet. And on real websites — the ones with logins and checkouts
            — it succeeded <em>less than half the time</em>. Less than half. They quietly shut it
            down and folded it into something else.
          </p>
          <p className="home-body">
            So when Braino scrolls past your video and plays the wrong one, I'm not making an excuse
            when I tell you: the biggest companies in the world have not solved this either. It's a
            genuinely unsolved problem.
          </p>
          <p className="home-body">
            And honestly — ask yourself. If OpenAI, with all that money, gets it right barely half
            the time, how is one person building this from his room supposed to magically hit a
            hundred percent? I'm not going to. I won't pretend I will. Anyone who promises you a
            browser agent that "just works, every time" is selling you something that doesn't exist.
          </p>
        </section>

        {/* ── Why bother ── */}
        <section className="home-section">
          <div className="home-eyebrow">So why am I even doing this</div>
          <h2 className="home-h2">Because "it's hard" isn't where I stop. It's where I aim.</h2>
          <p className="home-body">
            Fair question. If even the giants can't make it perfect, why am I breaking my back over
            it? Because I can't beat OpenAI at the "do anything, anywhere" game — so I'm not playing
            that game. That's their fight, and they're losing it too.
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
            The giants couldn't make it perfect. I'm not going to pretend I did. But I'll out-care
            them — and on the things that matter to you, I'll make it just work. That's the deal.
            That's the whole deal.
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
