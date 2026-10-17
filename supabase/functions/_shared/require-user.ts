import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// Returns the signed-in Supabase user behind the request's bearer token, or null.
export async function getRequestUser(req: Request) {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(jwt);
  if (error || !data?.user) return null;
  return data.user;
}

// Same creator/admin check realtime-costs-admin uses: the creator account, plus
// anyone listed in REALTIME_COSTS_ADMIN_EMAILS.
const INTERNAL_ADMIN_EMAILS = new Set(["itishpande21@gmail.com"]);

export function isCreatorUser(user: { email?: string | null } | null) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return false;
  const extra = String(Deno.env.get("REALTIME_COSTS_ADMIN_EMAILS") || "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return INTERNAL_ADMIN_EMAILS.has(email) || extra.includes(email);
}
