import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import "./home.css";

// An honest, founder-voice page on why Braino takes ~2-3s to respond. Linked from Home footer.
export default function WhyTheWait() {
  return (
    <div className="home">
      <Navbar />

      <article className="home-article">
        {/* ── Hero ── */}
        <section className="home-hero">
          <div className="home-kicker">Straight talk · the wait</div>
          <h1 className="home-h1">Why Braino takes a couple of seconds — and why I'm okay with it</h1>
          <p className="home-lede">
            You'll talk to Braino and sometimes he'll take two, maybe three seconds before he answers.
            I could pretend that's not there. I'd rather just tell you exactly what's happening, the
            way I'd explain it to a friend — because once you know, I think you'll get why I stopped
            chasing it.
          </p>
        </section>

        {/* ── Just say it ── */}
        <section className="home-section">
          <div className="home-eyebrow">Let me just say it</div>
          <h2 className="home-h2">Two to three seconds. Sometimes faster, sometimes not.</h2>
          <p className="home-body">
            When you finish talking, Braino usually starts answering in about two to three seconds.
            Some moments it's quicker. Some moments it drags a little. It's not consistent, and I'm not
            going to pretend it is — you'd notice anyway.
          </p>
          <p className="home-body">
            So here's the actual reason. Not an excuse — the real mechanics, so you know precisely what
            you're waiting on.
          </p>
        </section>

        {/* ── The round trip ── */}
        <section className="home-section">
          <div className="home-eyebrow">Where the seconds go</div>
          <h2 className="home-h2">It's not your computer. It's the round trip.</h2>
          <p className="home-body">
            Every time Braino answers, three different things have to happen — and each one is a trip
            across the internet to somebody else's servers. First, what you said has to be turned into
            text (that's a model from OpenAI). Then it has to be understood and a reply written (another
            model). Then that reply has to be turned back into his actual voice (the voice engine).
            Three hops. Three waits. Stacked one after another.
          </p>
          <p className="home-body">
            And here's the part I can't control: those servers aren't mine. When OpenAI is busy, the
            first two steps slow down. When the voice engine is cold or under load, the last step does.
            On a calm day it all flows and he's quick. On a busy one, the same exact question takes a
            second or two longer — and nothing changed on my end at all. It just varies, because the
            internet varies.
          </p>
        </section>

        {/* ── I went looking ── */}
        <section className="home-section">
          <div className="home-eyebrow">The honest part</div>
          <h2 className="home-h2">I went looking for the fat. There wasn't any.</h2>
          <p className="home-body">
            I didn't just shrug at this. I went deep into the code — timed every single stage, watched
            exactly where the milliseconds went, and tore the whole path apart looking for waste. I had
            it analyzed line by line, by the sharpest tools I have. The verdict kept coming back the
            same: on my side, it's about as tight as it gets. The slow part isn't my code — it's the
            providers, and that's the frontier for everyone, not just me.
          </p>
          <p className="home-body">
            There's exactly one way to make it dramatically faster: rip out his real voice and use the
            big providers' built-in robotic one, which skips a couple of those hops. I tried it. It's
            faster. It also isn't <em>Braino</em> anymore. And that's where I drew the line.
          </p>
        </section>

        {/* ── The choice ── */}
        <section className="home-section">
          <div className="home-eyebrow">So I made a call</div>
          <h2 className="home-h2">I'd rather he feel like someone than answer half a second sooner.</h2>
          <p className="home-body">
            Here's the thing. Nobody falls for Braino because he shaved three hundred milliseconds off a
            reply. They fall for <em>him</em> — the voice, the warmth, the fact that he feels like a
            presence and not a search box. That's the whole point. That's the thing I'm actually
            building.
          </p>
          <p className="home-body">
            So I made a choice, on purpose: I'd rather pour my energy into his personality than into
            squeezing out a second that's mostly not mine to squeeze. A real person takes a beat before
            they answer you too. I'm okay with Braino taking his — as long as what comes back is
            unmistakably him.
          </p>
          <p className="home-body">
            That's the trade. His voice, his warmth, his soul — for a couple of honest seconds. I'll
            take that deal every single time.
          </p>
        </section>

        {/* ── Close ── */}
        <section className="home-close">
          <h2 className="home-h2 home-h2-center">Still here? Then come meet him.</h2>
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
