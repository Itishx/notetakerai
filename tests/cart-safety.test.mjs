// Cart-safety guard — Braino must NEVER delete items from or change quantities in a cart.
// Mirrors bgCartSafetyBlock (extension/background.js). Run: node tests/cart-safety.test.mjs
// NOTE: keep this regex in sync with bgCartSafetyBlock if that changes.
function blocked(name) {
  name = String(name || "").trim().toLowerCase();
  if (!name) return false;
  if (/\b(add to cart|add to basket|buy now|buy it|place (your )?order|proceed|checkout|check out|continue|order now)\b/.test(name)) return false;
  return /\b(delete|remove)\b/.test(name)
    || /\bsave for later\b/.test(name)
    || /\bmove to (?:wish ?list|saved|list)\b/.test(name)
    || /\b(decrease|reduce|decrement|increase|increment)\b.*\b(quantity|qty|item)\b/.test(name)
    || /\b(quantity|qty)\b.*\b(decrease|reduce|increase)\b/.test(name)
    || /^[-‐‑‒–—−+]$/.test(name)
    || /^(?:minus|plus)$/.test(name);
}

let pass = 0, fail = 0;
const check = (name, want) => {
  const got = blocked(name);
  const ok = got === want;
  if (ok) pass++; else fail++;
  console.log(`${ok ? "ok  " : "FAIL"} ${JSON.stringify(name)} → block=${got} (want ${want})`);
};

// MUST BLOCK — the real incident (deleting mom's cart items) + all quantity controls
["Delete", "Remove", "Remove from cart", "Remove item", "Save for later",
 "Move to Wish List", "Move to saved", "Decrease quantity", "Increase quantity",
 "Quantity: decrease", "+", "-", "−", "–", "—", "minus", "plus"].forEach((n) => check(n, true));

// MUST ALLOW — the forward/purchase path and product links
["Add to Cart", "Add to Basket", "Buy Now", "Buy it now", "Proceed to Buy",
 "Proceed to checkout", "Place your order", "Order now", "Go to Cart", "No Thanks",
 "Continue", "Atomic Habits: Tiny Changes, Remarkable Results",
 "Increase your savings"].forEach((n) => check(n, false));

// Intentional OVER-BLOCK: any "remove"/"delete" click is refused, even off-cart ones
// (e.g. "Remove ads", "remove filter"). A blocked dismiss is harmless; a deleted cart
// item is not. Safety wins — this is a deliberate conservative choice, not a bug.
["Remove ads", "Remove filter", "Delete draft"].forEach((n) => check(n, true));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
