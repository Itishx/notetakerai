import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

const NAV_LINKS = [
  { href: "/use-cases", label: "Use Cases" },
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

const Navbar = () => {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const isDark = theme === "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    gap: 2,
    borderRadius: 999,
    flexWrap: "nowrap",
    background: pillBg,
    backdropFilter: "saturate(160%) blur(18px)",
    WebkitBackdropFilter: "saturate(160%) blur(18px)",
    border: pillBorder,
    boxShadow: pillShadow,
    transition: "background .2s, box-shadow .2s",
  };

  const linkStyle = (href: string): React.CSSProperties => ({
    fontSize: 13.5,
    color: pathname === href ? "var(--sb-ink)" : "var(--sb-ink-2)",
    transition: "color .15s",
    textDecoration: "none",
    padding: "6px 10px",
    borderRadius: 999,
    whiteSpace: "nowrap",
    fontWeight: pathname === href ? 500 : 400,
  });

  return (
    <>
      {/* ── Main nav pill (centered) ── */}
      <nav
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          width: "fit-content",
          maxWidth: "calc(100vw - 220px)",
        }}
      >
        <div style={{ ...pillStyle, padding: "7px 12px 7px 14px" }}>
          <Link
            to="/"
            onClick={() => window.scrollTo(0, 0)}
            style={{ display: "flex", alignItems: "baseline", gap: 0, textDecoration: "none", marginRight: 8, flexShrink: 0 }}
          >
            <span style={{ fontFamily: "'BeVietnam', sans-serif", fontWeight: 800, fontSize: 17, color: "var(--sb-ink)", letterSpacing: "-0.03em" }}>Braino</span>
          </Link>

          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              to={href}
              style={linkStyle(href)}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--sb-ink)")}
              onMouseLeave={e => (e.currentTarget.style.color = pathname === href ? "var(--sb-ink)" : "var(--sb-ink-2)")}
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Secondary action pill (right) ── */}
      <nav
        style={{ position: "fixed", top: 16, right: 16, zIndex: 100 }}
      >
        <div style={{ ...pillStyle, padding: "5px 6px 5px 8px", gap: 2 }}>
          {/* Dark mode toggle */}
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
            href="/braino-extension.zip"
            download
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 14px", borderRadius: 999,
              fontSize: 13, fontWeight: 500,
              background: "var(--sb-ink)", color: "var(--sb-on-ink)",
              textDecoration: "none",
              transition: "transform .15s, background .15s",
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
