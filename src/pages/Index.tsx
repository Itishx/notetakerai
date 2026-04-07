import { Mic, Download, ChevronRight, Leaf, ArrowRight, Users, Globe, Image, Bot, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SideBrainLogo from "@/components/SideBrainLogo";

const pillars = [
  {
    num: "01",
    icon: Mic,
    title: "Record Tab Audio",
    tagline: "Any tab. Any audio. Structured notes in seconds.",
    pipeline: ["Record", "Transcribe", "Structure", "Sync to Notion"],
    useCases: ["Online lectures", "Podcasts", "Language learning", "Research talks"],
  },
  {
    num: "02",
    icon: Globe,
    title: "Read Any Page",
    tagline: "SideBrain reads the page. You ask the questions.",
    pipeline: ["Open any URL", "Understand context", "Chat in real time"],
    useCases: ["LeetCode problems", "Documentation", "News articles", "Academic papers"],
  },
  {
    num: "03",
    icon: Users,
    title: "Record Meetings",
    tagline: "Multi-speaker calls, auto-documented.",
    pipeline: ["Record call", "Identify speakers", "AI meeting notes", "Sync to Notion"],
    useCases: ["Google Meet", "Zoom web", "Teams", "Sales calls"],
  },
];

const steps = [
  { num: "一", title: "Download", desc: "Get the extension and load it into your browser in under a minute." },
  { num: "二", title: "Capture", desc: "Open any tab with audio, courses, meetings, podcasts, and press record." },
  { num: "三", title: "Transform", desc: "Stop recording. AI transcribes and shapes your notes automatically." },
  { num: "四", title: "Flow", desc: "Sync to Notion or copy Markdown. Your knowledge, beautifully preserved." },
];

const Index = () => {
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

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="container relative mx-auto px-6 pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-5 py-2 text-sm text-muted-foreground mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Leaf className="w-3.5 h-3.5 text-primary" />
            Browser AI · Free to start
          </div>

          {/* Headline with orb */}
          <div className="relative">
            {/* Orb cluster A — main, drifts slowly */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift 25s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full animate-breathe"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 50% / 0.12) 0%, hsl(24 80% 50% / 0.04) 50%, transparent 70%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full animate-breathe"
                style={{ animationDelay: '1.5s', background: 'radial-gradient(circle, hsl(24 80% 50% / 0.15) 0%, hsl(24 80% 50% / 0.05) 60%, transparent 75%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[140px] h-[140px] rounded-full animate-breathe"
                style={{ animationDelay: '0.8s', background: 'radial-gradient(circle, hsl(24 80% 50% / 0.25) 0%, hsl(24 80% 50% / 0.08) 60%, transparent 80%)', boxShadow: '0 0 60px 20px hsl(24 80% 50% / 0.1)' }}
              />
            </div>
            {/* Orb B — roams opposite direction, slower */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-b 32s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[260px] h-[260px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 50% / 0.10) 0%, hsl(24 80% 50% / 0.03) 55%, transparent 75%)', animation: 'breathe 6s ease-in-out infinite', animationDelay: '2s' }}
              />
            </div>
            {/* Orb C — small, fast, top-right arc */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-c 18s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[100px] h-[100px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 80% 60% / 0.35) 0%, hsl(24 80% 50% / 0.10) 60%, transparent 80%)', boxShadow: '0 0 40px 10px hsl(24 80% 50% / 0.12)', animation: 'breathe 4s ease-in-out infinite', animationDelay: '1s' }}
              />
            </div>
            {/* Orb D — large, faint, bottom-left sweep */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ animation: 'orb-drift-d 38s ease-in-out infinite' }}>
              <div
                className="absolute top-1/2 left-1/2 w-[380px] h-[380px] rounded-full"
                style={{ background: 'radial-gradient(circle, hsl(24 70% 45% / 0.08) 0%, transparent 65%)', animation: 'breathe 8s ease-in-out infinite', animationDelay: '3s' }}
              />
            </div>

            <h1 className="relative z-10 text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Your browser,
              <br />
              <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>made smarter</em>
            </h1>
          </div>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Record tab audio. Read any page. Document meetings. Now control your browser with plain language. SideBrain is the AI layer that lives in your sidebar.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <Button
              onClick={handleDownload}
              className="h-13 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Extension
            </Button>
            <Button
              variant="ghost"
              className="h-13 px-8 text-base text-muted-foreground hover:text-foreground transition-colors duration-300"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              Learn more
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="mt-14 flex items-center justify-center gap-8 text-muted-foreground/60 text-sm opacity-0 animate-fade-in flex-wrap" style={{ animationDelay: "0.8s" }}>
            <span>Record Tab Audio</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Read Any Page</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Record Meetings</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="text-primary flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> Browser Agent</span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Three Things — Option A */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-5xl mx-auto mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            SideBrain does<br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>3 things</em>
          </h2>
        </div>
        <div className="space-y-4 max-w-5xl mx-auto">
          {pillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className="relative overflow-hidden p-8 md:p-12 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.15}s` }}
            >
              {/* Giant number watermark */}
              <span className="absolute top-6 right-8 text-[72px] font-normal text-foreground/4 leading-none select-none pointer-events-none">
                {pillar.num}
              </span>

              <div className="relative grid md:grid-cols-2 gap-8 items-start">
                {/* Left: identity */}
                <div>
                  <pillar.icon className="w-6 h-6 text-primary mb-4" strokeWidth={1.5} />
                  <h3 className="text-2xl md:text-3xl font-normal text-foreground mb-3 leading-snug">{pillar.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{pillar.tagline}</p>
                </div>

                {/* Right: pipeline + use cases */}
                <div className="space-y-6">
                  <div>
                    <p className="text-xs tracking-widest uppercase text-muted-foreground/40 mb-3">Pipeline</p>
                    <div className="flex flex-col gap-2">
                      {pillar.pipeline.map((step) => (
                        <div key={step} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{step}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs tracking-widest uppercase text-muted-foreground/40 mb-3">Use cases</p>
                    <p className="text-sm text-muted-foreground">{pillar.useCases.join(" · ")}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Browser Agent preview */}
      <section className="container mx-auto px-6 py-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
        <div className="max-w-5xl mx-auto mb-12 text-center">
          <h2 className="text-4xl md:text-5xl font-normal tracking-tight text-foreground leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            And one more thing —<br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>your browser listens now</em>
          </h2>
        </div>
        <div className="max-w-5xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/4 p-8 md:p-12 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            {/* Giant number watermark */}
            <span className="absolute top-6 right-8 text-[72px] font-normal text-primary/8 leading-none select-none pointer-events-none">
              04
            </span>

            <div className="relative grid md:grid-cols-2 gap-8 items-start mb-8">
              {/* Left: identity */}
              <div>
                <Bot className="w-6 h-6 text-primary mb-4" strokeWidth={1.5} />
                <h3 className="text-2xl md:text-3xl font-normal text-foreground mb-3 leading-snug">Browser Agent</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">Type a plain instruction. SideBrain reads the page, clicks buttons, fills forms, and navigates — no scripting, no setup.</p>
              </div>

              {/* Right: demos + use cases */}
              <div className="space-y-6">
                <div>
                  <p className="text-xs tracking-widest uppercase text-muted-foreground/40 mb-3">Try saying</p>
                  <div className="flex flex-col gap-2">
                    {[
                      "Play Stranger Things S4 E2",
                      "Send a hello email to alex@gmail.com",
                      "Search flights to Tokyo next week",
                    ].map((prompt) => (
                      <div key={prompt} className="flex items-center gap-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">"{prompt}"</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs tracking-widest uppercase text-muted-foreground/40 mb-3">Works on</p>
                  <p className="text-sm text-muted-foreground">Netflix · Gmail · Amazon · Google · any site</p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-xs text-muted-foreground/60">Premium feature — <Link to="/premium" className="text-primary hover:underline">see what else is included</Link></span>
              </div>
              <Link to="/browser-agent" className="inline-flex items-center gap-2 text-sm text-primary hover:gap-3 transition-all duration-300 whitespace-nowrap">
                Learn more <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works, bento grid */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">The flow</p>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 auto-rows-fr">

          {/* Step 1, tall, spans 2 rows on md */}
          <div className="col-span-1 row-span-2 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.1s", minHeight: 240 }}>
            <span className="text-4xl text-primary/50 font-normal leading-none">1</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Install</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Add the extension to your browser. Takes under a minute, no setup required.</p>
            </div>
          </div>

          {/* Step 2, wide, spans 2 cols */}
          <div className="col-span-1 md:col-span-2 row-span-1 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <span className="text-4xl text-primary/50 font-normal leading-none">2</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Open</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Pin it to your sidebar. Open on any tab — a lecture, a meeting, a docs page, a problem set.</p>
            </div>
          </div>

          {/* Step 4, tall, spans 2 rows */}
          <div className="col-span-1 row-span-2 p-8 rounded-2xl border border-border/60 bg-primary/8 border-primary/20 hover:bg-primary/12 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.3s", minHeight: 240 }}>
            <span className="text-4xl text-primary/50 font-normal leading-none">4</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Sync</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Push notes to Notion in one click, or copy Markdown. Your knowledge, always somewhere useful.</p>
            </div>
          </div>

          {/* Step 3, wide, spans 2 cols */}
          <div className="col-span-1 md:col-span-2 row-span-1 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <span className="text-4xl text-primary/50 font-normal leading-none">3</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Use</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Record audio for structured notes, read a page and chat about it, or document a meeting with speaker breakdown.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Use Cases bridge */}
      <section className="container mx-auto px-6 py-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div>
              <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-2">Use Cases</p>
              <h2 className="text-2xl font-normal text-foreground">See how people use SideBrain</h2>
              <p className="text-sm text-muted-foreground mt-1">Organized by feature, across every workflow.</p>
            </div>
            <Link to="/use-cases" className="inline-flex items-center gap-2 text-sm text-primary hover:gap-3 transition-all duration-300 flex-shrink-0">
              View all use cases <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Notion Sync section */}
      <section className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">

          {/* Left: content */}
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 md:p-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">Notion Sync</p>
            <h2 className="text-3xl md:text-4xl font-normal text-foreground leading-snug mb-14">
              Your knowledge,<br /><em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>at home in Notion</em>
            </h2>

            <div className="space-y-10">
              {[
                { stat: "1-click", label: "Sync to Notion", desc: "Connect once via OAuth. Every note syncs directly into your chosen page or database." },
                { stat: "Native", label: "Notion blocks", desc: "Headings, bullets, bold terms, all converted to real Notion blocks, not pasted text." },
                { stat: "Inline", label: "Images & diagrams", desc: "Screenshots are hosted and embedded inline, exactly where they belong in your notes." },
                { stat: "Live", label: "Incremental updates", desc: "Record more, update the same Notion page, without overwriting what's already there." },
              ].map(({ stat, label, desc }) => (
                <div key={label} className="flex items-start gap-5 group">
                  <div className="flex-shrink-0 w-10 text-right">
                    <span className="text-sm font-normal text-primary tabular-nums">{stat}</span>
                  </div>
                  <div className="flex-1 border-l border-border/40 pl-5">
                    <h3 className="text-foreground mb-1">{label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/notion-sync" className="inline-flex items-center gap-2 mt-12 text-sm text-primary hover:gap-3 transition-all duration-300">
              How Notion sync works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right: image banner */}
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[4/5] flex flex-col items-center justify-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center">
              <Image className="w-4 h-4 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground/30 text-center px-6">Screenshot: synced notes rendered natively in Notion</p>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="container mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-10 md:p-14 max-w-2xl mx-auto">
          <h2 className="text-2xl text-foreground mb-8">Getting started</h2>
          <ol className="space-y-5 text-muted-foreground">
            {[
              "Download and unzip the extension file",
              <>Open <code className="px-2 py-1 rounded-md bg-muted text-foreground text-sm">chrome://extensions</code></>,
              <>Enable <strong className="text-foreground font-normal">Developer mode</strong></>,
              <>Click <strong className="text-foreground font-normal">Load unpacked</strong> → select the folder</>,
            ].map((text, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{text}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 text-xs text-muted-foreground/60">
            Works with Chrome, Edge, Brave, Arc, and all Chromium browsers.
          </p>
        </div>
      </section>


      {/* CTA */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <h2 className="text-3xl md:text-5xl font-normal text-foreground mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Ready to capture what matters?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Turn your next lecture, meeting, or podcast into structured notes. One click to Notion.
        </p>
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={handleDownload}
            className="h-13 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Extension
          </Button>
          <p className="mt-5 text-xs text-muted-foreground/50">Free · Sign up in seconds · Works on all Chromium browsers</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 mx-4 md:mx-8 mb-8 rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {/* Footer links */}
        <div className="px-10 md:px-16 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center">
              <SideBrainLogo sizeClass="text-sm" />
            </div>

            {/* Nav columns */}
            <div className="flex gap-16 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground/50 text-xs tracking-widest uppercase">Product</span>
                <Link to="/use-cases" className="text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
                <Link to="/browser-agent" className="text-muted-foreground hover:text-foreground transition-colors">Browser Agent</Link>
                <Link to="/notion-sync" className="text-muted-foreground hover:text-foreground transition-colors">Notion Sync</Link>
              </div>
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground/50 text-xs tracking-widest uppercase">Install</span>
                <a href="https://chrome.google.com/webstore" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">Chrome</a>
                <span className="text-muted-foreground">Edge / Brave / Arc</span>
              </div>
            </div>

            {/* Copyright */}
            <p className="text-xs text-muted-foreground/40">
              © {new Date().getFullYear()} SideBrain. All rights reserved.
            </p>
          </div>
        </div>

        {/* Big watermark */}
        <div className="pb-2 overflow-hidden select-none pointer-events-none border-t border-border/40 pt-4 text-center">
          <SideBrainLogo sizeClass="text-[80px] md:text-[120px] lg:text-[160px]" className="leading-none text-foreground/5 footer-watermark tracking-tight -mb-4" />
        </div>
      </footer>
    </div>
  );
};

export default Index;
