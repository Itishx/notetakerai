import { Mic, FileText, Download, Zap, BookOpen, ChevronRight, Leaf, ArrowRight, Users, GraduationCap, Radio, TrendingUp, Link2, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const features = [
  {
    icon: Mic,
    title: "Effortless Capture",
    desc: "Records audio directly from your browser tab — no microphone, no setup, no extra software.",
  },
  {
    icon: Zap,
    title: "Deep Transcription",
    desc: "AI listens carefully, capturing every word with speaker awareness across any content type.",
  },
  {
    icon: FileText,
    title: "Thoughtful Notes",
    desc: "AI distills transcripts into structured notes — headings, key points, takeaways, and a glossary.",
  },
  {
    icon: BookOpen,
    title: "Flows into Notion",
    desc: "One click syncs your notes — including images — directly into your Notion workspace.",
  },
];

const steps = [
  { num: "一", title: "Download", desc: "Get the extension and load it into your browser in under a minute." },
  { num: "二", title: "Capture", desc: "Open any tab with audio — courses, meetings, podcasts — and press record." },
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
            Simple · Focused · Free
          </div>

          {/* Headline with orb */}
          <div className="relative">
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

            <h1 className="relative z-10 text-4xl md:text-6xl lg:text-7xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              Let any audio
              <br />
              <em className="text-primary not-italic">become notes</em>
            </h1>
          </div>

          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Record. Transcribe. Organize. A calm tool that turns any browser audio — lectures, meetings, podcasts — into beautifully structured notes.
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

          <div className="mt-14 flex items-center justify-center gap-8 text-muted-foreground/60 text-sm opacity-0 animate-fade-in" style={{ animationDelay: "0.8s" }}>
            <span>Any tab</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Any content</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span>Any workflow</span>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Features */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">What it does</p>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group p-8 rounded-2xl border border-border/60 bg-card/40 transition-all duration-500 hover:border-primary/20 hover:bg-card/80 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.2 + i * 0.15}s` }}
            >
              <f.icon className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
              <h3 className="text-lg text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works — bento grid */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">The flow</p>

        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-4 auto-rows-fr">

          {/* Step 1 — tall, spans 2 rows on md */}
          <div className="col-span-1 row-span-2 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.1s", minHeight: 240 }}>
            <span className="text-4xl text-primary/15 font-normal leading-none">1</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Download</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Get the extension and load it into your browser in under a minute.</p>
            </div>
          </div>

          {/* Step 2 — wide, spans 2 cols */}
          <div className="col-span-1 md:col-span-2 row-span-1 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <span className="text-4xl text-primary/15 font-normal leading-none">2</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Capture</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Open any tab with audio — courses, meetings, podcasts — and press record.</p>
            </div>
          </div>

          {/* Step 4 — tall, spans 2 rows */}
          <div className="col-span-1 row-span-2 p-8 rounded-2xl border border-border/60 bg-primary/8 border-primary/20 hover:bg-primary/12 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.3s", minHeight: 240 }}>
            <span className="text-4xl text-primary/25 font-normal leading-none">4</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Flow</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Sync to Notion or copy Markdown. Your knowledge, beautifully preserved.</p>
            </div>
          </div>

          {/* Step 3 — wide, spans 2 cols */}
          <div className="col-span-1 md:col-span-2 row-span-1 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 flex flex-col justify-between opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <span className="text-4xl text-primary/15 font-normal leading-none">3</span>
            <div>
              <h3 className="text-foreground text-base mb-2">Transform</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">Stop recording. AI transcribes and shapes your notes automatically.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Use Cases section */}
      <section className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* Left: image banner */}
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[4/5] flex flex-col items-center justify-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center">
              <Image className="w-4 h-4 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground/30 text-center px-6">Screenshot: extension in use across different workflows</p>
          </div>

          {/* Right: use cases list */}
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">Use Cases</p>
            <h2 className="text-3xl md:text-4xl font-normal text-foreground leading-snug mb-14">
              One tool,<br /><em className="text-primary not-italic">every workflow</em>
            </h2>

            <div className="space-y-10">
              {[
                { icon: Users, label: "Meeting documentation", desc: "Auto-summarise any browser-based call with decisions, action items, and speakers." },
                { icon: GraduationCap, label: "Online courses", desc: "Turn any lecture or tutorial into structured notes with headings, terms, and takeaways." },
                { icon: TrendingUp, label: "Sales call notes", desc: "Capture objections, commitments, and next steps — paste directly into your CRM." },
                { icon: Radio, label: "Podcast summaries", desc: "Get structured takeaways from any episode without sitting through the whole thing." },
              ].map(({ icon: Icon, label, desc }, i) => (
                <div key={label} className="flex items-start gap-5 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl border border-border/60 bg-card/40 flex items-center justify-center group-hover:border-primary/30 group-hover:bg-card/80 transition-all duration-300">
                    <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-foreground mb-1">{label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/use-cases" className="inline-flex items-center gap-2 mt-12 text-sm text-primary hover:gap-3 transition-all duration-300">
              View all use cases <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Notion Sync section */}
      <section className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">

          {/* Left: content */}
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">Notion Sync</p>
            <h2 className="text-3xl md:text-4xl font-normal text-foreground leading-snug mb-14">
              Your knowledge,<br /><em className="text-primary not-italic">at home in Notion</em>
            </h2>

            <div className="space-y-10">
              {[
                { stat: "1-click", label: "Sync to Notion", desc: "Connect once via OAuth. Every note syncs directly into your chosen page or database." },
                { stat: "Native", label: "Notion blocks", desc: "Headings, bullets, bold terms — all converted to real Notion blocks, not pasted text." },
                { stat: "Inline", label: "Images & diagrams", desc: "Screenshots are hosted and embedded inline, exactly where they belong in your notes." },
                { stat: "Live", label: "Incremental updates", desc: "Record more, update the same Notion page — without overwriting what's already there." },
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


      {/* Footer */}
      <footer className="mt-8 mx-4 md:mx-8 mb-8 rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {/* Footer links */}
        <div className="px-10 md:px-16 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            {/* Brand */}
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary/60" strokeWidth={1.5} />
              <span className="text-sm text-foreground">SideBrain</span>
            </div>

            {/* Nav columns */}
            <div className="flex gap-16 text-sm">
              <div className="flex flex-col gap-3">
                <span className="text-muted-foreground/50 text-xs tracking-widest uppercase">Product</span>
                <Link to="/use-cases" className="text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
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
          <p className="text-[80px] md:text-[120px] lg:text-[160px] font-normal leading-none text-foreground/5 tracking-tight -mb-4">
            SideBrain
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
