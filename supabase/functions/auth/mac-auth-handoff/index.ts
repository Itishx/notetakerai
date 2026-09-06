// mac-auth-handoff — the meeting point between the browser and the Mac app.
//
// Signing in on the Mac happens in the real browser, because that is where the
// Google session already is. Getting the result back to the app is the hard
// part, and both of the usual routes are shut:
//
//   - The browser POSTing to http://127.0.0.1 is blocked by Chrome. It refuses
//     a public https page reaching the local network and stops the request
//     before it leaves, so the app is never contacted and no CORS header helps.
//   - A braino:// deep link needs the scheme declared in a packaged app bundle.
//     The Mac app runs from source today, so macOS has no binding for it.
//
// So neither side talks to the other. The browser leaves the session here under
// the nonce the app generated, and the app comes and collects it. The nonce is
// 24 random bytes, it is spent on the first claim, and the row is deleted as it
// is read, so a session can be collected exactly once.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_AGE_MS = 5 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    return await handle(req);
  } catch (error) {
    /* A bare 500 from the platform tells you nothing from the outside, and this
       function is the one you reach for when nothing else works. */
    console.error("mac-auth-handoff failed:", error);
    return json({ error: String((error as Error)?.message || error) }, 500);
  }
});

async function handle(req: Request) {

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase is not configured." }, 500);

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "");
  const nonce = String(body?.nonce || "");
  /* Short enough to be a typo, long enough to be a secret: anything under 20
     characters did not come from the app. */
  if (!nonce || nonce.length < 20 || nonce.length > 200) return json({ error: "Bad nonce." }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  /* rpc() hands back a query builder, not a promise, so it has no .catch of its
     own. Awaiting it inside a try is the only way to ignore a failure here. */
  try { await admin.rpc("purge_stale_mac_auth_handoffs"); } catch (_) { /* not worth failing over */ }

  if (action === "put") {
    /* Writing requires the signed-in person, so a session can only ever be left
       here by the browser that just earned it. */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Sign in required." }, 401);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Sign in required." }, 401);

    const payload = body?.payload;
    if (!payload || typeof payload !== "object" || !payload.token) {
      return json({ error: "Nothing to hand over." }, 400);
    }

    const { error } = await admin
      .from("mac_auth_handoffs")
      .upsert({ nonce, user_id: user.id, payload, created_at: new Date().toISOString() });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "claim") {
    /* No JWT here, because the app is asking precisely because it has none.
       Knowing the nonce is the whole credential, and it is spent on use. */
    const { data, error } = await admin
      .from("mac_auth_handoffs")
      .select("payload, created_at")
      .eq("nonce", nonce)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ ok: false, reason: "waiting" });

    await admin.from("mac_auth_handoffs").delete().eq("nonce", nonce);

    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > MAX_AGE_MS) return json({ ok: false, reason: "expired" });
    return json({ ok: true, payload: data.payload });
  }

  return json({ error: "Unknown action." }, 400);
}
