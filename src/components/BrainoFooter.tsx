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
   landing page's sections first, then Braino Foundry and its two engines, then what
   everything runs on, then the reading. Foundry is no longer a column of its
   own, because the landing page stopped selling it as a third product.
   The original hide/restore reasoning lives in:
   Braino Knowledge Base/design/waitlist-navigation.md#hidden-footer-link-map
   ============================================================================ */

const FOOTER_COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    // Two tiers, in the order the site argues them: the companion is how you
    // meet him, Foundry is what you hire. Distra is no longer a column of its
    // own, because it stopped being a product and became one of Foundry's two
    // engines, and a footer that still lists it top level teaches the old shape.
    head: "Braino",
    links: [
      ["What he does", "/#does"],
      ["Who it is for", "/#who"],
      ["Why not another AI tool", "/#why"],
      ["Pricing", "/#pricing"],
      ["Questions", "/#faq"],
    ],
  },
  {
    head: "Braino Foundry",
    links: [
      ["Braino Foundry", "/braino?view=foundry"],
      ["Braino Code", "/braino?view=foundry#code"],
      ["Braino Distra", "/braino?view=foundry#distra"],
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
