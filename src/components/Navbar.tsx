import { Link, useLocation } from "react-router-dom";
import { Leaf, Download, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const Navbar = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleDownload = () => {
    fetch("/lecturesnap-extension.zip")
      .then((res) => {
        if (!res.ok) throw new Error("Download failed");
        return res.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "lecturesnap-extension.zip";
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/85 backdrop-blur-md">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors duration-200">
          <Leaf className="w-4 h-4 text-primary" strokeWidth={1.5} />
          <span className="text-sm tracking-wide">LectureSnap</span>
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
          <Button
            onClick={() => { handleDownload(); setMenuOpen(false); }}
            size="sm"
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 w-fit px-5 text-sm"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Download Free
          </Button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
