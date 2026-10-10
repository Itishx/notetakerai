import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ff = require("../mac/braino-mac/form-fill.cjs");

const me = { fullName: "Itish Pande", firstName: "Itish", lastName: "Pande", email: "itish@example.com", org: "Mesa School of Business", role: "Student", phone: "+91 98765 43210" };
const f = (o) => ({ type: "text", value: "", ...o });

test("fields are matched by label, name, placeholder or autocomplete", () => {
  assert.equal(ff.matchField(f({ label: "First name *" }), me).value, "Itish");
  assert.equal(ff.matchField(f({ label: "Full name" }), me).value, "Itish Pande");
  assert.equal(ff.matchField(f({ placeholder: "you@example.com", type: "email" }), me).value, "itish@example.com");
  assert.equal(ff.matchField(f({ label: "Mobile" }), me).value, "+91 98765 43210");
  assert.equal(ff.matchField(f({ label: "Name of your college" }), me).value, "Mesa School of Business");
  assert.equal(ff.matchField(f({ autocomplete: "organization" }), me).value, "Mesa School of Business");
});

test("never a password, a card, a code, or a guess into an essay", () => {
  assert.equal(ff.matchField(f({ type: "password", label: "Password" }), me), null);
  assert.equal(ff.matchField(f({ label: "Card number" }), me), null);
  assert.equal(ff.matchField(f({ label: "OTP" }), me), null);
  assert.equal(ff.matchField(f({ label: "Why this role? (200 words)" }), me), null);
  assert.equal(ff.matchField(f({ type: "textarea", label: "Your role" }), me), null);
  assert.equal(ff.matchField(f({ label: "Team name" }), me), null);
});

test("what's already there is never overwritten, and unknowns are named", () => {
  const { assign, unknown } = ff.planFill([f({ i: 0, label: "Email", value: "other@x.com" }), f({ i: 1, label: "GitHub" }), f({ i: 2, label: "You are a", type: "select", options: ["Choose", "Student", "Founder"] })], me);
  assert.deepEqual(assign, [{ i: 2, value: "Student", key: "role" }]);
  assert.deepEqual(unknown, ["GitHub"]);
});

test("what he hears", () => {
  for (const s of ["log me in", "Braino, sign me in", "please log in", "sign in to github", "use my saved password"]) assert.equal(ff.parseFormIntent(s)?.action, "sign_in", s);
  for (const s of ["fill this form for me", "Braino please fill this form", "fill it in", "can you fill the details"]) assert.equal(ff.parseFormIntent(s)?.action, "fill_form", s);
  assert.deepEqual(ff.parseFormIntent("my phone number is +91 98765 43210"), { action: "remember", key: "phone", value: "+91 98765 43210" });
  assert.equal(ff.parseFormIntent("don't fill this form"), null);
  assert.equal(ff.parseFormIntent("sign in with Google is broken on this site"), null);
});
