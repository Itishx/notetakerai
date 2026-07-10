import { Link } from "react-router-dom";

/* The shared site footer for the editorial (Medium-style) pages: root Home plus the
   converted Use Cases / Automations / Integrations / Delegate pages. Styled by home.css
   (.home-footer*), so any page using it must import "./home.css" (or be inside .home). */
export default function SiteFooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-inner">
        <div className="home-footer-top">
          <div className="home-footer-brand-block">
            <div className="home-footer-brand">
              <img src="/favicon.svg" alt="Braino" width="22" height="22" />
              <strong>Braino</strong>
            </div>
            <p className="home-footer-tagline">An AI agent that floats on every tab. Reads pages. Speaks back. Handles tasks.</p>
            <Link to="/auth" className="home-cta home-footer-cta">Get started →</Link>
          </div>
          <div className="home-footer-cols">
            <div className="home-footer-col">
              <div className="home-footer-col-head">Product</div>
              <Link to="/use-cases">Use Cases</Link>
              <Link to="/delegate">Delegate</Link>
              <Link to="/premium">Pricing</Link>
              <Link to="/changelog">Changelog</Link>
            </div>
            <div className="home-footer-col">
              <div className="home-footer-col-head">Resources</div>
              <Link to="/chat">Braino Chat</Link>
              <Link to="/integrations">Integrations</Link>
              <Link to="/remote-agent">Remote Agent</Link>
              <Link to="/straight-talk">Straight talk on the agent</Link>
              <Link to="/why-the-wait">Why Braino takes a beat</Link>
              <Link to="/contact">Contact</Link>
            </div>
            <div className="home-footer-col">
              <div className="home-footer-col-head">Legal</div>
              <Link to="/privacy">Privacy Policy</Link>
              <Link to="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className="home-footer-bottom">
          <span>© 2026 Braino · Built by a solo founder, somewhere with good coffee.</span>
          <span>Beta</span>
        </div>
      </div>
    </footer>
  );
}
