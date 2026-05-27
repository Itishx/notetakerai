import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import { ArrowRight, FolderLock, KeyRound, Link2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

type VaultField = {
  label: string;
  valueHint: string;
};

type VaultSection = {
  slug: string;
  name: string;
  badge: string;
  note: string;
  fields: VaultField[];
};

const sharedGoogleFields: VaultField[] = [
  { label: "Google Cloud project name", valueHint: "Braino Workspace" },
  { label: "OAuth client type", valueHint: "Web application" },
  { label: "Authorized JavaScript origins", valueHint: "https://trybraino.com, https://www.trybraino.com, localhost dev origins" },
  { label: "Supabase Auth callback URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/auth/v1/callback" },
  { label: "Integration callback URIs", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/<provider-callback>" },
];

const sections: VaultSection[] = [
  {
    slug: "google-drive",
    name: "Google Drive",
    badge: "Live first",
    note: "Use this for Drive connect, folder actions, and later Docs/Drive orchestration.",
    fields: [
      { label: "Client ID", valueHint: "Paste from Google OAuth app" },
      { label: "Client secret", valueHint: "Paste from Google OAuth app" },
      { label: "Scope set", valueHint: "openid, email, https://www.googleapis.com/auth/drive.file" },
      { label: "Redirect URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/google-drive-oauth-callback" },
      { label: "Supabase secret names", valueHint: "GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI" },
    ],
  },
  {
    slug: "google-calendar",
    name: "Google Calendar",
    badge: "Next",
    note: "Best ambient-awareness connector for Braino after Drive.",
    fields: [
      { label: "Client ID", valueHint: "Reuse Google OAuth app or create a separate client" },
      { label: "Client secret", valueHint: "Stored only in backend secrets" },
      { label: "Scope set", valueHint: "calendar read/write scopes you choose" },
      { label: "Redirect URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/google-calendar-oauth-callback" },
      { label: "Webhook callback", valueHint: "Calendar watch endpoint in Braino backend" },
    ],
  },
  {
    slug: "google-docs",
    name: "Google Docs",
    badge: "Shared Google",
    note: "Usually shares the same Google OAuth client as Drive and Calendar.",
    fields: [
      { label: "Client ID", valueHint: "Usually same Google OAuth app" },
      { label: "Client secret", valueHint: "Usually same Google OAuth app" },
      { label: "Scope set", valueHint: "Docs scopes only if needed beyond Drive-powered creation" },
      { label: "Redirect URI", valueHint: "Only needed if you split Docs into a separate client" },
    ],
  },
  {
    slug: "gmail",
    name: "Gmail",
    badge: "Heavy compliance",
    note: "Keep all Gmail config separate because it has the highest policy overhead.",
    fields: [
      { label: "Client ID", valueHint: "Google OAuth app for Gmail access" },
      { label: "Client secret", valueHint: "Stored only in backend secrets" },
      { label: "Scope set", valueHint: "gmail.metadata / gmail.readonly / gmail.modify depending on rollout" },
      { label: "Redirect URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/gmail-oauth-callback" },
      { label: "Pub/Sub topic", valueHint: "Google Cloud Pub/Sub topic for watch notifications" },
      { label: "Pub/Sub subscription", valueHint: "Push subscription for Braino webhook" },
    ],
  },
  {
    slug: "slack",
    name: "Slack",
    badge: "Realtime gold",
    note: "Best work-notification connector for mentions, DMs, and team activity.",
    fields: [
      { label: "Client ID", valueHint: "From Slack app" },
      { label: "Client secret", valueHint: "From Slack app" },
      { label: "Signing secret", valueHint: "Verify incoming webhook/event payloads" },
      { label: "Bot token", valueHint: "Stored after installing app to workspace" },
      { label: "Redirect URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/slack-oauth-callback" },
      { label: "Events request URL", valueHint: "Braino Slack events webhook" },
    ],
  },
  {
    slug: "x",
    name: "X",
    badge: "Scheduling live",
    note: "Use OAuth 1.0a user auth first so Braino can link real X accounts and post from the backend on schedule.",
    fields: [
      { label: "API key / consumer key", valueHint: "X_API_KEY or TWITTER_CONSUMER_KEY" },
      { label: "API secret / consumer secret", valueHint: "X_API_SECRET or TWITTER_CONSUMER_SECRET" },
      { label: "Callback URL", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/x-oauth-callback" },
      { label: "App permissions", valueHint: "Read and write" },
      { label: "Supabase secret names", valueHint: "X_API_KEY, X_API_SECRET, X_OAUTH_CALLBACK_URL" },
      { label: "Posting note", valueHint: "Per-user access tokens are captured during the 3-legged OAuth flow" },
    ],
  },
  {
    slug: "notion",
    name: "Notion",
    badge: "Already wired",
    note: "You already have this path in the repo, so this is mostly for storage discipline.",
    fields: [
      { label: "Client ID", valueHint: "NOTION_OAUTH_CLIENT_ID" },
      { label: "Client secret", valueHint: "NOTION_OAUTH_CLIENT_SECRET" },
      { label: "Redirect URI", valueHint: "https://ovapacfrzddnhrwvkbkr.supabase.co/functions/v1/notion-oauth-callback" },
      { label: "Workspace / bot metadata", valueHint: "Captured per user after OAuth" },
    ],
  },
  {
    slug: "outlook-graph",
    name: "Outlook / Microsoft Graph",
    badge: "Enterprise",
    note: "Use this for Outlook mail, Outlook calendar, and Microsoft 365 event subscriptions.",
    fields: [
      { label: "Application / client ID", valueHint: "From Azure / Entra app registration" },
      { label: "Client secret", valueHint: "Stored in backend secrets only" },
      { label: "Tenant mode", valueHint: "Single-tenant or multi-tenant" },
      { label: "Redirect URI", valueHint: "Braino Graph OAuth callback endpoint" },
      { label: "Subscription callback URL", valueHint: "Graph notifications webhook" },
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    badge: "Builder-native",
    note: "Prefer a GitHub App over a plain OAuth app for repo events and permissions.",
    fields: [
      { label: "GitHub App ID", valueHint: "App identifier from GitHub" },
      { label: "Client ID", valueHint: "GitHub App client ID" },
      { label: "Client secret", valueHint: "GitHub App client secret" },
      { label: "Webhook secret", valueHint: "Verify incoming GitHub events" },
      { label: "Private key file", valueHint: "Store securely, not in frontend" },
      { label: "Callback URL", valueHint: "Braino GitHub install/auth callback" },
    ],
  },
  {
    slug: "asana-jira-clickup",
    name: "Asana / Jira / ClickUp / Linear / Trello",
    badge: "PM tools",
    note: "Keep project-management connectors grouped in one vault entry if that fits your workflow.",
    fields: [
      { label: "Provider app/client ID", valueHint: "One per service" },
      { label: "Provider client secret / token", valueHint: "Stored only in backend secret manager" },
      { label: "Webhook secret", valueHint: "If the provider supports signed webhooks" },
      { label: "Redirect URI", valueHint: "One callback per provider" },
      { label: "Workspace / organization IDs", valueHint: "Store for debugging and admin mapping" },
    ],
  },
  {
    slug: "stripe-shopify",
    name: "Stripe / Shopify",
    badge: "Commerce",
    note: "Good webhook-heavy connectors. Very important to store signing secrets cleanly.",
    fields: [
      { label: "API secret key", valueHint: "Provider secret key" },
      { label: "Webhook signing secret", valueHint: "Verify incoming commerce events" },
      { label: "Client / app ID", valueHint: "If OAuth/install flow is used" },
      { label: "Client secret", valueHint: "Store in backend only" },
      { label: "Webhook URL", valueHint: "Braino commerce events endpoint" },
    ],
  },
  {
    slug: "discord-n8n-zoom-canva",
    name: "Discord / n8n / Zoom / Canva / Airtable",
    badge: "Expansion",
    note: "Long-tail and creator/ops connectors. Still worth centralizing so setup doesn't get messy later.",
    fields: [
      { label: "Client ID / app ID", valueHint: "One per provider" },
      { label: "Client secret / access token", valueHint: "Store in backend only" },
      { label: "Webhook URL", valueHint: "Braino event or trigger endpoint" },
      { label: "Signing secret", valueHint: "If the provider signs callbacks" },
      { label: "Redirect URI", valueHint: "Provider-specific callback endpoint" },
    ],
  },
];

function VaultRow({ label, valueHint }: VaultField) {
  return (
    <div
      className="grid gap-3 rounded-2xl px-4 py-4 md:grid-cols-[220px_1fr]"
      style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)" }}
    >
      <div className="text-sm font-medium" style={{ color: "var(--sb-ink)" }}>
        {label}
      </div>
      <div
        className="rounded-xl px-3 py-2 text-sm"
        style={{
          background: "var(--sb-bg-2)",
          color: "var(--sb-ink-3)",
          fontFamily: "'JetBrains Mono', monospace",
          wordBreak: "break-word",
        }}
      >
        {valueHint}
      </div>
    </div>
  );
}

export default function ConnectorsVault() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--sb-bg)", color: "var(--sb-ink)" }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px]"
        style={{ background: "radial-gradient(circle at top, rgba(226,125,57,0.12), transparent 60%)" }}
      />
      <Navbar />

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.34em]" style={{ color: "var(--sb-ink-3)" }}>
              Secrets Playbook
            </p>
            <h1
              className="max-w-4xl text-4xl font-normal leading-[1.02] tracking-tight md:text-6xl"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              One page to store the
              {" "}
              <em style={{ color: "var(--sb-accent-deep)", fontStyle: "italic" }}>shape</em>
              {" "}
              of every connector credential.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              This page is deliberately a secure checklist, not a secret dump. Use it to copy the exact field names,
              callbacks, redirect URIs, and storage labels into your password manager, secret store, or ops doc.
            </p>
          </div>

          <div
            className="rounded-[30px] p-6 backdrop-blur-xl"
            style={{
              border: "1px solid var(--sb-line)",
              background: "color-mix(in srgb, var(--sb-panel-2) 84%, transparent)",
              boxShadow: "var(--sb-shadow)",
            }}
          >
            <div className="flex items-center gap-3 text-sm font-medium">
              <ShieldCheck className="h-4 w-4" style={{ color: "var(--sb-accent-deep)" }} />
              Security stance
            </div>
            <div className="mt-4 space-y-3 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              <p>Never hardcode production secrets in frontend code or tracked files.</p>
              <p>Store provider secrets in backend envs, Supabase secrets, or a password manager.</p>
              <p>Client IDs are fine to share more broadly. Client secrets, signing secrets, refresh tokens, and private keys are not.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <div
          className="rounded-[30px] p-6"
          style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel-2)", boxShadow: "var(--sb-shadow-sm)" }}
        >
          <div className="mb-4 flex items-center gap-3">
            <FolderLock className="h-5 w-5" style={{ color: "var(--sb-accent-deep)" }} />
            <h2
              className="text-2xl font-normal tracking-tight"
              style={{ color: "var(--sb-ink)", fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Shared Google app checklist
            </h2>
          </div>
          <div className="space-y-3">
            {sharedGoogleFields.map((field) => (
              <VaultRow key={field.label} {...field} />
            ))}
          </div>
        </div>
      </section>

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pb-24">
        <div
          className="rounded-[32px] p-3 backdrop-blur-xl md:p-5"
          style={{
            border: "1px solid var(--sb-line)",
            background: "color-mix(in srgb, var(--sb-panel-2) 88%, transparent)",
            boxShadow: "var(--sb-shadow-lg)",
          }}
        >
          <Accordion type="single" collapsible className="w-full">
            {sections.map((section) => (
              <AccordionItem key={section.slug} value={section.slug} className="px-3 md:px-4" style={{ borderColor: "var(--sb-line-2)" }}>
                <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div
                      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                      style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}
                    >
                      <KeyRound className="h-5 w-5" style={{ color: "var(--sb-ink)" }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold" style={{ color: "var(--sb-ink)" }}>{section.name}</span>
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                          style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)" }}
                        >
                          {section.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
                        {section.note}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <div className="space-y-3">
                    {section.fields.map((field) => (
                      <VaultRow key={`${section.slug}-${field.label}`} {...field} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <div
          className="flex flex-col gap-5 rounded-[30px] p-8 md:flex-row md:items-center md:justify-between"
          style={{
            border: "1px solid var(--sb-line)",
            background: "linear-gradient(135deg, var(--sb-panel-2), var(--sb-panel), var(--sb-bg))",
            boxShadow: "var(--sb-shadow)",
          }}
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em]" style={{ color: "var(--sb-ink-3)" }}>Next move</p>
            <h2
              className="mt-3 text-3xl font-normal tracking-tight"
              style={{ color: "var(--sb-ink)", fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              Copy this structure into your real secret store.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              Once the values live in a safe place, we can wire them into Supabase secrets and deploy each connector one by one.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/integrations"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
              style={{ border: "1px solid var(--sb-line)", background: "var(--sb-panel)", color: "var(--sb-ink)" }}
            >
              Back to Integrations
              <Link2 className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
              style={{ background: "var(--sb-ink)", color: "var(--sb-on-ink)" }}
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl px-5 py-4" style={{ border: "1px dashed var(--sb-line)", background: "var(--sb-panel)" }}>
          <div className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
            <LockKeyhole className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: "var(--sb-accent-deep)" }} />
            <span>
              Real secrets should live in a password manager, 1Password vault, Doppler, Supabase secrets, Vercel envs, or another server-side secret system.
              This page is for labels and structure only.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
