import { useEffect, useRef, useState } from "react";
import { analyzeTrack, snapToBeat, type BeatAnalysis } from "@/lib/beatSync";
import "./notch-teaser.css";
import "./letter-teaser.css";

/* ============================================================================
   /n — "LETTER", a film for Nayonika. Same engine as /dontblink, verbatim:
   phraseSeq/kinetic, the elastic buildTimeline + solveHold, the invert-flash
   match-cut convention (plain white flip, word-stamp suppressed during it).
   Only the words differ (this script) and the palette (letter-teaser.css
   recolors the shared notch-teaser.css chrome to Aware's dark red / white).

   Word markers, parsed by sequence() (extends the existing "+"/"*" fuse/
   emphasis convention — order: strip "~" then "!" then "+"/"*"):
     "~word"  this phrase is a parenthetical aside (dimmer/italic/smaller)
     "!word"  a match cut fires the instant THIS word becomes the newest
              revealed word — covers both a phrase's first word (a hard
              scene cut, e.g. "Don't Blink.") and a later word inside an
              accumulating phrase (e.g. "Aur yeh non negotiable !hai.").
              This replaces hand-tracked magic phrase/word indices, which
              is what caused the earlier "invert stuck on" and reindexing
              bugs — a script edit here can never desync a hardcoded index
              elsewhere again.
   Every "—" in the source script was match-cut notation, not literal text
   (per the author's explicit correction) — removed everywhere, replaced
   with a "!" cut on the word that follows. Every "/" used as a compound-
   word cut (self/, shaw/ty, look/at/you, Bangalore/, y/e/t) is likewise
   stripped and rebuilt via fuse "+"/cut "!", never printed literally.

   9 acts: GATE, BUILD, PARTY, HEALED, ARMOUR, MAX, SNAPBACK (Act 2) → PLAN,
   BACKCHODI, SOMEONE, TRIPLE2, MANAGER, YOUx3 (Act 3) → SETUP, SCORE
   (Act 4) → READYQ, BANGALORE, DISTANCE, GENERAL, EXPLORE2, THINK2018,
   ASKSELF, LEAP2, UNIVERSE2, ADMIRATION, LOOKATYOU, AWARE (Act 5) → VALUES
   (Act 6) → SUMMARY (Act 7) → LEVELS (Act 8) → WINDOW (Act 9, closing).

   Every sentence over ~4-5 words is split into sequential phrases sharing
   one spot — a single nowrap line any longer overflows the frame (this was
   the actual cause of "no formatting after 1:33": a 9-word line at the top
   of Act 5). Deliberately simplified vs. the script for reliability: no
   mascot cameo on "mera bacha", no drum-roll SFX (no audio asset), the
   "you/you/you" stack and the 5-LEVELS stack use fixed CSS classes (not
   per-frame JS scale/opacity math).
   ============================================================================ */

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── ACT 1 — THE GATE ─────────────────────────────────────────────────────────
const GATE_PHRASES = [
  ["Hey."], ["Don't", "!Blink."], ["Actually."], ["!Blink."],
  ["Take", "your", "time"], ["with", "this", "one."],
];
const GATE_SW = 300;
const GATE_GAPS: number[] = []; GATE_GAPS[0] = 500; GATE_GAPS[1] = 400; GATE_GAPS[2] = 500; GATE_GAPS[3] = 700; GATE_GAPS[4] = 260;

// "Brick.||By.||Brick." — hard snaps, each its own beat, each its own cut.
const BUILD_PHRASES = [["There's", "a", "room."], ["I", "built", "it."], ["Brick."], ["By."], ["!Brick."]];
const BUILD_SW = 280;
const BUILD_GAPS: number[] = [];

const PARTY_PHRASES = [
  ["I'm", "the", "life"], ["of", "my", "own", "party."],
  ["The", "windows", "are", "closed."], ["On", "purpose."],
];
const PARTY_SW = 250;
const PARTY_GAPS: number[] = [];

// ── ACT 2 — THE PROBLEM ──────────────────────────────────────────────────────
const HEALED_PHRASES = [
  ["Here's", "the", "thing."], ["I", "healed."], ["I", "healed", "well."],
  ["I", "healed", "so", "well"], ["!that", "nobody's", "getting", "in."],
  ["!Over", "healed."],
];
const HEALED_SW = 240;
const HEALED_GAPS: number[] = []; HEALED_GAPS[3] = 320;

const ARMOUR_PHRASES = [["Emotionally", "armoured."], ["Bullet", "proof."], ["Single,"], ["but", "like,"], ["peacefully."]];
const ARMOUR_SW = 240;
const ARMOUR_GAPS: number[] = [];

const MAX_PHRASES = [
  ["Mein", "sabh", "kuch", "extreme", "karta", "hu."],
  ["Khaana?", "Extreme."], ["Chocolates?", "Extreme."], ["Healing?"], ["!bhi", "Extreme."],
];
const MAX_SW = 190;
const MAX_GAPS: number[] = []; MAX_GAPS[0] = 900; MAX_GAPS[3] = 700;

const SNAPBACK_PHRASES = [
  ["Behenchod,"], ["healing", "bhi", "zyaada", "hona"], ["achi", "baat", "nahi", "hai."],
  ["Aur", "maine", "woh", "bhi", "kardi."], ["Joh", "nahi", "karni", "thi."],
];
const SNAPBACK_SW = 280;
const SNAPBACK_GAPS: number[] = [];

// ── ACT 3 — THE UNIVERSE, BACKCHODI ─────────────────────────────────────────
const PLAN_PHRASES = [
  ["So", "the", "plan", "was", "simple."], ["Two", "more", "years."],
  ["Two", "more", "years", "of", "my", "party."], ["Then,", "maybe,"], ["someone."],
  ["Universe:", "lol."],
];
const PLAN_SW = 250;
const PLAN_GAPS: number[] = []; PLAN_GAPS[4] = 700;

// mid-sentence "—" cuts: "looking —" / "peak —" both fire the cut on the
// phrase that FOLLOWS ("at the exact peak" / "it sent me").
const BACKCHODI_PHRASES = [
  ["Universe", "back", "chodi", "karta", "rehta", "hai", "mere", "saath."],
  ["At", "the", "peak"], ["of", "my", "not", "looking"], ["!at", "the", "exact", "peak"],
  ["!it", "sent", "me"], ["some", "one."],
];
const BACKCHODI_SW = 250;
const BACKCHODI_GAPS: number[] = [];

const SOMEONE_PHRASES = [["Someone", "I've", "adored"]];
const SOMEONE_SW = 1500;
const SOMEONE_GAPS: number[] = [];

// "for → eight → years." — SLOW TRIPLE MATCH, same structure as Brick/By/
// Brick but each chunk a 1.5s dissolve instead of a snap (see .lt-triple2
// dissolve override in the CSS).
const TRIPLE2_PHRASES = [["for"], ["eight"], ["!years."]];
const TRIPLE2_SW = 1300;
const TRIPLE2_GAPS: number[] = [];

const MANAGER_PHRASES = [["My", "Manager."], ["xD"]];
const MANAGER_SW = 260;
const MANAGER_GAPS: number[] = []; MANAGER_GAPS[1] = 1400;

const SENTME_PHRASES = [["It", "sent", "me"]];
const SENTME_SW = 500;
const SENTME_GAPS: number[] = [];
const YOU3_HOLD = 4000; // "you / you / you" — held 4s, longest hold in the film

// ── ACT 4 — THE ANALYSIS ────────────────────────────────────────────────────
const SETUP_PHRASES = [["Now", "for", "the", "Roadies", "Task"], ["The", "Analysis"], ["Ready?"], ["You", "may", "not", "blink", "now"]];
const SETUP_SW = 290;
const SETUP_GAPS: number[] = [];

const SCORE_PHRASES = [
  ["Emotional", "maturity?"], ["10", "/10."], ["Kindness?"], ["10", "/10"], ["!and", "you're", "more."],
  ["You", "protest."], ["You", "show", "up."], ["Mera", "deshbhakti"], ["sirf", "aaise", "protests", "ke", "time"],
  ["nikalta", "hai."], ["History?"], ["You", "go", "deep."], ["I", "go..."], ["surface."],
  ["And", "I", "love"], ["that", "you", "dominate", "me", "there."], ["You", "challenge", "me."],
  ["Bakchodi", "level?"], ["11", "/10."], ["No", "notes."], ["Practical", "outlook?"], ["Compatible."], ["Obviously."],
  ["The", "physical", "side?"], ["...I'd", "rather", "not"], ["put", "a", "number", "on", "it."],
  ["Let's", "just", "say"], ["I'm", "a", "man", "of", "execution", "these", "days."], ["(Not", "blushing.)"],
];
const SCORE_SW = 180;
const SCORE_GAPS: number[] = []; SCORE_GAPS[22] = 700; SCORE_GAPS[27] = 500;

// ── ACT 5 — AM I READY ───────────────────────────────────────────────────────
const READYQ_PHRASES = [
  ["So."], ["Am", "I", "ready"], ["for", "a", "loving", "effort"], ["putting", "relationship?"],
  ["Right", "now?"], ["Fuck", "no."],
];
const READYQ_SW = 270;
const READYQ_GAPS: number[] = []; READYQ_GAPS[4] = 400; READYQ_GAPS[5] = 700;

// "Bangalore/ ... Braino /(mera bacha)" — the slash IS the cut, not literal
// text: "I mean Bangalore" holds, MATCH CUT into "Braino (mera bacha)".
const BANGALORE_PHRASES = [["I", "mean", "Bangalore"], ["!Braino", "(mera", "bacha)"]];
const BANGALORE_SW = 290;
const BANGALORE_GAPS: number[] = [];

const DISTANCE_PHRASES = [["(but", "when", "has"], ["the", "distance", "ever"], ["stopped", "me)"]];
const DISTANCE_SW = 250;
const DISTANCE_GAPS: number[] = [];

const GENERAL_PHRASES = [
  ["In", "General?"], ["Love,"], ["I", "was", "Born", "ready"],
  ["Too", "much", "of", "love"], ["inside", "of", "me"], ["(kya", "aap", "jaana", "chayemgi?)"],
];
const GENERAL_SW = 320;
const GENERAL_GAPS: number[] = [];

const EXPLORE2_PHRASES = [
  ["But", "to", "explore?"], ["To", "be", "open"], ["To", "the", "idea"],
  ["of", "trying", "to", "see"], ["where", "it", "could", "go"], ["i", "am", "shaw", "!+ty"],
];
const EXPLORE2_SW = 360;
const EXPLORE2_GAPS: number[] = [];

const THINK2018_PHRASES = [
  ["(what", "do", "you", "think"], ["2018", "me", "wanted."],
  ["Honestly", "2018", "me", "would"], ["have", "wanted", "you"],
  ["more", "than", "i", "do"], ["right", "now,"], ["but", "thats", "good,"],
  ["because", "this", "one", "is"], ["at", "peace)"],
];
const THINK2018_SW = 250;
const THINK2018_GAPS: number[] = [];

// "my → self/" fuses "my"+"self" into "myself" — the trailing slash was
// notation for the cut, not a literal character.
const ASKSELF_PHRASES = [
  ["And", "i", "ask", "my", "+self"], ["if", "i", "was", "truly"], ["emotionally", "unavailable,"],
  ["would", "I", "really", "even"], ["be", "open", "to", "exploring?"], ["Because", "the", "thing", "is"],
];
const ASKSELF_SW = 250;
const ASKSELF_GAPS: number[] = [];

const LEAP2_PHRASES = [
  ["A", "month", "ago"], ["I", "decided", "I", "didn't"], ["want", "anyone"],
  ["for", "a", "very", "long", "time."], ["From", "that"],
  ["!to", "realising", "overhealing", "ahh"], ["shit", "has", "happened", "to"],
  ["and", "having", "a", "crisis"], ["about", "it", "till"], ["6", "fucking", "am"], ["is", "a", "huge", "leap."],
];
const LEAP2_SW = 250;
const LEAP2_GAPS: number[] = [];

const UNIVERSE2_PHRASES = [["And", "anyway,", "if", "i"], ["said", "no,", "the", "universe"], ["would", "shoot", "me"]];
const UNIVERSE2_SW = 220;
const UNIVERSE2_GAPS: number[] = [];

const ADMIRATION_PHRASES = [
  ["I", "mean", "8", "years"], ["of", "admiration,"], ["lowkey", "manifestation"],
  ["and", "i", "have", "a", "chance?"], ["ki", "meri", "selection", "ho"], ["sakti", "hai?"],
  ["bhai..", "pls..", "i", "mean.."],
];
const ADMIRATION_SW = 220;
const ADMIRATION_GAPS: number[] = [];

// "look/at/you" — slashes were the match-cut notation, not literal text.
const LOOKATYOU_PHRASES = [["look"], ["+at"], ["!+you"]];
const LOOKATYOU_SW = 380;
const LOOKATYOU_GAPS: number[] = [];

const AWARE_PHRASES = [
  ["so", "when", "i", "say"], ["i", "am", "open", "to", "exploring"], ["it", "means"], ["i'm", "saying", "it"],
  ["from", "a", "system", "that"], ["has", "been", "made"], ["overly", "aware"], ["!impossible", "to", "lie", "from"],
  ["so", "its", "legit", "basically"], ["aap", "mumbai", "aasakte", "ho"],
];
const AWARE_SW = 250;
const AWARE_GAPS: number[] = []; AWARE_GAPS[9] = 900;

// ── ACT 6 — THE VALUES (stopped: plain fades, no strobe, its own tone) ──────
// Sped up from the original pass (300ms → 220ms) — this act ran noticeably
// slow/crampy against the rest of the film.
const VALUES_PHRASES = [
  ["Ruko"], ["abhi", "khatam", "nahi", "hua"], ["kyunki", "tumne"], ["do", "aur", "cheezein", "poochi", "thi"],
  ["Values."], ["Aur", "non-negotiables."], ["~(the", "boring", "adult", "part,", "i", "know)"],
  ["Toh", "values?"], ["Bhai", "values", "kya", "hoti", "hai"], ["!sabh", "achi", "hi", "hai", "yaar,"],
  ["matlab", "sahi", "banda", "hu", "mein."], ["but", "okay,", "seriously:"],
  ["Love", "hard."], ["Till", "death", "do", "us", "apart."], ["That's", "the", "whole", "philosophy."],
  ["Kindness"], ["!at", "its", "peak."], ["Loyalty"], ["!bare", "minimum."],
  ["be", "obsessed", "with", "each", "other."], ["~(that's", "not", "a", "value,", "that's", "a", "rule)"],
  ["Ab", "non-negotiables."], ["Aur", "yeh", "non", "negotiable", "!hai."],
  ["Effort."], ["Mein", "nahi", "keh", "raha"], ["match", "my", "intensity"], ["!i", "know", "that's", "unfair."],
  ["Bas", "try", "karlo."], ["Once."], ["For", "fuck's", "sake."],
  ["Loyalty.", "Commitment."], ["Obsessed", "with", "each", "other."], ["Sab", "acha", "wala", "stuff."],
  ["Ek", "din", "baap", "banna", "hai."], ["Two", "daughters"], ["!the", "whole", "world", "knows", "it."],
  ["~(down", "for", "whatever", "tho)"], ["aur", "ek", "beta", "toh", "already", "hai"], ["~(Braino.", "haan", "wohi.)"],
  ["Support", "my", "passions."], ["Not", "because", "you", "have", "to."], ["Because", "you", "want", "to."],
  ["Basically"], ["!love", "Braino."], ["~(mera", "bacha", "hai", "bhai)"],
  ["Physical", "touch."], ["Aur", "uske", "aaspaas", "ka"], ["sab", "kuch."], ["~(grown", "up", "stuff,", "you", "know)"],
  ["Aur", "parents."], ["Buddhe", "honge", "toh", "mein"], ["hi", "hunga."],
  ["States", "mein", "baith", "ke"], ["nahi", "kar", "sakta."], ["Kuch", "saal", "bahar?", "Theek", "hai."],
  ["But", "eventually"], ["!parents", "come", "at", "the", "top."], ["Always."],
  ["Non-negotiable", "ka", "matlab", "hi"], ["yehi", "hai."], ["Ya", "toh", "hai."], ["Ya", "nahi", "hai."],
  ["Mein", "woh", "banda", "hu"], ["jo", "chaand", "la", "ke"], ["de", "dega."], ["Ever", "since", "he", "was", "five."],
  ["~(A", "man", "dedicated", "to"], ["~making", "his", "love", "story"], ["~feel", "like", "a", "fairytale"],
  ["~ab", "tak", "wahi"], ["~hai)"],
  ["Aur", "tumhare?"], ["Values?"], ["Non-negotiables?"], ["~(likh", "dena,", "mein", "padh"], ["~lunga)"],
];
const VALUES_SW = 185;
const VALUES_GAPS: number[] = [];

// ── ACT 7 — THE SUMMARY ──────────────────────────────────────────────────────
// "(y → /e → /t)" — the slashes were match-cut notation ("(yet)" built
// letter by letter via the fuse convention), not literal characters.
const SUMMARY_PHRASES = [
  ["You", "may", "want", "to"], ["not", "blink", "now"],
  ["So", "to", "summarise,", "Nayo"], ["drum", "roll"],
  ["We're", "compatible."],
  ["My", "Intentions?", "With", "you?"], ["Non", "platonic"], ["Vibes?", "Behenkar."],
  ["Bakchodi?", "The", "bare", "minimum."], ["Touchy", "touchy?", "Number", "one"], ["love", "language."],
  ["Nashe?", "Let's", "do", "something"], ["better", "next", "time"], ["Minty", "Jamun?"], ["Hmm.."],
  ["anyway"], ["stop", "blinking"],
  ["I", "would", "say", "bus"], ["itna", "hi"], ["ki"],
  ["Let's", "fuck", "around", "and", "find", "out."], // the MAX burst, own cadence
  ["With", "a", "!+direction"],
  ["but", "no", "\"yeh", "nahi", "toh", "mein", "nahi\""],
  ["(y"], ["+e"], ["!+t)"],
];
const SUMMARY_SW = 210;
const SUMMARY_GAPS: number[] = []; SUMMARY_GAPS[13] = 700; SUMMARY_GAPS[14] = 1400; SUMMARY_GAPS[21] = 500;
const SUMMARY_FAAFO_SW = 190; // the six-word burst gets its own faster cadence
const SUMMARY_FAAFO_PHRASE_IDX = 20;

// ── ACT 8 — THE LEVELS ───────────────────────────────────────────────────────
const LEVELS_PHRASES = [
  ["And", "baat", "jaha", "tak", "mahutarma", "aapki", "rahi"], ["There", "are", "a", "few", "LEVELS", "to", "this"], ["lets", "count"],
];
const LEVELS_SW = 250;
const LEVELS_GAPS: number[] = [];
const LEVELS_LIST = [
  "1. Tu bhi raazi to explore right now (Ideal) / (selection: hogayi)",
  "2. Tujhe mein pasand nahi aya",
  "3. Tujhe mein oye hoye laga",
  "4. and finally",
  "5. Tu bhi raazi to explore someday (i mean, im the best)",
];
const LEVELS_LIST_SW = 700;
const LEVELS_LIST_HOLD = 1300; // held once all 5 land — trimmed from 2000 for pace
const LEVELS_TAIL_PHRASES = [
  ["but", "whatever", "level", "you"], ["are", "on"],
  ["which", "then", "decides", "the"], ["coming", "forseeable", "future"],
  ["and", "i", "just", "want"], ["to", "say"], ["incase", "its", "5", "for", "you"],
  ["Tu", "bhi", "raazi", "to"], ["explore,", "but", "someday"], ["(because", "abhi", "mind", "aint", "right)"],
];
const LEVELS_TAIL_SW = 250;
const LEVELS_TAIL_GAPS: number[] = [];

// ── ACT 9 — THE WINDOW (closing act) ─────────────────────────────────────────
const WINDOW_PHRASES = [
  ["i", "mean—"], ["I", "have", "been", "around", "since", "2018"], ["you", "met", "people"], ["i", "met", "people"], // 0-3
  ["but", "here", "I", "am", "+again"], ["at", "the", "+window"], ["willing", "to", "let"], ["the", "same", "breeze"], // 4-7
  ["come", "in", "+again"], // 8
  ["because", "this", "one", "in"], ["particular,", "+feels", "pretty", "nice"], // 9-10 — the brightness bookend
  ["it", "always", "has"], ["since", "the", "first", "moment"], ["i", "saw", "you"], // 11-13
  ["toh", "tu", "karle", "healing"], // 14
  ["by", "the", "time", "you've"], ["walked", "your", "journey"], // 15-16
  ["toh", "zarur", "aaeyega,", "ek", "baar", "firse"], ["aakhir"], // 17-18
  ["bengali"], ["baddie"], ["kisko"], ["buri"], ["lagti"], ["hai"], ["bhala"], // 19-25
  ["ofc", "given", "that", "ki"], ["agar", "mein", "single", "raha", "tabtak"], // 26-27
  ["so", "like"], ["maybe"], ["dont", "miss", "out"], // 28-30
  ["one", "time", "offer"], ["and", "the", "only", "one"], ["you"], ["will"], ["ever"], ["need"], // 31-36
  ["see", "you"], ["in", "August"], ["soon."], // 37-39
];
const WINDOW_SW = 250;
const WINDOW_GAPS: number[] = [];
WINDOW_GAPS[9] = 500; WINDOW_GAPS[10] = 700; WINDOW_GAPS[18] = 260; WINDOW_GAPS[25] = 260;
WINDOW_GAPS[26] = 700; WINDOW_GAPS[27] = 700; WINDOW_GAPS[30] = 700; WINDOW_GAPS[36] = 1600;
const WINDOW_BENGALI_SW = 200; // the seven one-word snaps ("bengali baddie kisko...")
const WINDOW_BENGALI_FIRST = 19;
const WINDOW_BENGALI_LAST = 25;
const WINDOW_PARTICULAR_IDX = 10; // "particular, feels pretty nice" — the brightness bookend

const GAP = 200;
const phraseSw = (sw: number | number[] | ((i: number) => number), i: number) =>
  typeof sw === "function" ? sw(i) : Array.isArray(sw) ? (sw[i] ?? sw[sw.length - 1]) : sw;
const phraseSeq = (phrases: string[][], sw: number | number[] | ((i: number) => number), gaps?: number[]) => {
  const starts: number[] = [];
  let acc = 0;
  phrases.forEach((ph, i) => {
    starts.push(acc);
    acc += ph.length * phraseSw(sw, i) + (gaps?.[i] ?? GAP);
  });
  return { starts, total: acc };
};

const T_GATE = phraseSeq(GATE_PHRASES, GATE_SW, GATE_GAPS).total;
const T_BUILD = phraseSeq(BUILD_PHRASES, BUILD_SW, BUILD_GAPS).total;
const T_PARTY = phraseSeq(PARTY_PHRASES, PARTY_SW, PARTY_GAPS).total;
const T_HEALED = phraseSeq(HEALED_PHRASES, HEALED_SW, HEALED_GAPS).total;
const T_ARMOUR = phraseSeq(ARMOUR_PHRASES, ARMOUR_SW, ARMOUR_GAPS).total;
const T_MAX = phraseSeq(MAX_PHRASES, MAX_SW, MAX_GAPS).total;
const T_SNAPBACK = phraseSeq(SNAPBACK_PHRASES, SNAPBACK_SW, SNAPBACK_GAPS).total;
const T_PLAN = phraseSeq(PLAN_PHRASES, PLAN_SW, PLAN_GAPS).total;
const T_BACKCHODI = phraseSeq(BACKCHODI_PHRASES, BACKCHODI_SW, BACKCHODI_GAPS).total;
const T_SOMEONE = phraseSeq(SOMEONE_PHRASES, SOMEONE_SW, SOMEONE_GAPS).total;
const T_TRIPLE2 = phraseSeq(TRIPLE2_PHRASES, TRIPLE2_SW, TRIPLE2_GAPS).total;
const T_MANAGER = phraseSeq(MANAGER_PHRASES, MANAGER_SW, MANAGER_GAPS).total;
const T_SENTME = phraseSeq(SENTME_PHRASES, SENTME_SW, SENTME_GAPS).total;
const T_SETUP = phraseSeq(SETUP_PHRASES, SETUP_SW, SETUP_GAPS).total;
const T_SCORE = phraseSeq(SCORE_PHRASES, SCORE_SW, SCORE_GAPS).total;
const T_READYQ = phraseSeq(READYQ_PHRASES, READYQ_SW, READYQ_GAPS).total;
const T_BANGALORE = phraseSeq(BANGALORE_PHRASES, BANGALORE_SW, BANGALORE_GAPS).total;
const T_DISTANCE = phraseSeq(DISTANCE_PHRASES, DISTANCE_SW, DISTANCE_GAPS).total;
const T_GENERAL = phraseSeq(GENERAL_PHRASES, GENERAL_SW, GENERAL_GAPS).total;
const T_EXPLORE2 = phraseSeq(EXPLORE2_PHRASES, EXPLORE2_SW, EXPLORE2_GAPS).total;
const T_THINK2018 = phraseSeq(THINK2018_PHRASES, THINK2018_SW, THINK2018_GAPS).total;
const T_ASKSELF = phraseSeq(ASKSELF_PHRASES, ASKSELF_SW, ASKSELF_GAPS).total;
const T_LEAP2 = phraseSeq(LEAP2_PHRASES, LEAP2_SW, LEAP2_GAPS).total;
const T_UNIVERSE2 = phraseSeq(UNIVERSE2_PHRASES, UNIVERSE2_SW, UNIVERSE2_GAPS).total;
const T_ADMIRATION = phraseSeq(ADMIRATION_PHRASES, ADMIRATION_SW, ADMIRATION_GAPS).total;
const T_LOOKATYOU = phraseSeq(LOOKATYOU_PHRASES, LOOKATYOU_SW, LOOKATYOU_GAPS).total;
const T_AWARE = phraseSeq(AWARE_PHRASES, AWARE_SW, AWARE_GAPS).total;
const T_VALUES = phraseSeq(VALUES_PHRASES, VALUES_SW, VALUES_GAPS).total;
const T_SUMMARY = phraseSeq(SUMMARY_PHRASES, SUMMARY_SW, SUMMARY_GAPS).total
  + (SUMMARY_FAAFO_SW - SUMMARY_SW) * SUMMARY_PHRASES[SUMMARY_FAAFO_PHRASE_IDX].length;
const LEVELS_LIST_TOTAL = LEVELS_LIST.length * LEVELS_LIST_SW + LEVELS_LIST_HOLD;
const T_LEVELS = phraseSeq(LEVELS_PHRASES, LEVELS_SW, LEVELS_GAPS).total + LEVELS_LIST_TOTAL
  + phraseSeq(LEVELS_TAIL_PHRASES, LEVELS_TAIL_SW, LEVELS_TAIL_GAPS).total;
const T_WINDOW = phraseSeq(WINDOW_PHRASES, WINDOW_SW, WINDOW_GAPS).total
  + (WINDOW_BENGALI_SW - WINDOW_SW) * (WINDOW_BENGALI_LAST - WINDOW_BENGALI_FIRST + 1);

// Build the timeline — elastic, same pattern as /dontblink: word cadence is
// fixed, ONE hold value H is solved so the whole film lands on TARGET_MS.
// The back half (values/summary/levels/window) gets smaller H multipliers
// than the first pass — the extra breathing room was what read as "slow".
const buildTimeline = (H: number, snap?: (ms: number, down: boolean) => number) => {
  let last = -1;
  const S2 = (ms: number, doSnap = false) => {
    let v = doSnap && snap ? snap(ms, true) : Math.round(ms);
    if (v <= last + 120) v = Math.round(Math.max(ms, last + 120));
    last = v;
    return v;
  };
  const gate = S2(300);
  const build = S2(gate + T_GATE + H * 0.1, true);
  const party = S2(build + T_BUILD + H * 0.1);
  const healed = S2(party + T_PARTY + H * 0.1);
  const armour = S2(healed + T_HEALED + H * 0.1);
  const max = S2(armour + T_ARMOUR + H * 0.1);
  const snapback = S2(max + T_MAX + H * 0.1);
  const plan = S2(snapback + T_SNAPBACK + H * 0.1);
  const backchodi = S2(plan + T_PLAN + H * 0.1);
  const someone = S2(backchodi + T_BACKCHODI + H * 0.1);
  const triple2 = S2(someone + T_SOMEONE + H * 0.08);
  const manager = S2(triple2 + T_TRIPLE2 + H * 0.1);
  const sentme = S2(manager + T_MANAGER + H * 0.1);
  const setup = S2(sentme + T_SENTME + YOU3_HOLD + H * 0.1);
  const score = S2(setup + T_SETUP + H * 0.08);
  const readyq = S2(score + T_SCORE + H * 0.1);
  const bangalore = S2(readyq + T_READYQ + H * 0.1);
  const distance = S2(bangalore + T_BANGALORE + H * 0.08);
  const general = S2(distance + T_DISTANCE + H * 0.08);
  const explore2 = S2(general + T_GENERAL + H * 0.08);
  const think2018 = S2(explore2 + T_EXPLORE2 + H * 0.1, true);
  const askself = S2(think2018 + T_THINK2018 + H * 0.08);
  const leap2 = S2(askself + T_ASKSELF + H * 0.08);
  const universe2 = S2(leap2 + T_LEAP2 + H * 0.08);
  const admiration = S2(universe2 + T_UNIVERSE2 + H * 0.08);
  const lookatyou = S2(admiration + T_ADMIRATION + H * 0.08);
  const aware = S2(lookatyou + T_LOOKATYOU + H * 0.08);
  const values = S2(aware + T_AWARE + H * 0.06);
  const summary = S2(values + T_VALUES + H * 0.06);
  const levels = S2(summary + T_SUMMARY + H * 0.05, true);
  const windowAct = S2(levels + T_LEVELS + H * 0.06);
  const end = Math.round(windowAct + T_WINDOW + H * 0.1);
  return {
    gate, build, party, healed, armour, max, snapback, plan, backchodi, someone, triple2, manager, sentme,
    setup, score, readyq, bangalore, distance, general, explore2, think2018, askself, leap2, universe2,
    admiration, lookatyou, aware, values, summary, levels, windowAct, end,
  };
};

const solveHold = (target: number) => {
  const e0 = buildTimeline(0).end, e1 = buildTimeline(1000).end;
  return clamp((target - e0) / ((e1 - e0) / 1000), 150, 6000);
};

const TARGET_MS = 260000; // ~4:20 — trimmed from 5:00 per the pacing note
const DEFAULT_H = solveHold(TARGET_MS);
const DEFAULT_T = buildTimeline(DEFAULT_H);

export default function Letter() {
  const [runId, setRunId] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.add("lt-page");
    return () => document.body.classList.remove("lt-page");
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const q = (s: string) => root.querySelector<HTMLElement>(s)!;
    const gateEl = q(".lt-gate"), buildEl = q(".lt-build"), partyEl = q(".lt-party");
    const healedEl = q(".lt-healed"), armourEl = q(".lt-armour"), maxEl = q(".lt-max"), snapbackEl = q(".lt-snapback");
    const planEl = q(".lt-plan"), backchodiEl = q(".lt-backchodi"), someoneEl = q(".lt-someone");
    const triple2El = q(".lt-triple2"), managerEl = q(".lt-manager"), sentmeEl = q(".lt-sentme");
    const you3 = [q(".lt-you1"), q(".lt-you2"), q(".lt-you3")];
    const setupEl = q(".lt-setup"), scoreEl = q(".lt-score");
    const readyqEl = q(".lt-readyq"), bangaloreEl = q(".lt-bangalore"), distanceEl = q(".lt-distance");
    const generalEl = q(".lt-general"), explore2El = q(".lt-explore2"), think2018El = q(".lt-think2018");
    const askselfEl = q(".lt-askself"), leap2El = q(".lt-leap2"), universe2El = q(".lt-universe2");
    const admirationEl = q(".lt-admiration"), lookatyouEl = q(".lt-lookatyou"), awareEl = q(".lt-aware");
    const valuesEl = q(".lt-values"), summaryEl = q(".lt-summary"), levelsEl = q(".lt-levels");
    const levelsListEl = q(".lt-levels-list"), levelsTailEl = q(".lt-levels-tail");
    const windowEl = q(".lt-window");
    const invert = q(".lt-invert");
    const dim = q(".lt-dim");
    const cursor = q(".lt-cursor");
    const black = q(".lt-black");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let T = { ...DEFAULT_T };

    const gateStarts = phraseSeq(GATE_PHRASES, GATE_SW, GATE_GAPS).starts;
    const buildStarts = phraseSeq(BUILD_PHRASES, BUILD_SW, BUILD_GAPS).starts;
    const partyStarts = phraseSeq(PARTY_PHRASES, PARTY_SW, PARTY_GAPS).starts;
    const healedStarts = phraseSeq(HEALED_PHRASES, HEALED_SW, HEALED_GAPS).starts;
    const armourStarts = phraseSeq(ARMOUR_PHRASES, ARMOUR_SW, ARMOUR_GAPS).starts;
    const maxStarts = phraseSeq(MAX_PHRASES, MAX_SW, MAX_GAPS).starts;
    const snapbackStarts = phraseSeq(SNAPBACK_PHRASES, SNAPBACK_SW, SNAPBACK_GAPS).starts;
    const planStarts = phraseSeq(PLAN_PHRASES, PLAN_SW, PLAN_GAPS).starts;
    const backchodiStarts = phraseSeq(BACKCHODI_PHRASES, BACKCHODI_SW, BACKCHODI_GAPS).starts;
    const someoneStarts = phraseSeq(SOMEONE_PHRASES, SOMEONE_SW, SOMEONE_GAPS).starts;
    const triple2Starts = phraseSeq(TRIPLE2_PHRASES, TRIPLE2_SW, TRIPLE2_GAPS).starts;
    const managerStarts = phraseSeq(MANAGER_PHRASES, MANAGER_SW, MANAGER_GAPS).starts;
    const sentmeStarts = phraseSeq(SENTME_PHRASES, SENTME_SW, SENTME_GAPS).starts;
    const setupStarts = phraseSeq(SETUP_PHRASES, SETUP_SW, SETUP_GAPS).starts;
    const scoreStarts = phraseSeq(SCORE_PHRASES, SCORE_SW, SCORE_GAPS).starts;
    const readyqStarts = phraseSeq(READYQ_PHRASES, READYQ_SW, READYQ_GAPS).starts;
    const bangaloreStarts = phraseSeq(BANGALORE_PHRASES, BANGALORE_SW, BANGALORE_GAPS).starts;
    const distanceStarts = phraseSeq(DISTANCE_PHRASES, DISTANCE_SW, DISTANCE_GAPS).starts;
    const generalStarts = phraseSeq(GENERAL_PHRASES, GENERAL_SW, GENERAL_GAPS).starts;
    const explore2Starts = phraseSeq(EXPLORE2_PHRASES, EXPLORE2_SW, EXPLORE2_GAPS).starts;
    const think2018Starts = phraseSeq(THINK2018_PHRASES, THINK2018_SW, THINK2018_GAPS).starts;
    const askselfStarts = phraseSeq(ASKSELF_PHRASES, ASKSELF_SW, ASKSELF_GAPS).starts;
    const leap2Starts = phraseSeq(LEAP2_PHRASES, LEAP2_SW, LEAP2_GAPS).starts;
    const universe2Starts = phraseSeq(UNIVERSE2_PHRASES, UNIVERSE2_SW, UNIVERSE2_GAPS).starts;
    const admirationStarts = phraseSeq(ADMIRATION_PHRASES, ADMIRATION_SW, ADMIRATION_GAPS).starts;
    const lookatyouStarts = phraseSeq(LOOKATYOU_PHRASES, LOOKATYOU_SW, LOOKATYOU_GAPS).starts;
    const awareStarts = phraseSeq(AWARE_PHRASES, AWARE_SW, AWARE_GAPS).starts;
    const valuesStarts = phraseSeq(VALUES_PHRASES, VALUES_SW, VALUES_GAPS).starts;
    const summaryStarts = phraseSeq(SUMMARY_PHRASES, SUMMARY_SW, SUMMARY_GAPS).starts;
    const levelsStarts = phraseSeq(LEVELS_PHRASES, LEVELS_SW, LEVELS_GAPS).starts;
    const levelsTailStarts = phraseSeq(LEVELS_TAIL_PHRASES, LEVELS_TAIL_SW, LEVELS_TAIL_GAPS).starts;
    const windowStarts = phraseSeq(WINDOW_PHRASES, WINDOW_SW, WINDOW_GAPS).starts;
    const levelsTotal = phraseSeq(LEVELS_PHRASES, LEVELS_SW, LEVELS_GAPS).total;

    const audioEl = root.querySelector<HTMLAudioElement>(".lt-audio");
    let trackLoaded = false;
    const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

    const allHosts = [
      gateEl, buildEl, partyEl, healedEl, armourEl, maxEl, snapbackEl, planEl, backchodiEl, someoneEl,
      triple2El, managerEl, sentmeEl, setupEl, scoreEl, readyqEl, bangaloreEl, distanceEl, generalEl,
      explore2El, think2018El, askselfEl, leap2El, universe2El, admirationEl, lookatyouEl, awareEl,
      valuesEl, summaryEl, levelsEl, levelsListEl, levelsTailEl, windowEl,
    ];
    root.querySelectorAll<HTMLElement>(".nt-word").forEach((w) => w.classList.remove("in"));
    allHosts.forEach((el) => { el.style.opacity = "0"; el.classList.remove("invert-flash", "lt-aside"); });
    you3.forEach((el) => el.classList.remove("in"));
    invert.style.opacity = "0"; dim.style.opacity = "0"; cursor.style.opacity = "0"; black.style.opacity = "0";

    if (reduced) { windowEl.style.opacity = "1"; root.querySelectorAll<HTMLElement>(".lt-window .nt-word").forEach((w) => w.classList.add("in")); return; }

    let raf = 0;
    let playing = true, manualT = 0, startWall = performance.now();
    let levelsDimmed = false;

    const kinCache = new Map<HTMLElement, { spans: HTMLElement[]; last: number }>();
    const seqIdx = new Map<HTMLElement, number>();
    const resetSceneCaches = () => { kinCache.clear(); seqIdx.clear(); levelsDimmed = false; };

    const kineticAt = (host: HTMLElement, active: number) => {
      let c = kinCache.get(host);
      if (!c) { c = { spans: Array.from(host.querySelectorAll<HTMLElement>(":scope > .nt-word")), last: -2 }; kinCache.set(host, c); }
      if (active === c.last) return;
      c.last = active;
      c.spans.forEach((sp, i) => sp.classList.toggle("in", i <= active));
    };
    const kinetic = (host: HTMLElement, start: number, per: number, t: number) => {
      const c = kinCache.get(host);
      const len = c ? c.spans.length : host.querySelectorAll(".nt-word").length;
      const active = t - start < 0 ? -1 : Math.min(len - 1, Math.floor((t - start) / per));
      kineticAt(host, active);
    };
    // Parses "~"(aside)/"!"(cut)/"+"(fuse)/"*"(emph) prefixes, in that order.
    // Returns true while the scene's CURRENTLY ACTIVE (most-recently-revealed)
    // word is cut-marked — bounded automatically by the caller's own
    // `t < nextSceneStart` check, exactly like every other flash in the film.
    const sequence = (
      host: HTMLElement, phrases: string[][], starts: number[], sceneStart: number,
      sw: number | number[] | ((i: number) => number), t: number,
    ): boolean => {
      const rel = t - sceneStart;
      let idx = -1;
      for (let i = 0; i < phrases.length; i++) {
        const s0 = starts[i];
        const s1 = i + 1 < phrases.length ? starts[i + 1] : Infinity;
        if (rel >= s0 && rel < s1) { idx = i; break; }
      }
      if (idx === -1 && rel >= starts[starts.length - 1]) idx = phrases.length - 1;
      if (idx < 0) return false;
      if (seqIdx.get(host) !== idx) {
        const words = phrases[idx];
        let asideWhole = false;
        host.innerHTML = words.map((wRaw) => {
          let w = wRaw;
          if (w.startsWith("~")) { asideWhole = true; w = w.slice(1); }
          const cut = w.startsWith("!"); if (cut) w = w.slice(1);
          const fuse = w.startsWith("+");
          const emph = w.startsWith("*");
          const cls = fuse ? " nt-fuse" : emph ? " nt-emph" : "";
          const text = fuse || emph ? w.slice(1) : w;
          return `<span class="nt-word${cls}"${cut ? ' data-cut="1"' : ""}>${text}</span>`;
        }).join("");
        seqIdx.set(host, idx);
        kinCache.delete(host);
        host.classList.toggle("lt-aside", asideWhole);
      }
      kinetic(host, sceneStart + starts[idx], phraseSw(sw, idx), t);
      const c = kinCache.get(host);
      const activeSpan = c && c.last >= 0 ? c.spans[c.last] : null;
      // suppress the flash inside an aside — a full white screen-flip during
      // a hushed parenthetical would clash with the tone of that beat
      const isCut = !!activeSpan?.dataset.cut && !host.classList.contains("lt-aside");
      // this scene's OWN text needs to flip to dark-red too (see .invert-flash
      // in letter-teaser.css) — without this the white overlay covers the
      // frame while the text stays white-on-white and vanishes, which is
      // exactly the "going blank" bug: the shared overlay was toggling, but
      // no host ever got the class that recolors its own text.
      host.classList.toggle("invert-flash", isCut);
      return isCut;
    };
    // one long string per "word" — used for the 5 stacked LEVELS lines
    const stackList = (host: HTMLElement, items: string[], start: number, per: number, t: number) => {
      if (seqIdx.get(host) !== 0) {
        host.innerHTML = items.map((s) => `<span class="nt-word">${s}</span>`).join("");
        seqIdx.set(host, 0); kinCache.delete(host);
      }
      kinetic(host, start, per, t);
    };

    const render = (t: number) => {
      // ── ambient dim: darkens after "On purpose.", lifts at Act 9's "nice" bookend ──
      const purposeAt = T.party + partyStarts[3];
      const niceAt = T.windowAct + windowStarts[WINDOW_PARTICULAR_IDX];
      const dimIn = ramp(t, purposeAt + 300, purposeAt + 900);
      const dimOut = ramp(t, niceAt, niceAt + 600);
      dim.style.opacity = String(clamp(dimIn - dimOut, 0, 1) * 0.22);

      let cut = false;

      // 1. GATE
      gateEl.style.opacity = String(ramp(t, T.gate, T.gate + 100) * (1 - ramp(t, T.build - 220, T.build - 60)));
      cut = (t < T.build && sequence(gateEl, GATE_PHRASES, gateStarts, T.gate, GATE_SW, t)) || cut;

      // 2. BUILD — "Brick.||By.||Brick." triple, each snap its own cut
      buildEl.style.opacity = String(ramp(t, T.build, T.build + 100) * (1 - ramp(t, T.party - 220, T.party - 60)));
      cut = (t < T.party && sequence(buildEl, BUILD_PHRASES, buildStarts, T.build, BUILD_SW, t)) || cut;

      // 3. PARTY (lock-click darken handled by the ambient `dim` overlay above)
      partyEl.style.opacity = String(ramp(t, T.party, T.party + 100) * (1 - ramp(t, T.healed - 220, T.healed - 60)));
      sequence(partyEl, PARTY_PHRASES, partyStarts, T.party, PARTY_SW, t);

      // 4. HEALED
      healedEl.style.opacity = String(ramp(t, T.healed, T.healed + 100) * (1 - ramp(t, T.armour - 220, T.armour - 60)));
      cut = (t < T.armour && sequence(healedEl, HEALED_PHRASES, healedStarts, T.healed, HEALED_SW, t)) || cut;

      // 5. ARMOUR
      armourEl.style.opacity = String(ramp(t, T.armour, T.armour + 100) * (1 - ramp(t, T.max - 220, T.max - 60)));
      sequence(armourEl, ARMOUR_PHRASES, armourStarts, T.armour, ARMOUR_SW, t);

      // 6. MAX
      maxEl.style.opacity = String(ramp(t, T.max, T.max + 100) * (1 - ramp(t, T.snapback - 220, T.snapback - 60)));
      cut = (t < T.snapback && sequence(maxEl, MAX_PHRASES, maxStarts, T.max, MAX_SW, t)) || cut;

      // 7. SNAPBACK
      snapbackEl.style.opacity = String(ramp(t, T.snapback, T.snapback + 100) * (1 - ramp(t, T.plan - 220, T.plan - 60)));
      sequence(snapbackEl, SNAPBACK_PHRASES, snapbackStarts, T.snapback, SNAPBACK_SW, t);

      // 8. PLAN
      planEl.style.opacity = String(ramp(t, T.plan, T.plan + 100) * (1 - ramp(t, T.backchodi - 220, T.backchodi - 60)));
      sequence(planEl, PLAN_PHRASES, planStarts, T.plan, PLAN_SW, t);

      // 9. BACKCHODI
      backchodiEl.style.opacity = String(ramp(t, T.backchodi, T.backchodi + 100) * (1 - ramp(t, T.someone - 220, T.someone - 60)));
      cut = (t < T.someone && sequence(backchodiEl, BACKCHODI_PHRASES, backchodiStarts, T.backchodi, BACKCHODI_SW, t)) || cut;

      // SOMEONE — "everything stops", 0.4 c/s
      someoneEl.style.opacity = String(ramp(t, T.someone, T.someone + 300) * (1 - ramp(t, T.triple2 - 250, T.triple2 - 80)));
      sequence(someoneEl, SOMEONE_PHRASES, someoneStarts, T.someone, SOMEONE_SW, t);

      // TRIPLE2 — "for eight years." — slow triple match, 1.5s dissolve per chunk
      triple2El.style.opacity = String(ramp(t, T.triple2, T.triple2 + 200) * (1 - ramp(t, T.manager - 400, T.manager - 150)));
      cut = (t < T.manager && sequence(triple2El, TRIPLE2_PHRASES, triple2Starts, T.triple2, TRIPLE2_SW, t)) || cut;

      // MANAGER — the joke beat, comic timing then silence
      managerEl.style.opacity = String(ramp(t, T.manager, T.manager + 80) * (1 - ramp(t, T.sentme - 300, T.sentme - 100)));
      sequence(managerEl, MANAGER_PHRASES, managerStarts, T.manager, MANAGER_SW, t);

      // SENTME + YOUx3 — the earnest reveal, held 4s, longest hold in the film
      sentmeEl.style.opacity = String(ramp(t, T.sentme, T.sentme + 150) * (1 - ramp(t, T.setup - YOU3_HOLD - 300, T.setup - YOU3_HOLD - 100)));
      sequence(sentmeEl, SENTME_PHRASES, sentmeStarts, T.sentme, SENTME_SW, t);
      {
        const you3Start = T.sentme + T_SENTME;
        const you3PerWord = YOU3_HOLD / 3;
        you3.forEach((el, i) => {
          el.classList.toggle("in", t >= you3Start + i * you3PerWord && t < T.setup);
        });
      }

      // 10. SETUP (Act 4 lead-in)
      setupEl.style.opacity = String(ramp(t, T.setup, T.setup + 100) * (1 - ramp(t, T.score - 220, T.score - 60)));
      sequence(setupEl, SETUP_PHRASES, setupStarts, T.setup, SETUP_SW, t);

      // 11. SCORE (the full scorecard through "(Not blushing.)")
      scoreEl.style.opacity = String(ramp(t, T.score, T.score + 80) * (1 - ramp(t, T.readyq - 220, T.readyq - 60)));
      cut = (t < T.readyq && sequence(scoreEl, SCORE_PHRASES, scoreStarts, T.score, SCORE_SW, t)) || cut;

      // 12. READYQ
      readyqEl.style.opacity = String(ramp(t, T.readyq, T.readyq + 100) * (1 - ramp(t, T.bangalore - 220, T.bangalore - 60)));
      sequence(readyqEl, READYQ_PHRASES, readyqStarts, T.readyq, READYQ_SW, t);

      // 13. BANGALORE
      bangaloreEl.style.opacity = String(ramp(t, T.bangalore, T.bangalore + 100) * (1 - ramp(t, T.distance - 220, T.distance - 60)));
      cut = (t < T.distance && sequence(bangaloreEl, BANGALORE_PHRASES, bangaloreStarts, T.bangalore, BANGALORE_SW, t)) || cut;

      // 14. DISTANCE — parenthetical aside style, whole beat
      distanceEl.style.opacity = String(ramp(t, T.distance, T.distance + 100) * (1 - ramp(t, T.general - 220, T.general - 60)));
      sequence(distanceEl, DISTANCE_PHRASES, distanceStarts, T.distance, DISTANCE_SW, t);
      distanceEl.classList.add("lt-aside");

      // 15. GENERAL
      generalEl.style.opacity = String(ramp(t, T.general, T.general + 100) * (1 - ramp(t, T.explore2 - 220, T.explore2 - 60)));
      sequence(generalEl, GENERAL_PHRASES, generalStarts, T.general, GENERAL_SW, t);

      // 16. EXPLORE2 — "i am shaw/ty" match cut
      explore2El.style.opacity = String(ramp(t, T.explore2, T.explore2 + 100) * (1 - ramp(t, T.think2018 - 300, T.think2018 - 100)));
      cut = (t < T.think2018 && sequence(explore2El, EXPLORE2_PHRASES, explore2Starts, T.explore2, EXPLORE2_SW, t)) || cut;

      // 17. THINK2018 — parenthetical aside style, whole beat
      think2018El.style.opacity = String(ramp(t, T.think2018, T.think2018 + 100) * (1 - ramp(t, T.askself - 220, T.askself - 60)));
      sequence(think2018El, THINK2018_PHRASES, think2018Starts, T.think2018, THINK2018_SW, t);
      think2018El.classList.add("lt-aside");

      // 18. ASKSELF
      askselfEl.style.opacity = String(ramp(t, T.askself, T.askself + 100) * (1 - ramp(t, T.leap2 - 220, T.leap2 - 60)));
      sequence(askselfEl, ASKSELF_PHRASES, askselfStarts, T.askself, ASKSELF_SW, t);

      // 19. LEAP2
      leap2El.style.opacity = String(ramp(t, T.leap2, T.leap2 + 100) * (1 - ramp(t, T.universe2 - 220, T.universe2 - 60)));
      cut = (t < T.universe2 && sequence(leap2El, LEAP2_PHRASES, leap2Starts, T.leap2, LEAP2_SW, t)) || cut;

      // 20. UNIVERSE2
      universe2El.style.opacity = String(ramp(t, T.universe2, T.universe2 + 100) * (1 - ramp(t, T.admiration - 220, T.admiration - 60)));
      sequence(universe2El, UNIVERSE2_PHRASES, universe2Starts, T.universe2, UNIVERSE2_SW, t);

      // 21. ADMIRATION
      admirationEl.style.opacity = String(ramp(t, T.admiration, T.admiration + 80) * (1 - ramp(t, T.lookatyou - 200, T.lookatyou - 60)));
      sequence(admirationEl, ADMIRATION_PHRASES, admirationStarts, T.admiration, ADMIRATION_SW, t);

      // 22. LOOKATYOU — triple match, assembles then stops
      lookatyouEl.style.opacity = String(ramp(t, T.lookatyou, T.lookatyou + 100) * (1 - ramp(t, T.aware - 300, T.aware - 100)));
      cut = (t < T.aware && sequence(lookatyouEl, LOOKATYOU_PHRASES, lookatyouStarts, T.lookatyou, LOOKATYOU_SW, t)) || cut;

      // 23. AWARE — the most sincere beat, plain
      awareEl.style.opacity = String(ramp(t, T.aware, T.aware + 150) * (1 - ramp(t, T.values - 300, T.values - 100)));
      cut = (t < T.values && sequence(awareEl, AWARE_PHRASES, awareStarts, T.aware, AWARE_SW, t)) || cut;

      // 24. VALUES (Act 6) — stopped, plain fades, no strobe, its own tone
      valuesEl.style.opacity = String(ramp(t, T.values, T.values + 150) * (1 - ramp(t, T.summary - 300, T.summary - 100)));
      cut = (t < T.summary && sequence(valuesEl, VALUES_PHRASES, valuesStarts, T.values, VALUES_SW, t)) || cut;

      // 25. SUMMARY (Act 7)
      summaryEl.style.opacity = String(ramp(t, T.summary, T.summary + 100) * (1 - ramp(t, T.levels - 300, T.levels - 100)));
      {
        // one phrase ("Let's fuck around and find out.") gets its own faster
        // cadence — a small local override, same technique as HYPE_OPEN in /notch.
        const localSw = (i: number) => (i === SUMMARY_FAAFO_PHRASE_IDX ? SUMMARY_FAAFO_SW : SUMMARY_SW);
        cut = (t < T.levels && sequence(summaryEl, SUMMARY_PHRASES, summaryStarts, T.summary, localSw, t)) || cut;
      }

      invert.style.opacity = cut ? "1" : "0";

      // 26. LEVELS (Act 8)
      levelsEl.style.opacity = String(ramp(t, T.levels, T.levels + 100) * (1 - ramp(t, T.levels + levelsTotal - 200, T.levels + levelsTotal - 60)));
      sequence(levelsEl, LEVELS_PHRASES, levelsStarts, T.levels, LEVELS_SW, t);
      const listStart = T.levels + levelsTotal;
      const tailStart = listStart + LEVELS_LIST_TOTAL;
      levelsListEl.style.opacity = String(ramp(t, listStart, listStart + 100) * (1 - ramp(t, tailStart - 250, tailStart - 80)));
      stackList(levelsListEl, LEVELS_LIST, listStart, LEVELS_LIST_SW, t);
      {
        // once all 5 land, dim items 1-4 to 20% and keep #5 lit (one-time DOM write)
        const allLanded = (kinCache.get(levelsListEl)?.last ?? -1) === LEVELS_LIST.length - 1;
        if (allLanded && !levelsDimmed) {
          levelsDimmed = true;
          const spans = kinCache.get(levelsListEl)?.spans ?? [];
          spans.forEach((sp, i) => { sp.style.opacity = i < 4 ? "0.2" : "1"; });
        }
        if (!allLanded && levelsDimmed) {
          levelsDimmed = false;
          const spans = kinCache.get(levelsListEl)?.spans ?? [];
          spans.forEach((sp) => { sp.style.opacity = ""; });
        }
      }
      levelsTailEl.style.opacity = String(ramp(t, tailStart, tailStart + 100) * (1 - ramp(t, T.windowAct - 250, T.windowAct - 80)));
      sequence(levelsTailEl, LEVELS_TAIL_PHRASES, levelsTailStarts, tailStart, LEVELS_TAIL_SW, t);

      // 27. WINDOW (Act 9, closing)
      windowEl.style.opacity = String(ramp(t, T.windowAct, T.windowAct + 150));
      {
        const localSw = (i: number) => (i >= WINDOW_BENGALI_FIRST && i <= WINDOW_BENGALI_LAST ? WINDOW_BENGALI_SW : WINDOW_SW);
        sequence(windowEl, WINDOW_PHRASES, windowStarts, T.windowAct, localSw, t);
      }
      // final beat: cursor blinks twice under "soon.", cuts to black mid-blink
      {
        const soonLandT = T.windowAct + windowStarts[WINDOW_PHRASES.length - 1] + WINDOW_PHRASES[WINDOW_PHRASES.length - 1].length * WINDOW_SW;
        const cursorAt = soonLandT + 400;
        const blinkMs = 650;
        const inCursor = t >= cursorAt && t < T.end;
        cursor.style.opacity = inCursor ? (Math.floor((t - cursorAt) / blinkMs) % 2 === 0 ? "1" : "0") : "0";
        black.style.opacity = t >= T.end - 10 ? "1" : "0";
      }
    };

    const fmt = (ms: number) => `${(ms / 1000).toFixed(2)}s / ${(T.end / 1000).toFixed(1)}s`;
    const setPlaying = (p: boolean) => {
      playing = p;
      if (playBtn) playBtn.textContent = p ? "❚❚" : "▶";
      if (trackLoaded && audioEl) {
        if (p) { audioEl.currentTime = manualT / 1000; audioEl.play().catch(() => {}); }
        else audioEl.pause();
      } else if (p) startWall = performance.now() - manualT;
    };
    const seek = (ms: number) => { manualT = clamp(ms, 0, T.end); if (trackLoaded && audioEl) audioEl.currentTime = manualT / 1000; };

    const controls = root.querySelector<HTMLElement>(".nt-scrubber");
    const slider = root.querySelector<HTMLInputElement>(".nt-scrub");
    const playBtn = root.querySelector<HTMLButtonElement>(".nt-play");
    const timeLabel = root.querySelector<HTMLElement>(".nt-time");
    if (slider) slider.max = String(T.end);

    let audioAnchor = 0, lastUi = 0;
    const loop = () => {
      if (playing) {
        if (trackLoaded && audioEl) {
          const at = audioEl.currentTime * 1000;
          const wall = performance.now();
          if (audioAnchor === 0 || Math.abs(wall - audioAnchor - at) > 250) audioAnchor = wall - at;
          else audioAnchor += (wall - at - audioAnchor) * 0.06;
          manualT = wall - audioAnchor;
        } else {
          manualT = performance.now() - startWall;
        }
        if (manualT >= T.end) { resetSceneCaches(); seek(0); if (trackLoaded && audioEl) { audioEl.currentTime = 0; audioEl.play().catch(() => {}); } else { startWall = performance.now(); } }
      }
      render(manualT);
      const now = performance.now();
      if (now - lastUi > 120) {
        lastUi = now;
        if (slider) {
          if (document.activeElement !== slider) slider.value = String(Math.round(manualT));
          slider.style.setProperty("--p", `${(manualT / T.end) * 100}%`);
        }
        if (timeLabel) timeLabel.textContent = fmt(manualT);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const frame = q(".nt-frame");
    const onPlay = () => { if (manualT >= T.end) { resetSceneCaches(); seek(0); } setPlaying(!playing); };
    frame.addEventListener("click", onPlay);
    const onScrub = (e: Event) => { setPlaying(false); seek(+(e.target as HTMLInputElement).value); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); onPlay(); }
      else if (e.key === "ArrowRight") { setPlaying(false); seek(manualT + (e.shiftKey ? 1000 : 33)); }
      else if (e.key === "ArrowLeft") { setPlaying(false); seek(manualT - (e.shiftKey ? 1000 : 33)); }
    };
    let hideTimer = 0, overBar = false;
    const showControls = () => {
      document.body.classList.add("nt-controls");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => { if (!overBar) document.body.classList.remove("nt-controls"); }, 2200);
    };
    const onBarEnter = () => { overBar = true; showControls(); };
    const onBarLeave = () => { overBar = false; showControls(); };
    addEventListener("pointermove", showControls);
    controls?.addEventListener("pointerenter", onBarEnter);
    controls?.addEventListener("pointerleave", onBarLeave);
    showControls();

    slider?.addEventListener("input", onScrub);
    playBtn?.addEventListener("click", onPlay);
    root.querySelector(".nt-step-back")?.addEventListener("click", () => { setPlaying(false); seek(manualT - 33); });
    root.querySelector(".nt-step-fwd")?.addEventListener("click", () => { setPlaying(false); seek(manualT + 33); });
    controls?.addEventListener("click", (e) => e.stopPropagation());
    addEventListener("keydown", onKey);
    const onFsChange = () => { if (document.fullscreenElement === frame) { resetSceneCaches(); seek(0); setPlaying(true); } };
    document.addEventListener("fullscreenchange", onFsChange);

    const applyBeats = (a: BeatAnalysis) => {
      const target = Math.min(TARGET_MS, a.durationMs - 200);
      const snap = (ms: number, down: boolean) => snapToBeat(ms, down ? a.downbeats : a.beats, Math.max(0, ms - 350));
      let goal = target;
      let holdMs = DEFAULT_H;
      for (let i = 0; i < 3; i++) {
        holdMs = solveHold(goal);
        T = buildTimeline(holdMs, snap);
        const over = T.end - target;
        if (over <= 0) break;
        goal -= over;
      }
      const hardEnd = Math.round(a.durationMs - 60);
      if (T.end > hardEnd) T.end = hardEnd;
      if (slider) slider.max = String(T.end);
      trackLoaded = true;
    };

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/she-needs-him.mp3");
        if (!res.ok) throw new Error(String(res.status));
        const buf = await res.arrayBuffer();
        const a = await analyzeTrack(buf, Date.now());
        if (cancelled) return;
        applyBeats(a);
        seek(0); manualT = 0;
        if (audioEl) {
          audioEl.src = "/she-needs-him.mp3"; audioEl.load(); audioEl.currentTime = 0;
          try { await audioEl.play(); playing = true; } catch { playing = false; }
        }
      } catch { /* film still plays on its own wall-clock, unsynced */ }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      frame.removeEventListener("click", onPlay);
      slider?.removeEventListener("input", onScrub);
      removeEventListener("keydown", onKey);
      removeEventListener("pointermove", showControls);
      controls?.removeEventListener("pointerenter", onBarEnter);
      controls?.removeEventListener("pointerleave", onBarLeave);
      document.removeEventListener("fullscreenchange", onFsChange);
      window.clearTimeout(hideTimer);
      document.body.classList.remove("nt-controls");
    };
  }, [runId]);

  return (
    <div className="nt-films">
      <section className="nt" ref={rootRef}>
        <div className="nt-frame">
          <div className="nt-stage">
            <div className="lt-gate nt-open" />
            <div className="lt-build nt-open" />
            <div className="lt-party nt-open" />
            <div className="lt-healed nt-open" />
            <div className="lt-armour nt-open" />
            <div className="lt-max nt-open" />
            <div className="lt-snapback nt-open" />
            <div className="lt-plan nt-open" />
            <div className="lt-backchodi nt-open" />
            <div className="lt-someone nt-open" />
            <div className="lt-triple2 nt-open" />
            <div className="lt-manager nt-open" />
            <div className="lt-sentme nt-open" />
            <div className="lt-you-stack">
              <span className="lt-you1">you</span>
              <span className="lt-you2">you</span>
              <span className="lt-you3">you</span>
            </div>
            <div className="lt-setup nt-open" />
            <div className="lt-score nt-open" />
            <div className="lt-readyq nt-open" />
            <div className="lt-bangalore nt-open" />
            <div className="lt-distance nt-open" />
            <div className="lt-general nt-open" />
            <div className="lt-explore2 nt-open" />
            <div className="lt-think2018 nt-open" />
            <div className="lt-askself nt-open" />
            <div className="lt-leap2 nt-open" />
            <div className="lt-universe2 nt-open" />
            <div className="lt-admiration nt-open" />
            <div className="lt-lookatyou nt-open" />
            <div className="lt-aware nt-open" />
            <div className="lt-values nt-open" />
            <div className="lt-summary nt-open" />
            <div className="lt-levels nt-open" />
            <div className="lt-levels-list" />
            <div className="lt-levels-tail nt-open" />
            <div className="lt-window nt-open" />

            <span className="lt-cursor">|</span>
            <div className="lt-dim" />
            <div className="lt-invert nt-invert2" />
            <div className="lt-black" />
          </div>
        </div>
        <audio className="lt-audio nt-audio" preload="auto" />

        <div className="nt-veil" aria-hidden="true" />
        <div className="nt-scrubber">
          <button className="nt-play" title="Play / Pause (space)">❚❚</button>
          <button className="nt-step-back" title="Back 1 frame (←)">◀|</button>
          <input className="nt-scrub" type="range" min="0" max={String(DEFAULT_T.end)} defaultValue="0" step="1" />
          <button className="nt-step-fwd" title="Forward 1 frame (→)">|▶</button>
          <span className="nt-time">0.00s</span>
        </div>
      </section>
    </div>
  );
}
