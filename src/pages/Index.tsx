import { useState } from "react";
import { Mic, FileText, Download, Zap, BookOpen, Youtube, Copy, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Mic,
    title: "Tab Audio Capture",
    desc: "Records crystal-clear audio directly from your browser tab — no microphone needed.",
  },
  {
    icon: Zap,
    title: "AI Transcription",
    desc: "Powered by ElevenLabs Scribe for accurate, speaker-aware transcription.",
  },
  {
    icon: FileText,
    title: "Smart Notes",
    desc: "AI converts transcripts into structured, study-ready notes with headings, bullet points, and key takeaways.",
  },
  {
    icon: BookOpen,
    title: "Notion-Ready",
    desc: "Copy your notes as clean Markdown and paste directly into Notion. Perfect formatting every time.",
  },
];

const platforms = [
  { name: "YouTube", icon: Youtube },
  { name: "Udemy", icon: BookOpen },
  { name: "DataCamp", icon: Zap },
];

const steps = [
  { num: "1", title: "Download & Install", desc: "Download the extension, unzip it, and load it as an unpacked extension in Chrome." },
  { num: "2", title: "Start Recording", desc: "Open any lecture video and click the extension icon. Hit 'Start Recording' to capture tab audio." },
  { num: "3", title: "Convert to Notes", desc: "When your lecture is done, stop recording and click 'Convert to Notes'. AI does the rest." },
  { num: "4", title: "Export to Notion", desc: "Copy your beautifully formatted notes and paste them into Notion — formatting preserved." },
];

const Index = () => {
  const [copied, setCopied] = useState(false);

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
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(210_100%_56%/0.12),transparent_60%)]" />
        <div className="container relative mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-xs text-muted-foreground mb-6">
            <Zap className="w-3 h-3 text-accent" />
            Chrome Extension · Free & Open
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto leading-[1.1]">
            Turn any lecture into
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> perfect notes</span>
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
            Record tab audio from YouTube, Udemy, or DataCamp. AI transcribes and converts it into structured, Notion-ready study notes.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              onClick={handleDownload}
              className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              <Download className="w-5 h-5 mr-2" />
              Download Extension
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 text-base border-border text-foreground hover:bg-secondary"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            >
              How it works
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          <div className="mt-10 flex items-center justify-center gap-6 text-muted-foreground text-sm">
            {platforms.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <p.icon className="w-4 h-4" />
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          How it works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.num} className="relative">
              <div className="text-5xl font-black text-primary/10 mb-3">{s.num}</div>
              <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Install instructions */}
      <section className="container mx-auto px-6 py-16">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6">Installation</h2>
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">1</span>
              Download and unzip the extension file
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">2</span>
              Open <code className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs">chrome://extensions</code> in Chrome
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">3</span>
              Enable <strong className="text-foreground">Developer mode</strong> (top-right toggle)
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">4</span>
              Click <strong className="text-foreground">Load unpacked</strong> and select the unzipped folder
            </li>
          </ol>
          <p className="mt-6 text-xs text-muted-foreground">
            Works on Chrome, Edge, Brave, Arc, and any Chromium browser.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>LectureSnap — AI-Powered Lecture Notes · Built with Lovable</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
