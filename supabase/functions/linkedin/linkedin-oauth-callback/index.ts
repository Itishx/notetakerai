import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { exchangeCode, fetchMember } from "../../_shared/linkedin.ts";
import { requireSupabaseServiceConfig } from "../../_shared/x-dispatch.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) return closeTab(`LinkedIn said no: ${error}`);
  if (!code || !state) return closeTab("LinkedIn did not send a code back.");

  try {
    const { supabaseUrl, serviceRoleKey } = requireSupabaseServiceConfig();
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: row } = await supabase
      .from("x_oauth_request_tokens")
      .select("user_identifier, token_secret")
      .eq("token", state)
      .maybeSingle();

    if (!row?.user_identifier || !String(row.token_secret).startsWith("linkedin:")) {
      return closeTab("That sign-in link has expired. Start again.");
    }

    const token = await exchangeCode(code);
    const member = await fetchMember(token.access_token);

    await supabase.from("channel_connections").upsert({
      user_id: row.user_identifier,
      channel: "linkedin",
      external_id: member.id,
      handle: member.name,
      display_name: member.name,
      avatar_url: member.picture,
      access_token: token.access_token,
      refresh_token: token.refresh_token ?? null,
      token_expires_at: token.expires_in
        ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
      scope: token.scope ?? null,
      last_checked_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: "user_id,channel" });

    await supabase.from("channel_settings").upsert(
      { user_id: row.user_identifier, channel: "linkedin" },
      { onConflict: "user_id,channel", ignoreDuplicates: true },
    );

    await supabase.from("x_oauth_request_tokens").delete().eq("token", state);
    return closeTab(null);
  } catch (e) {
    console.error("linkedin-oauth-callback:", e);
    return closeTab(e instanceof Error ? e.message : "Could not finish connecting LinkedIn.");
  }
});

/* The tab was opened by the setup flow, which is polling the connection row.
   So the page's only job is to say what happened and get out of the way. */
function closeTab(errorMessage: string | null) {
  const ok = !errorMessage;
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>${ok ? "Connected" : "Could not connect"}</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#f3f2ef;color:#1d1d1f;display:grid;place-items:center;height:100vh;margin:0;text-align:center;padding:24px}
h1{font-size:26px;font-weight:650;letter-spacing:-.02em;margin:0 0 10px}p{color:#5f6b7a;margin:0;font-size:15px;line-height:1.5;max-width:44ch}</style>
<h1>${ok ? "LinkedIn connected." : "Could not connect."}</h1>
<p>${ok ? "You can close this tab. Braino already knows." : escapeHtml(errorMessage!)}</p>
<script>setTimeout(function(){window.close()}, ${ok ? 1200 : 6000})</script>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
