import {
  Users, Globe, Mic, Search, BookOpen,
  TrendingUp, Heart, GraduationCap, Radio, PenLine,
  Building2, Leaf, ArrowRight, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";


const UseCases = () => {
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-border/30 animate-breathe pointer-events-none" />

        <div className="container relative mx-auto px-6 pt-24 pb-20 text-center">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Use Cases
          </p>
          <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            One tool,
            <br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>every workflow</em>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Three core features. Here's every workflow they unlock.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Group 1: Record Tab Audio */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto mb-10">
          <div className="flex items-center gap-3">
            <Mic className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base text-foreground">Record Tab Audio</h2>
            <div className="flex-1 h-px bg-border/40 ml-2" />
            <span className="text-xs text-muted-foreground/40 tabular-nums">6 use cases</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7">Capture any browser audio and get structured notes, ready to sync.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <GraduationCap className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Online Courses</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Turn any video lesson into structured notes with headings, key terms, and a glossary. Organized the way you'd want them.</p>
            <p className="text-xs text-muted-foreground/50">Students · self-learners</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <Radio className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Podcast Summaries</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Capture the signal without sitting through the noise. Get structured takeaways from any audio in your browser.</p>
            <p className="text-xs text-muted-foreground/50">Professionals · researchers</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <Globe className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Language Learning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Record foreign-language content and get a full transcript alongside structured vocabulary notes.</p>
            <p className="text-xs text-muted-foreground/50">Language learners · students</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <Search className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Journalism & Research</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Transcribe press conferences or academic talks. Structured notes with key quotes highlighted, reference-ready.</p>
            <p className="text-xs text-muted-foreground/50">Journalists · researchers · analysts</p>
          </div>

          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <PenLine className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Content Repurposing</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Record your video or podcast and generate show notes, blog drafts, or social summaries. Your voice becomes structured text, ready to publish.</p>
            <p className="text-xs text-muted-foreground/50">Podcasters · YouTubers · marketers</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <Building2 className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Corporate Training</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Convert training videos into SOPs, knowledge base articles, or onboarding docs automatically.</p>
            <p className="text-xs text-muted-foreground/50">L&D teams · HR · operations</p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Group 2: Read Any Page */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto mb-10">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base text-foreground">Read Any Page</h2>
            <div className="flex-1 h-px bg-border/40 ml-2" />
            <span className="text-xs text-muted-foreground/40 tabular-nums">4 use cases</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7">Open SideBrain on any URL and chat about what's on screen.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-5xl mx-auto">

          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <TrendingUp className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">LeetCode & Problem Solving</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Ask for hints, get step-by-step explanations, or talk through your approach without leaving the problem page.</p>
            <p className="text-xs text-muted-foreground/50">Engineers · students</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <BookOpen className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Documentation & APIs</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Ask SideBrain to explain a concept, compare options, or find a specific answer on any docs page.</p>
            <p className="text-xs text-muted-foreground/50">Developers · technical writers</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <Search className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">News & Long-form Articles</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Ask SideBrain to summarize, extract key claims, or find the argument structure of any article.</p>
            <p className="text-xs text-muted-foreground/50">Researchers · analysts · curious readers</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <GraduationCap className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Academic Papers</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Ask about methodology, request plain-language summaries, or pull out cited claims while reading a paper.</p>
            <p className="text-xs text-muted-foreground/50">Researchers · students · academics</p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Group 3: Record Meetings */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-5xl mx-auto mb-10">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-primary" strokeWidth={1.5} />
            <h2 className="text-base text-foreground">Record Meetings</h2>
            <div className="flex-1 h-px bg-border/40 ml-2" />
            <span className="text-xs text-muted-foreground/40 tabular-nums">3 use cases</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7">Multi-speaker recording with AI notes and Notion sync built in.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Users className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Meeting Documentation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Record any browser-based call. SideBrain transcribes every speaker and generates summaries with decisions, action items, and key discussion points.</p>
            <p className="text-xs text-muted-foreground/50">Remote teams · managers · consultants</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <TrendingUp className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Sales Call Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">AI surfaces objections raised, commitments made, and next steps, formatted for your CRM.</p>
            <p className="text-xs text-muted-foreground/50">Sales reps · account managers</p>
          </div>

          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <Heart className="w-5 h-5 text-primary mb-5" strokeWidth={1.5} />
            <h3 className="text-lg text-foreground mb-3">Accessibility Companion</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">Every meeting becomes readable, structured text automatically. Prefer reading to listening, or need to revisit at your own pace.</p>
            <p className="text-xs text-muted-foreground/50">Anyone who prefers reading</p>
          </div>

        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-6 py-8">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6">Ready?</p>
        <h2 className="text-3xl md:text-4xl font-normal text-foreground mb-6 max-w-xl mx-auto leading-snug">
          Your workflow, your notes
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto text-sm leading-relaxed">
          Free to download. Works in any Chromium browser. Sign up to get started.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={() => {
              fetch("/sidebrain-extension.zip")
                .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
                .then((blob) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sidebrain-extension.zip"; a.click(); URL.revokeObjectURL(a.href); })
                .catch(() => alert("Extension not yet packaged. Please check back soon."));
            }}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-12 text-base"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Extension
          </Button>
          <Link to="/notion-sync">
            <Button variant="ghost" className="rounded-full h-12 px-8 text-muted-foreground hover:text-foreground text-base">
              See how Notion sync works <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
          <Leaf className="w-5 h-5 text-primary/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground/50">SideBrain. Learn with calm intention.</p>
        </div>
      </footer>
    </div>
  );
};

export default UseCases;
