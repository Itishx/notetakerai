// "My favourite song right now" from what he has heard you play (5 Oct).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const main = readFileSync(new URL("../mac/braino-mac/main.cjs", import.meta.url), "utf8");
const fn = readFileSync(new URL("../supabase/functions/spotify/spotify-player-state/index.ts", import.meta.url), "utf8");
const scopes = readFileSync(new URL("../supabase/functions/spotify/spotify-oauth-start/index.ts", import.meta.url), "utf8");

test("listening questions go to listening history, not now-playing", () => {
  const re = eval(main.match(/const LISTENING_ASK_RE = (\/.*\/i);/)[1]);
  for (const t of ["what do you think is my favorite song right now on Spotify", "play my favourite song", "play the song I played last night", "what was I listening to yesterday"]) assert.ok(re.test(t), t);
  for (const t of ["play Billie Jean", "what song is this"]) assert.ok(!re.test(t), t);
  assert.match(main, /if \(LISTENING_ASK_RE\.test\(String\(raw \|\| ""\)\)\) return listeningTaste\(String\(raw \|\| ""\)\);/);
});

test("most played is counted from the plays the activity log keeps", () => {
  const src = main.slice(main.indexOf("function topLocal"), main.indexOf("\nconst LISTENING_ASK_RE"));
  const topLocal = Function(`${src}; return topLocal;`)();
  const plays = [{ track: "Qasme", artist: "rohh" }, { track: "Brabus" }, { track: "Qasme", artist: "rohh" }];
  assert.equal(topLocal(plays)[0].track, "Qasme");
  assert.equal(topLocal(plays)[0].n, 2);
});

test("Spotify gives top tracks and recent plays, with the scopes asked for", () => {
  assert.match(fn, /if \(body\?\.view === "taste"\)/);
  assert.match(fn, /me\/top\/tracks\?time_range=short_term/);
  assert.match(fn, /me\/player\/recently-played/);
  assert.match(scopes, /"user-top-read",/);
  assert.match(scopes, /"user-read-recently-played",/);
});
