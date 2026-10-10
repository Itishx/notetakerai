/* Approval card, under the notch: for things he was ASKED out loud to do and
   needs a yes for before he cannot take them back. Says exactly what is about
   to happen ("Send on WhatsApp to Param: ..."), with Approve and Cancel, which
   go down the same path as saying yes or no. Saying it still works; the card
   just makes it visible and one click away. Typed commands get their card in
   Chat instead (chat.js). It goes when the question does. */
(() => {
  const api = window.brainoMac;
  if (!api?.onApproval) return;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const card = document.createElement("div");
  card.id = "approval-card";
  document.body.appendChild(card);
  let current = null, timer = 0, hideTimer = 0;

  function place() {
    const pill = document.querySelector("#notch-face .nf-pill");
    const trail = document.getElementById("task-trail");
    const under = Math.max(pill ? pill.getBoundingClientRect().bottom : 0, trail && trail.classList.contains("show") ? trail.getBoundingClientRect().bottom : 0);
    card.style.top = `${Math.max(44, under + 10)}px`;
  }
  function hide(after = 0) {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { card.classList.remove("show"); current = null; }, after);
  }
  function show(p) {
    current = p;
    clearTimeout(hideTimer);
    card.className = `show ${p.kind === "keep_going" ? "keep" : "confirm"}`;
    card.innerHTML = `<div class="ac-head"><span class="ac-orb"></span><span class="ac-title">${esc(p.title || "Before I do this")}</span><span class="ac-time"></span></div>
      <div class="ac-detail">${esc(p.detail || "")}</div>
      <div class="ac-row"><button type="button" class="ac-no">${esc(p.no || "Cancel")}</button><button type="button" class="ac-yes">${esc(p.yes || "Approve")}</button></div>
      <div class="ac-hint">Or just say yes or no.</div>`;
    place();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!current) return clearInterval(timer);
      place();
      const left = Math.max(0, Math.round(((current.expiresAt || 0) - Date.now()) / 1000));
      const t = card.querySelector(".ac-time");
      if (t) t.textContent = left ? `${left}s` : "";
      if (current.expiresAt && Date.now() > current.expiresAt) hide();
    }, 500);
  }
  async function answer(yes) {
    if (!current) return;
    const label = yes ? (current.kind === "keep_going" ? "Going on" : "Approved") : (current.kind === "keep_going" ? "Stopped" : "Cancelled");
    card.classList.add(yes ? "said-yes" : "said-no");
    card.querySelector(".ac-row").innerHTML = `<span class="ac-said">${label}</span>`;
    current = null;
    hide(900);
    // Exactly what saying it does: the same turn, spoken back.
    try { await window.__brainoRunDelegate?.(yes ? "yes" : "cancel"); } catch (_) {}
  }
  card.addEventListener("click", (e) => {
    if (e.target.closest(".ac-yes")) void answer(true);
    else if (e.target.closest(".ac-no")) void answer(false);
  });
  /* The overlay lets clicks through to your apps; over this card it keeps them. */
  window.__approvalCardHit = (x, y) => {
    if (!card.classList.contains("show")) return false;
    const r = card.getBoundingClientRect();
    return x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6;
  };
  api.onApproval((p) => {
    try {
      if (p.cleared) { if (current) hide(); return; }
      if (p.surface !== "voice") return;
      show(p);
    } catch (_) {}
  });
})();
