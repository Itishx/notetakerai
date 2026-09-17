import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const js = readFileSync(new URL("../mac/braino-mac/renderer/braino-mac.js", import.meta.url), "utf8");
const lift = (start, end = "\n}\n") => { const at = js.indexOf(start); assert.ok(at >= 0, start); return js.slice(at, js.indexOf(end, at) + end.length); };

const { speakableAmounts, stripSpeechText } = Function(`
  ${lift("function nfTrimAmount(value) {")}
  ${lift("function nfSpokenIndianAmount(value) {")}
  ${lift("function nfSpokenWesternAmount(value) {")}
  ${lift("const NF_SPOKEN_SUFFIX = {", "\n};\n")}
  ${lift("function speakableAmounts(text) {")}
  ${lift("function stripSpeechText(text) {")}
  return { speakableAmounts, stripSpeechText };
`)();

/* "Rs. 2,00,000, bro" is how he said it. A person says "2 lakh rupees". */
test("rupees are said the way a person in India says them", () => {
  assert.equal(
    stripSpeechText("The screen shows ₹2,713.00 collected. To reach ₹2,00,000, you still need ₹1,97,287.00 in sales."),
    "The screen shows 2,713 rupees collected. To reach 2 lakh rupees, you still need 1.97 lakh rupees in sales.",
  );
  const say = speakableAmounts;
  assert.equal(say("Rs. 2,00,000/- only"), "2 lakh rupees only");
  assert.equal(say("INR 2,50,00,000"), "2.5 crore rupees");
  assert.equal(say("₹1"), "1 rupee");
  assert.equal(say("₹49.99"), "49.99 rupees");
  assert.equal(say("₹5k"), "5 thousand rupees");
  assert.equal(say("₹1.2 cr"), "1.2 crore rupees");
  assert.equal(say("₹3 lakh"), "3 lakh rupees");
  assert.equal(say("Rs 15000"), "15,000 rupees");
});

test("dollars and Indian-grouped numbers read naturally too", () => {
  const say = speakableAmounts;
  assert.equal(say("$1.2M in funding"), "1.2 million dollars in funding");
  assert.equal(say("$15 a month"), "15 dollars a month");
  assert.equal(say("$0.05 per minute"), "5 cents per minute");
  assert.equal(say("$72 a day"), "72 dollars a day");
  assert.equal(say("$2,500,000"), "2.5 million dollars");
  assert.equal(say("2,00,000 users"), "2 lakh users");
  // Western grouping without a currency, and plain text, are left alone.
  assert.equal(say("1,200 people and 7 PM"), "1,200 people and 7 PM");
  assert.equal(say("RSVP to Rs building"), "RSVP to Rs building");
});
