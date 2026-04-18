import { Bot, ArrowRight, Zap, Mail, Globe, Plane, ChevronRight, FlaskConical, Smartphone, MonitorSmartphone, MapPin, ShoppingBag, Utensils, Briefcase, Calendar, Music, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const examples = [
  {
    category: "Email",
    prompt: "Send an email to alex@work.com — subject 'Quick update', body 'Meeting pushed to 4pm today'",
    steps: ["Build Gmail compose URL", "Open pre-filled draft", "Send"],
    works: "great" as const,
    icon: Mail,
  },
  {
    category: "Flights",
    prompt: "Search for flights from Mumbai to Delhi for 25th April, economy on MakeMyTrip",
    steps: ["Build MakeMyTrip URL", "Open with results"],
    works: "great" as const,
    icon: Plane,
  },
  {
    category: "Hotels",
    prompt: "Search for hotels in Goa from 1st May to 3rd May on Booking.com",
    steps: ["Build Booking.com URL", "Open with results"],
    works: "great" as const,
    icon: Hotel,
  },
  {
    category: "Shopping",
    prompt: "Search for boAt Airdopes on Amazon India",
    steps: ["Build Amazon search URL", "Open results"],
    works: "great" as const,
    icon: ShoppingBag,
  },
  {
    category: "Shopping",
    prompt: "Search for oversized t-shirts on Flipkart",
    steps: ["Build Flipkart URL", "Open results"],
    works: "great" as const,
    icon: ShoppingBag,
  },
  {
    category: "Food",
    prompt: "Search for biryani places in Pune on Zomato",
    steps: ["Build Zomato URL", "Open results"],
    works: "great" as const,
    icon: Utensils,
  },
  {
    category: "Jobs",
    prompt: "Search for product manager jobs in Bangalore on LinkedIn",
    steps: ["Build LinkedIn jobs URL", "Open results"],
    works: "great" as const,
    icon: Briefcase,
  },
  {
    category: "Maps",
    prompt: "Get directions from Bandra to Juhu Beach on Google Maps",
    steps: ["Build Maps directions URL", "Open route"],
    works: "great" as const,
    icon: MapPin,
  },
  {
    category: "Productivity",
    prompt: "Create a new Google Doc",
    steps: ["Navigate to docs.new", "Doc opens instantly"],
    works: "great" as const,
    icon: Globe,
  },
  {
    category: "Productivity",
    prompt: "Create a calendar event — team standup, tomorrow at 10am",
    steps: ["Build Calendar URL", "Open pre-filled event"],
    works: "great" as const,
    icon: Calendar,
  },
  {
    category: "Media",
    prompt: "Search for 'Tum Hi Ho' on Spotify",
    steps: ["Build Spotify search URL", "Open results"],
    works: "great" as const,
    icon: Music,
  },
  {
    category: "Media",
    prompt: "Search for Kanan Gill stand-up on YouTube",
    steps: ["Build YouTube search URL", "Open results"],
    works: "great" as const,
    icon: Globe,
  },
];

const howItWorks = [
  {
    num: "01",
    title: "Type a task in plain language",
    desc: "In the SideBrain sidebar, switch to Delegate mode and describe what you want. No commands, no syntax — just plain English.",
  },
  {
    num: "02",
    title: "It reads the page and plans",
    desc: "Delegate scans the current page — buttons, inputs, links, forms — and figures out the exact sequence of actions needed to complete your task.",
  },
  {
    num: "03",
    title: "It acts, step by step",
    desc: "Clicks, types, navigates, submits — one action at a time. You can watch it work in real time in the sidebar, and stop it any time.",
  },
];

const WorksBadge = ({ works }: { works: "great" | "usually" | "sometimes" }) =>
  works === "great" ? (
    <span className="text-xs px-2.5 py-1 rounded-full border border-green-500/30 text-green-600/80 bg-green-500/8">
      ✓ Works great
    </span>
  ) : works === "usually" ? (
    <span className="text-xs px-2.5 py-1 rounded-full border border-border/60 text-muted-foreground/60 bg-card/40">
      Usually works
    </span>
  ) : (
    <span className="text-xs px-2.5 py-1 rounded-full border border-border/40 text-muted-foreground/40 bg-card/20">
      Hit or miss
    </span>
  );

const Delegate = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-20 text-center">
          <div
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary mb-8 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            Experimental · Premium only
          </div>

          <h1
            className="text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            Meet
            <br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>
              SideBrain Delegate
            </em>
          </h1>

          <p
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in"
            style={{ animationDelay: "0.4s" }}
          >
            Tell your browser what to do in plain English — and watch it happen. Delegate navigates, clicks, fills forms, and sends emails so you don't have to.
          </p>

          <div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.6s" }}
          >
            <Link to="/premium">
              <Button className="h-12 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md">
                <Zap className="w-4 h-4 mr-2" />
                Unlock with Premium
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="h-12 px-8 text-base text-muted-foreground hover:text-foreground transition-colors">
                Download free first <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Honest note */}
      <section className="container mx-auto px-6 pb-12">
        <div
          className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card/60 p-7 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.7s" }}
        >
          <div className="flex items-start gap-4">
            <FlaskConical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">Before you try it</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Delegate is experimental — it's genuinely powerful for the things it handles well. Simple tasks like sending emails, navigating, and searching work reliably. Complex multi-step flows are still improving. The more you use it, the better you'll learn what to ask it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* How it works */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">How it works</p>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {howItWorks.map((item, i) => (
            <div
              key={item.num}
              className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <span className="text-3xl text-primary/40 font-normal leading-none block mb-6">{item.num}</span>
              <h3 className="text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Phone control bonus */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-primary/70 bg-primary/8 border border-primary/15 rounded-full px-3 py-1 mb-6">
              <Smartphone className="w-3 h-3" /> Bonus feature
            </div>
            <h2 className="text-3xl md:text-4xl font-normal text-foreground leading-snug mb-4">
              Control it<br />
              <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>from your phone</em>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Open the SideBrain app on your phone, type a task, and it runs on your desktop browser. Your laptop doesn't need to be in front of you.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mb-8">
              On your commute? Ask it to open your inbox and draft a reply. Lying in bed? Tell it to queue up something on Netflix. Delegate does it while you're away.
            </p>
            <Link to="/remote-agent">
              <Button variant="outline" className="h-10 px-6 text-sm rounded-full">
                Try Remote Control <ArrowRight className="w-3.5 h-3.5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="w-64 rounded-[2rem] border-2 border-border/60 bg-card/60 overflow-hidden shadow-lg">
              {/* Phone header */}
              <div className="px-5 pt-6 pb-4 border-b border-border/40">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MonitorSmartphone className="w-2.5 h-2.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-foreground">SideBrain</span>
                </div>
                <p className="text-xs text-muted-foreground/60">Hey, what do you want me to do?</p>
              </div>
              {/* Command cards */}
              <div className="px-4 py-4 space-y-2.5">
                <div className="rounded-xl border border-green-500/20 bg-green-500/4 px-3 py-2.5">
                  <p className="text-xs text-foreground font-medium mb-1 line-clamp-1">Play Kanan Gill on YouTube</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] text-green-600/70">Done</span>
                  </div>
                </div>
                <div className="rounded-xl border border-primary/15 bg-primary/4 px-3 py-2.5">
                  <p className="text-xs text-foreground font-medium mb-1 line-clamp-1">Search flights to Goa on MakeMyTrip</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] text-primary/70">Running · step 2</span>
                  </div>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/40 px-3 py-2.5">
                  <p className="text-xs text-foreground font-medium mb-1 line-clamp-1">Open Amazon, search headphones</p>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground/40">Waiting…</span>
                  </div>
                </div>
              </div>
              {/* Input */}
              <div className="px-4 pb-5 pt-1">
                <div className="flex items-center gap-2 bg-background/60 border border-border/40 rounded-xl px-3 py-2">
                  <span className="text-[10px] text-muted-foreground/30 flex-1">Type a task…</span>
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <ArrowRight className="w-2.5 h-2.5 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Test Delegate section */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-3">What it can do</p>
        <h2 className="text-center text-3xl md:text-4xl font-normal text-foreground mb-4">
          12 things it handles well
        </h2>
        <p className="text-center text-sm text-muted-foreground max-w-md mx-auto mb-16 leading-relaxed">
          All tested. These work reliably — try them yourself after installing the extension.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {examples.map((ex, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.05 + i * 0.05}s` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ex.icon className="w-3 h-3 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">{ex.category}</span>
                </div>
                <WorksBadge works={ex.works} />
              </div>

              <p className="text-sm text-foreground leading-snug mb-4">
                "{ex.prompt}"
              </p>

              <div className="flex items-center gap-1 flex-wrap">
                {ex.steps.map((step, j) => (
                  <span key={step} className="contents">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-card border border-border/50 text-muted-foreground/60">
                      {step}
                    </span>
                    {j < ex.steps.length - 1 && (
                      <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/20 flex-shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Live preview mock */}
        <div className="max-w-xl mx-auto mt-16">
          <p className="text-center text-xs tracking-widest uppercase text-muted-foreground/40 mb-8">What you see in the sidebar while it runs</p>
          <div className="rounded-2xl border border-border/60 bg-card/40 p-7">
            <div className="flex justify-end mb-4">
              <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-xs">
                Send a hello to alex@gmail.com
              </div>
            </div>
            <div className="border border-border/60 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full border border-muted-foreground/30 border-t-transparent animate-spin" />
                <span className="italic">Delegate · working…</span>
              </div>
              <div className="border-t border-border/60 px-4 py-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">✓ Navigate to mail.google.com</p>
                <p className="text-xs text-muted-foreground">✓ Click Compose</p>
                <p className="text-xs text-muted-foreground">✓ Type recipient address</p>
                <p className="text-xs text-muted-foreground/40 italic">Typing message…</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground px-1">✅ Email sent to alex@gmail.com</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h2
          className="text-3xl md:text-5xl font-normal text-foreground mb-5 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.1s" }}
        >
          Delegate is<br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>
            Premium only
          </em>
        </h2>
        <p
          className="text-muted-foreground max-w-md mx-auto mb-10 text-sm leading-relaxed opacity-0 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          Delegate — plus recording, notes, Notion sync, and remote phone control — all come with Premium. One subscription, the full stack.
        </p>
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in"
          style={{ animationDelay: "0.3s" }}
        >
          <Link to="/premium">
            <Button className="h-12 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md">
              <Zap className="w-4 h-4 mr-2" />
              Get Premium
            </Button>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="h-12 px-8 text-base text-muted-foreground hover:text-foreground">
              Download free first <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
          <FlaskConical className="w-5 h-5 text-primary/30 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-xs text-muted-foreground/40">SideBrain Delegate — experimental, useful when it works, honest about when it doesn't</p>
        </div>
      </footer>
    </div>
  );
};

export default Delegate;
