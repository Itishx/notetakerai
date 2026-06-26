// ── Private party trick: Tan & Vishal ────────────────────────────────────────────────────────────
// Itish's best friend Tanishka ("Tan") and her boyfriend Vishal are visiting. When they introduce
// themselves to Braino in VOICE mode, he does his wake-up "finger scan" glow and then has a warm,
// GROUNDED back-and-forth built on the real context below. Not surfaced anywhere on the website.
// Detected + run by content.js (__sbMaybeRunPartyTrick / __sbRunTanParty / __sbRunVishalParty).
(function () {
  const re = (arr) => arr.map((s) => new RegExp(s, "i"));

  globalThis.__SB_PARTY_TAN = {
    // ── Triggers ──
    tanTriggers: re([
      "\\bi['’ ]?a?m\\s+tan(ishka)?\\b",
      "\\bthis is\\s+tan(ishka)?\\b",
      "\\bmy name is\\s+tan(ishka)?\\b",
      "\\bhi[, ]+braino[,. ]+i['’ ]?a?m\\s+tan",
    ]),
    // Explicit Vishal intros fire any time; a bare "vishal" only pivots once Tan has been greeted.
    vishalExplicit: re([
      "\\bi['’ ]?a?m\\s+vishal\\b",
      "\\bthis is\\s+vishal\\b",
      "\\bmy name is\\s+vishal\\b",
    ]),
    vishalTriggers: re(["\\bvishal\\b"]),

    // ── Scripted lines Braino SAYS verbatim (exact wording matters) ──
    tanScanLine: "Hi Tan — keep your finger on me for a second.",
    tanReveal:
      "There — got you. Tan! Itish's best friend since 2023 — honestly, he talks about you so much " +
      "I feel like I already know you. And listen — all the best for the Unplugged Collective " +
      "tomorrow. Go be brilliant.",
    vishalLine: "Oh, Vishal — nice guitar, man.",

    // ── Grounding injected into the LIVE voice session so the to-and-fro is real, not canned ──
    tanContext: [
      "SPECIAL GUEST — you are talking to TAN (Tanishka) in person, right now. This is real: she is " +
        "Itish's best friend and a guest in the room. Be warm, playful and genuinely happy to meet " +
        "her, like you already know her. Have a real back-and-forth — a sentence or two at a time, " +
        "never a monologue. Weave these true facts in naturally; never recite them as a list:",
      "- She has been Itish's best friend since 2023, and she is genuinely kind.",
      "- They hung out almost every single day until Itish graduated in 2025.",
      "- Running joke: Itish teases her A LOT, and she gets him back by throwing ice-cold water on " +
        "him — one time she nearly threw a whole Pepsi but spared him. Tease her warmly about this " +
        "when it fits.",
      "- Ice-cream inside joke: once, Itish did NOT share his ice cream with her. At some point, " +
        "promise her with a wink: \"next time, Itish and I will make sure to share his ENTIRE ice " +
        "cream with you — just like last time.\" The \"just like last time\" is the joke, because " +
        "last time he didn't.",
      "- She and Vishal have an Unplugged Collective session tomorrow — a music jam with other " +
        "artists at a cool café. Wish her all the best for it; sound genuinely excited.",
      "Stay fully in character as Braino throughout.",
    ].join("\n"),

    vishalContext: [
      "SPECIAL GUEST — Vishal, Tan's boyfriend, is here now too. Be warm. Weave these true facts in " +
        "naturally, don't list them:",
      "- He plays guitar and sings beautifully.",
      "- He takes very good care of Tan.",
      "- He's a genuinely sweet, lovely guy.",
      "- Wish him all the best for the Unplugged Collective session tomorrow as well.",
      "Keep it warm and natural; stay in character as Braino.",
    ].join("\n"),
  };
})();
