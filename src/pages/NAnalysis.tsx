import { FormEvent, useEffect, useRef, useState } from "react";
import { Heart } from "lucide-react";
import "../styles/apple.css";
import "./n-analysis.css";

const N_ANALYSIS_ACCESS_KEY = "n-analysis-access";
const N_ANALYSIS_PASSWORD_HASH = "d105fb5145710faca63a6ebf658876a86325e5bbeb699d545ef292df1d803533";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = ref.current?.querySelectorAll<HTMLElement>(".na-reveal");
    if (!elements?.length) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in");
      }),
      { threshold: 0.12 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return ref;
}

async function hashPassword(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || checking) return;
    setChecking(true);
    const matches = (await hashPassword(password)) === N_ANALYSIS_PASSWORD_HASH;
    if (matches) {
      window.sessionStorage.setItem(N_ANALYSIS_ACCESS_KEY, "granted");
      onUnlock();
      return;
    }
    setError(true);
    setChecking(false);
  };

  return (
    <main className="apple na-page na-locked">
      <div className="na-gate">
        <div className="na-gate-mark">N</div>
        <p>Private analysis</p>
        <h1>This one is<br />for you.</h1>
        <form onSubmit={submit}>
          <label htmlFor="n-analysis-password">Password</label>
          <div>
            <input
              id="n-analysis-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(false);
              }}
              placeholder="Enter password"
              autoComplete="current-password"
              autoFocus
            />
            <button type="submit" disabled={!password || checking}>{checking ? "Checking…" : "Enter"}</button>
          </div>
          {error && <span role="alert">That isn’t it. Try again.</span>}
        </form>
      </div>
    </main>
  );
}

function CompatibilityTable() {
  return (
    <div className="na-table-wrap na-reveal">
      <table className="na-table">
        <thead>
          <tr>
            <th>Compatibility</th>
            <th>Analysis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Emotional Maturity</td>
            <td><strong>10/10 match</strong></td>
          </tr>
          <tr>
            <td>Kindness</td>
            <td><strong>10/10</strong><span>You’re a lot more man. You actually get involved into protests, politics while I’m completely apolitical and mera deshbhkat sirf aaise protests ke time nikalga hai. Even about history I’ve seen, you go in deep. Where as I also like that but at the a surface level and I love that ki usme you dominate me. You challenge me</span></td>
          </tr>
          <tr>
            <td>Bakchodi level</td>
            <td><strong>11/10 match</strong></td>
          </tr>
          <tr>
            <td>practical outlook in life</td>
            <td>from the ai discussion we had and how much I know of you: <strong>compatible</strong></td>
          </tr>
          <tr>
            <td>Sexual (which is super important hence this is very long (coughs)</td>
            <td>
              <strong>from my side,</strong>
              <span>At the end of the day i am a man, and you are a goregorous woman. Man sees woman, man like, but in all seriousness</span>
              <span>(from my side, without, ahem, hands on experience, i would still strongly rate it a 10)</span>
              <span>Your hold over me has been insane, and not a lot of women trigger that or ever have. It’s different, it stems from the mini connection that we have and its enough</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TaskTab() {
  return (
    <div className="na-tab-panel">
      <section className="na-section na-intro">
        <p className="na-kicker na-reveal">Analysis points below, read carefully</p>
        <h2 className="na-section-title na-reveal">Compatibility</h2>
        <CompatibilityTable />
        <div className="na-editorial na-reveal">
          <p>So given these points</p>
        </div>
        <blockquote className="na-pullquote na-reveal">
          <span>e) goddamn there can’t be an e.</span>
          We are compatible. In a very beautiful way possible is what my analysis is
        </blockquote>
        <p className="na-body na-reveal">so with this, a visitor like you at the gates of the strongest emotional walls ever built? I think it would be the dumbest thing to say aap mumbai nahi aaskate ho, tatto mein goli khaane waali harkat hogi woh</p>
        <p className="na-aside na-reveal">(We’re both gorgeous-o-soraus)</p>
        <div className="na-window-card na-reveal">
          <span>And for what it’s worth, here’s a different way I can put this</span>
          <p>I closed the windows in my room to avoid breezes at all costs but this one in particular feels pretty nice.</p>
        </div>
      </section>

      <section className="na-section">
        <p className="na-kicker na-reveal">Question 2)</p>
        <h2 className="na-section-title na-reveal">What are your values, non negotiable, relationship non negotiables and actions</h2>
        <div className="na-values-grid">
          <article className="na-list-card na-reveal">
            <header className="na-value-card-head">
              <span className="na-value-glyph" aria-hidden="true">♥</span>
              <div>
                <span className="na-card-no">01 · The foundation</span>
                <h3>Values</h3>
              </div>
            </header>
            <table className="na-values-table">
              <tbody>
                <tr><th scope="row">Love</th><td>Love hard—till death do us apart philosophy.</td></tr>
                <tr><th scope="row">Kindness</th><td>Kindness at its peak.</td></tr>
                <tr><th scope="row">Loyalty</th><td>Roh bare minimum: be obsessed with each other.</td></tr>
                <tr><th scope="row">Character</th><td>Aur values kya hoti hai? Sabh achi hi hai yaar—matlab sahi banda hu mein.</td></tr>
              </tbody>
            </table>
          </article>
          <article className="na-list-card na-reveal">
            <header className="na-value-card-head">
              <span className="na-value-glyph" aria-hidden="true">◇</span>
              <div>
                <span className="na-card-no">02 · The essentials</span>
                <h3>Non-negotiables</h3>
              </div>
            </header>
            <table className="na-values-table">
              <tbody>
                <tr><th scope="row">Effort</th><td>I don’t expect anyone to match my intensity, but for fuck’s sake—try to match it for once.</td></tr>
                <tr><th scope="row">Commitment</th><td>Loyalty, commitment, and being obsessed with each other. All the good stuff.</td></tr>
                <tr><th scope="row">Family</th><td>I do want to be a father one day, so the woman I marry should share the view of having kids someday. My personal preference is two daughters, but I’m down for whatever. I mean, I already have a son now—oh, next non-negotiable.</td></tr>
                <tr><th scope="row">Support</th><td>Be truly supportive of my passions—not because you have to, but because you want to. Love Braino, basically.</td></tr>
                <tr><th scope="row">Touch</th><td>Physical touch and everything around it. Grown-up stuff, you know? (coughs ×6)</td></tr>
              </tbody>
            </table>
          </article>
        </div>
        <div className="na-reality-table-wrap na-reveal">
          <div className="na-reality-heading">
            <span>03 · In practice</span>
            <h3>What this means in real life</h3>
          </div>
          <table className="na-reality-table">
            <tbody>
              <tr>
                <th scope="row">Parents</th>
                <td>Parents need to be cared for when they are old. I can go abroad for a few years, yes—but eventually, parents come at the top.</td>
              </tr>
              <tr>
                <th scope="row">Actions</th>
                <td>Relationship non-negotiables and actions are one and the same to me. A non-negotiable is a non-negotiable.</td>
              </tr>
              <tr>
                <th scope="row">The promise</th>
                <td>I’m the kind to bring my girl the moon. A man dedicated to making his love story feel like a fairytale ever since he was five.</td>
              </tr>
            </tbody>
          </table>
          <p className="na-reality-footnote">“Fair enough / enuff,” you’ll say. <span>(—I know, I know)</span></p>
        </div>
      </section>
    </div>
  );
}

function LetterTab() {
  return (
    <div className="na-tab-panel">
      <article className="na-letter">
        <header className="na-letter-head na-reveal">
          <p>Okay so</p>
          <h2>Hi there, let’s get into it, shall we?</h2>
          <p>I will answer all your questions to the point and precisely</p>
          <div className="na-question-line">
            <span>Are you ready for relationships, commitment and effort in general,</span>
            <span>What are your values, non negotiable, relationship non negotiables and actions</span>
          </div>
        </header>

        <div className="na-letter-copy">
          <p className="na-reveal"><span className="na-dropcap">1.</span> The thing is, I was born to love, born to be a dad and a husband, always been the most intense lover boy ever so it goes without saying that I was and always be ready for relationships. I thrive when I’m in love</p>
          <p className="na-big-question na-reveal">So am I ready for relationships, commitment and effort in general? Love, I was born ready</p>
          <p className="na-reveal">But, does that mean I’m ready right now?</p>
          <p className="na-reveal">With my recent realisation that I’ve&nbsp; overhealed to a point where I’ve become too emotionally protected, my default setting is to not want anyone inside the room right now, for I am the life of my own party, I built it brick by brick.</p>
          <p className="na-reveal">And I’m not happy with this result, my friend said it beautifully, my extremities are my problem. Mein sabh kuch extreme karta hu. Khaana? Extreme<br />Chocolates? Extreme<br />Anything I love, I go all in because that’s the only way I know how to appreciate something that makes my soul happy</p>
          <p className="na-reveal">So behenchod healing bhi zyaada hona achi baat nahi hai and maine woh bhi kardi, joh nahi karni thi and now that we have realised we crossed the finish line, we turn back and find our way back, I have to make myself understand that i inevitably have to let someone in. I was genuinely expecting the universe to send me someone 2 years later since I wanted two more years of my party but you see, universe backchodi karta rehta hai mere saath, at the peak of my not looking, it sent me someone I’ve adored from the bottom of my heart for the last eight years. The woman jiske saamne mera practicality perspective kick in hua tha</p>
          <div className="na-you na-reveal">
            <span>It sent me</span>
            <strong>you.</strong>
          </div>
          <p className="na-reveal">Here I am, at the gate when I have to decide if I have to let someone in, which I previously decided would be the one last time I would open the windows, and the candidate is you, so.. I mean.. but that’s just the crush speaking, of course id be flattered. Imagine your crush asking you hey do you like me think about it… so come loser, let’s dive in deeper</p>
        </div>
      </article>
    </div>
  );
}

function VerdictTab() {
  return (
    <div className="na-tab-panel">
      <article className="na-letter na-verdict-letter">
        <header className="na-letter-head na-reveal">
          <p>So am I ready for a relationship?</p>
          <h2 className="na-verdict-question">Right now fuck no like not in the immediate month or a few months to come but to explore?</h2>
          <p>As in meet you with the intention of getting to know and see you romantically, yes I’m totally ready for that, I mean the universe sent you man it’d be an insult to him to not even try and that is what I’m ready to do. To see how I feel when I’m around you, to hold your hand more, feel the mutual&nbsp; tensions between us, the slow burn you know? Or intense we don’t know we don’t know</p>
        </header>

        <div className="na-letter-copy">
          <p className="na-reveal">I’m ready by which I mean I’m open to the idea of letting the possibility of love again in my life— and I’m saying this when a two weeks ago I had realised I may not want anyone for a very long time (2-3 more years— from that to even being open is a huge leap and I’m ready to make it)</p>

          <p className="na-big-question na-reveal">My verdict would be: let’s fuck around and find out with a direction, like being in layman terms: meet with the basic required emotional energy and a an open-ness to seeing where the flow takes us.</p>

          <div className="na-eight-years na-reveal">
            <p>However, if your answer is “Not right now” which i think it would be given the way you’ve told me you need to heal and are not doing the best, i understand, and to that i just have one thing to say</p>
            <p>I have been around for the past 8 years. I met people, you met people, and for the second time in a decade, we have found ourselves yet again in what you could call a possible talking stage. (In order for that, you have to open WhatsApp, which is something I guess we will work on)</p>
            <p>I think what I mean to say is that, even though I totally understand if you're not ready right now, if it's not the right time, what matters at the end of the day is if, somewhere, you think this may be the right person. If you're willing, that is what matters.</p>
            <p>Not now, but someday, when you find yourself ready again, when you open the windows again, I would say let me know?</p>
            <p>I think, at this point, we deserve to give you+me a chance, I don't think I'm going anywhere. I don't think you are either, so let's paint a lot more and see what happens. You could say we’ve in some way found our way back to each other and if only that would have to happen the 3rd time and 3 is a lucky charm, maybe then we’ll think about it.</p>
            <p className="na-disclaimer">Disclaimer: i want you to know this doesnt mean i will wait or hope somewhere, i will not stop myself from meeting people thinking oh nayo hai, nahi, nayo nahi hai (yet). Koi bhi kabhi bhi aasakta hai is what i ahve realised and theres nothing u could so about it so say two more years down the line, if the universe has to send me someone, it could either be anyone or, you, and i’m open to everything is my point</p>
          </div>

          <div className="na-summary na-reveal">
            <div><span>Intentions?</span><strong>Non fucking platonic,</strong></div>
            <div><span>Vibes?</span><strong>Behenkar</strong></div>
            <div><span>Bakchodi:</span><strong>the bare minimum</strong></div>
            <div><span>Touchy touchy?</span><strong>Yes, it’s my number 1 love language</strong></div>
          </div>
          <p className="na-closing na-reveal">I’ve hopefully done a good job at explaining that above. Here ends the answer to question 1</p>

          <section className="na-other na-reveal">
            <h3>Other factors</h3>
            <ul>
              <li>
                <strong>Age &amp; culture</strong>
                <div className="na-factor-copy">
                  <p>Age? I don’t really care.</p>
                  <span className="na-factor-aside">(cough, mommy, cough)</span>
                  <p>Culturally, my parents might have an issue because, given mahila mard ko marne waali sansati khabar news, they feel it’s best to be in-caste.</p>
                  <p>But give it a second with you—they’ll be sold. <span className="na-factor-aside">(I was.)</span></p>
                </div>
              </li>
              <li>
                <strong>Long distance</strong>
                <div className="na-factor-copy">
                  <p>We would be long distance right now, if something happens.</p>
                  <p>But again, the only way I know how to do this is long distance—I think I was born for it. I’ve never had anyone in the same city.</p>
                  <p>You might actually be the first person I get to properly go out on a date with, if this happens.</p>
                  <p>So yes: let’s be a little bold here.</p>
                </div>
              </li>
            </ul>
          </section>
        </div>
      </article>
    </div>
  );
}

export default function NAnalysis() {
  const [hasAccess, setHasAccess] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(N_ANALYSIS_ACCESS_KEY) === "granted",
  );
  const contentRef = useReveal();

  if (!hasAccess) return <PasswordGate onUnlock={() => setHasAccess(true)} />;

  return (
    <main className="apple dark na-page na-editorial-page">
      <header className="na-nav" id="top">
        <a className="na-wordmark" href="#top" aria-label="N analysis home">N</a>
        <span>N analysis · A private letter</span>
        <Heart size={16} strokeWidth={1.8} aria-hidden="true" />
      </header>

      <div ref={contentRef} className="na-continuous" id="n-analysis-content">
        <section className="na-continuous-chapter" id="rodies-task">
          <div className="na-chapter-label"><span>01</span>Rodies Task</div>
          <TaskTab />
        </section>
        <section className="na-continuous-chapter" id="the-letter">
          <div className="na-chapter-label"><span>02</span>The Letter</div>
          <LetterTab />
        </section>
        <section className="na-continuous-chapter" id="my-verdict">
          <div className="na-chapter-label"><span>03</span>My Verdict</div>
          <VerdictTab />
        </section>
      </div>

      <footer className="na-footer"><span>N analysis</span><Heart size={14} fill="currentColor" aria-hidden="true" /></footer>
    </main>
  );
}
