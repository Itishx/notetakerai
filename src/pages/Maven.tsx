import { Link } from "react-router-dom";
import "./maven.css";

/* Maven (2026-10-26): the new name for BrainoHERA, Affective's memory and
   voice engine. The mark is two slanted pills that fade from ink to air,
   drawn in code so it stays sharp at any size. */

export function MavenMark({ size = 120 }: { size?: number }) {
  return (
    <svg className="mv-mark" width={size} height={size * 0.625} viewBox="0 0 240 150" role="img" aria-label="Maven">
      <defs>
        <linearGradient id="mv-fade" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0" stopColor="#000" />
          <stop offset="0.45" stopColor="#111" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(72 75) rotate(41)" fill="url(#mv-fade)" />
      <rect x="-22" y="-74" width="44" height="148" rx="22" transform="translate(168 75) rotate(41)" fill="url(#mv-fade)" />
    </svg>
  );
}

const POINTS = [
  { h: "Speak, it writes", p: "Hold two keys, talk, let go. Your words land where your cursor is, punctuated and cleaned up, in about a second." },
  { h: "Writes like you", p: "Lists, rupees, lakh and crore, Indian phone numbers, the corrections you make mid-sentence. Trained on how real people actually talk." },
  { h: "Remembers you", p: "The names you use, the way you write, what you said yesterday. Maven is the memory and voice under Braino." },
];

export default function Maven() {
  return (
    <main className="mv-page">
      <section className="mv-hero">
        <MavenMark size={220} />
        <h1>Maven</h1>
        <p className="mv-sub">Memory and voice engine</p>
        <p className="mv-line">The part of Braino that hears you and remembers you. Private preview on Mac.</p>
        <div className="mv-go">
          <Link to="/braino" className="mv-btn">Meet Braino</Link>
          <Link to="/" className="mv-btn mv-ghost">Affective</Link>
        </div>
      </section>
      <ul className="mv-points">
        {POINTS.map((x) => (
          <li key={x.h}><h3>{x.h}</h3><p>{x.p}</p></li>
        ))}
      </ul>
    </main>
  );
}
