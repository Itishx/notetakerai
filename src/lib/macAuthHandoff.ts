/* Handing a signed-in session back to the Braino Mac app.
 *
 * The Mac app opens trybraino.com/auth/extension with a macCallback and a
 * macNonce in the query string, and the page POSTs the session to that local
 * port. That works right up until Supabase decides it does not like the
 * redirect_to it was given, at which point it quietly sends you to the Site URL
 * instead and every one of those query parameters is gone. You end up signed in
 * on the homepage with the token in the hash, the Mac app waits on a port
 * nobody ever calls, and the next launch asks you to sign in again.
 *
 * So the callback details are written down before the redirect and completed
 * from wherever you land. */

const KEY = "braino.mac.auth.handoff";
const TTL_MS = 10 * 60 * 1000;

export type MacHandoff = { macCallback: string; macNonce: string; at: number };

export function savePendingMacHandoff(macCallback: string, macNonce: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ macCallback, macNonce, at: Date.now() }));
  } catch (_) {
    /* Private windows and blocked site data. The query-string path still works. */
  }
}

export function readPendingMacHandoff(): MacHandoff | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MacHandoff;
    if (!parsed?.macCallback || !parsed?.macNonce) return null;
    /* Stale means the app has long since given up and picked a new port. */
    if (Date.now() - (parsed.at || 0) > TTL_MS) { clearPendingMacHandoff(); return null; }
    return parsed;
  } catch (_) {
    return null;
  }
}

export function clearPendingMacHandoff() {
  try { window.localStorage.removeItem(KEY); } catch (_) {}
}

/* Only ever a loopback address, and only ever http. A callback URL that came
   back off the wire is not allowed to point anywhere else. */
export function isLoopbackCallback(raw: string) {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname);
  } catch (_) {
    return false;
  }
}

export type MacAuthPayload = {
  action: "authToken";
  token: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  displayName: string;
  email?: string;
};

export async function postMacHandoff(macCallback: string, macNonce: string, payload: MacAuthPayload) {
  if (!isLoopbackCallback(macCallback)) throw new Error("Invalid Braino Mac callback URL.");
  const response = await fetch(macCallback, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, nonce: macNonce }),
  });
  if (!response.ok) throw new Error(`Braino Mac callback failed (${response.status}).`);
  return true;
}


/* Leaving the session where the app can come and collect it.
 *
 * Chrome will not let a public https page reach http://127.0.0.1, and macOS has
 * no braino:// binding while the Mac app runs from source, so neither side can
 * call the other. They meet in the middle instead: the browser leaves the
 * session under the app's own nonce and the app claims it once. */
export function macDeepLinkUrl(macNonce: string, payload: MacAuthPayload) {
  const q = new URLSearchParams();
  q.set("nonce", macNonce);
  q.set("token", payload.token);
  if (payload.refreshToken) q.set("refresh", payload.refreshToken);
  if (payload.expiresAt) q.set("expires", String(payload.expiresAt));
  q.set("uid", payload.userId);
  q.set("name", payload.displayName);
  if (payload.email) q.set("email", payload.email);
  return `braino://auth?${q.toString()}`;
}


export async function leaveSessionForMac(macNonce: string, payload: MacAuthPayload, accessToken: string) {
  const base = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, "");
  const anon = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  if (!base) throw new Error("Supabase is not configured.");
  const res = await fetch(`${base}/functions/v1/mac-auth-handoff`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(anon ? { apikey: anon } : {}),
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ action: "put", nonce: macNonce, payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `Handoff failed (${res.status}).`);
  return true;
}
