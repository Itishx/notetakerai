import { Mic, FileText, Download, Zap, BookOpen, ChevronRight, Leaf, ArrowRight } from "lucide-react";
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div
                className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full animate-breathe"
                style={{ background: 'radial-gradient(circle, hsl(160 25% 38% / 0.12) 0%, hsl(160 25% 38% / 0.04) 50%, transparent 70%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[300px] h-[300px] rounded-full animate-breathe"
                style={{ animationDelay: '1.5s', background: 'radial-gradient(circle, hsl(160 25% 38% / 0.15) 0%, hsl(160 25% 38% / 0.05) 60%, transparent 75%)' }}
              />
              <div
                className="absolute top-1/2 left-1/2 w-[140px] h-[140px] rounded-full animate-breathe"
                style={{ animationDelay: '0.8s', background: 'radial-gradient(circle, hsl(160 25% 38% / 0.25) 0%, hsl(160 25% 38% / 0.08) 60%, transparent 80%)', boxShadow: '0 0 60px 20px hsl(160 25% 38% / 0.1)' }}
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

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-6 py-24">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">The flow</p>

        <div className="max-w-5xl mx-auto relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-6 left-[calc(12.5%)] right-[calc(12.5%)] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

          <div className="grid md:grid-cols-4 gap-10">
            {steps.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center opacity-0 animate-fade-in" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                {/* Circle node */}
                <div className="relative z-10 w-12 h-12 rounded-full border border-primary/30 bg-background flex items-center justify-center mb-6">
                  <span className="text-sm text-primary/60 font-normal">{i + 1}</span>
                </div>
                <h3 className="text-foreground mb-3 text-base tracking-wide">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Explore more */}
      <section className="container mx-auto px-6 py-16">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-24" />
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Explore</p>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <Link
            to="/use-cases"
            className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500"
          >
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">01</p>
            <h3 className="text-xl text-foreground mb-3">More than lectures</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Meetings, podcasts, sales calls, training videos — discover every workflow LectureSnap fits into.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm text-primary group-hover:gap-2.5 transition-all duration-300">
              See all use cases <ArrowRight className="w-4 h-4" />
            </span>
          </Link>

          <Link
            to="/notion-sync"
            className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500"
          >
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-4">02</p>
            <h3 className="text-xl text-foreground mb-3">Notion sync, deeply</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Notes, images, headings, and structure — see exactly how your content lands inside Notion.
            </p>
            <span className="inline-flex items-center gap-1.5 text-sm text-primary group-hover:gap-2.5 transition-all duration-300">
              How Notion sync works <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
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
      <footer className="py-16">
        <div className="container mx-auto px-6 text-center">
          <Leaf className="w-5 h-5 text-primary/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground/50">
            LectureSnap — Learn with calm intention
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
