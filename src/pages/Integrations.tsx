import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Navbar from "@/components/Navbar";
import { ArrowRight, BellRing, BookOpen, Briefcase, Calendar, CheckCircle2, ClipboardList, CreditCard, Database, FileText, FolderOpen, Github, KanbanSquare, LayoutGrid, Mail, MessageCircle, MessageSquareText, Network, ShieldCheck, ShoppingCart, Video } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";

type IntegrationCard = {
  slug: string;
  name: string;
  icon: ComponentType<{ className?: string }>;
  badge: string;
  auth: string;
  cost: string;
  why: string;
  actions: string[];
  setup: string[];
  plan: string[];
  notes: string[];
};

const integrations: IntegrationCard[] = [
  {
    slug: "slack",
    name: "Slack",
    icon: MessageSquareText,
    badge: "High leverage",
    auth: "OAuth app + Events API",
    cost: "Free to build with. Workspace plan affects history access.",
    why: "Mentions, DMs, and channel activity are perfect ambient events for Braino.",
    actions: [
      "Announce mentions, DMs, and urgent channel replies.",
      "Summarize unread activity before a meeting or at the end of the day.",
      "Draft quick responses or turn Slack asks into Braino tasks.",
    ],
    setup: [
      "Create a Slack app at api.slack.com/apps and choose your workspace.",
      "Add OAuth redirect URLs for Braino backend callback endpoints.",
      "Add bot scopes like channels:history, channels:read, chat:write, im:history, im:read, mpim:history, users:read.",
      "Enable Event Subscriptions and point Slack at a Braino webhook URL.",
      "Subscribe to events like app_mention, message.channels, and message.im.",
      "Install the app to your workspace and store the client ID, client secret, bot token, and signing secret.",
    ],
    plan: [
      "Start with mentions and DMs only so the first version stays high-signal.",
      "Normalize Slack events into a shared activity_events table.",
      "Speak only priority events when Braino is active on screen.",
    ],
    notes: [
      "Great first integration if Braino is becoming a work copilot.",
      "Realtime is built-in through Slack events, so this fits your architecture cleanly.",
    ],
  },
  {
    slug: "google-calendar",
    name: "Google Calendar",
    icon: Calendar,
    badge: "Live now",
    auth: "Google OAuth + Calendar watch",
    cost: "Standard use is generally free, subject to quotas.",
    why: "Calendar gives Braino time awareness, meeting reminders, and prep moments without needing messy inbox access first.",
    actions: [
      "Announce upcoming meetings and context-switch moments.",
      "Schedule, reschedule, cancel, forward, and list real Calendar events.",
      "Open the next Google Meet and kick Braino into Meeting & Call mode.",
    ],
    setup: [
      "Create a Google Cloud project and enable Google Calendar API.",
      "Configure the OAuth consent screen with app name, support email, and test users.",
      "Create a web OAuth client and add the Braino callback URL.",
      "Add the Calendar webhook callback URL so watch channels can report changes.",
      "Store the client ID, client secret, redirect URI, and webhook URL in Supabase secrets.",
      "Connect Google Calendar from the Braino dashboard and verify a real test meeting.",
    ],
    plan: [
      "Keep reminders and Meet handoff feeling instant without becoming noisy.",
      "Renew watch channels safely when they are close to expiring.",
      "Keep one clean shared formatter so schedule changes sound natural in voice mode.",
    ],
    notes: [
      "This is now one of Braino's live ambient connectors, not just a roadmap idea.",
      "The right QA loop is: connect -> create -> reschedule -> cancel -> reminder -> Meet join.",
    ],
  },
  {
    slug: "notion",
    name: "Notion",
    icon: BookOpen,
    badge: "Structured memory",
    auth: "Internal integration first, OAuth later",
    cost: "Free to start. Main constraints are workspace access and rate limits.",
    why: "Notion is useful when Braino needs a durable place to save summaries, plans, and working memory.",
    actions: [
      "Create or update project pages from Braino sessions.",
      "Announce edits to key pages or databases.",
      "Save meeting summaries, research notes, or daily digests in the right workspace.",
    ],
    setup: [
      "Create a Notion integration in developer settings.",
      "Start with an internal integration for your own workspace.",
      "Grant the integration read, insert, and update content capabilities.",
      "Copy the access token and store it in Braino backend env.",
      "Share the target pages and databases with the integration.",
      "Add webhooks later if you want Braino to react to page or database updates in realtime.",
    ],
    plan: [
      "Use Notion first as Braino's memory sink, not its main event source.",
      "Let Braino create clean database entries for sessions, tasks, and summaries.",
      "Add public OAuth only when you want multi-user self-serve connect.",
    ],
    notes: [
      "Fastest way to make Braino useful for notes and structured follow-through.",
      "Less magical than Slack or Calendar for speaking, but very strong for persistence.",
    ],
  },
  {
    slug: "google-drive",
    name: "Google Drive",
    icon: FolderOpen,
    badge: "Operations layer",
    auth: "Google OAuth + Drive API",
    cost: "Standard use is generally free, subject to quotas.",
    why: "Drive is the file system layer. It matters once Braino starts creating, moving, and organizing real work output.",
    actions: [
      "Find the right file or folder instantly.",
      "Move Braino-created notes into the correct project folder.",
      "Announce file shares, updates, or newly created artifacts.",
    ],
    setup: [
      "Enable Google Drive API in the same Google Cloud project.",
      "Reuse the existing Google OAuth client or create a separate one.",
      "Decide the minimum Drive scopes Braino really needs.",
      "Implement file search, folder discovery, and move operations in Braino backend.",
      "Add Drive push notifications if you want file-level change awareness.",
    ],
    plan: [
      "Keep Drive behind content integrations at first: Docs, meeting notes, research exports.",
      "Make one opinionated Braino folder strategy instead of giving users a messy open-ended system.",
      "Use Drive events for artifact awareness, not for noisy every-file chatter.",
    ],
    notes: [
      "Not the flashiest integration, but incredibly useful once Braino starts producing files.",
      "Best paired with Docs and Calendar rather than launched alone.",
    ],
  },
  {
    slug: "google-docs",
    name: "Google Docs",
    icon: FileText,
    badge: "Content layer",
    auth: "Google OAuth + Docs API",
    cost: "Standard use is generally free, subject to quotas.",
    why: "Docs is where Braino turns research, meetings, and tasks into polished output.",
    actions: [
      "Create drafts, reports, meeting notes, and articles reliably.",
      "Append structured content into the right document section.",
      "Read doc content for follow-up summarization or editing.",
    ],
    setup: [
      "Enable Google Docs API in your Google Cloud project.",
      "Reuse the Google OAuth client already created for Calendar or Drive.",
      "Implement create-document and write-to-document backend methods.",
      "Pair Docs with Drive file lookup so Braino can find the right file before editing.",
      "Start with Braino-owned docs before expanding to arbitrary user documents.",
    ],
    plan: [
      "Use Docs for high-confidence writing flows rather than scraping docs.google.com in the browser.",
      "Store doc IDs so Braino can reopen and continue work later.",
      "Route notifications about file changes through Drive, not Docs alone.",
    ],
    notes: [
      "This is the clean long-term replacement for brittle Google Docs browser automation.",
      "Drive helps Braino locate the doc; Docs helps Braino edit it well.",
    ],
  },
  {
    slug: "gmail",
    name: "Gmail",
    icon: BellRing,
    badge: "Highest upside",
    auth: "Google OAuth + Gmail watch + Pub/Sub",
    cost: "Standard API use is generally free now, but restricted-scope review is the real cost.",
    why: "Gmail is the most magical inbox-aware integration, but it also has the most compliance overhead.",
    actions: [
      "Announce important new emails even when Gmail is closed.",
      "Summarize threads and surface what needs a reply.",
      "Draft or organize email workflows once scope and compliance are ready.",
    ],
    setup: [
      "Enable Gmail API and configure a Google OAuth app.",
      "Set up Google Cloud Pub/Sub for mailbox notifications.",
      "Implement users.watch plus history.list on the backend.",
      "Store refresh tokens, history IDs, and watch expiration safely.",
      "Renew watches daily and treat the backend as the source of truth.",
    ],
    plan: [
      "Architect for V3, but be careful about when you publicly roll out restricted scopes.",
      "Start with awareness and triage before auto-actions.",
      "Use the same realtime extension listener pattern already used for Braino speaking.",
    ],
    notes: [
      "Most powerful inbox path, but also the slowest one organizationally because of Google's restricted-scope process.",
      "Worth doing only when you're ready to lean into the security overhead.",
    ],
  },
  {
    slug: "n8n",
    name: "n8n",
    icon: Network,
    badge: "Force multiplier",
    auth: "Webhook endpoints + optional API key",
    cost: "Self-hosted can be cheap. Cloud pricing depends on plan.",
    why: "n8n lets Braino plug into many long-tail tools without building every native integration first.",
    actions: [
      "Trigger workflows from Braino actions.",
      "Receive workflow events back into Braino for announcements.",
      "Bridge services like Airtable, Typeform, Stripe, or custom internal tools.",
    ],
    setup: [
      "Create or connect an n8n workspace.",
      "Expose a Braino webhook endpoint that n8n can call.",
      "Create a Braino trigger webhook in n8n for outbound actions.",
      "Define a simple shared JSON event schema between Braino and n8n.",
      "Store environment-level secrets for secure webhook calls if needed.",
    ],
    plan: [
      "Use n8n as an expansion layer, not a replacement for native Slack or Calendar integrations.",
      "Standardize Braino action payloads early so workflows remain reusable.",
      "Let users bring their own workflows later once the core contract is stable.",
    ],
    notes: [
      "Great way to widen Braino's reach without exploding your native integration backlog.",
      "Best for custom and enterprise workflows after the first-party foundations are in place.",
    ],
  },
  {
    slug: "github",
    name: "GitHub",
    icon: Github,
    badge: "Builder-native",
    auth: "GitHub App or OAuth app",
    cost: "Free to build with. Useful plan details depend on the user's GitHub setup.",
    why: "GitHub turns Braino into a builder-side assistant for PRs, issues, releases, and CI events.",
    actions: [
      "Announce review requests, CI failures, and new issues.",
      "Summarize PRs or issue threads out loud.",
      "Turn repo activity into Braino tasks or follow-up reminders.",
    ],
    setup: [
      "Create a GitHub App in developer settings.",
      "Set callback and webhook URLs for Braino backend.",
      "Choose permissions for pull requests, issues, checks, and repository metadata.",
      "Install the app on the target repositories or org.",
      "Verify webhook signatures and normalize events into Braino activity format.",
    ],
    plan: [
      "Start with PR review requests and failing checks because they are high-value and easy to understand.",
      "Let Braino speak only important code events, not every push.",
      "Keep per-repo notification preferences configurable.",
    ],
    notes: [
      "Fantastic if Braino is serving founders, engineers, and product teams.",
      "Pairs naturally with Slack and Calendar for a workday assistant loop.",
    ],
  },
  {
    slug: "microsoft-graph",
    name: "Microsoft Graph / Outlook",
    icon: Mail,
    badge: "Enterprise lane",
    auth: "Microsoft OAuth + Graph subscriptions",
    cost: "API access is part of Microsoft 365 account entitlements.",
    why: "Graph gives Braino Outlook email, Outlook calendar, and broader Microsoft 365 context for enterprise-heavy users.",
    actions: [
      "Announce Outlook emails, calendar changes, and enterprise work events.",
      "Summarize the workday for users who live in Microsoft instead of Google.",
      "Draft Outlook replies or surface what changed across the Microsoft stack.",
    ],
    setup: [
      "Create an app registration in Azure / Microsoft Entra.",
      "Add redirect URIs for Braino backend callbacks.",
      "Grant Microsoft Graph delegated permissions for the mail and calendar surfaces you need.",
      "Implement OAuth in Braino backend and store refresh tokens securely.",
      "Create Graph subscriptions for events you want in realtime.",
      "Verify subscription callbacks and normalize them into Braino activity events.",
    ],
    plan: [
      "Treat this as the Outlook/enterprise twin of Gmail plus Calendar.",
      "Start with calendar and inbox awareness before write actions.",
      "Ship only to users who clearly live in Microsoft 365 so the experience feels targeted.",
    ],
    notes: [
      "Very strong if you want Braino to work for corporate users, not just Google-native ones.",
      "A single integration can cover multiple enterprise surfaces at once.",
    ],
  },
  {
    slug: "discord",
    name: "Discord",
    icon: MessageCircle,
    badge: "Community realtime",
    auth: "Discord app + webhook or event subscriptions",
    cost: "Free to build with.",
    why: "Discord is a great fit if Braino is serving communities, creators, or founder circles that run in servers and DMs.",
    actions: [
      "Announce mentions, DMs, and selected server activity.",
      "Summarize unread community chatter before you open Discord.",
      "Route priority messages into Braino tasks or daily digests.",
    ],
    setup: [
      "Create an application in the Discord developer portal.",
      "Configure OAuth or bot permissions depending on the flow you want.",
      "Enable event delivery or webhooks for the server actions you care about.",
      "Add Braino callback endpoints and verify incoming event signatures if applicable.",
      "Store the bot token or app credentials in Braino backend env.",
    ],
    plan: [
      "Start with DMs and mentions only so Braino doesn't become noisy.",
      "Keep server-level subscriptions opt-in and scoped tightly.",
      "Position this for creator and community-heavy users rather than everyone.",
    ],
    notes: [
      "Much better as a targeted integration than a universal one.",
      "Nice complement to X if Braino expands toward creator workflows.",
    ],
  },
  {
    slug: "linear",
    name: "Linear",
    icon: KanbanSquare,
    badge: "PM-native",
    auth: "OAuth app + webhooks",
    cost: "Free to build with. Practical use depends on the user's Linear workspace.",
    why: "Linear gives Braino clean issue-assignment, status-change, and comment events for product teams.",
    actions: [
      "Announce when issues are assigned, updated, or blocked.",
      "Summarize what's changed in the sprint since the morning.",
      "Turn Braino actions into Linear tasks or follow-up reminders.",
    ],
    setup: [
      "Create a Linear OAuth app in developer settings.",
      "Add Braino redirect URI and callback endpoint.",
      "Implement OAuth in the backend and store workspace tokens.",
      "Register webhooks for issue, comment, and cycle events.",
      "Map Linear events into Braino's shared activity schema.",
    ],
    plan: [
      "Start with assignments, mentions, and blocked-issue events.",
      "Build a clean daily sprint digest after the first announcement layer works.",
      "Bundle this alongside Slack for product-team users.",
    ],
    notes: [
      "Excellent if Braino is becoming a startup/product assistant.",
      "Usually cleaner and more focused than broader PM tools.",
    ],
  },
  {
    slug: "jira",
    name: "Jira",
    icon: ClipboardList,
    badge: "Ops heavy",
    auth: "Atlassian OAuth + webhooks",
    cost: "Free to build with. Workspace plan and permissions shape real usage.",
    why: "Jira matters if Braino needs to serve larger teams where work is tracked through tickets, workflows, and comments.",
    actions: [
      "Announce assignments, ticket movements, and blockers.",
      "Summarize status changes across a project or board.",
      "Help convert Braino follow-ups into structured tickets.",
    ],
    setup: [
      "Create an Atlassian app or OAuth integration.",
      "Configure callback URLs and permissions for Jira resources.",
      "Implement backend OAuth token exchange and storage.",
      "Register webhooks for issue updates, comments, and transitions.",
      "Normalize Jira payloads into the same Braino activity pipeline as Slack and GitHub.",
    ],
    plan: [
      "Ship only the highest-signal Jira events at first.",
      "Make project-level notification filters mandatory so Braino stays useful.",
      "Use Jira primarily for work awareness, not broad automation, in V1.",
    ],
    notes: [
      "Useful for enterprise and ops-heavy teams, but easy to make noisy.",
      "Worth doing once the activity-event infrastructure is stable.",
    ],
  },
  {
    slug: "asana",
    name: "Asana",
    icon: Briefcase,
    badge: "Team workflow",
    auth: "OAuth app + webhooks",
    cost: "Free to build with. Workspace plan affects what users can access.",
    why: "Asana lets Braino track assigned tasks, due dates, comments, and project updates for more operations-oriented teams.",
    actions: [
      "Announce newly assigned tasks and due-soon work.",
      "Summarize project movement or overdue items.",
      "Create follow-up tasks from Braino sessions.",
    ],
    setup: [
      "Create an Asana app and configure OAuth redirect URIs.",
      "Implement backend OAuth and secure token storage.",
      "Register webhooks for task assignments, project changes, and comments.",
      "Map Asana objects into your shared Braino event format.",
      "Add user-level preferences for which projects should talk to Braino.",
    ],
    plan: [
      "Start with assigned-to-me and due-soon alerts.",
      "Skip broad project chatter until filtering is excellent.",
      "Pair with Calendar so Braino can connect work due dates to the day.",
    ],
    notes: [
      "A strong fit for agencies, operators, and general business teams.",
      "Less developer-centric than Linear or GitHub, which is useful if you want breadth.",
    ],
  },
  {
    slug: "clickup",
    name: "ClickUp",
    icon: LayoutGrid,
    badge: "Workflow breadth",
    auth: "API token or OAuth + webhooks",
    cost: "Free to start depending on workspace plan.",
    why: "ClickUp is useful if Braino needs to meet teams where they already manage mixed tasks, docs, and simple processes.",
    actions: [
      "Announce task assignments, status changes, and comments.",
      "Generate short work digests from ClickUp activity.",
      "Create tasks from Braino conversations or follow-up reminders.",
    ],
    setup: [
      "Create a ClickUp app or use workspace token access for dev.",
      "Configure Braino callback URLs if using OAuth.",
      "Set up webhooks for task and comment events.",
      "Store credentials in backend env and normalize events into Braino format.",
      "Add workspace and list-level user preferences.",
    ],
    plan: [
      "Start small with assigned-task and comment events.",
      "Avoid trying to mirror all of ClickUp into Braino.",
      "Treat this as a long-tail PM/workflow integration after Slack and Calendar are solid.",
    ],
    notes: [
      "Valuable for breadth, but not as strategically central as Slack, Calendar, or GitHub.",
      "Good candidate once you want wider SMB coverage.",
    ],
  },
  {
    slug: "zoom-meetings",
    name: "Zoom / Meeting platforms",
    icon: Video,
    badge: "Meeting layer",
    auth: "OAuth app + webhooks",
    cost: "Free to build with. Useful capabilities depend on platform plan and artifacts.",
    why: "Meeting APIs matter when Braino starts stitching together reminders, call artifacts, and post-meeting summaries.",
    actions: [
      "Announce meeting start times and status changes.",
      "Notice when recordings, transcripts, or summaries are ready.",
      "Turn meeting artifacts into notes, tasks, or follow-up docs.",
    ],
    setup: [
      "Choose the platform you want first, like Zoom.",
      "Create an OAuth app and add Braino callback URLs.",
      "Enable webhook subscriptions for meeting lifecycle events.",
      "Store account tokens securely and map artifacts back to users.",
      "Connect meeting artifacts to Docs, Notion, or Drive for the output layer.",
    ],
    plan: [
      "Use Calendar for awareness first, then add direct meeting-platform events later.",
      "Focus on artifact availability and follow-up moments rather than raw call control.",
      "Build only once your post-meeting note flows are already valuable.",
    ],
    notes: [
      "Strong complement to Calendar rather than a standalone first integration.",
      "The value is mostly in what Braino does after the meeting, not during it.",
    ],
  },
  {
    slug: "stripe",
    name: "Stripe",
    icon: CreditCard,
    badge: "Money events",
    auth: "API keys + webhooks",
    cost: "Free to integrate. You pay Stripe's normal product fees, not a separate API fee.",
    why: "Stripe gives Braino finance and growth signals like new subscriptions, failed payments, and churn risks.",
    actions: [
      "Announce new subscriptions, failed charges, and cancellations.",
      "Summarize revenue-moving events at the end of the day.",
      "Turn important billing issues into Braino follow-up tasks.",
    ],
    setup: [
      "Create a Stripe account and get your secret key and publishable key.",
      "Set up webhook endpoints in Braino backend.",
      "Subscribe to events like checkout.session.completed, invoice.payment_failed, and customer.subscription.deleted.",
      "Verify webhook signatures and map events to users or workspaces.",
      "Store keys securely in env and never expose secrets to the client.",
    ],
    plan: [
      "Start with failed payments and new subscriptions because they are high-value and easy to act on.",
      "Use Stripe for founder/operator awareness rather than broad customer support first.",
      "Pair with Slack or n8n if you want team-wide routing later.",
    ],
    notes: [
      "High-value if Braino expands into business operations.",
      "Very clean webhook-driven integration for your event pipeline.",
    ],
  },
  {
    slug: "shopify",
    name: "Shopify",
    icon: ShoppingCart,
    badge: "Commerce lane",
    auth: "Shopify app + webhooks",
    cost: "Free to build with. Merchant plan shapes real-world use.",
    why: "Shopify lets Braino speak about orders, refunds, inventory changes, and store operations for commerce users.",
    actions: [
      "Announce new orders, refunds, or fulfillment problems.",
      "Summarize store activity into short operator briefs.",
      "Turn operational issues into tasks or follow-up workflows.",
    ],
    setup: [
      "Create a Shopify app and configure OAuth install flow.",
      "Add Braino callback and webhook URLs.",
      "Subscribe to the order, refund, and inventory events you care about.",
      "Store shop tokens securely and map each store to a Braino workspace.",
      "Normalize Shopify webhook payloads into your shared event schema.",
    ],
    plan: [
      "Start with high-signal commerce events only.",
      "Keep this as a founder/operator feature, not a general consumer feature.",
      "Use n8n later for richer post-order workflows.",
    ],
    notes: [
      "Useful if Braino starts serving ecommerce-heavy founders or teams.",
      "Very event-friendly and pairs well with spoken alerts.",
    ],
  },
  {
    slug: "trello",
    name: "Trello",
    icon: KanbanSquare,
    badge: "Simple PM",
    auth: "API key + token or Atlassian flow",
    cost: "Free to start depending on workspace plan.",
    why: "Trello is a lighter task/workflow integration for smaller teams that don't want Jira-level complexity.",
    actions: [
      "Announce card assignments, list moves, and due dates.",
      "Create cards from Braino sessions or quick follow-ups.",
      "Summarize board movement into an operator digest.",
    ],
    setup: [
      "Create a Trello integration and get API credentials.",
      "Authorize against a Trello workspace or account.",
      "Register webhooks for board and card events.",
      "Store tokens securely and map board activity to Braino users.",
      "Add board-level filters so Braino stays selective.",
    ],
    plan: [
      "Treat Trello as a lightweight PM lane after core productivity integrations land.",
      "Start with due dates and assignments instead of every card movement.",
      "Use the same PM-event abstraction as Jira, Asana, and ClickUp.",
    ],
    notes: [
      "Lower complexity than Jira, but also less central for many users.",
      "Useful if you want a simpler task-tool story.",
    ],
  },
  {
    slug: "airtable",
    name: "Airtable",
    icon: LayoutGrid,
    badge: "Light database",
    auth: "Personal access token or OAuth",
    cost: "Free to start depending on Airtable plan.",
    why: "Airtable gives Braino a flexible ops database for lightweight CRM, content pipelines, and manual workflows.",
    actions: [
      "Create or update structured records from Braino actions.",
      "Announce important base changes or new incoming entries.",
      "Use Airtable as a destination for summaries, leads, or workflow outputs.",
    ],
    setup: [
      "Create an Airtable developer app or personal access token for dev use.",
      "Grant the minimum scopes and base access Braino needs.",
      "Implement backend actions for records, tables, and base lookups.",
      "Add webhook or polling support depending on the base and event needs.",
      "Map Airtable objects into the Braino event and action contracts.",
    ],
    plan: [
      "Use Airtable first as an output destination, not your first major event source.",
      "Great candidate for n8n-connected workflows later.",
      "Keep the integration scoped to 1-2 high-value bases at first.",
    ],
    notes: [
      "Very useful for internal tools and lightweight ops systems.",
      "More of an infrastructure unlock than a wow-moment notification API.",
    ],
  },
];

const tomorrowStack = [
  "Slack for live work notifications",
  "Google Calendar for meeting awareness",
  "Notion for memory and saved output",
  "Google Docs plus Drive for reliable artifact creation and organization",
  "Gmail once you're ready for the compliance-heavy path",
  "n8n after the native event contract is stable",
];

export default function Integrations() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--sb-bg)", color: "var(--sb-ink)" }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: "radial-gradient(circle at top, rgba(226,125,57,0.14), transparent 58%)" }}
      />
      <div
        className="pointer-events-none absolute left-[-8%] top-52 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(226,125,57,0.10)" }}
      />
      <div
        className="pointer-events-none absolute right-[-10%] top-[28rem] h-80 w-80 rounded-full blur-3xl"
        style={{ background: "rgba(27,23,19,0.06)" }}
      />
      <Navbar />

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pt-32 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-5 text-xs font-medium uppercase tracking-[0.34em] text-muted-foreground/60">
              Integration Stack
            </p>
            <h1
              className="max-w-4xl text-4xl font-normal leading-[1.02] tracking-tight md:text-6xl"
              style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
            >
              One page for every API Braino should{" "}
              <em className="text-primary" style={{ fontStyle: "italic" }}>connect next.</em>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Each card below tells us why the integration matters, how to get access, what Braino can do with it,
              and the cleanest order to build it in. The goal is simple: tomorrow we pick one, wire it well, and keep moving.
            </p>
          </div>

          <div
            className="rounded-[30px] p-6 backdrop-blur-xl"
            style={{
              border: "1px solid var(--sb-line)",
              background: "color-mix(in srgb, var(--sb-panel-2) 82%, transparent)",
              boxShadow: "var(--sb-shadow)",
            }}
          >
            <div className="flex items-center gap-3 text-sm font-medium" style={{ color: "var(--sb-ink)" }}>
              <ShieldCheck className="h-4 w-4 text-primary" />
              Build posture
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              Start with low-drama integrations that already fit Braino's realtime speaking model, then layer in the compliance-heavy ones later.
            </p>
            <div className="mt-5 space-y-3">
              {tomorrowStack.map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl px-4 py-3"
                  style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)" }}
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--sb-ink)", color: "var(--sb-on-ink)" }}>
                    {index + 1}
                  </span>
                  <div className="text-sm" style={{ color: "var(--sb-ink-2)" }}>{item}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mx-auto max-w-6xl px-6 pb-10">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] p-5" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel-2)", boxShadow: "var(--sb-shadow-sm)" }}>
            <div className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--sb-ink-3)" }}>Realtime fit</div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--sb-ink)" }}>Excellent</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              Slack, Calendar, GitHub, Gmail, and n8n events all fit Braino's push-to-extension speaking model.
            </p>
          </div>
          <div className="rounded-[26px] p-5" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel-2)", boxShadow: "var(--sb-shadow-sm)" }}>
            <div className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--sb-ink-3)" }}>Fastest wins</div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--sb-ink)" }}>Slack + Calendar</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              They create immediate ambient-assistant moments without dragging you into Gmail's heavier review path first.
            </p>
          </div>
          <div className="rounded-[26px] p-5" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel-2)", boxShadow: "var(--sb-shadow-sm)" }}>
            <div className="text-xs uppercase tracking-[0.28em]" style={{ color: "var(--sb-ink-3)" }}>Compliance heat</div>
            <div className="mt-3 text-2xl font-semibold" style={{ color: "var(--sb-ink)" }}>Gmail highest</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              Keep Gmail in the plan, but don't let it block the integrations that are easier to ship and still feel magical.
            </p>
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
            {integrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <AccordionItem key={integration.slug} value={integration.slug} className="px-3 md:px-4" style={{ borderColor: "var(--sb-line-2)" }}>
                  <AccordionTrigger className="gap-4 py-5 text-left hover:no-underline">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl"
                        style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold" style={{ color: "var(--sb-ink)" }}>{integration.name}</span>
                          <span
                            className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
                            style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-accent-soft)", color: "var(--sb-accent-deep)" }}
                          >
                            {integration.badge}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>{integration.why}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                      <div className="space-y-4">
                        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                          <div className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>Auth</div>
                          <p className="mt-2 text-sm" style={{ color: "var(--sb-ink)" }}>{integration.auth}</p>
                        </div>
                        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                          <div className="text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>Cost</div>
                          <p className="mt-2 text-sm" style={{ color: "var(--sb-ink)" }}>{integration.cost}</p>
                        </div>
                        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                          <div className="mb-3 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>What Braino can do</div>
                          <div className="space-y-3">
                            {integration.actions.map((action) => (
                              <div key={action} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
                                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                          <div className="mb-3 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>How to get it</div>
                          <div className="space-y-3">
                            {integration.setup.map((step, index) => (
                              <div key={step} className="flex items-start gap-3">
                                <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "var(--sb-ink)", color: "var(--sb-on-ink)" }}>
                                  {index + 1}
                                </span>
                                <p className="text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>
                              <Database className="h-3.5 w-3.5" style={{ color: "var(--sb-accent-deep)" }} />
                              Tomorrow plan
                            </div>
                            <div className="space-y-3">
                              {integration.plan.map((step) => (
                                <div key={step} className="flex items-start gap-3 text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
                                  <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl p-4" style={{ border: "1px solid var(--sb-line-2)", background: "var(--sb-panel)", boxShadow: "var(--sb-shadow-sm)" }}>
                            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.24em]" style={{ color: "var(--sb-ink-3)" }}>
                              <BellRing className="h-3.5 w-3.5" style={{ color: "var(--sb-accent-deep)" }} />
                              Notes
                            </div>
                            <div className="space-y-3">
                              {integration.notes.map((note) => (
                                <p key={note} className="text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>{note}</p>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
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
              Pick one integration and ship it cleanly.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--sb-ink-2)" }}>
              If we do Slack or Calendar first, Braino can start speaking useful real-world activity without waiting on the hardest compliance path.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/connectors-vault"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
              style={{ border: "1px solid var(--sb-line)", background: "var(--sb-panel)", color: "var(--sb-ink)" }}
            >
              Open Secrets Playbook
              <ShieldCheck className="h-4 w-4" />
            </Link>
            <Link
              to="/automations"
              className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "var(--sb-ink)", color: "var(--sb-on-ink)" }}
            >
              Back to Automations
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
