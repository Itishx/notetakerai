import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import SiteFooter from "@/components/SiteFooter";
import { RevealGate, NotchNav, LidNotchShow } from "./HomeOS";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";
import "./home-os.css";

/* ============================================================================
   /jarvis — Braino Jarvis: the voice-first Mac. Boot reveal first, then the
   notch rides the top of the page and narrates every section as you scroll.
   ============================================================================ */

export default function JarvisOS() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.14 });
    document.querySelectorAll(".hos .reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="hos">
      <NotchNav narrator />

      {/* the notch first; the name after */}
      <RevealGate />

      <header className="hos-hero" id="top" style={{ padding: "120px 0 40px" }}>
        <div className="wrap">
          <h1 className="mega">Braino Jarvis<span className="dot">.</span></h1>
          <p className="sub">The voice-first Mac. He lives in your notch, wakes when you call, runs the machine out loud, and watches the work so he can help before you ask.</p>
          <div className="ctas">
            <a className="btn" href={EXTENSION_DOWNLOAD_URL} download><Download size={16} /> Get Braino</a>
            <Link className="btn ghost" to="/founder-letter">Read the founder letter →</Link>
          </div>
          <div className="tiny">macOS · the notch · voice-first · double-tap Control</div>
        </div>
      </header>

      {/* ── delegate: the headline capability ── */}
      <section id="delegate" data-narrate="say it. i run the mac.">
        <div className="col reveal">
          <div className="eyebrow">The true delegate · voice-first · 24/7</div>
          <h2 className="h2">Say it. <em>He runs the Mac.</em></h2>
          <p className="body">Delegate in the browser was the rehearsal. On the Mac it's the real thing: he organizes the Desktop into folders, finds the file by what's written inside it, deletes only after Touch ID says it's really you, opens the apps, drafts the mail, cues the music. Describe the outcome and it happens across the whole machine, not just a tab.</p>
          <div className="stat">
            <div className="big">"yes"</div>
            <div className="cap">is the entire distance between his offer and the work being done.</div>
          </div>
          <p className="body">And in cowork mode he doesn't even wait to be asked. He watches the screen, offers once when he sees a way to help, and moves the moment you agree.</p>
        </div>
      </section>

      {/* ── the origin story, told quietly ── */}
      <section id="story" data-narrate="three months chasing speed. it was in the mac.">
        <div className="col reveal">
          <div className="eyebrow">How we got here</div>
          <p className="pull">We started in the browser, and spent three months chasing one thing: <b>speed.</b></p>
          <p className="body">We rebuilt the agent, trimmed every step, taught him to read the live page instead of squinting at screenshots. He got quick. But the ceiling was always the tab. The speed we were chasing had been sitting one level deeper the whole time: the Mac itself.</p>
          <p className="body">So we didn't throw the extension away, we bridged it. <strong>One brain, two bodies.</strong> The notch does the listening and the talking, the extension does the clicking, and the handoff between them is instant. Faster than anything we ever squeezed out of the browser alone.</p>
        </div>
      </section>

      {/* ── mac ── */}
      <section className="hos-mac" id="mac" data-narrate="i live in the macbook now.">
        <div className="wrap">
          <div className="col reveal" style={{ textAlign: "center" }}>
            <div className="eyebrow">New · macOS</div>
            <h2 className="h2 haas">He lives in your MacBook now.</h2>
            <p className="body">Not a window. Not a menu bar icon. Braino sleeps in the notch, walks on your Dock, and runs the machine when you ask.</p>
          </div>
          <div className="hos-bento">
            <div className="hos-cell wide reveal">
              <LidNotchShow />
              <div>
                <h3>The island is the whole interface.</h3>
                <p>This is his real flow, beat for beat, straight from the app. He boots with his eyes, authenticates inside the island, dozes until you call, opens up to listen, stretches sideways to show what he heard, answers with one small talking mouth, and settles back down. No windows. No text walls. Just the notch, moving.</p>
                <span className="say">The eyes opening after auth is the greeting.</span>
              </div>
            </div>
            <div className="hos-cell reveal">
              <h3>Organizes your files.</h3>
              <p>Loose Desktop chaos becomes tidy folders, grouped by type, date, or project. Every pass is undoable.</p>
              <span className="say">"Braino, clean up my Desktop."</span>
            </div>
            <div className="hos-cell reveal">
              <h3>Scans and finds anything.</h3>
              <p>He finds files by name, type, or what's actually inside them, then opens the right PDF, image, or folder.</p>
              <span className="say">"Find the tax PDF and open it."</span>
            </div>
            <div className="hos-cell reveal">
              <h3>Deletes with Touch ID.</h3>
              <p>Nothing gets deleted on a whim. Every delete asks your fingerprint first, so it's really you, really sure.</p>
              <span className="say">"Delete the old receipt PDF."</span>
            </div>
            <div className="hos-cell half reveal">
              <h3>Runs your apps.</h3>
              <p>WhatsApp, Spotify, Chrome, Finder, Terminal. He opens them, closes them, drafts your mail in Apple Mail, and drops notes into Apple Notes.</p>
              <span className="say">"Open Cursor and put on some music."</span>
            </div>
            <div className="hos-cell half reveal">
              <h3>DJs the whole machine.</h3>
              <p>Full Spotify control: play, queue, seek, shuffle, volume by percent. When the music lands, he puts his headphones on, the screen edges glow, and he dances to the actual tempo.</p>
              <span className="say">"Play something for deep work."</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── the next vertical: cowork ── */}
      <section id="cowork" data-narrate="i watch. i offer. you say yes.">
        <div className="col reveal">
          <div className="eyebrow">Next · Braino Co-work</div>
          <h2 className="h2">He works <em>alongside you</em></h2>
          <p className="body">Say "start cowork mode" and he checks on your screen every minute or two. Only speaks when he has one concrete way to help, phrased so you can accept by just saying yes. Then he does it. Not a chatbot you visit. A companion who was already looking.</p>
          <p className="body"><strong>People have Claude working next to them. People have ChatGPT working next to them. People will have Braino working next to them.</strong></p>
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
            <summary>Is Braino listening to me all the time?</summary>
            <p>No. Voice is off by default, and the wake word runs entirely on your device. Nothing leaves your Mac until you actually call him. The dot in the island always tells you which state he's in.</p>
          </details>
          <details>
            <summary>Can he really delete my files safely?</summary>
            <p>Every delete requires Touch ID or your password first, and file organizing is undoable. He keeps a record of what he moved so you can always take it back.</p>
          </details>
          <details>
            <summary>What is co-work mode?</summary>
            <p>Say "start cowork mode" and he checks your screen every minute or two. He only speaks when he has one concrete way to help, phrased so you can accept by just saying yes. Then he does it.</p>
          </details>
          <details>
            <summary>Does he need the notch?</summary>
            <p>He was born for it, but any Mac works: the island draws itself at the top of your screen, notch or not.</p>
          </details>
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
