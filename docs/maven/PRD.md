# Maven: Product Requirements (v1)

*Owner: Itish Pande · Drafted 26 Oct 2026 · Status: draft for review*

**Maven = Memory And Voice ENgine.** A small AI buddy that writes what you say, properly, wherever you type. Ask it, and it does the one small job that comes next. It never talks back.

---

## 0. The one-page version

| | |
|---|---|
| **What** | Dictation that needs no cleanup, plus one-step jobs on your computer, plus a memory of you. |
| **Who** | People who write all day: founders, students, sales, support, anyone living in WhatsApp, Slack and Gmail. India first. |
| **Why us** | Wispr only types. Maven types *and* does the next small thing. And it writes the way Indians write (₹, lakh, crore, phone numbers, Hinglish). |
| **Where** | macOS only for v1. Windows is a waitlist. |
| **Price** | Free (capped) and Pro ($10/month). |
| **Not** | Not a chatbot. Not Braino. Doesn't talk. Doesn't do multi-step tasks. |
| **v1 goal** | 10 paying users in the first month after launch. |

---

## 1. What Maven is, and what it is not

**Maven is:**
1. **A dictation app first.** 80% of usage will be "hold a key, talk, words appear". That has to be perfect before anything else.
2. **A little bit agentic.** One step at a time, and every action ends in text or gets you to where you type.
3. **A memory.** It remembers your names, spellings, lists and details so you say them once.
4. **Silent.** It never speaks. It shows a reply of three words or fewer next to its mark.

**Maven is not:**
- A chatbot. It doesn't answer questions or hold conversations.
- Braino. No multi-step jobs, no screen-watching, no music, no shopping, no planning.
- A voice assistant. No spoken replies in v1.

**The rule that decides every feature:** *Does it end in text, or get you to the place where you type, in one step?* If yes, it's Maven. If not, it's out.

---

## 2. The two modes

Maven does two things. Everything sits in one of them.

| Mode | What you do | What Maven does |
|---|---|---|
| **Write** (dictation) | Talk | Types your words, cleaned up, at your cursor |
| **Do** (a task) | Ask | Does one small job, then shows a three-word reply |

### 2.1 How Maven tells them apart (to build)

| You say | Mode | Why |
|---|---|---|
| "The deck is done, numbers by five" | Write | A statement, no command |
| "Tell Rahul the deck is done" | Do | Starts with a command verb + a person |
| "Open YouTube" | Do | Command verb + a place |
| "Reply to this, Friday works" | Do | "reply to this" |
| "Remind me that open YouTube is a bad habit" | Write | Not sure, so it types |

**Rules:**
- **When unsure, it types.** Typing the wrong thing is cheap. Doing the wrong thing isn't.
- **Command verbs:** open, go to, switch to, tell, message, send, reply, fill, add … to my list, remember.
- **Option for v1:** a second hotkey for Do, so we're never wrong. ✅ built 27 Oct: **fn + Control**, press to start, press again to stop. Auto-detection comes in v1.1 once we have data.
- **Built on:** a small, fast classifier call (or rules, then a classifier). It must add under 150 ms.

---

## 3. Features: Write (dictation)

### 3.1 Capture
| Requirement | Detail | Status |
|---|---|---|
| Hold-to-talk hotkey | Hold Control + Option, talk, let go | ✅ built |
| Hands-free | Double-tap to start, tap to stop | ⚠️ partly built |
| Starts instantly | Mic is warm, no first syllable lost | ✅ built |
| Works in any app | Anywhere with a text cursor | ✅ built |
| No text box | Copies the words and shows them in a small box | ✅ built |
| Cancel | ✕ on the island, or Escape | ✅ built |

### 3.2 Cleanup (what makes it feel like magic)
| Rule | You say | Maven types | Status |
|---|---|---|---|
| Remove filler | "um so the client loved it" | "The client loved it." | ✅ |
| Self-corrections | "five no wait six" | "6" | ✅ |
| Punctuation | run-on thoughts | sentences, ? and ! | ✅ |
| Spoken punctuation | "comma", "new paragraph" | , and a blank line | ✅ |
| Lists | 4+ items, or "the following" | bullets | ✅ |
| Steps | "first … then … finally" | numbered list | ✅ |
| Money | "twenty five thousand" | ₹25,000 | ✅ |
| Lakh / crore | "five lakh" | 5 lakh | ✅ |
| Phone numbers | ten digits | 98450 12345 | ✅ |
| Emails | "divya dot k at yahoo dot in" | divya.k@yahoo.in | ✅ |
| Names spelled right | "riya" | Riya (from memory) | ⚠️ needs memory |
| Hinglish | "kal milte hain, I'll send it" | kept in Roman letters | ❌ to build |
| Never invent | — | blocked by a safety check | ✅ |

**Accuracy target:** 95% exactly right on the held-out test set (today: 95% on 289 lines, 94% on lists).

### 3.3 Speed
| Target | Today |
|---|---|
| Under 1 s from letting go to pasted, for 90% of dictations | ~1.0 to 1.7 s |
| Never loses a word | ✅ (full recording is always the backup) |

---

## 4. Features: Do (one-step jobs)

Every job is one step. Anything that sends, submits or deletes **waits for your yes**.

| Job | Example | Reply | Asks first? | Free | Pro | Status |
|---|---|---|---|---|---|---|
| Open an app | "open Slack" | "Slack. Open." | No | ✓ | ✓ | ✅ built |
| Switch to an app or window | "go to WhatsApp" | "There." | No | ✓ | ✓ | ✅ built (apps) |
| Open a website | "open YouTube" | "YouTube. Open." | No | ✓ | ✓ | ✅ built |
| Switch to a tab | "go to my Gmail tab" | "Gmail." | No | ✓ | ✓ | ⬜ not yet |
| Write and send a message | "tell Rahul the deck is done" | "Drafted. Send?" | **Yes** | 10/day | ∞ | ✅ built (WhatsApp, Mail) |
| Reply to what's on screen | "reply to this, Friday works" | "Written. Send?" | **Yes** | — | ✓ | 🟡 pastes into the focused box |
| Fill a form | "fill in my address" | "Filled. Your call." | **Yes** | 3/month | ∞ | ✅ built (one detail) |
| Add to a list | "add milk to my grocery list" | "Added." | No | ✓ | ✓ | ✅ built (Apple Notes) |
| Remember something | "remember Riya is spelled R-I-Y-A" | "Got it." | No | basic | full | ✅ built |

**Apps for v1:** WhatsApp (Mac app first, web only if no app), Slack, Gmail (in Chrome), Mail, Notes, Chrome.

**Can't do it:** reply "Not my job." and do nothing. ✅
**Built 27 Oct 2026:** fn + Control → transcribe → one intent call (dictation-refine, mode "intent", Groq gpt-oss-20b, ~0.5 s) → one action. Sends and fills wait in the island card (Enter = yes, Esc = no, folds after 20 s with the draft on the clipboard). Same-name contacts ask "Which Riya?". Every command is logged to training/commands.jsonl.
**Didn't hear:** reply "Again?".

---

## 5. Features: Memory

| What it remembers | How it learns | Used for |
|---|---|---|
| Names and spellings | You say "remember…", or you correct a name once | Writing names right, finding people to message |
| Your details (address, email, phone) | Settings, or "my address is…" | Filling forms |
| Your lists | "add X to my Y list" | Adding to the right list |
| How you write | Your edits after Maven types | Matching your style (v1.1) |

**Rules:**
- You can see, edit and delete every memory in Settings.
- History and memory live on your Mac for now (in your account once accounts exist). Audio is never kept.
- Free: names and basic details. Pro: everything.

---

## 6. The face and replies

| Moment | Face | Reply (≤ 3 words) |
|---|---|---|
| Listening | Two bars, the voice wave moving through both | — |
| Thinking | Eyes drift up and to the side, slow dim light ✅ | — |
| Done (Write) | Small hop, then folds away | — |
| Done (Do) | Small hop | "YouTube. Open." |
| Waiting for a yes | The pill grows into the island card ✅ | "Drafted. Send?" |
| Can't do it | Looks away, small tilt ✅ | "Not my job." |
| Didn't hear | Tilts, one eye lower ✅ | "Again?" |

**Where:** the face appears in place (top-right corner, by the menu bar) and is never a panel or a window. **Personality:** dry, short, never chatty.

---

## 7. Settings (v1)

- Hotkeys: Write, Do, hands-free
- Language: English, Hinglish (when built)
- My details: name, email, phone, address
- Memory: see, edit, delete
- Plan: Free or Pro, usage this week
- Start at login, sounds on/off

---

## 8. Free and Pro

| | Free | Pro ($10/month) |
|---|---|---|
| Dictation | Unlimited for the first 4 days, then 2,000 words/week (heavy users hit it in ~1 day; light users never) | Unlimited |
| Open and switch | ✓ | ✓ |
| Send a message, with your yes | 10/day | Unlimited |
| Fill a form, with your yes | 3/month | Unlimited |
| Reply to what's on screen | — | ✓ | 🟡 pastes into the focused box |
| Memory | Names and basic details | Lists, details, your way of writing |
| Hinglish | — | ✓ (when built) |

**Payments:** Polar (already wired for Braino), `is_premium` decides the tier. **India price:** open question, ₹299 to ₹399 (Wispr charges ₹320).

---

## 9. How it's built

| Part | Today | v1 |
|---|---|---|
| Recording | Mac app, raw mic, warm for 60 s | Same |
| Speech to text | Groq Whisper turbo, OpenAI as backup, in phases while you talk | Same, plus a paid provider before launch |
| Cleanup | Groq gpt-oss-120b + rules + your 8 closest examples, OpenAI backup | Same |
| Safety check | Blocks made-up words, allows format words | Same |
| Paste | Native Cmd+V, 0.15 s | Same |
| Write or Do | Two hotkeys | Classifier in v1.1 |
| Actions | Braino Mac's existing pieces (WhatsApp, open apps, forms) | Wired into Maven, one step each |
| Memory | Braino's memory engine exists | Maven's own memory table |
| App | Lives inside Braino Mac today | **Its own app** with its own name, icon and installer |

**Is it a model?** Not yet. Today it's other companies' models plus our rules, examples and checks. Plan: fine-tune a small open model on our dictation data (v2). Then it can honestly be called "our model", and it'll be cheaper and faster.

---

## 10. What ships when

### v1: the first usable Maven (target: 2 weeks)
1. **Split Maven out of Braino Mac** into its own app, name, icon and installer *(3 days)*
2. **Write mode polished**: the island, the corner face, settings, word counting *(2 days)*
3. **Do mode, one-step jobs**: open, switch, website, tab, send with yes, fill with yes *(4 days)* 🟡 built 27 Oct except switching to a browser tab
4. **Memory v1**: names, details, lists, and a Settings page to view them *(2 days)*
5. **Free/Pro limits and Polar checkout** *(1 day)*
6. **Signed installer and tester release** *(1 day)*

### v1.1 (weeks 3 to 4)
- Auto-detecting Write or Do (a single hotkey)
- Reply to what's on screen
- Learning your writing style from your edits
- Hinglish
- "Fix my English" writing setting (grammar fixed, meaning never changed), plus "Maven, fix my English" on selected text

### v2
- A fine-tuned Maven model
- Windows

---

## 11. How we know it works

| Metric | Target |
|---|---|
| Paste time (90% of dictations) | Under 1 s |
| Cleanup exactly right | 95%+ |
| Words lost | 0 |
| Wrong action taken | 0 (when unsure, it types) |
| Testers using it daily after a week | 60% |
| Paying users in month 1 | 10 |

---

## 12. Open decisions (need Itish)

1. **One hotkey or two** for Write and Do in v1? *(Recommendation: two now, one in v1.1.)*
2. **India price:** ₹299, ₹399, or $10 for everyone?
3. **Separate app or a mode inside Braino Mac** for the first testers? *(Recommendation: separate. It's its own product.)*
4. **Name of the Pro plan:** "Pro" or "Maven Pro"?
5. **Speech-to-text provider for launch:** Groq paid (when it reopens), Deepgram, or OpenAI only.
