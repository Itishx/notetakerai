---
name: google-maps
description: Use this skill when Braino needs to look up places or addresses, recommend nearby locations, compare distance or travel time, get directions, open Google Maps, or send/ping a place or route to the user's phone.
---

# Google Maps Skill

Use this skill for location lookup, distance/ETA checks, place recommendations, directions, and phone handoff.

## Core Capabilities

- Look up a specific place, address, landmark, business, or area.
- Recommend 3-5 places that match the user's need, location, timing, budget, rating, or vibe.
- Calculate distance and travel time from an origin to one or more destinations.
- Open Google Maps visibly in the browser and perform the search/directions flow in front of the user.
- Ping the selected place or route to the user's phone when a phone handoff channel exists.

## Google Maps APIs

- Use Places API / Places Library for place search, recommendations, ratings, opening hours, address, photos, and business details.
- Use Geocoding API to convert user-entered addresses, landmarks, or areas into coordinates and to normalize ambiguous place names.
- Use Routes API for distance, ETA, travel mode, route alternatives, and traffic-aware directions.
- Use Maps URLs for cross-platform handoff to Google Maps search, place pages, and directions.

## Workflow

1. Parse the request into intent: `lookup`, `recommend`, `distance`, `directions`, or `send_to_phone`.
2. Extract place/category, destination, origin, city/area, travel mode, time, budget, rating, and constraints.
3. If distance or directions need an origin and none is available, ask one short question for the starting point.
4. For recommendations, search using the user's area first, then rank by relevance, distance/ETA, rating, open status, and stated constraints.
5. For distance/ETA, resolve origin and destination, then compute route distance and travel time using the requested travel mode.
6. Open Google Maps visibly unless the user explicitly says not to open it.
7. Return useful results after the visible Maps page/search has loaded.
8. For phone handoff, send place name, address, Google Maps URL, distance/ETA, and one-line reason if a configured channel exists.
9. If no phone handoff channel exists, be honest: say phone ping is not set up yet and provide the Maps URL instead. Never claim it was sent.

## Visible Google Maps Behavior

- For place lookup or recommendations, navigate the active browser tab to `https://www.google.com/maps/search/{query}`.
- For directions, navigate the active browser tab to `https://www.google.com/maps/dir/{origin}/{destination}`.
- URL-encode spaces as `+` or `%20`.
- Use the live Maps page as the visible source of truth: let the user see the search/results/directions happen.
- Use API data only to enrich ranking, distance, and details; do not hide the Maps action in the background.
- If the user asks for a quick answer only, answer without opening Maps only when they clearly say "don't open Maps", "just tell me", or similar.

## Phone Handoff Rules

- If the user says "send it to my phone", "ping this to my phone", or similar, treat that as permission to send the selected result.
- If there are multiple results and the user has not chosen one, ask which one to send.
- Prefer a Google Maps URL because it opens on Android, iOS, and web.
- Do not send private location context to a phone channel unless the user asked for the handoff.

## Output Format

For recommendations:

```markdown
## Places I found near {area}

1. **{Name}** - {distance/ETA if available}
   {Short reason it fits}
   Address: {address}
   Rating: {rating/open status if available}
   Maps: {url}

Best pick: {one honest recommendation and why}
```

For distance or directions:

```markdown
{Destination} is about {distance} from {origin}.
ETA by {mode}: {duration}
Maps: {url}
```

For phone handoff:

```markdown
Sent to your phone: {name or route}
Maps: {url}
```

## Quality Rules

- Do not invent ratings, hours, distance, ETA, or whether a place is open.
- If live Maps API data is unavailable, say so and fall back to a Maps URL or browser search.
- Prefer currently open places when the user says "now", "today", "tonight", or asks for immediate plans.
- Respect dietary, budget, accessibility, safety, and travel-mode constraints.
- If a place name or city is ambiguous, ask one short clarification instead of guessing.

## Example Triggers

- "Find good cafes near me and send the best one to my phone."
- "How far is Hyderabad airport from Gachibowli?"
- "Recommend dinner places in Bandra under 1500."
- "Open directions to Cubbon Park."
- "Ping this route to my phone."
