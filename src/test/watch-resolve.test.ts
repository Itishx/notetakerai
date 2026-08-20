import { describe, expect, it } from "vitest";
import {
  parseSpoken,
  platformKey,
  toPlayerUrl,
} from "../../supabase/functions/_shared/watch-resolve";

/* The parser is the only part of watch-resolve that runs without a network, and
   it is the part most likely to be quietly wrong: a mis-parse does not throw,
   it just plays the wrong thing. Everything below is a sentence somebody would
   actually say out loud. */
describe("parseSpoken", () => {
  it("pulls the title out of a plain request", () => {
    expect(parseSpoken("play the shawshank redemption").query).toBe("the shawshank redemption");
  });

  it("strips the wake word and the politeness", () => {
    const p = parseSpoken("Hey Braino, can you please play Inception on Netflix");
    expect(p.query).toBe("Inception");
    expect(p.platform).toBe("netflix");
  });

  it("reads season and episode, and infers it is a show", () => {
    const p = parseSpoken("play Stranger Things season 2 episode 5 on Netflix");
    expect(p.query).toBe("Stranger Things");
    expect(p.season).toBe(2);
    expect(p.episode).toBe(5);
    expect(p.kind).toBe("tv");
    expect(p.platform).toBe("netflix");
  });

  it("reads the shorthand people actually speak", () => {
    const p = parseSpoken("put on The Boys s3 e4 on prime video");
    expect(p.query).toBe("The Boys");
    expect(p.season).toBe(3);
    expect(p.episode).toBe(4);
    expect(p.platform).toBe("prime video");
  });

  it("takes a season with no episode", () => {
    const p = parseSpoken("watch Severance season 2");
    expect(p.query).toBe("Severance");
    expect(p.season).toBe(2);
    expect(p.episode).toBeUndefined();
    expect(p.kind).toBe("tv");
  });

  /* "prime video" has to beat "prime", and the longer Disney brands have to
     beat the shorter ones, or the title keeps a stray word glued to it. */
  it("prefers the longest platform name that matches", () => {
    /* Which alias won does not matter — both land in the same bucket. What
       matters is that the whole platform phrase left the title behind. */
    const prime = parseSpoken("play Fallout on amazon prime video");
    expect(prime.query).toBe("Fallout");
    expect(platformKey(prime.platform!)).toBe("prime");

    const disney = parseSpoken("play Kalki on disney plus hotstar");
    expect(disney.query).toBe("Kalki");
    expect(platformKey(disney.platform!)).toBe("disney");
  });

  it("leaves the title alone when no platform is named", () => {
    const p = parseSpoken("play Dune Part Two");
    expect(p.query).toBe("Dune Part Two");
    expect(p.platform).toBeUndefined();
  });

  it("does not eat a title that merely contains a platform word", () => {
    expect(parseSpoken("play The Amazon").query).toBe("The Amazon");
  });

  it("survives trailing punctuation and doubled spaces", () => {
    expect(parseSpoken("Braino, play  Heat  on netflix.").query).toBe("Heat");
  });
});

describe("platformKey", () => {
  it("maps the things people say to one bucket", () => {
    expect(platformKey("netflix")).toBe("netflix");
    expect(platformKey("prime video")).toBe("prime");
    expect(platformKey("Amazon Prime Video")).toBe("prime");
    expect(platformKey("apple tv+")).toBe("apple");
  });

  it("returns null for nothing and for noise", () => {
    expect(platformKey("")).toBeNull();
    expect(platformKey("blockbuster")).toBeNull();
  });
});

/* The one URL rewrite in the codebase. Netflix serves the same id at /title/
   (a page you then click) and /watch/ (the player, already running), so this is
   what turns "opened Netflix" into "it is playing". */
describe("toPlayerUrl", () => {
  it("rewrites a Netflix title page into the player", () => {
    const r = toPlayerUrl("Netflix", "https://www.netflix.com/title/70005379");
    expect(r.url).toBe("https://www.netflix.com/watch/70005379");
    expect(r.autoplays).toBe(true);
  });

  it("handles a locale segment in the path", () => {
    const r = toPlayerUrl("Netflix", "https://www.netflix.com/in-en/title/80057281");
    expect(r.url).toBe("https://www.netflix.com/watch/80057281");
  });

  it("leaves an already-playable Netflix link alone", () => {
    const r = toPlayerUrl("Netflix", "https://www.netflix.com/watch/80057281");
    expect(r.url).toBe("https://www.netflix.com/watch/80057281");
    expect(r.autoplays).toBe(true);
  });

  /* Guessing URL shapes for platforms whose format is unverified is how you
     ship a link that 404s in somebody's living room. Pass them through. */
  it("does not invent a player URL for other platforms", () => {
    const url = "https://www.primevideo.com/detail/0GLPCH5W0S3RQ2NPPZQ0RS2G0Y";
    const r = toPlayerUrl("Amazon Prime Video", url);
    expect(r.url).toBe(url);
    expect(r.autoplays).toBe(false);
  });
});
