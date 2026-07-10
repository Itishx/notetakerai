import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  buildCalendarOAuthState,
  corsHeaders,
  getCalendarEnv,
  getCalendarOAuthEnv,
  json,
  requireAuthedCalendarUser,
  serializeError,
} from "../../_shared/google-calendar.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const calendarEnv = getCalendarEnv(req);
    const user = await requireAuthedCalendarUser(req, calendarEnv);
    const { userIdentifier } = await req.json();
    if (!userIdentifier) return json({ error: "userIdentifier required" }, 400);
    if (userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);

    const env = getCalendarOAuthEnv();
    const state = await buildCalendarOAuthState(user.id, env.serviceRoleKey);
    const scope = [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "openid",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: env.clientId,
      redirect_uri: env.redirectUri,
      response_type: "code",
      scope,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return json({ authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
  } catch (e) {
    console.error("google-calendar-oauth-start error:", e);
    return json(serializeError(e), 500);
  }
});
