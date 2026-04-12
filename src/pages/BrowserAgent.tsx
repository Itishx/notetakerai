import { Bot, ArrowRight, Zap, Download, MousePointer, Mail, Play, ShoppingCart, Search, ChevronRight, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const demos = [
  {
    site: "Gmail",
    icon: Mail,
    prompt: "Send an email to alex@example.com saying the meeting is at 3pm",
    steps: ["Open Gmail", "Click Compose", "Type recipient & message", "Send"],
    works: true,
  },
  {
    site: "Netflix",
    icon: Play,
    prompt: "Play Stranger Things Season 4 Episode 2",
    steps: ["Navigate to netflix.com", "Find Stranger Things", "Select Season 4", "Click Episode 2 → Play"],
    works: false,
  },
  {
    site: "Amazon",
    icon: ShoppingCart,
    prompt: "Search for noise cancelling headphones under $100",
    steps: ["Navigate to amazon.com", "Type search query", "Apply price filter", "Show results"],
    works: false,
  },
  {
    site: "Google",
    icon: Search,
    prompt: "Search for the latest AI research papers",
    steps: ["Navigate to google.com", "Type search query", "Press Enter"],
    works: true,
  },
];

const BrowserAgent = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <FlaskConical className="w-3.5 h-3.5" />
            Experimental · Included with Premium · No extra charge
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Tell your browser
            <br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>what to do</em>
          </h1>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            An experimental bonus feature tucked inside Premium. It can navigate, click, fill forms, and send emails. When it works, it's kind of magical.
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

      {/* Honest disclaimer banner */}
      <section className="container mx-auto px-6 pb-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-border/60 bg-card/60 p-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.7s" }}>
          <div className="flex items-start gap-4">
            <FlaskConical className="w-5 h-5 text-muted-foreground/60 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-foreground mb-2">A note on expectations</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Browser Agent is not why you should use SideBrain. The core of SideBrain is <strong className="text-foreground font-medium">recording lectures and meetings</strong>, <strong className="text-foreground font-medium">chatting with any page</strong>, and <strong className="text-foreground font-medium">syncing notes to Notion</strong> — things it does really well.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                The Browser Agent is an experiment we thought was cool enough to ship. It handles simple tasks like sending emails or searching — but it can be slow, it sometimes misses clicks, and it won't always finish what it started. It's a work in progress, included free with Premium because why not.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 pt-8">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Demo cards */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-4">What it can attempt</p>
        <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-16">
          Simple tasks tend to work. Complex multi-step flows are hit or miss. Gmail sends work well. Dynamic sites like Netflix are more unpredictable.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">
          {demos.map((demo, i) => (
            <div
              key={demo.site}
              className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              {/* Site badge + reliability */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <demo.icon className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">{demo.site}</span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${demo.works ? "border-green-500/20 text-green-600/70 bg-green-500/5" : "border-border/60 text-muted-foreground/50 bg-card/40"}`}>
                  {demo.works ? "Usually works" : "Sometimes wonky"}
                </span>
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
            { num: "01", title: "You describe the task", desc: "Type anything in plain language in the sidebar — 'Send a quick email to John' or 'Search for flights to Tokyo'." },
            { num: "02", title: "Agent reads the page", desc: "It scans the page for buttons, inputs, links, and dropdowns to understand what it can interact with." },
            { num: "03", title: "Agent acts, step by step", desc: "Clicks, types, navigates — one action at a time. It shows its work as it goes, so you can see exactly what it's doing (or where it's failing)." },
          ].map((item, i) => (
            <div
              key={item.num}
              className="p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              <span className="text-3xl text-primary/50 font-normal leading-none block mb-6">{item.num}</span>
              <h3 className="text-foreground mb-3">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* What actually works well */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-4">Where it actually shines</p>
        <p className="text-center text-muted-foreground text-sm max-w-md mx-auto mb-16">These are the things it handles reliably. Anything more complex is genuinely experimental.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            { title: "Sending emails", desc: "Gmail compose — type the recipient and what to say, it handles the rest. This one works well." },
            { title: "Web searches", desc: "Open Google, YouTube, or any site and search for something. Simple navigation is fast and reliable." },
            { title: "Filling forms", desc: "Works in most standard input fields. Great for repetitive form-filling on pages you visit often." },
            { title: "Clicking things", desc: "Finds buttons and links by what they say. Works on most well-structured sites, struggles on complex UIs." },
            { title: "Talking to it", desc: "Ask it questions, have it explain what's on the page, or just chat. That part is just AI and always works." },
            { title: "Simple navigation", desc: "'Open Spotify', 'go to my GitHub profile', 'scroll down' — straightforward navigation is instant." },
          ].map((cap, i) => (
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
          <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-12">What you see while it runs</p>

          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex justify-end mb-4">
              <div className="bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-xs">
                Send a quick hello to alex@gmail.com
              </div>
            </div>

            <div className="border border-border/60 rounded-xl overflow-hidden mb-4">
              <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full border border-muted-foreground/30 border-t-transparent animate-spin" />
                <span className="italic">Agent · working…</span>
              </div>
              <div className="border-t border-border/60 px-4 py-3 space-y-1.5">
                <p className="text-xs text-muted-foreground">✓ Navigate to mail.google.com</p>
                <p className="text-xs text-muted-foreground">✓ Click Compose</p>
                <p className="text-xs text-muted-foreground">✓ Type recipient address</p>
                <p className="text-xs text-muted-foreground/40 italic">Typing message…</p>
              </div>
            </div>

            <div className="text-sm text-muted-foreground px-1">
              ✅ Email sent to alex@gmail.com
            </div>
          </div>
        </div>
      </section>

      {/* What SideBrain actually is */}
      <section className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm tracking-widest uppercase text-muted-foreground/60 mb-6">What SideBrain is really about</p>
          <p className="text-muted-foreground text-base leading-relaxed mb-12">
            Browser Agent is a bonus. The actual product — the reason people use SideBrain every day — is something simpler and more reliable.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              { emoji: "🎙️", title: "Record anything", desc: "Lectures, meetings, tutorials — capture audio from any tab and get AI notes instantly." },
              { emoji: "💬", title: "Chat with any page", desc: "Ask questions about what's on screen. Summarize, explain, extract. Works on any site." },
              { emoji: "📓", title: "Sync to Notion", desc: "One tap to send your notes to Notion, beautifully formatted and ready to use." },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border border-border/60 bg-card/40">
                <div className="text-2xl mb-3">{item.emoji}</div>
                <h3 className="text-sm text-foreground mb-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10">
            <Link to="/">
              <Button variant="ghost" className="h-11 px-8 text-sm text-muted-foreground hover:text-foreground">
                See what SideBrain is actually for <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
        <h2 className="text-3xl md:text-5xl font-normal text-foreground mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Included free<br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>with Premium</em>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-10 text-sm leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Browser Agent comes bundled with Premium alongside recording, notes, and Notion sync. No separate charge. Treat it as a bonus — play with it, enjoy it when it works, don't rely on it when it doesn't.
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
          <FlaskConical className="w-5 h-5 text-primary/40 mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground/50">Browser Agent — experimental, included free, doing its best</p>
        </div>
      </footer>
    </div>
  );
};

export default BrowserAgent;
