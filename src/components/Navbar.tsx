import { Link, useLocation } from "react-router-dom";
import { Bookmark, Menu, X, Sun, Moon, User, LogOut } from "lucide-react";
import SideBrainLogo from "@/components/SideBrainLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user, profile, signOut } = useAuth();

  const links = [
    { to: "/use-cases", label: "Use Cases" },
    { to: "/delegate", label: "Delegate" },
    { to: "/reddit", label: "Reddit" },
    { to: "/compare", label: "vs Claude" },
    { to: "/premium", label: "Premium" },
  ];

  return (
    <>
    {/* Main nav pill — always perfectly centered */}
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-full border border-border/40 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5">
        <div className="px-8 h-14 flex items-center">
          {/* Logo */}
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex-shrink-0 flex items-center text-foreground hover:text-primary transition-colors duration-200">
            <SideBrainLogo sizeClass="text-sm" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 mx-8 whitespace-nowrap">
            {links.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => window.scrollTo(0, 0)}
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
                onClick={() => { setMenuOpen(false); window.scrollTo(0, 0); }}
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
    {/* Actions pill — fixed to top-right, independent of nav */}
    <div className="actions-pill hidden md:flex fixed top-4 right-4 z-50 items-center gap-2 rounded-full border border-border/40 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5 px-4 h-14">
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          title="Toggle theme"
        >
          {theme === "default" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              {profile?.display_name?.split(" ")[0] || user.email}
            </Link>
            <button
              onClick={() => signOut()}
              className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link to="/auth">
            <Button size="sm" variant="outline" className="rounded-full px-4 text-sm">
              <User className="w-3.5 h-3.5 mr-1.5" />
              Login
            </Button>
          </Link>
        )}
        <Link to="/bookmarklet">
          <Button
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-sm"
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5" />
            Install
          </Button>
        </Link>
      </div>
    </>
  );
};

export default Navbar;
