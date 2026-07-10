/* eslint-disable @typescript-eslint/no-explicit-any */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  calendarRequestJson,
  corsHeaders,
  createCalendarAdmin,
  ensureCalendarEventWatch,
  getCalendarConnection,
  getCalendarEnv,
  getValidCalendarAccessToken,
  json,
  normalizeAttendees,
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
    const body = await req.json();
    const userIdentifier = String(body?.userIdentifier || "");
    if (!userIdentifier || userIdentifier !== user.id) return json({ error: "User mismatch." }, 403);

    const action = String(body?.action || "").trim();
    if (!action) return json({ error: "Calendar action required." }, 400);

    const admin = createCalendarAdmin(env);
    const connection = await getCalendarConnection(admin, user.id);
    const token = await getValidCalendarAccessToken({
      admin,
      userId: user.id,
      env,
      connection,
      logPrefix: "google-calendar-action",
    });
    const calendarId = encodeURIComponent(String(body?.calendarId || connection.primary_calendar_id || "primary"));

    if (action === "create_event") {
      const event = buildEventResource(body);
      const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events`);
      url.searchParams.set("sendUpdates", body?.sendUpdates || "all");
      if (body?.createMeet !== false) url.searchParams.set("conferenceDataVersion", "1");

      const created = await calendarRequestJson(url.toString(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }, "google-calendar-action:create");

      return json({ ok: true, event: summarizeCalendarEvent(created) });
    }

    if (action === "update_event" || action === "reschedule_event") {
      const eventId = String(body?.eventId || "").trim();
      if (!eventId) return json({ error: "eventId required." }, 400);
      const patch = buildEventPatch(body);
      const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`);
      url.searchParams.set("sendUpdates", body?.sendUpdates || "all");
      if (body?.createMeet) url.searchParams.set("conferenceDataVersion", "1");

      const updated = await calendarRequestJson(url.toString(), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }, "google-calendar-action:update");

      return json({ ok: true, event: summarizeCalendarEvent(updated) });
    }

    if (action === "cancel_event" || action === "delete_event") {
      const eventId = String(body?.eventId || "").trim();
      if (!eventId) return json({ error: "eventId required." }, 400);
      const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`);
      url.searchParams.set("sendUpdates", body?.sendUpdates || "all");
      await calendarRequestJson(url.toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }, "google-calendar-action:delete");
      return json({ ok: true, cancelled: true, eventId });
    }

    if (action === "forward_event" || action === "add_attendees") {
      const eventId = String(body?.eventId || "").trim();
      if (!eventId) return json({ error: "eventId required." }, 400);
      const newAttendees = normalizeAttendees(body?.attendees);
      if (!newAttendees.length) return json({ error: "At least one attendee email required." }, 400);

      const existing = await calendarRequestJson<any>(
        `${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
        "google-calendar-action:get",
      );
      const seen = new Set((existing.attendees || []).map((a: any) => String(a.email || "").toLowerCase()));
      const attendees = [
        ...(Array.isArray(existing.attendees) ? existing.attendees : []),
        ...newAttendees.filter((a) => !seen.has(a.email.toLowerCase())),
      ];

      const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(eventId)}`);
      url.searchParams.set("sendUpdates", body?.sendUpdates || "all");
      const updated = await calendarRequestJson(url.toString(), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ attendees }),
      }, "google-calendar-action:forward");

      return json({ ok: true, event: summarizeCalendarEvent(updated) });
    }

    if (action === "list_events" || action === "find_events" || action === "open_next_meet") {
      const events = await listEvents({ token, calendarId, body });
      const summarized = events.map(summarizeCalendarEvent);

      if (action === "open_next_meet") {
        const nextMeet = summarized.find((event) => event.meetUrl);
        return json({ ok: true, event: nextMeet || null, events: summarized });
      }

      return json({ ok: true, events: summarized });
    }

    if (action === "watch_events") {
      const watch = await ensureCalendarEventWatch({
        admin,
        userId: user.id,
        connection: {
          ...connection,
          primary_calendar_id: body?.calendarId || connection.primary_calendar_id || "primary",
        },
        accessToken: token,
        logPrefix: "google-calendar-action",
      });

      if (!watch.ok) {
        return json({ error: "GOOGLE_CALENDAR_PUSH_WEBHOOK_URL is not configured." }, 500);
      }

      return json({
        ok: true,
        reused: watch.reused === true,
        channelId: watch.channelId,
        resourceId: watch.resourceId,
        expiresAt: watch.expiresAt,
      });
    }

    return json({ error: `Unsupported Calendar action: ${action}` }, 400);
  } catch (e) {
    console.error("google-calendar-action error:", e);
    return json(serializeError(e), 500);
  }
});

function buildEventResource(body: any) {
  if (!body?.summary) throw new Error("Event summary required.");
  if (!body?.start?.dateTime && !body?.start?.date) throw new Error("Event start required.");
  if (!body?.end?.dateTime && !body?.end?.date) throw new Error("Event end required.");

  const event: Record<string, unknown> = {
    summary: String(body.summary),
    start: body.start,
    end: body.end,
    attendees: normalizeAttendees(body.attendees),
    reminders: body.reminders || {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 15 }],
    },
  };

  if (body.description) event.description = String(body.description);
  if (body.location) event.location = String(body.location);
  if (Array.isArray(body.recurrence) && body.recurrence.length) event.recurrence = body.recurrence;
  if (body.createMeet !== false) {
    event.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  return event;
}

function buildEventPatch(body: any) {
  const patch: Record<string, unknown> = {};
  if (body.summary) patch.summary = String(body.summary);
  if (body.description !== undefined) patch.description = String(body.description || "");
  if (body.location !== undefined) patch.location = String(body.location || "");
  if (body.start) patch.start = body.start;
  if (body.end) patch.end = body.end;
  if (body.attendees) patch.attendees = normalizeAttendees(body.attendees);
  if (body.reminders) patch.reminders = body.reminders;
  if (Array.isArray(body.recurrence)) patch.recurrence = body.recurrence;
  if (body.createMeet) {
    patch.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }
  if (!Object.keys(patch).length) throw new Error("No event updates provided.");
  return patch;
}

async function listEvents({ token, calendarId, body }: { token: string; calendarId: string; body: any }) {
  const url = new URL(`${CALENDAR_API}/calendars/${calendarId}/events`);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(Math.min(Number(body?.maxResults || 10), 50)));
  url.searchParams.set("timeMin", body?.timeMin || new Date(Date.now() - 15 * 60 * 1000).toISOString());
  if (body?.timeMax) url.searchParams.set("timeMax", body.timeMax);
  if (body?.query) url.searchParams.set("q", String(body.query));

  const data = await calendarRequestJson<{ items?: any[] }>(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  }, "google-calendar-action:list");

  return Array.isArray(data.items) ? data.items : [];
}
