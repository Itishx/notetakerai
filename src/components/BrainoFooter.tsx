import { Link } from "react-router-dom";
import BrainoFooterGame from "./BrainoFooterGame";
import "./braino-footer.css";

/* ============================================================================
   BrainoFooter — the footer IS the game. A blue Mario-style sky over a brick
   ground, with jumpable pixel platforms beneath the footer content.

   The navigation columns were hidden for a while, back when most of these
   destinations were unfinished. They are live pages now, so the footer carries
   them again and the game sits underneath rather than instead of them.

   The columns follow the site's own shape as of the two-page rewrite: the
   landing page's sections first, then Braino Distra and its channels, then what
   everything runs on, then the reading. Foundry is no longer a column of its
   own, because the landing page stopped selling it as a third product.
   The original hide/restore reasoning lives in:
   Braino Knowledge Base/design/waitlist-navigation.md#hidden-footer-link-map
   ============================================================================ */

const FOOTER_COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    // Two products, in the order the site now argues them: the companion is how
    // you meet him, Distra is what you hire. Foundry is gone from the columns
    // because the landing page no longer sells it as a third thing.
    head: "Braino",
    links: [
      ["What he does", "/#does"],
      ["Who it is for", "/#who"],
      ["Why not ChatGPT", "/#why"],
      ["Pricing", "/#pricing"],
      ["Questions", "/#faq"],
    ],
  },
  {
    head: "Braino Distra",
    links: [
      ["What it is", "/distra"],
      ["All channels", "/channels"],
      ["On X", "/braino-for-x"],
      ["On LinkedIn", "/braino-for-linkedin"],
      ["The full plan", "/distra/plan"],
    ],
  },
  {
    head: "Under the hood",
    links: [
      ["Braino OS", "/braino-os"],
      ["Human Intelligence", "/human-intelligence"],
      ["Emotional Intelligence", "/emotional-intelligence"],
      ["BrainoHERA", "/brainohera-teaser"],
      ["Meetings", "/meetings"],
    ],
  },
  {
    head: "Read",
    links: [
      ["Knowledge Base", "/knowledge"],
      ["Braino's journal", "/journal"],
      ["Changelog", "/changelog"],
      ["Founder's letter", "/founder-letter"],
      ["The questions page", "/questions"],
    ],
  },
];

export default function BrainoFooter() {
  return (
    <footer className="braino-footer mario">
      <nav className="bf-cols" aria-label="Footer">
        {FOOTER_COLUMNS.map((column) => (
          <div className="bf-col" key={column.head}>
            <div className="bf-col-head">{column.head}</div>
            {column.links.map(([label, to]) => (
              <Link key={label} to={to}>{label}</Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="bf-game-window">
        <div className="bf-baseline">
          <span className="bf-signoff">© 2026 Braino · Built by one person, obsessively.</span>
          <span className="bf-legal"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></span>
        </div>
        <BrainoFooterGame />
      </div>
    </footer>
  );
}
