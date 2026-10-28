/* Settings and first run: the mic grant (once, for the whole extension),
   the two shortcuts, details for forms, look and language. */
const $ = (s) => document.querySelector(s);
async function micState() {
  try { const p = await navigator.permissions.query({ name: "microphone" }); return p.state; } catch (_) { return "prompt"; }
}
async function paintMic() {
  const s = await micState();
  $("#micstate").textContent = s === "granted" ? "Allowed. You're set." : s === "denied" ? "Blocked. Click the lock in the address bar to allow it." : "";
  $("#micstate").className = "state" + (s === "granted" ? " ok" : "");
  $("#micbtn").hidden = s === "granted";
}
$("#micbtn").addEventListener("click", async () => {
  try { const st = await navigator.mediaDevices.getUserMedia({ audio: true }); st.getTracks().forEach((t) => t.stop()); } catch (_) {}
  paintMic();
});
paintMic();
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
if (location.hash === "#mic") $("#mic").scrollIntoView();
