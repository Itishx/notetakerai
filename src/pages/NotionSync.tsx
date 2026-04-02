import {
  Link2, ShieldCheck, Image, FileText, Layers, ArrowRight,
  Download, Leaf, CheckCircle2, Database, Lock, Zap, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

const syncSteps = [
  {
    num: "01",
    icon: Lock,
    title: "Connect your Notion workspace",
    desc: "Click \"Connect Notion\" inside the SideBrain side panel. You're redirected to Notion's official OAuth page — authorize once and you're done. SideBrain never sees your Notion password. Your credentials are handled entirely by Notion's own authentication.",
    detail: "Powered by OAuth 2.0 via Supabase. Connection is stored securely — no re-auth needed.",
  },
  {
    num: "02",
    icon: FileText,
    title: "Generate your notes",
    desc: "Record audio from any browser tab, then hit \"Convert to Notes.\" AI transcribes the audio and produces fully structured Markdown — headings, bullet points, bold key terms, a Key Takeaways section, and a Glossary. Add screenshots or diagrams if needed.",
    detail: "Notes are built incrementally — record more, update existing notes without losing what's there.",
  },
  {
    num: "03",
    icon: Link2,
    title: "Sync with one click",
    desc: "Press \"Sync to Notion.\" Your notes are converted to native Notion blocks and pushed directly into your chosen workspace. Images are uploaded first to secure cloud storage, then embedded inline — so they render perfectly inside Notion.",
    detail: "Select a target page or database. Future syncs update the same Notion page.",
  },
];

const preservedItems = [
  { icon: Layers, label: "Heading structure", desc: "H1, H2, H3 become native Notion heading blocks" },
  { icon: FileText, label: "Bullet points & lists", desc: "Every list item maps to a Notion bulleted_list_item block" },
  { icon: Zap, label: "Bold key terms", desc: "Inline bold text is preserved as Notion rich text annotations" },
  { icon: Image, label: "Inline images & diagrams", desc: "Screenshots are hosted on Supabase Storage and embedded at the right position" },
  { icon: CheckCircle2, label: "Key Takeaways section", desc: "Highlighted callout block for quick review" },
  { icon: Database, label: "Glossary", desc: "Structured definition list at the end of each note" },
];

const NotionSync = () => {
  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-border/30 animate-breathe pointer-events-none" />

        <div className="container relative mx-auto px-6 pt-24 pb-20 text-center">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            Notion Sync
          </p>
          <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Your knowledge,
            <br />
            <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>at home in Notion</em>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            Every note, diagram, and structured section — pushed directly into your Notion workspace with a single click. Not a paste. A real sync.
          </p>
        </div>
      </section>

      {/* Hero image placeholder */}
      <div className="container mx-auto px-6 pb-20">
        <div className="max-w-4xl mx-auto rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[16/7] flex flex-col items-center justify-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center">
            <Image className="w-4 h-4 text-muted-foreground/30" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground/30">Screenshot: SideBrain side panel alongside synced Notion page</p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* How it works — 3 steps */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-20">How it works</p>

        <div className="max-w-4xl mx-auto space-y-6">
          {syncSteps.map((step, i) => (
            <div
              key={step.num}
              className="group grid md:grid-cols-[80px_1fr] gap-6 p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.2 + i * 0.15}s` }}
            >
              <div className="flex flex-col items-start md:items-center pt-1">
                <span className="text-2xl text-primary/30 font-normal mb-3">{step.num}</span>
                <step.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-xl text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed mb-4">{step.desc}</p>
                <p className="text-xs text-muted-foreground/50 border-l-2 border-primary/20 pl-3">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Image placeholder: before/after */}
      <div className="container mx-auto px-6 pb-24">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[4/3] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center">
              <Image className="w-3.5 h-3.5 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground/30 text-center px-4">Screenshot: SideBrain notes panel with images and sections</p>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[4/3] flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full border border-border/50 flex items-center justify-center">
              <Image className="w-3.5 h-3.5 text-muted-foreground/30" strokeWidth={1.5} />
            </div>
            <p className="text-xs text-muted-foreground/30 text-center px-4">Screenshot: The same content rendered natively in Notion</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* What gets preserved */}
      <section className="container mx-auto px-6 py-24">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-4">What gets preserved</p>
        <p className="text-center text-muted-foreground/70 text-sm max-w-lg mx-auto mb-16">
          Every structural element of your notes maps to a native Notion block type — nothing is flattened or lost.
        </p>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {preservedItems.map((item, i) => (
            <div
              key={item.label}
              className="p-6 rounded-2xl border border-border/60 bg-card/40 opacity-0 animate-fade-in"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <item.icon className="w-4 h-4 text-primary mb-4" strokeWidth={1.5} />
              <h4 className="text-foreground text-sm mb-1.5">{item.label}</h4>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The technical bit */}
      <section className="container mx-auto px-6 pb-24">
        <div className="max-w-4xl mx-auto rounded-2xl border border-border/60 bg-card/40 p-10 md:p-14">
          <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-8">Under the hood</p>

          <div className="grid md:grid-cols-2 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ShieldCheck className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-foreground">Secure OAuth connection</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Notion connection uses official OAuth 2.0. When you click "Connect Notion," you're redirected to Notion's own authorization page. SideBrain never handles your password. Your access token is stored securely via Supabase and used only to write notes on your behalf.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-foreground">Images that actually render</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Notion requires publicly accessible image URLs — it can't accept base64 or local data. When your notes include diagrams or screenshots, SideBrain uploads them to Supabase Storage first, generates a permanent public URL, then embeds that URL into the synced Notion page. Your images appear inline, exactly where they belong.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Layers className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-foreground">Markdown → Notion blocks</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your notes are written in Markdown. Syncing converts them to Notion's native block format: <code className="text-xs bg-muted px-1.5 py-0.5 rounded"># Heading</code> becomes a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">heading_1</code> block, <code className="text-xs bg-muted px-1.5 py-0.5 rounded">- bullet</code> becomes a <code className="text-xs bg-muted px-1.5 py-0.5 rounded">bulleted_list_item</code>, and so on. Rich formatting like bold and inline code is preserved as Notion text annotations.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-4">
                <Database className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <h3 className="text-foreground">Works with pages & databases</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Choose any Notion page or database as your sync target. When syncing to a database, SideBrain creates a new entry for each session — keeping your notes organized as rows you can filter, sort, and tag. Syncing to a page appends or updates content in place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Notion database screenshot placeholder */}
      <div className="container mx-auto px-6 pb-24">
        <div className="max-w-4xl mx-auto rounded-2xl border-2 border-dashed border-border/50 bg-card/30 aspect-[16/6] flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center">
            <Image className="w-4 h-4 text-muted-foreground/30" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-muted-foreground/30">Screenshot: Notion database view with multiple synced note sessions</p>
        </div>
      </div>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Copy Markdown callout */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-start gap-6 p-8 rounded-2xl border border-border/60 bg-card/40">
          <Copy className="w-5 h-5 text-muted-foreground/60 flex-shrink-0 mt-1" strokeWidth={1.5} />
          <div>
            <h3 className="text-foreground mb-2">Prefer to paste manually?</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every note also has a one-click "Copy Markdown" button. Clean Markdown copies to your clipboard instantly — paste it anywhere: Notion, Obsidian, Roam, Bear, or any editor that accepts Markdown.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6">Get started</p>
        <h2 className="text-3xl md:text-4xl font-normal text-foreground mb-4 max-w-xl mx-auto">
          Your Notion workspace, enriched
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto text-sm leading-relaxed">
          Download the extension, connect Notion in one step, and your first sync is ready.
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
          <a href="https://notion.so" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" className="rounded-full h-12 px-8 text-muted-foreground hover:text-foreground text-base">
              What is Notion? <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
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

export default NotionSync;
