import { Link, useLocation } from "react-router-dom";
import { Download, Menu, X, Sun, Moon, User, LogOut } from "lucide-react";
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

  const handleDownload = () => {
    fetch("/sidebrain-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "sidebrain-extension.zip";
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(() => alert("Extension not yet packaged. Please check back soon."));
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/use-cases", label: "Use Cases" },
    { to: "/notion-sync", label: "Notion Sync" },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-3xl rounded-full border border-border/40 bg-background/80 backdrop-blur-xl shadow-lg shadow-black/5">
      <div className="px-6 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center text-foreground hover:text-primary transition-colors duration-200">
          <SideBrainLogo sizeClass="text-sm" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
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

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            title={theme === "default" ? "Switch to clean theme" : "Switch to default theme"}
          >
            {theme === "default" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <Button
            onClick={handleDownload}
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-5 text-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download Free
          </Button>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 px-6 py-4 flex flex-col gap-4">
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
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 rounded-full border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === "default" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
            <Button
              onClick={() => { handleDownload(); setMenuOpen(false); }}
              size="sm"
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 w-fit px-5 text-sm"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Free
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
