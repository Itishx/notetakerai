/* Onboarding and settings: sign in (one account with the Mac app), the mic
   grant (once, for the whole extension), shortcuts, details, look, language. */
const $ = (s) => document.querySelector(s);
const done = (id, yes) => document.getElementById(id)?.classList.toggle("done", Boolean(yes));

async function paintAccount() {
  const { account } = await chrome.storage.local.get("account");
  const inn = Boolean(account?.token);
  $("#signin").hidden = inn; $("#signout").hidden = !inn;
  $("#who").textContent = inn ? `Signed in as ${account.email || account.name}.` : "";
  $("#who").className = "state" + (inn ? " ok" : "");
  done("account", inn);
}
$("#signin").addEventListener("click", () => chrome.runtime.sendMessage({ t: "sign-in" }));
$("#signout").addEventListener("click", () => chrome.runtime.sendMessage({ t: "sign-out" }));

async function micState() { try { return (await navigator.permissions.query({ name: "microphone" })).state; } catch (_) { return "prompt"; } }
async function paintMic() {
  const s = await micState();
  $("#micstate").textContent = s === "granted" ? "Allowed. You're set." : s === "denied" ? "Blocked. Click the icon at the left of the address bar to allow it." : "";
  $("#micstate").className = "state" + (s === "granted" ? " ok" : "");
  $("#micbtn").hidden = s === "granted";
  done("mic", s === "granted");
}
$("#micbtn").addEventListener("click", async () => {
  try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); st.getTracks().forEach((t) => t.stop()); } catch (_) {}
  paintMic();
});

chrome.storage.local.get(["details", "islandTheme", "language", "words"]).then(({ details = {}, islandTheme = "ink", language = "auto", words = 0 }) => {
  for (const k of ["name", "email", "phone", "address"]) $(`#details [name=${k}]`).value = details[k] || "";
  $("#theme").value = islandTheme; $("#language").value = language;
  if (words) $("#count").textContent = `${words.toLocaleString()} words written with Maven in Chrome.`;
});
$("#details").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = new FormData(e.target), details = {};
  for (const k of ["name", "email", "phone", "address"]) details[k] = String(f.get(k) || "").trim();
  await chrome.storage.local.set({ details });
  $("#saved").textContent = "Saved."; $("#saved").className = "state ok";
});
$("#theme").addEventListener("change", (e) => chrome.storage.local.set({ islandTheme: e.target.value }));
$("#language").addEventListener("change", (e) => chrome.storage.local.set({ language: e.target.value }));
chrome.storage.onChanged.addListener((c) => { if (c.account) paintAccount(); if (c.words) $("#count").textContent = `${c.words.newValue.toLocaleString()} words written with Maven in Chrome.`; });
paintAccount(); paintMic();
if (location.hash === "#mic") $("#mic").scrollIntoView({ block: "center" });
