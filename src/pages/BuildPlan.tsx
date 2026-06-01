import { Check, Clock, AlertCircle, Zap, ArrowRight, Leaf, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SideBrainLogo from "@/components/SideBrainLogo";

const done = "done";
const partial = "partial";
const todo = "todo";

const currentState = [
  { feature: "Record tab audio", status: done, note: "Chrome tab capture, mixes mic + tab, stores as webm" },
  { feature: "Transcription", status: done, note: "Gemini 2.5 Flash via Lovable gateway — auto-detects language, multi-language already works" },
  { feature: "AI-structured notes", status: done, note: "Strict transcript-only policy, no hallucination" },
  { feature: "Chat with page", status: done, note: "Reads page text (12k chars), sends with notes + history to Gemini" },
  { feature: "Screenshots in chat", status: done, note: "captureVisibleTab, base64, updates notes with diagram context" },
  { feature: "Local note history", status: done, note: "20 notes max in chrome.storage.local" },
  { feature: "Notion sync", status: done, note: "Full OAuth, markdown → Notion blocks, images via Supabase storage" },
  { feature: "Auth (login / signup)", status: done, note: "Supabase auth, relay via DOM element to extension" },
  { feature: "Cloud note save", status: partial, note: "saveNoteToCloud() exists but only fires when user is authenticated — not yet premium-gated" },
  { feature: "Premium tier / paywall", status: todo, note: "No payment system, no tier checks — all features free for everyone right now" },
  { feature: "Usage limits (free tier)", status: todo, note: "No recording cap, no chat cap, no screenshot cap enforced" },
  { feature: "Multi-tab chat", status: todo, note: "Claimed on Premium page, needs chat context rearchitecture" },
  { feature: "AI model switching by tier", status: todo, note: "Same Gemini model for all users — architecture already supports it, just needs routing" },
];

const phases = [
  {
    num: "01",
    title: "Polar.sh Account Setup",
    time: "~1 day",
    steps: [
      "Sign up at polar.sh",
      "Complete Stripe Connect KYC — PAN card, bank account (IFSC + number). Works in India via Stripe Connect Express, not Stripe Payments. Polar is the Merchant of Record.",
      "Create product: SideBrain Premium — $10/month recurring",
      "Copy API key and webhook secret from Polar dashboard",
      "Note: fee is 4% + $0.40 per transaction, no monthly fees",
    ],
    note: "Polar confirmed India works: they collect from customers via their own Stripe account, then payout to your Indian bank via Stripe Connect. Reference: x.com/polar_sh/status/1953085696819749358",
  },
  {
    num: "02",
    title: "Supabase Schema + Webhook Edge Function",
    time: "~2 hours",
    steps: [
      "Add is_premium boolean column to profiles table (default false)",
      "Add polar_customer_id text column to profiles table",
      "Create Supabase Edge Function: polar-webhook",
      "Function verifies webhook signature using Polar secret",
      "On subscription.created / subscription.updated (active) → set is_premium = true",
      "On subscription.revoked / subscription.canceled → set is_premium = false",
      "Register Edge Function URL in Polar dashboard as webhook endpoint",
    ],
    note: "Reference: polar.sh/docs/integrate/sdk/adapters/supabase — official adapter. Starter kit at github.com/polarsource/polar-supabase-starter has this boilerplate almost ready.",
  },
  {
    num: "03",
    title: "Checkout Flow on Website",
    time: "~2 hours",
    steps: [
      "Install @polar-sh/sdk in the website project",
      "Wire Get Premium button on Premium.tsx to call Polar checkout API",
      "Pass logged-in user's email + Supabase user ID to link the subscription to their account",
      "Polar handles the payment page entirely — redirects back to site on success",
      "Add Manage subscription link (Polar customer portal) to the user menu in Navbar",
    ],
  },
  {
    num: "04",
    title: "Extension Reads Premium Flag",
    time: "~1 hour",
    steps: [
      "In popup.js, after loading auth user, fetch is_premium from Supabase profiles table",
      "Store in chrome.storage.local as isPremium — persists between extension opens",
      "Refresh on window.addEventListener('focus') — same pattern as existing auth refresh",
      "All feature gates read this one boolean: if (!isPremium) { checkLimit(); }",
    ],
  },
  {
    num: "05",
    title: "Recording Time Limit",
    time: "~half day",
    free: "30 min / day",
    premium: "Unlimited",
    steps: [
      "On recording start, read recordingSecondsToday + recordingResetDate from chrome.storage",
      "If date is not today, reset counter to 0",
      "If recordingSecondsToday >= 1800 and !isPremium, block start and show upgrade prompt",
      "Every second while recording, increment counter and write back to storage",
      "Premium users skip the check entirely",
    ],
  },
  {
    num: "06",
    title: "Chat Question Limit",
    time: "~half day",
    free: "10 questions / day",
    premium: "Unlimited",
    steps: [
      "On each chat send, read chatQuestionsToday + chatResetDate from chrome.storage",
      "If date is not today, reset to 0",
      "If chatQuestionsToday >= 10 and !isPremium, block send and show upgrade prompt",
      "On successful send, increment and save counter",
    ],
  },
  {
    num: "07",
    title: "Screenshot Limit",
    time: "~2 hours",
    free: "3 per session",
    premium: "Unlimited + auto-embed",
    steps: [
      "Track screenshotCount per recording session in memory — reset on new session",
      "If count >= 3 and !isPremium, disable screenshot button with tooltip",
      "Auto-embed (inline placement in notes) already works — just gate behind isPremium",
    ],
  },
  {
    num: "08",
    title: "AI Model Switching",
    time: "~1 hour",
    free: "Gemini Flash",
    premium: "Gemini Pro",
    steps: [
      "Pass isPremium flag in the transcription + chat API request body",
      "In Supabase Edge Functions (transcribe-and-notes, chat-about-notes), read the flag",
      "Route to model string: google/gemini-2.5-flash (free) vs google/gemini-2.5-pro (premium)",
      "No other changes needed — architecture already supports model switching",
    ],
  },
  {
    num: "09",
    title: "Cloud Note History",
    time: "~half day",
    free: "Local only (20 notes)",
    premium: "Full cloud history",
    steps: [
      "saveNoteToCloud() already exists in popup.js — remove the auth-only gate, make it isPremium-gated",
      "Free users: notes save to chrome.storage only (current behavior unchanged)",
      "Premium users: notes save to both local + Supabase notes table",
      "Add History view that fetches from Supabase for premium users vs. local for free",
    ],
  },
  {
    num: "10",
    title: "Upgrade Prompts in Extension",
    time: "~1 day",
    steps: [
      "When a free user hits any limit, show an inline banner — not a browser alert()",
      "Banner: You've hit the daily limit. Upgrade to Premium for unlimited [feature].",
      "Upgrade button opens sidebrain.com/premium in a new tab or directly to Polar checkout",
      "Style consistent with existing sidepanel theme — orange primary, rounded corners",
      "Add Free plan badge in extension header when not premium, Premium badge when subscribed",
    ],
  },
  {
    num: "11",
    title: "Multi-tab Chat",
    time: "~3 days",
    free: "Single tab",
    premium: "Multiple tabs in one conversation",
    steps: [
      "Currently: one currentPageContext object holds one tab's content",
      "New: maintain a pageContexts[] array, one entry per tab the user adds",
      "Add Add tab to context button in chat UI — premium only",
      "On click, capture current tab's page content and push to the array",
      "Send full array to chat-about-notes Edge Function",
      "Update system prompt to reference multiple sources",
      "Show tab pills in chat UI so user can see and remove sources",
    ],
    note: "This is the heaviest feature — do it last. All other gates are 1-2 days total. Don't block the launch on multi-tab.",
  },
];

const files = [
  { file: "extension/popup.js", changes: "isPremium flag load, all limit checks, upgrade prompt triggers, multi-tab context array" },
  { file: "extension/sidepanel.html", changes: "Upgrade banner markup, free/premium badge, multi-tab UI elements" },
  { file: "extension/styles.css", changes: "Upgrade banner styles, badge styles" },
  { file: "supabase/functions/polar-webhook", changes: "New Edge Function — created from scratch, handles subscription events" },
  { file: "supabase/functions/transcribe-and-notes", changes: "Read isPremium flag, route to different Gemini model" },
  { file: "supabase/functions/chat-about-notes", changes: "Read isPremium flag, model routing, multi-tab context array support" },
  { file: "src/pages/Premium.tsx", changes: "Honest rewrite + wire actual Polar checkout button" },
  { file: "src/components/Navbar.tsx", changes: "Manage subscription link for premium users" },
  { file: "Supabase profiles table", changes: "Add is_premium boolean, polar_customer_id text columns" },
];

const statusIcon = (s: string) => {
  if (s === done) return <Check className="w-3.5 h-3.5 text-green-500/70" strokeWidth={2} />;
  if (s === partial) return <AlertCircle className="w-3.5 h-3.5 text-blue-400/70" strokeWidth={1.5} />;
  return <Clock className="w-3.5 h-3.5 text-primary/60" strokeWidth={1.5} />;
};

const statusLabel = (s: string) => {
  if (s === done) return <span className="text-xs px-2.5 py-0.5 rounded-full border bg-green-500/8 border-green-500/20 text-green-500/70">Live</span>;
  if (s === partial) return <span className="text-xs px-2.5 py-0.5 rounded-full border bg-blue-400/8 border-blue-400/20 text-blue-400/70">Partial</span>;
  return <span className="text-xs px-2.5 py-0.5 rounded-full border bg-primary/8 border-primary/20 text-primary/70">To build</span>;
};

const BuildPlan = () => (
  <div className="min-h-screen bg-background selection:bg-primary/20">
    <Navbar />

    {/* Hero */}
    <section className="relative overflow-hidden pt-16">
      <div className="container relative mx-auto px-6 pt-24 pb-16 text-center">
        <p className="text-xs tracking-widest uppercase text-muted-foreground/50 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Internal
        </p>
        <h1 className="text-4xl md:text-6xl font-normal tracking-tight text-foreground max-w-3xl mx-auto leading-[1.15] opacity-0 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Premium implementation
          <br />
          <em className="text-primary" style={{ fontFamily: "'TimesNewRomanMT', 'Times New Roman', serif", fontStyle: "italic" }}>plan</em>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed opacity-0 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          Full roadmap from Polar.sh setup to every feature gate in the extension. Don't lose this.
        </p>
      </div>
    </section>

    <div className="container mx-auto px-6">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>

    {/* Current state */}
    <section className="container mx-auto px-6 py-20">
      <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">What's actually built today</p>
      <div className="max-w-5xl mx-auto rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {currentState.map((row, i) => (
          <div key={row.feature} className={`flex items-start gap-4 px-8 py-5 ${i < currentState.length - 1 ? "border-b border-border/40" : ""}`}>
            <div className="flex-shrink-0 mt-0.5">{statusIcon(row.status)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="text-sm text-foreground">{row.feature}</span>
                {statusLabel(row.status)}
              </div>
              <p className="text-xs text-muted-foreground/60 leading-relaxed">{row.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* Phases */}
    <section className="container mx-auto px-6 pb-20">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
      <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Build phases</p>

      <div className="space-y-4 max-w-5xl mx-auto">
        {phases.map((phase) => (
          <div key={phase.num} className="p-8 md:p-10 rounded-2xl border border-border/60 bg-card/40 hover:border-primary/20 hover:bg-card/80 transition-all duration-500 opacity-0 animate-fade-in">
            <div className="flex items-start gap-4 mb-6">
              <span className="text-3xl text-primary/50 font-normal leading-none w-8 flex-shrink-0">{phase.num}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap mb-1">
                  <h3 className="text-lg text-foreground">{phase.title}</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full border border-border/60 text-muted-foreground/50">{phase.time}</span>
                </div>
                {(phase.free || phase.premium) && (
                  <div className="flex items-center gap-4 text-xs mt-1">
                    <span className="text-muted-foreground/40">Free: {phase.free}</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground/20" />
                    <span className="text-primary/70 flex items-center gap-1"><Zap className="w-3 h-3" /> Premium: {phase.premium}</span>
                  </div>
                )}
              </div>
            </div>

            <ul className="space-y-2 mb-4">
              {phase.steps.map((step, j) => (
                <li key={j} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <ChevronRight className="w-3 h-3 text-primary/30 flex-shrink-0 mt-1" />
                  {step}
                </li>
              ))}
            </ul>

            {phase.note && (
              <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground/70 leading-relaxed">
                {phase.note}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>

    {/* Files */}
    <section className="container mx-auto px-6 pb-20">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
      <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Files to modify</p>

      <div className="max-w-5xl mx-auto rounded-2xl border border-border/60 bg-card/40 overflow-hidden">
        {files.map((row, i) => (
          <div key={row.file} className={`flex items-start gap-6 px-8 py-5 ${i < files.length - 1 ? "border-b border-border/40" : ""}`}>
            <code className="text-xs text-primary/70 flex-shrink-0 bg-primary/5 border border-primary/10 px-2 py-1 rounded-md mt-0.5 whitespace-nowrap">{row.file}</code>
            <p className="text-sm text-muted-foreground leading-relaxed">{row.changes}</p>
          </div>
        ))}
      </div>
    </section>

    {/* References */}
    <section className="container mx-auto px-6 pb-24">
      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-20" />
      <p className="text-center text-sm tracking-widest uppercase text-muted-foreground/60 mb-16">Key references</p>

      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-4">
        {[
          { label: "Polar Supabase adapter", url: "polar.sh/docs/integrate/sdk/adapters/supabase" },
          { label: "Polar + Supabase starter kit", url: "github.com/polarsource/polar-supabase-starter" },
          { label: "Polar webhooks docs", url: "polar.sh/docs/integrate/webhooks/endpoints" },
          { label: "Polar India payout confirmation", url: "x.com/polar_sh/status/1953085696819749358" },
          { label: "Supabase project", url: "suwhgaxxdizowbyjlljj.supabase.co" },
          { label: "Current transcription model", url: "google/gemini-2.5-flash via Lovable gateway" },
        ].map((ref) => (
          <div key={ref.label} className="p-5 rounded-2xl border border-border/60 bg-card/40">
            <p className="text-xs text-muted-foreground/50 mb-1">{ref.label}</p>
            <p className="text-sm text-primary/70 font-mono break-all">{ref.url}</p>
          </div>
        ))}
      </div>
    </section>

    {/* Footer */}
    <footer className="py-12 border-t border-border/40">
      <div className="container mx-auto px-6 text-center">
        <Leaf className="w-5 h-5 text-primary/40 mx-auto mb-4" />
        <p className="text-sm text-muted-foreground/50">SideBrain internal plan. Not for distribution.</p>
      </div>
    </footer>
  </div>
);

export default BuildPlan;
