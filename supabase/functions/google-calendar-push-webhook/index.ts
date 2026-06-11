import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { json } from "../_shared/google-calendar.ts";

serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });

  try {
    const channelId = req.headers.get("x-goog-channel-id") || "";
    const channelToken = req.headers.get("x-goog-channel-token") || "";
    const resourceId = req.headers.get("x-goog-resource-id") || "";
    const resourceState = req.headers.get("x-goog-resource-state") || "";
    const messageNumber = req.headers.get("x-goog-message-number") || "";

    if (!channelId) return json({ ok: false, error: "Missing channel id" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service role is not configured.");
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: connection, error } = await admin
      .from("google_calendar_connections")
      .select("id, watch_token")
      .eq("watch_channel_id", channelId)
      .eq("watch_resource_id", resourceId)
      .maybeSingle();

    if (error) throw error;
    if (!connection) return json({ ok: true, ignored: true });
    if (connection.watch_token && channelToken !== connection.watch_token) {
      return json({ ok: false, error: "Invalid channel token" }, 403);
    }

    await admin
      .from("google_calendar_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id);

    return json({ ok: true, resourceState, messageNumber });
  } catch (e) {
    console.error("google-calendar-push-webhook error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
