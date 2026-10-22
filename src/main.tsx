import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/* After a deploy, a tab that was already open asks for page chunks by their
   old names, and the host answers with index.html instead of a 404, so the
   page never opens ("Foundry is not opening", 2026-10-23). Reload once to pick
   up the new build; the guard stops a reload loop if something else is wrong. */
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem("chunk-reload-at") || 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem("chunk-reload-at", String(Date.now()));
  } catch (_) { /* storage blocked: still reload once */ }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
