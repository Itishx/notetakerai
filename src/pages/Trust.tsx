import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAffTheme } from "@/components/AffTheme";
import { AffNav, AffFooter, useAffReveal } from "@/components/affPage";
import "./affective.css";
import "./affective-home.css";
import "./trust.css";

/* ============================================================================
   /trust: what Braino sees, hears, keeps and sends, in plain words (2026-10-13).

   Every line here was checked against the Mac app and the backend on the day
   it was written. If the product changes, this page changes with it. Facts
   only the owner can supply are marked TODO(owner) in comments and are left
   off the page rather than guessed.
   ============================================================================ */

const MODES = [
  {
    name: "Learn my day",
    tag: "Recommended",
    p: "Braino keeps a private diary of your day: the apps you use, the pages you open, the words on your screen. That is how he can tell you what you worked on, pick up where you left off, and remember what you promised.",
    facts: [
      "The diary lives on your Mac and deletes itself after a week.",
      "Once an hour he turns it into a short summary. The lasting things, like who Riya is, are saved to your Braino account.",
      "Password managers, banking apps and private browser windows are never in the diary.",
      "Say “pause memory” and he stops. Switch it off in Settings anytime.",
    ],
  },
  {
    name: "Only when I ask",
    tag: "",
    p: "Braino looks at your screen only in the moment you ask him something. No diary, nothing in the background. He still helps, you will just explain a little more.",
    facts: [
      "Nothing is recorded in the background.",
      "Things you tell him directly can still be remembered.",
      "Switch to Learn my day anytime.",
    ],
  },
];

const SECTIONS: { k: string; h: string; items: string[] }[] = [
  {
    k: "Your screen",
    h: "What he sees, and when",
    items: [
      "When you ask about your screen, Braino takes a picture of it, reads it, and deletes the picture from your Mac.",
      "The picture is sent to the AI that reads it (see below). We do not store your screenshots on our servers.",
      "In Learn my day, he also reads the words in the window you are using, every few seconds, for your diary. The picture is deleted and only the text is kept, on your Mac.",
      "Cowork, where he watches your screen to offer help, is off unless you turn it on.",
    ],
  },
  {
    k: "Your voice",
    h: "What he hears, and when",
    items: [
      "“Hey Braino” is off until you turn it on. When it is on, listening for his name happens on your Mac. Nothing is sent until he wakes.",
      "Typing with your voice (Option twice) is turned into text on your Mac.",
      "When you talk to him, what you say is sent to the AI so he can understand and answer.",
      "Lecture and meeting notes start only when you start them.",
      // TODO(owner): confirm the on-screen recording indicator for lecture and meeting notes, then describe it here.
    ],
  },
  {
    k: "The cloud",
    h: "What leaves your Mac",
    items: [
      "Your requests, and what is on your screen when you ask, go to the AI models that think for him: OpenAI and Anthropic. His voice is made by Fish Audio.",
      "Those companies' business terms do not train their models on what we send by default.",
      "The lasting things he remembers about you are kept in your Braino account, so he knows you on any Mac.",
      "Your notes from lectures and meetings are kept in your account.",
      // TODO(owner): name how long the AI providers keep request data under our contracts, once confirmed.
    ],
  },
  {
    k: "Improving Braino",
    h: "Your conversations, your choice",
    items: [
      "If “Help make Braino better” is on, what you say to him and what he answers is saved so we can find what went wrong and make him better.",
      "Turn it off in onboarding or in Settings, and your conversations stop being saved for this.",
      "We never sell your data.",
    ],
  },
  {
    k: "Asking first",
    h: "He asks before he acts",
    items: [
      "Anything that sends a message, spends money, posts in public or deletes something waits for your yes.",
      "For bigger jobs, he tells you the plan before he starts, and you can stop him at any step.",
      "If something goes wrong, he tells you what happened instead of pretending it worked.",
      // TODO(owner): verify every action path (including scheduled X posts) goes through approval before this list is called complete.
    ],
  },
  {
    k: "Your Mac",
    h: "Why he asks for permissions",
    items: [
      "Microphone: so he can hear you, and your meetings when you ask.",
      "Screen Recording: so he can see what you see.",
      "Accessibility: so he can click and type for you.",
      "Contacts: so he knows who’s who when you say a name.",
    ],
  },
  {
    k: "In your hands",
    h: "Seeing and deleting what he keeps",
    items: [
      "Ask him “what do you remember about me?” and he will tell you.",
      "Switch off Learn my day and the diary stops. The diary on your Mac clears itself within a week.",
      "Deleting your account deletes everything he remembers about you.",
      "When you quit Braino, nothing runs in the background.",
      // TODO(owner): add the exact steps to delete an account and all data, and what is left on the Mac after uninstalling.
    ],
  },
];

export default function Trust() {
  const { theme, toggle } = useAffTheme();
  const root = useAffReveal([]);
  useEffect(() => { document.title = "Trust · Braino"; }, []);
  return (
    <div className="aff tr" data-theme={theme} ref={root}>
      <AffNav theme={theme} onToggle={toggle} />
      <header className="tr-hero">
        <div className="aff-wrap">
          <p className="ah-kicker">Trust</p>
          <h1 className="aff-h1">Braino learns your day so he can help with it. <em>You choose how much.</em></h1>
          <p className="tr-lede">Here is exactly what he sees, hears, keeps and sends, in plain words. No fine print.</p>
        </div>
      </header>

      <section className="tr-modes">
        <div className="aff-wrap">
          <p className="ah-kicker">Two ways to have him</p>
          <div className="tr-mode-grid">
            {MODES.map((m) => (
              <div key={m.name} className={"tr-mode" + (m.tag ? " is-rec" : "")}>
                <div className="tr-mode-top"><h2>{m.name}</h2>{m.tag && <span>{m.tag}</span>}</div>
                <p>{m.p}</p>
                <ul>{m.facts.map((f) => <li key={f}>{f}</li>)}</ul>
              </div>
            ))}
          </div>
          <p className="tr-note">You pick when you set Braino up, and you can change it anytime in Settings.</p>
        </div>
      </section>

      {SECTIONS.map((s) => (
        <section key={s.k} className="tr-sec">
          <div className="aff-wrap tr-sec-in aff-reveal">
            <div><p className="ah-kicker">{s.k}</p><h2>{s.h}</h2></div>
            <ul>{s.items.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </section>
      ))}

      <section className="tr-sec tr-end">
        <div className="aff-wrap">
          <p>Something here unclear, or something we missed? <Link to="/contact">Ask us</Link>. Read the full <Link to="/privacy">privacy policy</Link> and <Link to="/terms">terms</Link>.</p>
        </div>
      </section>
      <AffFooter />
    </div>
  );
}
