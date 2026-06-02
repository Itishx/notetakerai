import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { EXTENSION_DOWNLOAD_URL } from "@/lib/extensionDownload";

const NAV_LINKS = [
  { href: "/use-cases", label: "Use Cases" },
  { href: "/automations", label: "Automations" },
  { href: "/integrations", label: "Integrations" },
  { href: "/delegate", label: "Delegate" },
  { href: "/compare", label: "vs Claude" },
  { href: "/premium", label: "Pricing" },
];

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const GLOW_CSS = `
  @keyframes brainoGlow {
    0%, 100% { filter: drop-shadow(0 0 5px rgba(201,84,74,0.4)) drop-shadow(0 0 12px rgba(201,84,74,0.15)); }
    50%       { filter: drop-shadow(0 0 10px rgba(201,84,74,0.75)) drop-shadow(0 0 24px rgba(201,84,74,0.35)); }
  }
  .braino-glow {
    animation: brainoGlow 2.4s ease-in-out infinite;
    cursor: pointer;
  }
  .braino-chevron {
    transition: transform 0.35s cubic-bezier(0.34, 1.4, 0.64, 1);
    flex-shrink: 0;
  }
  .braino-chevron.open {
    transform: rotate(90deg);
  }
  .braino-links-wrap {
    display: flex;
    align-items: center;
    gap: 2px;
    overflow: hidden;
    max-width: 0;
    opacity: 0;
    transition: max-width 0.48s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.28s ease;
  }
  .braino-links-wrap.open {
    max-width: 760px;
    opacity: 1;
  }
  .braino-link-item {
    opacity: 0;
    transform: translateX(-6px);
    transition: color .15s, opacity .18s, transform .22s;
  }
  .braino-links-wrap.open .braino-link-item {
    opacity: 1;
    transform: translateX(0);
  }
  @media (max-width: 1120px) {
    .braino-links-wrap.open {
      max-width: 680px;
    }
    .braino-link-item {
      font-size: 13px;
    }
  }
`;

const Navbar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [expanded, setExpanded] = useState(() => localStorage.getItem("braino-nav-open") !== "false");
  const isDark = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Persist expanded state across pages
  const toggle = () => setExpanded(v => {
    const next = !v;
    localStorage.setItem("braino-nav-open", String(next));
    return next;
  });

  const pillBg = isDark
    ? scrolled ? "rgba(22,18,13,0.97)" : "rgba(22,18,13,0.88)"
    : scrolled ? "rgba(246,241,234,0.94)" : "rgba(246,241,234,0.82)";

  const pillBorder = isDark
    ? "1px solid rgba(60,45,28,0.55)"
    : "1px solid rgba(180,160,130,0.3)";

  const pillShadow = scrolled
    ? isDark
      ? "0 2px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)"
      : "0 2px 20px rgba(40,28,18,0.14), 0 1px 3px rgba(40,28,18,0.08)"
    : isDark
      ? "0 1px 8px rgba(0,0,0,0.3)"
      : "0 1px 8px rgba(40,28,18,0.08)";

  const pillStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    background: pillBg,
    backdropFilter: "saturate(160%) blur(18px)",
    WebkitBackdropFilter: "saturate(160%) blur(18px)",
    border: pillBorder,
    boxShadow: pillShadow,
    transition: "background .2s, box-shadow .2s",
    overflow: "hidden",
  };

  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: 13.5,
    color: pathname === href ? "var(--sb-ink)" : "var(--sb-ink-2)",
    textDecoration: "none",
    padding: "6px 8px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    fontWeight: pathname === href ? 500 : 400,
  });

  return (
    <>
      <style>{GLOW_CSS}</style>

      {/* ── Main nav pill (left-anchored, expands right) ── */}
      <nav
        id="braino-main-nav"
        style={{ position: "fixed", top: 16, left: 16, zIndex: 100 }}
      >
        <div style={{ ...pillStyle, padding: "5px 10px" }}>
          {/* Brain icon — click goes home */}
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            className="braino-glow"
            style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}
          >
            <img src="/favicon.svg" width={28} height={28} alt="Braino" style={{ flexShrink: 0 }} />
          </Link>

          {/* Chevron — click to expand/collapse */}
          <button
            onClick={toggle}
            style={{
              display: "flex", alignItems: "center",
              background: "none", border: "none",
              padding: "0 2px 0 4px", cursor: "pointer", flexShrink: 0,
            }}
            title={expanded ? "Collapse menu" : "Expand menu"}
          >
            <svg
              className={`braino-chevron${expanded ? " open" : ""}`}
              width="10" height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="var(--sb-ink-3)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 1 7 5 3 9" />
            </svg>
          </button>

          {/* Expandable links */}
          <div className={`braino-links-wrap${expanded ? " open" : ""}`}>
            <span style={{ width: 1, height: 16, background: "var(--sb-line-2)", margin: "0 8px 0 10px", flexShrink: 0 }} />
            {NAV_LINKS.map(({ href, label }, i) => (
              <Link
                key={href}
                to={href}
                className="braino-link-item"
                style={{
                  ...linkStyle(href),
                  transitionDelay: expanded ? `${0.06 + i * 0.055}s` : "0s",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-ink)")}
                onMouseLeave={e => (e.currentTarget.style.color = pathname === href ? "var(--sb-ink)" : "var(--sb-ink-2)")}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* ── Secondary action pill (right) ── */}
      <nav style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}>
        <div style={{ ...pillStyle, padding: "5px 6px 5px 8px", gap: 2 }}>
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              width: 32, height: 32, borderRadius: 999,
              background: "transparent", border: "none",
              display: "grid", placeItems: "center",
              color: "var(--sb-ink-3)", cursor: "pointer",
              transition: "color .15s, background .15s",
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--sb-ink)"; e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(40,28,18,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--sb-ink-3)"; e.currentTarget.style.background = "transparent"; }}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>

          <span style={{ width: 1, height: 16, background: "var(--sb-line-2)", margin: "0 2px", flexShrink: 0 }} />

          {user ? (
            <Link
              to="/dashboard"
              style={linkStyle("/dashboard")}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-ink)")}
              onMouseLeave={e => (e.currentTarget.style.color = pathname === "/dashboard" ? "var(--sb-ink)" : "var(--sb-ink-2)")}
            >
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              style={{ ...linkStyle("/auth"), fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-ink)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--sb-ink-2)")}
            >
              Sign in
            </Link>
          )}

          <a
            href={EXTENSION_DOWNLOAD_URL}
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 999,
              fontSize: 13, fontWeight: 500,
              background: "var(--sb-ink)", color: "var(--sb-on-ink)",
              textDecoration: "none",
              transition: "transform .15s, opacity .15s",
              whiteSpace: "nowrap", flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.opacity = "0.85"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.opacity = "1"; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v10M7 12h10" />
            </svg>
            Install
          </a>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
