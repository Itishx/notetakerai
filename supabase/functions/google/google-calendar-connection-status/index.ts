import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  corsHeaders,
  createCalendarAdmin,
  ensureCalendarEventWatch,
  getCalendarConnection,
  getCalendarEnv,
  getValidCalendarAccessToken,
  json,
  requireAuthedCalendarUser,
  serializeError,
} from "../../_shared/google-calendar.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = getCalendarEnv(req);
    const user = await requireAuthedCalendarUser(req, env);
    const { userIdentifier } = await req.json().catch(() => ({}));
    if (userIdentifier && userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);

    const admin = createCalendarAdmin(env);
    let data = null;
    try {
      const connection = await getCalendarConnection(admin, user.id);
      const token = await getValidCalendarAccessToken({
        admin,
        userId: user.id,
        env,
        connection,
        logPrefix: "google-calendar-connection-status",
      });
      try {
        await ensureCalendarEventWatch({
          admin,
          userId: user.id,
          connection,
          accessToken: token,
          logPrefix: "google-calendar-connection-status",
        });
      } catch (watchError) {
        console.warn("google-calendar-connection-status watch refresh skipped:", watchError);
      }

      const refreshed = await getCalendarConnection(admin, user.id);
      data = {
        google_email: refreshed.google_email ?? null,
        google_user_id: refreshed.google_user_id ?? null,
        updated_at: refreshed.updated_at ?? null,
        watch_expires_at: refreshed.watch_expires_at ?? null,
        last_sync_at: refreshed.last_sync_at ?? null,
      };
    } catch (error) {
      if (/not connected/i.test(error instanceof Error ? error.message : "")) {
        data = null;
      } else {
        throw error;
      }
    }

    return json({
      connected: Boolean(data),
      connection: data || null,
    });
  } catch (e) {
    console.error("google-calendar-connection-status error:", e);
    return json(serializeError(e), 500);
  }
});
