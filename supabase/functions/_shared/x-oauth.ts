const textEncoder = new TextEncoder();

function readFirstEnv(names: string[]): string | null {
  for (const name of names) {
    const value = Deno.env.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function nonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = "";
  url.search = "";
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function appendQueryParams(url: string, queryParams?: Record<string, string>): string {
  if (!queryParams || !Object.keys(queryParams).length) return url;
  const parsed = new URL(url);
  Object.entries(queryParams).forEach(([key, value]) => {
    parsed.searchParams.set(key, value);
  });
  return parsed.toString();
}

function buildParameterString(url: string, oauthParams: Record<string, string>): string {
  const pairs: Array<[string, string]> = [];
  const parsed = new URL(url);

  parsed.searchParams.forEach((value, key) => {
    pairs.push([key, value]);
  });

  Object.entries(oauthParams).forEach(([key, value]) => {
    if (key !== "oauth_signature") {
      pairs.push([key, value]);
    }
  });

  return pairs
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey === rightKey) return leftValue.localeCompare(rightValue);
      return leftKey.localeCompare(rightKey);
    })
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join("&");
}

async function hmacSha1Base64(key: string, payload: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(key),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, textEncoder.encode(payload));
  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function getXConsumerCredentials() {
  const consumerKey = readFirstEnv([
    "X_API_KEY",
    "X_CONSUMER_KEY",
    "TWITTER_API_KEY",
    "TWITTER_CONSUMER_KEY",
  ]);
  const consumerSecret = readFirstEnv([
    "X_API_SECRET",
    "X_API_SECRET_KEY",
    "X_CONSUMER_SECRET",
    "TWITTER_API_SECRET",
    "TWITTER_API_SECRET_KEY",
    "TWITTER_CONSUMER_SECRET",
  ]);

  if (!consumerKey || !consumerSecret) {
    throw new Error(
      "X OAuth is not configured. Add X_API_KEY and X_API_SECRET (or TWITTER_CONSUMER_KEY/TWITTER_CONSUMER_SECRET) to supabase/functions/.env.local or Supabase secrets.",
    );
  }

  return { consumerKey, consumerSecret };
}

export function getXCallbackUrl(): string {
  return (
    readFirstEnv(["X_OAUTH_CALLBACK_URL", "X_REDIRECT_URI", "TWITTER_CALLBACK_URL"]) ||
    `${requiredEnv("SUPABASE_URL")}/functions/v1/x-oauth-callback`
  );
}

export async function buildOAuth1AuthorizationHeader(options: {
  method: string;
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  oauthExtras?: Record<string, string>;
}): Promise<string> {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: options.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
    ...(options.token ? { oauth_token: options.token } : {}),
    ...(options.oauthExtras || {}),
  };

  const parameterString = buildParameterString(options.url, oauthParams);
  const signatureBaseString = [
    options.method.toUpperCase(),
    percentEncode(normalizeUrl(options.url)),
    percentEncode(parameterString),
  ].join("&");

  const signingKey = `${percentEncode(options.consumerSecret)}&${percentEncode(options.tokenSecret || "")}`;
  oauthParams.oauth_signature = await hmacSha1Base64(signingKey, signatureBaseString);

  return `OAuth ${Object.entries(oauthParams)
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ")}`;
}

export async function xFetch(options: {
  method?: string;
  url: string;
  token?: string;
  tokenSecret?: string;
  queryParams?: Record<string, string>;
  oauthExtras?: Record<string, string>;
  headers?: HeadersInit;
  body?: BodyInit | null;
}): Promise<Response> {
  const method = options.method || "GET";
  const { consumerKey, consumerSecret } = getXConsumerCredentials();
  const url = appendQueryParams(options.url, options.queryParams);
  const authorization = await buildOAuth1AuthorizationHeader({
    method,
    url,
    consumerKey,
    consumerSecret,
    token: options.token,
    tokenSecret: options.tokenSecret,
    oauthExtras: options.oauthExtras,
  });

  const headers = new Headers(options.headers);
  headers.set("Authorization", authorization);

  return fetch(url, {
    method,
    headers,
    body: options.body ?? null,
  });
}

export function parseFormEncodedResponse(payload: string): Record<string, string> {
  const params = new URLSearchParams(payload);
  return Object.fromEntries(params.entries());
}
