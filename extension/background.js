// Background service worker for Braino (MV3)

// ── Production error hygiene ─────────────────────────────────────────────────
// chrome://extensions records uncaught exceptions/rejections and unchecked
// runtime.lastError as red "Errors" for developer-mode installs (our zip flow).
// Everything is caught here, logged quietly, and marked handled so the collector
// stays empty. Real failures still reach the user via Braino's own UI paths.
self.addEventListener("error", (e) => {
  console.warn("[Braino] handled error:", e?.error?.message || e?.message || e);
  e.preventDefault();
});
self.addEventListener("unhandledrejection", (e) => {
  console.warn("[Braino] handled rejection:", e?.reason?.message || e?.reason || "");
  e.preventDefault();
});
// Every callback passed to sendMessage reads runtime.lastError first — an answered
// call whose peer vanished (closed tab, SW race) otherwise logs "Unchecked
// runtime.lastError". No-callback calls return promises; rejections land above.
for (const [obj, key] of [[chrome.runtime, "sendMessage"], [chrome.tabs, "sendMessage"]]) {
  const orig = obj[key].bind(obj);
  obj[key] = (...args) => {
    const cb = args[args.length - 1];
    if (typeof cb === "function") {
      args[args.length - 1] = (...cbArgs) => {
        void chrome.runtime.lastError;
        try { cb(...cbArgs); } catch (err) { console.warn("[Braino] callback error:", err?.message || err); }
      };
    }
    return orig(...args);
  };
}

try {
  importScripts(
    "lib/elementMap.js",
    "lib/models.js",
    "lib/taskState.js",
    "lib/recovery.js",
    "lib/macroStore.js",
    "lib/searchGuard.js",
  );
} catch (error) {
  console.warn("[Braino][Delegate] helper import failed:", error);
}

const BG_CONTENT_SCRIPT_FILES = ["lib/elementMap.js", "content.js"];
let isRecording = false;
let bgRecordingMode = "lecture";
let bgAgentShouldStop = false;
let rtVoiceOwnerTabId = null; // single realtime-voice owner tab (so only one Braino speaks)
let bgRtSessionActive = false; // offscreen realtime session is running
let bgRtSessionStarting = false;
let bgRtSessionInfo = { sessionId: null, limitMs: 0, allocatedMs: 0, realtimeModel: null, transcriptionModel: null };

// On install/update, clear the "offscreen is broken" flag so every client re-attempts the
// global offscreen voice path once (now backed by a one-time mic-permission grant). If it
// still can't work, the flag gets re-set and we quietly use the per-tab migration fallback.
chrome.runtime.onInstalled.addListener((details) => {
  chrome.storage.local.set({ sbOffscreenRtBroken: false });
  // First-run funnel: on a FRESH install of the PUBLISHED build, open the homepage so a new user
  // actually meets Braino. Gated on `update_url` (present only for Web Store builds) so loading the
  // unpacked extension during development never opens a tab. Also skipped on update/reload.
  const isStoreBuild = Boolean(chrome.runtime.getManifest().update_url);
  if (details?.reason === "install" && isStoreBuild) {
    chrome.tabs.create({ url: "https://trybraino.com/?installed=1" }, () => { void chrome.runtime.lastError; });
  }
});

function doCapture(windowId, sendResponse) {
  chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      sendResponse({ error: chrome.runtime.lastError.message });
    } else {
      sendResponse({ dataUrl });
    }
  });
}

function bgNormalizeRecordingMode(value) {
  return value === "meeting" ? "meeting" : "lecture";
}

function bgDelay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bgGetStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function bgSetStorage(values) {
  return new Promise((resolve) => chrome.storage.local.set(values, resolve));
}

function bgRemoveStorage(keys) {
  return new Promise((resolve) => chrome.storage.local.remove(keys, resolve));
}

const BG_INTERNAL_PREMIUM_EMAILS = new Set([
  "itishpande21@gmail.com",
]);
const BG_CONTACT_CACHE_TTL_MS = 10 * 1000;
const BG_CONTACT_PHOTO_BUCKET = "braino-contact-photos";
let bgContactCache = { userId: null, loadedAt: 0, contacts: [] };

function bgNormalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function bgNormalizePhone(phone) {
  return typeof phone === "string" ? phone.trim() : "";
}

function bgLooksLikeEmailAddress(value) {
  return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(String(value || "").trim());
}

function bgNormalizeContactName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function bgStorageSafeSegment(value, fallback) {
  const safe = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return safe || fallback;
}

function bgContactPhotoExtension(fileName, mimeType) {
  const explicit = String(fileName || "").split(".").pop()?.trim().toLowerCase();
  if (explicit) return explicit;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "bin";
}

function bgEncodeStoragePath(path) {
  return String(path || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function bgGetManagedContactPhotoPath(url) {
  const prefix = `${BG_SUPABASE_URL}/storage/v1/object/public/${BG_CONTACT_PHOTO_BUCKET}/`;
  const trimmed = String(url || "").trim();
  if (!trimmed || !trimmed.startsWith(prefix)) return null;
  return decodeURIComponent(trimmed.slice(prefix.length));
}

function bgDataUrlToBytes(dataUrl) {
  const match = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(String(dataUrl || "").trim());
  if (!match) throw new Error("Invalid contact photo upload.");
  const mimeType = match[1].toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
    throw new Error("Contact photos must be JPG, PNG, GIF, or WebP.");
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { mimeType, bytes };
}

async function bgUploadBrainoContactPhoto(input, fallbackName) {
  const photoDataUrl = typeof input?.photoDataUrl === "string"
    ? input.photoDataUrl.trim()
    : typeof input?.photo_data_url === "string"
      ? input.photo_data_url.trim()
      : "";
  if (!photoDataUrl) return null;

  const { bytes, mimeType } = bgDataUrlToBytes(photoDataUrl);
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authUserId"], resolve));
  let userId = stored?.authUserId || null;
  if (!userId) {
    const { res } = await bgAuthedSupabaseFetch(`${BG_SUPABASE_URL}/auth/v1/user`);
    const profile = await res.json().catch(() => ({}));
    userId = typeof profile?.id === "string" ? profile.id : null;
  }
  if (!userId) throw new Error("Could not determine the signed-in user for photo upload.");

  const fileName = typeof input?.photoFileName === "string" ? input.photoFileName : typeof input?.photo_file_name === "string" ? input.photo_file_name : "";
  const ext = bgContactPhotoExtension(fileName, mimeType);
  const base = bgStorageSafeSegment(fallbackName || fileName, "contact");
  const unique = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${userId}/${base}-${unique}.${ext}`;

  const { res } = await bgAuthedSupabaseFetch(
    `${BG_SUPABASE_URL}/storage/v1/object/${BG_CONTACT_PHOTO_BUCKET}/${bgEncodeStoragePath(path)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": mimeType,
        "x-upsert": "false",
      },
      body: bytes,
    },
  );

  if (!res.ok) {
    const payload = await res.text().catch(() => "");
    throw new Error(payload || `Could not upload contact photo (${res.status}).`);
  }

  return {
    path,
    publicUrl: `${BG_SUPABASE_URL}/storage/v1/object/public/${BG_CONTACT_PHOTO_BUCKET}/${bgEncodeStoragePath(path)}`,
  };
}

async function bgDeleteManagedContactPhoto(url) {
  const path = bgGetManagedContactPhotoPath(url);
  if (!path) return;
  const { res } = await bgAuthedSupabaseFetch(
    `${BG_SUPABASE_URL}/storage/v1/object/${BG_CONTACT_PHOTO_BUCKET}/${bgEncodeStoragePath(path)}`,
    { method: "DELETE" },
  );
  if (!res.ok && res.status !== 404) {
    const payload = await res.text().catch(() => "");
    console.warn("Could not delete managed contact photo:", payload || res.status);
  }
}

function bgFormatContactLabel(contact, fallback = "") {
  return String(contact?.name || fallback || contact?.email || "that contact").trim();
}

function bgBuildMissingContactMessage(name, actionLabel) {
  const person = String(name || "that person").trim();
  const action = String(actionLabel || "this").trim();
  return `I don't know ${person} yet. Add their details in the Braino contact popup or settings and I’ll remember them for ${action}.`;
}

function bgDescribeContactMatches(matches) {
  return matches
    .slice(0, 3)
    .map((contact) => {
      const name = String(contact?.name || "").trim();
      const nickname = String(contact?.nickname || "").trim();
      if (!name) return "";
      return nickname ? `${name} (nickname: ${nickname})` : name;
    })
    .filter(Boolean)
    .join(", ");
}

function bgGetContactSearchKeys(contact) {
  return [
    bgNormalizeContactName(contact?.name_key || contact?.name || ""),
    bgNormalizeContactName(contact?.nickname_key || contact?.nickname || ""),
  ].filter(Boolean);
}

function bgUniqueContacts(matches) {
  const seen = new Set();
  return matches.filter((contact) => {
    const key = contact?.id || `${contact?.name_key || ""}:${contact?.nickname_key || ""}`;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bgFindContactMatches(query, contacts) {
  const nameKey = bgNormalizeContactName(query);
  if (!nameKey) return [];

  const exact = bgUniqueContacts(
    contacts.filter((contact) => bgGetContactSearchKeys(contact).includes(nameKey))
  );
  if (exact.length) return exact;

  const startsWith = bgUniqueContacts(
    contacts.filter((contact) =>
      bgGetContactSearchKeys(contact).some((key) => key.startsWith(nameKey))
    )
  );
  if (startsWith.length) return startsWith;

  const tokens = nameKey.split(" ").filter(Boolean);
  if (!tokens.length) return [];

  return bgUniqueContacts(
    contacts.filter((contact) => {
      const searchKeys = bgGetContactSearchKeys(contact);
      return tokens.every((token) => searchKeys.some((key) => key.includes(token)));
    })
  );
}

async function bgFetchBrainoContacts(force = false) {
  const now = Date.now();
  if (!force && bgContactCache.userId && now - bgContactCache.loadedAt < BG_CONTACT_CACHE_TTL_MS) {
    return bgContactCache.contacts;
  }

  const { res, userId } = await bgAuthedSupabaseFetch(
    `${BG_SUPABASE_URL}/rest/v1/braino_contacts?select=id,name,name_key,nickname,nickname_key,email,phone,photo_url,created_at,updated_at&order=name.asc`,
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Could not load Braino contacts (${res.status}).`);
  }

  const contacts = Array.isArray(data)
    ? data.map((contact) => ({
        ...contact,
        name: String(contact?.name || "").trim(),
        name_key: bgNormalizeContactName(contact?.name_key || contact?.name || ""),
        nickname: typeof contact?.nickname === "string" ? contact.nickname.trim() || null : null,
        nickname_key: bgNormalizeContactName(contact?.nickname_key || contact?.nickname || "") || null,
        email: bgNormalizeEmail(contact?.email) || null,
        phone: bgNormalizePhone(contact?.phone) || null,
        photo_url: typeof contact?.photo_url === "string" ? contact.photo_url.trim() || null : null,
      }))
    : [];

  bgContactCache = { userId: userId || null, loadedAt: now, contacts };
  return contacts;
}

async function bgUpsertBrainoContact(input) {
  const contactId = typeof input?.id === "string" ? input.id.trim() : "";
  const name = String(input?.name || "").trim();
  const nameKey = bgNormalizeContactName(name);
  const rawNickname = typeof input?.nickname === "string" ? input.nickname : "";
  const nickname = rawNickname.trim() || null;
  const nicknameKey = nickname ? bgNormalizeContactName(nickname) : null;
  const email = bgNormalizeEmail(input?.email) || null;
  const phone = bgNormalizePhone(input?.phone) || null;
  const rawPhotoUrl = typeof input?.photoUrl === "string"
    ? input.photoUrl
    : typeof input?.photo_url === "string"
      ? input.photo_url
      : "";
  let photoUrl = rawPhotoUrl.trim() || null;
  let uploadedPhotoPath = null;
  const previousContact = bgContactCache.contacts.find((contact) => {
    if (contactId && contact.id === contactId) return true;
    if (contact.name_key === nameKey) return true;
    if (nicknameKey && contact.nickname_key === nicknameKey) return true;
    return false;
  }) || null;
  const previousPhotoUrl = rawPhotoUrl.trim() || previousContact?.photo_url || "";

  if (!name || !nameKey) throw new Error("Contact name required.");

  const uploadedPhoto = await bgUploadBrainoContactPhoto(input, name);
  if (uploadedPhoto?.publicUrl) {
    uploadedPhotoPath = uploadedPhoto.path;
    photoUrl = uploadedPhoto.publicUrl;
  }

  const { res, userId } = await bgAuthedSupabaseFetch(
    `${BG_SUPABASE_URL}/rest/v1/braino_contacts?on_conflict=user_id,name_key&select=id,name,name_key,nickname,nickname_key,email,phone,photo_url,created_at,updated_at`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        user_id: userId,
        name,
        name_key: nameKey,
        nickname,
        nickname_key: nicknameKey,
        email,
        phone,
        photo_url: photoUrl,
      }),
    },
  );
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    if (uploadedPhotoPath) {
      await bgDeleteManagedContactPhoto(`${BG_SUPABASE_URL}/storage/v1/object/public/${BG_CONTACT_PHOTO_BUCKET}/${bgEncodeStoragePath(uploadedPhotoPath)}`);
    }
    throw new Error(data?.message || data?.error || `Could not save contact (${res.status}).`);
  }

  const saved = Array.isArray(data) ? data[0] : data;
  const normalizedSaved = {
    ...saved,
    name: String(saved?.name || name).trim(),
    name_key: bgNormalizeContactName(saved?.name_key || nameKey),
    nickname: typeof saved?.nickname === "string" ? saved.nickname.trim() || null : nickname,
    nickname_key: bgNormalizeContactName(saved?.nickname_key || nicknameKey || "") || null,
    email: bgNormalizeEmail(saved?.email) || null,
    phone: bgNormalizePhone(saved?.phone) || null,
    photo_url: typeof saved?.photo_url === "string" ? saved.photo_url.trim() || null : null,
  };
  if (previousPhotoUrl && previousPhotoUrl !== normalizedSaved.photo_url) {
    await bgDeleteManagedContactPhoto(previousPhotoUrl);
  }

  const existing = bgContactCache.contacts.filter((contact) => {
    if (contact.id === normalizedSaved.id) return false;
    if (contact.name_key === normalizedSaved.name_key) return false;
    if (normalizedSaved.nickname_key && contact.nickname_key === normalizedSaved.nickname_key) return false;
    return true;
  });
  bgContactCache = {
    userId: userId || bgContactCache.userId,
    loadedAt: Date.now(),
    contacts: [...existing, normalizedSaved].sort((left, right) => left.name.localeCompare(right.name)),
  };

  return normalizedSaved;
}

async function bgPromptForBrainoContact(tabId, payload) {
  if (!tabId) return null;
  return await new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: "sbPromptForContact", payload }, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message || "Could not open the contact prompt." });
        return;
      }
      resolve(response || { ok: false });
    });
  });
}

async function bgResolveBrainoContact(name, options = {}) {
  const trimmedName = String(name || "").trim();
  if (!trimmedName) {
    return { ok: false, message: "I need the person's name first." };
  }

  const actionLabel = options.actionLabel || "that";
  const contacts = await bgFetchBrainoContacts();
  const matches = bgFindContactMatches(trimmedName, contacts);
  if (matches.length > 1) {
    return {
      ok: false,
      message: `I found multiple contacts matching ${trimmedName}: ${bgDescribeContactMatches(matches)}. Use a fuller name or tidy the contact in settings.`,
    };
  }

  const existing = matches[0] || null;
  const needsEmail = options.requireEmail === true && !existing?.email;
  const needsPhone = options.requirePhone === true && !existing?.phone;

  if (existing && !needsEmail && !needsPhone) {
    return { ok: true, contact: existing, created: false };
  }

  if (options.allowPrompt === false) {
    return { ok: false, message: bgBuildMissingContactMessage(trimmedName, actionLabel) };
  }

  const prompt = await bgPromptForBrainoContact(options.tabId, {
    title: existing ? `Finish ${existing.name}` : `Save ${trimmedName}`,
    message: existing
      ? `Braino found ${existing.name}, but it still needs ${needsEmail ? "an email address" : "a phone number"} for ${actionLabel}.`
      : `Braino doesn't know ${trimmedName} yet. Add the details once and I’ll remember them for ${actionLabel}.`,
    submitLabel: existing ? "Save contact" : "Save and continue",
    contactId: existing?.id || "",
    name: existing?.name || trimmedName,
    nickname: existing?.nickname || "",
    email: existing?.email || "",
    phone: existing?.phone || "",
    photoUrl: existing?.photo_url || "",
    requireEmail: options.requireEmail === true,
    requirePhone: options.requirePhone === true,
  });

  if (!prompt?.ok || !prompt?.contact) {
    return { ok: false, message: bgBuildMissingContactMessage(trimmedName, actionLabel) };
  }

  const saved = await bgUpsertBrainoContact(prompt.contact);
  if (options.requireEmail === true && !saved.email) {
    return { ok: false, message: `I saved ${saved.name}, but I still need an email address for ${actionLabel}.` };
  }
  if (options.requirePhone === true && !saved.phone) {
    return { ok: false, message: `I saved ${saved.name}, but I still need a phone number for ${actionLabel}.` };
  }

  return { ok: true, contact: saved, created: true };
}

function bgIsInternalPremiumEmail(email) {
  const normalized = bgNormalizeEmail(email);
  return !!normalized && BG_INTERNAL_PREMIUM_EMAILS.has(normalized);
}

async function bgPerformRealWebSearch(query, options = {}) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return { error: "No search query provided." };

  try {
    const stored = await bgGetStorage(["authToken"]);
    let token = stored.authToken;
    if (!token) token = await bgRefreshAuthToken();
    if (!token) return { error: "Please sign in to Braino before using web research." };

    const searchGeo = await bgGetUserGeo().catch(() => null);
    const researchBody = JSON.stringify({
      query: trimmedQuery,
      purpose: options.purpose || "answer",
      aiProvider: options.aiProvider,
      chatHistory: options.chatHistory,
      instructions: options.instructions,
      clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      clientLocation: searchGeo
        ? [searchGeo.city, searchGeo.region, searchGeo.country].filter(Boolean).join(", ") || null
        : null,
    });

    const callResearch = (jwt) => fetch(`${BG_API_BASE}/web-research`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
      },
      body: researchBody,
    });

    let resp = await callResearch(token);
    if (resp.status === 401) {
      const freshToken = await bgRefreshAuthToken();
      if (freshToken) resp = await callResearch(freshToken);
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return { error: data?.error || `Web research failed: ${resp.status}` };
    }

    const sources = Array.isArray(data?.sources) ? data.sources : [];
    const results = Array.isArray(data?.results) && data.results.length
      ? data.results
      : sources.map((source) => ({
          title: source.title || source.url || "Untitled source",
          url: source.url || "",
          snippet: source.snippet || source.extractedTextExcerpt || "",
          highlights: source.highlights || [],
          publishedDate: source.publishedDate || null,
          status: source.status || "snippet_only",
        }));

    return {
      ...data,
      query: data?.query || trimmedQuery,
      engine: data?.engine || "OpenAI web_search",
      searchUrl: data?.searchUrl || "",
      sources,
      results,
    };
  } catch (e) {
    return { error: e.message || "Web research failed." };
  }
}

function bgTrimAgentContextText(value, maxChars = 280) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxChars ? `${text.slice(0, Math.max(0, maxChars - 1)).trim()}…` : text;
}

function bgNormalizeSharedChatHistory(rawValue) {
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .map((entry) => ({
      role: entry?.role === "assistant" ? "assistant" : "user",
      content: bgTrimAgentContextText(entry?.content || "", 360),
    }))
    .filter((entry) => entry.content);
}

function bgNormalizeSharedCardTurns(rawValue) {
  if (!Array.isArray(rawValue)) return [];
  return rawValue
    .map((turn) => ({
      prompt: bgTrimAgentContextText(turn?.prompt || "", 280),
      answer: bgTrimAgentContextText(turn?.answer || "", 360),
    }))
    .filter((turn) => turn.prompt || turn.answer);
}

function bgBuildAgentConversationContext(rawValue = {}) {
  const chatHistory = bgNormalizeSharedChatHistory(rawValue.chatHistory);
  const cardTurns = bgNormalizeSharedCardTurns(rawValue.cardTurns);
  const lastUserPrompt = bgTrimAgentContextText(
    rawValue.lastUserPrompt
      || [...chatHistory].reverse().find((entry) => entry.role === "user")?.content
      || [...cardTurns].reverse().find((turn) => turn.prompt)?.prompt
      || "",
    360,
  );
  const lastAssistantReply = bgTrimAgentContextText(
    rawValue.lastAssistantReply
      || [...chatHistory].reverse().find((entry) => entry.role === "assistant")?.content
      || [...cardTurns].reverse().find((turn) => turn.answer)?.answer
      || "",
    420,
  );

  return {
    mode: String(rawValue.mode || "page").trim() || "page",
    connectorHint: bgNormalizeConnectorHint(rawValue.connector || rawValue.connectorHint) || "auto",
    chatHistory,
    cardTurns,
    lastUserPrompt,
    lastAssistantReply,
  };
}

function bgBuildAgentConversationText(sharedContext = {}) {
  const context = bgBuildAgentConversationContext(sharedContext);
  const lines = [
    `Mode hint: ${context.mode}`,
    `Connector hint: ${context.connectorHint}`,
  ];

  if (context.lastUserPrompt) lines.push(`Latest user prompt: ${context.lastUserPrompt}`);
  if (context.lastAssistantReply) lines.push(`Latest assistant reply: ${context.lastAssistantReply}`);

  if (context.chatHistory.length) {
    lines.push("Recent shared chat turns:");
    for (const entry of context.chatHistory.slice(-8)) {
      lines.push(`- ${entry.role === "assistant" ? "Assistant" : "User"}: ${entry.content}`);
    }
  }

  if (context.cardTurns.length) {
    lines.push("Recent visible card turns:");
    for (const turn of context.cardTurns.slice(-4)) {
      if (turn.prompt) lines.push(`- Prompt: ${turn.prompt}`);
      if (turn.answer) lines.push(`  Reply: ${turn.answer}`);
    }
  }

  return lines.join("\n");
}

function bgGetConversationSnippets(sharedContext = {}) {
  const context = bgBuildAgentConversationContext(sharedContext);
  const seen = new Set();
  const snippets = [];
  const pushSnippet = (text, kind = "context") => {
    const trimmed = bgTrimAgentContextText(text || "", 420);
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    snippets.push({ kind, text: trimmed });
  };

  pushSnippet(context.lastUserPrompt, "last-user");
  pushSnippet(context.lastAssistantReply, "last-assistant");
  [...context.chatHistory].reverse().forEach((entry) => pushSnippet(entry.content, entry.role === "assistant" ? "assistant" : "user"));
  [...context.cardTurns].reverse().forEach((turn) => {
    pushSnippet(turn.prompt, "card-prompt");
    pushSnippet(turn.answer, "card-answer");
  });

  return snippets;
}

function bgIsAmbiguousContentFollowUp(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  return (
    /^(?:find|show|open|pick|get|play|watch|read)\s+(?:me\s+)?(?:the\s+)?(?:best|top)\s+(?:one|result|video|tutorial|article|course|guide)?\b/i.test(raw) ||
    /^(?:best|top)\s+one$/i.test(raw) ||
    /^(?:open|play|watch|read)\s+(?:it|that|the\s+best\s+one)\b/i.test(raw)
  );
}

function bgTextSuggestsOpenableRecommendation(text) {
  const raw = String(text || "").trim();
  if (!raw) return false;
  const hasContentType = /\b(tutorial|video|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)\b/i.test(raw);
  const hasAction = /\b(show|open|find|search|look\s+up|pull\s+up|bring\s+up|watch|play|read|get|recommend|best|top)\b/i.test(raw);
  return (hasContentType && hasAction) || bgIsAmbiguousContentFollowUp(raw);
}

function bgClassifyOpenableContentKind(text) {
  const raw = String(text || "").toLowerCase();
  if (!raw) return "";
  if (/\bpaper\b/.test(raw)) return "paper";
  if (/\barticle\b|\bblog(?:\s+post)?\b|\bpost\b/.test(raw)) return "article";
  if (/\bguide\b/.test(raw)) return "guide";
  if (/\bcourse\b|\bfull course\b/.test(raw)) return "course";
  if (/\blecture\b/.test(raw)) return "lecture";
  if (/\blesson\b/.test(raw)) return "lesson";
  if (/\bwalkthrough\b|\bdemo\b/.test(raw)) return "walkthrough";
  if (/\bvideo\b|\byoutube\b/.test(raw)) return "video";
  if (/\btutorial\b/.test(raw)) return "tutorial";
  return "";
}

function bgCleanOpenableTopic(value) {
  let topic = String(value || "").trim();
  if (!topic) return "";
  topic = topic.replace(/^[“"'`]+|[”"'`]+$/g, "");
  topic = topic.replace(/\b(?:please|for me|right now|thanks?|thank you)\b/gi, "");
  topic = topic.replace(/\b(?:on|about|for)\s+youtube\b/gi, "");
  topic = topic.replace(/\b(?:video|tutorial|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)\b\s*$/i, "");
  topic = topic.replace(/[.?!]+$/g, "").trim();
  if (/^(?:it|that|this|one|best one|top one)$/i.test(topic)) return "";
  return topic;
}

function bgExtractTopicFromContentRequest(text) {
  const raw = String(text || "").trim();
  if (!raw) return "";

  const patterns = [
    /(?:best|top|good|great|recommended?)\s+(?:youtube\s+)?(?:tutorial|video|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)\s+(?:on|about|for)\s+(.+)$/i,
    /(?:show|open|find|search(?:\s+for)?|look\s+up|pull\s+up|bring\s+up|watch|play|read|get)\s+(?:me\s+)?(?:the\s+)?(?:best|top|good|great)?\s*(?:youtube\s+)?(?:tutorial|video|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)?\s*(?:on|about|for)\s+(.+)$/i,
    /(?:show|open|find|watch|play|read|get)\s+(?:me\s+)?(?:an?\s+)?(?:tutorial|video|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    const topic = bgCleanOpenableTopic(match?.[1] || "");
    if (topic) return topic;
  }

  if (!bgTextSuggestsOpenableRecommendation(raw)) return "";
  const tailMatch = raw.match(/\b(?:tutorial|video|course|lecture|lesson|walkthrough|demo|guide|article|blog(?:\s+post)?|paper)\b[:\-]?\s+(.+)$/i);
  return bgCleanOpenableTopic(tailMatch?.[1] || "");
}

function bgInferConversationDomain(task, sharedContext = {}) {
  const current = String(task || "").trim();
  const texts = [current, ...bgGetConversationSnippets(sharedContext).map((snippet) => snippet.text)];
  for (const text of texts) {
    if (/\b(tutorial|video|course|lecture|lesson|walkthrough|demo|youtube)\b/i.test(text)) return "youtube";
    if (/\b(article|guide|blog|paper|read)\b/i.test(text)) return "web";
    if (/\b(spotify|song|track|music|playlist)\b/i.test(text)) return "spotify";
  }
  return "generic";
}

function bgFindRecentOpenableSeed(sharedContext = {}) {
  return bgGetConversationSnippets(sharedContext).find((snippet) => {
    if (!bgTextSuggestsOpenableRecommendation(snippet.text)) return false;
    return Boolean(bgExtractTopicFromContentRequest(snippet.text));
  }) || null;
}

function bgParseOpenableContentTask(task, sharedContext = {}) {
  const raw = String(task || "").trim();
  if (!raw) return null;

  const context = bgBuildAgentConversationContext(sharedContext);
  const direct = bgTextSuggestsOpenableRecommendation(raw);
  const followUp = bgIsAmbiguousContentFollowUp(raw);
  const seed = direct ? { text: raw } : (followUp ? bgFindRecentOpenableSeed(context) : null);
  if (!seed?.text) return null;

  const topic = bgExtractTopicFromContentRequest(raw) || bgExtractTopicFromContentRequest(seed.text);
  if (!topic) return null;

  const combinedSignals = [raw, seed.text, context.lastAssistantReply].filter(Boolean).join("\n");
  const contentKind = bgClassifyOpenableContentKind(combinedSignals) || "tutorial";
  const domain = bgInferConversationDomain(raw, context);
  const source = domain === "web" || ["article", "guide", "paper"].includes(contentKind) ? "web" : "youtube";
  const youtubeQueryKind = contentKind === "course" ? "full course" : contentKind === "lecture" ? "lecture" : "tutorial";
  const query = source === "youtube"
    ? `${topic} ${youtubeQueryKind} site:youtube.com/watch`
    : `${topic} ${contentKind === "paper" ? "paper" : "guide article"}`;

  return {
    topic,
    contentKind,
    source,
    followUp,
    query,
    queryLabel: source === "youtube" ? "YouTube tutorial" : contentKind,
  };
}

function bgOpenableTopicTokens(topic) {
  const stopWords = new Set(["the", "and", "for", "with", "from", "into", "about", "best", "top", "guide", "video", "tutorial", "course", "lecture", "lesson", "article"]);
  return String(topic || "")
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token))
    .slice(0, 8);
}

function bgIsYouTubeWatchUrl(url) {
  return /(?:youtube\.com\/watch|youtu\.be\/)/i.test(String(url || ""));
}

function bgScoreOpenableSearchResult(result, options = {}) {
  const title = String(result?.title || "").trim();
  const url = String(result?.url || "").trim();
  const snippet = [result?.snippet || "", ...(Array.isArray(result?.highlights) ? result.highlights : [])].join(" ").trim();
  const titleLower = title.toLowerCase();
  const urlLower = url.toLowerCase();
  const snippetLower = snippet.toLowerCase();
  const haystack = `${titleLower} ${snippetLower}`;
  const tokens = bgOpenableTopicTokens(options.topic || "");
  let score = Math.max(0, 12 - ((options.index || 0) * 2));

  if (options.source === "youtube") {
    if (/youtube\.com|youtu\.be/.test(urlLower)) score += 40;
    if (bgIsYouTubeWatchUrl(urlLower)) score += 28;
    if (/\/shorts\//.test(urlLower)) score -= 40;
    if ((/\/playlist\b/.test(urlLower) || /[?&]list=/.test(urlLower)) && !/\b(course|tutorial|lesson)\b/.test(haystack)) score -= 10;
    if (/\b(song|lyrics?|official video|official audio|music video|spotify)\b/.test(haystack)) score -= 35;
    if (/\b(tutorial|course|lesson|walkthrough|guide|beginner|full|lecture|demo|explained)\b/.test(haystack)) score += 22;
  } else {
    if (/\b(article|guide|tutorial|walkthrough|documentation|explained|blog|paper)\b/.test(haystack)) score += 14;
    if (/medium\.com|substack\.com|dev\.to|hashnode\.com|docs\.|documentation|blog/i.test(`${url} ${title}`)) score += 10;
    if (/youtube\.com|spotify\.com/.test(urlLower)) score -= 18;
  }

  for (const token of tokens) {
    if (titleLower.includes(token)) score += 8;
    else if (urlLower.includes(token)) score += 6;
    else if (snippetLower.includes(token)) score += 4;
  }

  return score;
}

function bgPickBestOpenableSearchResult(results, options = {}) {
  const safeResults = Array.isArray(results) ? results.filter((result) => String(result?.url || "").trim()) : [];
  if (!safeResults.length) return null;

  const scored = safeResults
    .map((result, index) => ({
      result,
      score: bgScoreOpenableSearchResult(result, { ...options, index }),
    }))
    .sort((a, b) => b.score - a.score);

  if (options.source === "youtube") {
    const bestWatch = scored.find((entry) => bgIsYouTubeWatchUrl(entry.result?.url || ""));
    if (bestWatch) return bestWatch.result;
  }

  return scored[0]?.result || null;
}

function bgFormatCaptureError(rawError, mode = "lecture") {
  const text = String(rawError || "").trim();
  if (!text) {
    return mode === "meeting"
      ? "Open the meeting in a regular browser tab to record the tab audio and your mic."
      : "Open the lecture in a regular browser tab to start recording.";
  }
  if (
    /activeTab permission|Extension has not been invoked|Chrome pages cannot be captured|Cannot access contents of url|tab capture can only be started|Permission denied/i.test(text)
  ) {
    return mode === "meeting"
      ? "Open the meeting in a regular browser tab so Braino can capture the meeting audio and your mic."
      : "Open the lecture in a regular browser tab so Braino can capture its audio.";
  }
  return text;
}

async function bgTryHandleOpenableContentTask({ tabId, task, sharedContext, history, onProgress }) {
  const parsed = bgParseOpenableContentTask(task, sharedContext);
  if (!parsed) return null;

  await onProgress?.(`Researching the best ${parsed.queryLabel} for ${parsed.topic}…`);
  const searchData = await bgPerformRealWebSearch(parsed.query, {
    purpose: "delegate",
    chatHistory: bgBuildAgentConversationContext(sharedContext).chatHistory,
    instructions: parsed.source === "youtube"
      ? "Find the single strongest YouTube tutorial/watch-page match for this request. Prefer substantive tutorials, full walkthroughs, strong topical relevance, and avoid music, songs, shorts, playlists, or channel homepages."
      : "Find the strongest article or guide for this request. Prefer high-signal explainers, guides, or documentation with clear topical relevance.",
  });

  if (searchData?.error) {
    return { message: `I couldn't research that just now: ${searchData.error}`, keepLectureCard: false };
  }

  const picked = bgPickBestOpenableSearchResult(searchData.results, parsed);
  if (!picked?.url) {
    return { message: `I couldn't find a strong ${parsed.queryLabel} for ${parsed.topic}.`, keepLectureCard: false };
  }

  const resultsText = Array.isArray(searchData.results)
    ? searchData.results
      .slice(0, 5)
      .map((result, index) => `[${index + 1}] ${result.title || "Untitled"}\n${result.url || ""}\n${result.snippet || ""}`)
      .join("\n\n")
    : "";
  history.push({
    type: "web_search",
    query: parsed.query,
    description: `Research the best ${parsed.queryLabel} for ${parsed.topic}`,
    result: {
      success: true,
      text: resultsText || searchData.answer || "",
    },
  });

  await onProgress?.(`Opening ${picked.title || "the best result"}…`);
  const navigateResult = await bgExecuteAgentAction(tabId, {
    type: "navigate",
    url: picked.url,
    description: `Open ${picked.title || picked.url}`,
  });
  history.push({
    type: "navigate",
    description: `Open ${picked.title || picked.url}`,
    result: navigateResult,
  });
  if (navigateResult?.error) {
    return { message: `I found a good result for ${parsed.topic}, but I couldn't open it.`, keepLectureCard: false };
  }

  await bgWaitForTabReady(tabId, 8000);

  if (parsed.source !== "youtube") {
    return {
      message: `Opened the strongest ${parsed.queryLabel} I found for ${parsed.topic}: ${picked.title || picked.url}`,
      keepLectureCard: false,
    };
  }

  const activeTab = await bgGetTabById(tabId);
  const landedUrl = String(activeTab?.url || picked.url || "").trim();
  if (!bgIsYouTubeWatchUrl(landedUrl)) {
    return {
      message: `I found a YouTube result for ${parsed.topic}, but it didn't land on a playable watch page.`,
      keepLectureCard: false,
    };
  }

  const playback = await bgExecuteSiteAdapterAction(tabId, { type: "youtubeEnsurePlayback" });
  const readyMessage = playback?.blocked
    ? "Press play when you're ready — Braino is ready to capture this tutorial."
    : "Playing now — Braino is capturing this tutorial.";
  await bgSendInlineUiMessage(tabId, {
    action: "startLectureRecording",
    readyMessage,
  });

  return {
    message: playback?.blocked
      ? `Opened the best YouTube tutorial I found for ${parsed.topic}. Press play when you're ready — Lecture & Audio mode is already armed on this tab.`
      : `Opened the best YouTube tutorial I found for ${parsed.topic} and started Lecture & Audio mode.`,
    keepLectureCard: true,
  };
}

// Toggle injected panel when extension icon is clicked.
// For scriptable tabs this fires normally (no popup registered).
// For restricted tabs the popup is pre-registered via bgSyncActionPopup so
// onClicked never fires — but handle it here as a first-click safety net.
chrome.action.onClicked.addListener((tab) => {
  const url = tab.url || "";
  if (!bgIsScriptableUrl(url)) {
    chrome.action.setPopup({ tabId: tab.id, popup: "braino-popup.html" });
    if (chrome.action.openPopup) chrome.action.openPopup().catch?.(() => {});
    return;
  }

  chrome.storage.local.set({ activeTabId: tab.id });

  const sendToggle = (allowRetry, allowInject) => {
    chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => {
      const err = chrome.runtime.lastError?.message || "";
      const missingReceiver =
        err.includes("Receiving end does not exist") ||
        err.includes("Could not establish connection");

      if (!missingReceiver) return;

      // Give the manifest-injected content script a moment to finish loading
      // before we fall back to a manual injection.
      if (allowRetry) {
        setTimeout(() => sendToggle(false, allowInject), 180);
        return;
      }

      if (!allowInject) return;

      chrome.scripting.executeScript({ target: { tabId: tab.id }, files: BG_CONTENT_SCRIPT_FILES }, () => {
        void chrome.runtime.lastError;
        chrome.tabs.sendMessage(tab.id, { action: "toggleSideBrainPanel" }, () => { void chrome.runtime.lastError; });
      });
    });
  };

  sendToggle(true, true);
});

function bgSendMessageToTabWithInject(tabId, message, sendResponse) {
  chrome.tabs.sendMessage(tabId, message, (res) => {
    if (!chrome.runtime.lastError) {
      sendResponse?.(res || { ok: true });
      return;
    }

    chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
      if (chrome.runtime.lastError) {
        sendResponse?.({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, message, (retryRes) => {
          if (chrome.runtime.lastError) sendResponse?.({ ok: false, error: chrome.runtime.lastError.message });
          else sendResponse?.(retryRes || { ok: true });
        });
      }, 180);
    });
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command !== "toggle_movie_mode") return;
  bgGetActiveTabId().then((tabId) => {
    if (!tabId) return;
    chrome.storage.local.set({ activeTabId: tabId });
    bgSendMessageToTabWithInject(tabId, { action: "toggleMovieMode" });
  }).catch(() => {});
});

// Auto-update activeTabId and sync popup state when user switches tabs
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.storage.local.set({ activeTabId: tabId });
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    bgSyncActionPopup(tabId, tab?.url || "");
  });
});

// Keep popup state in sync as tab URLs change (navigation, SPA, etc.)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined || changeInfo.status === "complete") {
    bgSyncActionPopup(tabId, tab?.url || "");
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getStreamId") {
    (async () => {
      const requestedTabId = message.tabId || sender?.tab?.id || null;
      const recovery = await bgEnsureScriptableBrainoTab(requestedTabId, {
        activate: true,
        handoffMessage: "Chrome pages can't be recorded, so I moved Braino to a normal tab.",
      });
      if (!recovery.tabId) {
        sendResponse({ error: bgFormatCaptureError("", bgNormalizeRecordingMode(message.mode)) });
        return;
      }
      if (recovery.created && !requestedTabId) {
        await bgMaybeShowRecoveryHandoff(
          recovery.tabId,
          "Open the lecture or meeting in this regular tab, then start recording.",
          { title: "Braino moved here" },
        );
        sendResponse({
          error: bgFormatCaptureError("", bgNormalizeRecordingMode(message.mode)),
          tabId: recovery.tabId,
          created: true,
          moved: true,
        });
        return;
      }
      chrome.tabCapture.getMediaStreamId({ targetTabId: recovery.tabId }, (streamId) => {
        if (chrome.runtime.lastError || !streamId) {
          sendResponse({
            error: bgFormatCaptureError(chrome.runtime.lastError?.message || "Failed to get stream", bgNormalizeRecordingMode(message.mode)),
            tabId: recovery.tabId,
          });
        } else {
          sendResponse({ streamId, tabId: recovery.tabId, moved: recovery.moved, created: recovery.created });
        }
      });
    })().catch((error) => {
      sendResponse({ error: bgFormatCaptureError(error?.message || error, bgNormalizeRecordingMode(message.mode)) });
    });
    return true;
  }
  if (message.action === "startRecording") {
    (async () => {
      const mode = bgNormalizeRecordingMode(message.mode);
      // Free-tier gate: 5 min/day on Free, unlimited on Pro/creator/admin.
      const recGate = await bgGateSurface("recording_seconds", { action: "precheck" });
      if (!recGate.allowed) {
        bgNotifyQuota(message.tabId || sender?.tab?.id || null, "recording", recGate);
        sendResponse({ error: "FREE_LIMIT_RECORDING", quotaExceeded: true, surface: "recording" });
        return;
      }
      let targetTabId = message.tabId || sender?.tab?.id || null;
      let recovery = { tabId: targetTabId, moved: false, created: false };

      if (!message.streamId) {
        recovery = await bgEnsureScriptableBrainoTab(targetTabId, {
          activate: true,
          handoffMessage: "Chrome pages can't be recorded, so I moved Braino to a normal tab.",
        });
        if (!recovery.tabId) {
          sendResponse({ error: bgFormatCaptureError("", mode) });
          return;
        }
        if (recovery.created && !targetTabId) {
          await bgMaybeShowRecoveryHandoff(
            recovery.tabId,
            "Open the lecture or meeting in this regular tab, then start recording.",
            { title: "Braino moved here" },
          );
          sendResponse({
            error: bgFormatCaptureError("", mode),
            tabId: recovery.tabId,
            created: true,
            moved: true,
          });
          return;
        }
        targetTabId = recovery.tabId;
      }

      await startRecording(targetTabId, message.streamId, message.withMic, mode);
      bgRecordingStartedAt = Date.now();
      sendResponse({
        success: true,
        tabId: targetTabId,
        moved: recovery.moved,
        created: recovery.created,
      });
    })().catch((e) => sendResponse({ error: bgFormatCaptureError(e?.message || e, bgNormalizeRecordingMode(message.mode)) }));
    return true;
  }
  if (message.action === "stopRecording") {
    bgConsumeRecordingSeconds();
    stopRecording()
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "getLectureSegment") {
    bgGetAndTranscribeSegment(message.existingNotes || "", message.mode, message.existingTranscript || "")
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "scheduleMeetingFollowUp") {
    bgScheduleMeetingFollowUp(message.followUp || {}, sender?.tab?.id)
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "stopRecordingAndTranscribe") {
    bgConsumeRecordingSeconds();
    bgStopRecordingAndTranscribe(message.existingNotes || "", message.mode, message.existingTranscript || "")
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  // In-page capture (getDisplayMedia) path: the content script records the audio itself and
  // sends each segment's base64 here for the same transcription/notes pipeline as offscreen.
  if (message.action === "transcribeSegment") {
    bgTranscribeAudioChunk({
      audioBase64: message.audioBase64 || null,
      existingNotes: message.existingNotes || "",
      existingTranscript: message.existingTranscript || "",
      mode: bgNormalizeRecordingMode(message.mode),
      knownSpeakerReferences: Array.isArray(message.knownSpeakerReferences) ? message.knownSpeakerReferences : [],
    })
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "syncLectureToNotion") {
    bgSyncToNotion(message.markdown, message.title)
      .then((res) => sendResponse(res))
      .catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (message.action === "sbSpotifyPlaySeek") {
    // Party-trick soundtrack: play an exact track from a timestamp. Direct play first
    // (device already active = instant); otherwise open/reuse the web-player tab and
    // poll until it registers (same theatric flow as voice music).
    (async () => {
      const uris = [String(message.uri || "")].filter(Boolean);
      const positionMs = Number.isFinite(Number(message.positionMs)) ? Number(message.positionMs) : 0;
      if (!uris.length) return { ok: false };
      // Cold web players accept play-with-position but their first state sync can snap
      // back to 0:00. VERIFIED-only correction: seek ONLY when progress proves the track
      // restarted (a blind seek re-fired on top of a correct start and the song audibly
      // played "twice"). Two passes to catch slow players; silence otherwise.
      const ensureSeek = () => {
        if (!(positionMs > 0)) return;
        const checkOnce = async () => {
          const st = await bgCallSpotifyFunction("spotify-player-state", {});
          const prog = Number(st?.progressMs);
          if (!Number.isFinite(prog)) return true;                 // can't verify — do NOT stutter
          if (prog >= positionMs - 4000) return true;              // position took — leave it alone
          await bgCallSpotifyFunction("spotify-playback", { action: "seek", positionMs });
          return true;
        };
        setTimeout(() => { checkOnce().catch(() => {}); }, 700);
        setTimeout(() => { checkOnce().catch(() => {}); }, 2200);
      };
      try {
        const payload = { action: "play", uris };
        if (positionMs > 0) payload.positionMs = positionMs;
        await bgCallSpotifyFunction("spotify-playback", payload);
        ensureSeek();
        return { ok: true };
      } catch (err) {
        const msg = String(err?.message || "");
        if (/sign\s?in|auth|connect/i.test(msg)) return { ok: false, reason: "signin" };
        if (!/device|active|404/i.test(msg)) return { ok: false };
      }
      try {
        // A NEVER-focused background tab is throttled so hard the web player never boots
        // (no device registers → silence). So: an EXISTING player tab is reused quietly;
        // a NEW tab opens focused just long enough to boot, then focus bounces back to
        // the user's page — the dance doesn't start until this resolves.
        const prevActive = await bgGetActiveTabId();
        const existing = await bgFindSpotifyTab().catch(() => null);
        await bgPlaySpotifyWithAutoOpen(uris, positionMs, { background: Boolean(existing) });
        if (!existing && prevActive) { try { chrome.tabs.update(prevActive, { active: true }); } catch (_) {} }
        ensureSeek();
        return { ok: true };
      } catch (_) { return { ok: false }; }
    })().then(sendResponse).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message.action === "sbSpotifyPause") {
    // End of a party trick: the band stops when the show stops.
    bgCallSpotifyFunction("spotify-playback", { action: "pause" })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message.action === "sbGetUserGeo") {
    bgGetUserGeo().then((geo) => sendResponse(geo)).catch(() => sendResponse(null));
    return true;
  }
  if (message.action === "sbAgentBootQuery") {
    // Hive-mind handshake: a freshly injected content script asks whether a delegate
    // run is mid-flight on (or adopting) its tab, so it can restore the working UI
    // instead of booting blank and looking like Braino forgot what it was doing.
    const bootTabId = sender?.tab?.id || null;
    const bootTask = (bootTabId && bgAgentTaskByTab.get(bootTabId)) || "";
    const runFresh = Boolean(bgDelegateRunInfo) && (Date.now() - bgDelegateRunInfo.at < 30000);
    sendResponse({ task: bootTask, running: Boolean(bootTask) && runFresh });
    return false;
  }
  if (message.action === "getStatus") {
    sendResponse({ isRecording });
    return true;
  }
  if (message.action === "startInlineVoiceListening" || message.action === "stopInlineVoiceListening") {
    const isStart = message.action === "startInlineVoiceListening";
    const forwardAction = isStart ? "startVoiceListening" : "stopVoiceListening";
    (async () => {
      const preferredTabId = sender?.tab?.id || await bgGetActiveTabId();
      const recovery = await bgEnsureScriptableBrainoTab(preferredTabId, {
        activate: true,
        handoffMessage: "Chrome pages can't host Braino, so I moved it to a normal tab.",
      });
      if (!recovery.tabId) {
        sendResponse({ error: "Open a normal browser tab to use voice mode." });
        return;
      }
      const payload = isStart
        ? { action: forwardAction, mode: "manual", source: "inline" }
        : { action: forwardAction, source: "inline" };
      const response = await bgSendInlineUiMessage(recovery.tabId, payload);
      if (!response && isStart) {
        sendResponse({ error: "I couldn't start voice mode on that tab." });
        return;
      }
      sendResponse(response || { success: true, tabId: recovery.tabId, moved: recovery.moved, created: recovery.created });
    })().catch((error) => {
      sendResponse({ error: error?.message || "Voice mode failed to start." });
    });
    return true;
  }
  if (message.action === "voiceEvent") {
    const tabId = sender?.tab?.id;
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        action: "sbVoiceEvent",
        event: message.event,
        text: message.text,
        isFinal: message.isFinal,
        error: message.message,
        source: message.source,
      }, () => { void chrome.runtime.lastError; });
    }
    return false;
  }
  if (message.action === "getPageContent") {
    (async () => {
      const preferredTabId = sender?.tab?.id || await bgGetActiveTabId();
      const recovery = await bgEnsureScriptableBrainoTab(preferredTabId, {
        activate: true,
        handoffMessage: "Chrome pages can't be read, so I moved Braino to a normal tab.",
      });
      if (!recovery.tabId) {
        sendResponse({ error: "Open a normal browser tab to use Chat with Page." });
        return;
      }
      if (recovery.created && !preferredTabId) {
        sendResponse({ error: "Open the page you want in this new tab, then ask again." });
        return;
      }
      const res = await bgSendInlineUiMessage(recovery.tabId, { action: "extractPageContent" });
      if (res?.text) {
        sendResponse(res);
        return;
      }
      sendResponse({ error: "I couldn't read that page." });
    })().catch((error) => {
      sendResponse({ error: error?.message || "I couldn't read that page." });
    });
    return true;
  }
  if (message.action === "performWebSearch") {
    (async () => {
      // Free-tier gate: web search counts toward the daily question cap; unlimited on Pro/creator/admin.
      const searchGate = await bgGateSurface("chat_count", { action: "consume", amount: 1 });
      if (!searchGate.allowed) {
        bgNotifyQuota(sender?.tab?.id || null, "chat", searchGate);
        sendResponse({ error: "FREE_LIMIT_CHAT", quotaExceeded: true, surface: "chat" });
        return;
      }
      const result = await bgPerformRealWebSearch(message.query, {
        purpose: message.purpose,
        aiProvider: message.aiProvider,
        chatHistory: message.chatHistory,
        instructions: message.instructions,
      });
      sendResponse(result);
    })().catch((e) => sendResponse({ error: e.message || "Web search failed." }));
    return true;
  }
  if (message.action === "captureVisibleTabImage") {
    (async () => {
      try {
        const winId = sender?.tab?.windowId;
        const opts = { format: "png" };   // png to match the vision backend's declared mime
        const dataUrl = await new Promise((resolve, reject) => {
          const cb = (url) => {
            if (chrome.runtime.lastError || !url) reject(new Error(chrome.runtime.lastError?.message || "capture failed"));
            else resolve(url);
          };
          if (typeof winId === "number") chrome.tabs.captureVisibleTab(winId, opts, cb);
          else chrome.tabs.captureVisibleTab(opts, cb);
        });
        sendResponse({ ok: true, dataUrl });
      } catch (e) { sendResponse({ ok: false, error: e?.message || "capture failed" }); }
    })();
    return true;
  }
  // The camera window pushes frames + status to us (the reliable window→worker direction).
  if (message && message.sbCam === true) {
    if (message.type === "frame" && message.data) {
      bgLatestCamFrame = message.data; bgLatestCamFrameAt = Date.now(); bgCamPushStatus = "ready";
      console.log("[BrainoCam] frame pushed, len=", message.data.length);
    } else if (message.type === "status") {
      bgCamPushStatus = message.status || "";
      console.log("[BrainoCam] status pushed:", message.status);
    }
    return false;
  }
  if (message.action === "brainoCameraVision") {
    (async () => {
      console.log("[BrainoCam] brainoCameraVision requested");
      const gate = await bgGateSurface("chat_count", { action: "consume", amount: 1 });
      if (!gate.allowed) { console.log("[BrainoCam] gate blocked"); bgNotifyQuota(sender?.tab?.id || null, "chat", gate); sendResponse({ ok: false, error: "FREE_LIMIT_CHAT", quotaExceeded: true }); return; }
      // ensure the camera window is open — it renders the live feed and pushes frames to us
      let id = await bgFindCamWindow();
      console.log("[BrainoCam] existing window id:", id);
      if (id == null) {
        bgLatestCamFrame = ""; bgLatestCamFrameAt = 0; bgCamPushStatus = "";
        const pos = await bgCamWindowPos();
        const win = await new Promise((r) => chrome.windows.create({ url: chrome.runtime.getURL("cam.html"), type: "popup", focused: true, ...pos }, (w) => r(chrome.runtime.lastError ? null : w)));
        console.log("[BrainoCam] created window:", win && win.id, chrome.runtime.lastError && chrome.runtime.lastError.message);
        if (!win) { sendResponse({ ok: false, status: "noframe" }); return; }
      } else { try { chrome.windows.update(id, { focused: true }); } catch (_) {} }
      // wait for a fresh pushed frame (granted) or a permission status
      const startedAt = Date.now();
      let frame = "";
      while (Date.now() - startedAt < 9000) {
        if (bgLatestCamFrame && (Date.now() - bgLatestCamFrameAt) < 4000) { frame = bgLatestCamFrame; break; }
        if (bgCamPushStatus === "needpermission" || bgCamPushStatus === "denied") { console.log("[BrainoCam] permission status:", bgCamPushStatus); sendResponse({ ok: false, status: bgCamPushStatus }); return; }
        await new Promise((r) => setTimeout(r, 250));
      }
      console.log("[BrainoCam] wait done. frame?", !!frame, "lastFrameAgeMs=", bgLatestCamFrameAt ? (Date.now() - bgLatestCamFrameAt) : "none", "status=", bgCamPushStatus);
      if (!frame) { sendResponse({ ok: false, status: "noframe" }); return; }
      const res = await bgChatFetch({
        notes: "",
        chatHistory: Array.isArray(message.chatHistory) ? message.chatHistory : [],
        message: message.prompt || "Describe what you can see.",
        visionMode: "describe",
        imageBase64: frame,
      });
      const data = await res.json().catch(() => ({}));
      console.log("[BrainoCam] vision res.ok=", res.ok, "status=", res.status, "reply?", !!(data && data.reply));
      if (!res.ok) { sendResponse({ ok: false, status: "ready", error: `vision ${res.status}` }); return; }
      sendResponse({ ok: true, status: "ready", reply: String(data?.reply || data?.response || "").trim() });
    })().catch((e) => { console.log("[BrainoCam] threw:", e?.message); sendResponse({ ok: false, error: e?.message || "Camera vision failed." }); });
    return true;
  }
  if (message.action === "closeCamWindow") {
    (async () => {
      let id = bgCamWindowId;
      if (id == null) id = await bgFindCamWindow();
      try { if (id != null) chrome.windows.remove(id, () => { void chrome.runtime.lastError; }); } catch (_) {}
      bgCamWindowId = null;
      sendResponse({ ok: true });
    })();
    return true;
  }
  if (message.action === "brainoVision") {
    (async () => {
      // Vision counts toward the daily chat cap (unlimited on Pro/creator/admin).
      const gate = await bgGateSurface("chat_count", { action: "consume", amount: 1 });
      if (!gate.allowed) {
        bgNotifyQuota(sender?.tab?.id || null, "chat", gate);
        sendResponse({ ok: false, error: "FREE_LIMIT_CHAT", quotaExceeded: true });
        return;
      }
      const res = await bgChatFetch({
        notes: "",
        chatHistory: Array.isArray(message.chatHistory) ? message.chatHistory : [],
        message: message.prompt || "Describe what you can see.",
        visionMode: "describe",
        imageBase64: message.imageBase64 || "",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { sendResponse({ ok: false, error: `vision ${res.status}` }); return; }
      sendResponse({ ok: true, reply: String(data?.reply || data?.response || "").trim() });
    })().catch((e) => sendResponse({ ok: false, error: e?.message || "Vision failed." }));
    return true;
  }
  if (message.action === "generateXReply") {
    (async () => {
      const { tweetText, handle } = message;
      const builderPrompt = Boolean(message.builderPrompt) || bgIsBuilderPromptTweet(tweetText);
      const persona = await bgLoadXPersona();
      const xReplyPrompt = bgBuildXReplyPrompt({ handle, builderPrompt, persona });

      bgChatFetch({
          notes: '',
          chatHistory: [
            {
              role: 'user',
              content: xReplyPrompt,
            },
            { role: 'assistant', content: 'Got it. Give me the tweet.' },
            { role: 'user', content: '@founder: "Most startup advice is survivorship bias with better branding."' },
            { role: 'assistant', content: 'yeah a lot of it is just luck wearing a framework costume' },
            { role: 'user', content: '@manager: "Remote work isn\'t dying. Bad management is."' },
            { role: 'assistant', content: 'a lot of return-to-office panic really is management debt with better PR' },
            { role: 'user', content: '@builder: "If onboarding needs a meeting, the product probably isn\'t ready."' },
            { role: 'assistant', content: 'mostly true. enterprise is the annoying exception, but even there the payoff has to be obvious fast' },
            { role: 'user', content: '@pm: "The best PMs write better bug reports than specs."' },
            { role: 'assistant', content: 'because they notice where reality breaks, not just where the roadmap sounds neat' },
            { role: 'user', content: '@maker: "what are you building right now? drop it below"' },
            { role: 'assistant', content: 'building Braino right now. ai browser companion that can actually act on the tab for you. trybraino.com' },
          ],
          message: `@${handle || 'user'}: "${tweetText}"`,
        })
        .then(r => r.json())
        .then(data => sendResponse({ reply: bgCleanXReply(data?.reply || data?.response || null) || null }))
        .catch(() => sendResponse({ reply: null }));
    })().catch(() => sendResponse({ reply: null }));
    return true;
  }
  if (message.action === "recordXAutomationRunStats") {
    bgRecordXAutomationRunStats(message)
      .then(() => sendResponse({ ok: true }))
      .catch((e) => sendResponse({ ok: false, error: e.message || "Could not save X automation stats." }));
    return true;
  }
  if (message.action === "logXReply") {
    bgLogXReply(message).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "loadXPersona") {
    bgLoadXPersona()
      .then(persona => sendResponse({ persona: persona || null }))
      .catch(() => sendResponse({ persona: null }));
    return true;
  }
  if (message.action === "getXStatus") {
    bgAuthedSupabaseFetch(`${BG_API_BASE}/x-status`, { method: "POST" })
      .then(async ({ res }) => sendResponse(res.ok ? await res.json() : { error: `x-status ${res.status}` }))
      .catch((e) => sendResponse({ error: e.message || "Could not reach X." }));
    return true;
  }
  if (message.action === "draftXPostFromBrief") {
    bgCallXAssistant({
      action: "draft_post",
      brief: String(message.brief || "").trim(),
      browserTime: message.browserTime || new Date().toISOString(),
      timeZone: message.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    })
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ error: e.message || "Could not draft X post." }));
    return true;
  }
  if (message.action === "postXDraftNow") {
    bgCallXAssistant({
      action: "post_now",
      content: String(message.content || "").trim(),
      browserTime: message.browserTime || new Date().toISOString(),
      timeZone: message.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    })
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ error: e.message || "Could not post to X." }));
    return true;
  }
  if (message.action === "scheduleXDraft") {
    bgCallXAssistant({
      action: "schedule_post",
      content: String(message.content || "").trim(),
      scheduled_at: String(message.scheduledAt || message.scheduled_at || "").trim(),
      browserTime: message.browserTime || new Date().toISOString(),
      timeZone: message.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
    })
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ error: e.message || "Could not schedule X post." }));
    return true;
  }
  if (message.action === "startXAutomationOnX") {
    bgStartXAutomationOnX()
      .then((data) => sendResponse(data))
      .catch((e) => sendResponse({ ok: false, error: e.message || "Could not start X automation." }));
    return true;
  }
  // ── Offscreen realtime bridge ──────────────────────────────────────────────
  if (message.action === "micPermissionResult") {
    bgResolveMicPermission(!!message.granted);
    return false;
  }
  if (message.action === "adjustSpotifyVolume") {
    (async () => {
      try {
        const wantMute = message.volumePercent === 0;
        // Prefer the open Spotify web-player tab (DOM slider); fall back to the Web API.
        const spotifyTab = await bgFindSpotifyTab();
        if (spotifyTab?.id != null) {
          const res = await bgExecuteSiteAdapterAction(spotifyTab.id, {
            type: "spotifySetVolume",
            volumePercent: typeof message.volumePercent === "number" ? message.volumePercent : null,
            volumeStep: message.volumeStep || 0,
          });
          if (res?.ok) { sendResponse({ ok: true, volumePercent: res.volumePercent, muted: wantMute && res.volumePercent === 0 }); return; }
          sendResponse({ ok: false, error: "I couldn't change the volume — make sure a song is playing in Spotify." });
          return;
        }
        // No web tab — use the Web API (real devices only).
        let volumePercent = typeof message.volumePercent === "number" ? message.volumePercent : null;
        if (volumePercent == null) {
          const playerState = await bgFetchSpotifyPlayerState();
          const current = typeof playerState?.volumePercent === "number" ? playerState.volumePercent : 50;
          volumePercent = Math.min(100, Math.max(0, current + (message.volumeStep || 0)));
        }
        await bgCallSpotifyFunction("spotify-playback", { action: "volume", volumePercent });
        sendResponse({ ok: true, volumePercent, muted: volumePercent === 0 });
      } catch (e) {
        sendResponse({ ok: false, error: "I couldn't reach Spotify to change the volume." });
      }
    })();
    return true;
  }
  if (message.action === "startOffscreenRealtime") {
    (async () => {
      try {
        bgVoiceModeOn = true;
        const requesterTabId = sender?.tab?.id ?? null;
        if (bgRtSessionActive) {
          rtVoiceOwnerTabId = requesterTabId || rtVoiceOwnerTabId;
          bgVoiceVisualTabId = requesterTabId || bgVoiceVisualTabId;
          if (requesterTabId) {
            chrome.tabs.sendMessage(requesterTabId, { action: "sbRtSessionReady", ...bgRtSessionInfo }, () => { void chrome.runtime.lastError; });
          }
          sendResponse({ ok: true, alreadyActive: true });
          return;
        }
        if (bgRtSessionStarting) {
          rtVoiceOwnerTabId = requesterTabId || rtVoiceOwnerTabId;
          sendResponse({ ok: true, starting: true });
          return;
        }
        // Free-tier gate: voice is a daily taste on Free, unlimited on Pro/creator/admin.
        const voiceGate = await bgGateSurface("voice_seconds", { action: "precheck" });
        if (!voiceGate.allowed) {
          bgNotifyQuota(requesterTabId, "voice", voiceGate);
          sendResponse({ ok: true, quotaExceeded: true, surface: "voice" });
          return;
        }
        bgVoiceSessionStartedAt = Date.now();
        bgRtSessionStarting = true;
        // The offscreen document is invisible and cannot show a mic prompt. Make sure the
        // extension already holds microphone permission (granted once via a visible helper
        // window) — without it, offscreen getUserMedia fails and we'd fall back to per-tab
        // sessions. With it, the session is global and follows across tabs instantly.
        const micOk = await ensureExtensionMicPermission();
        if (!micOk) {
          bgRtSessionStarting = false;
          chrome.storage.local.set({ sbRtSessionActive: false });
          chrome.tabs.sendMessage(sender?.tab?.id || 0, { action: "sbRtSessionFailed", error: "Microphone not granted" }, () => { void chrome.runtime.lastError; });
          sendResponse({ ok: true, micDenied: true });
          return;
        }

        await ensureOffscreenForRealtime();
        rtVoiceOwnerTabId = requesterTabId;
        bgRtSessionActive = false; // set true ONLY when offscreen confirms ready (offscreenRtReady)
        // NOTE: do NOT set sbRtSessionActive optimistically — that caused a true→false flip
        // on fallback that thrashed the content-side presence listener. It's set in
        // offscreenRtReady once the global session is genuinely live.
        chrome.runtime.sendMessage(
          { target: "offscreen", action: "startRealtimeSession", authToken: message.authToken, bootInstructions: message.bootInstructions, voiceEngine: message.voiceEngine },
          (res) => {
            if (chrome.runtime.lastError || res?.error) {
              bgRtSessionStarting = false;
              // Offscreen failed even though permission was granted — maybe the OS-level
              // grant was revoked. Only forget the permission on mic-looking failures;
              // quota/API failures should not cause a pointless permission re-prompt.
              const errText = String(res?.error || chrome.runtime.lastError?.message || "Offscreen start failed");
              const storageUpdate = { sbRtSessionActive: false };
              if (/microphone|permission|notallowed|notreadable|getusermedia|device/i.test(errText)) {
                storageUpdate.sbMicPermission = null;
              }
              chrome.storage.local.set(storageUpdate);
              chrome.tabs.sendMessage(rtVoiceOwnerTabId || requesterTabId || 0, { action: "sbRtSessionFailed", error: errText }, () => { void chrome.runtime.lastError; });
            }
          }
        );
        sendResponse({ ok: true });
      } catch (e) {
        bgRtSessionStarting = false;
        chrome.storage.local.set({ sbRtSessionActive: false });
        sendResponse({ error: e.message || "Failed to start offscreen realtime" });
      }
    })();
    return true;
  }
  if (message.action === "offscreenRtReady") {
    bgRtSessionStarting = false;
    bgRtSessionActive = true;
    bgRtSessionInfo = {
      sessionId: message.sessionId || null,
      limitMs: Number(message.limitMs || 0),
      allocatedMs: Number(message.allocatedMs || 0),
      realtimeModel: message.realtimeModel || null,
      transcriptionModel: message.transcriptionModel || null,
    };
    chrome.storage.local.set({ sbRtSessionActive: true }); // global session is genuinely live now
    bgVoiceVisualTabId = rtVoiceOwnerTabId; // the starting tab shows the presence first
    // Forward session info to the owner tab so it can set up usage tracking.
    if (rtVoiceOwnerTabId) {
      chrome.tabs.sendMessage(rtVoiceOwnerTabId, { action: "sbRtSessionReady", ...bgRtSessionInfo }, () => { void chrome.runtime.lastError; });
    }
    return false;
  }
  if (message.action === "offscreenRtEvent") {
    // Forward realtime events to the currently active tab (not necessarily the owner).
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, { action: "sbRtEvent", event: message.event }, () => { void chrome.runtime.lastError; });
    });
    return false;
  }
  if (message.action === "offscreenRtDisconnected") {
    if (!bgVoiceModeOn) return false;
    bgConsumeVoiceSeconds();
    bgRtSessionStarting = false;
    bgRtSessionActive = false;
    bgRtSessionInfo = { sessionId: null, limitMs: 0, allocatedMs: 0, realtimeModel: null, transcriptionModel: null };
    bgVoiceVisualTabId = null;
    chrome.storage.local.set({ sbRtSessionActive: false });
    // Tell the active tab so it can fall back to legacy voice.
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      const tabId = tabs?.[0]?.id;
      if (tabId) chrome.tabs.sendMessage(tabId, { action: "sbRtSessionEnded", reason: message.reason }, () => { void chrome.runtime.lastError; });
    });
    return false;
  }
  if (message.action === "offscreenRtSend") {
    chrome.runtime.sendMessage({ target: "offscreen", action: "sendRtEvent", event: message.event }, () => { void chrome.runtime.lastError; });
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "offscreenRtMic") {
    chrome.runtime.sendMessage({ target: "offscreen", action: "setRtMicEnabled", enabled: message.enabled }, () => { void chrome.runtime.lastError; });
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "stopOffscreenRealtime") {
    bgConsumeVoiceSeconds();
    bgRtSessionStarting = false;
    bgRtSessionActive = false;
    bgRtSessionInfo = { sessionId: null, limitMs: 0, allocatedMs: 0, realtimeModel: null, transcriptionModel: null };
    rtVoiceOwnerTabId = null;
    bgVoiceVisualTabId = null;
    chrome.storage.local.set({ sbRtSessionActive: false });
    chrome.runtime.sendMessage({ target: "offscreen", action: "stopRealtimeSession" }, () => { void chrome.runtime.lastError; });
    sendResponse({ ok: true });
    return false;
  }
  // ──────────────────────────────────────────────────────────────────────────
  if (message.action === "rtVoiceClaim") {
    // One voice session at a time: record the owner and tell every other tab to stand down.
    const ownerId = sender?.tab?.id ?? null;
    rtVoiceOwnerTabId = ownerId;
    bgVoiceVisualTabId = ownerId; // this tab now shows the presence
    chrome.tabs.query({}, (tabs) => {
      for (const t of tabs) {
        if (t.id != null && t.id !== ownerId) {
          chrome.tabs.sendMessage(t.id, { action: "rtVoiceYield" }, () => { void chrome.runtime.lastError; });
        }
      }
    });
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "rtVoiceRelease") {
    if (rtVoiceOwnerTabId === (sender?.tab?.id ?? null)) rtVoiceOwnerTabId = null;
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "getTabsOverview") {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({});
        // Count only real web pages — exclude new-tab, chrome://, extension, devtools, etc.
        const contentTabs = tabs.filter((t) => t.id != null && /^https?:\/\//i.test(t.url || ""));
        const list = contentTabs.map((t) => ({
          id: t.id,
          title: t.title || "(untitled)",
          host: bgHostOf(t.url),
          active: !!t.active,
          pinned: !!t.pinned,
          audible: !!t.audible,
        }));
        const windowCount = new Set(contentTabs.map((t) => t.windowId)).size;
        sendResponse({
          count: list.length,
          windowCount: Math.max(1, windowCount),
          tabs: list,
          activeTabId: sender?.tab?.id ?? null,
        });
      } catch (e) {
        sendResponse({ error: e.message || "Could not read tabs." });
      }
    })();
    return true;
  }
  if (message.action === "closeIrrelevantTabs") {
    (async () => {
      try {
        const protectedId = sender?.tab?.id ?? null;
        const tabs = await chrome.tabs.query({});
        // Hard safety filter — protected tabs are removed before the LLM ever sees them.
        const candidates = tabs.filter(
          (t) => t.id != null && t.id !== protectedId && !t.active && !t.pinned && !t.audible,
        );
        if (!candidates.length) {
          sendResponse({ closed: [], closedCount: 0, keptCount: tabs.length, reason: "nothing-to-close" });
          return;
        }
        const picked = await bgPickIrrelevantTabs(String(message.instruction || ""), candidates);
        const candidateIds = new Set(candidates.map((c) => c.id));
        let safeIds = [...new Set(picked)].filter((id) => candidateIds.has(id));
        // If the model closed nothing, fall back to clearing obvious junk so the feature never just
        // says "everything's in use" when there's clutter sitting right there.
        if (!safeIds.length) safeIds = bgFallbackClutterIds(candidates);
        const closedTitles = candidates.filter((c) => safeIds.includes(c.id)).map((c) => c.title || "(untitled)");
        if (safeIds.length) await chrome.tabs.remove(safeIds);
        sendResponse({ closed: closedTitles, closedCount: safeIds.length, keptCount: tabs.length - safeIds.length });
      } catch (e) {
        sendResponse({ error: e.message || "Could not close tabs." });
      }
    })();
    return true;
  }
  if (message.action === "runBrainAgent") {
    (async () => {
      const task = String(message.task || "").trim();
      const connector = message.connector;
      const sharedContext = bgBuildAgentConversationContext({
        ...message,
        connector,
      });
      const senderTabId = sender?.tab?.id || null;
      const preferredTabId = senderTabId || message.senderTabId || await bgGetActiveTabId();
      const recovery = await bgEnsureScriptableBrainoTab(preferredTabId, {
        activate: true,
        handoffMessage: "Chrome pages can't host Braino, so I moved it to a normal tab to keep going.",
      });
      if (!recovery.tabId) {
        sendResponse({ ok: false, error: "Open a normal browser tab to use Delegate mode." });
        return;
      }
      bgAgentShouldStop = false;
      const runClaim = bgTryClaimDelegateRun(recovery.tabId, task);
      if (!runClaim.ok) {
        sendResponse({ ok: true, duplicate: true, tabId: recovery.tabId, moved: recovery.moved, created: recovery.created });
        return;
      }
      // Free-tier gate: Delegate is a monthly taste on Free, unlimited on Pro/creator/admin.
      // Gated AFTER dedupe so a duplicate run never burns quota; release the claim if blocked.
      const delegateGate = await bgGateSurface("delegate_count", { action: "consume", amount: 1 });
      if (!delegateGate.allowed) {
        bgReleaseDelegateRun(recovery.tabId, runClaim.token);
        bgNotifyQuota(recovery.tabId, "delegate", delegateGate);
        sendResponse({ ok: true, quotaExceeded: true, surface: "delegate", tabId: recovery.tabId });
        return;
      }
      void bgRunBrainAgent(recovery.tabId, task, connector, sharedContext).catch((error) => {
        bgBrainUpdate(recovery.tabId, "Agent error: " + (error?.message || error), true, { task });
      }).finally(() => {
        bgReleaseDelegateRun(recovery.tabId, runClaim.token);
      });
      sendResponse({ ok: true, tabId: recovery.tabId, moved: recovery.moved, created: recovery.created });
    })().catch((error) => {
      sendResponse({ ok: false, error: error?.message || "Delegate mode failed to start." });
    });
    return true;
  }
  if (message.action === "stopBrainAgent") {
    bgAgentShouldStop = true;
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "openSilentAuthTab") {
    (async () => {
      // First try to authenticate from a Braino tab that's already open and signed in
      // (production OR preview env). If we find a session there, storing it fires the
      // content script's auth watcher (green) — no need to open an auth tab at all.
      const existing = await bgScavengeAuthFromBrainoTabs();
      if (existing?.access_token) { sendResponse({ ok: true, source: "existing-tab" }); return; }

      // Otherwise open the /auth/extension relay page for each origin (production + preview)
      // silently in the background. Whichever origin the user is signed into relays its session;
      // storeAuthData then closes every tab we opened here.
      const extId = chrome.runtime.id;
      const openedTabIds = [];
      for (const origin of BG_BRAINO_AUTH_ORIGINS) {
        const tab = await new Promise((resolve) =>
          chrome.tabs.create({ url: `${origin}/auth/extension?ext=${extId}`, active: false }, resolve));
        if (tab?.id) openedTabIds.push(tab.id);
      }
      if (openedTabIds.length) await chrome.storage.local.set({ __sbAuthTabIds: openedTabIds });
      sendResponse({ ok: true, source: "auth-tab" });
    })();
    return true;
  }
  if (message.action === "closeSilentAuthTabs") {
    bgCloseSilentAuthTabs();
    sendResponse({ ok: true });
    return false;
  }
  if (message.action === "openAuthTab") {
    const extId = chrome.runtime.id;
    chrome.tabs.create({ url: `https://trybraino.com/auth/extension?ext=${extId}` }, (tab) => {
      if (tab?.id) chrome.storage.local.set({ __sbAuthTabId: tab.id });
    });
    sendResponse({ ok: true });
    return true;
  }
  if (message.action === "checkAuth") {
    (async () => {
      // Pull token from extension storage
      let { authToken, authRefreshToken } = await chrome.storage.local.get(["authToken", "authRefreshToken"]);

      // If no token in extension storage, try to grab it from any open Braino tab —
      // production (trybraino.com) or the preview env.
      if (!authToken && !authRefreshToken) {
        const s = await bgScavengeAuthFromBrainoTabs();
        if (s?.access_token) {
          authToken = s.access_token;
          authRefreshToken = s.refresh_token || null;
        }
      }

      if (!authToken && !authRefreshToken) { sendResponse({ authenticated: false }); return; }
      try {
        const res = await fetch(`${BG_SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${authToken}` }
        });
        if (res.ok) { sendResponse({ authenticated: true }); return; }
        if (authRefreshToken) {
          const refreshed = await bgRefreshAuthToken();
          sendResponse({ authenticated: !!refreshed });
          return;
        }
        sendResponse({ authenticated: false });
      } catch {
        sendResponse({ authenticated: !!authToken });
      }
    })();
    return true;
  }
  if (message.action === "resolvePremiumStatus") {
    (async () => {
      const result = await bgResolvePremiumStatus({ forceRefresh: Boolean(message.forceRefresh) });
      sendResponse(result);
    })();
    return true;
  }
  if (message.action === "openTab") {
    const url = String(message.url || "").trim();
    if (url.startsWith("https://") || url.startsWith("http://")) {
      // Re-fire guard: the same URL requested again within 10s (mic echo, duplicate delegate run,
      // repeated voice turn) focuses the tab we just opened instead of stacking identical tabs.
      for (const [u, entry] of bgRecentOpenedTabs) {
        if (Date.now() - entry.ts > 60000) bgRecentOpenedTabs.delete(u);
      }
      const recent = bgRecentOpenedTabs.get(url);
      if (recent && Date.now() - recent.ts < 10000) {
        chrome.tabs.get(recent.tabId, (tab) => {
          if (!chrome.runtime.lastError && tab?.id) {
            if (message.active !== false) {
              chrome.windows.update(tab.windowId, { focused: true }, () => { void chrome.runtime.lastError; });
              chrome.tabs.update(tab.id, { active: true }, () => { void chrome.runtime.lastError; });
            }
            sendResponse({ ok: true, tabId: tab.id, reused: true });
            return;
          }
          chrome.tabs.create({ url, active: message.active !== false }, (created) => {
            void chrome.runtime.lastError;
            if (created?.id) bgRecentOpenedTabs.set(url, { tabId: created.id, ts: Date.now() });
            sendResponse({ ok: true, tabId: created?.id ?? null });
          });
        });
        return true;
      }
      chrome.tabs.create({ url, active: message.active !== false }, (tab) => {
        void chrome.runtime.lastError;
        if (tab?.id) bgRecentOpenedTabs.set(url, { tabId: tab.id, ts: Date.now() });
        sendResponse({ ok: true, tabId: tab?.id ?? null });
      });
      return true; // async sendResponse
    }
    sendResponse({ ok: false });
    return false;
  }

  // Design Delegate: open the design tool in a visible tab and TYPE a synthesized prompt into its
  // composer (we deliberately do NOT submit — the user reviews and hits enter). Retries while the
  // SPA loads; clipboard copy on the content side is the fallback if the composer never resolves.
  if (message.action === "runDesignMockup") {
    (async () => {
      const url = String(message.url || "").trim();
      const prompt = String(message.prompt || "");
      if (!/^https?:\/\//.test(url) || !prompt) { sendResponse({ ok: false, typed: false }); return; }

      const tab = await new Promise((res) =>
        chrome.tabs.create({ url, active: true }, (t) => { void chrome.runtime.lastError; res(t); }));
      const tabId = tab?.id;
      if (!tabId) { sendResponse({ ok: false, typed: false }); return; }

      await bgWaitForTabReady(tabId, 8000);
      let typed = false;
      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 700));
        const res = await bgExecuteAgentAction(tabId, {
          type: "type",
          text: prompt,
          submit: false, // user reviews and sends
          selector: 'div[contenteditable="true"]',
          targetText: "prompt",
        });
        if (res && res.success && !res.error) { typed = true; break; }
      }
      sendResponse({ ok: true, typed, tabId });
    })();
    return true;
  }
  if (message.action === "classifyBrainAgentTask") {
    (async () => {
      const task = String(message.task || "").trim();
      if (!task) {
        sendResponse({ shouldDelegate: false, matched: null });
        return;
      }

      const senderTabId = sender?.tab?.id || null;
      const activeTabId = senderTabId || await bgGetActiveTabId();
      const siteContext = activeTabId ? await bgGetSiteAdapterContext(activeTabId) : { site: "generic", url: "", title: "" };
      const connectorHint = message.connector;
      const sharedContext = bgBuildAgentConversationContext({
        ...message,
        connector: connectorHint,
      });
      const openable = bgParseOpenableContentTask(task, sharedContext);
      const parsed = openable ? null : bgParseAdapterTask(task, siteContext, connectorHint);
      const fastActions = bgTryFastPath(task, []);
      const looksLikeBrowserTask = Boolean(openable) || bgLooksLikeBrowserTask(task);

      sendResponse({
        shouldDelegate: Boolean(openable || parsed || fastActions || looksLikeBrowserTask),
        matched: openable
          ? "openable-content"
          : parsed
            ? "adapter"
            : fastActions
              ? "fastpath"
              : looksLikeBrowserTask
                ? "browser-task"
                : null,
        adapter: parsed?.adapter || null,
        intent: openable?.contentKind || parsed?.intent || null,
      });
    })();
    return true;
  }
  if (
    message.action === "agentAction" ||
    message.action === "buildElementMap" ||
    message.action === "getAgentPageContext" ||
    message.action === "siteAdapterAction" ||
    message.action === "getSiteAdapterContext"
  ) {
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = message.tabId || store.activeTabId;
      if (!tabId) { sendResponse({ error: "No active tab" }); return; }

      // Navigate can be done directly — works even on pages without content scripts
      if (message.action === "agentAction" && message.type === "navigate") {
        chrome.tabs.update(tabId, { url: message.url }, () => {
          if (chrome.runtime.lastError) sendResponse({ error: chrome.runtime.lastError.message });
          else sendResponse({ success: true });
        });
        return;
      }

      function sendToContentScript(retrying) {
        chrome.tabs.sendMessage(tabId, message, (res) => {
          if (chrome.runtime.lastError) {
            if (retrying) { sendResponse({ error: chrome.runtime.lastError.message }); return; }
            // Inject content script and retry once
            chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
              if (chrome.runtime.lastError) { sendResponse({ error: chrome.runtime.lastError.message }); return; }
              setTimeout(() => sendToContentScript(true), 250);
            });
          } else {
            sendResponse(res || { error: "No response from content script" });
          }
        });
      }
      sendToContentScript(false);
    });
    return true;
  }
  if (message.action === "captureScreenshot") {
    // Get the window that contains the active tab we're recording
    chrome.storage.local.get("activeTabId", (store) => {
      const tabId = store.activeTabId;
      if (!tabId) {
        // Fallback: capture current window
        doCapture(null, sendResponse);
        return;
      }
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          doCapture(null, sendResponse);
        } else {
          doCapture(tab.windowId, sendResponse);
        }
      });
    });
    return true;
  }
});

// ===== REMOTE AGENT — panel-less execution (runs even when side panel is closed) =====
const BG_SUPABASE_URL = "https://suwhgaxxdizowbyjlljj.supabase.co";
const BG_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1d2hnYXh4ZGl6b3dieWpsbGpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMTQ5MTcsImV4cCI6MjA5NTg5MDkxN30.We3LVV8wezVwlna-lXdUeJlQCL-rkTvHxPMM_DMnK5o";
const BG_API_BASE = "https://suwhgaxxdizowbyjlljj.supabase.co/functions/v1";

// Supabase persists the signed-in session under this localStorage key on every Braino web origin.
const BG_SUPABASE_AUTH_STORAGE_KEY = "sb-suwhgaxxdizowbyjlljj-auth-token";

// Every Braino web origin the extension trusts for a signed-in session: production plus the
// Vercel preview deploys. Being logged in on any of these authenticates the extension the same
// as trybraino.com, so the preview env "goes through" even when trybraino.com isn't signed in.
const BG_BRAINO_WEB_MATCHES = [
  "*://trybraino.com/*",
  "*://braino-eight.vercel.app/*",
  "*://braino-git-cinemamode-itishs-projects.vercel.app/*",
];

// Origins whose /auth/extension page can relay a signed-in session back to the extension.
// The silent auth check opens each of these so a user logged into production OR the preview
// env authenticates, even when neither tab is currently open.
const BG_BRAINO_AUTH_ORIGINS = [
  "https://trybraino.com",
  "https://braino-git-cinemamode-itishs-projects.vercel.app",
];

// Close any background /auth/extension relay tab(s) the extension opened for the silent auth
// check — the legacy single id plus the array used when opening both production and preview.
function bgCloseSilentAuthTabs() {
  chrome.storage.local.get(["__sbAuthTabId", "__sbAuthTabIds"], ({ __sbAuthTabId, __sbAuthTabIds }) => {
    const ids = [];
    if (typeof __sbAuthTabId === "number") ids.push(__sbAuthTabId);
    if (Array.isArray(__sbAuthTabIds)) ids.push(...__sbAuthTabIds.filter((id) => typeof id === "number"));
    for (const id of ids) {
      chrome.tabs.remove(id, () => { void chrome.runtime.lastError; });
    }
    if (ids.length) chrome.storage.local.remove(["__sbAuthTabId", "__sbAuthTabIds"]);
  });
}

// Look through any open Braino web tab (production OR preview) for a signed-in Supabase session
// and, if found, persist it into extension storage. Setting authToken fires storage.onChanged,
// which the content script's auth watcher turns into the green "authenticated" state.
// Returns the session object if one was found, else null.
async function bgScavengeAuthFromBrainoTabs() {
  try {
    const tabs = await chrome.tabs.query({ url: BG_BRAINO_WEB_MATCHES });
    for (const tab of tabs) {
      if (!tab?.id) continue;
      let results;
      try {
        results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [BG_SUPABASE_AUTH_STORAGE_KEY],
          func: (storageKey) => {
            try {
              const raw = localStorage.getItem(storageKey);
              if (!raw) return null;
              const s = JSON.parse(raw);
              return s?.access_token ? s : null;
            } catch { return null; }
          },
        });
      } catch { continue; }
      const s = results?.[0]?.result;
      if (s?.access_token) {
        const authEmail = s.user?.email || null;
        await chrome.storage.local.set({
          authToken: s.access_token,
          authRefreshToken: s.refresh_token || null,
          authEmail,
          authUserId: s.user?.id || null,
          authDisplayName: s.user?.user_metadata?.full_name || s.user?.user_metadata?.name || null,
          ...(bgIsInternalPremiumEmail(authEmail) ? { isPremium: true, isPremiumCachedAt: Date.now() } : {}),
        });
        return s;
      }
    }
  } catch {}
  return null;
}
const BG_PREMIUM_CACHE_MS = 5 * 60 * 1000;
const BG_BRAINO_FAVORITE_SONG_URI = "spotify:track:6Hgh47WXVKtXN5zGOu0hjI";

// Flat registry of what Braino can do — consulted before dispatching to the LLM agent loop.
const BG_CAPABILITY_MANIFEST = {
  spotify:  ["playSong", "setVolume", "playbackControl", "addSongToPlaylist", "playSongFromPlaylist"],
  medium:   ["searchArticles"],
  twitter:  ["readFeed", "generateAndPost", "postTweet"],
  gmail:    ["search", "draftEmail", "sendEmail", "replyCurrentThread"],
  drive:    ["createDoc", "organize", "search", "createFolder", "rename", "move", "delete"],
  calendar: ["createEvent", "rescheduleEvent", "cancelEvent", "forwardEvent", "listEvents", "openNextMeet", "watchEvents"],
};

async function bgChatFetch(body) {
  const { authToken } = await new Promise(r => chrome.storage.local.get("authToken", r));
  const enrichedBody = body && typeof body === "object" && !Array.isArray(body)
    ? {
        ...body,
        clientTimeZone: body.clientTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        clientUtcOffsetMinutes: Number.isFinite(Number(body.clientUtcOffsetMinutes))
          ? Number(body.clientUtcOffsetMinutes)
          : new Date().getTimezoneOffset(),
      }
    : body;
  return fetch(`${BG_API_BASE}/chat-about-notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: typeof enrichedBody === "string" ? enrichedBody : JSON.stringify(enrichedBody),
  });
}

function bgHostOf(url) {
  try { return new URL(url || "").hostname.replace(/^www\./, ""); } catch { return ""; }
}

// ── Camera vision: the camera lives in a top-level extension popup window (cam.html) — the only
// context the page's Permissions-Policy can't block. STATELESS design: we find the window by URL
// (never a remembered id, which dies with the service worker) and talk to it with one-shot messages,
// so a worker restart can't lose the connection or spawn duplicate windows. ─────────────────────────
let bgCamWindowId = null;
let bgLatestCamFrame = "";       // most recent frame the camera window pushed us (window→SW = reliable)
let bgLatestCamFrameAt = 0;
let bgCamPushStatus = "";        // "ready" | "needpermission" | "denied"

// One-shot message to the cam window. Resolves null if it isn't open / doesn't answer in time.
function bgSendToCam(message, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      chrome.runtime.sendMessage(message, (resp) => { void chrome.runtime.lastError; finish(resp || null); });
    } catch (_) { finish(null); return; }
    setTimeout(() => finish(null), timeoutMs || 4000);
  });
}

// Find an already-open camera window by its URL — robust across service-worker restarts.
function bgFindCamWindow() {
  return new Promise((resolve) => {
    try {
      chrome.windows.getAll({ populate: true, windowTypes: ["popup", "normal"] }, (wins) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        for (const w of (wins || [])) {
          for (const t of (w.tabs || [])) {
            const u = t.url || t.pendingUrl || "";
            if (u.includes("cam.html")) { resolve(w.id); return; }
          }
        }
        resolve(null);
      });
    } catch (_) { resolve(null); }
  });
}

// Put the window on-screen, top-right of the current window (default placement can land it off a
// multi-monitor desktop).
async function bgCamWindowPos() {
  const W = 340, H = 280;
  try {
    const cur = await new Promise((r) => chrome.windows.getCurrent({}, (w) => r(chrome.runtime.lastError ? null : w)));
    if (cur && typeof cur.left === "number" && typeof cur.width === "number") {
      return { width: W, height: H, left: Math.max(20, cur.left + cur.width - W - 36), top: Math.max(20, (cur.top || 0) + 96) };
    }
  } catch (_) {}
  return { width: W, height: H, left: 140, top: 120 };
}

// Open the one-time grant window (visible, has a button → a real gesture so the prompt appears). Once
// the user allows, the EXTENSION origin holds the camera grant and the offscreen doc inherits it —
// exactly how the mic permission works.
async function bgOpenCamGrantWindow() {
  const existing = await bgFindCamWindow();
  if (existing != null) { try { chrome.windows.update(existing, { focused: true }); } catch (_) {} return; }
  const pos = await bgCamWindowPos();
  chrome.windows.create({ url: chrome.runtime.getURL("cam.html"), type: "popup", focused: true, ...pos }, () => { void chrome.runtime.lastError; });
}

// Grab a single camera frame in the OFFSCREEN document — the same proven channel voice uses. Returns
// { frame } | { needpermission: true } | { error }.
async function bgOffscreenGrabCameraFrame() {
  try { await ensureOffscreen(); } catch (_) {}
  return await new Promise((resolve) => {
    let done = false; const fin = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      chrome.runtime.sendMessage({ target: "offscreen", action: "grabCameraFrame" }, (resp) => { void chrome.runtime.lastError; fin(resp || {}); });
    } catch (_) { fin({}); return; }
    setTimeout(() => fin({ error: "timeout" }), 8000);
  });
}

// Ask the LLM which of the (already safety-filtered) candidate tabs to close.
// Returns an array of tab IDs. Closes nothing if the response can't be parsed.
async function bgPickIrrelevantTabs(instruction, candidates) {
  const numbered = candidates
    .map((t, i) => `${i}. ${String(t.title || "(untitled)").slice(0, 80)} — ${bgHostOf(t.url) || "?"}`)
    .join("\n");
  const prompt = [
    "You help a user tidy their browser tabs by closing the ones they don't need.",
    `User request: "${instruction || "close the tabs I don't need"}"`,
    "",
    "Closable tabs (the active, pinned, and audio-playing tabs are already excluded and SAFE):",
    numbered,
    "",
    "Pick the clutter to close: new/blank tabs, duplicates, search-result pages, finished articles,",
    "social/news the user has clearly moved on from, ads, trackers. KEEP things that look like active",
    "work (docs, editors, dashboards, a logged-in app mid-task).",
    "When the user says \"the tabs I don't need\" / \"clean up\" / \"close what I'm not using\", that IS",
    "your instruction to actually close the clutter — don't refuse or return an empty list out of caution.",
    "Only return [] if literally every listed tab looks like active work.",
    "Return ONLY a JSON array of the indices to close (e.g. [0,2,3]).",
  ].join("\n");

  try {
    const res = await bgChatFetch({ notes: "", chatHistory: [], message: prompt });
    const data = await res.json().catch(() => ({}));
    const raw = String(data?.reply || data?.response || "");
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) return [];
    const indices = JSON.parse(match[0]);
    if (!Array.isArray(indices)) return [];
    return indices
      .map((n) => candidates[Number(n)]?.id)
      .filter((id) => id != null);
  } catch {
    return [];
  }
}

// Deterministic safety net: if the LLM closes nothing (over-cautious or the chat call failed), still
// clear the obvious junk — blank/new-tab pages and exact-duplicate URLs (keeping the first of each).
function bgFallbackClutterIds(candidates) {
  const junk = [];
  const seenUrl = new Set();
  for (const t of candidates) {
    const url = String(t.url || "");
    const blank = !url || url === "about:blank" || /^(chrome|edge|brave|about):\/\/(newtab|blank|new-tab-page|newtabpage)/i.test(url);
    if (blank) { junk.push(t.id); continue; }
    if (seenUrl.has(url)) { junk.push(t.id); continue; }
    seenUrl.add(url);
  }
  return junk.filter((id) => id != null);
}

let bgXPersonaCache = null;
let bgXPersonaCacheExpiry = 0;

// --- helpers ---

function bgIsBuilderPromptTweet(tweetText) {
  return /\b(what(?:'s| is)?\s+(?:everyone|everybody|yall|you all|you)\s+building|what are you building|what(?:'re| are)\s+you building|drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links|website)|share\s+what\s+you(?:'re| are)\s+building|show\s+me\s+what\s+you(?:'re| are)\s+building|plug\s+your\s+(?:startup|product|app|tool|project)|builders?\s+drop\s+(?:your|the)\s+(?:startup|product|app|tool|project|link|links))\b/i.test(String(tweetText || ""));
}

async function bgLoadXPersona() {
  if (bgXPersonaCache !== null && Date.now() < bgXPersonaCacheExpiry) return bgXPersonaCache;
  try {
    const storage = await new Promise(r => chrome.storage.local.get(['authUserId'], r));
    const userId = storage.authUserId;
    if (!userId) return null;
    const url = `${BG_SUPABASE_URL}/rest/v1/x_auto_persona?user_id=eq.${encodeURIComponent(userId)}&select=display_name,bio,what_building,tone_notes&limit=1`;
    const { res } = await bgAuthedSupabaseFetch(url, { headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) return null;
    const rows = await res.json();
    bgXPersonaCache = rows[0] || null;
    bgXPersonaCacheExpiry = Date.now() + 5 * 60 * 1000;
    return bgXPersonaCache;
  } catch { return null; }
}

function bgBuildXReplyPrompt({ handle, builderPrompt, persona }) {
  const personaLines = [];
  if (persona) {
    if (persona.display_name) personaLines.push(`You are ${persona.display_name}.`);
    if (persona.bio) personaLines.push(`Background: ${persona.bio}`);
    if (persona.what_building) personaLines.push(`Currently building: ${persona.what_building}`);
    if (persona.tone_notes) personaLines.push(`Writing style: ${persona.tone_notes}`);
  }
  const personaBlock = personaLines.length ? personaLines.join('\n') + '\n\n' : '';

  const promoRule = builderPrompt
    ? "11. This tweet is explicitly inviting builders to share what they are making. It is okay to mention Braino and include trybraino.com once, naturally and briefly, like a real builder reply."
    : "11. Do not sound promotional. Do not mention Braino or trybraino.com unless the tweet is directly about AI browser agents or workflow automation and the mention feels natural.";

  return `${personaBlock}You write replies on X that sound like a real person in the feed, not a bot, brand intern, customer support rep, or LinkedIn commenter.

Write ONE reply to the tweet.

Rules:
1. Max 180 characters total.
2. Reply to one specific detail, implication, or phrase from the tweet. Do not give generic praise plus a paraphrase.
3. Sound human: conversational, concrete, a little imperfect is okay. One or two short sentences is ideal. Fragments are okay.
4. Match the tweet's energy. If the tweet is sharp, be sharp. If it's thoughtful, be thoughtful. If it's playful, be playful. Do not force slang.
5. Do not start with @${handle || 'user'} unless the meaning would be unclear without it.
6. No em dashes, hashtags, list formatting, or quotes around the whole reply.
7. Avoid canned openings like "great point", "love this", "totally agree", "well said", "interesting take", or "thanks for sharing".
8. Avoid AI-sounding phrasing like "this highlights", "this underscores", "important conversation", "valuable insight", "in today's world", or "I couldn't agree more".
9. Ask a follow-up question only if it is genuinely specific and improves the reply. Do not ask a question by default.
10. At most one emoji, and only if it feels native to the tweet.
${promoRule}
12. Return ONLY the reply text.
13. Never output labels or prefixes like "Draft 1", "Draft 2", "Option 1", "Reply:", "Candidate 1", or multiple candidates.
14. Never reveal your internal drafting process. Draft silently and output only the final chosen reply.

Before answering, silently draft 3 candidate replies and choose the one that is most specific, least generic, and most likely to be posted by a real person on X.`;
}

function bgCleanXReply(value) {
  let reply = String(value || "").trim();
  if (!reply) return "";

  reply = reply
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, "").trim())
    .replace(/^["'`]+|["'`]+$/g, "")
    .trim();

  const candidateLines = reply
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const extractedCandidates = candidateLines
    .map((line) => {
      const labeled = line.match(/^(?:draft|option|reply|candidate)\s*#?\d*\s*[:.)-]?\s*(.+)$/i);
      if (labeled?.[1]) return labeled[1].trim();

      const numbered = line.match(/^\d+\s*[:.)-]\s*(.+)$/);
      if (numbered?.[1]) return numbered[1].trim();

      return null;
    })
    .filter(Boolean);

  if (extractedCandidates.length) {
    reply = extractedCandidates[0];
  } else {
    reply = candidateLines
      .filter((line) => !/^(?:here(?:'s| are)|options?|choices?|candidates?)\b/i.test(line))
      .join(" ")
      .trim();
  }

  reply = reply
    .split(/\s+(?=(?:draft|option|reply|candidate)\s*#?\d+\s*[:.)-]?\s)/i)[0]
    .replace(/^(?:draft|option|reply|candidate)\s*#?\d*\s*[:.)-]?\s*/i, "")
    .replace(/^\d+\s*[:.)-]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  return reply.slice(0, 240);
}

async function bgAuthedSupabaseFetch(url, options = {}) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token) throw new Error("Not signed in");

  const makeRequest = (jwt) =>
    fetch(url, {
      ...options,
      headers: {
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        ...(options.headers || {}),
      },
    });

  let res = await makeRequest(token);
  if (res.status === 401) {
    const refreshed = await bgRefreshAuthToken();
    if (!refreshed) throw new Error("Auth expired");
    token = refreshed;
    res = await makeRequest(token);
  }

  return { res, token, userId: stored.authUserId || null };
}

async function bgCallXAssistant(body) {
  const { res } = await bgAuthedSupabaseFetch(`${BG_API_BASE}/x-assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `x-assistant ${res.status}`);
  return data;
}

async function bgFindXTab() {
  return new Promise((resolve) => {
    chrome.tabs.query({ url: ["https://x.com/*", "https://twitter.com/*"] }, (tabs) => {
      const active = (tabs || []).find((tab) => tab.active);
      resolve(active || tabs?.[0] || null);
    });
  });
}

async function bgFocusTab(tab) {
  if (!tab?.id) return null;
  const updated = await new Promise((resolve) => {
    chrome.tabs.update(tab.id, { active: true }, (nextTab) => {
      resolve(chrome.runtime.lastError ? tab : (nextTab || tab));
    });
  });
  if (updated?.windowId != null) {
    await new Promise((resolve) => {
      chrome.windows.update(updated.windowId, { focused: true }, () => resolve());
    });
  }
  return updated;
}

async function bgOpenXHomeTab() {
  const existing = await bgFindXTab();
  if (existing?.id) {
    const focused = await bgFocusTab(existing);
    return new Promise((resolve) => {
      chrome.tabs.update(existing.id, { url: "https://x.com/home", active: true }, (tab) => {
        resolve(chrome.runtime.lastError ? focused : (tab || focused));
      });
    });
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.create({ url: "https://x.com/home", active: true }, (tab) => {
      if (chrome.runtime.lastError || !tab?.id) {
        reject(new Error(chrome.runtime.lastError?.message || "Could not open X."));
        return;
      }
      resolve(tab);
    });
  });
}

async function bgStartXAutomationOnX() {
  const tab = await bgOpenXHomeTab();
  if (!tab?.id) return { ok: false, error: "Could not open X." };
  chrome.storage.local.set({ activeTabId: tab.id });
  await bgWaitForTabReady(tab.id, 10000);
  await bgDelay(900);

  const result = await bgSendInlineUiMessage(tab.id, { action: "startXAutomation" });
  if (result?.ok) return result;
  return {
    ok: false,
    error: result?.error || "X opened, but Braino could not start automation on that tab yet.",
  };
}

async function bgRecordXAutomationRunStats({ repliedCount, durationMs, startedAt, finishedAt }) {
  const safeReplyCount = Math.max(0, Number(repliedCount) || 0);
  const safeDurationMs = Math.max(0, Number(durationMs) || 0);
  const authState = await new Promise((resolve) => chrome.storage.local.get(["authUserId"], resolve));
  const userId = authState.authUserId;
  if (!userId) throw new Error("No signed-in user");

  const selectUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats?user_id=eq.${encodeURIComponent(userId)}&select=id,total_replies,total_runs,total_runtime_ms&limit=1`;
  const { res: selectRes } = await bgAuthedSupabaseFetch(selectUrl, {
    headers: { "Content-Type": "application/json" },
  });
  if (!selectRes.ok) throw new Error(`Could not load X automation stats (${selectRes.status})`);

  const existingRows = await selectRes.json();
  const current = Array.isArray(existingRows) ? existingRows[0] : null;
  const payload = {
    user_id: userId,
    total_replies: (Number(current?.total_replies) || 0) + safeReplyCount,
    total_runs: (Number(current?.total_runs) || 0) + 1,
    total_runtime_ms: (Number(current?.total_runtime_ms) || 0) + safeDurationMs,
    last_run_reply_count: safeReplyCount,
    last_run_duration_ms: safeDurationMs,
    last_run_started_at: startedAt || null,
    last_run_finished_at: finishedAt || null,
  };

  if (current?.id) {
    const updateUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats?id=eq.${current.id}`;
    const { res: updateRes } = await bgAuthedSupabaseFetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (!updateRes.ok) throw new Error(`Could not update X automation stats (${updateRes.status})`);
    return;
  }

  const insertUrl = `${BG_SUPABASE_URL}/rest/v1/x_automation_stats`;
  const { res: insertRes } = await bgAuthedSupabaseFetch(insertUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!insertRes.ok) throw new Error(`Could not create X automation stats (${insertRes.status})`);
}

async function bgLogXReply({ postAuthorHandle, postAuthorDisplayName, postUrl, postText, ourReply, repliedAt }) {
  try {
    const storage = await new Promise(r => chrome.storage.local.get(['authUserId'], r));
    const userId = storage.authUserId;
    if (!userId) return;
    const url = `${BG_SUPABASE_URL}/rest/v1/x_auto_reply_logs`;
    await bgAuthedSupabaseFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        post_author_handle: postAuthorHandle || '',
        post_author_display_name: postAuthorDisplayName || '',
        post_url: postUrl || '',
        post_text: postText || '',
        our_reply: ourReply || '',
        replied_at: repliedAt || new Date().toISOString(),
      }),
    });
  } catch { /* fire-and-forget — never surface to caller */ }
}

function bgIsScriptableUrl(url) {
  if (!url) return false;
  return !url.startsWith("chrome://") &&
         !url.startsWith("chrome-extension://") &&
         !url.startsWith("about:") &&
         !url.startsWith("devtools://") &&
         !url.startsWith("edge://") &&
         !url.startsWith("https://chrome.google.com/webstore") &&
         !url.startsWith("https://chromewebstore.google.com");
}

// Pre-register the correct action popup for a tab so clicking the icon
// always does the right thing without waiting for onClicked to fire.
function bgSyncActionPopup(tabId, url) {
  const popup = bgIsScriptableUrl(url) ? "" : "braino-popup.html";
  chrome.action.setPopup({ tabId, popup });
}

async function bgGetActiveTabId() {
  return new Promise(resolve => {
    chrome.storage.local.get("activeTabId", ({ activeTabId }) => {
      // Verify stored tab is still valid and scriptable
      if (activeTabId) {
        chrome.tabs.get(activeTabId, (tab) => {
          if (!chrome.runtime.lastError && tab && bgIsScriptableUrl(tab.url)) {
            resolve(activeTabId);
            return;
          }
          // Stored tab is gone or not scriptable — find a real one
          bgFindScriptableTab(resolve);
        });
      } else {
        bgFindScriptableTab(resolve);
      }
    });
  });
}

function bgFindScriptableTab(resolve) {
  // First try the active tab in the last focused window
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    const tab = tabs.find(t => bgIsScriptableUrl(t.url));
    if (tab) { resolve(tab.id); return; }
    // Fallback: any scriptable tab in any window
    chrome.tabs.query({}, allTabs => {
      const fallback = allTabs.find(t => bgIsScriptableUrl(t.url));
      resolve(fallback?.id || null);
    });
  });
}

async function bgGetTabById(tabId) {
  if (!tabId) return null;
  return await new Promise((resolve) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        resolve(null);
        return;
      }
      resolve(tab);
    });
  });
}

async function bgActivateTab(tabId) {
  const tab = await bgGetTabById(tabId);
  if (!tab?.id) return null;
  await new Promise((resolve) => {
    chrome.windows.update(tab.windowId, { focused: true }, () => resolve());
  });
  await new Promise((resolve) => {
    chrome.tabs.update(tab.id, { active: true }, () => resolve());
  });
  chrome.storage.local.set({ activeTabId: tab.id });
  return tab;
}

async function bgCreateScriptableTab(url = "https://www.google.com") {
  return await new Promise((resolve) => {
    chrome.tabs.create({ url, active: true }, (tab) => {
      if (chrome.runtime.lastError || !tab) {
        resolve(null);
        return;
      }
      resolve(tab);
    });
  });
}

async function bgMaybeShowRecoveryHandoff(tabId, message, options = {}) {
  if (!tabId || !message) return;
  await bgSendInlineUiMessage(tabId, {
    action: "showBrainoRecovery",
    title: options.title || "Braino moved here",
    message,
  });
}

async function bgEnsureScriptableBrainoTab(preferredTabId, options = {}) {
  const activate = options.activate !== false;
  const createIfMissing = options.createIfMissing !== false;
  const handoffMessage = String(options.handoffMessage || "").trim();
  const createUrl = String(options.createUrl || "https://www.google.com").trim() || "https://www.google.com";

  const preferredTab = await bgGetTabById(preferredTabId);
  if (preferredTab?.id && bgIsScriptableUrl(preferredTab.url || "")) {
    if (activate) await bgActivateTab(preferredTab.id);
    return { tabId: preferredTab.id, moved: false, created: false, tab: preferredTab };
  }

  const fallbackTabId = await bgGetActiveTabId();
  if (fallbackTabId) {
    const fallbackTab = activate ? await bgActivateTab(fallbackTabId) : await bgGetTabById(fallbackTabId);
    if (fallbackTab?.id) {
      if (handoffMessage) {
        await bgMaybeShowRecoveryHandoff(fallbackTab.id, handoffMessage, options);
      }
      return { tabId: fallbackTab.id, moved: true, created: false, tab: fallbackTab };
    }
  }

  if (!createIfMissing) {
    return { tabId: null, moved: false, created: false, tab: null };
  }

  const createdTab = await bgCreateScriptableTab(createUrl);
  if (!createdTab?.id) {
    return { tabId: null, moved: false, created: false, tab: null };
  }
  await bgWaitForTabReady(createdTab.id, 8000);
  chrome.storage.local.set({ activeTabId: createdTab.id });
  if (handoffMessage) {
    await bgMaybeShowRecoveryHandoff(createdTab.id, handoffMessage, options);
  }
  return { tabId: createdTab.id, moved: true, created: true, tab: createdTab };
}

async function bgGetAgentPageContext(tabId) {
  const empty = { url: "", title: "", bodyText: "", interactiveEls: [] };
  if (!tabId) return empty;
  return new Promise(resolve => {
    function sendMsg(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "getAgentPageContext" }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(empty); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve(empty); return; }
            setTimeout(() => sendMsg(true), 250);
          });
        } else {
          resolve(res || empty);
        }
      });
    }
    sendMsg(false);
  });
}

async function bgGetSiteAdapterContext(tabId) {
  const empty = { site: "generic", url: "", title: "" };
  if (!tabId) return empty;

  return new Promise(resolve => {
    function sendMsg(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "getSiteAdapterContext" }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(empty); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve(empty); return; }
            setTimeout(() => sendMsg(true), 250);
          });
        } else {
          resolve(res || empty);
        }
      });
    }
    sendMsg(false);
  });
}

async function bgGetPageSnapshot(tabId) {
  if (!tabId) return null;
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        url: location.href,
        title: document.title,
        text: document.body?.innerText?.slice(0, 500) || ""
      })
    });
    return result?.result || null;
  } catch(e) { return null; }
}

async function bgExecuteAgentAction(tabId, actionObj) {
  if (!tabId) return { error: "No active tab" };

  if (actionObj.type === "navigate") {
    return new Promise(resolve => {
      chrome.tabs.update(tabId, { url: actionObj.url }, () => {
        if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
        else resolve({ success: true });
      });
    });
  }

  return new Promise(resolve => {
    function sendToContent(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "agentAction", ...actionObj }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve({ error: chrome.runtime.lastError.message }); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve({ error: chrome.runtime.lastError.message }); return; }
            setTimeout(() => sendToContent(true), 250);
          });
        } else {
          resolve(res || { error: "No response from content script" });
        }
      });
    }
    sendToContent(false);
  });
}

async function bgExecuteSiteAdapterAction(tabId, actionObj) {
  if (!tabId) return { error: "No active tab" };

  return new Promise(resolve => {
    function sendToContent(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "siteAdapterAction", ...actionObj }, res => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve({ error: chrome.runtime.lastError.message }); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve({ error: chrome.runtime.lastError.message }); return; }
            setTimeout(() => sendToContent(true), 250);
          });
        } else {
          resolve(res || { error: "No response from content script" });
        }
      });
    }
    sendToContent(false);
  });
}

async function bgWaitForTabReady(tabId, maxMs = 5000) {
  const start = Date.now();
  return new Promise(resolve => {
    function check() {
      chrome.tabs.get(tabId, tab => {
        if (chrome.runtime.lastError || !tab) return resolve();
        if (tab.status === "complete") return resolve();
        if (Date.now() - start > maxMs) return resolve();
        setTimeout(check, 200);
      });
    }
    setTimeout(check, 400);
  });
}

const BG_SNAPSHOT_ACTIONS = new Set(["navigate", "click", "selectOption", "pressKey"]);
const bgAgentTaskByTab = new Map();

// ── Hive mind: the delegate loop follows child tabs. A mid-task click that opens a NEW
// tab (Amazon loves target=_blank) used to strand the loop on the old tab while the real
// flow continued in the child. onCreated marks the child for adoption; the loop switches
// at its next safe point. Freshness-gated so a finished run can never adopt anything. ──
let bgDelegateRunInfo = null;   // { tabId, at } — refreshed every loop iteration
let bgDelegateAdoptTabId = null;
chrome.tabs.onCreated.addListener((tab) => {
  if (!bgDelegateRunInfo || !tab?.id || !tab.openerTabId) return;
  if (tab.openerTabId !== bgDelegateRunInfo.tabId) return;
  if (Date.now() - bgDelegateRunInfo.at > 30000) return;
  bgDelegateAdoptTabId = tab.id;
  // Seed the child's task mapping NOW so its freshly injected content script's boot
  // handshake (sbAgentBootQuery) finds the run before the loop formally adopts the tab.
  const parentTask = bgAgentTaskByTab.get(tab.openerTabId);
  if (parentTask) bgAgentTaskByTab.set(tab.id, parentTask);
});
const bgActiveDelegateRunsByTab = new Map();
// Same task claimed GLOBALLY, not just per tab — delegate runs move/create tabs, so a re-fired
// task landed on a different tabId and slipped past the per-tab claim (the N-identical-tabs bug).
const bgActiveDelegateRunsByTask = new Map();
// URLs opened via the openTab message recently — lets a duplicate request reuse the tab.
const bgRecentOpenedTabs = new Map();

function bgDelegateTaskKey(task) {
  return String(task || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function bgTryClaimDelegateRun(tabId, task) {
  const key = bgDelegateTaskKey(task);
  if (!tabId || !key) return { ok: true, token: `${Date.now()}:${Math.random()}` };
  const active = bgActiveDelegateRunsByTab.get(tabId);
  if (active?.key === key && Date.now() - active.startedAt < 120000) {
    return { ok: false, duplicate: true, token: active.token };
  }
  const activeTask = bgActiveDelegateRunsByTask.get(key);
  if (activeTask && Date.now() - activeTask.startedAt < 120000) {
    return { ok: false, duplicate: true, token: activeTask.token };
  }
  const token = `${Date.now()}:${Math.random()}`;
  bgActiveDelegateRunsByTab.set(tabId, { key, startedAt: Date.now(), token });
  bgActiveDelegateRunsByTask.set(key, { startedAt: Date.now(), token });
  return { ok: true, token };
}

function bgReleaseDelegateRun(tabId, token) {
  const active = bgActiveDelegateRunsByTab.get(tabId);
  if (active?.token === token) bgActiveDelegateRunsByTab.delete(tabId);
  for (const [key, entry] of bgActiveDelegateRunsByTask) {
    if (entry.token === token) bgActiveDelegateRunsByTask.delete(key);
  }
}

function bgBrainUpdate(tabId, text, final = false, opts = {}) {
  void bgSendInlineUiMessage(tabId, {
    action: "sbAgentUpdate",
    text,
    final,
    speakHint: opts.speakHint || null,
    task: opts.task || bgAgentTaskByTab.get(tabId) || "",
    keepLectureCard: opts.keepLectureCard === true,
  });
  if (final) setTimeout(() => bgAgentTaskByTab.delete(tabId), 5000);
}

async function bgSendInlineUiMessage(tabId, message) {
  if (!tabId) return null;
  return new Promise((resolve) => {
    function send(retrying) {
      chrome.tabs.sendMessage(tabId, message, (res) => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(null); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve(null); return; }
            setTimeout(() => send(true), 250);
          });
        } else {
          resolve(res || null);
        }
      });
    }
    send(false);
  });
}

async function bgBuildSpotifyUiState(tabId, base = {}) {
  const siteContext = await bgGetSiteAdapterContext(tabId);
  return {
    active: true,
    source: "spotify",
    intent: String(base.intent || "").trim(),
    query: String(base.query || "").trim(),
    currentPlaylistName: String(siteContext?.currentPlaylistName || "").trim(),
    searchResults: Array.isArray(siteContext?.visibleTrackDetails) ? siteContext.visibleTrackDetails.slice(0, 6) : [],
    nowPlaying: siteContext?.nowPlaying || null,
    summary: String(base.summary || "").trim(),
  };
}

function bgPushSpotifyState(tabId, state, options = {}) {
  void bgSendInlineUiMessage(tabId, {
    action: "sbSpotifyState",
    state,
    openCard: !!options.openCard,
    focusSpotify: !!options.focusSpotify,
  });
}

async function bgSaveAgentTask(tabId, task, result) {
  try {
    const stored = await new Promise(r => chrome.storage.local.get(["authToken"], r));
    if (!stored.authToken) return;
    let sourceUrl = "", sourceTitle = "";
    try {
      const tab = await new Promise(r => chrome.tabs.get(tabId, r));
      sourceUrl = tab?.url || "";
      sourceTitle = tab?.title || "";
    } catch (_) {}
    await fetch(`${BG_API_BASE}/save-note`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.authToken}`,
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        action: "save",
        session_id: crypto.randomUUID(),
        title: task.length > 120 ? task.slice(0, 117) + "…" : task,
        transcript: task,
        structured_notes: result || "Task completed.",
        source_url: sourceUrl,
        source_title: sourceTitle,
        use_case: "agent",
      }),
    });
  } catch (_) {}
}

// ── Delegate closed-loop agent (index + assertion based) ─────────────────────

const BG_DELEGATE_BUDGET = { maxSteps: 40, maxMs: 120000, maxLLMUsd: 0.50 };
const BG_DELEGATE_LONG_TASK_BUDGET = { maxSteps: 120, maxMs: 600000, maxLLMUsd: 3.00 };
const BG_DELEGATE_TARGETED_ACTIONS = new Set(["click", "type", "selectOption", "downloadImage"]);
const BG_DELEGATE_ACTIONS = new Set([
  "navigate",
  "click",
  "type",
  "pressKey",
  "selectOption",
  "read",
  "scroll",
  "wait",
  "downloadImage",
  "web_search",
  "done",
  "answer",
  "clarify",
]);

function bgLooksLikeLongDelegateTask(task) {
  const raw = String(task || "").toLowerCase();
  if (!raw) return false;
  const longWork = /\b(research|write|draft|create|make|compose|article|report|brief|document|google\s+docs?|google\s+documents?|docs?|linkedin|jobs?|postings?|compare|summari[sz]e|analy[sz]e)\b/.test(raw);
  const multiStep = /\b(and then|then|after that|put it|turn it into|create|write|draft|read\s+(?:at least\s+)?\d+|read\s+(?:several|multiple|many)|best fit|google\s+doc|google\s+document)\b/.test(raw);
  return Boolean(longWork && multiStep);
}

function bgDelegateBudgetForTask(task) {
  return bgLooksLikeLongDelegateTask(task)
    ? { ...BG_DELEGATE_LONG_TASK_BUDGET }
    : { ...BG_DELEGATE_BUDGET };
}

function bgSafeJson(value) {
  try { return JSON.stringify(value); } catch (_) { return "null"; }
}

function bgExtractJsonObject(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("Empty model response");
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : text;
  try { return JSON.parse(candidate); } catch (_) {}
  const objectMatch = candidate.match(/\{[\s\S]*\}/);
  if (!objectMatch) throw new Error("No JSON object found");
  return JSON.parse(objectMatch[0]);
}

function bgValidateAssertion(expect) {
  const assertion = expect || { assert: "none" };
  const allowed = new Set(["element_exists", "element_gone", "url_contains", "value_equals", "text_present", "none"]);
  if (!allowed.has(assertion.assert)) throw new Error(`Invalid assertion: ${assertion.assert}`);
  if ((assertion.assert === "element_exists" || assertion.assert === "element_gone") && (!assertion.match || typeof assertion.match !== "object")) {
    throw new Error(`${assertion.assert} requires match`);
  }
  if (assertion.assert === "url_contains" && typeof assertion.value !== "string") throw new Error("url_contains requires value");
  if (assertion.assert === "value_equals" && !Number.isInteger(Number(assertion.index))) throw new Error("value_equals requires index");
  if (assertion.assert === "text_present" && typeof assertion.value !== "string") throw new Error("text_present requires value");
  return assertion;
}

function bgValidateDecision(rawDecision) {
  const decision = rawDecision && typeof rawDecision === "object" ? rawDecision : {};
  const action = decision.action && typeof decision.action === "object" ? decision.action : null;
  if (!action || !BG_DELEGATE_ACTIONS.has(action.type)) throw new Error("Decision must contain one valid action");
  BrainoRecovery?.validateNoSelectorAction?.(action);
  for (const key of ["selector", "targetText", "targetTag"]) {
    if (Object.prototype.hasOwnProperty.call(action, key) || Object.prototype.hasOwnProperty.call(decision, key)) {
      throw new Error(`Selectors are forbidden in Delegate actions: ${key}`);
    }
  }
  if (BG_DELEGATE_TARGETED_ACTIONS.has(action.type) && !Number.isInteger(Number(action.index))) {
    throw new Error(`${action.type} requires numeric index`);
  }
  if (action.type === "navigate" && !/^https?:\/\//i.test(String(action.url || ""))) throw new Error("navigate requires http(s) url");
  if (action.type === "type" && typeof action.text !== "string") throw new Error("type requires text");
  if (action.type === "pressKey" && typeof action.key !== "string") throw new Error("pressKey requires key");
  if (action.type === "selectOption" && typeof action.value !== "string") throw new Error("selectOption requires value");
  if (action.type === "scroll" && !["up", "down"].includes(action.direction)) throw new Error("scroll requires direction up/down");
  if (action.type === "wait") action.ms = Math.max(0, Math.min(5000, Number(action.ms || 1000)));
  if (action.type === "downloadImage" && !["png", "jpeg", "webp"].includes(action.format)) throw new Error("downloadImage requires png/jpeg/webp");
  if (action.type === "web_search" && typeof action.query !== "string") throw new Error("web_search requires query");
  if (action.type === "answer" || action.type === "clarify") {
    action.text = String(action.text || action.message || "").trim();
    if (!action.text) throw new Error(`${action.type} requires text`);
  }
  return {
    thought: String(decision.thought || "").slice(0, 400),
    memory_update: decision.memory_update && typeof decision.memory_update === "object" ? decision.memory_update : undefined,
    action,
    expect: bgValidateAssertion(decision.expect || { assert: "none" }),
    done_confidence: Math.max(0, Math.min(1, Number(decision.done_confidence || 0))),
  };
}

function bgDelegateClarifyDecision(message, thought = "The model response was not valid Delegate JSON.") {
  return bgValidateDecision({
    thought,
    action: {
      type: "clarify",
      text: message || "I had trouble reading the next browser step. Please say the task again or give me one more detail to continue.",
    },
    expect: { assert: "none" },
    done_confidence: 0,
  });
}

async function bgCallDelegateModel({ systemPrompt, userPrompt, model, validationError }) {
  const message = validationError
    ? `${userPrompt}\n\nYour previous JSON failed validation: ${validationError}\nReturn corrected strict JSON only.`
    : userPrompt;
  const response = await bgChatFetch({
    notes: systemPrompt,
    message,
    aiProvider: "openai",
    delegateModel: model,
    delegatePurpose: "delegate",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Delegate model failed: ${response.status}`);
  }
  const data = await response.json();
  return String(data.reply || data.response || "").trim();
}

function bgDelegateTodayText() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ── User geo/locale context — no permission prompts. Timezone comes from Intl (the SW
// runs on the user's machine), coarse city/country from one cached IP lookup per day.
// Powers local storefronts (amazon.in vs amazon.com), local-time answers, "where am I".
let bgUserGeoCache = null;
async function bgGetUserGeo() {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  if (bgUserGeoCache && Date.now() - bgUserGeoCache.fetchedAt < 24 * 3600 * 1000) return bgUserGeoCache;
  try {
    const stored = await chrome.storage.local.get("sbUserGeo");
    if (stored?.sbUserGeo?.fetchedAt && Date.now() - stored.sbUserGeo.fetchedAt < 24 * 3600 * 1000) {
      bgUserGeoCache = stored.sbUserGeo;
      return bgUserGeoCache;
    }
  } catch (_) {}
  let geo = { country: "", countryCode: "", city: "", region: "", timeZone, fetchedAt: Date.now() };
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const j = await res.json();
      geo = {
        country: j.country_name || "",
        countryCode: String(j.country_code || "").toUpperCase(),
        city: j.city || "",
        region: j.region || "",
        timeZone: j.timezone || timeZone,
        fetchedAt: Date.now(),
      };
    }
  } catch (_) {}
  bgUserGeoCache = geo;
  try { chrome.storage.local.set({ sbUserGeo: geo }); } catch (_) {}
  return geo;
}
function bgUserContextLine(geo) {
  const now = new Date().toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const place = [geo?.city, geo?.region, geo?.country].filter(Boolean).join(", ");
  return `User's local time: ${now}${geo?.timeZone ? ` (${geo.timeZone})` : ""}${place ? `. User's location: ${place}` : ""}.`;
}
const BG_AMAZON_TLD_BY_COUNTRY = {
  IN: "amazon.in", US: "amazon.com", GB: "amazon.co.uk", UK: "amazon.co.uk", DE: "amazon.de",
  FR: "amazon.fr", IT: "amazon.it", ES: "amazon.es", CA: "amazon.ca", JP: "amazon.co.jp",
  AU: "amazon.com.au", BR: "amazon.com.br", MX: "amazon.com.mx", NL: "amazon.nl", AE: "amazon.ae", SG: "amazon.sg",
};
// Deterministic storefront swap: a task/nav that names another country's Amazon gets the
// user's local domain (amazon.com → amazon.in for an India user).
function bgLocalizeStorefront(url, geo) {
  try {
    const u = new URL(String(url));
    const host = u.hostname.replace(/^www\./, "");
    const local = BG_AMAZON_TLD_BY_COUNTRY[geo?.countryCode || ""];
    if (local && /^amazon\.[a-z.]+$/.test(host) && host !== local) {
      u.hostname = "www." + local;
      return u.toString();
    }
  } catch (_) {}
  return String(url);
}

function bgSelectDelegateSkillsHeuristic(task) {
  const raw = String(task || "").toLowerCase();
  const skills = [];
  if (/\b(calendar|meeting|meet|call|event|schedule|reschedule|cancel|invite|forward)\b/.test(raw)) skills.push("google-calendar");
  if (/\b(maps?|directions?|route|near me|nearby|nearest|closest|restaurant|cafe|place|places|eta|distance|theat(?:er|re)s?|movie\s+theat(?:er|re)s?|cinemas?)\b/.test(raw)) skills.push("google-maps");
  if (/\b(linkedin|jobs?|roles?|openings?|sdet|developer|engineer)\b/.test(raw)) skills.push("linkedin-jobs");
  if (/\b(twitter|x\b|tweet|post|publish|followers?|mentions?)\b/.test(raw)) skills.push("x-growth-posting");
  if (/\b(cost|spend|receipt|realtime|voice)\b/.test(raw)) skills.push("realtime-costs");
  if (/\b(youtube|video|videos|watch|reaction)\b/.test(raw)) skills.push("youtube");
  // Shopping: Amazon by name, or a buy/purchase ask with no other store named (Amazon is
  // the default store). "order" alone is excluded — too food-delivery shaped.
  if (/\b(amazon|add to cart|checkout)\b/.test(raw)
    || (/\b(buy|purchase)\b/.test(raw) && !/\b(swiggy|zomato|uber\s*eats|doordash|instamart|blinkit|flipkart|food)\b/.test(raw))) skills.push("amazon-shopping");
  return [...new Set(skills)].slice(0, 3);
}

function bgDelegateSkillGuide(skill, task) {
  if (skill === "linkedin-jobs") return `
SKILL linkedin-jobs:
- Navigate to LinkedIn Jobs search for the requested role/location.
- If a login wall appears, stop and ask the user to log in.
- Read the visible result list first, then inspect 3-5 relevant job postings.
- Store title, company, location, link, short description, key requirements, and Strong/Maybe/Weak fit facts.
- Never apply, save, message, connect, or click Easy Apply without explicit confirmation.
- Assertions: after search, expect job/result text; after opening a posting, expect detail text or a job title; after read, expect none.`;
  if (skill === "google-maps") return `
SKILL google-maps:
- Open Google Maps visibly for search or directions unless the user explicitly says not to.
- For "near me", "nearest", "closest", "my house", "home", or "where I am", assume the user's current/home context. Use a Maps query with "near me" or "My Location"; do not ask where they are.
- Inspect visible results before recommending; do not invent ratings, hours, ETA, or open status.
- For recommendations, return 3-5 visible options and one best pick.
- For phone handoff, ask which result to send unless the user already selected exactly one.
- Assertions: after Maps navigation, expect URL/text containing maps or visible result/location text.`;
  if (skill === "google-calendar") return `
SKILL google-calendar:
- Use visible Calendar pages for create/edit flows when the user asked to book or create an event.
- Resolve relative dates using today: ${bgDelegateTodayText()}.
- Do not invent attendee emails. If only a name is provided, create without invite or ask for an email.
- Cancel, reschedule, forward, invite, and send-update operations are destructive and require confirmation.
- Assertions: after opening create form, expect title/event fields; after saving, expect visible saved event text.`;
  if (skill === "x-growth-posting") return `
SKILL x-growth-posting:
- Draft first. Never post, schedule, or publish until the user confirms the visible draft.
- Keep X posts under 280 characters and preserve the user's saved voice if available.
- Posting is destructive; click Post/Tweet only after confirmation.
- Assertions: after compose, expect textbox/post field; after draft typing, expect typed value or visible text.`;
  if (skill === "realtime-costs") return `
SKILL realtime-costs:
- Answer from stored Braino realtime cost data when available.
- Use exact dates for today/last 7 days. Do not invent costs.
- Usually this should answer rather than operate the browser.`;
  if (skill === "youtube") return `
SKILL youtube:
- Search by typing into the search combobox and submitting; the results URL contains /results.
- RESULTS PAGE — the critical distinction: an element named ONLY a channel name (e.g. "Tanmay Bhat") is a CHANNEL card. Clicking it opens the channel page, NEVER a video. To PLAY something, click a link whose name is a full video TITLE (long text, usually with views/age/duration). If you land on a channel page (URL has /@handle) more than once, STOP clicking channel-named elements — go back to results and open a titled video row.
- WATCH PAGE (URL contains /watch): playback AUTOSTARTS. Do not hunt for a "Play" button. Assert url_contains "watch", and for a play task that IS completion — return done.
- Never re-run the same search while its results are already visible.`;
  if (skill === "amazon-shopping") return `
SKILL amazon-shopping (guided buying — the user stays in the loop):
- DOMAIN: always use the user's LOCAL Amazon (see the user-context line: India → amazon.in, US → amazon.com). If you find yourself on another country's Amazon, navigate to the local one first.
- PREREQUISITE: the user must already be signed in. If the header shows "Hello, sign in" or a Sign in prompt, STOP with {"type":"clarify","text":"You're not signed in to Amazon, so I can't shop for you yet. Sign in and ask me again."}. NEVER type credentials, even if they appear in context.
- CONTINUATION FIRST: if the current page already shows the requested product (product page or cart), do NOT re-search or re-open Amazon — continue from where the page is. On a product page, the next step is Add to Cart; in the cart, the next step is Proceed to Buy.
- BUY FLOW per product: Amazon search box → open the matching product → click "Add to Cart" → dismiss protection-plan/add-on popups ("No Thanks") → only after ALL requested products are in the cart: open the cart ("Go to Cart" / cart icon) → click "Proceed to Buy" / "Proceed to checkout".
- SEARCH ONCE: use the provided search query exactly one time. If the product is visible in the results, open it; if not, scroll once, then clarify. NEVER re-run reworded variations of the same search — a second near-identical query is forbidden.
- Amazon re-renders after every click. After each click take {"type":"wait","ms":1000}, then re-read before acting again.
- AMBIGUITY = ASK: if results show several plausible matches (editions, formats, bundles, sellers), scroll down ~600 once so options are visible, then {"type":"clarify","text":"Which one from this page do you want me to add to cart? I can see <top 2-3 options with price>."}. Never guess between editions. The user's next command continues the run on this same page.
- MULTIPLE PRODUCTS ("buy X and Y"): strictly sequential — search X, add to cart, then search Y, add to cart. Go to cart only after all items are added.
- PAYMENT BOUNDARY: never enter or select payment details, addresses, or place the final order. Advance to the payment-method step (open the UPI/QR view if offered) and finish with {"type":"answer","text":"Checkout is ready — finish the payment on your screen."}.
- done only when the observed page proves the requested stage: item visibly in cart, or the checkout/payment page reached.`;
  return "";
}

// The missing layer: turn a natural-language request into a real search PLAN — a concise
// keyword query (what + where) + the surface to search + soft constraints to apply to the
// RESULTS (not stuffed into the query). This is why "restaurants that serve dosa in the
// morning in Mumbai" used to get dumped verbatim into Maps. Fail-open (returns null).
async function bgSynthesizeIntent(task, sharedContext, pageInfo = null) {
  const raw = String(task || "").trim();
  if (!raw) return null;
  try {
    const systemPrompt = [
      "You convert a user's natural-language request into a clean search plan for a browser agent.",
      "Return STRICT JSON only, no prose, no markdown:",
      '{"resolvedTask":"the request rewritten as ONE self-contained instruction naming concrete targets","surface":"maps|web|none","searchQuery":"concise keyword query a savvy user would actually type","softConstraints":["preference to apply when RANKING results"],"directions":{"origin":"","destination":""}}',
      "Rules:",
      "- resolvedTask is the MOST IMPORTANT field. Vague mid-conversation asks (\"play this song\", \"show me that book on Amazon\", \"search that up\", \"buy it for me\") MUST be rewritten with the real entity taken from CONTEXT (e.g. 'Play the song Levitating by Dua Lipa on Spotify', 'Show the book The Subtle Art of Not Giving a F*ck by Mark Manson on Amazon'). Keep the user's verb and target site; never invent an entity the context does not support. If the request is already self-contained, return it unchanged. Never leave an unresolved 'this/that/it' in resolvedTask when CONTEXT names the referent.",
      "- If CURRENT PAGE already shows the thing the user is referring to (e.g. they're on the product page and say 'buy it'), resolvedTask must say to CONTINUE on the current page rather than re-open or re-search (e.g. 'On the currently open Amazon page for <product>, add it to cart and proceed to checkout'). This applies ONLY when the current page genuinely matches the request (right site AND right content). If the current page is unrelated to the ask (e.g. a dashboard is open and they ask to buy something on Amazon), do NOT anchor to it — resolvedTask must direct the agent to the right site (e.g. 'Go to amazon.com, search for <product>, and buy it').",
      "- NEVER echo the user's full sentence. Extract entities: what + where. No filler, no question words, no 'restaurants that serve' phrasing — just keywords (e.g. 'dosa restaurants Mumbai', 'chicken biryani Bandra').",
      "- surface=maps for places/restaurants/cafes/shops/directions/near-me; surface=web for general info/products/facts/how-to; surface=none if it's not a search at all.",
      "- searchQuery must name the RESOLVED entity too, never the pronoun ('The Subtle Art of Not Giving a F*ck book', not 'that book').",
      "- searchQuery is what gets typed INTO a site's own search box. NEVER include the site name, 'Amazon', 'India', or any storefront/country words in it ('Atomic Habits book' — NOT 'Atomic Habits Amazon India'). The storefront choice belongs in resolvedTask only.",
      "- Put time/price/quality/vibe/'good'/'best'/'open in the morning' into softConstraints, NOT into searchQuery — those are applied by reading and ranking the results.",
      "- Keep searchQuery short (2-6 words typically). Keep the location if the user named one; if they said near me/home, set softConstraints accordingly and keep 'near me' wording in the query.",
      "- For a DIRECTIONS/route/navigate request, fill directions.origin and directions.destination as separate places (e.g. 'from Laburnum Park, Pune to Malad West, Mumbai' → origin='Laburnum Park, Pune', destination='Malad West, Mumbai'). If the user gives only a destination, leave origin empty (current location). Otherwise leave both empty.",
      "- Sites with country storefronts (Amazon etc.): resolvedTask must name the USER's local domain from USER CONTEXT (India → amazon.in, US → amazon.com, UK → amazon.co.uk), even if the user said 'amazon.com'.",
      "- PLAY requests — pick the surface by CONTENT TYPE, not by the currently open site: videos/reactions/vlogs/trailers/episodes/interviews → YouTube (resolvedTask names youtube.com), songs/tracks/albums/playlists/music → Spotify. 'Play Tanmay Bhat reaction videos' while ON Spotify still goes to YouTube.",
    ].join("\n");
    const geo = await bgGetUserGeo().catch(() => null);
    const userPrompt = [
      `REQUEST: ${raw}`,
      pageInfo?.url ? `CURRENT PAGE: ${pageInfo.url}${pageInfo.title ? ` — ${pageInfo.title}` : ""}` : null,
      `USER CONTEXT: ${bgUserContextLine(geo)}`,
      `CONTEXT: ${bgBuildAgentConversationText(sharedContext || {}) || "None."}`,
      "Return the JSON now.",
    ].filter(Boolean).join("\n\n");
    const reply = await bgCallDelegateModel({
      systemPrompt,
      userPrompt,
      model: BrainoModels?.MODELS?.STEP || "gpt-5.4-mini",
    });
    const p = bgExtractJsonObject(reply);
    // Deterministic scrub: a trailing "on amazon india"-style storefront tag in the query
    // gets typed into the site's own search box and wrecks results. Strip it always
    // (only the TRAILING form — "amazon rainforest facts" stays untouched).
    const searchQuery = String(p.searchQuery || "").trim()
      .replace(/\s+(?:on\s+)?(?:amazon|flipkart|ebay)(?:\.[a-z.]{2,6})?(?:\s+(?:india|usa?|uk|germany|japan))?\s*$/i, "")
      .trim();
    const resolvedTask = String(p.resolvedTask || "").trim().slice(0, 300);
    if (!searchQuery && !resolvedTask) return null;
    const surface = ["maps", "web", "none"].includes(p.surface) ? p.surface : "web";
    const softConstraints = Array.isArray(p.softConstraints)
      ? p.softConstraints.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 5)
      : [];
    const dir = p.directions && typeof p.directions === "object" ? p.directions : {};
    const directions = {
      origin: String(dir.origin || "").trim(),
      destination: String(dir.destination || "").trim(),
    };
    return { surface, searchQuery, softConstraints, directions, resolvedTask };
  } catch (error) {
    console.warn("[Braino][Delegate] intent synth fallback:", error?.message || error);
    return null;
  }
}

async function bgDecomposeDelegateTask(task, sharedContext, tabId, onProgress, options = {}) {
  const fallbackSkills = bgSelectDelegateSkillsHeuristic(task);
  const fallback = {
    goal: task,
    subgoals: [{ id: "1", desc: task, status: "active" }],
    skills: fallbackSkills,
  };
  try {
    // Initial decompose stays on the FAST model (same speed as before). Re-planning
    // (options.strong) — a rare event when the agent is stuck — uses the stronger brain.
    const isReplan = Boolean(options.strong);
    onProgress?.(isReplan ? "Rethinking the plan..." : "Understanding the task...");
    const model = isReplan
      ? (BrainoModels?.MODELS?.STRATEGIST || "gpt-5.4")
      : (BrainoModels?.MODELS?.STEP || "gpt-5.4-mini");
    const stalledContext = isReplan && options.state
      ? [
          "The previous plan STALLED. Current run state:",
          BrainoTaskState.renderTaskState(options.state),
          "Produce a REVISED set of subgoals that avoids the stuck step and tries a genuinely different approach.",
        ].join("\n")
      : "";
    const prompt = [
      "Return strict JSON only.",
      "Shape: {\"goal\":\"...\",\"subgoals\":[{\"id\":\"1\",\"desc\":\"...\",\"status\":\"active|pending\",\"doneWhen\":\"observable postcondition\"}],\"skills\":[\"google-calendar|google-maps|linkedin-jobs|realtime-costs|x-growth-posting|amazon-shopping|youtube\"]}",
      "Every subgoal MUST include doneWhen: a postcondition CHECKABLE from the live page — a URL fragment ('URL contains /watch'), visible text, or a visible element. Never a feeling ('video is playing' → 'URL contains /watch').",
      "Choose only skills that are relevant. Do not include selectors or CSS.",
      `Task: ${task}`,
      `Context:\n${bgBuildAgentConversationText(sharedContext || {}) || "None."}`,
      stalledContext,
    ].filter(Boolean).join("\n\n");
    const reply = await bgCallDelegateModel({
      systemPrompt: "You decompose browser tasks for Braino Delegate. Return strict JSON only.",
      userPrompt: prompt,
      model,
    });
    const parsed = bgExtractJsonObject(reply);
    const skills = Array.isArray(parsed.skills) ? parsed.skills.filter((skill) => fallbackSkills.includes(skill) || [
      "google-calendar",
      "google-maps",
      "linkedin-jobs",
      "realtime-costs",
      "x-growth-posting",
      "amazon-shopping",
      "youtube",
    ].includes(skill)) : fallbackSkills;
    return {
      goal: String(parsed.goal || task).trim() || task,
      subgoals: BrainoTaskState.normalizeSubgoals(parsed.subgoals, task),
      skills: [...new Set(skills)].slice(0, 3),
    };
  } catch (error) {
    console.warn("[Braino][Delegate] decompose fallback:", error?.message || error);
    return fallback;
  }
}

function bgBuildDelegateSystemPrompt(skills, lessons, geo = null) {
  const skillText = (skills || []).map((skill) => bgDelegateSkillGuide(skill)).filter(Boolean).join("\n\n");
  const lessonList = Array.isArray(lessons) ? lessons.filter(Boolean).slice(0, 8) : [];
  const lessonText = lessonList.length
    ? `\nLEARNED FROM PAST RUNS ON THIS SITE (apply if relevant):\n${lessonList.map((l) => `- ${l}`).join("\n")}\n`
    : "";
  return `You are Braino Delegate, a closed-loop browser agent.
Return ONLY strict JSON. No prose. No markdown fences.

Decision shape:
{"thought":"your ACTUAL thinking, 1-2 complete first-person sentences","memory_update":{"facts":[{"key":"...","value":"..."}],"current_subgoal":"...","subgoal_complete":false},"action":ACTION,"expect":ASSERTION,"done_confidence":0}

Actions:
{"type":"navigate","url":"https://..."}
{"type":"click","index":1}
{"type":"type","index":1,"text":"...","submit":false}
{"type":"pressKey","key":"Enter"}
{"type":"selectOption","index":1,"value":"..."}
{"type":"read","index":1}
{"type":"read"}
{"type":"scroll","direction":"down","amount":600}
{"type":"wait","ms":1000}
{"type":"downloadImage","index":1,"format":"png"}
{"type":"web_search","query":"..."}
{"type":"done"}
{"type":"answer","text":"..."}
{"type":"clarify","text":"..."}

Assertions:
{"assert":"element_exists","match":{"role":"textbox","name":"To"}}
{"assert":"element_gone","match":{"role":"button","name":"Loading"}}
{"assert":"url_contains","value":"calendar"}
{"assert":"value_equals","index":1,"value":"..."}
{"assert":"text_present","value":"..."}
{"assert":"none"}

Rules:
- thought is YOUR live reasoning, shown to the user while you work. Write complete first-person sentences that connect what you see, what the user wants, and why this next action — like "The user wants the hardcover and I can see Add to Cart, so I'll click it." Never telegraphic fragments ("search box. type query."), never third person.
- Return exactly one action per turn.
- Never output selector, targetText, targetTag, XPath, or CSS. Target live elements only by index.
- Use the observation as ground truth. If the needed element is absent, scroll, wait, read, or clarify.
- Every non-read/browser action needs an assertion that can be checked against the next observation.
- Do not claim done until the task is complete in observed state.
- If recent history shows the same action was repeated or skipped, change tactic immediately. Do not repeat the same subgoal wording with punctuation-only changes.
- INFORMATIONAL tasks (find / show / list / look up / recommend / "what/which/where" + info, restaurants, places, products, facts): the goal is to REPORT, not to keep browsing. The moment the observation already shows usable results, take {"type":"read"} to capture them and then immediately return {"type":"answer","text":"<the findings: top picks with the key details>"}. This finishes the task.
- Do NOT run another web_search or navigate to a "broader"/reworded query once usable results are already visible — one good search is enough. A second nearly-identical query is forbidden; read what you already have and answer.
- Prefer {"type":"answer"} to finish informational tasks. Reserve {"type":"done"} for ACTION tasks (send / book / buy / save / submit) where the live page itself proves completion. Never loop trying to "prove" an informational task is done — answering IS done.
- If the user explicitly asked to send an email, click Send when the draft is correctly addressed and written. Do not ask for another confirmation.
- For other high-risk final actions not clearly requested by the user, clarify before acting.
- For local place tasks (nearest theater, restaurants near me, directions from home), do not ask for the user's location. Open Google Maps using "near me" or "My Location", read the visible results once, and answer with the top options — do not keep re-searching.
- Today is ${bgDelegateTodayText()}. ${geo ? bgUserContextLine(geo) : ""}
- Use the user's LOCAL storefront for country-specific sites: ${geo?.countryCode && BG_AMAZON_TLD_BY_COUNTRY[geo.countryCode] ? `Amazon = ${BG_AMAZON_TLD_BY_COUNTRY[geo.countryCode]}` : "match the Amazon domain to the user's location"}. If you land on another country's storefront, navigate to the local one.

Useful URL shortcuts:
- Gmail inbox: https://mail.google.com/mail/u/0/#inbox
- Gmail compose with prefill: https://mail.google.com/mail/?view=cm&to=TO&su=SUBJECT&body=BODY
- Google Calendar create event: https://calendar.google.com/calendar/r/eventedit?text=TITLE&dates=YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS
- LinkedIn Jobs: https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY
- Google Maps search: https://www.google.com/maps/search/QUERY
- Google Maps directions: https://www.google.com/maps/dir/ORIGIN/DESTINATION
${lessonText}
${skillText}`;
}

async function bgDecideNextAction({ task, state, observationText, skills, lessons, phase, stuckCount, validationError }) {
  const model = BrainoModels?.pickModel?.(phase || "step", stuckCount || 0) || "gpt-5.4-mini";
  const decideGeo = await bgGetUserGeo().catch(() => null);
  const systemPrompt = bgBuildDelegateSystemPrompt(skills, lessons, decideGeo);
  const synth = state?.synth || null;
  // Once searches have run, the hint lists them so the model doesn't repeat one — while
  // keeping the canonical query available for any REMAINING search (a multi-site task
  // still needs it) and saying plainly that fresh searches stay allowed. A blanket
  // "searching is forbidden" here once stranded a run that still had to reach Amazon.
  const priorSearches = Array.isArray(state?.searchesDone) ? state.searchesDone : [];
  const userPrompt = [
    `TASK: ${task}`,
    synth?.searchQuery
      ? (priorSearches.length
        ? `Searches already run this task: ${priorSearches.map((s) => `"${s.query}" on ${s.host}`).join("; ")}. Do not repeat any of them. For any REMAINING search this task needs, use the query "${synth.searchQuery}" on the right site — fresh sites and different products are fine. If you are already on the right product page, act on it (e.g. Add to Cart) instead of searching.`
        : `WHEN SEARCHING: use the query "${synth.searchQuery}" — do NOT paste the user's sentence. One good search is enough.`)
      : null,
    synth?.softConstraints?.length ? `APPLY THESE PREFERENCES by reading and RANKING the results (not by adding them to the query): ${synth.softConstraints.join("; ")}.` : null,
    (() => {
      const active = (state?.subgoals || []).find((g) => g.status === "active");
      return active?.doneWhen ? `ACTIVE SUBGOAL IS DONE WHEN: ${active.doneWhen} — check the observation against THIS, not your impression.` : null;
    })(),
    "STATE:",
    BrainoTaskState.renderTaskState(state),
    "OBSERVATION:",
    observationText || "(empty observation)",
    "Return the next Decision JSON now.",
  ].filter(Boolean).join("\n\n");
  let reply = await bgCallDelegateModel({ systemPrompt, userPrompt, model, validationError });
  try {
    return { decision: bgValidateDecision(bgExtractJsonObject(reply)), model };
  } catch (firstError) {
    try {
      reply = await bgCallDelegateModel({ systemPrompt, userPrompt, model, validationError: firstError.message || String(firstError) });
      return { decision: bgValidateDecision(bgExtractJsonObject(reply)), model };
    } catch (secondError) {
      console.warn("[Braino][Delegate] decision JSON fallback:", {
        firstError: firstError?.message || String(firstError),
        secondError: secondError?.message || String(secondError),
        replyPreview: String(reply || "").slice(0, 240),
      });
      return {
        decision: bgDelegateClarifyDecision(
          "I hit a malformed model response while choosing the next browser step. Please retry the command; I will keep the page state and continue from the live DOM.",
        ),
        model,
      };
    }
  }
}

// Lowercased, whitespace-collapsed string match used to compare element identity.
function bgNormalizeForMatch(value) {
  return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

// B1 — metacognition: before accepting a "done", confirm against the LIVE page with the
// stronger model. Fail-open (returns complete:true on any error) so a genuinely-finished
// task is never trapped, and the caller caps how many times this can run.
async function bgVerifyDelegateDone({ task, state, tabId }) {
  try {
    const obs = await bgBuildElementObservation(tabId, task);
    const systemPrompt =
      "You verify whether a browser task is TRULY complete from the live page. " +
      "Return ONLY strict JSON: {\"complete\":true|false,\"reason\":\"short\"}. " +
      "Be strict: complete=true only if the observed page proves the goal was achieved " +
      "(e.g. the email shows as sent, the event shows as saved, the requested data is visible). " +
      "If it merely looks ready but not done, return false. No prose, no markdown.";
    const doneContracts = (state?.subgoals || []).filter((g) => g.doneWhen).map((g) => `- ${g.desc}: ${g.doneWhen}`).join("\n");
    const userPrompt = [
      `TASK: ${task}`,
      doneContracts ? `COMPLETION CONTRACTS (each subgoal counts as done only when its check holds):\n${doneContracts}` : null,
      "STATE:",
      BrainoTaskState.renderTaskState(state),
      "OBSERVATION:",
      obs.serialized || "(empty observation)",
      "Is the task complete in the observed state? Strict JSON only.",
    ].filter(Boolean).join("\n\n");
    const reply = await bgCallDelegateModel({
      systemPrompt,
      userPrompt,
      model: BrainoModels?.MODELS?.STRATEGIST || "gpt-5.4",
    });
    const parsed = bgExtractJsonObject(reply);
    return { complete: parsed?.complete !== false, reason: String(parsed?.reason || "").slice(0, 200) };
  } catch (_) {
    return { complete: true, reason: "verifier unavailable" };
  }
}

// C1 — reflection memory: after a run, extract 1-3 durable, site-specific lessons and persist
// them per-origin so future runs start smarter. Best-effort and fire-and-forget; never blocks
// the user's result.
async function bgReflectAndStoreLessons({ task, state, origin, outcome }) {
  try {
    if (!origin || origin === "unknown" || !BrainoMacroStore?.recordLessons) return;
    const systemPrompt =
      "You extract durable lessons for a browser agent from one task attempt on a website. " +
      "Return ONLY strict JSON: {\"lessons\":[\"short imperative tip\"]}. " +
      "0-3 concise, REUSABLE, site-specific tips (navigation quirks, where a control lives, a modal/banner that appears, a faster path). " +
      "No secrets, no one-off values (names, emails, dates), no prose, no markdown.";
    const userPrompt = [
      `SITE: ${origin}`,
      `TASK: ${task}`,
      `OUTCOME: ${outcome || "unknown"}`,
      "RUN STATE:",
      BrainoTaskState.renderTaskState(state),
      "Return strict JSON only.",
    ].join("\n\n");
    const reply = await bgCallDelegateModel({
      systemPrompt,
      userPrompt,
      model: BrainoModels?.MODELS?.STRATEGIST || "gpt-5.4",
    });
    const parsed = bgExtractJsonObject(reply);
    const lessons = Array.isArray(parsed?.lessons) ? parsed.lessons : [];
    if (lessons.length) await BrainoMacroStore.recordLessons(origin, lessons);
  } catch (_) {
    // reflection is best-effort; ignore failures
  }
}

async function bgBuildElementObservation(tabId, keywords = "") {
  const empty = {
    map: { url: "", title: "", scroll: { x: 0, y: 0, maxX: 0, maxY: 0, atTop: true, atBottom: true }, elements: [] },
    serialized: "",
  };
  if (!tabId) return empty;
  return new Promise((resolve) => {
    function send(retrying) {
      chrome.tabs.sendMessage(tabId, { action: "buildElementMap", keywords, cap: 120 }, (res) => {
        if (chrome.runtime.lastError) {
          if (retrying) { resolve(empty); return; }
          chrome.scripting.executeScript({ target: { tabId }, files: BG_CONTENT_SCRIPT_FILES }, () => {
            if (chrome.runtime.lastError) { resolve(empty); return; }
            setTimeout(() => send(true), 250);
          });
          return;
        }
        resolve(res || empty);
      });
    }
    send(false);
  });
}

function bgDescribeDelegateAction(action, obs) {
  if (!action) return "Working";
  if (action.type === "click" || action.type === "type" || action.type === "selectOption" || action.type === "downloadImage" || action.type === "read") {
    const el = obs?.elements?.find((item) => Number(item.index) === Number(action.index));
    const label = el?.name || el?.role || `#${action.index}`;
    if (action.type === "type") return `Type into ${label}`;
    if (action.type === "selectOption") return `Select ${action.value} in ${label}`;
    if (action.type === "downloadImage") return `Download image ${label}`;
    if (action.type === "read") return `Read ${label}`;
    return `Click ${label}`;
  }
  if (action.type === "navigate") return `Open ${action.url}`;
  if (action.type === "web_search") return `Search the web for ${action.query}`;
  if (action.type === "scroll") return `Scroll ${action.direction}`;
  if (action.type === "wait") return `Wait ${action.ms || 1000}ms`;
  return action.type;
}

function bgCanonicalDelegateUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch (_) {
    return raw.replace(/#.*$/, "").replace(/\/$/, "");
  }
}

function bgIsRepeatedDelegateNavigate(action, state, obs) {
  if (action?.type !== "navigate") return false;
  const target = bgCanonicalDelegateUrl(action.url);
  if (!target) return false;
  const current = bgCanonicalDelegateUrl(obs?.url || "");
  if (current && current === target) return true;
  return state.history.slice(-5).some((item) => item?.ok && item?.action?.type === "navigate" && bgCanonicalDelegateUrl(item.action.url) === target);
}

function bgDelegateActionFingerprint(action) {
  if (!action?.type) return "";
  const type = String(action.type);
  if (type === "navigate") return `${type}:${bgCanonicalDelegateUrl(action.url)}`;
  if (type === "web_search") return `${type}:${String(action.query || "").toLowerCase().replace(/\s+/g, " ").trim()}`;
  if (type === "click" || type === "downloadImage") return `${type}:${Number(action.index)}`;
  if (type === "type") return `${type}:${Number(action.index)}:${String(action.text || "").slice(0, 120)}`;
  if (type === "selectOption") return `${type}:${Number(action.index)}:${String(action.value || "").toLowerCase()}`;
  if (type === "pressKey") return `${type}:${String(action.key || "").toLowerCase()}`;
  if (type === "scroll") return `${type}:${String(action.direction || "")}`;
  if (type === "wait") return `${type}:${Math.round(Number(action.ms || 1000) / 500) * 500}`;
  if (type === "read") return `${type}:${Number.isInteger(Number(action.index)) ? Number(action.index) : "main"}`;
  return type;
}

function bgIsRepeatedDelegateAction(action, state) {
  const fingerprint = bgDelegateActionFingerprint(action);
  if (!fingerprint || ["done", "answer", "clarify"].includes(action?.type)) return false;
  const recent = state.history.slice(action?.type === "scroll" || action?.type === "wait" || action?.type === "read" ? -5 : -3);
  const repeats = recent.filter((item) => bgDelegateActionFingerprint(item?.action) === fingerprint);
  const limit = action?.type === "scroll" || action?.type === "wait" || action?.type === "read" ? 4 : 2;
  return repeats.length >= limit;
}

async function bgExecuteDelegateAction(tabId, action, state) {
  if (action.type === "web_search") {
    const searchData = await bgPerformRealWebSearch(action.query, { purpose: "delegate" });
    const resultsText = searchData.results
      ? searchData.results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join("\n\n")
      : searchData.error || "No results.";
    const text = searchData.answer ? `${searchData.answer}\n\n${resultsText}` : resultsText;
    state.facts.push({ key: `web_search:${action.query}`.slice(0, 80), value: text.slice(0, 2000), source: "web_search" });
    return { success: !searchData.error, text, error: searchData.error || null };
  }
  if (action.type === "wait") {
    await bgDelay(Math.max(0, Math.min(5000, Number(action.ms || 1000))));
    return { success: true };
  }
  const result = await bgExecuteAgentAction(tabId, action);
  if (!result?.error && action.type === "navigate") {
    await bgWaitForTabReady(tabId, 8000);
    await bgDelay(700);
  } else if (!result?.error && ["click", "type", "selectOption", "pressKey", "scroll"].includes(action.type)) {
    await bgDelay(450);
  }
  if (action.type === "read" && result?.text) {
    state.facts.push({ key: `read:${state.facts.length + 1}`, value: String(result.text).slice(0, 2000), source: "page" });
  }
  return result || { error: "No response from action execution" };
}

async function bgReadMany(targets, options = {}) {
  const urls = (Array.isArray(targets) ? targets : [])
    .map((target) => typeof target === "string" ? target : target?.url)
    .map((url) => String(url || "").trim())
    .filter((url) => /^https?:\/\//i.test(url))
    .slice(0, Math.max(1, Number(options.limit || 5)));
  if (!urls.length) return [];
  const concurrency = Math.max(1, Math.min(3, Number(options.concurrency || 3)));
  const originalTabId = options.focusTabId || await bgGetActiveTabId();
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      let tab = null;
      try {
        tab = await new Promise((resolve) => chrome.tabs.create({ url, active: false }, resolve));
        if (!tab?.id) throw new Error("Could not open background tab");
        await bgWaitForTabReady(tab.id, 10000);
        await new Promise((resolve) => {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: BG_CONTENT_SCRIPT_FILES }, () => resolve());
        });
        const obs = await bgBuildElementObservation(tab.id, options.keywords || "");
        const read = await bgExecuteAgentAction(tab.id, { type: "read" });
        const text = String(read?.text || obs.serialized || "").slice(0, Number(options.maxChars || 3500));
        results.push({ url, ok: !read?.error, text, title: obs.map?.title || "" });
        if (options.state && text) {
          options.state.facts.push({ key: `read_many:${results.length}`, value: `${url}\n${text}`.slice(0, 2200), source: "readMany" });
        }
      } catch (error) {
        results.push({ url, ok: false, error: error?.message || String(error) });
      } finally {
        if (tab?.id) {
          try { await chrome.tabs.remove(tab.id); } catch (_) {}
        }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  if (originalTabId) {
    try { await chrome.tabs.update(originalTabId, { active: true }); } catch (_) {}
  }
  return results;
}

async function bgApplyDelegateRecovery({ tabId, errorInfo, state, onProgress }) {
  const type = errorInfo?.type || "UNKNOWN";
  if (type === "AUTH_WALL") {
    return { terminal: true, message: "I hit a login wall. Please log in on this page, then ask me to continue." };
  }
  if (type === "CAPTCHA") {
    return { terminal: true, message: "I hit a human verification step. I will not try to solve it; please take over from here." };
  }
  if (type === "RATE_LIMIT") {
    onProgress?.("Rate limited. Waiting briefly...");
    await bgDelay(1500);
    state.stuckCount += 1;
    return { terminal: false };
  }
  if (type === "ELEMENT_NOT_FOUND" || type === "STALE_ELEMENT") {
    // Reasoning-based recovery: instead of a blind scroll, record a precise failure analysis
    // as a fact and escalate. The next decision (now on the stronger model, since stuckCount
    // crosses the escalation threshold) reasons over this and picks a DIFFERENT approach.
    onProgress?.("That step didn't land — rethinking the approach...");
    state.facts.push({
      key: `recovery:${state.facts.length + 1}`,
      value: `Last action failed (${type}): ${errorInfo?.detail || "target not found"}. The element may have moved, be off-screen, or the chosen index was wrong. Try a DIFFERENT element, scroll to reveal it, or read the page first — do not repeat the same action.`,
      source: "recovery",
    });
    state.facts = state.facts.slice(-30);
    state.stuckCount += 1;
    return { terminal: false };
  }
  if (type === "NAV_TIMEOUT") {
    onProgress?.("Waiting for navigation to settle...");
    await bgDelay(2000);
    state.stuckCount += 1;
    return { terminal: false };
  }
  // Unknown / assertion failures: surface the reason so the escalated next step can adapt.
  if (errorInfo?.detail) {
    state.facts.push({
      key: `recovery:${state.facts.length + 1}`,
      value: `Last step failed (${type}): ${errorInfo.detail}. Change tactic on the next step.`,
      source: "recovery",
    });
    state.facts = state.facts.slice(-30);
  }
  state.stuckCount += 1;
  return { terminal: false };
}

async function bgRunMacroReplay({ tabId, task, state, macro, origin, onProgress }) {
  if (!macro?.steps?.length) return { ok: false, reason: "No macro steps" };
  onProgress?.("Replaying learned shortcut...");
  let obs = (await bgBuildElementObservation(tabId, task)).map;
  const filledSteps = BrainoMacroStore.fillMacro(macro, task, obs);
  for (let i = 0; i < filledSteps.length; i++) {
    const step = filledSteps[i];
    if (BG_DELEGATE_TARGETED_ACTIONS.has(step.action.type) && !Number.isInteger(Number(step.action.index))) {
      await BrainoMacroStore.demote(macro.key);
      return { ok: false, reason: "Macro target could not be resolved" };
    }
    onProgress?.(`Replay: ${bgDescribeDelegateAction(step.action, obs)}`);
    const decision = { action: step.action, expect: step.expect || { assert: "none" }, thought: "Replay macro" };
    const result = await bgExecuteDelegateAction(tabId, step.action, state);
    const newObs = (await bgBuildElementObservation(tabId, task)).map;
    const verdict = BrainoRecovery.verifyAssertion(step.expect || { assert: "none" }, newObs);
    BrainoTaskState.commitHistory(state, decision, result, verdict);
    if (result?.error || !verdict.ok) {
      await BrainoMacroStore.demote(macro.key);
      return { ok: false, reason: result?.error || verdict.reason || "Macro checkpoint failed", obs: newObs };
    }
    obs = newObs;
  }
  return { ok: true, message: "Done.", origin };
}

// Record "this search executed" when a URL proves its results page is up. The mark lives
// in state.searchesDone (never evicted — the facts list caps at 30 and was scrolling
// marks out on long runs) plus a copy in facts for model visibility. Idempotent.
function bgRecordSearchDone(state, url) {
  if (typeof BrainoSearchGuard === "undefined" || !BrainoSearchGuard || !state) return;
  if (!Array.isArray(state.searchesDone)) state.searchesDone = [];
  const mark = BrainoSearchGuard.shouldMark({
    newUrl: url,
    synthQuery: state.synth?.searchQuery,
    searchesDone: state.searchesDone,
  });
  if (!mark) return;
  state.searchesDone.push(mark);
  state.facts.push({ key: `search_done:${mark.host}`, value: mark.query, source: "runtime" });
  state.facts = state.facts.slice(-30);
}

async function bgRunDelegateLoop({ tabId, task, connectorHint, sharedContext = {}, onProgress, onFinal, shouldStop, skipFastPath = false, synth: passedSynth = null }) {
  let currentTabId = tabId;
  bgDelegateRunInfo = { tabId: currentTabId, at: Date.now() };
  bgDelegateAdoptTabId = null;
  const startedAt = Date.now();
  const budget = bgDelegateBudgetForTask(task);
  let llmUsd = 0;
  let prevObs = null;
  let verifyCount = 0;
  let replanCount = 0;
  const observationSnapshots = [];
  const initialObs = await bgBuildElementObservation(currentTabId, task);
  const origin = BrainoMacroStore?.originFromUrl?.(initialObs.map.url) || "unknown";
  // C1 — load durable lessons learned on this site in past runs (local storage, instant).
  let lessons = await (BrainoMacroStore?.getLessons?.(origin) || Promise.resolve([])).catch(() => []);
  const state = BrainoTaskState.createTaskState(task, currentTabId);
  // Un-evictable record of executed searches ({host, query}) — the facts list caps at 30
  // entries and long runs were scrolling search_done marks out, silently re-arming repeats.
  state.searchesDone = [];
  const macro = await BrainoMacroStore.lookup(task, origin);
  if (macro) {
    const replay = await bgRunMacroReplay({ tabId: currentTabId, task, state, macro, origin, onProgress });
    if (replay.ok) {
      onFinal?.(replay.message || "Done.");
      return { ok: true, message: replay.message || "Done.", state, macroReplay: true };
    }
    onProgress?.("Shortcut drifted. Falling back to live page reading...");
    prevObs = replay.obs || prevObs;
  }

  // Understand intent → form a real search query + constraints BEFORE any search runs,
  // so we never paste the user's sentence verbatim into Maps/web. Reuse the one the caller
  // already computed (bgRunBrainAgent does it before its fast path) so it isn't called twice.
  const synth = passedSynth
    || await bgSynthesizeIntent(task, sharedContext, { url: initialObs.map?.url, title: initialObs.map?.title }).catch(() => null);
  state.synth = synth;
  // Vague mid-conversation asks ("play this song", "buy that book") arrive as the literal
  // utterance; synthesis resolves the referent from chat context. From here on, the
  // RESOLVED task is the task — decomposition, every per-step decision, and done-verification
  // all steer by the concrete target instead of a pronoun.
  if (synth?.resolvedTask && bgNormalizeForMatch(synth.resolvedTask) !== bgNormalizeForMatch(task)) {
    task = synth.resolvedTask;
    onProgress?.(`Understood: ${task}`);
  }
  if (!passedSynth && synth?.searchQuery) onProgress?.(`Searching for "${synth.searchQuery}"`);

  const decomp = await bgDecomposeDelegateTask(task, sharedContext, currentTabId, onProgress);
  state.goal = decomp.goal || task;
  BrainoTaskState.setSubgoals(state, decomp.subgoals);
  await bgSendInlineUiMessage(currentTabId, { action: "SB_SUBGOAL_UPDATE", subgoals: state.subgoals });
  // Console trace: run header → the tab's DevTools console (the user copies these to
  // debug reasoning gaps — same playbook as the voice-latency logging). The meta ALSO
  // rides on every per-step trace: the run often starts on tab A and navigates away,
  // and the destination page's fresh content script never saw the header.
  const traceMeta = {
    task,
    searchQuery: synth?.searchQuery || "",
    goal: state.goal,
    subgoals: (state.subgoals || []).map((g) => g.desc),
    skills: decomp.skills || [],
  };
  bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_RUN_META", meta: traceMeta });
  // First thought lands the moment the plan exists — the island should never sit on
  // "Getting started…" while the first per-step decision (~2-4s) is still coming.
  if (state.subgoals?.length) {
    const planLine = state.subgoals.map((g) => g.desc).join(", then ");
    bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_THOUGHT", thought: `Here's my plan: ${planLine}.` });
  }

  const fastActions = skipFastPath ? null : bgTryFastPath(task, [], synth, await bgGetUserGeo().catch(() => null));
  if (fastActions?.length) {
    for (const fast of fastActions) {
      onProgress?.(fast.description || bgDescribeDelegateAction(fast, prevObs));
      const result = await bgExecuteDelegateAction(currentTabId, fast, state);
      const newObs = (await bgBuildElementObservation(currentTabId, task)).map;
      const expect = fast.type === "navigate" ? { assert: "url_contains", value: new URL(fast.url).hostname.replace(/^www\./, "") } : { assert: "none" };
      const verdict = BrainoRecovery.verifyAssertion(expect, newObs);
      BrainoTaskState.commitHistory(state, { action: fast, expect, thought: "Fast path" }, result, verdict);
      prevObs = newObs;
      if (result?.error) break;
      if (!fast.continueAfter) {
        const msg = "Done.";
        onFinal?.(msg);
        return { ok: true, message: msg, state };
      }
    }
  }

  for (let step = 0; step < budget.maxSteps; step++) {
    bgDelegateRunInfo = { tabId: currentTabId, at: Date.now() };
    if (bgAgentShouldStop || (shouldStop && await shouldStop())) {
      const msg = "Task stopped.";
      onFinal?.(msg);
      return { ok: false, message: msg, state };
    }
    if (!BrainoModels.withinBudget(budget, { steps: step, elapsedMs: Date.now() - startedAt, llmUsd })) {
      const minutes = Math.max(1, Math.round(budget.maxMs / 60000));
      const msg = `I hit Delegate's safety budget (${budget.maxSteps} steps / about ${minutes} min) before finishing. I stopped instead of looping blindly.`;
      onFinal?.(msg);
      return { ok: false, message: msg, state };
    }

    // B2 — adaptive re-planning: when genuinely stuck, revise the whole plan with the stronger
    // model instead of grinding the original one. Rare and capped, so the hot path stays fast.
    if (state.stuckCount >= 3 && replanCount < 2) {
      replanCount += 1;
      const replan = await bgDecomposeDelegateTask(task, sharedContext, currentTabId, onProgress, { strong: true, state });
      llmUsd += BrainoModels?.estimateModelCost?.(BrainoModels?.MODELS?.STRATEGIST) || 0.02;
      if (replan?.subgoals?.length) {
        BrainoTaskState.setSubgoals(state, replan.subgoals);
        if (Array.isArray(replan.skills) && replan.skills.length) {
          decomp.skills = [...new Set([...(decomp.skills || []), ...replan.skills])].slice(0, 3);
        }
        state.stuckCount = 1; // give the revised plan a fresh chance without dropping escalation entirely
        await bgSendInlineUiMessage(currentTabId, { action: "SB_SUBGOAL_UPDATE", subgoals: state.subgoals });
      }
    }

    const activeKeywords = state.subgoals.find((goal) => goal.status === "active")?.desc || task;
    const obsResult = await bgBuildElementObservation(currentTabId, activeKeywords);
    let obs = obsResult.map;
    // The results page may have finished loading AFTER the previous step's re-observe
    // (typing + Enter navigates on a race the fixed 450ms delay loses) — every iteration
    // starts by checking whether the CURRENT page proves a search executed, BEFORE the
    // decision is made, so the model's search hint is never one step stale. Idempotent.
    bgRecordSearchDone(state, obs?.url);
    const obsPayload = prevObs && BrainoElementMap?.diffElementMap
      ? BrainoElementMap.diffElementMap(prevObs, obs, { keywords: activeKeywords })   // Change B: anchor stable controls
      : (obsResult.serialized || BrainoElementMap.serializeElementMap(obs, { keywords: activeKeywords }));
    let decision;
    let model;
    try {
      const picked = await bgDecideNextAction({
        task,
        state,
        observationText: obsPayload,
        skills: decomp.skills,
        lessons,
        phase: state.stuckCount >= 2 ? "escalate" : "step",
        stuckCount: state.stuckCount,
      });
      decision = picked.decision;
      model = picked.model;
      llmUsd += BrainoModels?.estimateModelCost?.(model) || 0.002;
    } catch (error) {
      const msg = `Delegate model error: ${error?.message || error}`;
      onFinal?.(msg);
      return { ok: false, message: msg, state };
    }

    // Stream the model's reasoning into the bar's island BEFORE the action runs —
    // think, then act, and the user watches both.
    const stepThought = String(decision?.thought || "").trim();
    if (stepThought) bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_THOUGHT", thought: stepThought });

    BrainoTaskState.mergeMemoryUpdate(state, decision.memory_update, "model");
    await bgSendInlineUiMessage(currentTabId, { action: "SB_SUBGOAL_UPDATE", subgoals: state.subgoals });

    const action = decision.action;
    if (action.type === "done") {
      // B1 — metacognition: confirm completion against the live page before claiming success.
      // Capped at 2 checks; fail-open so a genuinely-finished task is never trapped.
      if (verifyCount < 2) {
        verifyCount += 1;
        onProgress?.("Double-checking the result...");
        const verify = await bgVerifyDelegateDone({ task, state, tabId: currentTabId });
        llmUsd += BrainoModels?.estimateModelCost?.(BrainoModels?.MODELS?.STRATEGIST) || 0.02;
        bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_TRACE", meta: traceMeta, trace: {
          step: step + 1,
          thought: String(decision?.thought || "").trim(),
          action: "verify done (self-check)",
          actionRaw: "{}",
          result: verify && verify.complete === false ? `verifier says NOT done: ${String(verify?.reason || "").slice(0, 160)}` : "verifier confirms done",
          verdict: verify && verify.complete === false ? "rejected" : "ok",
          url: "",
        } });
        if (verify && verify.complete === false) {
          const note = `Self-check: not done yet — ${verify.reason || "the page does not yet prove the task is complete"}.`;
          state.facts.push({ key: `self_check:${state.facts.length + 1}`, value: note, source: "verifier" });
          state.facts = state.facts.slice(-30);
          BrainoTaskState.commitHistory(state, decision, { success: false, skipped: true, note }, { ok: false, reason: note });
          onProgress?.("Not done yet — continuing...");
          prevObs = (await bgBuildElementObservation(currentTabId, task)).map;
          continue;
        }
      }
      BrainoTaskState.markActiveSubgoalDone(state);
      await BrainoMacroStore.record(state, origin, observationSnapshots).catch(() => null);
      bgReflectAndStoreLessons({ task, state, origin, outcome: "success" }); // fire-and-forget; never blocks
      const msg = "Done.";
      onFinal?.(msg);
      return { ok: true, message: msg, state };
    }
    if (action.type === "answer" || action.type === "clarify") {
      const msg = action.text || "I need more information to continue.";
      onFinal?.(msg);
      return { ok: action.type === "answer", message: msg, state };
    }
    if (bgIsRepeatedDelegateNavigate(action, state, obs)) {
      const note = `Already at ${action.url}; skipped repeated navigation.`;
      state.facts.push({ key: `navigation_skipped:${state.facts.length + 1}`, value: note, source: "runtime" });
      BrainoTaskState.commitHistory(state, decision, { success: true, skipped: true, note }, { ok: false, reason: note });
      onProgress?.("Already on that page; reading current state instead...");
      prevObs = obs;
      continue;
    }
    if (bgIsRepeatedDelegateAction(action, state)) {
      const note = `Repeated ${action.type} without clear progress; forcing a different tactic.`;
      state.facts.push({ key: `loop_guard:${state.facts.length + 1}`, value: note, source: "runtime" });
      state.facts = state.facts.slice(-30);
      state.stuckCount = Math.max(state.stuckCount, 2);
      BrainoTaskState.commitHistory(state, decision, { error: note, skipped: true }, { ok: false, reason: note });
      await bgSendInlineUiMessage(currentTabId, { action: "SB_SUBGOAL_UPDATE", subgoals: state.subgoals });
      onProgress?.("I noticed a repeated step, so I’m switching tactics...");
      prevObs = obs;
      continue;
    }
    // Search cap: an informational task should search once, read the results, and answer.
    // After 2 searches, stop searching — force a read so the next turn has content to answer from.
    const isSearchAction = action.type === "web_search"
      || (action.type === "navigate" && /\/(maps\/)?search[/?]|[?&](q|query)=/i.test(String(action.url || "")));
    if (isSearchAction) {
      state.searchCount = (state.searchCount || 0) + 1;
      if (state.searchCount > 2) {
        const note = "Enough searching — usable results are available. Read what's on the page and ANSWER with the top options instead of searching again.";
        state.facts.push({ key: `search_cap:${state.facts.length + 1}`, value: note, source: "runtime" });
        state.facts = state.facts.slice(-30);
        BrainoTaskState.commitHistory(state, decision, { success: false, skipped: true, note }, { ok: false, reason: note });
        onProgress?.("Enough searching — reading the results to answer...");
        await bgExecuteDelegateAction(currentTabId, { type: "read" }, state).catch(() => {});
        prevObs = (await bgBuildElementObservation(currentTabId, task)).map;
        continue;
      }
    }
    // D2 — staleness guard: a targeted action's index came from an observation that is now
    // 2-5s old (model latency), during which the page may have shifted. Re-read and confirm
    // the target still has the same role+name before acting, so we never click the wrong row.
    // (Re-observing is cheap vs the model call, so the hot path stays fast; it also realigns
    // the content-script registry that execution resolves against.)
    if (BG_DELEGATE_TARGETED_ACTIONS.has(action.type)) {
      const intended = (obs.elements || []).find((el) => Number(el.index) === Number(action.index));
      const fresh = (await bgBuildElementObservation(currentTabId, task)).map;
      const current = (fresh.elements || []).find((el) => Number(el.index) === Number(action.index));
      const sameRole = intended && current && bgNormalizeForMatch(intended.role) === bgNormalizeForMatch(current.role);
      const n1 = bgNormalizeForMatch(intended?.name);
      const n2 = bgNormalizeForMatch(current?.name);
      // Lenient on name (dynamic labels/counters shouldn't false-trip); strict on role + identity.
      const sameName = n1 === n2 || (!!n1 && !!n2 && (n1.includes(n2) || n2.includes(n1)));
      const sameTarget = Boolean(intended && current && sameRole && sameName);
      if (!sameTarget) {
        const note = `The page shifted before I could act on element [${action.index}] (${intended?.role || "?"} "${(intended?.name || "").slice(0, 60)}"). Re-reading and re-deciding instead of clicking the wrong thing.`;
        state.facts.push({ key: `stale_guard:${state.facts.length + 1}`, value: note, source: "runtime" });
        state.facts = state.facts.slice(-30);
        BrainoTaskState.commitHistory(state, decision, { success: false, skipped: true, note }, { ok: false, reason: note });
        onProgress?.("Page shifted — re-reading before acting...");
        prevObs = fresh;
        continue;
      }
      obs = fresh; // act against the confirmed-fresh observation (matches the content registry)
    }

    // ── Redundant-search guard: pure logic in lib/searchGuard.js (unit-tested in
    // tests/search-guard.test.mjs). Blocks ONLY: re-typing the query while on that
    // thing's product page, or the identical query re-run on a site whose results
    // already loaded. Navigation and everything else always passes. ──
    const guardVerdict = (typeof BrainoSearchGuard !== "undefined" && BrainoSearchGuard)
      ? BrainoSearchGuard.evaluate({ action, pageUrl: obs?.url, synthQuery: state.synth?.searchQuery, searchesDone: state.searchesDone })
      : { blocked: false };
    if (guardVerdict.blocked) {
      state.facts.push({ key: `redundant_search_guard:${state.facts.length + 1}`, value: guardVerdict.note, source: "runtime" });
      state.facts = state.facts.slice(-30);
      BrainoTaskState.commitHistory(state, decision, { success: false, skipped: true, note: guardVerdict.note }, { ok: false, reason: guardVerdict.note });
      bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_TRACE", meta: traceMeta, trace: {
        step: step + 1,
        thought: String(decision?.thought || "").trim(),
        action: bgDescribeDelegateAction(action, obs) || action.type,
        actionRaw: JSON.stringify({ type: action.type }),
        result: `skipped by search guard: ${guardVerdict.note.slice(0, 160)}`,
        verdict: "skipped",
        url: String(obs?.url || "").slice(0, 160),
      } });
      onProgress?.("Already there — skipping a repeat search...");
      prevObs = obs;
      continue;
    }

    observationSnapshots.push(obs);
    onProgress?.(bgDescribeDelegateAction(action, obs));
    const result = await bgExecuteDelegateAction(currentTabId, action, state);
    if (bgDelegateAdoptTabId && bgDelegateAdoptTabId !== currentTabId) {
      // The click spawned a child tab — the task lives there now. Adoption beats the
      // active-tab check below (a background-opened child is NOT the active tab yet).
      const adopted = bgDelegateAdoptTabId;
      bgDelegateAdoptTabId = null;
      onProgress?.("Following the new tab...");
      try { chrome.tabs.update(adopted, { active: true }); } catch (_) {}
      await bgWaitForTabReady(adopted, 8000);
      currentTabId = adopted;
      state.focusTabId = currentTabId;
      bgAgentTaskByTab.set(currentTabId, task);
      chrome.storage.local.set({ activeTabId: currentTabId });
      bgDelegateRunInfo = { tabId: currentTabId, at: Date.now() };
    } else {
      const latestActiveTabId = await bgGetActiveTabId();
      if (latestActiveTabId && latestActiveTabId !== currentTabId) {
        currentTabId = latestActiveTabId;
        state.focusTabId = currentTabId;
        bgAgentTaskByTab.set(currentTabId, task);
        chrome.storage.local.set({ activeTabId: currentTabId });
      }
    }
    const newObs = (await bgBuildElementObservation(currentTabId, task)).map;
    // Post-action check too (the per-iteration check at the loop top catches races that
    // resolve later): a search is done ONLY when its results page is actually up.
    if (!result?.error) bgRecordSearchDone(state, newObs?.url);
    // Subgoal-stagnation escalation: action success is not progress. If the ACTIVE
    // subgoal hasn't advanced in 8 steps, force the existing replan machinery — the
    // 118s YouTube loop never tripped stuckCount because every click "succeeded".
    {
      const activeGoal = state.subgoals.find((g) => g.status === "active");
      const streakId = activeGoal ? activeGoal.id : "";
      state.subgoalStreak = (state.subgoalStreak && state.subgoalStreak.id === streakId)
        ? { id: streakId, n: state.subgoalStreak.n + 1 }
        : { id: streakId, n: 1 };
      if (activeGoal && (state.subgoalStreak.n === 8 || state.subgoalStreak.n === 14)) {
        state.stuckCount = Math.max(state.stuckCount || 0, 3);   // triggers strong-model replan
        state.facts.push({
          key: `stalled_subgoal:${streakId}:${state.subgoalStreak.n}`,
          value: `Subgoal "${activeGoal.desc}" has not advanced in ${state.subgoalStreak.n} steps even though individual actions succeeded. Progress is measured by the GOAL, not by clicks. Replan or finish with what you already have.`,
          source: "runtime",
        });
        state.facts = state.facts.slice(-30);
        onProgress?.("This subgoal is stalled — rethinking the plan...");
      }
    }

    // Going-in-circles detector: every click can "succeed" while the run ping-pongs
    // between the same two pages (results ↔ channel, 9 visits in one real trace) —
    // action success is not goal progress. Third landing on the same URL = say so.
    try {
      const cu = new URL(String(newObs?.url || ""));
      const cKey = cu.host + cu.pathname;
      state.urlVisits = state.urlVisits || {};
      state.urlVisits[cKey] = (state.urlVisits[cKey] || 0) + 1;
      if (state.urlVisits[cKey] === 3) {
        state.facts.push({
          key: `going_in_circles:${cKey.slice(0, 60)}`,
          value: `You have now landed on ${cKey} 3 times this run — you are going in circles. Change tactic decisively: open a FULL-TITLED item instead of a repeated generic element, or finish with answer/clarify using what you already have.`,
          source: "runtime",
        });
        state.facts = state.facts.slice(-30);
      }
    } catch (_) {}
    const verdict = BrainoRecovery.verifyAssertion(decision.expect || { assert: "none" }, newObs);
    BrainoTaskState.commitHistory(state, decision, result, verdict);
    bgSendInlineUiMessage(currentTabId, { action: "SB_AGENT_TRACE", meta: traceMeta, trace: {
      step: step + 1,
      thought: stepThought,
      action: String(bgDescribeDelegateAction(action, obs) || action.type).replace(/\s*#undefined\b/, " (page)"),
      actionRaw: JSON.stringify({ type: action.type, index: action.index, url: action.url, text: action.text, query: action.query }),
      result: result?.error ? `error: ${String(result.error).slice(0, 200)}` : "ok",
      verdict: verdict?.ok ? "ok" : `failed: ${String(verdict?.reason || "").slice(0, 200)}`,
      url: String(newObs?.url || "").slice(0, 160),
    } });
    await bgSendInlineUiMessage(currentTabId, { action: "SB_SUBGOAL_UPDATE", subgoals: state.subgoals });

    if (!result?.error && verdict.ok) {
      prevObs = newObs;
      continue;
    }

    const errorInfo = BrainoRecovery.classifyError(result, verdict, newObs);
    const recovery = await bgApplyDelegateRecovery({ tabId: currentTabId, errorInfo, state, onProgress });
    if (recovery.terminal) {
      bgReflectAndStoreLessons({ task, state, origin, outcome: `stopped: ${errorInfo?.type || "blocked"}` }); // fire-and-forget
      onFinal?.(recovery.message);
      return { ok: false, message: recovery.message, state, errorInfo };
    }
    prevObs = newObs;
  }

  bgReflectAndStoreLessons({ task, state, origin, outcome: "hit step limit" }); // fire-and-forget
  const msg = `I reached the Delegate step limit (${budget.maxSteps}) before finishing. I stopped cleanly rather than guessing.`;
  onFinal?.(msg);
  return { ok: false, message: msg, state };
}

async function bgRunBrainAgent(tabId, task, connectorHint, sharedContext = {}) {
  let currentTabId = tabId;
  const originTabId = tabId;
  const history = [];
  const conversationContext = bgBuildAgentConversationContext({
    ...sharedContext,
    connector: connectorHint,
  });
  bgAgentTaskByTab.set(currentTabId, task);
  bgAgentShouldStop = false;
  let finalMessage = "Done.";

  const onProgress = async (description) => {
    bgBrainUpdate(currentTabId, `→ ${description}`, false, { task, speakHint: description });
  };
  const sendFinalUpdate = async (targetTabId, message, extra = {}) => {
    const finalTabId = targetTabId || currentTabId || originTabId;
    if (finalTabId) {
      bgAgentTaskByTab.set(finalTabId, task);
      bgBrainUpdate(finalTabId, message, true, { task, keepLectureCard: extra.keepLectureCard === true });
      bgSaveAgentTask(finalTabId, task, message);
    }
    if (originTabId && originTabId !== finalTabId) {
      bgAgentTaskByTab.set(originTabId, task);
      bgBrainUpdate(originTabId, message, true, { task, keepLectureCard: extra.keepLectureCard === true });
      bgSaveAgentTask(originTabId, task, message);
    }
  };
  const finish = async (message, ok = true, extra = {}) => {
    finalMessage = message || finalMessage;
    await sendFinalUpdate(extra.tabId || currentTabId, finalMessage, extra);
    return { ok, message: finalMessage, history, ...extra };
  };

  // Understand intent → form the search query BEFORE the very first navigation, so the
  // fast path never opens Maps/web with the user's raw sentence (then re-correct later).
  const pageInfo = await new Promise((resolve) => {
    try { chrome.tabs.get(currentTabId, (tab) => resolve(chrome.runtime.lastError ? null : { url: tab?.url, title: tab?.title })); }
    catch { resolve(null); }
  });
  const userGeo = await bgGetUserGeo().catch(() => null);
  const synth = await bgSynthesizeIntent(task, conversationContext, pageInfo).catch(() => null);
  // Steer the fast path and everything after it by the context-resolved task, not the
  // literal utterance ("show me that book on Amazon" → the actual title).
  if (synth?.resolvedTask && bgNormalizeForMatch(synth.resolvedTask) !== bgNormalizeForMatch(task)) {
    task = synth.resolvedTask;
    await onProgress(`Understood: ${task}`);
  }
  if (synth?.searchQuery) await onProgress(`Searching for "${synth.searchQuery}"`);

  let skipDelegateFastPath = false;
  const fastActions = bgTryFastPath(task, [], synth, userGeo);
  if (fastActions?.length) {
    const shouldContinueAfterFastPath = fastActions.some((action) => action.continueAfter);
    for (const action of fastActions) {
      await onProgress(action.description || bgDescribeDelegateAction(action));
      let result = { success: true };
      if (action.type === "navigate") {
        await new Promise((resolve) => chrome.tabs.update(currentTabId, { url: action.url }, () => setTimeout(resolve, 500)));
        await bgWaitForTabReady(currentTabId, 5000);
      } else {
        result = await bgExecuteDelegateAction(currentTabId, action, { facts: [] });
      }
      history.push({ action, result, ok: !result?.error, ts: Date.now(), thought: "Fast path" });
      if (result?.error) return finish(`Step failed: ${result.error}`, false);
    }
    if (!shouldContinueAfterFastPath) return finish("Done.");
    skipDelegateFastPath = true;
  }

  try {
    const openableResult = await bgTryHandleOpenableContentTask({
      tabId: currentTabId,
      task,
      sharedContext: conversationContext,
      history,
      onProgress,
    });
    if (openableResult?.message) {
      return finish(openableResult.message, true, { keepLectureCard: openableResult.keepLectureCard === true });
    }
  } catch (error) {
    return finish(`Open task error: ${error?.message || error}`, false);
  }

  try {
    const adapterMessage = await bgTryHandleSiteAdapterTask({
      tabId: currentTabId,
      task,
      connectorHint,
      history,
      onProgress,
      shouldStop: () => bgAgentShouldStop,
    });
    if (adapterMessage) return finish(adapterMessage, true);
  } catch (error) {
    return finish(`Adapter error: ${error?.message || error}`, false);
  }

  bgBrainUpdate(currentTabId, "Reading the page...", false, { task });
  const result = await bgRunDelegateLoop({
    tabId: currentTabId,
    task,
    connectorHint,
    sharedContext: conversationContext,
    skipFastPath: skipDelegateFastPath,
    synth,
    onProgress,
    onFinal: (message) => { finalMessage = message || finalMessage; },
    shouldStop: () => bgAgentShouldStop,
  });
  const resultTabId = result?.state?.focusTabId || currentTabId;
  await sendFinalUpdate(resultTabId, finalMessage);
  return result;
}

async function bgUpdateRemoteCommand(id, token, patch) {
  await fetch(`${BG_SUPABASE_URL}/rest/v1/agent_commands?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

function bgBuildSpotifyTrackSearchUrl(songName) {
  return `https://open.spotify.com/search/${encodeURIComponent(songName)}/tracks`;
}

function bgBuildGmailComposeUrl({ to, subject, body }) {
  const url = new URL("https://mail.google.com/mail/u/0/");
  url.searchParams.set("view", "cm");
  url.searchParams.set("fs", "1");
  url.searchParams.set("tf", "1");
  if (to) url.searchParams.set("to", to);
  if (subject) url.searchParams.set("su", subject);
  if (body) url.searchParams.set("body", body);
  return url.toString();
}

async function bgCallGoogleDriveFunction(functionName, payload) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token || !stored.authUserId) throw new Error("Please sign in to Braino first.");
  console.log("[Braino][Drive][BG] Calling function:", functionName, payload);

  const response = await fetch(`${BG_API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userIdentifier: stored.authUserId,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  console.log("[Braino][Drive][BG] Function response:", functionName, response.status, data);
  if (!response.ok) {
    if (data?.reconnectRequired) {
      await bgOpenGoogleDriveReconnect(stored.authUserId);
      throw new Error(`${data.error || "Google Drive needs to be reconnected with full Drive access."} I opened the reconnect page. After approving it, run this again.`);
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function bgOpenGoogleDriveReconnect(userIdentifier) {
  if (!userIdentifier) return false;
  try {
    const response = await fetch(`${BG_API_BASE}/google-drive-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ userIdentifier }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    await new Promise((resolve) => chrome.tabs.create({ url: data.authUrl }, resolve));
    return true;
  } catch (error) {
    console.warn("[Braino][Drive][BG] Could not open reconnect flow:", error);
    return false;
  }
}

async function bgCallCalendarFunction(functionName, payload) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token || !stored.authUserId) throw new Error("Please sign in to Braino first.");
  console.log("[Braino][Calendar][BG] Calling function:", functionName, payload);

  const response = await fetch(`${BG_API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      userIdentifier: stored.authUserId,
      ...payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  console.log("[Braino][Calendar][BG] Function response:", functionName, response.status, data);
  if (!response.ok) {
    if (/not connected|missing a refresh token|reconnect/i.test(String(data?.error || data?.details || ""))) {
      await bgOpenGoogleCalendarReconnect(stored.authUserId);
      throw new Error(`${data.error || "Google Calendar needs to be connected."} I opened the Calendar connection page. After approving it, run this again.`);
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function bgOpenGoogleCalendarReconnect(userIdentifier) {
  if (!userIdentifier) return false;
  try {
    const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken"], resolve));
    const headers = {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      ...(stored.authToken ? { Authorization: `Bearer ${stored.authToken}` } : {}),
    };
    const response = await fetch(`${BG_API_BASE}/google-calendar-oauth-start`, {
      method: "POST",
      headers,
      body: JSON.stringify({ userIdentifier }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    await new Promise((resolve) => chrome.tabs.create({ url: data.authUrl }, resolve));
    return true;
  } catch (error) {
    console.warn("[Braino][Calendar][BG] Could not open reconnect flow:", error);
    return false;
  }
}

async function bgCallSpotifyFunction(functionName, payload) {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authToken", "authUserId"], resolve));
  let token = stored.authToken;
  if (!token) token = await bgRefreshAuthToken();
  if (!token) throw new Error("Please sign in to Braino first.");

  const response = await fetch(`${BG_API_BASE}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: BG_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data?.reconnectRequired) {
      await bgOpenSpotifyReconnect(token);
      throw new Error("Spotify needs to be reconnected. I opened the reconnect page — after approving, run this again.");
    }
    throw new Error([data?.error, data?.details].filter(Boolean).join(" — ") || `${functionName} failed (${response.status})`);
  }
  return data;
}

async function bgOpenSpotifyReconnect(token) {
  try {
    const tok = token || (await bgRefreshAuthToken());
    if (!tok) return false;
    const response = await fetch(`${BG_API_BASE}/spotify-oauth-start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${tok}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.authUrl) return false;
    await new Promise((resolve) => chrome.tabs.create({ url: data.authUrl }, resolve));
    return true;
  } catch (err) {
    console.warn("[Braino][Spotify][BG] Could not open reconnect flow:", err);
    return false;
  }
}

function bgExtractSongFromPageTitle(title, url) {
  let s = String(title || "").trim();
  s = s.replace(/\s*[-|–—]\s*(YouTube|SoundCloud|Vimeo|Dailymotion|Spotify|Apple Music|Tidal|Amazon Music)\s*$/i, "");
  s = s.replace(/\s*[\[(](Official\s+(Music\s+)?Video|Official\s+Audio|Official\s+Lyric\s+Video|Lyrics?|Audio|HQ|HD|4K|MV|Live\s+(Performance|Version)?|Visualizer|Fan\s+Made|Radio\s+Edit)[)\]]\s*/gi, " ");
  s = s.replace(/\s*VEVO\s*/gi, " ");
  s = s.replace(/\s*\(\d{4}\)\s*$/, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

function bgNormalizeConnectorHint(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key || key === "auto" || key === "default") return "auto";
  if (["spotify", "spot", "music"].includes(key)) return "spotify";
  if (["drive", "gdrive", "google-drive", "google_drive"].includes(key)) return "google-drive";
  if (["gmail", "mail", "google-mail", "googlemail"].includes(key)) return "gmail";
  if (["calendar", "cal", "gcal", "google-calendar", "google_calendar", "googlecal"].includes(key)) return "google-calendar";
  return null;
}

function bgCalendarTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch (_) {
    return "Asia/Kolkata";
  }
}

function bgCalendarStartOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function bgParseCalendarTimeFragment(value) {
  const text = String(value || "").trim().toLowerCase().replace(/\./g, "");
  if (!text) return null;
  if (/\bnoon\b/.test(text)) return { hour: 12, minute: 0 };
  if (/\bmidnight\b/.test(text)) return { hour: 0, minute: 0 };

  const match = text.match(/\b((?:[01]?\d|2[0-3])(?::([0-5]\d))?)\s*(am|pm)?\b/i);
  if (!match) return null;
  let hour = parseInt(match[1].split(":")[0], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3] || "";
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  if (!ampm && hour >= 1 && hour <= 7) hour += 12;
  return { hour, minute };
}

function bgParseCalendarDateFragment(value) {
  const text = String(value || "").trim().toLowerCase();
  const now = new Date();
  if (!text) return null;
  if (/\btomorrow\b/.test(text)) {
    const d = bgCalendarStartOfLocalDay(now);
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (/\btoday\b|\btonight\b/.test(text)) return bgCalendarStartOfLocalDay(now);

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const weekdayIndex = weekdays.findIndex((day) => new RegExp(`\\b${day.slice(0, 3)}(?:${day.length > 3 ? day.slice(3) : ""})?\\b`, "i").test(text));
  if (weekdayIndex >= 0) {
    const d = bgCalendarStartOfLocalDay(now);
    let delta = (weekdayIndex - d.getDay() + 7) % 7;
    if (delta === 0 && !/\btoday\b/.test(text)) delta = 7;
    d.setDate(d.getDate() + delta);
    return d;
  }

  const months = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
    september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
  };
  const monthNames = Object.keys(months).join("|");
  const monthFirst = text.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"));
  if (monthFirst) {
    const year = monthFirst[3] ? parseInt(monthFirst[3], 10) : now.getFullYear();
    const d = new Date(year, months[monthFirst[1].toLowerCase()], parseInt(monthFirst[2], 10));
    if (!monthFirst[3] && d < bgCalendarStartOfLocalDay(now)) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const dayFirst = text.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})(?:,?\\s+(\\d{4}))?\\b`, "i"));
  if (dayFirst) {
    const year = dayFirst[3] ? parseInt(dayFirst[3], 10) : now.getFullYear();
    const d = new Date(year, months[dayFirst[2].toLowerCase()], parseInt(dayFirst[1], 10));
    if (!dayFirst[3] && d < bgCalendarStartOfLocalDay(now)) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  const slash = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (slash) {
    const yearRaw = slash[3] ? parseInt(slash[3], 10) : now.getFullYear();
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;
    const d = new Date(year, parseInt(slash[1], 10) - 1, parseInt(slash[2], 10));
    if (!slash[3] && d < bgCalendarStartOfLocalDay(now)) d.setFullYear(d.getFullYear() + 1);
    return d;
  }
  return null;
}

function bgExtractCalendarDateTime(raw, durationMinutes = 30) {
  const text = String(raw || "").trim();
  const timeMatch =
    text.match(/\b(?:at|for|from|to)\s+((?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?)|(?:[01]?\d|2[0-3]):[0-5]\d|noon|midnight)\b/i) ||
    text.match(/\b((?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:a\.?m\.?|p\.?m\.?))\b/i);
  const parsedTime = bgParseCalendarTimeFragment(timeMatch?.[1] || "");
  if (!parsedTime) return null;

  const afterTime = timeMatch ? text.slice((timeMatch.index || 0) + timeMatch[0].length) : "";
  const beforeTime = timeMatch ? text.slice(0, timeMatch.index || 0) : text;
  const explicitDate =
    afterTime.match(/\b(?:on|for)\s+(.+)$/i)?.[1] ||
    afterTime ||
    beforeTime.match(/\b(?:on|for)\s+(.+?)\s*$/i)?.[1] ||
    text;
  const parsedDate = bgParseCalendarDateFragment(explicitDate) || bgParseCalendarDateFragment(text);
  if (!parsedDate) return null;

  const start = new Date(parsedDate);
  start.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
  const end = new Date(start.getTime() + Math.max(15, durationMinutes) * 60 * 1000);
  const timeZone = bgCalendarTimeZone();
  return {
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
    startDate: start,
    endDate: end,
    timeZone,
  };
}

function bgExtractCalendarEmails(raw) {
  const matches = String(raw || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  return [...new Set(matches.map((email) => email.trim().toLowerCase()))];
}

function bgExtractCalendarPerson(raw) {
  const match = String(raw || "").match(/\b(?:with|w\/?|w)\s+(.+?)(?=\s+(?:at|for|on|today|tomorrow|tonight|mon|tue|wed|thu|fri|sat|sun|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b|$)/i);
  if (!match) return "";
  return match[1]
    .replace(/[,.!?]+$/g, "")
    .replace(/\b(?:please|pls|sir)\b/gi, "")
    .trim();
}

function bgCalendarSummaryFromTask(raw, kind, person) {
  const about = String(raw || "").match(/\b(?:about|regarding|re)\s+(.+?)(?:\s+(?:at|for|on)\b|$)/i)?.[1]?.trim();
  const base = kind === "call" ? "Call" : kind === "meet" ? "Meet" : kind === "event" ? "Event" : "Meeting";
  if (person) return `${base} with ${person}`;
  if (about) return `${base}: ${about}`;
  return base;
}

function bgFormatCalendarWhen(event) {
  const start = event?.start?.dateTime || event?.start?.date;
  const end = event?.end?.dateTime || event?.end?.date;
  if (!start) return "time not shown";
  try {
    const startText = new Date(start).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: event?.start?.date ? undefined : "numeric",
      minute: event?.start?.date ? undefined : "2-digit",
    });
    if (!end || event?.start?.date) return startText;
    const endText = new Date(end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return `${startText} - ${endText}`;
  } catch (_) {
    return String(start);
  }
}

function bgFormatCalendarEventLine(event) {
  const title = event?.summary || "Untitled event";
  const when = bgFormatCalendarWhen(event);
  const meet = event?.meetUrl ? ` · Meet: ${event.meetUrl}` : "";
  return `- **${title}** — ${when}${meet}`;
}

function bgBuildCalendarListWindow(raw) {
  const now = new Date();
  const lower = String(raw || "").toLowerCase();
  let start = new Date(now.getTime() - 5 * 60 * 1000);
  let end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (/\btoday\b/.test(lower)) {
    start = bgCalendarStartOfLocalDay(now);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  } else if (/\btomorrow\b/.test(lower)) {
    start = bgCalendarStartOfLocalDay(now);
    start.setDate(start.getDate() + 1);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
  }
  return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function bgParseCalendarTask(task, siteContext, connectorHint) {
  const raw = String(task || "").trim();
  const text = raw.toLowerCase();
  const currentSite = siteContext?.site || "generic";
  const normalizedConnector = bgNormalizeConnectorHint(connectorHint) || "auto";
  const wantsCalendar =
    currentSite === "google-calendar" ||
    normalizedConnector === "google-calendar" ||
    /\b(calendar|google calendar|gcal|meeting|meet|call|event|schedule|reschedule|cancel|invite|forward)\b/i.test(text);
  if (!wantsCalendar) return null;

  if (/\b(?:join|open|start)\b.*\b(?:next|current|upcoming|now)\b.*\b(?:meet|meeting|call)\b/i.test(raw) ||
      /\b(?:join|open|start)\s+(?:my\s+)?(?:meet|meeting|call)\b/i.test(raw)) {
    return { adapter: "google-calendar", intent: "openNextMeet" };
  }

  if (/\b(?:what|show|list|tell)\b.*\b(?:calendar|meetings?|calls?|events?|schedule)\b/i.test(raw) ||
      /\b(?:meetings?|calls?|events?)\s+(?:today|tomorrow|this week|coming up|upcoming)\b/i.test(raw)) {
    const window = bgBuildCalendarListWindow(raw);
    const query = raw.match(/\b(?:about|with|for)\s+(.+?)$/i)?.[1]?.trim() || "";
    return { adapter: "google-calendar", intent: "listEvents", query, ...window };
  }

  const createCommand = /\b(?:schedule|book|set\s+up|create|add|make)\b/i.test(raw)
    && /\b(?:call|meeting|meet|event)\b/i.test(raw);
  if (createCommand) {
    const kind = /\bcall\b/i.test(raw) ? "call" : /\bmeet\b/i.test(raw) ? "meet" : /\bevent\b/i.test(raw) ? "event" : "meeting";
    const durationMinutes = kind === "event" ? 60 : 30;
    const dateTime = bgExtractCalendarDateTime(raw, durationMinutes);
    if (!dateTime) {
      return { adapter: "google-calendar", intent: "needsDetails", missing: "time", message: "Tell me the date and time for this Calendar event." };
    }
    const person = bgExtractCalendarPerson(raw);
    const emails = bgExtractCalendarEmails(raw);
    return {
      adapter: "google-calendar",
      intent: "createEvent",
      summary: bgCalendarSummaryFromTask(raw, kind, person),
      attendees: emails,
      attendeeName: person,
      createMeet: true,
      ...dateTime,
    };
  }

  if (/\b(?:reschedule|move|postpone)\b/i.test(raw) && /\b(?:meeting|call|meet|event|calendar)\b/i.test(raw)) {
    const dateTime = bgExtractCalendarDateTime(raw, 30);
    if (!dateTime) {
      return { adapter: "google-calendar", intent: "needsDetails", missing: "new_time", message: "Tell me the new date and time for this event." };
    }
    const query = raw
      .replace(/\b(?:reschedule|move|postpone)\b/i, "")
      .replace(/\b(?:to|for|at)\s+.*$/i, "")
      .replace(/\b(?:my|the|calendar|event|meeting|call|meet)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { adapter: "google-calendar", intent: "rescheduleEvent", query, ...dateTime };
  }

  if (/\b(?:cancel|delete|remove)\b/i.test(raw) && /\b(?:meeting|call|meet|event|calendar)\b/i.test(raw)) {
    const query = raw
      .replace(/\b(?:cancel|delete|remove)\b/i, "")
      .replace(/\b(?:my|the|calendar|event|meeting|call|meet)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { adapter: "google-calendar", intent: "cancelEvent", query };
  }

  const forwardEmails = bgExtractCalendarEmails(raw);
  if (forwardEmails.length && /\b(?:forward|invite|add)\b/i.test(raw) && /\b(?:meeting|call|meet|event|calendar)\b/i.test(raw)) {
    const query = raw
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, " ")
      .replace(/\b(?:forward|invite|add|to|for|my|the|calendar|event|meeting|call|meet|attendees?)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    return { adapter: "google-calendar", intent: "forwardEvent", query, attendees: forwardEmails };
  }

  return null;
}

async function bgFindCalendarEvent(parsed, fallbackQuery = "") {
  const query = String(parsed?.query || fallbackQuery || "").trim();
  const window = bgBuildCalendarListWindow(query || "upcoming");
  const result = await bgCallCalendarFunction("google-calendar-action", {
    action: "find_events",
    query: query || undefined,
    timeMin: window.timeMin,
    timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults: 8,
  });
  const events = Array.isArray(result?.events) ? result.events : [];
  if (!events.length) throw new Error(query ? `I couldn't find an upcoming Calendar event matching "${query}".` : "I couldn't find an upcoming Calendar event to use.");
  return events[0];
}

async function bgOpenCalendarUrlInTab(tabId, url, description = "Open Google Calendar") {
  if (!url) return null;
  const result = await bgExecuteAgentAction(tabId, {
    type: "navigate",
    url,
    description,
  });
  if (!result?.error) {
    await bgWaitForTabReady(tabId, 8000);
    await bgDelay(1000);
  }
  return result;
}

function bgFormatSpotifyDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function bgFormatSpotifyTrack(track, options = {}) {
  if (!track) return null;
  const title = String(track.name || track.title || "").trim();
  if (!title) return null;
  const artists = Array.isArray(track.artists)
    ? track.artists.map((item) => typeof item === "string" ? item : item?.name).filter(Boolean).join(", ")
    : String(track.artists || "").trim();
  const durationMs = typeof track.durationMs === "number"
    ? track.durationMs
    : typeof track.duration_ms === "number"
      ? track.duration_ms
      : null;
  const progressMs = typeof options.progressMs === "number" ? options.progressMs : null;
  return {
    title,
    artists,
    album: String(track.albumName || track.album || "").trim(),
    durationText: durationMs != null ? bgFormatSpotifyDuration(durationMs) : "",
    imageUrl: String(track.imageUrl || track.image || "").trim(),
    href: String(track.externalUrl || track.href || "").trim(),
    progressText: progressMs != null ? bgFormatSpotifyDuration(progressMs) : "",
    progressRatio: (progressMs != null && durationMs)
      ? Math.max(0, Math.min(1, progressMs / durationMs))
      : null,
    deviceName: String(options.deviceName || "").trim(),
    isPlaying: Boolean(options.isPlaying),
  };
}

async function bgFetchSpotifyPlayerState() {
  try {
    return await bgCallSpotifyFunction("spotify-player-state", {});
  } catch (error) {
    console.warn("[Braino][Spotify][BG] Could not fetch player state:", error);
    return null;
  }
}

async function bgPlaySpotifyWithAutoOpen(uris, positionMs = null, opts = {}) {
  const payload = { action: "play", uris };
  if (Number.isFinite(Number(positionMs)) && Number(positionMs) > 0) payload.positionMs = Number(positionMs);
  // Reuse the web player when it already exists. Creating a new tab on every retry
  // makes Delegate look broken and can register multiple devices.
  // opts.background: open the player WITHOUT stealing focus — party tricks need the
  // user watching Braino, not a Spotify tab (a hidden tab also pauses his rAF dance).
  try {
    const existing = await bgFindSpotifyTab();
    if (existing?.id != null) { if (!opts.background) await new Promise(r => chrome.tabs.update(existing.id, { active: true }, r)); }
    else await new Promise(r => chrome.tabs.create({ url: "https://open.spotify.com", active: !opts.background }, r));
  } catch (_) {}
  // Try immediately; if no active device yet, poll until web player registers
  for (let i = 0; i < 5; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 2000));
    try {
      return await bgCallSpotifyFunction("spotify-playback", payload);
    } catch (err) {
      if (!String(err?.message || "").match(/device|active/i)) throw err;
    }
  }
  throw new Error("Opened Spotify but couldn't start playback. Try playing once in Spotify first.");
}

function bgBuildSpotifyUiStateFromPlayback(playerState, base = {}) {
  const baseTrack = bgFormatSpotifyTrack(base.primaryTrack || null, {
    isPlaying: Boolean(base.assumePlaying),
    deviceName: base.deviceName || "",
  });
  const nowPlaying = bgFormatSpotifyTrack(playerState?.track, {
    isPlaying: Boolean(playerState?.isPlaying),
    progressMs: playerState?.progressMs,
    deviceName: playerState?.activeDevice?.name || base.deviceName || "",
  }) || baseTrack;
  const searchResults = Array.isArray(base.searchTracks)
    ? base.searchTracks.map((track) => bgFormatSpotifyTrack(track)).filter(Boolean).slice(0, 6)
    : [];
  if (!searchResults.length && baseTrack) {
    searchResults.push({ ...baseTrack, isPlaying: false, progressText: "", progressRatio: null, deviceName: "" });
  }

  return {
    active: true,
    source: "spotify",
    intent: String(base.intent || "").trim(),
    query: String(base.query || "").trim(),
    currentPlaylistName: String(base.currentPlaylistName || "").trim(),
    searchResults,
    nowPlaying,
    summary: String(base.summary || "").trim(),
  };
}

async function bgPushSpotifyPlaybackState(tabId, base = {}, options = {}) {
  const playerState = await bgFetchSpotifyPlayerState();
  const state = bgBuildSpotifyUiStateFromPlayback(playerState, base);
  bgPushSpotifyState(tabId, state, options);
  return state;
}

function bgParseAdapterTask(task, siteContext, connectorHint) {
  const raw = String(task || "").trim();
  const text = raw.toLowerCase();
  const currentSite = siteContext?.site || "generic";
  const normalizedConnector = bgNormalizeConnectorHint(connectorHint) || "auto";
  const explicitSpotifyMention = /\bspotify\b/.test(text);
  const explicitMusicIntent = /\b(?:song|track|music|playlist|album)\b/i.test(raw);
  const onSpotify = currentSite === "spotify" || normalizedConnector === "spotify" || explicitSpotifyMention;
  const wantsGoogleDoc = /\bgoogle\s+(?:docs?|documents?)\b|\bgdocs?\b|\bgoogle doc\b|\bgdoc\b|\bdocs?\.new\b|\bdocs?\b/.test(text);
  const wantsGmail =
    currentSite === "gmail" ||
    normalizedConnector === "gmail" ||
    /\bgmail\b|\bemail\b|\bmail\b/.test(text);
  const wantsGoogleDrive =
    currentSite === "google-drive" ||
    normalizedConnector === "google-drive" ||
    /\bgoogle drive\b|\bdrive\b/.test(text);
  const calendarParsed = bgParseCalendarTask(raw, siteContext, normalizedConnector);
  if (calendarParsed) return calendarParsed;

  if (
    wantsGoogleDrive &&
    /\b(organize|organise|organhise|sort|clean(?:\s+up)?|tidy(?:\s+up)?|arrange)\b/i.test(raw) &&
    /\b(files?|folders?|docs?|documents?|drive)\b/i.test(raw)
  ) {
    return { adapter: "google-drive", intent: "organize" };
  }

  const quotedAdd = raw.match(/add\s+["“](.+?)["”]\s+to\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedAdd) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: quotedAdd[1].trim(), playlist: quotedAdd[2].trim() };
  }

  const addMatch = raw.match(/add\s+(?:the\s+song\s+|song\s+)?(.+?)\s+to\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && addMatch) {
    return { adapter: "spotify", intent: "addSongToPlaylist", song: addMatch[1].trim(), playlist: addMatch[2].trim() };
  }

  const quotedPlay = raw.match(/play\s+["“](.+?)["”]\s+from\s+(?:my\s+)?playlist\s+["“](.+?)["”](?:\s+on\s+spotify)?/i);
  if (onSpotify && quotedPlay) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: quotedPlay[1].trim(), playlist: quotedPlay[2].trim() };
  }

  const playMatch = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)\s+from\s+(?:my\s+)?playlist\s+(.+?)(?:\s+on\s+spotify)?$/i);
  if (onSpotify && playMatch) {
    return { adapter: "spotify", intent: "playSongFromPlaylist", song: playMatch[1].trim(), playlist: playMatch[2].trim() };
  }

  const isShortPlaybackCommand = /^(?:pause|resume|continue|stop|next|skip|previous|prev|back)\b/i.test(raw);
  const mentionsSpotifyPlayback = /\b(?:spotify|song|track|music|playlist)\b/i.test(raw);
  const spotifyPlaybackContext = onSpotify || explicitMusicIntent || mentionsSpotifyPlayback;

  if (spotifyPlaybackContext || (onSpotify && isShortPlaybackCommand)) {
    if (/^(?:pause|stop)\b/i.test(raw) || /\b(?:pause|stop)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "pause" };
    }
    if (/^(?:resume|continue)\b/i.test(raw) || /\b(?:resume|continue)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "play" };
    }
    if (/^(?:next|skip)\b/i.test(raw) || /\b(?:next|skip)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "next" };
    }
    if (/^(?:previous|prev|back)\b/i.test(raw) || /\b(?:previous|prev|back)\b.*\b(?:spotify|song|track|music)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "playbackControl", control: "previous" };
    }
  }

  // Volume — unambiguous media control; recognized regardless of current tab so it
  // works in realtime voice (where the session tab isn't Spotify).
  const hasVolumeWord = /\bvolume\b/i.test(raw);
  const wantsLouder = /\b(louder|raise|increase|boost|higher)\b/i.test(raw)
    || /\bturn\s+up\b/i.test(raw)
    || /\bturn\s+(?:it|the\s+(?:music|sound|volume))\s+up\b/i.test(raw)
    || /\b(full|max(imum)?)\s+(volume|vol)\b/i.test(raw)
    || /\b(volume|vol)\s+(up|higher|full|max)\b/i.test(raw);
  const wantsQuieter = /\b(quieter|softer|dimmer|lower|decrease|reduce)\b/i.test(raw)
    || /\bturn\s+down\b/i.test(raw)
    || /\bturn\s+(?:it|the\s+(?:music|sound|volume))\s+down\b/i.test(raw)
    || /\b(mute|silence)\b/i.test(raw);
  if (hasVolumeWord || wantsLouder || wantsQuieter) {
    // Full / max → 100%. Mute / silence → 0%. Exact % → that value.
    if (/\b(full|max(imum)?)\s*(volume|vol)?$|\b(volume|vol)\s+(full|max)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "setVolume", volumePercent: 100 };
    }
    if (/\b(mute|silence)\b/i.test(raw)) {
      return { adapter: "spotify", intent: "setVolume", volumePercent: 0 };
    }
    const exactVolume = raw.match(/(?:set|change|put|make)\s+(?:the\s+)?(?:spotify\s+)?volume\s+(?:to\s+)?(\d{1,3})\s*%?/i)
      || raw.match(/\bvolume\s+(?:to\s+|at\s+)?(\d{1,3})\s*%?/i)
      || raw.match(/\b(\d{1,3})\s*%?\s+(?:volume|vol)\b/i);
    if (exactVolume) {
      return { adapter: "spotify", intent: "setVolume", volumePercent: Math.min(100, Math.max(0, parseInt(exactVolume[1], 10))) };
    }
    if (wantsQuieter) {
      return { adapter: "spotify", intent: "setVolume", volumeStep: -20 };
    }
    if (wantsLouder) {
      return { adapter: "spotify", intent: "setVolume", volumeStep: +20 };
    }
  }

  // VIDEO content veto — "play <X> reaction videos / vlog / trailer / episode" is
  // YouTube-shaped no matter what site is open. Spotify's search happily returns a
  // random song for it (real bug: "play tanmay bhat's reaction videos" on Spotify
  // played music). Explicit song words re-enable the music path.
  const wantsVideoContent = /\b(videos?|reaction|reactions|vlogs?|trailers?|episodes?|shorts|documentary|interview|watch)\b/i.test(raw)
    && !/\b(songs?|tracks?|albums?|playlists?|music)\b/i.test(raw);

  const quotedDirectPlay = raw.match(/play\s+[“”](.+?)[“”](?:\s+(?:on|in)\s+spotify)?$/i);
  if (!wantsVideoContent && (onSpotify || explicitMusicIntent) && quotedDirectPlay && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(quotedDirectPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: quotedDirectPlay[1].trim() };
  }

  const directPlay = raw.match(/play\s+(?:the\s+song\s+|song\s+)?(.+?)(?:\s+(?:on|in)\s+spotify)?$/i);
  if (!wantsVideoContent && (onSpotify || explicitMusicIntent) && directPlay && !/\bfrom\s+(?:my\s+)?playlist\b/i.test(raw) && !/^(?:next|previous|prev|pause|resume|stop|shuffle|repeat)$/i.test(directPlay[1].trim())) {
    return { adapter: "spotify", intent: "playSong", song: directPlay[1].trim() };
  }

  // "add this song to Spotify" — infer song from current page, save to Liked Songs or playlist
  const addThisQuoted = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:playlist\s+)?[""](.+?)[""](?:\s+(?:playlist\s+)?(?:on\s+)?spotify)?/i);
  if (addThisQuoted) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisQuoted[1].trim() };
  }
  const addThisNamed = raw.match(/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+my\s+(.+?)\s+playlist(?:\s+(?:on\s+)?spotify)?\s*$/i);
  if (addThisNamed) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: addThisNamed[1].trim() };
  }
  if (/(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?(?:liked\s+songs?\s+(?:on\s+)?)?spotify\b/i.test(raw) ||
      /(?:add|save)\s+this(?:\s+(?:song|track|video|tune))?\s+to\s+(?:my\s+)?liked\s+songs?\b/i.test(raw)) {
    return { adapter: "spotify", intent: "addCurrentPageSong", playlist: null };
  }

  const articlePatterns = [
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+(?:then\s+)?(?:create|make|write|draft)\s+(?:me\s+)?(?:(?:a|an)\s+)?(?:google\s+)?(?:docs?|doc(?:ument)?)/i,
    /search for\s+(.+?)\s+and\s+(?:then\s+)?(?:write|draft|make|create)\s+(?:about it\s+)?(?:(?:a|an)\s+)?(?:article|report|brief|google\s+docs?|google\s+documents?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google\s+docs?|google\s+documents?|docs?)?/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+put\s+(?:it\s+)?(?:in|into)\s+(?:a\s+)?(?:google\s+docs?|google\s+documents?|docs?|doc(?:ument)?)/i,
    /research\s+(?:about\s+|on\s+)?(.+?)\s+and\s+(?:then\s+)?(?:write|draft|make|create|put|turn it into)\s+(?:(?:a|an)\s+)?(?:article|report|brief|google\s+docs?|google\s+documents?|docs?|doc(?:ument)?)\s*(?:in|on|with)?\s*(?:a\s+)?(?:google\s+docs?|google\s+documents?|docs?)?/i,
    /write\s+an?\s+article\s+about\s+(.+?)\s+in\s+(?:a\s+)?(?:google\s+docs?|google\s+documents?)/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:a\s+)?(?:google\s+docs?|google\s+documents?|docs?|doc(?:ument)?)\s+(?:about|on)\s+(.+)/i,
    /(?:create|make|draft|write)\s+(?:me\s+)?(?:an?\s+)?(?:article|report|brief)\s+(?:about|on)\s+(.+?)\s+(?:in|as|inside)\s+(?:a\s+)?(?:google\s+docs?|google\s+documents?|docs?|doc(?:ument)?)/i,
  ];

  if (wantsGoogleDoc) {
    for (const pattern of articlePatterns) {
      const match = raw.match(pattern);
      if (match) {
        return { adapter: "google-docs", intent: "researchArticle", topic: match[1].trim() };
      }
    }
  }

  const sendEmailMatch = raw.match(/(?:send|compose|draft|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:about|subject)\s+(.+?)\s+(?:saying|that says|body)\s+(.+)$/i);
  if (wantsGmail && sendEmailMatch) {
    return {
      adapter: "gmail",
      intent: /^(send)/i.test(raw.trim()) ? "sendEmail" : "draftEmail",
      to: sendEmailMatch[1].trim(),
      subject: sendEmailMatch[2].trim(),
      body: sendEmailMatch[3].trim(),
    };
  }

  const namedEmailMatch = raw.match(/(?:send|compose|draft|write)\s+(.+?)\s+an?\s+email(?:\s+(?:about|subject)\s+(.+?))?(?:\s+(?:saying|that says|with message|body)\s+(.+))?$/i);
  if (wantsGmail && namedEmailMatch) {
    const recipient = namedEmailMatch[1].trim();
    const subject = namedEmailMatch[2]?.trim() || "";
    const body = namedEmailMatch[3]?.trim() || "";
    return {
      adapter: "gmail",
      intent: /^send\b/i.test(raw.trim()) && body ? "sendEmail" : "draftEmail",
      to: recipient,
      subject,
      body,
    };
  }

  const draftEmailMatch = raw.match(/(?:draft|compose|write)\s+(?:an?\s+)?email\s+to\s+(.+?)\s+(?:saying|that says|with message)\s+(.+)$/i);
  if (wantsGmail && draftEmailMatch) {
    return {
      adapter: "gmail",
      intent: "draftEmail",
      to: draftEmailMatch[1].trim(),
      subject: "",
      body: draftEmailMatch[2].trim(),
    };
  }

  const simpleEmailMatch = raw.match(/(?:send|compose|draft|write)\s+(?:an?\s+)?email\s+to\s+(.+?)$/i);
  if (wantsGmail && simpleEmailMatch) {
    return {
      adapter: "gmail",
      intent: "draftEmail",
      to: simpleEmailMatch[1].trim(),
      subject: "",
      body: "",
    };
  }

  const replyEmailMatch = raw.match(/reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && replyEmailMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: replyEmailMatch[1].trim(),
      send: true,
    };
  }

  const draftReplyMatch = raw.match(/draft\s+(?:a\s+)?reply\s+to\s+(?:this\s+)?email\s+(?:saying|with)\s+(.+)$/i);
  if (wantsGmail && draftReplyMatch) {
    return {
      adapter: "gmail",
      intent: "replyCurrentThread",
      body: draftReplyMatch[1].trim(),
      send: false,
    };
  }

  const gmailSearchMatch = raw.match(/(?:find|search|look for|open)\s+(?:emails?|mail)\s+(?:about|for|from)?\s+(.+)$/i);
  if (wantsGmail && gmailSearchMatch) {
    return {
      adapter: "gmail",
      intent: "search",
      query: gmailSearchMatch[1].trim(),
    };
  }

  const createFolderMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?(?:google\s+)?drive folder\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?$/i);
  if (wantsGoogleDrive && createFolderMatch) {
    const parentFolderMatch = raw.match(/\s+in\s+folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
    return {
      adapter: "google-drive",
      intent: "createFolder",
      folderName: createFolderMatch[1].trim(),
      parentFolderName: parentFolderMatch?.[1]?.trim() || null,
    };
  }

  const createDocMatch = raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?google doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:create|make)\s+(?:a\s+)?(?:new\s+)?doc\s+(?:called\s+|named\s+)?["“]?(.+?)["”]?(?:\s+in\s+folder\s+["“]?(.+?)["”]?)?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && createDocMatch) {
    return {
      adapter: "google-drive",
      intent: "createDoc",
      docName: createDocMatch[1].trim(),
      parentFolderName: createDocMatch[2]?.trim() || null,
    };
  }

  const renameMatch = raw.match(/rename\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && renameMatch) {
    return {
      adapter: "google-drive",
      intent: "rename",
      targetKind: renameMatch[1]?.trim()?.toLowerCase() || null,
      currentName: renameMatch[2].trim(),
      newName: renameMatch[3].trim(),
    };
  }

  const moveMatch = raw.match(/move\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?\s+to\s+(?:folder\s+)?["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && moveMatch) {
    return {
      adapter: "google-drive",
      intent: "move",
      targetKind: moveMatch[1]?.trim()?.toLowerCase() || null,
      itemName: moveMatch[2].trim(),
      destinationFolderName: moveMatch[3].trim(),
    };
  }

  const deleteMatch = raw.match(/(?:delete|remove|trash)\s+(?:the\s+)?(?:(file|folder)\s+)?["“]?(.+?)["”]?(?:\s+(?:from|in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && deleteMatch) {
    return {
      adapter: "google-drive",
      intent: "delete",
      targetKind: deleteMatch[1]?.trim()?.toLowerCase() || null,
      itemName: deleteMatch[2].trim(),
    };
  }

  const folderSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?folder\s+["“]?(.+?)["”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && folderSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: folderSearchMatch[1].trim(), folderOnly: true };
  }

  const fileSearchMatch = raw.match(/(?:find|search for|look for)\s+(?:a\s+)?file\s+[“”]?(.+?)[“”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i)
    || raw.match(/(?:find|search for|look for)\s+[“”]?(.+?)[“”]?(?:\s+(?:in|on)\s+(?:google\s+)?drive\b)?$/i);
  if (wantsGoogleDrive && fileSearchMatch) {
    return { adapter: "google-drive", intent: "search", query: fileSearchMatch[1].trim(), folderOnly: false };
  }

  // ── Medium ──────────────────────────────────────────────────────────────────
  const wantsMedium = /\bmedium(?:\.com)?\b/i.test(text);
  const wantsMediumSearch = wantsMedium && /\b(find|search|look for|show|whip up|pull up|articles?|posts?|content)\b/i.test(text);
  if (wantsMediumSearch) {
    const qMatch = raw.match(/(?:about|on|for|regarding|on how to|about how to)\s+(.+?)(?:\s+on\s+medium|\s+for\s+me|\s+please)?\.?$/i);
    return { adapter: "medium", intent: "searchArticles", query: (qMatch?.[1] || "").trim() };
  }

  // ── Twitter / X ─────────────────────────────────────────────────────────────
  // X feed reading (distinct from __sbIsXStatusRequest which handles follower/stats queries)
  const wantsXFeedRead = /\b(twitter|my x|on x|x feed|timeline|feed|x\b)/i.test(text)
    && /\b(how'?s?|what'?s?|show|check|look|what(?:'s|\s+is)\s+(?:on|going on|happening|up))\b/i.test(text)
    && !/\b(followers?|following|stats?|analytics|count|mentions?|last tweet)\b/i.test(text);
  if (wantsXFeedRead) return { adapter: "twitter", intent: "readFeed" };

  // X post generation + posting
  const wantsXWrite = /\b(tweet|post|publish|share|put\s+(?:it|this|that)\s+on)\b/i.test(text) && /\b(x\b|twitter)\b/i.test(text);
  const wantsXGenerate = wantsXWrite && /\b(idea|ideas|article|articles|topic|topics|generate|think\s+of|come\s+up\s+with|write)\b/i.test(text);
  if (wantsXGenerate) {
    const topicMatch = raw.match(/(?:about|on|regarding)\s+(.+?)(?:\s+(?:and|then|for me|please))?\.?$/i);
    return { adapter: "twitter", intent: "generateAndPost", topic: (topicMatch?.[1] || "").trim() || null };
  }
  if (wantsXWrite) {
    const contentMatch = raw.match(/(?:post|tweet|share|publish)\s+(?:this|it|that|”(.+?)”)?/i);
    return { adapter: "twitter", intent: "postTweet", content: (contentMatch?.[1] || "").trim() };
  }

  return null;
}

function bgLooksLikeBrowserTask(task) {
  const raw = String(task || "").trim();
  if (!raw) return false;

  if (bgTextSuggestsOpenableRecommendation(raw)) return true;

  // 1) Generic web search / look-up — needs NO app target. This is the default agent
  //    behavior: "look up X", "search for X", "find me an article on X", "google X",
  //    "pull up X". These must delegate (search → open → offer summary), never be
  //    answered conversationally with "I can't open that from here".
  const searchLookup = /\b(look(?:ing)?\s+(?:this|that|it|them)?\s*up|look\s+up|search(?:\s+for|\s+the\s+web|\s+online)?|google|find\s+(?:me\s+)?(?:an?\s+)?(?:article|articles|paper|papers|info|information|something|page|website|result|link)|pull\s+up|bring\s+up|read\s+(?:me\s+)?(?:an?\s+)?(?:article|paper|story|post))\b/i.test(raw);
  if (searchLookup) return true;

  // 2) Questions that need live/fresh web data (no app target needed either).
  const freshness = /\b(latest|current|today|right\s+now|as\s+of|this\s+week|this\s+month|this\s+year|recent|news|price\s+of|stock|weather|score|standings|live|just\s+happened|breaking|update\s+on|status\s+of|who\s+won|who\s+is\s+winning|what\s+happened|trending)\b/i.test(raw);
  if (freshness) return true;

  if (bgLooksLikeGoogleMapsPlaceTask(raw)) return true;

  // 3) App/site actions — strong imperative + a known actionable target.
  const strongImperative = /^(?:open|go to|navigate to|visit|search|find|look up|pull up|bring up|take me to|show me|create|make|draft|compose|send|reply|play|pause|resume|continue|next|skip|previous|prev|book|schedule|reschedule|cancel|forward|invite|join|buy|order|post|tweet|get directions|show directions|route|move|rename|delete|remove|archive|label|organize|organise)\b/i.test(raw);
  if (!strongImperative) return false;

  const actionableTarget = /\b(gmail|email|google drive|drive|spotify|youtube|netflix|google docs?|google documents?|docs?\.new|google sheets?|sheets?\.new|google slides?|slides?\.new|maps?|directions?|calendar|flight|flights|hotel|hotels|restaurant|restaurants|whatsapp|x|twitter|linkedin|amazon|reddit)\b/i.test(raw);
  return actionableTarget;
}

async function bgBuildArticleDraftFromSearch(topic) {
  const searchData = await bgPerformRealWebSearch(topic, { purpose: "google_doc" });
  if (searchData?.error) throw new Error(searchData.error);
  if (!searchData?.body) throw new Error(`I couldn't create a grounded research draft for "${topic}".`);

  return {
    title: String(searchData.title || `${topic} - Braino Research`).trim(),
    body: String(searchData.body).trim(),
  };
}

async function bgBuildDriveOrganizationPlan(files) {
  const safeFiles = Array.isArray(files) ? files.slice(0, 180) : [];
  if (!safeFiles.length) {
    return { folders: [], moves: [] };
  }

  const response = await bgChatFetch({
      pageContext: {
        title: "Google Drive file inventory",
        url: "https://drive.google.com",
        text: safeFiles.map((file, index) => (
          `[${index + 1}] id=${file.id}\nname=${file.name}\nmime=${file.mimeType}\nparents=${(file.parentNames || []).join(", ") || "root"}`
        )).join("\n\n"),
      },
      message: `You are organizing a Google Drive using API actions.

Return ONLY JSON. No markdown fences.
Format:
{"folders":["Folder A","Folder B"],"moves":[{"fileId":"abc","targetFolderName":"Folder A"}]}

Rules:
- Create practical folders based on the files provided.
- Use at most 8 folders.
- Every move must reference an exact fileId from the inventory.
- targetFolderName must be one of the folders you propose.
- Skip files that should stay where they are.
- Favor simple, human folder names like Finance, Hiring, Meetings, Decks, Docs, Legal, Product, Misc.
- Do not invent fileIds.
- Do not include explanations outside JSON.`,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Drive organization planning failed: ${response.status}`);
  }

  const data = await response.json();
  const reply = String(data.reply || "").trim();
  const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\{[\s\S]*\})/);
  const json = (match?.[1] ?? match?.[0] ?? reply).trim();
  const parsed = JSON.parse(json);
  return {
    folders: Array.isArray(parsed?.folders) ? parsed.folders.map((item) => String(item || "").trim()).filter(Boolean) : [],
    moves: Array.isArray(parsed?.moves) ? parsed.moves : [],
  };
}

function bgValidateDriveOrganizationPlan(files, plan) {
  const fileMap = new Map((Array.isArray(files) ? files : []).map((file) => [String(file.id), file]));
  const normalizedFolders = Array.from(new Set((Array.isArray(plan?.folders) ? plan.folders : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)));
  const allowedFolders = new Set(normalizedFolders);
  const moves = [];

  for (const move of Array.isArray(plan?.moves) ? plan.moves : []) {
    const fileId = String(move?.fileId || "").trim();
    const targetFolderName = String(move?.targetFolderName || "").trim();
    if (!fileId || !targetFolderName) continue;
    const file = fileMap.get(fileId);
    if (!file) continue;
    if (!allowedFolders.has(targetFolderName)) continue;
    moves.push({
      fileId,
      fileName: file.name,
      currentParentIds: Array.isArray(file.parentIds) ? file.parentIds : [],
      targetFolderName,
    });
  }

  const foldersToCreate = Array.from(new Set(moves.map((move) => move.targetFolderName)));
  return { foldersToCreate, moves };
}

async function bgRunAdapterStep({ history, description, type, run, onProgress, onResult }) {
  if (onProgress) await onProgress(description);
  const result = await run();
  history.push({ type: type || "adapter", description, result });
  if (onResult) await onResult({ description, type: type || "adapter", result });
  if (result?.error) throw new Error(result.error);
  return result;
}

// Find the Spotify web-player tab (prefer the one actually playing audio).
async function bgFindSpotifyTab() {
  try {
    const tabs = await chrome.tabs.query({ url: ["*://open.spotify.com/*", "*://*.spotify.com/*"] });
    return tabs.find((t) => t.audible) || tabs[0] || null;
  } catch {
    return null;
  }
}

async function bgTryHandleSiteAdapterTask({ tabId, task, history, onProgress, onResult, shouldStop, connectorHint }) {
  const siteContext = await bgGetSiteAdapterContext(tabId);
  const parsed = bgParseAdapterTask(task, siteContext, connectorHint);
  console.log("[Braino][Adapter][BG] Parsed task:", { task, tabId, siteContext, connectorHint, parsed });
  if (!parsed) return null;

  if (parsed.adapter === "google-calendar" && parsed.intent === "needsDetails") {
    return parsed.message || "Tell me the missing Calendar details and I’ll handle it.";
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "createEvent") {
    let inviteEmails = Array.isArray(parsed.attendees)
      ? parsed.attendees.map((email) => bgNormalizeEmail(email)).filter(Boolean)
      : [];
    let inviteLabel = inviteEmails.length ? inviteEmails.join(", ") : "";
    if (!inviteEmails.length && parsed.attendeeName) {
      const resolvedContact = await bgResolveBrainoContact(parsed.attendeeName, {
        tabId,
        requireEmail: true,
        actionLabel: "calendar invites",
      });
      if (!resolvedContact.ok) return resolvedContact.message || bgBuildMissingContactMessage(parsed.attendeeName, "calendar invites");
      inviteEmails = resolvedContact.contact?.email ? [resolvedContact.contact.email] : [];
      inviteLabel = bgFormatContactLabel(resolvedContact.contact, parsed.attendeeName);
    }

    const result = await bgRunAdapterStep({
      history,
      description: `Create Calendar event "${parsed.summary}"`,
      type: "googleCalendarCreateEvent",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "create_event",
        summary: parsed.summary,
        start: parsed.start,
        end: parsed.end,
        attendees: inviteEmails,
        createMeet: parsed.createMeet !== false,
        description: "Created by Braino.",
      }),
    });

    const event = result?.event;
    if (event?.htmlLink) {
      await bgRunAdapterStep({
        history,
        description: "Open the Google Calendar event",
        type: "navigate",
        onProgress,
        onResult,
        run: () => bgOpenCalendarUrlInTab(tabId, event.htmlLink, "Open the Google Calendar event"),
      });
    }

    const attendeeNote = inviteEmails.length
      ? `Invite sent to ${inviteLabel || "your contact"}.`
      : parsed.attendeeName
        ? `I created it, but I did not send an invite because I only heard "${parsed.attendeeName}", not an email address.`
        : "No attendee email was provided, so it is on your calendar only.";
    const meetLine = event?.meetUrl ? `\nMeet link: ${event.meetUrl}` : "";
    return `Scheduled **${event?.summary || parsed.summary}** for **${bgFormatCalendarWhen(event)}**. ${attendeeNote}${meetLine}`;
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "listEvents") {
    const result = await bgRunAdapterStep({
      history,
      description: "Read upcoming Google Calendar events",
      type: "googleCalendarListEvents",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "list_events",
        query: parsed.query || undefined,
        timeMin: parsed.timeMin,
        timeMax: parsed.timeMax,
        maxResults: 8,
      }),
    });
    const events = Array.isArray(result?.events) ? result.events : [];
    if (!events.length) return "I checked your Google Calendar and did not find events in that window.";
    return `Here’s what I found on your Google Calendar:\n${events.map(bgFormatCalendarEventLine).join("\n")}`;
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "rescheduleEvent") {
    const event = await bgRunAdapterStep({
      history,
      description: parsed.query ? `Find Calendar event matching "${parsed.query}"` : "Find upcoming Calendar event",
      type: "googleCalendarFindEvent",
      onProgress,
      onResult,
      run: () => bgFindCalendarEvent(parsed),
    });
    const result = await bgRunAdapterStep({
      history,
      description: `Reschedule "${event.summary}"`,
      type: "googleCalendarRescheduleEvent",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "reschedule_event",
        eventId: event.id,
        start: parsed.start,
        end: parsed.end,
      }),
    });
    const updated = result?.event;
    if (updated?.htmlLink) {
      await bgOpenCalendarUrlInTab(tabId, updated.htmlLink, "Open the rescheduled Calendar event");
    }
    return `Rescheduled **${updated?.summary || event.summary}** to **${bgFormatCalendarWhen(updated)}**.`;
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "cancelEvent") {
    const event = await bgRunAdapterStep({
      history,
      description: parsed.query ? `Find Calendar event matching "${parsed.query}"` : "Find upcoming Calendar event",
      type: "googleCalendarFindEvent",
      onProgress,
      onResult,
      run: () => bgFindCalendarEvent(parsed),
    });
    await bgRunAdapterStep({
      history,
      description: `Cancel "${event.summary}"`,
      type: "googleCalendarCancelEvent",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "cancel_event",
        eventId: event.id,
      }),
    });
    return `Cancelled **${event.summary || "that Calendar event"}**.`;
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "forwardEvent") {
    const event = await bgRunAdapterStep({
      history,
      description: parsed.query ? `Find Calendar event matching "${parsed.query}"` : "Find upcoming Calendar event",
      type: "googleCalendarFindEvent",
      onProgress,
      onResult,
      run: () => bgFindCalendarEvent(parsed),
    });
    const result = await bgRunAdapterStep({
      history,
      description: `Add attendees to "${event.summary}"`,
      type: "googleCalendarForwardEvent",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "forward_event",
        eventId: event.id,
        attendees: parsed.attendees,
      }),
    });
    const updated = result?.event;
    return `Forwarded **${updated?.summary || event.summary}** to ${parsed.attendees.join(", ")}.`;
  }

  if (parsed.adapter === "google-calendar" && parsed.intent === "openNextMeet") {
    const result = await bgRunAdapterStep({
      history,
      description: "Find next Google Meet on Calendar",
      type: "googleCalendarOpenNextMeet",
      onProgress,
      onResult,
      run: () => bgCallCalendarFunction("google-calendar-action", {
        action: "open_next_meet",
        timeMin: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        timeMax: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        maxResults: 10,
      }),
    });
    const event = result?.event;
    if (!event?.meetUrl) return "I checked your Calendar but couldn’t find an upcoming event with a Google Meet link.";
    await bgRunAdapterStep({
      history,
      description: `Open Google Meet for "${event.summary}"`,
      type: "navigate",
      onProgress,
      onResult,
      run: () => bgOpenCalendarUrlInTab(tabId, event.meetUrl, "Open Google Meet"),
    });
    await bgSendInlineUiMessage(tabId, { action: "startMeetingRecording" });
    return `Opening **${event.summary || "your meeting"}** now. I’ll start Meeting & Call mode on the Meet tab if the page allows it.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "addSongToPlaylist") {
    await bgRunAdapterStep({
      history,
      description: `Open Spotify search for "${parsed.song}"`,
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: bgBuildSpotifyTrackSearchUrl(parsed.song),
          description: `Open Spotify search for "${parsed.song}"`,
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 6000);
          await bgDelay(900);
        }
        return result;
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: `Add "${parsed.song}" to the exact playlist "${parsed.playlist}"`,
      type: "spotifyAddTrackToPlaylist",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "spotifyAddTrackToPlaylist",
        songName: parsed.song,
        playlistName: parsed.playlist,
      }),
    });

    return `Added **${parsed.song}** to **${parsed.playlist}** on Spotify.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSongFromPlaylist") {
    const result = await bgRunAdapterStep({
      history,
      description: `Play "${parsed.song}" from "${parsed.playlist}" on Spotify`,
      type: "spotify_playlist_play",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-play-from-playlist", {
        playlistName: parsed.playlist,
        songName: parsed.song,
      }),
    });

    return `Playing **${result?.track?.name || parsed.song}** from **${result?.playlistName || parsed.playlist}** on Spotify. ♫`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "setVolume") {
    // Prefer the Spotify web-player tab (the one Braino opens): the Web API can't set
    // its volume, but we can set the media element directly. Fall back to the API for
    // real devices (desktop/phone) only when no web tab is open.
    const spotifyTab = await bgFindSpotifyTab();
    if (spotifyTab?.id != null) {
      const res = await bgRunAdapterStep({
        history,
        description: parsed.volumePercent != null ? `Set Spotify volume to ${parsed.volumePercent}%` : "Adjust Spotify volume",
        type: "spotify_volume",
        onProgress,
        onResult,
        run: () => bgExecuteSiteAdapterAction(spotifyTab.id, {
          type: "spotifySetVolume",
          volumePercent: typeof parsed.volumePercent === "number" ? parsed.volumePercent : null,
          volumeStep: parsed.volumeStep || 0,
        }),
      });
      if (res?.ok) return `Volume set to ${res.volumePercent}%.`;
      return "I couldn't change the volume — make sure a song is actually playing in the Spotify tab.";
    }

    // No web player open — try the API (works only for active real devices).
    let volumePercent = typeof parsed.volumePercent === "number" ? parsed.volumePercent : null;
    if (volumePercent == null) {
      const playerState = await bgFetchSpotifyPlayerState();
      const current = typeof playerState?.volumePercent === "number" ? playerState.volumePercent : 50;
      volumePercent = Math.min(100, Math.max(0, current + (parsed.volumeStep || 0)));
    }
    await bgRunAdapterStep({
      history,
      description: `Set Spotify volume to ${volumePercent}%`,
      type: "spotify_volume",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-playback", { action: "volume", volumePercent }),
    });
    return `Volume set to ${volumePercent}%.`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playbackControl") {
    await bgRunAdapterStep({
      history,
      description: `Spotify ${parsed.control}`,
      type: "spotify_control",
      onProgress,
      onResult,
      run: () => bgCallSpotifyFunction("spotify-playback", { action: parsed.control }),
    });

    const summaryMap = {
      pause: "Paused Spotify.",
      play: "Resumed Spotify.",
      next: "Skipped to the next track.",
      previous: "Went back to the previous track.",
    };
    return summaryMap[parsed.control] || "Done.";
  }

  if (parsed.adapter === "spotify" && parsed.intent === "playSong") {
    const searchResult = await bgRunAdapterStep({
      history,
      description: `Searching Spotify for "${parsed.song}"`,
      type: "spotify_search",
      onProgress,
      onResult,
      run: async () => {
        const data = await bgCallSpotifyFunction("spotify-search", { query: parsed.song, limit: 5 });
        const track = data?.tracks?.[0];
        if (!track) return { error: `No Spotify track found for "${parsed.song}".` };
        return { success: true, track };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    const track = searchResult?.track;
    if (!track?.uri) throw new Error(`Couldn't find "${parsed.song}" on Spotify.`);

    await bgRunAdapterStep({
      history,
      description: `Playing "${track.name}" by ${track.artists?.join(", ") || "unknown"}`,
      type: "spotify_play",
      onProgress,
      onResult,
      run: () => bgPlaySpotifyWithAutoOpen([track.uri]),
    });

    return `Playing **${track.name}** by ${track.artists?.join(", ") || "unknown"} ♫`;
  }

  if (parsed.adapter === "spotify" && parsed.intent === "addCurrentPageSong") {
    const pageSnapshot = await bgGetPageSnapshot(tabId);
    const rawTitle = String(pageSnapshot?.title || "").trim();
    if (!rawTitle) throw new Error("I couldn't read the current page title. Make sure you're on YouTube or a music page.");

    const songQuery = bgExtractSongFromPageTitle(rawTitle, pageSnapshot?.url || "");

    const searchResult = await bgRunAdapterStep({
      history,
      description: `Search Spotify for "${songQuery}"`,
      type: "spotify_search",
      onProgress,
      onResult,
      run: async () => {
        const data = await bgCallSpotifyFunction("spotify-search", { query: songQuery, limit: 1 });
        const track = data?.tracks?.[0];
        if (!track) return { error: `No Spotify track found for "${songQuery}".` };
        return { success: true, track };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    const track = searchResult.track;
    const destination = parsed.playlist ? `playlist "${parsed.playlist}"` : "Liked Songs";

    await bgRunAdapterStep({
      history,
      description: `Add "${track.name}" by ${track.artists?.join(", ") || "unknown"} to ${destination}`,
      type: "spotify_add_track",
      onProgress,
      onResult,
      run: async () => {
        const payload = parsed.playlist
          ? { action: "addToPlaylist", trackId: track.id, playlistName: parsed.playlist }
          : { action: "like", trackId: track.id };
        return bgCallSpotifyFunction("spotify-add-track", payload);
      },
    });

    const artistStr = track.artists?.length ? ` by ${track.artists.join(", ")}` : "";
    return `Added **${track.name}**${artistStr} to **${destination}** on Spotify.`;
  }

  if (parsed.adapter === "google-docs" && parsed.intent === "researchArticle") {
    const draft = await bgRunAdapterStep({
      history,
      description: `Research "${parsed.topic}" on the live web`,
      type: "web_search",
      onProgress,
      onResult,
      run: async () => {
        const article = await bgBuildArticleDraftFromSearch(parsed.topic);
        return { success: true, ...article };
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: "Open a fresh Google Doc",
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: "https://docs.new",
          description: "Open a fresh Google Doc",
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 8000);
          await bgDelay(1800);
        }
        return result;
      },
    });

    if (shouldStop?.()) throw new Error("Stopped.");

    await bgRunAdapterStep({
      history,
      description: "Write the article into the Google Doc body",
      type: "googleDocsWriteArticle",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "googleDocsWriteArticle",
        title: draft.title,
        body: draft.body,
      }),
    });

    return `Drafted an article about **${parsed.topic}** in a Google Doc.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "search") {
    if (siteContext?.site !== "gmail") {
      await bgRunAdapterStep({
        history,
        description: "Open Gmail",
        type: "navigate",
        onProgress,
        onResult,
        run: async () => {
          const result = await bgExecuteAgentAction(tabId, {
            type: "navigate",
            url: "https://mail.google.com/mail/u/0/#inbox",
            description: "Open Gmail",
          });
          if (!result?.error) {
            await bgWaitForTabReady(tabId, 8000);
            await bgDelay(1800);
          }
          return result;
        },
      });
    }

    await bgRunAdapterStep({
      history,
      description: `Search Gmail for "${parsed.query}"`,
      type: "gmailSearch",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailSearch",
        query: parsed.query,
      }),
    });

    return `Searched Gmail for **${parsed.query}**.`;
  }

  if (parsed.adapter === "gmail" && (parsed.intent === "draftEmail" || parsed.intent === "sendEmail")) {
    let recipientEmail = String(parsed.to || "").trim();
    let recipientLabel = recipientEmail;
    if (!bgLooksLikeEmailAddress(recipientEmail)) {
      const resolvedContact = await bgResolveBrainoContact(recipientEmail, {
        tabId,
        requireEmail: true,
        actionLabel: "email",
      });
      if (!resolvedContact.ok) return resolvedContact.message || bgBuildMissingContactMessage(recipientEmail, "email");
      recipientEmail = resolvedContact.contact?.email || "";
      recipientLabel = bgFormatContactLabel(resolvedContact.contact, parsed.to);
    }

    const composeUrl = bgBuildGmailComposeUrl({
      to: recipientEmail,
      subject: parsed.subject,
      body: parsed.body,
    });

    await bgRunAdapterStep({
      history,
      description: `Open Gmail compose for ${recipientLabel}`,
      type: "navigate",
      onProgress,
      onResult,
      run: async () => {
        const result = await bgExecuteAgentAction(tabId, {
          type: "navigate",
          url: composeUrl,
          description: `Open Gmail compose for ${recipientLabel}`,
        });
        if (!result?.error) {
          await bgWaitForTabReady(tabId, 8000);
          await bgDelay(1800);
        }
        return result;
      },
    });

    await bgRunAdapterStep({
      history,
      description: "Verify Gmail compose fields",
      type: "gmailFillCompose",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailFillCompose",
        to: recipientEmail,
        subject: parsed.subject || "",
        body: parsed.body,
      }),
    });

    if (parsed.intent === "sendEmail") {
      if (shouldStop?.()) throw new Error("Stopped.");
      await bgRunAdapterStep({
        history,
        description: "Send the Gmail message",
        type: "gmailSendOpenCompose",
        onProgress,
        onResult,
        run: () => bgExecuteSiteAdapterAction(tabId, {
          type: "gmailSendOpenCompose",
        }),
      });
      return `Sent the email to **${recipientLabel}**.`;
    }

    if (!parsed.subject && !parsed.body) {
      return `Opened a Gmail draft to **${recipientLabel}**.`;
    }
    return `Drafted an email to **${recipientLabel}** in Gmail.`;
  }

  if (parsed.adapter === "gmail" && parsed.intent === "replyCurrentThread") {
    if (siteContext?.site !== "gmail") {
      return "Open the Gmail thread you want first, then ask me to reply and I’ll use the Gmail adapter.";
    }

    await bgRunAdapterStep({
      history,
      description: parsed.send ? "Reply in the current Gmail thread and send" : "Draft a reply in the current Gmail thread",
      type: "gmailReplyToCurrentThread",
      onProgress,
      onResult,
      run: () => bgExecuteSiteAdapterAction(tabId, {
        type: "gmailReplyToCurrentThread",
        body: parsed.body,
        send: !!parsed.send,
      }),
    });

    return parsed.send
      ? "Replied to the current Gmail thread."
      : "Drafted a reply in the current Gmail thread.";
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "search") {
    const result = await bgRunAdapterStep({
      history,
      description: `Search Google Drive for "${parsed.query}"`,
      type: "googleDriveSearch",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-search", {
        query: parsed.query,
        folderOnly: !!parsed.folderOnly,
      }),
    });

    const results = Array.isArray(result?.results) ? result.results : [];
    if (!results.length) {
      return `I searched Google Drive for **${parsed.query}** but didn’t find any matching ${parsed.folderOnly ? "folders" : "files"}.`;
    }

    const summary = results.slice(0, 3).map((item) => `- ${item.name} (${item.kind})`).join("\n");
    return `I found these matches in Google Drive for **${parsed.query}**:\n${summary}`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "organize") {
    const filesResult = await bgRunAdapterStep({
      history,
      description: "Read your Google Drive files",
      type: "googleDriveListFiles",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-list-files", { pageSize: 250 }),
    });

    const files = Array.isArray(filesResult?.files) ? filesResult.files : [];
    if (!files.length) {
      return "I couldn't see any Google Drive files to organize. Reconnect Drive with the latest permissions and try again.";
    }

    const planDraft = await bgRunAdapterStep({
      history,
      description: "Plan folders and file moves with AI",
      type: "googleDriveOrganizePlan",
      onProgress,
      onResult,
      run: async () => {
        const plan = await bgBuildDriveOrganizationPlan(files);
        return { success: true, ...plan };
      },
    });

    const plan = bgValidateDriveOrganizationPlan(files, planDraft);
    if (!plan.moves.length) {
      return `I scanned **${files.length}** Google Drive files, but there was nothing clear to reorganize.`;
    }

    const result = await bgRunAdapterStep({
      history,
      description: "Create folders and move files in Google Drive",
      type: "googleDriveOrganizeApply",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-organize-apply", { plan }),
    });

    return `Organized your Google Drive: scanned **${files.length}** files, created **${result?.createdFolderCount || 0}** folders, and moved **${result?.movedCount || 0}** files.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createFolder") {
    const result = await bgRunAdapterStep({
      history,
      description: `Create the Google Drive folder "${parsed.folderName}"`,
      type: "googleDriveCreateFolder",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-create-folder", {
        folderName: parsed.folderName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Drive folder **${result?.name || parsed.folderName}**.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "createDoc") {
    const result = await bgRunAdapterStep({
      history,
      description: `Create the Google Doc "${parsed.docName}" in Drive`,
      type: "googleDriveCreateDoc",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-create-doc", {
        docName: parsed.docName,
        parentFolderName: parsed.parentFolderName || undefined,
      }),
    });

    return `Created the Google Doc **${result?.name || parsed.docName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "rename") {
    const result = await bgRunAdapterStep({
      history,
      description: `Rename "${parsed.currentName}" to "${parsed.newName}" in Drive`,
      type: "googleDriveRename",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-rename", {
        currentName: parsed.currentName,
        newName: parsed.newName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Renamed **${result?.oldName || parsed.currentName}** to **${result?.name || parsed.newName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "move") {
    const result = await bgRunAdapterStep({
      history,
      description: `Move "${parsed.itemName}" to "${parsed.destinationFolderName}" in Drive`,
      type: "googleDriveMove",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-move", {
        itemName: parsed.itemName,
        destinationFolderName: parsed.destinationFolderName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Moved **${result?.name || parsed.itemName}** to **${result?.destinationFolderName || parsed.destinationFolderName}** in Drive.`;
  }

  if (parsed.adapter === "google-drive" && parsed.intent === "delete") {
    const result = await bgRunAdapterStep({
      history,
      description: `Delete "${parsed.itemName}" from Drive`,
      type: "googleDriveDelete",
      onProgress,
      onResult,
      run: () => bgCallGoogleDriveFunction("google-drive-delete", {
        itemName: parsed.itemName,
        targetKind: parsed.targetKind || undefined,
      }),
    });

    return `Deleted **${result?.name || parsed.itemName}** from Drive.`;
  }

  // ── Medium: search articles ──────────────────────────────────────────────────
  if (parsed.adapter === "medium" && parsed.intent === "searchArticles") {
    const query = (parsed.query || "").trim();
    if (!query) return "I couldn't tell what to search for on Medium — could you be more specific?";
    onProgress?.(`Searching Medium for "${query}"…`);
    await bgExecuteAgentAction(tabId, {
      type: "navigate",
      url: `https://medium.com/search?q=${encodeURIComponent(query)}&source=search_post&type=post`,
      description: `Search Medium for "${query}"`,
    });
    await bgWaitForTabReady(tabId, 7000);
    await bgDelay(2000);

    const result = await bgExecuteSiteAdapterAction(tabId, {
      type: "mediumReadSearchResults",
      limit: 5,
    });
    const articles = result?.articles || [];
    if (!articles.length) {
      return `I searched Medium for "${query}" but couldn't read the results — Medium may have loaded differently. Try opening it directly.`;
    }
    const list = articles.map((a, i) => `${i + 1}. ${a.title}`).join(". ");
    return `Here are the top articles on ${query}: ${list}`;
  }

  // ── Twitter / X: read feed ────────────────────────────────────────────────────
  if (parsed.adapter === "twitter" && parsed.intent === "readFeed") {
    onProgress?.("Opening your X feed…");
    await bgExecuteAgentAction(tabId, {
      type: "navigate",
      url: "https://x.com/home",
      description: "Open X home feed",
    });
    await bgWaitForTabReady(tabId, 7000);
    await bgDelay(2500);

    const result = await bgExecuteSiteAdapterAction(tabId, {
      type: "xReadFeed",
      limit: 5,
    });
    const posts = result?.posts || [];
    if (!posts.length) {
      return "Your X feed isn't loading right now — try opening X directly.";
    }
    const summary = posts
      .map(p => `${p.author} says: ${p.text.slice(0, 80)}${p.text.length > 80 ? "…" : ""}`)
      .join(". ");
    return `Here's what's on your feed: ${summary}`;
  }

  // ── Twitter / X: generate ideas + post ────────────────────────────────────────
  if (parsed.adapter === "twitter" && parsed.intent === "generateAndPost") {
    onProgress?.("Generating post ideas…");
    const persona = await bgLoadXPersona().catch(() => ({}));
    const personaText = [
      persona.bio ? `Bio: ${persona.bio}` : "",
      persona.building ? `Building: ${persona.building}` : "",
      persona.toneNotes ? `Tone: ${persona.toneNotes}` : "",
    ].filter(Boolean).join("\n");

    const topicHint = parsed.topic ? ` about "${parsed.topic}"` : "";
    const resp = await bgChatFetch({
      notes: "You generate tweet-length post ideas. Return ONLY a JSON array of exactly 3 strings, no markdown, no explanation.",
      message: `${personaText ? `User persona:\n${personaText}\n\n` : ""}Generate 3 sharp, specific post ideas${topicHint}. Each under 200 characters, actionable and authentic to the user's voice.`,
    });
    let ideas = [];
    try {
      const data = await resp.json();
      const reply = (data.reply || "").trim();
      const jsonMatch = reply.match(/\[[\s\S]+?\]/);
      if (jsonMatch) ideas = JSON.parse(jsonMatch[0]);
    } catch (_) {}

    if (!ideas.length) return "Couldn't generate post ideas right now — try again.";

    // Post the first idea
    const tweetText = ideas[0];
    onProgress?.("Posting to X…");
    await bgExecuteAgentAction(tabId, { type: "navigate", url: "https://x.com/compose/tweet", description: "Open X compose" });
    await bgWaitForTabReady(tabId, 5000);
    await bgDelay(1200);
    await bgExecuteAgentAction(tabId, { type: "click", selector: "[data-testid='tweetTextarea_0']", targetText: "", description: "Focus tweet box" });
    await bgDelay(300);
    await bgExecuteAgentAction(tabId, { type: "type", selector: "[data-testid='tweetTextarea_0']", text: tweetText, description: "Type tweet" });
    await bgDelay(500);
    await bgExecuteAgentAction(tabId, { type: "click", selector: "[data-testid='tweetButtonInline'], [data-testid='tweetButton']", targetText: "Post", description: "Post tweet" });

    const preview = tweetText.length > 60 ? `${tweetText.slice(0, 60)}…` : tweetText;
    const ideaList = ideas.map((idea, i) => `${i + 1}. ${idea}`).join(" | ");
    return `Posted: "${preview}". Here are all 3 ideas I came up with: ${ideaList}`;
  }

  // ── Twitter / X: post specific content ────────────────────────────────────────
  if (parsed.adapter === "twitter" && parsed.intent === "postTweet" && parsed.content) {
    onProgress?.("Posting to X…");
    await bgExecuteAgentAction(tabId, { type: "navigate", url: "https://x.com/compose/tweet", description: "Open X compose" });
    await bgWaitForTabReady(tabId, 5000);
    await bgDelay(1200);
    await bgExecuteAgentAction(tabId, { type: "click", selector: "[data-testid='tweetTextarea_0']", targetText: "", description: "Focus tweet box" });
    await bgDelay(300);
    await bgExecuteAgentAction(tabId, { type: "type", selector: "[data-testid='tweetTextarea_0']", text: parsed.content, description: "Type tweet" });
    await bgDelay(500);
    await bgExecuteAgentAction(tabId, { type: "click", selector: "[data-testid='tweetButtonInline'], [data-testid='tweetButton']", targetText: "Post", description: "Post tweet" });
    return `Posted to X: "${parsed.content.slice(0, 80)}${parsed.content.length > 80 ? "…" : ""}"`;
  }

  return null;
}

function bgBuildMediumFastPath(task) {
  const raw = String(task || "").trim();
  const t = raw.toLowerCase();
  if (!/\bmedium(?:\.com)?\b/i.test(t)) return null;

  const isPlainOpen = /^(?:open|go to|navigate to|visit)\s+(?:https?:\/\/)?(?:www\.)?medium\.com\/?\s*$/i.test(raw);
  if (isPlainOpen) {
    return [{ type: "navigate", url: "https://medium.com", description: "Open Medium" }];
  }

  const wantsMediumSearch =
    /\b(find|search|look for|pull up|bring up|read|show|get)\b/i.test(raw) ||
    /\b(articles?|posts?|blogs?|stories?)\b/i.test(raw) ||
    /\b(over there|on there|in there|there)\b/i.test(raw);

  if (!wantsMediumSearch) {
    return [{ type: "navigate", url: "https://medium.com", description: "Open Medium" }];
  }

  let query = raw.toLowerCase();
  query = query
    .replace(/https?:\/\/(?:www\.)?medium\.com\/?/gi, " ")
    .replace(/\b(?:www\.)?medium\.com\b/gi, " ")
    .replace(/\bmedium\b/gi, " ")
    .replace(/\b(?:braino|bino|brno|broani|broino)\b/gi, " ")
    .replace(/\b(?:can|could|would)\s+you\b/gi, " ")
    .replace(/\b(?:please|me|some|a few|the|an?|for me)\b/gi, " ")
    .replace(/\b(?:open|go to|navigate to|navigate|visit|find|search(?: for)?|look for|pull up|bring up|read|show|get)\b/gi, " ")
    .replace(/\b(?:articles?|posts?|blogs?|stories?|results?)\b/gi, " ")
    .replace(/\b(?:over there|on there|in there|there|on|in|at|about|around|regarding)\b/gi, " ")
    .replace(/\band\b/gi, " ")
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!query) {
    return [{ type: "navigate", url: "https://medium.com", description: "Open Medium" }];
  }

  return [{
    type: "navigate",
    url: `https://medium.com/search?q=${encodeURIComponent(query)}`,
    description: `Search Medium for "${query}"`,
  }];
}

function bgEncodeMapsPath(value) {
  return encodeURIComponent(String(value || "").trim()).replace(/%20/g, "+");
}

function bgIsPersonalMapsLocation(value) {
  const text = String(value || "").toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  return /\b(my\s+)?(house|home|place|current location|location)\b/.test(text)
    || /\b(where i am|where i'm at|near me|around me|by me|close to me)\b/.test(text);
}

function bgNormalizeMapsEndpoint(value) {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  return bgIsPersonalMapsLocation(raw) ? "My Location" : raw;
}

function bgCleanGoogleMapsQuery(value) {
  const raw = String(value || "").trim();
  const mealIntent = /\b(?:eat|eating|food|dinner|lunch|breakfast|brunch)\b/i.test(raw);
  const wantsLocalAnchor = /\b(?:nearest|closest|nearby|near me|around me|by me|close to me|my house|my home|at home|from home|where i am|where i'm at|current location)\b/i.test(raw);
  const hasExplicitNamedLocation = /\b(?:in|at|near|around)\s+(?!me\b|my\b|home\b|house\b|current\b)[a-z0-9][a-z0-9\s-]{1,40}/i.test(raw);
  let query = raw
    .replace(/\bnear me\b/gi, "__NEAR_ME__")
    .replace(/\baround me\b/gi, "__AROUND_ME__")
    .replace(/\b(?:near|around|by|close to|to|from)\s+(?:my\s+)?(?:house|home|place|current location|location)\b/gi, "__NEAR_ME__")
    .replace(/\b(?:my\s+)?(?:house|home|place|current location|location)\b/gi, "__NEAR_ME__")
    .replace(/\bwhere\s+i(?:\s+am|'m\s+at)\b/gi, "__NEAR_ME__");
  query = query
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\bwhat(?:'s|\s+is)\b/gi, " ")
    .replace(/\b(?:braino|bino|brno|broani|broino)\b/gi, " ")
    .replace(/\b(?:can|could|would)\s+you\b/gi, " ")
    .replace(/\bon\s+(?:google\s+)?maps?\b/gi, " ")
    .replace(/\bwhere\s+(?:should|can|could|do)\s+i(?:\s+go)?(?:\s+to)?\b/gi, " ")
    .replace(/\bwhere\s+to\b/gi, " ")
    .replace(/\bi\s+(?:should|can|could|want\s+to|wanna)\s+(?:eat|go)\b/gi, " ")
    .replace(/\b(?:please|pls|for me|some|a few|the|an?)\b/gi, " ")
    .replace(/\b(?:nearest|closest|nearby)\b/gi, " ")
    .replace(/\b(?:open|show|display|pull up|bring up|find|search(?: for)?|look for|look up|get|give|recommend|suggest)\b/gi, " ")
    .replace(/\b(?:google\s+)?maps?\b/gi, " ")
    .replace(/\b(?:eat|eating|food|places?)\b/gi, " ")
    .replace(/\bon\b/gi, " ")
    .replace(/__NEAR_ME__/g, "near me")
    .replace(/__AROUND_ME__/g, "around me")
    .replace(/\s+/g, " ")
    .trim();
  if (wantsLocalAnchor && !hasExplicitNamedLocation && !/\b(?:near me|around me)\b/i.test(query)) {
    query = `${query} near me`.replace(/\s+/g, " ").trim();
  }
  if (mealIntent && !/\b(?:restaurants?|cafes?|coffee|bars?|pubs?)\b/i.test(query)) {
    const mealKind = query.match(/\b(dinner|lunch|breakfast|brunch)\b/i)?.[1];
    query = mealKind
      ? query.replace(/\b(dinner|lunch|breakfast|brunch)\b/i, `${mealKind} restaurants`)
      : `restaurants ${query}`;
    query = query.replace(/\s+/g, " ").trim();
  }
  return query || raw;
}

function bgLooksLikeGoogleMapsPlaceTask(task) {
  const t = String(task || "").toLowerCase().replace(/[?!.,]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return false;
  if (/\b(?:google\s+)?maps?\b/.test(t)) {
    return /\b(open|show|search|find|look up|recommend|suggest|directions?|route|near|nearby|around|in|to)\b/.test(t);
  }
  if (/\b(?:directions?|route|navigate)\b.+\b(?:from|to)\b/.test(t)) return true;
  if (/\b(how far|distance|eta|travel time)\b.+\b(from|to|between)\b/.test(t)) return true;

  const wantsPlaceRecommendation = /\b(recommend|suggest|find|show|look for|search for|where should i|where can i|best|good|nearby|nearest|closest)\b/.test(t);
  if (!wantsPlaceRecommendation) return false;

  const placeCategory = /\b(restaurants?|cafes?|coffee|dinner|lunch|breakfast|brunch|food|eat|eating|places?|bars?|pubs?|hotels?|hospitals?|clinics?|pharmac(?:y|ies)|gyms?|parks?|theat(?:er|re)s?|movie\s+theat(?:er|re)s?|cinemas?|shops?|stores?|salons?|spas?)\b/.test(t);
  const locationHint = /\b(near me|nearby|around me|by me|close to me|my house|my home|at home|from home|where i am|current location|nearest|closest|in\s+[a-z0-9][a-z0-9\s-]{1,40}|near\s+[a-z0-9][a-z0-9\s-]{1,40}|around\s+[a-z0-9][a-z0-9\s-]{1,40}|at\s+[a-z0-9][a-z0-9\s-]{1,40})\b/.test(t);
  return placeCategory && locationHint;
}

function bgBuildGoogleMapsFastPath(task, synth = null) {
  const raw = String(task || "").trim();
  const t = raw.toLowerCase();
  if (!bgLooksLikeGoogleMapsPlaceTask(raw)) return null;

  const directionsMatch =
    raw.match(/(?:directions?|route|navigate)\s+from\s+(.+?)\s+to\s+(.+?)(?:\s+(?:please|pls|for me))?$/i) ||
    raw.match(/(?:directions?|route|navigate)\s+to\s+(.+?)\s+from\s+(.+?)(?:\s+(?:please|pls|for me))?$/i) ||
    raw.match(/how\s+far\s+is\s+(.+?)\s+from\s+(.+?)(?:\s+(?:please|pls|for me))?$/i) ||
    raw.match(/(?:distance|eta|travel\s+time)\s+(?:from\s+(.+?)\s+to\s+(.+?)|between\s+(.+?)\s+and\s+(.+?))(?:\s+(?:please|pls|for me))?$/i);

  if (directionsMatch) {
    const first = (directionsMatch[1] || directionsMatch[3] || "").trim();
    const second = (directionsMatch[2] || directionsMatch[4] || "").trim();
    const isToFrom = /\bto\b.+\bfrom\b/i.test(raw) && !/\bfrom\b.+\bto\b/i.test(raw);
    const isHowFarFrom = /^how\s+far\s+is\b/i.test(raw);
    const origin = bgNormalizeMapsEndpoint((isToFrom || isHowFarFrom) ? second : first);
    const destination = bgNormalizeMapsEndpoint((isToFrom || isHowFarFrom) ? first : second);
    return [{
      type: "navigate",
      url: `https://www.google.com/maps/dir/${bgEncodeMapsPath(origin)}/${bgEncodeMapsPath(destination)}`,
      description: `Open Google Maps directions from "${origin}" to "${destination}"`,
      continueAfter: true,
    }];
  }

  // Structured-directions fallback: if the regex missed but the understanding layer parsed a
  // destination (and maybe an origin), use the deterministic deep link. Blank origin = current location.
  if (synth?.directions?.destination) {
    const dest = bgNormalizeMapsEndpoint(synth.directions.destination);
    const org = synth.directions.origin ? bgNormalizeMapsEndpoint(synth.directions.origin) : "";
    const url = org
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(org)}&destination=${encodeURIComponent(dest)}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`;
    return [{
      type: "navigate",
      url,
      description: org ? `Open Google Maps directions from "${org}" to "${dest}"` : `Open Google Maps directions to "${dest}"`,
      continueAfter: true,
    }];
  }

  let query = "";
  // Prefer the synthesized keyword query (understood intent) over the user's raw sentence.
  if (synth && synth.searchQuery && (synth.surface === "maps" || synth.surface === "none")) {
    query = synth.searchQuery.trim();
  }
  if (!query) {
    const mapsSearchMatch = raw.match(/(?:search|find|look up|show|open)\s+(.+?)\s+on\s+(?:google\s+)?maps/i);
    if (mapsSearchMatch) query = mapsSearchMatch[1].trim();
  }
  if (!query) query = bgCleanGoogleMapsQuery(raw);
  if (!query) return null;

  return [{
    type: "navigate",
    url: `https://www.google.com/maps/search/${bgEncodeMapsPath(query)}`,
    description: `Search Google Maps for "${query}"`,
    continueAfter: true,
  }];
}

function bgCleanLinkedInJobText(value) {
  return String(value || "")
    .replace(/\b(?:braino|bino|brno|broani|broino)\b/gi, " ")
    .replace(/\b(?:can|could|would)\s+you\b/gi, " ")
    .replace(/\b(?:please|pls|for me|for|and|me|some|a few|the|an?|find|search|look for|look up|show|pull up|bring up|get|open|linkedin|linked in)\b/gi, " ")
    .replace(/\b(?:jobs?|roles?|positions?|openings?|vacancies|hiring|career|careers)\b/gi, " ")
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bgNormalizeLinkedInLocation(value) {
  const cleaned = bgCleanLinkedInJobText(value)
    .replace(/\b(?:in|at|near|around|located in|location)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  const cityMap = {
    hyd: "Hyderabad",
    hyderabad: "Hyderabad",
    bangalore: "Bengaluru",
    bengaluru: "Bengaluru",
    blr: "Bengaluru",
    bombay: "Mumbai",
    mumbai: "Mumbai",
    pune: "Pune",
    delhi: "Delhi",
    ncr: "Delhi NCR",
    gurgaon: "Gurugram",
    gurugram: "Gurugram",
    noida: "Noida",
    chennai: "Chennai",
  };
  return cityMap[lower] || cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function bgParseLinkedInJobsTask(task) {
  const raw = String(task || "").trim();
  if (!raw) return null;

  const wantsJobs = /\b(jobs?|roles?|positions?|openings?|vacancies|hiring|career|careers)\b/i.test(raw);
  const wantsLinkedIn = /\b(linkedin|linked\s*in)\b/i.test(raw);
  const wantsSearch = /\b(find|search|look for|look up|show|pull up|bring up|get|open)\b/i.test(raw);
  if (!wantsJobs && !(wantsLinkedIn && wantsSearch)) return null;

  const patterns = [
    /(?:find|search|look for|look up|show|pull up|bring up|get|open)\s+(?:me\s+)?(.+?)\s+(?:jobs?|roles?|positions?|openings?|vacancies)\s+(?:in|at|near|around)\s+(.+?)(?:\s+(?:for me|please|pls))?$/i,
    /(.+?)\s+(?:jobs?|roles?|positions?|openings?|vacancies)\s+(?:in|at|near|around)\s+(.+?)(?:\s+(?:for me|please|pls))?$/i,
    /(?:jobs?|roles?|positions?|openings?|vacancies)\s+(?:for|as)\s+(.+?)\s+(?:in|at|near|around)\s+(.+?)(?:\s+(?:for me|please|pls))?$/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (!match) continue;
    const role = bgCleanLinkedInJobText(match[1]);
    const location = bgNormalizeLinkedInLocation(match[2]);
    if (role && location) return { role, location };
  }

  if (!wantsLinkedIn) return null;
  const roleOnly = bgCleanLinkedInJobText(raw);
  return roleOnly ? { role: roleOnly, location: "" } : null;
}

function bgBuildLinkedInJobsFastPath(task) {
  const parsed = bgParseLinkedInJobsTask(task);
  if (!parsed?.role) return null;

  const params = new URLSearchParams();
  params.set("keywords", parsed.role);
  if (parsed.location) params.set("location", parsed.location);

  return [{
    type: "navigate",
    url: `https://www.linkedin.com/jobs/search/?${params.toString()}`,
    description: `Search LinkedIn Jobs for "${parsed.role}"${parsed.location ? ` in ${parsed.location}` : ""}`,
    continueAfter: true,
  }];
}

function bgIsLinkedInJobsTask(task) {
  return Boolean(bgParseLinkedInJobsTask(task));
}

function bgGetLinkedInJobsSkillGuide(task, currentUrl) {
  const parsed = bgParseLinkedInJobsTask(task);
  const onLinkedInJobs = /linkedin\.com\/jobs/i.test(currentUrl || "");
  if (!parsed && !onLinkedInJobs) return "";

  const role = parsed?.role || "the requested role";
  const location = parsed?.location || "the requested location";
  const searchUrl = parsed?.role
    ? `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(parsed.role)}${parsed.location ? `&location=${encodeURIComponent(parsed.location)}` : ""}`
    : "https://www.linkedin.com/jobs/search/";

  return `
── SKILL: LINKEDIN JOBS RESEARCH ──
Use this skill for LinkedIn job searches and job-fit recommendations.
Target search: role="${role}", location="${location}"
Start URL: ${searchUrl}

GOAL:
Return 3-5 relevant jobs. Inspect at least 3 jobs when LinkedIn shows 3+ relevant results. Do not stop after 1 job unless the user explicitly asks for one job or LinkedIn has fewer than 3 relevant results. Include title, company, location, job link, short description, key requirements, fit recommendation, and a final conclusion. Do NOT apply, save, message recruiters, or click Easy Apply unless the user explicitly asks and confirms.

FLOW:
1. If not already on LinkedIn Jobs results for the requested role/location, navigate to the Start URL.
2. wait 900, then read the results list to verify LinkedIn loaded. If login wall appears, clarify that the user must log in to LinkedIn.
3. If the user requested filters such as remote, hybrid, recent, internship, experience level, or easy apply, apply only those filters. Otherwise do not over-filter.
4. Read visible job cards first. Prefer selectors:
   - .jobs-search-results-list
   - ul.jobs-search-results__list
   - .scaffold-layout__list
   - [data-job-id]
   - .job-card-container
   - .job-card-list__title
   - .job-card-container__link
5. Open one relevant job at a time by clicking the card/title. After each click, wait 600, verify the details pane or job page changed, then read the full job detail area with maxChars 3500.
6. For job details, prefer selectors:
   - .jobs-search__job-details--container
   - .jobs-details
   - .jobs-description
   - .jobs-box__html-content
   - [class*="jobs-description"]
   - main
7. If a "Show more" or "See more" button appears in the description, click it before reading.
8. Remember each job before moving to the next. Capture link from current URL or the card href. If the details pane does not expose a unique link, include the visible card/job link from the page.
9. Stop after 3-5 solid jobs. Minimum 3 if available; target 5 when results are easy to inspect. Do not return done after only one job unless fewer than 3 relevant jobs exist.
10. Final done message must be markdown:
   ## Jobs I looked at for you in "${location}" for "${role}"
   - **Title - Company** (Location)
     Link: URL
     Description: 1-2 sentence summary
     Requirements: short bullets
     Fit: Strong / Maybe / Weak, with honest reason
   Final conclusion: Braino's honest take on which jobs to open/apply to first and what skill gap matters most.

FIT RULES:
- Do not invent the user's resume or experience.
- If no user profile/resume context is available, say "Based only on the job description, this looks..." and recommend what experience would make them a fit.
- Prefer honesty over hype. Mention missing requirements clearly.

LINKEDIN LOCATOR FALLBACKS:
Search keyword input: [aria-label*="Search by title"], [aria-label*="Search jobs"], [placeholder*="Search jobs"], input[id*="jobs-search-box-keyword"]
Location input: [aria-label*="City"], [aria-label*="location"], input[id*="jobs-search-box-location"]
Filter buttons: targetText="Date posted", targetText="Experience level", targetText="Remote", targetText="Easy Apply"
Job cards: [data-job-id], .job-card-container, .jobs-search-results__list-item, .job-card-list__title
Details panel: .jobs-search__job-details--container, .jobs-details, .jobs-description, .jobs-box__html-content, main
`;
}

function bgGetGoogleMapsSkillGuide(task, currentUrl) {
  const onGoogleMaps = /google\.[^/]+\/maps/i.test(currentUrl || "");
  if (!bgLooksLikeGoogleMapsPlaceTask(task) && !onGoogleMaps) return "";

  return `
── SKILL: GOOGLE MAPS PLACES ──
Use this skill for place lookup, recommendations, distance/ETA, visible Google Maps searches, directions, and phone handoff.

GOAL:
The user wants to SEE Google Maps, not just a memory-based list. Open or use Google Maps visibly first, inspect visible results, then recommend. Do not answer restaurant/place recommendations from memory.

FLOW:
1. If not already on Google Maps results/directions for the task, navigate using:
   - Search: https://www.google.com/maps/search/QUERY+with+spaces+as+plus
   - Directions: https://www.google.com/maps/dir/ORIGIN/DESTINATION
2. For "near me", "nearest", "closest", "my house", "home", or "where I am", assume the user's current/home context. Use "near me" in search URLs or "My Location" in directions URLs; do not ask where they are.
3. After navigation, wait 1200 and read the visible Maps page/results. Prefer reading main, [role="main"], [role="feed"], [aria-label*="Results"], or body text.
4. Recommend only places/routes visible on the Maps page or clearly returned by the page. Do not invent ratings, hours, distance, or open status.
5. For recommendation tasks, return 3-5 options when visible. Include name, area/address if visible, rating/open status if visible, and why it fits the user's constraints.
6. Pick one best option and explain why in one sentence.
7. End by asking: "Should I send {best pick} to your phone?"
8. If the user explicitly asks to ping/send it and no phone channel is configured, say the handoff is not set up yet and provide the Google Maps URL. Never claim it was sent.

FINAL MESSAGE FORMAT:
## Places I found on Google Maps
- **Name** — why it fits. Address/area/rating if visible.

Best pick: **Name** — reason.

Should I send **Name** to your phone?
`;
}

function bgTryFastPath(task, history, synth = null, geo = null) {
  if (history.length > 0) return null;
  const t = task.toLowerCase().trim();
  // A task that OPENS a place and then does more ("Go to amazon.com, search for X, and
  // buy it") must keep running after the navigate. Returning it as a bare open once
  // turned a whole buy task into navigate + "Done." — only a PURE open may finish here.
  const restAfterOpen = t.replace(/^(?:go to|open|navigate to|visit|new|create)\s+\S+/i, "");
  const opensThenActs = /\b(search|find|buy|purchase|order|add|play|book|apply|send|post|compose|reply|write|draft|create|schedule|email|read|check(?:out)?|cart|watch|download|type|fill|look)\b/i.test(restAfterOpen);
  if (/^(?:open|go to)\s+gmail\b/i.test(task)) {
    return [{ type: "navigate", url: "https://mail.google.com/mail/u/0/#inbox", description: "Open Gmail", continueAfter: opensThenActs }];
  }
  if (/^(?:open|go to)\s+(?:google\s+)?drive\b/i.test(task)) {
    return [{ type: "navigate", url: "https://drive.google.com", description: "Open Google Drive", continueAfter: opensThenActs }];
  }
  if (/^(?:open|go to)\s+(?:google\s+)?calendar\b/i.test(task)) {
    return [{ type: "navigate", url: "https://calendar.google.com/calendar/u/0/r", description: "Open Google Calendar", continueAfter: opensThenActs }];
  }
  if (/^(?:open|go to)\s+spotify\b/i.test(task)) {
    return [{ type: "navigate", url: "https://open.spotify.com", description: "Open Spotify", continueAfter: opensThenActs }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google doc\b|^(?:new|open)\s+docs\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://docs.new", description: "Open a new Google Doc", continueAfter: opensThenActs }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google sheet\b|^(?:new|open)\s+sheets\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://sheets.new", description: "Open a new Google Sheet", continueAfter: opensThenActs }];
  }
  if (/^(?:new|create|open)\s+(?:a\s+)?google slide\b|^(?:new|open)\s+slides\.new\b/i.test(task)) {
    return [{ type: "navigate", url: "https://slides.new", description: "Open a new Google Slide deck", continueAfter: opensThenActs }];
  }
  const googleMapsFastPath = bgBuildGoogleMapsFastPath(task, synth);
  if (googleMapsFastPath) return googleMapsFastPath;
  const mediumFastPath = bgBuildMediumFastPath(task);
  if (mediumFastPath) return mediumFastPath;
  const linkedInJobsFastPath = bgBuildLinkedInJobsFastPath(task);
  if (linkedInJobsFastPath) return linkedInJobsFastPath;
  const gotoMatch = t.match(/^(?:go to|open|navigate to|visit)\s+(?:https?:\/\/)?([a-z0-9.\-]+\.[a-z]{2,}(?:\/\S*)?)/i);
  if (gotoMatch) {
    const rawUrl = gotoMatch[1].startsWith("http") ? gotoMatch[1] : "https://" + gotoMatch[1];
    const url = bgLocalizeStorefront(rawUrl, geo);
    return [{ type: "navigate", url, description: `Navigate to ${url}`, continueAfter: opensThenActs }];
  }
  const ytMatch = t.match(/search\s+(.+?)\s+on\s+youtube/i) || t.match(/youtube\s+search\s+(.+)/i);
  if (ytMatch) {
    const q = encodeURIComponent(ytMatch[1].trim());
    return [{ type: "navigate", url: `https://www.youtube.com/results?search_query=${q}`, description: `Search YouTube for "${ytMatch[1]}"` }];
  }
  const gMatch = t.match(/(?:search\s+(.+?)\s+on\s+google|^google\s+(.+))/i);
  if (gMatch) {
    const q = encodeURIComponent((gMatch[1] || gMatch[2]).trim());
    return [{ type: "navigate", url: `https://www.google.com/search?q=${q}`, description: `Google search` }];
  }
  const spotifyMatch = t.match(/search\s+(.+?)\s+on\s+spotify/i) || t.match(/spotify\s+search\s+(.+)/i);
  if (spotifyMatch) {
    const query = (spotifyMatch[1] || spotifyMatch[2] || "").trim();
    const q = encodeURIComponent(query);
    return [{ type: "navigate", url: `https://open.spotify.com/search/${q}`, description: `Search Spotify for "${query}"` }];
  }
  const netflixMatch = t.match(/search\s+(.+?)\s+on\s+netflix/i) || t.match(/netflix\s+search\s+(.+)/i);
  if (netflixMatch) {
    const query = (netflixMatch[1] || netflixMatch[2] || "").trim();
    const q = encodeURIComponent(query);
    return [{ type: "navigate", url: `https://www.netflix.com/search?q=${q}`, description: `Search Netflix for "${query}"` }];
  }
  const mapDirectionsMatch = t.match(/(?:directions|route)\s+from\s+(.+?)\s+to\s+(.+)/i);
  if (mapDirectionsMatch) {
    const origin = encodeURIComponent(mapDirectionsMatch[1].trim());
    const destination = encodeURIComponent(mapDirectionsMatch[2].trim());
    return [{
      type: "navigate",
      url: `https://www.google.com/maps/dir/${origin}/${destination}`,
      description: `Open directions from "${mapDirectionsMatch[1].trim()}" to "${mapDirectionsMatch[2].trim()}"`,
    }];
  }
  const mapsSearchMatch = t.match(/(?:search|find|look up)\s+(.+?)\s+on\s+(?:google\s+)?maps/i);
  if (mapsSearchMatch) {
    const query = encodeURIComponent(mapsSearchMatch[1].trim());
    return [{
      type: "navigate",
      url: `https://www.google.com/maps/search/${query}`,
      description: `Search Google Maps for "${mapsSearchMatch[1].trim()}"`,
    }];
  }
  if (/^scroll\s+(down|up)/.test(t)) {
    const dir = t.includes("up") ? "up" : "down";
    return [{ type: "scroll", direction: dir, amount: 600, description: `Scroll ${dir}` }];
  }
  return null;
}

function bgGetPlatformGuide(url) {
  if (/mail\.google\.com/.test(url)) return `
── GMAIL (you are here) ──
Compose new email:
  1. navigate → https://mail.google.com/mail/u/0/#compose
  2. wait 1200
  3. [{"type":"type","selector":"[name='to']","targetText":"To","text":"RECIPIENT"},{"type":"pressKey","key":"Tab"},{"type":"type","selector":"[name='subjectbox']","text":"SUBJECT"}]
  4. pressKey Tab
  5. type body → selector="[role='textbox'][aria-label*='Message']" or targetText="Message Body"
  6. click Send → selector="[data-tooltip*='Send']" or [aria-label*="Send"] or targetText="Send"
Reply: click Reply (.amn or targetText="Reply") → wait 600 → type in [role='textbox'] → click Send
Search: click [aria-label="Search mail"] → type query → pressKey Enter`;
  if (/youtube\.com/.test(url)) return `
── YOUTUBE (you are here) ──
Search & play: navigate → https://www.youtube.com/results?search_query=QUERY (encode spaces as +)
  → wait 800 → click selector="ytd-video-renderer #video-title" or targetText=video title
Player controls:
  Play/Pause: selector=".ytp-play-button"
  Fullscreen: selector=".ytp-fullscreen-button"
  Mute: selector=".ytp-mute-button"
  Speed: click .ytp-settings-button → targetText="Playback speed"`;
  if (/netflix\.com/.test(url)) return `
── NETFLIX (you are here) ──
Search: navigate → https://www.netflix.com/search?q=QUERY → wait 1200
  → click first result card (targetText=show title) → wait 800 → click Play selector="[data-uia*='play']" or targetText="Play"
Season: selectOption selector="select[id*='season']" value="Season 2"
Episode: click episode card by targetText`;
  if (/x\.com|twitter\.com/.test(url)) return `
── TWITTER/X (you are here) ──
Post tweet: navigate → https://x.com/compose/tweet → wait 1200
  → type selector="[data-testid='tweetTextarea_0']" or selector="[role='textbox']"
  → wait 300
  → click selector="[data-testid='tweetButtonInline']" or selector="[data-testid='tweetButton']"
If the post button stays disabled, re-focus the actual textbox and type there. Do not use intent/tweet URLs.
Search: navigate → https://x.com/search?q=QUERY&src=typed_query
Like: click [data-testid="like"] on the tweet row`;
  if (/linkedin\.com/.test(url)) return `
── LINKEDIN (you are here) ──
Search people: navigate → https://www.linkedin.com/search/results/people/?keywords=NAME
Connect: click targetText="Connect" → click targetText="Send without a note"
Message: navigate to profile → click targetText="Message" → type [aria-label*="Write a message"] → pressKey Enter`;
  if (/amazon\./.test(url)) return `
── AMAZON (you are here) ──
Signed-in check FIRST: if the header greets "Hello, sign in", STOP and ask the user to sign in. Never type credentials.
Search: type selector="#twotabsearchtextbox" → pressKey Enter
Open product: click the product title link in results
Add to Cart (fallbacks, in order): selector="#add-to-cart-button" → selector="#add-to-cart-button-ubb" → targetText="Add to Cart"
Dismiss add-on/protection popup: targetText="No Thanks" → selector="#attachSiNoCoverage input" → selector="#attach-close_sideSheet-link"
Go to Cart (fallbacks): selector="#attach-sidesheet-view-cart-button input" → selector="#sw-gtc a" → selector="#nav-cart" → targetText="Go to Cart"
Proceed to checkout (fallbacks): selector="input[name='proceedToRetailCheckout']" → selector="#sc-buy-box-ptc-button input" → targetText="Proceed to Buy"
Buy Now (single-item express, only if user asked to buy just one thing): selector="#buy-now-button"
Amazon re-renders after every click — wait 1000 between steps and re-read.
Payment boundary: advance to the payment-method page (open UPI/QR if offered) and hand off — never fill payment or address fields, never place the final order.`;
  if (/web\.whatsapp\.com/.test(url)) return `
── WHATSAPP WEB (you are here) ──
Send by contact name:
  1. click selector="[data-testid='chat-list-search']" or selector="[data-tab='3']"
  2. wait 400
  3. type the contact name
  4. wait 800  (wait for results to load)
  5. click first matching contact row: selector="[data-testid='cell-frame-title']" or targetText=CONTACT_NAME
  6. wait 400
  7. type message in selector="[data-testid='conversation-compose-box-input']" or [aria-label*="Type a message"] or [data-tab='10']
  8. pressKey Enter
Send by phone: navigate → https://wa.me/91NUMBER?text=MESSAGE then click "Continue to Chat" button`;
  if (/open\.spotify\.com/.test(url)) return `
── SPOTIFY (you are here) ──
Search & play: navigate → https://open.spotify.com/search/QUERY → wait 1000
  → click first song row selector="[data-testid='tracklist-row']" → click play button inside it`;
  if (/github\.com/.test(url)) return `
── GITHUB (you are here) ──
Search repos: navigate → https://github.com/search?q=QUERY&type=repositories
Open VS Code editor: pressKey "." on any repo page
View file: click file name in file tree`;
  if (/google\.com\/search|google\.co/.test(url)) return `
── GOOGLE SEARCH (you are here) ──
New search: type selector="[name='q']" → pressKey Enter
Direct: navigate → https://www.google.com/search?q=QUERY`;
  if (/reddit\.com\/r\/[^/]+\/submit/.test(url)) return `
── REDDIT SUBMIT (you are here) ──
Follow these steps IN ORDER. Do not skip any step.
1. wait 1200 (page must fully load)
2. type into title: selector="textarea[name='title']" targetText="Title" — type the title text
3. wait 400
4. click body field: selector="div[data-lexical-editor='true']" targetText="Body text"
5. wait 300
6. type into body: selector="div[data-lexical-editor='true']" targetText="Body text" — type the body text
7. wait 600
8. click submit: selector="r-post-form-submit-button" targetText="Post"
NOTES:
- Title uses textarea[name='title'] (may be in shadow DOM — the agent handles this automatically)
- Body uses div[data-lexical-editor='true'] — click it first, then type. It uses beforeinput events.
- Submit is r-post-form-submit-button — if clicking fails, try selector="button[type='submit']" or targetText="Post"`;
  return `
── GENERAL SITE ──
Prefer navigating to URLs over clicking search bars.
Use sel= selectors from INTERACTIVE ELEMENTS when available.
For forms: click field → type → Tab to next field → submit.`;
}

async function bgCallAgentStep(task, pageInfo, history, currentStep = null, sharedContext = null) {
  const isLinkedInJobsTask = bgIsLinkedInJobsTask(task);
  const readTextLimit = isLinkedInJobsTask ? 2400 : 200;
  const historyText = history.length > 0
    ? history.map((h, i) => {
        if (h.type === "web_search") {
          const resultText = h.result?.success
            ? "Results:\n" + (h.result.text || "").slice(0, 1500)
            : (h.result?.text || "No results");
          return `Step ${i + 1}: [web_search] "${h.query}" → ${resultText}`;
        }
        const status = h.result?.success ? "✓ OK" : `✗ ${h.result?.error || "FAILED"}`;
        const snap = h.snapshot ? ` → page after: "${h.snapshot.title}" | ${h.snapshot.url}` : "";
        const readVal = h.type === "read" && h.result?.text ? ` → content: "${h.result.text.slice(0, readTextLimit)}"` : "";
        return `Step ${i + 1}: [${h.type}] ${h.description} → ${status}${snap}${readVal}`;
      }).join("\n")
    : "None yet.";

  const elementsText = pageInfo.interactiveEls?.length > 0
    ? pageInfo.interactiveEls.map(e => `  [${e.tag}]${e.selector ? ` sel="${e.selector}"` : ""} ${e.text}${e.href ? ` (href: ${e.href})` : ""}${e.type ? ` (type: ${e.type})` : ""}`).join("\n")
    : "  (none detected)";

  const selectsText = pageInfo.selectEls?.length > 0
    ? "\n\nDROPDOWNS (use selectOption):\n" + pageInfo.selectEls.map(s =>
        `  [select] ${s.label || "unnamed"} — current: "${s.current}" — options: ${s.options.join(", ")}`
      ).join("\n")
    : "";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const currentUrl = pageInfo.url || "";
  const chatContextText = bgBuildAgentConversationText(sharedContext || {});

  const agentSystemPrompt = `You are Braino Browser Agent. Automate a real Chrome browser by returning JSON actions.
Respond ONLY with a JSON object or array. Zero prose. Zero explanation. Zero markdown fences.

MINDSET: You are a browser robot. Every task is solved by executing and verifying actions.
- After every navigate or click, check STEPS TAKEN SO FAR to see what page you landed on.
- If the "page after" in history doesn't match your intent → you are on the wrong page. Recover.
- Never assume a click worked. The history shows you the page title and URL after each action — read it.
- If STEPS TAKEN SO FAR is empty → you have done NOTHING yet → start executing immediately.
- Resolve ambiguous follow-ups like "find the best one" or "open it" using CHAT CONTEXT before planning.
- Pure questions with no browser actions → {"type":"answer","message":"..."}

ACTIONS:
{"type":"navigate","url":"https://...","description":"..."}
{"type":"click","selector":"css","targetText":"fallback text","description":"..."}
{"type":"type","selector":"css","targetText":"fallback","text":"...","description":"..."}
{"type":"pressKey","key":"Enter","description":"..."}
{"type":"selectOption","selector":"css","value":"option text","description":"..."}
{"type":"read","selector":"css","targetText":"fallback","maxChars":3500,"description":"Read element to verify state"}
{"type":"scroll","direction":"down","amount":400,"description":"..."}
{"type":"wait","ms":1500,"description":"..."}
{"type":"downloadImage","selector":"css","targetText":"fallback alt text","format":"png","filename":"image.png","description":"Download image as PNG/JPEG/WebP"}
{"type":"web_search","query":"search terms","description":"Search the web for information before acting"}
{"type":"done","message":"what was accomplished"}
{"type":"answer","message":"..."}
{"type":"clarify","message":"..."}  ← ONLY when genuinely blocked

WEB SEARCH USAGE:
- Use {"type":"web_search"} FIRST when a task requires up-to-date information, research, or content you don't know.
- Results are injected into your history so you can read them and use that knowledge in subsequent actions.
- Example flow: web_search → read results from history → navigate to Google Docs → type article using those facts.
- You can web_search multiple times in one task (for different sub-topics).
- web_search does NOT navigate the browser tab — it is a background fetch. Your current tab stays open.

SELECTOR PRIORITY:
1. sel= value from INTERACTIVE ELEMENTS
2. [aria-label="..."] or [role="button"][aria-label="..."]
3. [data-testid="..."]
4. [placeholder="..."] or [name="..."]
5. targetText (fuzzy visible text match — last resort)

BATCHING: Array of up to 5 actions for certain sequences. NEVER batch navigate or read.
Example: [{"type":"type",...},{"type":"pressKey","key":"Tab"},{"type":"type",...},{"type":"pressKey","key":"Enter"}]

═══ VERIFY BEFORE PROCEED ═══════════════════════════════════
After EVERY navigate or click, STEPS TAKEN SO FAR shows "page after: TITLE | URL".
Before your next action, check that title/URL matches where you intended to be.

RULE: If the page after a click is not what you expected → do NOT continue the original plan.
Assess what happened and recover: navigate back, try a different approach, or re-read the page.

FOR LISTS (seasons, episodes, search results, dropdown menus):
  ALWAYS read the list before picking from it. Never guess position or index.
  Step 1: use {"type":"read"} to read the list element and see what options are available.
  Step 2: pick the exact text you saw in the read result, then click/selectOption.

FOR MEDIA SITES (Netflix, YouTube, Spotify):
  After clicking anything, check if unexpected video/audio playback started.
  If you meant to click a title but a video started playing → you clicked the wrong thing.
  Go back or navigate directly to the correct URL.

CHECKPOINT PLANNING for complex tasks:
  navigate → verify landed on right page
  → find/read target element → confirm it's visible
  → interact → verify interaction result
  → proceed to next step
  Never batch past a verification checkpoint.
═════════════════════════════════════════════════════════════

RULES:
1. STEPS TAKEN SO FAR is ground truth. Read "page after" to know where you are.
2. Never return done unless steps confirm ALL required actions succeeded and page state matches.
3. Never repeat a failed selector — switch strategy immediately.
4. After navigate → the next step should verify the page before clicking anything.
5. Forms: type → Tab → next field → submit.
6. TODAY: ${today}. Calculate all relative dates yourself.
7. Failed click → scroll to find element, then try different selector.
8. ALWAYS check URL SHORTCUTS below first — if a shortcut exists, use it as step 1.
9. WRONG SITE: If the current page is unrelated to the task, your FIRST action MUST be navigate to the correct site. Never say "I can't do this here".

URL SHORTCUTS — single navigate, zero form interaction needed:
── EMAIL / MESSAGING ──
Gmail compose:    https://mail.google.com/mail/?view=cm&to=TO&su=SUBJECT&body=BODY  (encode spaces as %20)
WhatsApp by phone#:  https://wa.me/COUNTRYCODENUMBER?text=MESSAGE  (India: 91XXXXXXXXXX, encode spaces as %20)
WhatsApp by name:    navigate → https://web.whatsapp.com → search contact name → click → type → Enter
Twitter/X post:   navigate → https://x.com/compose/tweet  (type into the composer)

── MAPS / NAVIGATION ──
Google Maps search:     https://www.google.com/maps/search/QUERY+with+spaces+as+plus
Google Maps directions: https://www.google.com/maps/dir/ORIGIN/DESTINATION  (encode spaces as +)

── FLIGHTS (IATA codes: BOM=Mumbai DEL=Delhi BLR=Bangalore MAA=Chennai PNQ=Pune HYD=Hyderabad CCU=Kolkata DED=Dehradun GOI=Goa JAI=Jaipur AMD=Ahmedabad COK=Kochi IXC=Chandigarh) ──
MakeMyTrip one-way: https://www.makemytrip.com/flight/search?itinerary=FROM-TO-DD/MM/YYYY&tripType=O&paxType=A-1_C-0_I-0&cabinClass=E
MakeMyTrip return:  itinerary=FROM-TO-DD/MM/YYYY,TO-FROM-DD/MM/YYYY&tripType=R&paxType=A-1_C-0_I-0&cabinClass=E
Skyscanner:         https://www.skyscanner.co.in/transport/flights/FROM/TO/YYMMDD/  (date = last 2 digits of year + MM + DD)
Example PNQ→DEL 19 Apr 2026: MakeMyTrip itinerary=PNQ-DEL-19/04/2026 · Skyscanner /PNQ/DEL/260419/

── HOTELS ──
Booking.com: https://www.booking.com/searchresults.html?ss=CITY&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&no_rooms=1&group_adults=2
MakeMyTrip hotels: https://www.makemytrip.com/hotels/hotel-listing/?checkin=MM/DD/YYYY&checkout=MM/DD/YYYY&city=CITY_NAME&roomStayQualifier=2e0e

── SHOPPING ──
Amazon India:  https://www.amazon.in/s?k=QUERY+with+plus
Flipkart:      https://www.flipkart.com/search?q=QUERY
Myntra:        https://www.myntra.com/search?q=QUERY
Meesho:        https://www.meesho.com/search?q=QUERY

── FOOD / DELIVERY ──
Zomato:  https://www.zomato.com/CITY/restaurants?q=QUERY  (city lowercase: mumbai, delhi, bangalore, pune, hyderabad)
Swiggy:  https://www.swiggy.com/search?query=QUERY

── JOBS ──
LinkedIn jobs:  https://www.linkedin.com/jobs/search/?keywords=ROLE&location=CITY
Naukri:         https://www.naukri.com/ROLE-jobs-in-CITY  (lowercase hyphenated e.g. software-engineer-jobs-in-bangalore)
Indeed:         https://in.indeed.com/jobs?q=ROLE&l=CITY

── PRODUCTIVITY ──
Google Calendar new event: https://calendar.google.com/calendar/r/eventedit?text=EVENT+NAME&dates=YYYYMMDDTHHMMSS/YYYYMMDDTHHMMSS&location=PLACE&details=NOTES
New Google Doc:   https://docs.new
New Google Sheet: https://sheets.new
New Google Slide: https://slides.new

── MEDIA ──
YouTube search:       https://www.youtube.com/results?search_query=QUERY
Spotify search:       https://open.spotify.com/search/QUERY
YouTube Music search: https://music.youtube.com/search?q=QUERY
Netflix search:       https://www.netflix.com/search?q=QUERY

── OTHER ──
Google search:  https://www.google.com/search?q=QUERY
Wikipedia:      https://en.wikipedia.org/wiki/Special:Search?search=QUERY
Paytm:          https://paytm.com/search?q=QUERY
IRCTC trains:   https://www.irctc.co.in/nget/train-search  (no URL params — use form)

${bgGetPlatformGuide(currentUrl)}
${bgGetLinkedInJobsSkillGuide(task, currentUrl)}
${bgGetGoogleMapsSkillGuide(task, currentUrl)}

ANSWER FORMATTING (for {"type":"answer"} responses):
- Always use markdown in the message field — never return a flat comma-separated list
- Use ## headers for categories/genres, - bullet points for items
- Keep each bullet concise: "**Title** — brief description"
- Sort/group logically (by genre, category, type, etc.)

FAILURE RECOVERY:
- Wrong page → navigate to the correct URL immediately, no explanation
- Element not found → aria-label, data-testid, placeholder, then targetText
- List selection uncertain → use read action first to see all options
- Form not responding → click field first, then type`;

  const pageStatus = pageInfo.url
    ? `URL: ${pageInfo.url}\nTitle: ${pageInfo.title}`
    : "Not on a specific page yet — navigate first.";

  const userMessage = `TASK: ${task}

CURRENT PAGE:
${pageStatus}

PAGE TEXT (excerpt):
${pageInfo.bodyText?.substring(0, 4000) || "(empty — navigate first)"}

INTERACTIVE ELEMENTS:
${elementsText}${selectsText}
CHAT CONTEXT:
${chatContextText || "None."}
${currentStep ? `\nCURRENT PLAN STEP ${currentStep.id}: ${currentStep.goal}\nSuccess signal: ${currentStep.successSignal || "(none)"}\nFocus on THIS step only. Return {"type":"done","message":"step ${currentStep.id} complete: [summary]"} once the goal is achieved.\n` : ""}
STEPS TAKEN SO FAR:
${historyText}

What actions should be taken next? Return a single JSON object, OR a JSON array of up to 3 objects for sequences that are certain to succeed in order (e.g. [type, pressKey] or [click, type]). Only batch when all steps are highly predictable. NEVER include navigate in a batch.`;

  const fetchBody = JSON.stringify({ notes: agentSystemPrompt, message: userMessage });
  let response;
  try {
    response = await bgChatFetch(fetchBody);
  } catch (e) {
    if (e instanceof TypeError) {
      // Service worker woke cold — wait and retry once
      await new Promise(r => setTimeout(r, 1200));
      response = await bgChatFetch(fetchBody);
    } else {
      throw e;
    }
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `API error ${response.status}`);
  }

  const data = await response.json();
  const reply = (data.reply || "").trim();
  const jsonMatch = reply.match(/```(?:json)?\s*([\s\S]*?)```/) || reply.match(/([\[{][\s\S]*[\]}])/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : reply.trim();
  const parsed = JSON.parse(jsonStr);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function bgCheckStopped(id, token) {
  try {
    const res = await fetch(`${BG_SUPABASE_URL}/rest/v1/agent_commands?id=eq.${id}&select=status`, {
      headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const rows = await res.json();
    const s = rows[0]?.status;
    return s !== "running" && s !== "pending";
  } catch { return false; }
}

// ── Reddit post — URL params pre-fill everything, agent just clicks Submit ─
async function bgExecuteRedditPost(cmd, token, tabId) {
  const t = cmd.task;
  let subreddit, titleText, bodyText;

  // Format 1 (current): @@REDDIT_POST@@\nsub:X\nttl:Y\nbdy:\nZ
  if (t.startsWith("@@REDDIT_POST@@")) {
    subreddit = (t.match(/\nsub:(.+)/) || [])[1]?.trim();
    titleText = (t.match(/\nttl:(.+)/) || [])[1]?.trim();
    bodyText  = (t.match(/\nbdy:\n([\s\S]*)$/) || [])[1]?.trim();

  // Format 2: Post to Reddit r/X\n\nTITLE:\nY\n\nBODY:\nZ
  } else if (/TITLE:\n/.test(t) && /BODY:\n/.test(t)) {
    subreddit = (t.match(/r\/(\w+)/) || [])[1];
    titleText = (t.match(/TITLE:\n([\s\S]*?)\n\nBODY:/) || [])[1]?.trim();
    bodyText  = (t.match(/BODY:\n([\s\S]*)$/) || [])[1]?.trim();

  // Format 3 (migration 3 step-based): "Create a Reddit text post in r/X"
  } else if (/type this exact title:/.test(t)) {
    subreddit = (t.match(/r\/(\w+)/) || [])[1];
    titleText = (t.match(/type this exact title:\n([\s\S]*?)\n\n/) || [])[1]?.trim();
    bodyText  = (t.match(/type this exact body text:\n([\s\S]*?)(?:\n\n\d+\.|$)/) || [])[1]?.trim();
  }

  if (!subreddit || !titleText || !bodyText) return false;

  const steps = [];

  // Step 1 — navigate to old.reddit.com with everything pre-filled via URL params
  const url = `https://old.reddit.com/r/${subreddit}/submit?title=${encodeURIComponent(titleText)}&text=${encodeURIComponent(bodyText)}&selftext=true`;
  steps.push({ type: "navigate", description: `Open r/${subreddit}/submit with title & body pre-filled`, ok: true });
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps });

  await new Promise(resolve => chrome.tabs.update(tabId, { url }, resolve));
  await bgWaitForTabReady(tabId, 8000);
  await new Promise(r => setTimeout(r, 1500)); // let the form render

  // Step 2 — click Submit (old Reddit has a plain input[type=submit])
  const submit = await new Promise(resolve => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const btn = document.querySelector('button[type="submit"]')
                 || document.querySelector('input[type="submit"]')
                 || Array.from(document.querySelectorAll("button")).find(b => /submit|post/i.test(b.innerText));
        if (!btn) return { error: "Submit button not found" };
        btn.click();
        return { success: true };
      },
    }, (res) => resolve(chrome.runtime.lastError ? { error: chrome.runtime.lastError.message } : (res?.[0]?.result || { error: "No result" })));
  });

  steps.push({ type: "click", description: "Click Submit", ok: !submit.error });
  await new Promise(r => setTimeout(r, 2000));

  await bgUpdateRemoteCommand(cmd.id, token, {
    status: submit.error ? "error" : "done",
    result: submit.error ? `Submit failed: ${submit.error}` : `Posted to r/${subreddit} successfully.`,
    steps,
  });
  chrome.storage.local.remove(["remoteProcessingId", "remoteProcessingTime"]);
  return true;
}

// ── Workflow planning helpers ─────────────────────────────────────────────

function bgIsMultiStepTask(task) {
  const hasConnector = /\b(and then|after that|once you|when done|followed by)\b/i.test(task);
  const hasNavigateThenAct = /\b(open|go to|navigate|visit)\b.+?\b(and|then)\b.+?\b(click|type|fill|send|submit|buy|book|post|search|find)\b/i.test(task);
  const isComplexAction = /\b(send an email|send a message|book a|schedule a|fill out|sign up for|register|create a|post on|post to|upload|reply to|order a|buy a)\b/i.test(task);
  return hasConnector || hasNavigateThenAct || (isComplexAction && task.split(/\s+/).length > 7);
}

async function bgPlanWorkflow(task, pageInfo) {
  const systemPrompt = `You plan multi-step browser automation workflows.
Return ONLY JSON. No prose. No markdown.
Return: {"complexity":"simple"|"multi-step","steps":[{"id":1,"goal":"outcome description","successSignal":"url fragment or visible text confirming this step worked"}]}
Rules:
- "simple" if ≤2 actions on current page, no navigation required
- "multi-step" for anything spanning navigation + on-page actions
- Max 8 steps. Each step = one distinct phase (navigate, fill section, submit, confirm)
- successSignal = specific observable: URL fragment, page title, or visible text
- Write goals as outcomes: "Compose window open in Gmail" not "Click compose"`;

  const userPrompt = `TASK: ${task}\nCURRENT PAGE:\nURL: ${pageInfo.url || "(unknown)"}\nTitle: ${pageInfo.title || "(unknown)"}\nPlan the workflow.`;

  try {
    const res = await bgChatFetch({ notes: systemPrompt, message: userPrompt });
    if (!res.ok) return null;
    const data = await res.json();
    const reply = (data.reply || "").trim();
    const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/([\[{][\s\S]*[\]}])/);
    const json = match ? match[1].trim() : reply;
    const parsed = JSON.parse(json);
    if (!parsed.complexity || !Array.isArray(parsed.steps)) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function bgVerifyStepHeuristic(step, pageInfo) {
  const signal = (step.successSignal || "").toLowerCase().trim();
  if (!signal) return null;
  const url = (pageInfo.url || "").toLowerCase();
  const title = (pageInfo.title || "").toLowerCase();
  const text = (pageInfo.bodyText || "").slice(0, 800).toLowerCase();
  if (url.includes(signal) || title.includes(signal) || text.includes(signal)) return true;
  return null;
}

async function bgReplanWorkflow(task, completedSteps, remainingSteps, pageInfo, lastError) {
  const systemPrompt = `You revise a browser automation plan after a step failed.\nReturn ONLY a JSON array. No prose.\n[{"id":N,"goal":"...","successSignal":"..."}]`;
  const userPrompt = `ORIGINAL TASK: ${task}\nCOMPLETED:\n${completedSteps.map(s => `${s.id}. ${s.goal}`).join("\n") || "None."}\nFAILED AT: ${remainingSteps[0]?.goal || "unknown"} — Error: ${lastError}\nREMAINING:\n${remainingSteps.map(s => `${s.id}. ${s.goal}`).join("\n")}\nPAGE: ${pageInfo.url || ""} | ${pageInfo.title || ""}\nTEXT: ${(pageInfo.bodyText || "").slice(0, 500)}\nRevise remaining steps, starting from id ${(completedSteps.length || 0) + 1}.`;
  try {
    const res = await bgChatFetch({ notes: systemPrompt, message: userPrompt });
    if (!res.ok) return remainingSteps;
    const data = await res.json();
    const reply = (data.reply || "").trim();
    const match = reply.match(/```(?:json)?\s*([\s\S]*?)```/i) || reply.match(/(\[[\s\S]*\])/);
    const json = match ? match[1].trim() : reply;
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : remainingSteps;
  } catch (_) {
    return remainingSteps;
  }
}

// ─────────────────────────────────────────────────────────────────────────

async function bgRunRemoteCommandLegacy(cmd, token) {
  console.log("[BgRemoteAgent] Running command in background:", cmd.task);
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps: [] });

  // Resolve tab ID once — reuse for entire run to avoid repeated async lookups
  const tabId = await bgGetActiveTabId();
  console.log("[BgRemoteAgent] Using tab:", tabId);

  // Reddit posts — skip the AI planning loop, inject directly
  if (/@@REDDIT_POST@@|reddit\.com\/r\/\w+\/submit|Post to Reddit|Create a Reddit text post/i.test(cmd.task)) {
    const handled = await bgExecuteRedditPost(cmd, token, tabId);
    if (handled) return;
  }

  const steps = [];
  const history = [];
  const MAX = 20;
  let iterations = 0;
  const startedAt = Date.now();

  const finish = async (status, result) => {
    const durationMs = Date.now() - startedAt;
    await bgUpdateRemoteCommand(cmd.id, token, { status, result, steps: [...steps, { __meta: true, durationMs }] });
    chrome.storage.local.remove("remoteProcessingId");
    chrome.runtime.sendMessage({ action: "remoteCommandComplete", cmdId: cmd.id, result }).catch(() => {});
    console.log("[BgRemoteAgent] Command finished:", status, result);
  };

  try {
    const adapterMessage = await bgTryHandleSiteAdapterTask({
      tabId,
      task: cmd.task,
      history,
      onProgress: null,
      onResult: async ({ description, result }) => {
        steps.push({ description, ok: !result?.error });
        bgUpdateRemoteCommand(cmd.id, token, { steps });
      },
      shouldStop: () => false,
    });
    if (adapterMessage) {
      await finish("done", adapterMessage);
      return;
    }
  } catch (e) {
    await finish("error", `Error: ${e.message}`);
    return;
  }

  // ── Plan-driven loop for multi-step tasks ─────────────────────────────
  if (bgIsMultiStepTask(cmd.task)) {
    const initPage = await bgGetAgentPageContext(tabId);
    let plan = null;
    try { plan = await bgPlanWorkflow(cmd.task, initPage); } catch (_) {}

    if (plan && plan.complexity === "multi-step" && plan.steps.length > 1) {
      console.log("[BgRemoteAgent] Using plan-driven loop:", plan.steps.length, "steps");
      let planSteps = [...plan.steps];
      const completedSteps = [];
      let consecutiveFailures = 0;

      for (let stepIdx = 0; stepIdx < planSteps.length; stepIdx++) {
        const step = planSteps[stepIdx];
        steps.push({ description: `Step ${stepIdx + 1}/${planSteps.length}: ${step.goal}`, ok: null, isHeader: true });
        bgUpdateRemoteCommand(cmd.id, token, { steps });

        let stepDone = false;
        let stepAttempts = 0;

        while (!stepDone && stepAttempts < 3) {
          if (stepIdx > 0 && await bgCheckStopped(cmd.id, token)) { chrome.storage.local.remove("remoteProcessingId"); return; }

          const pageInfo = await bgGetAgentPageContext(tabId);

          if (stepAttempts === 0 && bgVerifyStepHeuristic(step, pageInfo) === true) {
            completedSteps.push(step); stepDone = true; break;
          }

          let actions = bgTryFastPath(cmd.task, history);
          if (!actions) {
            try { actions = await bgCallAgentStep(cmd.task, pageInfo, history, step); }
            catch (e) { await finish("error", `Error: ${e.message}`); return; }
          }

          const first = actions[0];
          if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
            await finish("done", first.message || "Done."); return;
          }

          let stepFailed = false;
          for (const actionObj of actions) {
            if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
              await finish("done", actionObj.message || "Done."); return;
            }
            const result = await bgExecuteAgentAction(tabId, actionObj);
            let snapshot = null;
            if (!result?.error && BG_SNAPSHOT_ACTIONS.has(actionObj.type)) {
              if (actionObj.type === "navigate") { await bgWaitForTabReady(tabId, 5000); await new Promise(r => setTimeout(r, 200)); }
              else { await new Promise(r => setTimeout(r, 200)); }
              snapshot = await bgGetPageSnapshot(tabId);
            } else if (result?.error) {
              await new Promise(r => setTimeout(r, 400));
            }
            history.push({ ...actionObj, result, snapshot });
            steps.push({ description: actionObj.description || actionObj.type, ok: !result?.error, snapshot });
            bgUpdateRemoteCommand(cmd.id, token, { steps });
            if (result?.error) { stepFailed = true; consecutiveFailures++; break; }
            else { consecutiveFailures = 0; }
          }

          stepAttempts++;

          if (!stepFailed) {
            const verifyPage = await bgGetAgentPageContext(tabId);
            if (bgVerifyStepHeuristic(step, verifyPage) !== false) {
              completedSteps.push(step); stepDone = true;
            }
          }

          if (consecutiveFailures >= 2 && stepIdx < planSteps.length - 1) {
            const verifyPage = await bgGetAgentPageContext(tabId);
            const lastErr = history.filter(h => h.result?.error).slice(-1)[0];
            const revised = await bgReplanWorkflow(cmd.task, completedSteps, planSteps.slice(stepIdx), verifyPage, lastErr?.result?.error || "Unknown failure");
            planSteps = [...planSteps.slice(0, stepIdx + 1), ...revised];
            consecutiveFailures = 0;
          }
        }
      }

      await finish("done", `Completed all ${planSteps.length} steps.`);
      return;
    }
  }
  // ─────────────────────────────────────────────────────────────────────

  while (iterations++ < MAX) {
    // Check if user stopped the task from phone
    if (iterations > 1 && await bgCheckStopped(cmd.id, token)) {
      console.log("[BgRemoteAgent] Task stopped externally");
      chrome.storage.local.remove("remoteProcessingId");
      return;
    }

    const pageInfo = await bgGetAgentPageContext(tabId);
    let actions = bgTryFastPath(cmd.task, history);
    if (!actions) {
      try {
        actions = await bgCallAgentStep(cmd.task, pageInfo, history);
      } catch (e) {
        await finish("error", `Error: ${e.message}`);
        return;
      }
    }

    const first = actions[0];
    if (first.type === "done" || first.type === "answer" || first.type === "clarify") {
      if (first.type === "done") {
        const realDone = history.filter(h => ["click","type","pressKey","selectOption"].includes(h.type) && h.result?.success);
        const needsActions = /send|submit|reply|compose|type|fill|click|buy|order|play|post|write|upload/i.test(cmd.task);
        if (needsActions && realDone.length === 0) {
          history.push({ type: "correction", description: "No real actions yet — keep going.", result: { success: false } });
          continue;
        }
      }
      await finish("done", first.message || "Done.");
      return;
    }

    for (const actionObj of actions) {
      if (actionObj.type === "done" || actionObj.type === "answer" || actionObj.type === "clarify") {
        await finish("done", actionObj.message || "Done.");
        return;
      }

      const result = await bgExecuteAgentAction(tabId, actionObj);
      let snapshot = null;
      if (!result?.error && BG_SNAPSHOT_ACTIONS.has(actionObj.type)) {
        if (actionObj.type === "navigate") {
          await bgWaitForTabReady(tabId, 5000);
          await new Promise(r => setTimeout(r, 200));
        } else {
          await new Promise(r => setTimeout(r, 200));
        }
        snapshot = await bgGetPageSnapshot(tabId);
      } else if (result?.error) {
        await new Promise(r => setTimeout(r, 400));
      }

      history.push({ ...actionObj, result, snapshot });
      steps.push({ description: actionObj.description || actionObj.type, ok: !result?.error, snapshot });
      // Fire-and-forget step updates — don't block the loop on DB write
      bgUpdateRemoteCommand(cmd.id, token, { steps });

      if (result?.error) break;
    }
  }

  await finish("error", "Ran out of steps. Check your desktop browser.");
}

async function bgRunRemoteCommand(cmd, token) {
  console.log("[BgRemoteAgent] Running closed-loop command:", cmd.task);
  const startedAt = Date.now();
  const steps = [];
  // The chat page smuggles its recent conversation in as a marker step (same pattern as the
  // __meta duration step) so follow-up tasks ("open that website") arrive with context.
  const contextStep = Array.isArray(cmd.steps) ? cmd.steps.find((s) => s && s.__context) : null;
  const sharedContext = contextStep
    ? { chatHistory: contextStep.chatHistory, lastUserPrompt: contextStep.lastUserPrompt, lastAssistantReply: contextStep.lastAssistantReply }
    : {};
  await bgUpdateRemoteCommand(cmd.id, token, { status: "running", steps });

  const finish = async (status, result) => {
    const durationMs = Date.now() - startedAt;
    await bgUpdateRemoteCommand(cmd.id, token, { status, result, steps: [...steps, { __meta: true, durationMs }] });
    chrome.storage.local.remove(["remoteProcessingId", "remoteProcessingTime"]);
    chrome.runtime.sendMessage({ action: "remoteCommandComplete", cmdId: cmd.id, result }).catch(() => {});
    console.log("[BgRemoteAgent] Closed-loop command finished:", status, result);
  };

  try {
    const tabId = await bgGetActiveTabId();
    if (!tabId) {
      await finish("error", "Open a normal browser tab to use Delegate mode.");
      return;
    }
    const history = [];
    const adapterMessage = await bgTryHandleSiteAdapterTask({
      tabId,
      task: cmd.task,
      history,
      onProgress: async (description) => {
        steps.push({ description: String(description || "Working"), ok: null });
        bgUpdateRemoteCommand(cmd.id, token, { steps });
      },
      shouldStop: () => bgCheckStopped(cmd.id, token),
    });
    if (adapterMessage) {
      steps.push({ description: adapterMessage, ok: true, final: true });
      await finish("done", adapterMessage);
      return;
    }
    const result = await bgRunDelegateLoop({
      tabId,
      task: cmd.task,
      sharedContext,
      onProgress: (description) => {
        steps.push({ description: String(description || "Working"), ok: null });
        bgUpdateRemoteCommand(cmd.id, token, { steps });
      },
      onFinal: (message) => {
        if (message) steps.push({ description: message, ok: true, final: true });
        bgUpdateRemoteCommand(cmd.id, token, { steps });
      },
      shouldStop: () => bgCheckStopped(cmd.id, token),
    });
    await finish(result.ok ? "done" : "error", result.message || (result.ok ? "Done." : "Delegate stopped."));
  } catch (error) {
    await finish("error", `Error: ${error?.message || error}`);
  }
}

// --- realtime subscription (keeps worker alive + instant pickup) ---

const BG_REALTIME_URL = BG_SUPABASE_URL.replace("https://", "wss://") + "/realtime/v1/websocket";

let bgRealtimeWs = null;
let bgRealtimeHeartbeat = null;
let bgRealtimeReconnectTimer = null;
let bgRealtimeBackoff = 5000; // exponential backoff, caps at 60s

async function bgStartRealtime() {
  clearInterval(bgRealtimeHeartbeat);
  clearTimeout(bgRealtimeReconnectTimer);
  if (bgRealtimeWs) { try { bgRealtimeWs.close(); } catch(e) {} bgRealtimeWs = null; }

  // Don't attempt while offline — the online event will restart us
  if (!navigator.onLine) {
    console.log("[BgRealtime] Offline — waiting for network");
    return;
  }

  // Refresh token if it may have expired (try, fall through on failure)
  let data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  if (!data.authUserId) return;
  if (!data.authToken) {
    const fresh = await bgRefreshAuthToken();
    if (!fresh) return;
    data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  }
  if (!data.authToken) return;

  const ws = new WebSocket(`${BG_REALTIME_URL}?apikey=${BG_SUPABASE_ANON_KEY}&vsn=1.0.0`);
  bgRealtimeWs = ws;

  ws.onopen = () => {
    console.log("[BgRealtime] Connected");
    bgRealtimeBackoff = 5000; // reset backoff on successful connect
    ws.send(JSON.stringify({
      topic: "realtime:public:agent_commands",
      event: "phx_join",
      payload: {
        config: {
          postgres_changes: [{ event: "INSERT", schema: "public", table: "agent_commands", filter: `user_id=eq.${data.authUserId}` }]
        },
        access_token: data.authToken
      },
      ref: "1"
    }));
    // Heartbeat every 25s — keeps WebSocket alive AND keeps service worker alive
    bgRealtimeHeartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" }));
      }
    }, 25000);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.event === "postgres_changes" && msg.payload?.data?.type === "INSERT") {
        console.log("[BgRealtime] New command → triggering poll immediately");
        bgPollRemoteCommands();
      }
      // Supabase sends phx_reply with status "error" when JWT is rejected
      if (msg.event === "phx_reply" && msg.payload?.status === "error") {
        console.warn("[BgRealtime] Join rejected — refreshing token and reconnecting");
        bgRefreshAuthToken().then(() => {
          bgRealtimeBackoff = 2000;
          bgStartRealtime();
        });
      }
    } catch(_) {}
  };

  ws.onclose = () => {
    clearInterval(bgRealtimeHeartbeat);
    bgRealtimeWs = null;
    if (!navigator.onLine) {
      console.log("[BgRealtime] Closed while offline — will reconnect when online");
      return;
    }
    const delay = bgRealtimeBackoff;
    bgRealtimeBackoff = Math.min(bgRealtimeBackoff * 2, 60000);
    console.log(`[BgRealtime] Disconnected — reconnecting in ${delay / 1000}s`);
    bgRealtimeReconnectTimer = setTimeout(bgStartRealtime, delay);
  };

  ws.onerror = () => {}; // onclose always fires after onerror, handled there
}

// Restart immediately when network comes back
self.addEventListener("online", () => {
  console.log("[BgRealtime] Network restored — reconnecting");
  bgRealtimeBackoff = 5000;
  bgStartRealtime();
  bgPollRemoteCommands();
});

// --- token refresh ---

async function bgRefreshAuthToken() {
  const { authRefreshToken } = await new Promise(r => chrome.storage.local.get("authRefreshToken", r));
  if (!authRefreshToken) return null;
  try {
    const res = await fetch(`${BG_SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: BG_SUPABASE_ANON_KEY },
      body: JSON.stringify({ refresh_token: authRefreshToken }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.access_token) return null;
    chrome.storage.local.set({
      authToken: json.access_token,
      authRefreshToken: json.refresh_token || authRefreshToken,
    });
    return json.access_token;
  } catch (e) {
    return null;
  }
}

async function bgResolvePremiumStatus(options = {}) {
  const now = Date.now();
  const data = await bgGetStorage([
    "authToken",
    "authRefreshToken",
    "authUserId",
    "authEmail",
    "isPremium",
    "isPremiumCachedAt",
  ]);

  if (bgIsInternalPremiumEmail(data.authEmail)) {
    await bgSetStorage({ isPremium: true, isPremiumCachedAt: now });
    return { ok: true, isPremium: true, source: "internal" };
  }

  const hasFreshPositiveCache =
    !options.forceRefresh &&
    data.isPremium === true &&
    data.isPremiumCachedAt &&
    now - data.isPremiumCachedAt < BG_PREMIUM_CACHE_MS;

  if (hasFreshPositiveCache) {
    return { ok: true, isPremium: true, source: "cache" };
  }

  if (!data.authUserId) {
    await bgSetStorage({ isPremium: false, isPremiumCachedAt: now });
    return { ok: true, isPremium: false, source: "missing-user" };
  }

  let token = data.authToken;
  const fetchPremium = async (accessToken) => fetch(
    `${BG_SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(data.authUserId)}&select=is_premium&limit=1`,
    { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${accessToken}` } },
  );

  try {
    let res = token ? await fetchPremium(token) : null;
    if (!res || res.status === 401) {
      token = data.authRefreshToken ? await bgRefreshAuthToken() : null;
      res = token ? await fetchPremium(token) : null;
    }

    if (!res || !res.ok) {
      throw new Error(`Premium lookup failed: ${res?.status || "no-token"}`);
    }

    const rows = await res.json();
    const isPremium = rows?.[0]?.is_premium === true;
    await bgSetStorage({ isPremium, isPremiumCachedAt: now });
    return { ok: true, isPremium, source: "profile" };
  } catch (error) {
    return {
      ok: false,
      isPremium: data.isPremium === true,
      source: "fallback",
      error: error?.message || String(error),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Free-tier usage gate (V1 two-tier launch). Premium/creator/admin resolve to
// unlimited LOCALLY via bgResolvePremiumStatus (internal-email + is_premium, which
// also reflects access_grants) and are NEVER metered — no network dependency, so
// the creator always passes even offline. Free users consult the server-
// authoritative `check-and-consume` edge fn. Fails OPEN on any error so a hiccup
// never breaks the product. Surfaces: voice_seconds, recording_seconds (daily,
// precheck at start + consume at stop), delegate_count (monthly), chat_count (daily).
// ─────────────────────────────────────────────────────────────────────────────
const BG_USAGE_FN_URL = `${BG_SUPABASE_URL}/functions/v1/check-and-consume`;
let bgVoiceSessionStartedAt = 0;
let bgRecordingStartedAt = 0;

async function bgGateSurface(surface, { action = "consume", amount = 1 } = {}) {
  try {
    const prem = await bgResolvePremiumStatus();
    if (prem.isPremium) return { allowed: true, unlimited: true };
    const { authToken } = await bgGetStorage(["authToken"]);
    if (!authToken) return { allowed: true, unlimited: false, anon: true };
    const res = await fetch(BG_USAGE_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: BG_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ surface, action, amount }),
    });
    if (!res.ok) return { allowed: true, degraded: true };
    return await res.json();
  } catch (_e) {
    return { allowed: true, degraded: true };
  }
}

// Tell a tab it hit a free-tier wall so the bar can show an upgrade nudge.
function bgNotifyQuota(tabId, surface, info = {}) {
  if (!tabId) return;
  chrome.tabs.sendMessage(
    tabId,
    { action: "sbQuotaExceeded", surface, limit: info.limit ?? null },
    () => { void chrome.runtime.lastError; },
  );
}

function bgConsumeVoiceSeconds() {
  if (!bgVoiceSessionStartedAt) return;
  const secs = Math.round((Date.now() - bgVoiceSessionStartedAt) / 1000);
  bgVoiceSessionStartedAt = 0;
  if (secs > 0) void bgGateSurface("voice_seconds", { action: "consume", amount: secs });
}

function bgConsumeRecordingSeconds() {
  if (!bgRecordingStartedAt) return;
  const secs = Math.round((Date.now() - bgRecordingStartedAt) / 1000);
  bgRecordingStartedAt = 0;
  if (secs > 0) void bgGateSurface("recording_seconds", { action: "consume", amount: secs });
}

// --- polling ---

async function bgPollRemoteCommands() {
  if (!navigator.onLine) return; // skip silently when offline
  const data = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId", "remoteProcessingId"], r));
  if (!data.authUserId) {
    console.log("[BgRemoteAgent] Not logged in, skipping poll");
    return;
  }

  let token = data.authToken;
  if (!token) {
    token = await bgRefreshAuthToken();
    if (!token) { console.log("[BgRemoteAgent] No token, skipping poll"); return; }
  }

  try {
    let res = await fetch(
      `${BG_SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
      { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    // JWT expired — refresh and retry once
    if (res.status === 401) {
      const newToken = await bgRefreshAuthToken();
      if (!newToken) { console.warn("[BgRemoteAgent] Token refresh failed"); return; }
      token = newToken;
      res = await fetch(
        `${BG_SUPABASE_URL}/rest/v1/agent_commands?status=eq.pending&order=created_at.asc&limit=1`,
        { headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    }
    if (!res.ok) {
      console.warn("[BgRemoteAgent] Poll failed:", res.status, await res.text());
      return;
    }
    const rows = await res.json();
    const cmd = rows[0];
    if (!cmd) return;

    // Atomic claim: flip pending→running conditionally. The realtime kick, the 1-min alarm poll,
    // and a long-running task used to race here (the old local "stale lock" self-cleared after 90s
    // and re-ran a still-running command — the duplicate-tabs bug). If another consumer already
    // claimed the row, this PATCH matches 0 rows and we skip.
    const claimRes = await fetch(
      `${BG_SUPABASE_URL}/rest/v1/agent_commands?id=eq.${cmd.id}&status=eq.pending`,
      {
        method: "PATCH",
        headers: { apikey: BG_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify({ status: "running" }),
      }
    );
    const claimed = claimRes.ok ? await claimRes.json() : [];
    if (!Array.isArray(claimed) || claimed.length === 0) {
      console.log("[BgRemoteAgent] Command already claimed elsewhere:", cmd.id);
      return;
    }

    console.log("[BgRemoteAgent] Found command:", cmd.id, cmd.task);
    chrome.storage.local.set({ remoteProcessingId: cmd.id, remoteProcessingTime: Date.now() });

    // Try side panel first — if it's open, let it handle with UI
    const forwarded = await forwardToSidePanel(cmd);
    if (!forwarded) {
      // Side panel closed — run the full agent loop here in background
      bgRunRemoteCommand(cmd, token);
    }
  } catch (e) {
    // Expected on network loss — warn only so Chrome error panel stays clean
    console.warn("[BgRemoteAgent] Error:", e.message || e);
  }
}

function forwardToSidePanel(cmd) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: "handleRemoteCommand", cmd }, (res) => {
      if (chrome.runtime.lastError) resolve(false);
      else resolve(true);
    });
    setTimeout(() => resolve(false), 300);
  });
}

async function bgFindReminderTabId() {
  const active = await bgGetActiveTabId();
  return active || null;
}

async function bgAnnounceCalendarReminder(tabId, text, finalDelayMs = 8000) {
  if (!tabId || !text) return;
  bgBrainUpdate(tabId, text, false, { speakHint: text, task: "Google Calendar reminder" });
  setTimeout(() => {
    bgBrainUpdate(tabId, text, true, { task: "Google Calendar reminder" });
  }, finalDelayMs);
}

async function bgOpenMeetForReminder(event) {
  const meetUrl = event?.meetUrl;
  if (!meetUrl) return null;
  return new Promise((resolve) => {
    chrome.tabs.create({ url: meetUrl, active: true }, async (tab) => {
      if (chrome.runtime.lastError || !tab?.id) {
        resolve(null);
        return;
      }
      await bgWaitForTabReady(tab.id, 12000);
      await bgDelay(1500);
      await bgSendInlineUiMessage(tab.id, { action: "startMeetingRecording" });
      resolve(tab);
    });
  });
}

async function bgCheckCalendarReminders() {
  const stored = await new Promise((resolve) => chrome.storage.local.get(["authUserId"], resolve));
  if (!stored.authUserId) return;
  try {
    const data = await bgCallCalendarFunction("google-calendar-reminders", { markDelivered: true });
    const reminders = Array.isArray(data?.reminders) ? data.reminders : [];
    if (!reminders.length) return;
    const tabId = await bgFindReminderTabId();
    for (const reminder of reminders) {
      const event = reminder?.event || {};
      const title = event.summary || "your meeting";
      if (reminder.kind === "start_now") {
        if (event.meetUrl) {
          await bgAnnounceCalendarReminder(tabId, `${title} is starting now. I’m opening the Meet and starting Meeting & Call mode.`);
          await bgOpenMeetForReminder(event);
        } else {
          await bgAnnounceCalendarReminder(tabId, `${title} is starting now, but I don’t see a Google Meet link on the event.`);
        }
      } else {
        const minutes = Math.max(1, Number(reminder.minutesUntilStart) || 15);
        await bgAnnounceCalendarReminder(tabId, `${title} starts in about ${minutes} minutes.`);
      }
    }
  } catch (error) {
    console.warn("[Braino][Calendar][BG] Reminder check skipped:", error);
  }
}

// Set up alarm for polling every minute (MV3 minimum is 1 minute)
chrome.alarms.create("remoteAgentPoll", { periodInMinutes: 1 });
chrome.alarms.create("calendarReminders", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "remoteAgentPoll") bgPollRemoteCommands();
  if (alarm.name === "calendarReminders") bgCheckCalendarReminders();
});
// Delay startup connections — gives the service worker time to settle
// and avoids flooding the Chrome error panel on a cold start with a flaky network
setTimeout(() => {
  bgPollRemoteCommands();
  bgCheckCalendarReminders();
  bgStartRealtime();
}, 2000);

// ===== AUTH — onMessageExternal (backup, from website directly) =====
chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
  if (message.action === "authToken") {
    storeAuthData(message);
    sendResponse({ success: true });
    return true;
  }
});

// ===== AUTH — relay from content script (primary, more reliable) =====
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "authTokenRelay") {
    storeAuthData(message);
    sendResponse({ success: true });
    return true;
  }
  if (message.action === "syncSpotifyPlayerState") {
    (async () => {
      try {
        if (!sender?.tab?.id) { sendResponse({}); return; }
        await bgPushSpotifyPlaybackState(sender.tab.id, {}, { focusSpotify: false });
        sendResponse({ ok: true });
      } catch (_) { sendResponse({ ok: false }); }
    })();
    return true;
  }
  if (message.action === "spotifyControl") {
    (async () => {
      try {
        await bgCallSpotifyFunction("spotify-playback", { action: message.control });
        if (sender?.tab?.id) {
          await bgPushSpotifyPlaybackState(sender.tab.id, {
            assumePlaying: message.control !== "pause",
          }, { focusSpotify: false });
        }
        sendResponse({ ok: true });
      } catch (e) {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
  if (message.action === "playBrainoFavoriteSong") {
    (async () => {
      try {
        await bgPlaySpotifyWithAutoOpen([BG_BRAINO_FAVORITE_SONG_URI]);
        sendResponse({ ok: true });
      } catch (e) {
        const msg = e?.message || "favorite song failed";
        console.warn("[Braino][Spotify][BG] Favorite song failed:", msg);
        sendResponse({ ok: false, error: msg });
      }
    })();
    return true;
  }
});

function storeAuthData(data) {
  const isInternalPremium = bgIsInternalPremiumEmail(data.email);
  chrome.storage.local.set({
    authToken: data.token,
    authRefreshToken: data.refreshToken,
    authDisplayName: data.displayName,
    authEmail: data.email,
    authUserId: data.userId,
    ...(isInternalPremium ? { isPremium: true, isPremiumCachedAt: Date.now() } : {}),
  });
  // Auto-close the auth tab(s) opened by the extension.
  bgCloseSilentAuthTabs();
  // Restart realtime with fresh credentials
  bgStartRealtime();
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["USER_MEDIA"],
      justification: "Recording tab audio for lecture notes",
    });
  }
}

// ── Extension microphone permission ─────────────────────────────────────────
// The offscreen document is invisible, so getUserMedia there can't show a prompt. We grant
// mic permission ONCE via a small visible helper window (extension origin); the offscreen
// doc then inherits it (same origin). Cached in storage so it never asks twice.
let bgMicPermissionWindowId = null;
let bgMicPermissionWaiters = [];

function bgResolveMicPermission(granted) {
  if (granted) chrome.storage.local.set({ sbMicPermission: "granted", sbOffscreenRtBroken: false });
  else chrome.storage.local.set({ sbMicPermission: "denied" });
  const waiters = bgMicPermissionWaiters;
  bgMicPermissionWaiters = [];
  for (const w of waiters) { try { w(granted); } catch (_) {} }
  if (bgMicPermissionWindowId != null) {
    const id = bgMicPermissionWindowId;
    bgMicPermissionWindowId = null;
    chrome.windows.remove(id).catch(() => {});
  }
  // Dismiss any in-page modal that was injected into a tab.
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
    const id = tabs?.[0]?.id;
    if (id != null) chrome.tabs.sendMessage(id, { action: "hideMicPermission" }, () => { void chrome.runtime.lastError; });
  });
}

async function ensureExtensionMicPermission() {
  const { sbMicPermission } = await chrome.storage.local.get(["sbMicPermission"]);
  if (sbMicPermission === "granted") return true;

  // Already prompting — join the existing outcome.
  if (bgMicPermissionWaiters.length || bgMicPermissionWindowId != null) {
    return await new Promise((resolve) => bgMicPermissionWaiters.push(resolve));
  }

  const result = new Promise((resolve) => {
    bgMicPermissionWaiters.push(resolve);
    setTimeout(() => { if (bgMicPermissionWaiters.length) bgResolveMicPermission(false); }, 60000);
  });

  // Preferred: show an in-page modal (same tab the user is on) by asking the active tab's
  // content script to inject the permission iframe. Falls back to a small window if the
  // active tab can't host it (chrome://, web store, no content script).
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  let shownInPage = false;
  if (activeTab?.id != null && /^https?:/i.test(activeTab.url || "")) {
    shownInPage = await new Promise((resolve) => {
      chrome.tabs.sendMessage(activeTab.id, { action: "showMicPermission" }, (resp) => {
        if (chrome.runtime.lastError) { resolve(false); return; }
        resolve(!!resp?.shown);
      });
    });
  }
  if (!shownInPage) {
    chrome.windows.create(
      { url: chrome.runtime.getURL("mic-permission.html"), type: "popup", width: 420, height: 360, focused: true },
      (win) => {
        if (chrome.runtime.lastError || !win) { bgResolveMicPermission(false); return; }
        bgMicPermissionWindowId = win.id;
      }
    );
  }

  return await result;
}

// If the helper window is closed/destroyed without a result, treat as not-granted.
chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === bgMicPermissionWindowId) {
    bgMicPermissionWindowId = null;
    if (bgMicPermissionWaiters.length) bgResolveMicPermission(false);
  }
});

async function ensureOffscreenForRealtime() {
  // Realtime lives in the offscreen doc so the mic/session can follow tabs instantly.
  // Any remote model audio is muted there; Braino's primary audible output is Fish Audio.
  // Close and recreate if needed so the global realtime host is definitely available.
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });
  if (contexts.length > 0) {
    const hasAudio = contexts[0].documentUrl && true; // can't inspect reasons, so just check recording isn't active
    if (isRecording) return; // don't disrupt an active lecture recording — realtime will fallback in-tab
    await chrome.offscreen.closeDocument().catch(() => {});
  }
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
    justification: "Realtime voice AI — global mic input with muted remote track hosting across tabs",
  });
}

// Voice "presence" (blue globe) follows the focused tab: the tab losing focus drops it,
// the tab gaining focus takes it over. Works for BOTH session types — a global offscreen
// session (instant visual attach) and a migrating in-tab session (the new tab spins one up,
// the old tab tears its down). Gated on voice mode being on (offscreen active OR the
// persistent sbVoiceModeOn flag), not just the offscreen session.
let bgVoiceVisualTabId = null;
let bgVoiceModeOn = false;
chrome.storage.local.get(["sbVoiceModeOn"], (r) => { bgVoiceModeOn = !!r?.sbVoiceModeOn; });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "sbVoiceModeOn" in changes) {
    bgVoiceModeOn = !!changes.sbVoiceModeOn.newValue;
    if (!bgVoiceModeOn) bgVoiceVisualTabId = null;
  }
});

function bgVoiceFollowing() { return bgRtSessionActive || bgVoiceModeOn; }

function bgHandoffVoicePresence(newTabId) {
  if (!bgVoiceFollowing() || newTabId == null) return;
  // Detach the previous presence tab (if different) so it goes back to idle / stops.
  if (bgVoiceVisualTabId != null && bgVoiceVisualTabId !== newTabId) {
    chrome.tabs.sendMessage(bgVoiceVisualTabId, { action: "sbRtDetach" }, () => { void chrome.runtime.lastError; });
  }
  bgVoiceVisualTabId = newTabId;
  chrome.tabs.sendMessage(newTabId, { action: "sbRtAttach" }, () => { void chrome.runtime.lastError; });
}

// Tab switch within a window.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  bgHandoffVoicePresence(tabId);
});

// Window switch (e.g. moving to another browser window) — hand off to that window's active tab.
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (!bgVoiceFollowing() || windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    const id = tabs?.[0]?.id;
    if (id != null) bgHandoffVoicePresence(id);
  });
});

// Re-attach when the focused tab finishes navigating (fresh content script). The startup
// storage check in __sbBuildBrainUI is the primary path; this is belt-and-suspenders.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!bgVoiceFollowing() || changeInfo.status !== "complete") return;
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.active) return;
    setTimeout(() => bgHandoffVoicePresence(tabId), 300);
  });
});

async function startRecording(tabId, existingStreamId, withMic, mode) {
  let streamId;
  if (existingStreamId) {
    streamId = existingStreamId;
  } else if (tabId) {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  } else {
    throw new Error("No tab ID or stream ID provided");
  }

  if (withMic) {
    const micOk = await ensureExtensionMicPermission();
    if (!micOk) {
      throw new Error("Microphone access is required for Meeting mode so Braino can capture your voice.");
    }
  }

  await ensureOffscreen();

  await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { target: "offscreen", action: "startCapture", streamId, withMic: !!withMic },
      (res) => {
        if (res?.error) reject(new Error(res.error));
        else resolve();
      }
    );
  });

  isRecording = true;
  bgRecordingMode = bgNormalizeRecordingMode(mode);
}

async function stopRecording() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { target: "offscreen", action: "stopCapture" },
      (res) => {
        isRecording = false;
        bgRecordingMode = "lecture";
        if (res?.error) reject(new Error(res.error));
        else resolve(res);
      }
    );
  });
}

async function bgGetAudioSegment() {
  await ensureOffscreen();
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ target: "offscreen", action: "getSegment" }, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res || {});
    });
  });
}

async function bgTranscribeAudioChunk({ audioBase64, existingNotes = "", existingTranscript = "", mode = "lecture", knownSpeakerReferences = [] }) {
  const stored = await new Promise(r => chrome.storage.local.get(["authToken"], r));
  if (!stored.authToken) return { error: "Not signed in", notes: existingNotes };

  if (!audioBase64) return { notes: existingNotes, empty: true };

  try {
    const res = await fetch(`${BG_API_BASE}/transcribe-and-notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${stored.authToken}`,
        apikey: BG_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        audioSegments: [audioBase64],
        existingNotes,
        existingTranscript,
        mode: bgNormalizeRecordingMode(mode),
        knownSpeakerReferences,
        clientNow: new Date().toISOString(),
        clientTimeZone: bgCalendarTimeZone(),
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      let errorMessage = `Transcription failed (${res.status})`;
      try {
        const parsed = JSON.parse(txt);
        errorMessage = parsed?.error || parsed?.details || errorMessage;
      } catch (_) {
        if (txt) errorMessage = txt;
      }
      const lowered = String(errorMessage || "").toLowerCase();
      if (res.status === 400 && (lowered.includes("no speech detected") || lowered.includes("no audio data provided"))) {
        return { notes: existingNotes, empty: true };
      }
      return { error: errorMessage, notes: existingNotes };
    }
    const json = await res.json();
    return {
      notes: json.notes || existingNotes,
      transcript: json.transcript || "",
      meetingArtifacts: json.meetingArtifacts || null,
    };
  } catch (e) {
    return { error: e.message || "Transcription failed", notes: existingNotes };
  }
}

async function bgGetAndTranscribeSegment(existingNotes, mode, existingTranscript) {
  const segRes = await bgGetAudioSegment();
  return bgTranscribeAudioChunk({
    audioBase64: segRes?.audioBase64 || null,
    existingNotes,
    existingTranscript,
    mode: mode || bgRecordingMode,
    knownSpeakerReferences: Array.isArray(segRes?.knownSpeakerReferences) ? segRes.knownSpeakerReferences : [],
  });
}

async function bgStopRecordingAndTranscribe(existingNotes, mode, existingTranscript) {
  const activeMode = bgNormalizeRecordingMode(mode || bgRecordingMode);
  try {
    const stopRes = await stopRecording();
    return await bgTranscribeAudioChunk({
      audioBase64: stopRes?.audioBase64 || null,
      existingNotes,
      existingTranscript,
      mode: activeMode,
      knownSpeakerReferences: Array.isArray(stopRes?.knownSpeakerReferences) ? stopRes.knownSpeakerReferences : [],
    });
  } finally {
    bgRecordingMode = "lecture";
  }
}

function bgBuildMeetingFollowUpDateTime(dateIso, timeText, durationMinutes = 30) {
  const rawDate = String(dateIso || "").trim();
  const dateOnlyMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const baseDate = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(rawDate);
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("I couldn't resolve the follow-up date from the meeting.");
  }
  const parsedTime = bgParseCalendarTimeFragment(timeText || "");
  if (!parsedTime) {
    throw new Error("Tell me the time for that follow-up first, for example 3pm.");
  }
  const start = new Date(baseDate);
  start.setHours(parsedTime.hour, parsedTime.minute, 0, 0);
  const end = new Date(start.getTime() + Math.max(15, Number(durationMinutes) || 30) * 60 * 1000);
  const timeZone = bgCalendarTimeZone();
  return {
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone },
  };
}

async function bgScheduleMeetingFollowUp(followUp, tabId) {
  const summary = String(followUp?.summary || "").trim() || "Follow-up call";
  const attendeeName = String(followUp?.attendeeName || "").trim();
  const timeText = String(followUp?.timeText || "").trim();
  const dateIso = String(followUp?.dateIso || "").trim();
  const durationMinutes = Number(followUp?.durationMinutes || 30);
  const sourceQuote = String(followUp?.sourceQuote || "").trim();

  const { start, end } = bgBuildMeetingFollowUpDateTime(dateIso, timeText, durationMinutes);

  let attendees = Array.isArray(followUp?.attendees)
    ? followUp.attendees.map((value) => bgNormalizeEmail(value)).filter(Boolean)
    : [];

  if (!attendees.length && attendeeName) {
    const resolvedContact = await bgResolveBrainoContact(attendeeName, {
      tabId,
      requireEmail: true,
      actionLabel: "calendar invites",
    });
    if (!resolvedContact.ok) {
      return { error: resolvedContact.message || bgBuildMissingContactMessage(attendeeName, "calendar invites") };
    }
    if (resolvedContact.contact?.email) {
      attendees = [resolvedContact.contact.email];
    }
  }

  const description = [
    "Created by Braino from a meeting follow-up.",
    sourceQuote ? `Source quote: "${sourceQuote}"` : "",
  ].filter(Boolean).join("\n\n");

  const result = await bgCallCalendarFunction("google-calendar-action", {
    action: "create_event",
    summary,
    description,
    attendees,
    start,
    end,
    createMeet: true,
    sendUpdates: attendees.length ? "all" : "none",
  });

  return { ok: true, event: result?.event || null };
}

async function bgSyncToNotion(markdown, title) {
  const stored = await new Promise(r => chrome.storage.local.get(["authToken", "authUserId"], r));
  if (!stored.authToken || !stored.authUserId) return { error: "Not signed in" };

  const syncRes = await fetch(`${BG_API_BASE}/sync-to-notion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stored.authToken}`,
      apikey: BG_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ userIdentifier: stored.authUserId, title: title || "Lecture Notes", markdown }),
  });
  const syncJson = await syncRes.json().catch(() => ({}));
  if (!syncRes.ok) {
    const msg = syncJson.error || "";
    if (syncRes.status === 401 || msg.toLowerCase().includes("not connected")) return { error: "not_connected" };
    return { error: msg || "Notion sync failed" };
  }
  return { success: true, url: syncJson.url };
}
