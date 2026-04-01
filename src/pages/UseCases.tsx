import {
  Users, Globe, Mic, Search, Briefcase, BookOpen,
  TrendingUp, Heart, GraduationCap, Radio, PenLine,
  Building2, Leaf, ArrowRight, Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";

const useCases = [
  {
    id: "meetings",
    category: "Professional",
    icon: Users,
    title: "Meeting Documentation",
    desc: "Record any browser-based call — Google Meet, Teams web, or Zoom in the browser. SideBrain transcribes every voice and generates structured summaries with decisions made, action items, and key discussion points. Never write meeting notes manually again.",
    forWho: "Remote teams, managers, consultants",
    size: "large",
  },
  {
    id: "language",
    category: "Education",
    icon: Globe,
    title: "Language Learning",
    desc: "Record foreign-language content playing in your browser and receive a full transcript alongside structured vocabulary notes. Immerse yourself without the fear of missing words.",
    forWho: "Language learners, students",
    size: "small",
  },
  {
    id: "courses",
    category: "Education",
    icon: GraduationCap,
    title: "Online Courses & Lectures",
    desc: "Turn any online course into rich study notes. Headings, bullet points, key terms, and a glossary are automatically generated — organized the way you'd want them.",
    forWho: "Students, self-learners",
    size: "small",
  },
  {
    id: "content",
    category: "Creative",
    icon: PenLine,
    title: "Content Repurposing",
    desc: "Record your own video or podcast and instantly generate show notes, blog post drafts, newsletters, or social media summaries. What took hours now takes seconds. Your voice becomes structured text, ready to publish.",
    forWho: "Podcasters, YouTubers, content marketers",
    size: "large",
  },
  {
    id: "sales",
    category: "Professional",
    icon: TrendingUp,
    title: "Sales Call Notes",
    desc: "Capture prospect conversations played back from your browser. AI surfaces objections raised, commitments made, and next steps — formatted and ready to paste into your CRM.",
    forWho: "Sales reps, account managers",
    size: "small",
  },
  {
    id: "journalism",
    category: "Research",
    icon: Search,
    title: "Journalism & Research",
    desc: "Transcribe press conferences, interviews, or academic talks playing in your browser. Get structured notes with key quotes highlighted — reference-ready in seconds.",
    forWho: "Journalists, researchers, analysts",
    size: "small",
  },
  {
    id: "training",
    category: "Enterprise",
    icon: Building2,
    title: "Corporate Training to SOPs",
    desc: "L&D and HR teams can convert internal training videos into written documentation, standard operating procedures, or knowledge base articles — automatically. Capture tribal knowledge before it walks out the door.",
    forWho: "L&D teams, HR, operations",
    size: "full",
  },
  {
    id: "accessibility",
    category: "Accessibility",
    icon: Heart,
    title: "Accessibility Companion",
    desc: "For those who find it easier to read than to listen — or who need to revisit content at their own pace — SideBrain converts any audio into readable, structured notes without any special setup.",
    forWho: "Anyone who prefers reading",
    size: "small",
  },
  {
    id: "podcasts",
    category: "Research",
    icon: Radio,
    title: "Podcast Summaries",
    desc: "Deep-dive episodes, industry podcasts, expert interviews — capture the signal without sitting through the noise. Get structured takeaways from any audio content in your browser.",
    forWho: "Busy professionals, researchers",
    size: "small",
  },
];

const categoryColors: Record<string, string> = {
  Professional: "text-primary bg-primary/8 border-primary/20",
  Education: "text-foreground/70 bg-muted border-border/60",
  Creative: "text-accent bg-accent/10 border-accent/20",
  Research: "text-foreground/70 bg-muted border-border/60",
  Enterprise: "text-primary bg-primary/8 border-primary/20",
  Accessibility: "text-accent bg-accent/10 border-accent/20",
};

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

  const large = useCases.filter((u) => u.size === "large");
  const small = useCases.filter((u) => u.size === "small");
  const full = useCases.filter((u) => u.size === "full");

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
            <em className="text-primary not-italic">every workflow</em>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            SideBrain captures audio from any browser tab. The "lecture" is just the beginning — here's where else it fits.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Bento grid — Row 1: large + small */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          {/* Large card: Meetings */}
          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-start justify-between mb-6">
              <Users className="w-6 h-6 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Professional"]}`}>
                Professional
              </span>
            </div>
            <h3 className="text-xl text-foreground mb-3">Meeting Documentation</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Record any browser-based call — Google Meet, Teams web, or Zoom in the browser. SideBrain transcribes every voice and generates structured summaries with decisions made, action items, and key discussion points. Never write meeting notes manually again.
            </p>
            <p className="text-xs text-muted-foreground/50">Remote teams · managers · consultants</p>
          </div>

          {/* Small card: Language */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-start justify-between mb-6">
              <Globe className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Education"]}`}>
                Education
              </span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Language Learning</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Record foreign-language content and receive a full transcript alongside structured vocabulary notes. Immerse yourself without the fear of missing words.
            </p>
            <p className="text-xs text-muted-foreground/50">Language learners · students</p>
          </div>

          {/* Small card: Courses */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-start justify-between mb-6">
              <GraduationCap className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Education"]}`}>
                Education
              </span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Online Courses</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Turn any online course into rich study notes. Headings, bullet points, key terms, and a glossary — organized the way you'd want them.
            </p>
            <p className="text-xs text-muted-foreground/50">Students · self-learners</p>
          </div>

          {/* Large card: Content */}
          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-accent/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <div className="flex items-start justify-between mb-6">
              <PenLine className="w-6 h-6 text-accent" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Creative"]}`}>
                Creative
              </span>
            </div>
            <h3 className="text-xl text-foreground mb-3">Content Repurposing</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Record your own video or podcast and instantly generate show notes, blog post drafts, newsletters, or social media summaries. What took hours now takes seconds. Your voice becomes structured text, ready to publish.
            </p>
            <p className="text-xs text-muted-foreground/50">Podcasters · YouTubers · content marketers</p>
          </div>

          {/* Small: Sales */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-start justify-between mb-6">
              <TrendingUp className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Professional"]}`}>
                Professional
              </span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Sales Call Notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Capture prospect conversations. AI surfaces objections raised, commitments made, and next steps — ready to paste into your CRM.
            </p>
            <p className="text-xs text-muted-foreground/50">Sales reps · account managers</p>
          </div>

          {/* Small: Journalism */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.45s" }}>
            <div className="flex items-start justify-between mb-6">
              <Search className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Research"]}`}>
                Research
              </span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Journalism & Research</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Transcribe press conferences, interviews, or academic talks. Get structured notes with key quotes highlighted — reference-ready in seconds.
            </p>
            <p className="text-xs text-muted-foreground/50">Journalists · researchers · analysts</p>
          </div>

          {/* Small: Podcasts */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-accent/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <div className="flex items-start justify-between mb-6">
              <Radio className="w-5 h-5 text-accent" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${categoryColors["Research"]}`}>
                Research
              </span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Podcast Summaries</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Deep-dive episodes, industry podcasts, expert interviews — capture the signal without sitting through the noise.
            </p>
            <p className="text-xs text-muted-foreground/50">Professionals · researchers</p>
          </div>

        </div>
      </section>

      {/* Full-width card: Corporate Training */}
      <section className="container mx-auto px-6 pb-8">
        <div className="max-w-5xl mx-auto">
          <div className="group p-10 md:p-12 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.55s" }}>
            <div className="flex flex-col md:flex-row md:items-start gap-8">
              <div className="flex-shrink-0">
                <Building2 className="w-8 h-8 text-primary" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-2xl text-foreground">Corporate Training & Knowledge Capture</h3>
                  <span className={`hidden md:inline-flex text-xs px-3 py-1 rounded-full border ml-4 flex-shrink-0 ${categoryColors["Enterprise"]}`}>
                    Enterprise
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4 max-w-3xl">
                  L&D and HR teams can convert internal training videos into written documentation, standard operating procedures, or knowledge base articles — automatically. Record onboarding walkthroughs, compliance training sessions, or expert demos and transform them into reusable written assets your whole organization can search and reference.
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Capture tribal knowledge before it walks out the door.
                </p>
                <p className="text-xs text-muted-foreground/50 mt-4">L&D teams · HR · operations managers · internal comms</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Accessibility spotlight */}
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-accent/20 bg-accent/5 p-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.6s" }}>
            <div className="flex items-start gap-5">
              <Heart className="w-6 h-6 text-accent flex-shrink-0 mt-1" strokeWidth={1.5} />
              <div>
                <span className={`text-xs px-3 py-1 rounded-full border mb-4 inline-block ${categoryColors["Accessibility"]}`}>
                  Accessibility
                </span>
                <h3 className="text-xl text-foreground mb-3">Built for everyone</h3>
                <p className="text-muted-foreground leading-relaxed max-w-2xl">
                  For those who find it easier to read than to listen — or who need to revisit content at their own pace — SideBrain converts any audio into readable, structured notes without any special setup. No captions required. No replaying. Just clear, organized text.
                </p>
              </div>
            </div>
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
          Free to download. Works in any Chromium browser. No account required to start.
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
          <p className="text-sm text-muted-foreground/50">SideBrain — Learn with calm intention</p>
        </div>
      </footer>
    </div>
  );
};

export default UseCases;
