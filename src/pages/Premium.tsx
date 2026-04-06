import {
  Mic, Cloud, Brain, Globe, MessageSquare, Camera, Bot,
  Check, X, Leaf, Zap, Download, ArrowRight, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

const premiumFeatures = [
  {
    icon: Mic,
    tag: "Recording",
    title: "Record without limits",
    desc: "Free users hit a 5-minute cap per day. With Premium, record full lectures, long meetings, hour-long podcasts, however long the content runs, SideBrain keeps up.",
    free: "5 min / day",
    premium: "Unlimited",
    size: "large",
  },
  {
    icon: Cloud,
    tag: "Storage",
    title: "Cloud sync & note history",
    desc: "Free notes live only on your device, reinstall the extension and they're gone. Premium saves every note to the cloud. Switch browsers, upgrade to a new version, log in anywhere, your entire history is waiting.",
    free: "Local only",
    premium: "Unlimited cloud history",
    size: "small",
  },
  {
    icon: Brain,
    tag: "AI",
    title: "Smarter AI, richer notes",
    desc: "Premium runs your recordings through a more capable model. Better structure, sharper key points, more accurate glossaries, especially noticeable on dense or fast-paced content.",
    free: "Basic model",
    premium: "Advanced model",
    size: "small",
  },
  {
    icon: Globe,
    tag: "AI",
    title: "Multi-language transcription",
    desc: "Recording content in Spanish, Hindi, Mandarin, or French? Premium transcribes and structures notes in 50+ languages, automatically detected, no setup needed.",
    free: "English only",
    premium: "50+ languages",
    size: "small",
  },
  {
    icon: MessageSquare,
    tag: "Page Chat",
    title: "Chat without limits, across any tab",
    desc: "Free users get 5 questions per day. Premium unlocks unlimited chat, ask as many questions as you need, and switch between multiple open tabs in a single conversation. Reference your notes and the current page at the same time.",
    free: "5 questions / day · single tab",
    premium: "Unlimited · multi-tab",
    size: "large",
  },
  {
    icon: Camera,
    tag: "Screenshots",
    title: "Unlimited screenshots, auto-embedded",
    desc: "Free lets you attach 2 screenshots per note. Premium removes the cap and automatically embeds every screenshot inline, right where it belongs in your structured notes.",
    free: "2 per note",
    premium: "Unlimited + auto-embed",
    size: "small",
  },
];

const freeItems = [
  "Browser Agent: not included",
  "5 min recording per day",
  "5 AI questions per day",
  "2 screenshots per note",
  "Basic AI model",
  "Notion sync",
  "Local note storage",
];

const premiumItems = [
  "Browser Agent — control any website with plain language",
  "Unlimited recording time",
  "Unlimited AI questions",
  "Unlimited screenshots + auto-embed",
  "Advanced AI model",
  "Notion sync",
  "Cloud sync across devices",
  "Full note history, never lose a session",
  "Multi-language transcription (50+ languages)",
  "Chat across multiple tabs simultaneously",
];

const tagColor = (tag: string) => {
  if (tag === "AI") return "text-primary bg-primary/8 border-primary/20";
  if (tag === "Browser Agent") return "text-primary bg-primary/8 border-primary/20";
  if (tag === "Page Chat") return "text-accent bg-accent/10 border-accent/20";
  if (tag === "Recording") return "text-primary bg-primary/8 border-primary/20";
  return "text-foreground/70 bg-muted border-border/60";
};

const Premium = () => {
  const large = premiumFeatures.filter((f) => f.size === "large");
  const small = premiumFeatures.filter((f) => f.size === "small");
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGetPremium = async () => {
    if (!user) {
      // Not logged in — send to auth first
      window.location.href = "/auth?redirect=/premium";
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://ovapacfrzddnhrwvkbkr.supabase.co"}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ successUrl: window.location.origin + "/premium?success=true" }),
        }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start checkout. Please try again.");
      }
    } catch (e) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show success banner if redirected back from Polar
  const isSuccess = new URLSearchParams(window.location.search).get("success") === "true";

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <Navbar />

      {/* Success banner */}
      {isSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-600 dark:text-green-400 rounded-full px-6 py-3 text-sm shadow-lg">
          <Check className="w-4 h-4" />
          You're now a Premium member. Welcome!
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-border/30 animate-breathe pointer-events-none" />
        <div className="container relative mx-auto px-6 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/6 px-5 py-2 text-sm text-primary mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <Zap className="w-3.5 h-3.5" />
            SideBrain Premium
          </div>
          <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            Everything you need,
            <br />
            <em className="text-primary not-italic">nothing held back</em>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            The free plan gets you started. Premium gets out of your way — unlimited recording, smarter AI, cloud history, browser agent, and unrestricted chat.
          </p>
          <div className="mt-10 opacity-0 animate-fade-in" style={{ animationDelay: "0.5s" }}>
            <Button
              onClick={handleGetPremium}
              disabled={loading}
              className="h-12 px-10 text-base rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <Zap className="w-4 h-4 mr-2" />
              {loading ? "Loading..." : "Get Premium · $10/mo"}
            </Button>
            <p className="mt-4 text-xs text-muted-foreground/50">Cancel anytime · Powered by Polar</p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* Feature cards, bento grid */}
      <section className="container mx-auto px-6 py-20">
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">What Premium unlocks</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          {/* Browser Agent, full width — new flagship feature */}
          <div className="md:col-span-3 group p-8 md:p-10 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/8 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <Bot className="w-6 h-6 text-primary" strokeWidth={1.5} />
                  <span className="text-xs px-3 py-1 rounded-full border text-primary bg-primary/8 border-primary/20 ml-auto">Browser Agent</span>
                </div>
                <h3 className="text-xl text-foreground mb-3">Control any website with plain language</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
                  The only AI sidebar that doesn't just read your browser — it drives it. Tell SideBrain to send an email, play a show, book a flight, or fill a form. It reads the page, finds the right elements, and acts — step by step, until the task is done.
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-2 md:items-end justify-end">
                {["Send emails", "Navigate sites", "Fill forms", "Pick dropdowns"].map((cap) => (
                  <span key={cap} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary/80 whitespace-nowrap">{cap}</span>
                ))}
              </div>
            </div>
            <div className="mt-6 flex items-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50">
                <Lock className="w-3 h-3" /> Free: Not included
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <Zap className="w-3 h-3" /> Premium: Full access
              </span>
            </div>
          </div>

          {/* Unlimited Recording, large */}
          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-start justify-between mb-6">
              <Mic className="w-6 h-6 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("Recording")}`}>Recording</span>
            </div>
            <h3 className="text-xl text-foreground mb-3">Record without limits</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Free users hit a 5-minute cap per day. With Premium, record full lectures, long meetings, hour-long podcasts, however long the content runs, SideBrain keeps up.
            </p>
            <div className="flex items-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50">
                <Lock className="w-3 h-3" /> Free: 5 min / day
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <Zap className="w-3 h-3" /> Premium: Unlimited
              </span>
            </div>
          </div>

          {/* Cloud Sync, small */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-start justify-between mb-6">
              <Cloud className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("Storage")}`}>Storage</span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Cloud sync & note history</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Free notes live only on your device. Premium saves everything to the cloud, upgrade versions, switch browsers, log in anywhere, your history is there.
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50"><Lock className="w-3 h-3" /> Free: Local only</span>
              <span className="flex items-center gap-1.5 text-primary"><Zap className="w-3 h-3" /> Premium: Unlimited cloud history</span>
            </div>
          </div>

          {/* Smarter AI, small */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-start justify-between mb-6">
              <Brain className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("AI")}`}>AI</span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Smarter AI, richer notes</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Premium runs on a more capable model. Better structure, sharper key points, more accurate glossaries, especially on dense or fast-paced content.
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50"><Lock className="w-3 h-3" /> Free: Basic model</span>
              <span className="flex items-center gap-1.5 text-primary"><Zap className="w-3 h-3" /> Premium: Advanced model</span>
            </div>
          </div>

          {/* Multi-language, small */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <div className="flex items-start justify-between mb-6">
              <Globe className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("AI")}`}>AI</span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Multi-language transcription</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Recording in Spanish, Hindi, Mandarin, or French? Premium transcribes and structures notes in 50+ languages, auto-detected, no setup needed.
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50"><Lock className="w-3 h-3" /> Free: English only</span>
              <span className="flex items-center gap-1.5 text-primary"><Zap className="w-3 h-3" /> Premium: 50+ languages</span>
            </div>
          </div>

          {/* Page Chat, large */}
          <div className="md:col-span-2 group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-accent/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
            <div className="flex items-start justify-between mb-6">
              <MessageSquare className="w-6 h-6 text-accent" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("Page Chat")}`}>Page Chat</span>
            </div>
            <h3 className="text-xl text-foreground mb-3">Chat without limits, across any tab</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Free users get 5 questions per day. Premium unlocks unlimited chat, ask as much as you need, switch between multiple open tabs in one conversation, and reference both your notes and the current page simultaneously.
            </p>
            <div className="flex items-center gap-6 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50">
                <Lock className="w-3 h-3" /> Free: 5 questions / day · single tab
              </span>
              <span className="flex items-center gap-1.5 text-accent">
                <Zap className="w-3 h-3" /> Premium: Unlimited · multi-tab
              </span>
            </div>
          </div>

          {/* Screenshots, small */}
          <div className="group p-8 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in" style={{ animationDelay: "0.45s" }}>
            <div className="flex items-start justify-between mb-6">
              <Camera className="w-5 h-5 text-primary" strokeWidth={1.5} />
              <span className={`text-xs px-3 py-1 rounded-full border ${tagColor("Screenshots")}`}>Screenshots</span>
            </div>
            <h3 className="text-lg text-foreground mb-3">Unlimited screenshots, auto-embedded</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Free lets you attach 2 screenshots per note. Premium removes the cap and embeds every screenshot inline, right where it belongs in your notes.
            </p>
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground/50"><Lock className="w-3 h-3" /> Free: 2 per note</span>
              <span className="flex items-center gap-1.5 text-primary"><Zap className="w-3 h-3" /> Premium: Unlimited + auto-embed</span>
            </div>
          </div>

        </div>
      </section>

      {/* Free vs Premium comparison */}
      <section className="container mx-auto px-6 py-12">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
        <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Free vs Premium</p>

        <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">

          {/* Free */}
          <div className="p-8 rounded-2xl border border-border/60 bg-card/40 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-1">Free</p>
            <p className="text-3xl text-foreground mb-6">$0</p>
            <ul className="space-y-3">
              {freeItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Check className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Link to="/">
                <Button variant="outline" className="w-full rounded-full h-11 text-sm border-border/60">
                  <Download className="w-3.5 h-3.5 mr-2" />
                  Download Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Premium */}
          <div className="p-8 rounded-2xl border border-primary/30 bg-primary/5 opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <p className="text-xs tracking-widest uppercase text-primary/70 mb-1">Premium</p>
            <div className="flex items-baseline gap-1 mb-6">
              <p className="text-3xl text-foreground">$10</p>
              <p className="text-sm text-muted-foreground">/ month</p>
            </div>
            <ul className="space-y-3">
              {premiumItems.map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-foreground">
                  <Check className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={2} />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button
                onClick={handleGetPremium}
                disabled={loading}
                className="w-full rounded-full h-11 text-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                {loading ? "Loading..." : "Get Premium · $10/mo"}
              </Button>
            </div>
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 text-center">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
        <h2 className="text-3xl md:text-4xl font-normal text-foreground mb-5 max-w-xl mx-auto leading-snug">
          Start free.<br /><em className="text-primary not-italic">Upgrade when you're ready.</em>
        </h2>
        <p className="text-muted-foreground mb-10 max-w-md mx-auto text-sm leading-relaxed">
          No credit card needed to get started. The free plan is generous enough to get real value, Premium is there when you outgrow it.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleGetPremium}
            disabled={loading}
            className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-10 h-12 text-base"
          >
            <Zap className="w-4 h-4 mr-2" />
            {loading ? "Loading..." : "Get Premium · $10/mo"}
          </Button>
          <Link to="/">
            <Button variant="ghost" className="rounded-full h-12 px-8 text-muted-foreground hover:text-foreground text-base">
              Download free first <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="container mx-auto px-6 text-center">
          <Leaf className="w-5 h-5 text-primary/40 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground/50">SideBrain, Learn with calm intention</p>
        </div>
      </footer>
    </div>
  );
};

export default Premium;
