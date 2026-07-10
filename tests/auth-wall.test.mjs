// AUTH_WALL classification — tests the EXACT shipped module (extension/lib/recovery.js).
// The bug: "sign in" text exists on EVERY Amazon page (header/footer), so any failure
// was classified as a login wall while the user was logged in. Run: node tests/auth-wall.test.mjs
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("../extension/lib/recovery.js");
const R = globalThis.BrainoRecovery;

let pass = 0, fail = 0;
function check(name, obs, detail, wantAuthWall) {
  const got = R.classifyError({ error: detail }, null, obs)?.type === "AUTH_WALL";
  const ok = got === wantAuthWall;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name} (authWall=${got}, want ${wantAuthWall})`);
}

const el = (name, role = "link", inputType = "") => ({ name, role, inputType });

// ── The reported bug: logged-in Amazon pages with ambient "Sign in" text ──
check("1. amazon results page w/ header 'Sign in' link + random click failure → NOT a wall",
  { url: "https://www.amazon.in/s?k=atomic+habits", title: "Amazon.in : atomic habits",
    elements: [el("Hello, ila Account & Lists"), el("Sign in", "button"), el("Add to Cart", "button")] },
  "element not found", false);
check("2. amazon cart page with footer sign-in text + assertion failure → NOT a wall",
  { url: "https://www.amazon.in/gp/cart/view.html", title: "Amazon.in Shopping Cart",
    elements: [el("Proceed to Buy", "button"), el("Sign in to see your saved items")] },
  "assertion failed", false);
check("3. checkout page, logged in → NOT a wall",
  { url: "https://www.amazon.in/gp/buy/spc/handlers/display.html", title: "Place Your Order - Amazon.in",
    elements: [el("Use this address", "button"), el("Sign out")] },
  "timeout", false);

// ── Real walls: strong evidence must still classify ──
check("4. actual amazon signin page URL → WALL",
  { url: "https://www.amazon.in/ap/signin?openid.pape.max_auth_age=0", title: "Amazon Sign-In",
    elements: [el("Email or mobile phone number", "textbox")] },
  "element not found", true);
check("5. password field in front of us → WALL",
  { url: "https://www.example.com/checkout", title: "Checkout",
    elements: [el("Password", "textbox", "password"), el("Continue", "button")] },
  "assertion failed", true);
check("6. generic /login page → WALL",
  { url: "https://www.linkedin.com/login", title: "LinkedIn Login",
    elements: [el("Email", "textbox")] },
  "element not found", true);
check("7. page title 'Sign in' → WALL",
  { url: "https://x.com/i/flow", title: "Sign in to X",
    elements: [el("Next", "button")] },
  "element not found", true);
check("8. explicit session-expired error → WALL",
  { url: "https://mail.google.com/mail/u/0/", title: "Gmail",
    elements: [el("Compose", "button")] },
  "session expired, please sign in", true);

// ── Other classifications unaffected ──
check("9. captcha still wins over auth heuristics",
  { url: "https://www.amazon.in/errors/validateCaptcha", title: "Amazon",
    elements: [el("Enter the characters you see", "textbox"), el("Sign in")] },
  "captcha required", false /* CAPTCHA type, not AUTH_WALL */);
check("10. plain element-not-found stays element-not-found on a clean page",
  { url: "https://www.youtube.com/results?search_query=x", title: "YouTube",
    elements: [el("Search", "button")] },
  "element not found", false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
