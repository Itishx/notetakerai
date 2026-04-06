import { Bot, ArrowRight, Zap, Download, MousePointer, Mail, Play, ShoppingCart, Search, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const demos = [
  {
    site: "Netflix",
    icon: Play,
    prompt: "Play Stranger Things Season 4 Episode 2",
    steps: ["Navigate to netflix.com", "Find Stranger Things", "Select Season 4", "Click Episode 2 → Play"],
  },
  {
    site: "Gmail",
    icon: Mail,
    prompt: "Send an email to alex@example.com saying the meeting is at 3pm",
    steps: ["Open Gmail", "Click Compose", "Type recipient address", "Write message → Send"],
  },
  {
    site: "Amazon",
    icon: ShoppingCart,
    prompt: "Search for noise cancelling headphones under $100",
    steps: ["Navigate to amazon.com", "Type search query", "Apply price filter", "Show results"],
  },
  {
    site: "Google",
    icon: Search,
    prompt: "Search for the latest AI research papers",
    steps: ["Navigate to google.com", "Type search query", "Press Enter"],
  },
];

const capabilities = [
  { title: "Click anything", desc: "Finds buttons, links, and interactive elements by what they say, not cryptic selectors." },
  { title: "Type naturally", desc: "Works in Gmail, Notion, Google Docs, React apps — any input field on any site." },
  { title: "Navigate anywhere", desc: "Say 'open YouTube' from any page. It just goes there." },
  { title: "Select dropdowns", desc: "Netflix season picker, country selectors, any <select> dropdown handled natively." },
  { title: "Context aware", desc: "Remembers what you said earlier in the conversation. Mention an email once, it uses it." },
  { title: "Runs until done", desc: "No arbitrary step limit. Keeps retrying until the task completes or you stop it." },
];

const BrowserAgent = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Bot className="w-3.5 h-3.5" />
            Browser Agent · Premium
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Tell your browser
            <br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>what to do</em>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            SideBrain's Browser Agent reads the page, clicks buttons, fills forms, and navigates — just from a plain text instruction in your sidebar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <Link to="/premium">
              <Button className="h-12 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md">
                <Zap className="w-4 h-4 mr-2" />
                Get Premium to unlock
              </Button>
            </Link>
            <Link to="/">
              <Button variant="ghost" className="h-12 px-8 text-base text-muted-foreground hover:text-foreground transition-colors duration-300">
                Download free
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Demo cards */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-4">What it can do</p>
        <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-16">Type a plain sentence. The agent figures out every step.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {demos.map((demo, i) => (
            <div
              key={demo.site}
              className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              {/* Site badge */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                  <demo.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">{demo.site}</span>
              </div>

              {/* Prompt bubble */}
              <div className="bg-foreground text-background rounded-2xl rounded-tl-sm px-4 py-3 text-sm mb-6 inline-block max-w-full">
                "{demo.prompt}"
              </div>

              {/* Steps */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {demo.steps.map((step, j) => (
                  <span key={step} className="contents">
                    <span className="text-xs px-3 py-1 rounded-full bg-card border border-border/60 text-muted-foreground">{step}</span>
                    {j < demo.steps.length - 1 && (
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* How it works */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">How it works</p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { num: "01", title: "You describe the task", desc: "Type anything in plain language. 'Send a follow-up email to my last contact' or 'Play the next episode'." },
            { num: "02", title: "Agent reads the page", desc: "It scans all buttons, inputs, links, and dropdowns on the current page to understand what's available." },
            { num: "03", title: "Agent acts, step by step", desc: "Clicks, types, navigates, selects — one action at a time, re-reading the page between each step until done." },
          ].map((item, i) => (
            <div
              key={item.num}
              className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <span className="text-3xl text-primary/15 font-normal leading-none block mb-6">{item.num}</span>
              <h3 className="text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Capabilities grid */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Capabilities</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {capabilities.map((cap, i) => (
            <div
              key={cap.title}
              className="p-6 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.05 + i * 0.08}s` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />
                <h3 className="text-sm text-foreground">{cap.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Thinking block preview */}
      <section className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
          <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-12">What you see while it works</p>

          {/* Simulated chat UI */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* User message */}
            <div className="flex justify-end mb-4">
              <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-xs">
                Send a quick hello to alex@gmail.com
              </div>
            </div>

            {/* Agent thinking block */}
            <div className="border border-border/60 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full border border-muted-foreground/30 border-t-transparent animate-spin" />
                <span className="italic">Agent · 4 steps ▸</span>
              </div>
              <div className="border-t border-border/60 px-4 py-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">✓ Navigate to mail.google.com</p>
                <p className="text-xs text-muted-foreground">✓ Click Compose</p>
                <p className="text-xs text-muted-foreground">✓ Type recipient address</p>
                <p className="text-xs text-muted-foreground/40 italic">Thinking…</p>
              </div>
            </div>

            {/* Final reply */}
            <div className="text-sm text-muted-foreground px-1">
              ✅ Email sent to alex@gmail.com with subject "Hello"
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <h2 className="text-3xl md:text-5xl font-normal text-foreground mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Your browser,<br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>on autopilot</em>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-10 text-sm leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Browser Agent is a Premium feature. Get it with the full SideBrain suite — recording, notes, page chat, and now browser control.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
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
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
          <Bot className="w-5 h-5 text-primary/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground/50">SideBrain Browser Agent — in your sidebar, in control</p>
        </div>
      </footer>
    </div>
  );
};

export default BrowserAgent;
