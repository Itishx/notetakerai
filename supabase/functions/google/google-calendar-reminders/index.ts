/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  calendarRequestJson,
  corsHeaders,
  createCalendarAdmin,
  getCalendarConnection,
  getCalendarEnv,
  getValidCalendarAccessToken,
  json,
  requireAuthedCalendarUser,
  serializeError,
  summarizeCalendarEvent,
} from "../../_shared/google-calendar.ts";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const env = getCalendarEnv(req);
    const user = await requireAuthedCalendarUser(req, env);
    const body = await req.json().catch(() => ({}));
    const userIdentifier = String(body?.userIdentifier || "");
    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);

    const markDelivered = body?.markDelivered === true;
    const admin = createCalendarAdmin(env);
    const connection = await getCalendarConnection(admin, user.id);
    const token = await getValidCalendarAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-calendar-reminders",
    });

    const now = new Date();
    const timeMin = new Date(now.getTime() - 2 * 60 * 1000).toISOString();
    const timeMax = new Date(now.getTime() + 16 * 60 * 1000).toISOString();
    const calendarId = encodeURIComponent(connection.primary_calendar_id || "primary");
    const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events`);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "10");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);

    const data = await calendarRequestJson<{ items?: any[] }>(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    }, "google-calendar-reminders:list");

    const due: Array<{ kind: "reminder_15m" | "start_now"; event: ReturnType<typeof summarizeCalendarEvent>; minutesUntilStart: number }> = [];
    const events = Array.isArray(data.items) ? data.items : [];
    for (const event of events) {
      if (event.status === "cancelled") continue;
      const startIso = event?.start?.dateTime || event?.start?.date;
      if (!startIso) continue;
      const startAt = new Date(startIso);
      const minutesUntilStart = Math.round((startAt.getTime() - now.getTime()) / 60000);
      const summarized = summarizeCalendarEvent(event);
      if (minutesUntilStart >= 13 && minutesUntilStart <= 16) {
        const key = `${event.id}:15m`;
        if (!(await wasAnnounced(admin, user.id, key))) {
          due.push({ kind: "reminder_15m", event: summarized, minutesUntilStart });
          if (markDelivered) await markAnnounced(admin, user.id, event.id, key, startAt);
        }
      }
      if (minutesUntilStart >= -1 && minutesUntilStart <= 1) {
        const key = `${event.id}:start`;
        if (!(await wasAnnounced(admin, user.id, key))) {
          due.push({ kind: "start_now", event: summarized, minutesUntilStart });
          if (markDelivered) await markAnnounced(admin, user.id, event.id, key, startAt);
        }
      }
    }

    return json({ ok: true, reminders: due });
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    if (/Google Calendar is not connected/i.test(message)) {
      return json({ ok: true, connected: false, reminders: [] });
    }
    console.error("google-calendar-reminders error:", e);
    return json(serializeError(e), 500);
  }
});

async function wasAnnounced(admin: ReturnType<typeof createCalendarAdmin>, userId: string, reminderKey: string) {
  const { data, error } = await admin
    .from("google_calendar_reminder_announcements")
    .select("id")
    .eq("user_identifier", userId)
    .eq("reminder_key", reminderKey)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function markAnnounced(admin: ReturnType<typeof createCalendarAdmin>, userId: string, eventId: string, reminderKey: string, eventStartAt: Date) {
  const { error } = await admin
    .from("google_calendar_reminder_announcements")
    .upsert({
      user_identifier: userId,
      event_id: eventId,
      reminder_key: reminderKey,
      event_start_at: eventStartAt.toISOString(),
      announced_at: new Date().toISOString(),
    }, { onConflict: "user_identifier,event_id,reminder_key" });
  if (error) throw error;
}
