// linkedin.ts — the sanctioned half of LinkedIn.
//
// What lives here is only what LinkedIn actually permits a member-scoped app to
// do: OAuth as the member, and publish to their own profile. Deliberately
// absent, and not an oversight:
//
//   - Commenting. The Comments API exists and names w_member_social as the
//     member scope, but it sits under Community Management, whose access takes
//     weeks to months and needs a registered entity. Until that resolves,
//     Braino drafts comments and the founder sends them.
//   - Carousels, articles and native reposts. Not publishable through any API
//     by anyone. The restriction is in the API, not in our access level.
//   - Anything driven by a browser. LinkedIn's User Agreement prohibits
//     third-party automation including headless browsers and detectable
//     extensions, roughly 40% of accounts using non-compliant tooling were
//     restricted between January and March 2026, and extensions carry around
//     60% higher detection risk because injected DOM code is visible to their
//     detectors. Braino owns an extension. It must never touch LinkedIn.

const LI_AUTH = "https://www.linkedin.com/oauth/v2/authorization";
const LI_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
const LI_API = "https://api.linkedin.com";

/* Member scopes only. openid/profile give us name and picture for the surface;
   w_member_social is the write. No r_ scopes: reading the member's own history
   needs Community Management, which is why LinkedIn voice learning is not
   available and the surfaces say so instead of faking it. */
export const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"];

export function linkedinConfig() {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI")
    ?? `${Deno.env.get("SUPABASE_URL")}/functions/v1/linkedin-oauth-callback`;
  return { clientId, clientSecret, redirectUri };
}

export function buildAuthUrl(state: string) {
  const { clientId, redirectUri } = linkedinConfig();
  const url = new URL(LI_AUTH);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("scope", LINKEDIN_SCOPES.join(" "));
  return url.toString();
}

export async function exchangeCode(code: string) {
  const { clientId, clientSecret, redirectUri } = linkedinConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId ?? "",
    client_secret: clientSecret ?? "",
  });
  const res = await fetch(LI_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`LinkedIn token exchange failed (${res.status}): ${raw.slice(0, 200)}`);
  return JSON.parse(raw) as {
    access_token: string; expires_in: number;
    refresh_token?: string; refresh_token_expires_in?: number; scope?: string;
  };
}

/* OpenID userinfo. `sub` is the member id used to build the author URN. */
export async function fetchMember(accessToken: string) {
  const res = await fetch(`${LI_API}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`LinkedIn userinfo failed (${res.status})`);
  const p = await res.json();
  return {
    id: String(p.sub ?? ""),
    name: String(p.name ?? ""),
    picture: p.picture ? String(p.picture) : null,
  };
}

/* Publish a text post to the member's own profile.
   /rest/posts, not the deprecated /v2/ugcPosts: LinkedIn still accepts ugcPosts
   but no longer guarantees parity and ships new features only on Posts. */
export async function publishPost(opts: {
  accessToken: string; memberId: string; text: string;
}) {
  const res = await fetch(`${LI_API}/rest/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202605",
    },
    body: JSON.stringify({
      author: `urn:li:person:${opts.memberId}`,
      commentary: opts.text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`LinkedIn publish failed (${res.status}): ${raw.slice(0, 300)}`);
  }
  // The post URN comes back in a header, not the body.
  const urn = res.headers.get("x-restli-id") ?? res.headers.get("x-linkedin-id") ?? null;
  return {
    id: urn,
    permalink: urn ? `https://www.linkedin.com/feed/update/${urn}/` : null,
  };
}

/* LinkedIn's own daily throttles: 150 requests per member per day, 100,000 per
   app, both resetting at midnight UTC, both returning 429. Our own caps sit far
   below these; this is the backstop. */
export const LINKEDIN_MEMBER_DAILY_LIMIT = 150;
