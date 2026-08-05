import { Link } from "react-router-dom";
import BrainoFooterGame from "./BrainoFooterGame";
import "./braino-footer.css";

/* ============================================================================
   BrainoFooter — the footer IS the game. A blue Mario-style sky over a brick
   ground, with jumpable pixel platforms beneath the footer content.
   ============================================================================ */

export default function BrainoFooter() {
  return (
    <footer className="braino-footer mario">
      <div className="bf-cols">
        <div className="bf-col">
          <h4>Product</h4>
          <Link to="/product-overview">Overview</Link>
          <Link to="/product-overview#classes">The three classes</Link>
          <Link to="/premium">Pricing</Link>
          <Link to="/premium">Download for Mac</Link>
        </div>
        <div className="bf-col">
          <h4>Resources</h4>
          <Link to="/journal">Journal</Link>
          <Link to="/changelog">Changelog</Link>
          <Link to="/knowledge">Knowledge Base</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
        <div className="bf-col">
          <h4>Connect</h4>
          <a href="https://x.com/brainosays" target="_blank" rel="noreferrer">X · @brainosays</a>
          <a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a>
          <a href="https://youtube.com" target="_blank" rel="noreferrer">YouTube</a>
          <Link to="/contact">Contact</Link>
        </div>
        <div className="bf-col">
          <h4>Disclaimer</h4>
          <p>Braino only sees your screen the moment you invoke him. Nothing is captured, nothing is stored.</p>
        </div>
      </div>

      <div className="bf-game-window">
        <div className="bf-baseline">
          <span>© 2026 Braino</span>
          <span>Built by one person, obsessively.</span>
        </div>
        <BrainoFooterGame />
      </div>
    </footer>
  );
}
