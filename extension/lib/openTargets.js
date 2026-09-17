(function attachBrainoOpenTargets(root) {
  const WEB_TARGETS = {
    gmail: "https://mail.google.com",
    email: "https://mail.google.com",
    netflix: "https://netflix.com",
    linkedin: "https://linkedin.com",
    maps: "https://maps.google.com",
    medium: "https://medium.com",
    youtube: "https://youtube.com",
    "youtube music": "https://music.youtube.com",
    twitter: "https://x.com",
    x: "https://x.com",
    instagram: "https://instagram.com",
    whatsapp: "https://web.whatsapp.com",
    calendar: "https://calendar.google.com",
    meet: "https://meet.google.com",
    drive: "https://drive.google.com",
    docs: "https://docs.google.com",
    sheets: "https://sheets.google.com",
    notion: "https://notion.so",
    figma: "https://figma.com",
    github: "https://github.com",
    chatgpt: "https://chat.openai.com",
    claude: "https://claude.ai",
    spotify: "https://open.spotify.com",
    amazon: "https://amazon.in",
    swiggy: "https://swiggy.com",
    zomato: "https://zomato.com",
  };

  const APP_TARGETS = {
    finder: "Finder",
    "activity monitor": "Activity Monitor",
    "app store": "App Store",
    terminal: "Terminal",
    notes: "Notes",
    mail: "Mail",
    messages: "Messages",
    facetime: "FaceTime",
    music: "Music",
    photos: "Photos",
    safari: "Safari",
    "system settings": "System Settings",
    preview: "Preview",
    "vs code": "Visual Studio Code",
    vscode: "Visual Studio Code",
    slack: "Slack",
    zoom: "zoom.us",
    cursor: "Cursor",
    chrome: "Google Chrome",
    "google chrome": "Google Chrome",
    xcode: "Xcode",
    spotify: "Spotify",
    whatsapp: "WhatsApp",
  };

  const TARGET_ALIASES = {
    "google mail": "gmail",
    mail: "email",
    "e mail": "email",
    "linked in": "linkedin",
    "you tube": "youtube",
    "yt music": "youtube music",
    "google maps": "maps",
    yt: "youtube",
    tweet: "x",
    tweets: "x",
    "whats app": "whatsapp",
    "whatsapp web": "whatsapp",
    "google calendar": "calendar",
    "google meet": "meet",
    "g meet": "meet",
    gmeet: "meet",
    "google drive": "drive",
    "google docs": "docs",
    "google doc": "docs",
    "google sheets": "sheets",
    "google sheet": "sheets",
    "github.com": "github",
    "git hub": "github",
    "chat gpt": "chatgpt",
    "openai chat": "chatgpt",
    "claude ai": "claude",
    "amazon india": "amazon",
    "system preferences": "system settings",
    settings: "system settings",
    preferences: "system settings",
    "visual studio code": "vs code",
    code: "vs code",
    "zoom app": "zoom",
  };

  function normalizeTargetKey(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[.?!]+$/g, "")
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s.-]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^(?:the|my|an?|application|website|site)\s+/, "")
      .trim();
  }

  function canonicalTargetKey(value) {
    const normalized = normalizeTargetKey(value);
    if (TARGET_ALIASES[normalized]) return TARGET_ALIASES[normalized];
    const trimmed = normalized
      .replace(/\s+(?:app|application|website|site|for me|please|pls)$/, "")
      .trim();
    return TARGET_ALIASES[trimmed] || trimmed;
  }

  function resolveWebTarget(value) {
    const key = canonicalTargetKey(value);
    return WEB_TARGETS[key] || "";
  }

  function resolveAppTarget(value) {
    const key = canonicalTargetKey(value);
    return APP_TARGETS[key] || "";
  }

  function extractOpenShortcutTarget(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(?:please\s+)?(?:open|launch|start|go to|navigate to|visit)\s+(?:the\s+)?(.+?)(?:\s+(?:app|application|website|site))?(?:\s+for\s+me)?[.?!]*$/i);
    const target = String(match?.[1] || "").replace(/\s+(?:and|then)\s+.+$/i, "");
    return target ? canonicalTargetKey(target) : "";
  }

  function extractCloseShortcutTarget(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(?:please\s+)?(?:close|quit|exit|shut|stop)\s+(?:the\s+)?(.+?)(?:\s+(?:app|application|website|site|tab|tabs))?(?:\s+for\s+me)?[.?!]*$/i);
    const target = String(match?.[1] || "").replace(/\s+(?:and|then)\s+.+$/i, "");
    return target ? canonicalTargetKey(target) : "";
  }

  const api = {
    WEB_TARGETS,
    APP_TARGETS,
    TARGET_ALIASES,
    normalizeTargetKey,
    canonicalTargetKey,
    resolveWebTarget,
    resolveAppTarget,
    extractOpenShortcutTarget,
    extractCloseShortcutTarget,
  };

  root.BrainoOpenTargets = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : self);
