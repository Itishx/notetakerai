// The pretend web the HIL loop works against. Nothing real, ever: no tab opens,
// no email sends, no order is placed. This is a stage set that behaves like real
// pages so the loop can fire the SAME actions the real extension fires.
//
// Why it is shaped this way: Braino Delegate does not call app-level functions
// like "send an email". It navigates, reads the page into an indexed element map,
// and then clicks or types against those indices (extension/background.js,
// BG_DELEGATE_ACTIONS). So this world models pages and elements, not verbs, and
// the loop's whole vocabulary is navigate, read, click, type, pressKey, scroll,
// wait, web_search. What you watch here is what would really happen.
//
// Two rules every action obeys:
//   1. Errors come back as { error: "..." }, never thrown, never silent.
//   2. Nothing mutates outside this object.

export type SiteId = "gmail" | "spotify" | "youtube" | "blinkit" | "finder";

export type PageElement = { index: number; role: string; name: string };

// A file as Finder shows it: name, when it landed, and whether it is still
// coming down. "added" is a human phrase on purpose ("2 minutes ago"), because
// that is what the sort column actually reads.
export type FinderFile = { name: string; added: string; minutesAgo: number; partial?: boolean };

type ElementDef = { role: string; name: string; act?: (w: World) => string };

export type World = {
  tabs: SiteId[];
  activeTab: SiteId | null;
  jammed: SiteId | null;
  gmail: {
    screen: "inbox" | "thread" | "compose";
    openThread: { from: string; address: string; subject: string; body: string } | null;
    to: string;
    subject: string;
    body: string;
    sent: Array<{ to: string; subject: string; body: string }>;
    notice: string;
  };
  spotify: { screen: "home" | "results"; query: string; results: string[]; nowPlaying: string | null };
  youtube: { screen: "home" | "results" | "watch"; query: string; results: string[]; nowPlaying: string | null };
  blinkit: { screen: "home" | "results" | "cart"; query: string; results: string[]; cart: string[]; ordered: boolean };
  // The Mac side of the stage set. Same loop, same actions, but the "page" is a
  // Finder window: this is where "open what I just downloaded" gets exercised,
  // and the file list deliberately holds a still-downloading item and a
  // near-simultaneous pair so guessing is punished the way it is in real life.
  finder: {
    folder: "Downloads" | "Desktop" | "Invoices";
    files: FinderFile[];
    opened: string | null;
    lastMove: { file: string; to: string } | null;
  };
  // The last textbox typed into, so pressKey Enter can submit it the way a real
  // page would. Cleared whenever the screen changes underneath it.
  lastTyped: { site: SiteId; name: string } | null;
};

// The inbox a run starts from. Three plausible senders on purpose: "reply to this
// email" against this list has no correct guess, which is what makes the ask real.
const INBOX = [
  { from: "Priya Sharma", address: "priya.sharma@gmail.com", subject: "Deck for review", body: "Hey, when can I expect the deck?" },
  { from: "Sam Mehta", address: "sam.mehta@gmail.com", subject: "Lunch tomorrow?", body: "Free around 1? There is a new place near your office." },
  { from: "Dev Patel", address: "dev.patel@gmail.com", subject: "Invoice attached", body: "Invoice for last month is attached, let me know if anything looks off." },
];

// Where a run begins. A referent like "this email" only means something when
// something is already on screen, so a run can start mid-situation, exactly like
// the real thing does when you are already looking at a page and say "reply to this".
// What sits in Downloads when a run starts. Unsorted on purpose: sorting by
// date is an ACTION the loop has to take, exactly like a person clicking the
// "Date Added" column, and the newest item is not the first row.
const DOWNLOADS: FinderFile[] = [
  { name: "resume-final-v3.pdf", added: "3 days ago", minutesAgo: 4320 },
  { name: "Mesa-invoice-August.pdf", added: "2 minutes ago", minutesAgo: 2 },
  { name: "wallpaper-pack.zip", added: "6 hours ago", minutesAgo: 360 },
  { name: "braino-demo.mov.crdownload", added: "1 minute ago", minutesAgo: 1, partial: true },
  { name: "Mesa-receipt-August.pdf", added: "2 minutes ago", minutesAgo: 2 },
];

export type WorldPreset = "empty" | "gmail-thread" | "gmail-inbox" | "finder-downloads";

export function createWorld(preset: WorldPreset = "empty"): World {
  const world: World = {
    tabs: [],
    activeTab: null,
    jammed: null,
    gmail: { screen: "inbox", openThread: null, to: "", subject: "", body: "", sent: [], notice: "" },
    spotify: { screen: "home", query: "", results: [], nowPlaying: null },
    youtube: { screen: "home", query: "", results: [], nowPlaying: null },
    blinkit: { screen: "home", query: "", results: [], cart: [], ordered: false },
    finder: { folder: "Downloads", files: DOWNLOADS.map((f) => ({ ...f })), opened: null, lastMove: null },
    lastTyped: null,
  };
  if (preset === "gmail-thread") {
    world.tabs = ["gmail"];
    world.activeTab = "gmail";
    world.gmail.screen = "thread";
    world.gmail.openThread = INBOX[1];
  }
  if (preset === "gmail-inbox") {
    world.tabs = ["gmail"];
    world.activeTab = "gmail";
    world.gmail.screen = "inbox";
  }
  if (preset === "finder-downloads") {
    world.tabs = ["finder"];
    world.activeTab = "finder";
  }
  return world;
}

const SITE_LABEL: Record<SiteId, string> = {
  gmail: "Gmail",
  spotify: "Spotify",
  youtube: "YouTube",
  blinkit: "Blinkit",
  finder: "Finder",
};

// Neutral result titles: echo what was actually searched, with plain format
// variants. An earlier version stapled "| TED" onto every YouTube query, which
// made the loop faithfully report that a Tanmay Bhat video was a TED talk. The
// loop can only be as truthful as the instrument it reads, so the instrument
// does not invent brands or genres.
function resultsFor(site: SiteId, q: string): string[] {
  if (site === "spotify") return [q, `${q} (Live)`, `${q} (Remix)`];
  if (site === "youtube") return [q, `${q} (full video)`, `${q} (clip)`];
  return [q, `${q} (pack of 2)`];
}

// ── URLs ────────────────────────────────────────────────────────────────────

export function currentUrl(world: World): string {
  const site = world.activeTab;
  if (!site) return "";
  if (site === "gmail") {
    if (world.gmail.screen === "compose") return "https://mail.google.com/mail/u/0/#inbox?compose=new";
    if (world.gmail.screen === "thread") return "https://mail.google.com/mail/u/0/#inbox/FMfcgzTkXhQmVpLrJd";
    return "https://mail.google.com/mail/u/0/#inbox";
  }
  if (site === "spotify") {
    return world.spotify.screen === "results"
      ? `https://open.spotify.com/search/${encodeURIComponent(world.spotify.query)}`
      : "https://open.spotify.com/";
  }
  if (site === "youtube") {
    if (world.youtube.screen === "watch") return "https://www.youtube.com/watch?v=x7Kd91qQ2mA";
    if (world.youtube.screen === "results") return `https://www.youtube.com/results?search_query=${encodeURIComponent(world.youtube.query)}`;
    return "https://www.youtube.com/";
  }
  if (site === "finder") return `file:///Users/you/${world.finder.folder}`;
  if (world.blinkit.screen === "cart") return "https://blinkit.com/cart";
  if (world.blinkit.screen === "results") return `https://blinkit.com/s/?q=${encodeURIComponent(world.blinkit.query)}`;
  return "https://blinkit.com/";
}

function pageTitle(world: World): string {
  const site = world.activeTab;
  if (!site) return "";
  if (site === "gmail") {
    if (world.gmail.screen === "compose") return "New Message - Gmail";
    if (world.gmail.screen === "thread") return `${world.gmail.openThread?.subject || "Thread"} - Gmail`;
    return "Inbox - Gmail";
  }
  if (site === "finder") return `${world.finder.folder} - Finder`;
  if (site === "spotify") return world.spotify.nowPlaying ? `${world.spotify.nowPlaying} - Spotify` : "Spotify - Web Player";
  if (site === "youtube") return world.youtube.nowPlaying ? `${world.youtube.nowPlaying} - YouTube` : "YouTube";
  if (world.blinkit.screen === "cart") return "Your cart - Blinkit";
  return "Blinkit - Instant grocery";
}

function siteFromUrl(url: string): SiteId | null {
  const u = url.toLowerCase();
  if (u.startsWith("file://") || u.includes("finder")) return "finder";
  if (u.includes("mail.google")) return "gmail";
  if (u.includes("spotify")) return "spotify";
  if (u.includes("youtube")) return "youtube";
  if (u.includes("blinkit")) return "blinkit";
  return null;
}

// ── The element map: what a read of the active page returns ──────────────────

function elementDefs(world: World): ElementDef[] {
  const site = world.activeTab;
  if (!site) return [];

  // Finder: a file list, a sort control, and a sidebar. Nothing here tells the
  // loop which file is newest until it SORTS, which is the point. "Sorted by
  // Name" is the honest default state of a window you just opened.
  if (site === "finder") {
    const f = world.finder;
    const defs: ElementDef[] = [
      {
        role: "button",
        name: "Sort by Date Added",
        act: (w) => {
          w.finder.files = [...w.finder.files].sort((a, b) => a.minutesAgo - b.minutesAgo);
          return "the list re-sorted, newest first";
        },
      },
      { role: "link", name: "Sidebar: Desktop", act: (w) => { w.finder.folder = "Desktop"; w.finder.files = []; return "the Desktop folder opened, it is empty"; } },
      { role: "link", name: "Sidebar: Downloads", act: (w) => { w.finder.folder = "Downloads"; w.finder.files = DOWNLOADS.map((x) => ({ ...x })); return "the Downloads folder opened"; } },
      { role: "link", name: "Sidebar: Invoices", act: (w) => { w.finder.folder = "Invoices"; w.finder.files = []; return "the Invoices folder opened, it is empty"; } },
    ];
    f.files.forEach((file) => {
      defs.push({
        role: "file",
        name: `${file.name} — added ${file.added}${file.partial ? " (downloading)" : ""}`,
        act: (w) => {
          if (file.partial) return `"${file.name}" is still downloading, macOS refused to open a partial file`;
          w.finder.opened = file.name;
          return `"${file.name}" opened in its default app`;
        },
      });
      defs.push({
        role: "button",
        name: `Move ${file.name} to Invoices`,
        act: (w) => {
          if (file.partial) return `"${file.name}" is still downloading, Finder refused to move it`;
          w.finder.files = w.finder.files.filter((x) => x.name !== file.name);
          w.finder.lastMove = { file: file.name, to: "Invoices" };
          return `"${file.name}" moved to the Invoices folder`;
        },
      });
    });
    return defs;
  }

  if (site === "gmail") {
    if (world.gmail.screen === "compose") {
      return [
        { role: "textbox", name: "To" },
        { role: "textbox", name: "Subject" },
        { role: "textbox", name: "Message Body" },
        {
          role: "button",
          name: "Send",
          act: (w) => {
            if (!w.gmail.to.trim()) return "the draft has no recipient, Gmail refused to send";
            if (!w.gmail.body.trim()) return "the draft has no message body, Gmail refused to send";
            w.gmail.sent.push({ to: w.gmail.to, subject: w.gmail.subject, body: w.gmail.body });
            w.gmail.notice = `Message sent to ${w.gmail.to}`;
            w.gmail.screen = "inbox";
            w.gmail.to = "";
            w.gmail.subject = "";
            w.gmail.body = "";
            w.lastTyped = null;
            return "the message was sent and the draft closed";
          },
        },
        {
          role: "button",
          name: "Discard draft",
          act: (w) => {
            w.gmail.screen = "inbox";
            w.gmail.to = "";
            w.gmail.subject = "";
            w.gmail.body = "";
            w.lastTyped = null;
            return "the draft was discarded";
          },
        },
      ];
    }
    if (world.gmail.screen === "thread") {
      const t = world.gmail.openThread;
      return [
        { role: "text", name: `From ${t?.from}: ${t?.subject}` },
        { role: "text", name: `Message: ${t?.body}` },
        {
          role: "button",
          name: "Reply",
          act: (w) => {
            const th = w.gmail.openThread;
            w.gmail.screen = "compose";
            w.gmail.to = th?.address || "";
            w.gmail.subject = th ? `Re: ${th.subject}` : "";
            w.gmail.body = "";
            w.lastTyped = null;
            return `a reply draft opened, already addressed to ${th?.from} with the subject filled in`;
          },
        },
        { role: "button", name: "Forward" },
        { role: "link", name: "Back to inbox", act: (w) => { w.gmail.screen = "inbox"; w.gmail.openThread = null; return "the inbox opened"; } },
      ];
    }
    return [
      { role: "button", name: "Compose", act: (w) => { w.gmail.screen = "compose"; w.gmail.notice = ""; w.lastTyped = null; return "a new draft opened"; } },
      ...INBOX.map((mail) => ({
        role: "link",
        name: `${mail.from} - ${mail.subject}`,
        act: (w: World) => {
          w.gmail.screen = "thread";
          w.gmail.openThread = mail;
          return `the thread from ${mail.from} opened`;
        },
      })),
    ];
  }

  if (site === "spotify") {
    const base: ElementDef[] = [{ role: "searchbox", name: "Search Spotify" }];
    if (world.spotify.screen === "results") {
      world.spotify.results.forEach((title) => {
        base.push({
          role: "link",
          name: title,
          act: (w) => { w.spotify.nowPlaying = title; return `"${title}" started playing`; },
        });
      });
    }
    return base;
  }

  if (site === "youtube") {
    if (world.youtube.screen === "watch") {
      return [
        { role: "searchbox", name: "Search" },
        { role: "button", name: "Pause", act: (w) => { w.youtube.nowPlaying = null; w.youtube.screen = "results"; return "playback paused"; } },
      ];
    }
    const base: ElementDef[] = [{ role: "searchbox", name: "Search" }];
    if (world.youtube.screen === "results") {
      world.youtube.results.forEach((title) => {
        base.push({
          role: "link",
          name: title,
          act: (w) => { w.youtube.nowPlaying = title; w.youtube.screen = "watch"; return `the watch page opened and "${title}" started playing automatically`; },
        });
      });
    }
    return base;
  }

  // blinkit
  if (world.blinkit.screen === "cart") {
    return [
      { role: "searchbox", name: "Search products" },
      ...world.blinkit.cart.map((item) => ({ role: "text", name: `In cart: ${item}` })),
      {
        role: "button",
        name: "Proceed to checkout",
        act: (w) => {
          if (!w.blinkit.cart.length) return "the cart is empty, checkout refused";
          w.blinkit.ordered = true;
          return `the order was placed for ${w.blinkit.cart.join(", ")}`;
        },
      },
    ];
  }
  const base: ElementDef[] = [{ role: "searchbox", name: "Search products" }];
  if (world.blinkit.screen === "results") {
    world.blinkit.results.forEach((item) => {
      base.push({ role: "link", name: item });
      base.push({
        role: "button",
        name: `Add ${item} to cart`,
        act: (w) => {
          if (!w.blinkit.cart.includes(item)) w.blinkit.cart.push(item);
          return `"${item}" was added, the cart now holds ${w.blinkit.cart.length} item(s)`;
        },
      });
    });
  }
  if (world.blinkit.cart.length) {
    base.push({
      role: "button",
      name: `Cart (${world.blinkit.cart.length})`,
      act: (w) => { w.blinkit.screen = "cart"; return "the cart page opened"; },
    });
  }
  return base;
}

export function elementMap(world: World): PageElement[] {
  return elementDefs(world).map((d, i) => ({ index: i, role: d.role, name: d.name }));
}

export function elementAt(world: World, index: number): PageElement | null {
  const els = elementMap(world);
  return els.find((e) => e.index === index) || null;
}

// The observation string sent to the model every turn: exactly what a read of the
// live page would give the real Delegate loop, in the same shape.
export function renderObservation(world: World): string {
  if (!world.activeTab) return "No tab is open. There is nothing on screen.";
  const lines = [`URL: ${currentUrl(world)}`, `TITLE: ${pageTitle(world)}`];

  const notes: string[] = [];
  if (world.activeTab === "gmail") {
    if (world.gmail.notice) notes.push(world.gmail.notice);
    if (world.gmail.screen === "thread" && world.gmail.openThread) {
      notes.push(`one email thread is open: from ${world.gmail.openThread.from}, subject "${world.gmail.openThread.subject}"`);
    }
    if (world.gmail.screen === "inbox") notes.push("the inbox list is showing, no single thread is open");
    if (world.gmail.screen === "compose") {
      notes.push(`draft fields: To="${world.gmail.to}" Subject="${world.gmail.subject}" Body="${world.gmail.body.slice(0, 120)}"`);
    }
  }
  if (world.activeTab === "finder") {
    notes.push(`a Finder window is open on ${world.finder.folder}, ${world.finder.files.length} item(s), sorted by Name`);
    if (world.finder.opened) notes.push(`last opened: ${world.finder.opened}`);
    if (world.finder.lastMove) notes.push(`last move: ${world.finder.lastMove.file} into ${world.finder.lastMove.to}`);
  }
  if (world.activeTab === "spotify" && world.spotify.nowPlaying) notes.push(`now playing: ${world.spotify.nowPlaying}`);
  if (world.activeTab === "youtube" && world.youtube.nowPlaying) notes.push(`now playing: ${world.youtube.nowPlaying}`);
  if (world.activeTab === "blinkit") {
    if (world.blinkit.ordered) notes.push("the order confirmation is showing");
    if (world.blinkit.cart.length) notes.push(`cart holds: ${world.blinkit.cart.join(", ")}`);
  }
  if (notes.length) lines.push(`PAGE STATE: ${notes.join("; ")}`);

  const others = world.tabs.filter((t) => t !== world.activeTab);
  if (others.length) lines.push(`OTHER OPEN TABS: ${others.map((t) => SITE_LABEL[t]).join(", ")}`);

  lines.push("ELEMENTS:");
  const els = elementMap(world);
  if (!els.length) lines.push("(none)");
  els.forEach((e) => lines.push(`[${e.index}] ${e.role} "${e.name}"`));
  return lines.join("\n");
}

// ── Sabotage: the user breaking the world mid-run, on purpose ────────────────

export function sabotageCloseTab(world: World): string {
  if (!world.activeTab) return "There was no tab to close.";
  const closed = world.activeTab;
  world.tabs = world.tabs.filter((t) => t !== closed);
  world.activeTab = world.tabs.length ? world.tabs[world.tabs.length - 1] : null;
  world.lastTyped = null;
  return `You closed the ${SITE_LABEL[closed]} tab on him.`;
}

export function sabotageJamSite(world: World): string {
  if (!world.activeTab) return "There was no site to jam.";
  world.jammed = world.activeTab;
  return `You jammed ${SITE_LABEL[world.activeTab]}: the site has stopped responding for him.`;
}

// ── The actions: the same vocabulary the real extension fires ────────────────

type ActionResult = Record<string, unknown>;

function needTab(world: World): ActionResult | null {
  if (!world.activeTab) return { error: "there is no open tab" };
  if (world.jammed === world.activeTab) return { error: "the page is not responding" };
  return null;
}

function submitSearch(world: World, boxName: string, text: string): string {
  const site = world.activeTab;
  if (site === "spotify") {
    world.spotify.query = text;
    world.spotify.results = resultsFor("spotify", text);
    world.spotify.screen = "results";
    return "the Spotify search results loaded";
  }
  if (site === "youtube") {
    world.youtube.query = text;
    world.youtube.results = resultsFor("youtube", text);
    world.youtube.screen = "results";
    return "the YouTube results page loaded";
  }
  if (site === "blinkit") {
    world.blinkit.query = text;
    world.blinkit.results = resultsFor("blinkit", text);
    world.blinkit.screen = "results";
    return "the Blinkit results loaded";
  }
  return `nothing was submitted from ${boxName}`;
}

export function runAction(world: World, type: string, args: Record<string, unknown>): ActionResult {
  const a = (k: string) => String(args?.[k] ?? "").trim();
  const idx = Number(args?.index);

  switch (type) {
    case "navigate": {
      const url = a("url");
      const site = siteFromUrl(url);
      if (!site) return { error: `that address is not part of this pretend web: ${url || "(none given)"}` };
      if (!world.tabs.includes(site)) world.tabs.push(site);
      world.activeTab = site;
      world.jammed = world.jammed === site ? null : world.jammed;
      world.lastTyped = null;
      return { navigated: currentUrl(world), title: pageTitle(world), elements: elementMap(world).length };
    }

    case "read": {
      const gate = needTab(world);
      if (gate) return gate;
      return { url: currentUrl(world), title: pageTitle(world), elements: elementMap(world) };
    }

    case "click": {
      const gate = needTab(world);
      if (gate) return gate;
      if (!Number.isInteger(idx)) return { error: "click needs a numeric element index" };
      const defs = elementDefs(world);
      const def = defs[idx];
      if (!def) return { error: `there is no element [${idx}] on this page` };
      if (!def.act) return { error: `[${idx}] "${def.name}" is not something that does anything when clicked` };
      const note = def.act(world);
      return { clicked: def.name, happened: note, url: currentUrl(world) };
    }

    case "type": {
      const gate = needTab(world);
      if (gate) return gate;
      if (!Number.isInteger(idx)) return { error: "type needs a numeric element index" };
      const defs = elementDefs(world);
      const def = defs[idx];
      if (!def) return { error: `there is no element [${idx}] on this page` };
      if (def.role !== "textbox" && def.role !== "searchbox") {
        return { error: `[${idx}] "${def.name}" is a ${def.role}, not something you can type into` };
      }
      const text = a("text");
      if (!text) return { error: "type needs text" };
      const site = world.activeTab as SiteId;
      if (site === "gmail") {
        if (def.name === "To") world.gmail.to = text;
        else if (def.name === "Subject") world.gmail.subject = text;
        else world.gmail.body = text;
      }
      world.lastTyped = { site, name: def.name };
      const submit = args?.submit === true;
      const submitted = submit && def.role === "searchbox" ? submitSearch(world, def.name, text) : null;
      return { typedInto: def.name, text, ...(submitted ? { happened: submitted, url: currentUrl(world) } : {}) };
    }

    case "pressKey": {
      const gate = needTab(world);
      if (gate) return gate;
      const key = a("key");
      if (!/^enter$/i.test(key)) return { pressed: key, happened: "nothing on this page reacts to that key" };
      if (!world.lastTyped || world.lastTyped.site !== world.activeTab) {
        return { error: "nothing was typed on this page to submit" };
      }
      const site = world.activeTab as SiteId;
      const text = site === "spotify" ? world.spotify.query || "" : site === "youtube" ? world.youtube.query || "" : world.blinkit.query || "";
      const box = world.lastTyped.name;
      const lastText = text || (site === "gmail" ? world.gmail.body : "");
      const happened = submitSearch(world, box, lastText);
      return { pressed: "Enter", happened, url: currentUrl(world) };
    }

    case "scroll": {
      const gate = needTab(world);
      if (gate) return gate;
      const dir = a("direction") || "down";
      return { scrolled: dir, happened: "the page moved, the same elements are still listed" };
    }

    case "wait": {
      const ms = Math.max(0, Math.min(5000, Number(args?.ms ?? 1000)));
      return { waited: ms };
    }

    case "web_search": {
      const q = a("query");
      if (!q) return { error: "web_search needs a query" };
      return {
        query: q,
        results: [
          { title: `${q}`, snippet: `A general overview of ${q}, from a reference site.` },
          { title: `${q}: what to know`, snippet: `A recent article covering ${q} in some detail.` },
        ],
      };
    }

    default:
      return { error: `no such action: ${type}` };
  }
}

// The gate, deterministic and client side, mirroring bgCartSafetyBlock in the real
// extension: reversibility is decided by WHAT is being clicked, not by the model's
// opinion of it. Any control that sends, buys, publishes, or destroys is gated even
// when the user asked for it in so many words.
const IRREVERSIBLE_ELEMENT = /\b(send|place (your )?order|proceed to (buy|checkout)|pay now|buy now|checkout|publish|post|delete|remove|discard)\b/i;

export function isIrreversibleClick(world: World, type: string, args: Record<string, unknown>): boolean {
  if (type !== "click") return false;
  const el = elementAt(world, Number(args?.index));
  return Boolean(el && IRREVERSIBLE_ELEMENT.test(el.name));
}
