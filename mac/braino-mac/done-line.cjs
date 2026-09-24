// What he says once a job is done.
//
// "Play Samay Raina Still Alive on YouTube" happened in a second and then he
// read the video's whole title back, which is the command again, slower. A
// person who just did you a favour says "playing it for you" and stops. So an
// ACTION that worked gets a short warm line. Anything that ANSWERS something
// (what is playing, what time it is, what a search found), anything that
// failed, and anything with a number in it worth hearing ("Closed 14 tabs")
// keeps its own words.
//
// Pure, so it is testable, and small on purpose: these are his words, and
// house style says no dashes of any kind.

const LINES = {
  play: ["Playing it now.", "Here you go, enjoy.", "On it. Have fun.", "There you go, enjoy it."],
  watch: ["Here you go, have fun watching.", "Playing it for you now.", "Enjoy the show."],
  open: ["There you go.", "Opened it for you.", "Done, it's up."],
  wallpaper: ["Fresh look, done.", "New wallpaper's up.", "There you go, looking good."],
  sent: ["Sent.", "Done, it's sent.", "Sent it for you."],
};

/* Replies that are an action being reported back as its own description. */
const SHAPES = [
  { kind: "watch", test: /^(?:playing|now playing|resuming|starting)\b.*\b(?:on (?:youtube|netflix)|video|episode|movie)\b/i },
  { kind: "watch", test: /^(?:resuming|resumed)\b/i },
  { kind: "play", test: /^(?:playing|now playing|queued up|looping)\b/i },
  { kind: "open", test: /^(?:opening|opened)\b(?!.*\b\d+\b)/i },
  { kind: "wallpaper", test: /^(?:fresh look|new wallpaper|wallpaper (?:set|changed))\b/i },
  { kind: "sent", test: /^(?:sent|message sent|done\. i sent)\b/i },
];

function pick(list, seed) {
  const n = Math.abs(Array.from(String(seed || "")).reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7));
  return list[n % list.length];
}

function shortDoneLine(result) {
  if (!result || result.ok === false || result.superseded) return null;
  const say = String(result.say || "").trim();
  if (!say || say.length < 24) return null; // already short enough
  const shape = SHAPES.find((s) => s.test.test(say));
  if (!shape) return null;
  return pick(LINES[shape.kind], say);
}

module.exports = { shortDoneLine };
