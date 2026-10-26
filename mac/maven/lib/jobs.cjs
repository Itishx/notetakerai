"use strict";
/* Maven's jobs: the ONE list (2026-10-27). Data only.
   Used by the island's "What I can do" card and the Hub's "What Maven does" page.
   The website keeps an identical copy as MAVEN_JOBS in src/pages/Maven.tsx
   (the site can't import from mac/). Change both together. */
const MAVEN_JOBS = {
  write: {
    title: "Write",
    shortcut: "⌃⌥",
    how: "Control+Option, press to start, press again to stop",
    jobs: [
      { job: "Type anything, cleaned up", example: "the deck is done numbers by five no wait six" },
      { job: "Lists, ₹, lakh and crore, phone numbers, emails written properly", short: "Lists, ₹, numbers, emails", example: "the budget is twenty five thousand" },
      { job: "Snippets", example: "my calendar link" },
    ],
  },
  do: {
    title: "Do",
    shortcut: "fn⌃",
    how: "fn+Control, press to start, press again to stop",
    jobs: [
      { job: "Open an app", example: "open Slack" },
      { job: "Open a website", example: "open YouTube" },
      { job: "Send a message on WhatsApp or Mail, after your yes", short: "Send a message", example: "tell Neha I'm running late" },
      { job: "Reply to the email or message on screen, after your yes", short: "Reply to what's on screen", example: "draft a reply to this email", example2: "reply to this, Friday works" },
      { job: "Fill in your saved details", short: "Fill your details", example: "fill in my address" },
      { job: "Add to a list in Notes", short: "Add to a list", example: "add milk to my grocery list" },
      { job: "Remember a name or detail", short: "Remember a name", example: "remember Riya is R-I-Y-A" },
    ],
  },
  not: {
    title: "Not Maven's job",
    jobs: ["Playing music", "Searching the web", "Shopping", "Booking", "Anything with more than one step", "Anything it would have to decide for you"],
  },
};

module.exports = { MAVEN_JOBS };
