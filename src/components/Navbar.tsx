import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import SideBrainLogo from "@/components/SideBrainLogo";
import { cn } from "@/lib/utils";
import { useState } from "react";

const Navbar = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { to: "/", label: "Home" },
    { to: "/use-cases", label: "Use Cases" },
    { to: "/notion-sync", label: "Notion Sync" },
    { to: "/premium", label: "Premium" },
  ];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-fit flex items-center gap-2">
      <nav className="rounded-full border border-border/40 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5">
        <div className="px-8 h-14 flex items-center">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center text-foreground hover:text-primary transition-colors duration-200">
            <SideBrainLogo sizeClass="text-sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 mx-8 whitespace-nowrap">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "text-sm transition-colors duration-200",
                  pathname === to
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden ml-auto text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 px-6 py-4 flex flex-col gap-4 rounded-b-3xl">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "text-sm transition-colors duration-200",
                  pathname === to ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
