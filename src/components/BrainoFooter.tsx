import { Link } from "react-router-dom";
import BrainoFooterGame from "./BrainoFooterGame";
import "./braino-footer.css";

/* ============================================================================
   BrainoFooter — the footer IS the game. A blue Mario-style sky over a brick
   ground, with jumpable pixel platforms beneath the footer content.

   The public navigation columns are intentionally hidden while their pages are
   unfinished. Their exact restore map lives in:
   Braino Knowledge Base/design/waitlist-navigation.md#hidden-footer-link-map
   ============================================================================ */

export default function BrainoFooter() {
  return (
    <footer className="braino-footer mario">
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
