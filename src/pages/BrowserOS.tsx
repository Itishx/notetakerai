import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import BrainoDanceGrid from "@/components/BrainoDanceGrid";
import { BrainoDefs } from "@/components/BrainoChar";
import { LaneWalker, NotchNav } from "./HomeOS";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import "./home-os.css";

/* ============================================================================
   /browser — Braino for the browser: the extension where he grew up. The
   launch film, the four acts, the walker, the dances.
   ============================================================================ */

const VIDEO_SRC = "/Braino_Final.MP4";

export default function BrowserOS() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [videoDead, setVideoDead] = useState(false);

  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    document.querySelectorAll(".hos .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const watchLaunch = useCallback(() => {
    const v = videoRef.current;
    if (!v || videoDead) return;
    v.closest(".hos-frame")?.scrollIntoView({ behavior: "smooth", block: "center" });
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => { v.muted = true; v.play().catch(() => {}); });
    setMuted(v.muted);
  }, [videoDead]);

  const toggleSound = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    v.play().catch(() => {});
    setMuted(v.muted);
  }, []);

  return (
    <div className="hos hos-light">
      <BrainoDefs />
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <linearGradient id="sbb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F6A8A2" /><stop offset="0.55" stopColor="#E8786E" /><stop offset="1" stopColor="#C9544A" />
          </linearGradient>
          <radialGradient id="sbb-glow" cx="35%" cy="30%" r="50%">
            <stop offset="0" stopColor="#FFD0CB" stopOpacity="0.7" /><stop offset="1" stopColor="#FFD0CB" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>
      <NotchNav />

      <header className="hos-hero" id="top">
        <div className="wrap">
          <h1 className="mega">Braino Browser<span className="dot">.</span></h1>
          <p className="sub">The sidekick on every tab, where he grew up. He reads pages, records lectures, sits in your meetings, and delegates the clicks, about a second a step.</p>
          <div className="ctas">
            <button className="btn" onClick={watchLaunch}>▶&nbsp; Watch the launch film</button>
            <a className="btn ghost" href={EXTENSION_DOWNLOAD_URL} download><Download size={16} /> Install for Chrome</a>
          </div>
          <div className="tiny">Free to start · Chrome · Arc · Brave · Edge</div>
        </div>

        {/* the real global BrainoWalker perches and walks on this bar */}
        <div className="hos-dock">
          <div className="hos-dockbar" id="pg2-hero-bar">
            <span className="ph">Ask Braino anything…</span>
            <span className="mode">⚡ Auto</span>
            <span className="send">↑</span>
          </div>
        </div>
      </header>

      {/* ── the browser half of the bridge ── */}
      <section id="features" data-narrate="the extension still runs the day shift." style={{ background: "var(--sb-bg-2)", borderTop: "1px solid var(--sb-line-2)" }}>
        <div className="col reveal">
          <div className="eyebrow">What he does</div>
          <h2 className="h2">Four things, <em>every day</em></h2>
          <p className="body">He reads with you, listens for you, sits in your meetings, and does the clicking himself.</p>
        </div>
        <div className="col" style={{ marginTop: 34 }}>
          <div className="hos-act reveal">
            <div><div className="num">I</div><div className="name">Chat with Page</div></div>
            <div>
              <h3>Read anything. Understand everything.</h3>
              <p>Highlight anything, or just ask. Braino reads the live DOM, not a screenshot, so the answer is about what's literally in front of you, with the receipts.</p>
            </div>
          </div>
          <div className="hos-act reveal">
            <div><div className="num">II</div><div className="name">Record &amp; Capture</div></div>
            <div>
              <h3>Listen once. Remember forever.</h3>
              <p>One tap turns a two-hour lecture or a messy YouTube video into clean, structured notes (headings, key points, the lot) and ships them to Notion.</p>
            </div>
          </div>
          <div className="hos-act reveal">
            <div><div className="num">III</div><div className="name">Meetings</div></div>
            <div>
              <h3>Every meeting. Perfectly captured.</h3>
              <p>Braino sits in on the call, captures every word, and writes the recap and action items the moment it ends, so you can actually look people in the eye.</p>
            </div>
          </div>
          <div className="hos-act reveal">
            <div><div className="num">IV</div><div className="name">Delegate Tasks</div></div>
            <div>
              <h3>Say what you want. Watch it happen.</h3>
              <p>Describe the outcome. Braino drives the browser to get there, clicking, typing, navigating, about a second per step.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── he can dance (the site's real dance rig) ── */}
      <section id="dance" data-narrate="and yes, i can dance.">
        <div className="col reveal" style={{ textAlign: "center" }}>
          <div className="eyebrow">Six moves · full body</div>
          <h2 className="h2">Oh, and he <em>can dance</em></h2>
          <p className="body">Properly. Six moves on a loop: the twist, disco, the sprinkler, raise the roof, gun fingers, and the moonwalk.</p>
        </div>
        <div className="col reveal" style={{ marginTop: 28 }}>
          <BrainoDanceGrid />
        </div>
      </section>

      {/* ── explore the rest of the site ── */}
      <section id="more" data-narrate="there is a lot more of me." style={{ background: "var(--sb-bg-2)", borderTop: "1px solid var(--sb-line-2)" }}>
        <div className="col reveal" style={{ textAlign: "center" }}>
          <div className="eyebrow">There's a lot more</div>
          <h2 className="h2">This is barely <em>the surface</em></h2>
        </div>
        <div className="wrap">
          <div className="hos-cards reveal">
            <Link className="hos-card" to="/founder-letter">
              <div className="t">The founder letter</div>
              <p>The whole story, with him running live inside the article.</p>
              <span className="go">Read it →</span>
            </Link>
            <Link className="hos-card" to="/automations">
              <div className="t">Automations</div>
              <p>Recurring tasks Braino runs on a schedule, so you stop doing them.</p>
              <span className="go">Explore →</span>
            </Link>
            <Link className="hos-card" to="/integrations">
              <div className="t">Integrations</div>
              <p>Notion, Spotify, Google, X and more, wired in, not bolted on.</p>
              <span className="go">Explore →</span>
            </Link>
            <Link className="hos-card" to="/chat">
              <div className="t">Braino Chat</div>
              <p>Talk to him right now, before you install anything.</p>
              <span className="go">Say hi →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── pricing ── */}
      <section id="pricing" data-narrate="start free. go pro when you want me hands-free.">
        <div className="col reveal" style={{ textAlign: "center" }}>
          <div className="eyebrow">Two ways to use him</div>
          <h2 className="h2">Free to start. <em>Pro</em> when you want him hands-free.</h2>
        </div>
        <div className="wrap">
          <div className="hos-plans reveal">
            <div className="hos-plan">
              <div className="tier">Basic</div>
              <div className="price">Free</div>
              <div className="per">Everything that just works.</div>
              <ul>
                <li>Chat about any page</li>
                <li>Web search</li>
                <li>Record lectures &amp; meetings</li>
                <li>A daily taste of the Braino Agent</li>
              </ul>
              <Link className="btn ghost" to="/auth">Get started</Link>
            </div>
            <div className="hos-plan pro">
              <div className="tier">Braino Pro</div>
              <div className="price">The Agent</div>
              <div className="per">Talk to him, and he acts for you.</div>
              <ul>
                <li>The full Braino Agent, voice + actions, unlimited</li>
                <li>Unlimited recording &amp; chat</li>
                <li>Memory, cloud sync, 50+ languages</li>
              </ul>
              <Link className="btn" to="/premium">See Pro</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── faq ── */}
      <section id="faq" data-narrate="go on, ask." style={{ paddingBottom: 60 }}>
        <div className="col reveal" style={{ textAlign: "center" }}>
          <div className="eyebrow">Questions</div>
          <h2 className="h2">Fair things <em>to ask</em></h2>
        </div>
        <div className="hos-faq reveal">
          <details>
            <summary>Can he really do tasks for me?</summary>
            <p>Yes. Describe the outcome and Braino drives the browser to get there, clicking, typing, navigating, about a second per step. Free includes 25 Delegate tasks a month.</p>
          </details>
          <details>
            <summary>Does he work on every website?</summary>
            <p>He floats on pretty much any normal page. Some locked-down pages keep him politely on the sidelines, which is probably for the best.</p>
          </details>
          <details>
            <summary>Do recordings really become notes?</summary>
            <p>One tap. A two-hour lecture or a messy YouTube video comes back as clean, structured notes with headings and key points, shipped straight to your Notion.</p>
          </details>
          <details>
            <summary>Why is it flaky sometimes?</summary>
            <p>Honestly: browsers fight extensions. It's the reason we built the Mac app. The browser version stays alive because the experiment still matters to us.</p>
          </details>
        </div>
      </section>

      {/* ── the launch film ── */}
      <section id="film" data-narrate="the launch film" style={{ padding: "40px 0 0" }}>
        <div className="hos-theater">
          <div className="hos-roofwalk" aria-hidden="true"><LaneWalker flowers /></div>
          <div className="hos-frame">
            {!videoDead && (
              <video
                ref={videoRef}
                src={VIDEO_SRC}
                autoPlay muted loop playsInline
                onError={() => setVideoDead(true)}
              />
            )}
            {!videoDead && (
              <button className="hos-sound" onClick={toggleSound}>{muted ? "🔇 SOUND" : "🔊 MUTE"}</button>
            )}
          </div>
        </div>
      </section>

      {/* ── closer ── */}
      <div className="hos-closer" id="closer" data-narrate="ready when you are.">
        <div className="col reveal">
          <h2 className="h2 haas">Ready when you are.</h2>
          <div className="ctas">
            <a className="btn" href={EXTENSION_DOWNLOAD_URL} download><Download size={16} /> Install for Chrome</a>
            <Link className="btn ghost" to="/auth">Get started</Link>
          </div>
          <div className="tiny" style={{ marginTop: 18, fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", fontSize: 11.5, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--sb-ink-3)" }}>
            Free to start · Chrome, Arc, Brave, Edge · and now macOS
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
