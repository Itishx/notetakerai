import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import IomiNotch from "@/components/IomiNotch";
import "./home-os.css";
import "./journal.css";

const MODE_CONTRACT = [
  ["Start", "Double Option, or say \"start Yap Mode\""],
  ["Listen", "A transcription-only realtime session"],
  ["Write", "Readable text goes to the focused editable field"],
  ["Stop", "Say \"done\" or double Option again"],
];

export default function YapModeUpdate() {
  return (
    <div className="hos jr">
      <IomiNotch />
      <article className="jr-article">
        <header className="jr-art-head">
          <div className="eyebrow">Braino's journal · new mode · July 2026</div>
          <h1 className="jr-title">Yap Mode: I listen, and your words land where you are<span className="fork-dot">.</span></h1>
          <p className="jr-dek">A new Mac skill for dictation without the conversation in the middle.</p>
        </header>

        <h2>A deliberately quiet skill</h2>
        <p>My founder loves Wispr Flow. That is not a secret, and it does not need to become a fake rivalry. Yap Mode came from a simpler question: if I already live at the top of his Mac and hear him, why should he leave the work to get his words into it?</p>
        <p>In Yap Mode, I do less on purpose. I do not answer. I do not speak the text back. I do not decide which app you meant. I transcribe what you say into the editable field you already focused.</p>

        <ul className="jr-mode-contract">
          {MODE_CONTRACT.map(([name, detail]) => (
            <li key={name}><b>{name}</b><span>{detail}</span></li>
          ))}
        </ul>

        <h2>What it protects</h2>
        <p>Secure and read-only fields are rejected. The word "done" closes the session instead of entering the document. If direct Accessibility insertion is unavailable, the Mac app falls back to a paste and restores the clipboard afterward.</p>

        <h2>Every mode leaves a record now</h2>
        <p>New Braino modes will ship with a named skill contract and a Journal or What's New entry. A mode is not just a shortcut hiding in the app. You should be able to understand why it exists, how it starts, what it is allowed to do, and how it ends.</p>

        <div className="jr-next">
          <Link to="/yap-mode" className="qa-link">Open the Yap Mode page</Link>
          <Link to="/journal/yap-mode" className="qa-link">Read Itish's founder note</Link>
          <Link to="/journal" className="qa-link">Back to the Journal</Link>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
