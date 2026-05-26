// OAuth 2.0 PKCE helpers for X (Twitter) API v2.

const denoEnv = (globalThis as typeof globalThis & {
  Deno?: { env?: { get(name: string): string | undefined } };
}).Deno?.env;

function readEnv(name: string): string | undefined {
  return denoEnv?.get(name)?.trim() || undefined;
}

function readFirstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = readEnv(name);
    if (value) return value;
  }
  return null;
}

export function getXOAuthClient(): { clientId: string; clientSecret: string } {
  const clientId = readFirstEnv(["X_CLIENT_ID", "X_CLIENT_ID_OAUTH", "TWITTER_CLIENT_ID"]);
  const clientSecret = readFirstEnv([
    "X_CLIENT_SECRET",
    "X_OAUTH_CLIENT_SECRET",
    "X_OATH_CLIENT_SECRET",
    "TWITTER_CLIENT_SECRET",
  ]);
  if (!clientId || !clientSecret) {
    throw new Error(
      "X OAuth 2.0 not configured. Set X_CLIENT_ID and X_CLIENT_SECRET in Supabase secrets.",
    );
  }
  return { clientId, clientSecret };
}

export function getXCallbackUrl(): string {
  const explicit = readFirstEnv(["X_REDIRECT_URI", "X_OAUTH_CALLBACK_URL", "TWITTER_CALLBACK_URL"]);
  if (explicit) return explicit;
  const supabaseUrl = readEnv("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  return `${supabaseUrl}/functions/v1/x-oauth-callback`;
}

export const X_SCOPES = "tweet.read tweet.write users.read offline.access";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomUrlSafe(byteLength = 32): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function basicAuthHeader(clientId: string, clientSecret: string): string {
  return `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
}
