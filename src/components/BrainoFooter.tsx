import { Link } from "react-router-dom";
import BrainoFooterGame from "./BrainoFooterGame";
import "./braino-footer.css";

/* ============================================================================
   BrainoFooter — the footer IS the game. A blue Mario-style sky over a brick
   ground, with jumpable pixel platforms beneath the footer content.

   The navigation columns were hidden for a while, back when most of these
   destinations were unfinished. They are live pages now, so the footer carries
   them again and the game sits underneath rather than instead of them.
   The original hide/restore reasoning lives in:
   Braino Knowledge Base/design/waitlist-navigation.md#hidden-footer-link-map
   ============================================================================ */

const FOOTER_COLUMNS: Array<{ head: string; links: Array<[string, string]> }> = [
  {
    head: "Product",
    links: [
      ["Braino Browser", "/?view=browser"],
      ["Braino Foundry", "/?view=foundry"],
      ["BrainoHERA", "/?view=hera"],
      ["Pricing", "/premium"],
    ],
  },
  {
    // The same products, named by who they are for. People look for themselves
    // in a footer before they look for a feature.
    head: "Braino for",
    links: [
      ["The browser", "/?view=browser"],
      ["Founders", "/?view=foundry"],
      ["Solo builders", "/?view=foundry"],
      ["Mac developers", "/?view=foundry"],
      ["Meetings", "/meetings"],
      ["X", "/live"],
    ],
  },
  {
    head: "Under the hood",
    links: [
      ["Braino OS", "/braino-os"],
      ["Human Intelligence", "/human-intelligence"],
      ["Emotional Intelligence", "/emotional-intelligence"],
      ["Build your Braino", "/build-braino"],
    ],
  },
  {
    head: "Read",
    links: [
      ["Knowledge Base", "/knowledge"],
      ["Braino's journal", "/journal"],
      ["Changelog", "/changelog"],
      ["Founder's letter", "/founder-letter"],
    ],
  },
  {
    head: "More",
    links: [
      ["Integrations", "/integrations"],
      ["Braino Chat", "/chat"],
      ["Contact", "/contact"],
      ["Join the waitlist", "/overview"],
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
