import { describe, expect, it } from "vitest";
import {
  assignRemainingFromRoster,
  attendeeDisplayName,
  extractExplicitSpeakerName,
  labelMicEntries,
  rosterFromAttendees,
  speakerVocabularyHint,
  mergeTranscriptStreams,
  nameTranscriptEntries,
  normalizeMeetingContext,
  parseDiarizedEntries,
  resolveSpeakerNamesFromMeetingUi,
  transcriptEntriesToText,
} from "../../supabase/functions/_shared/meeting-speakers.ts";
import type { MeetingContext, TranscriptEntry } from "../../supabase/functions/_shared/meeting-speakers.ts";

/* ============================================================================
   Can Braino work out who was actually talking?

   The transcription API only ever returns anonymous clusters — "Speaker 1",
   "Speaker 2". Every real name in a set of meeting notes has to come from
   outside the audio: the platform's active-speaker UI, its captions, or a
   sentence where somebody introduces themselves. This exercises the code that
   joins those together, including the timestamp bug that used to make the
   strongest evidence unusable for every segment after the first.
   ========================================================================= */

const context = (over: Partial<MeetingContext> = {}): MeetingContext =>
  normalizeMeetingContext({
    platform: "google-meet",
    platformLabel: "Google Meet",
    ...over,
  });

const entry = (over: Partial<TranscriptEntry> = {}): TranscriptEntry => ({
  speaker: "Speaker 1",
  text: "we should ship on Friday and tell the team",
  startMs: 0,
  endMs: 5000,
  ...over,
});

describe("meeting clock alignment", () => {
  it("lifts a segment's diarizer timestamps onto the meeting clock", () => {
    // The diarizer restarts at 0 for every upload it is given.
    const entries = parseDiarizedEntries(
      { segments: [{ speaker: "A", start: 0, end: 5, text: "morning all" }] },
      300000,
    );
    expect(entries[0].startMs).toBe(300000);
    expect(entries[0].endMs).toBe(305000);
  });

  it("carries segmentStartMs through context normalization", () => {
    expect(context({ segmentStartMs: 300000 }).segmentStartMs).toBe(300000);
    expect(context().segmentStartMs).toBe(0);
  });

  it("merges consecutive turns from one speaker and keeps the outer bounds", () => {
    const entries = parseDiarizedEntries(
      {
        segments: [
          { speaker: "A", start: 0, end: 3, text: "morning all" },
          { speaker: "A", start: 3, end: 6, text: "let us start" },
          { speaker: "B", start: 6, end: 9, text: "sounds good" },
        ],
      },
      0,
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("morning all let us start");
    expect(entries[0].endMs).toBe(6000);
    expect(entries[1].speaker).not.toBe(entries[0].speaker);
  });

  it("only matches the UI timeline once the segment offset is applied", () => {
    // This is the bug that silently disabled speaker naming after the first
    // segment: minute-five audio was compared against a minute-five timeline
    // using minute-zero timestamps, so nothing ever overlapped.
    const ctx = context({
      speakerTimeline: [{ atMs: 299000, untilMs: 306000, name: "Priya" }],
    });

    const aligned = resolveSpeakerNamesFromMeetingUi(
      [entry({ startMs: 300000, endMs: 305000 })],
      ctx,
    );
    expect(aligned[0].speaker).toBe("Priya");

    const unaligned = resolveSpeakerNamesFromMeetingUi(
      [entry({ startMs: 0, endMs: 5000 })],
      ctx,
    );
    expect(unaligned[0].speaker).toBe("Speaker 1");
  });
});

describe("binding clusters to real people", () => {
  it("names a cluster from whoever the platform showed as speaking", () => {
    const named = resolveSpeakerNamesFromMeetingUi(
      [entry()],
      context({ speakerTimeline: [{ atMs: 0, untilMs: 6000, name: "Priya" }] }),
    );
    expect(named[0].speaker).toBe("Priya");
  });

  it("names a cluster from a caption that overlaps in time and matches in wording", () => {
    const named = resolveSpeakerNamesFromMeetingUi(
      [entry()],
      context({
        captionTimeline: [{ atMs: 2000, speaker: "Marcus", text: "we should ship on Friday" }],
      }),
    );
    expect(named[0].speaker).toBe("Marcus");
  });

  it("ignores a caption that only shares a timestamp", () => {
    // Captions drift and overlap constantly. Time alone is not evidence, and
    // treating it as evidence is how the wrong person gets an action item.
    const named = resolveSpeakerNamesFromMeetingUi(
      [entry()],
      context({
        captionTimeline: [{ atMs: 2000, speaker: "Marcus", text: "anyone know a good lunch place nearby" }],
      }),
    );
    expect(named[0].speaker).toBe("Speaker 1");
  });

  it("spends a name only once, so two clusters never become the same person", () => {
    const named = resolveSpeakerNamesFromMeetingUi(
      [
        entry({ speaker: "Speaker 1", startMs: 0, endMs: 10000 }),
        entry({ speaker: "Speaker 2", startMs: 10000, endMs: 12000, text: "agreed on that" }),
      ],
      context({ speakerTimeline: [{ atMs: 0, untilMs: 13000, name: "Priya" }] }),
    );
    expect(named[0].speaker).toBe("Priya");
    expect(named[1].speaker).toBe("Speaker 2");
  });

  it("never reassigns the microphone's own turns", () => {
    // "You" comes from the mic channel, which is the one attribution we know
    // for certain. No amount of UI evidence should be allowed to overwrite it.
    const named = resolveSpeakerNamesFromMeetingUi(
      [entry({ speaker: "You" })],
      context({ speakerTimeline: [{ atMs: 0, untilMs: 6000, name: "Priya" }] }),
    );
    expect(named[0].speaker).toBe("You");
  });

  it("leaves clusters alone when the meeting UI gave us nothing", () => {
    const named = resolveSpeakerNamesFromMeetingUi([entry()], context());
    expect(named[0].speaker).toBe("Speaker 1");
  });
});

describe("the full naming pipeline", () => {
  it("uses the UI first, then lets a self-introduction name whoever is left", () => {
    const named = nameTranscriptEntries(
      [
        entry({ speaker: "Speaker 1", startMs: 0, endMs: 5000 }),
        entry({ speaker: "Speaker 2", startMs: 6000, endMs: 11000, text: "hi, my name is Sowmya and I run design" }),
      ],
      context({ speakerTimeline: [{ atMs: 0, untilMs: 5500, name: "Priya" }] }),
    );
    expect(named.map((row) => row.speaker)).toEqual(["Priya", "Sowmya"]);
  });

  it("collapses neighbouring turns once renaming makes them the same person", () => {
    const named = nameTranscriptEntries(
      [
        entry({ speaker: "Speaker 1", startMs: 0, endMs: 5000, text: "first half" }),
        entry({ speaker: "Priya", startMs: 5000, endMs: 9000, text: "second half" }),
      ],
      context({ speakerTimeline: [{ atMs: 0, untilMs: 5500, name: "Priya" }] }),
    );
    expect(named).toHaveLength(1);
    expect(named[0].text).toBe("first half second half");
    expect(named[0].endMs).toBe(9000);
  });

  it("renders a transcript people can actually read", () => {
    const text = transcriptEntriesToText(
      nameTranscriptEntries(
        [
          entry({ speaker: "You", startMs: 0, endMs: 3000, text: "shall we start" }),
          entry({ speaker: "Speaker 1", startMs: 3000, endMs: 8000, text: "yes, lets go" }),
        ],
        context({ speakerTimeline: [{ atMs: 3000, untilMs: 8000, name: "Marcus" }] }),
      ),
    );
    expect(text).toBe("You: shall we start\nMarcus: yes, lets go");
  });
});

describe("the two streams", () => {
  it("calls the dominant voice on the microphone You", () => {
    const labelled = labelMicEntries([
      entry({ speaker: "Speaker 1", startMs: 0, endMs: 9000, text: "so here is where we are" }),
      entry({ speaker: "Speaker 1", startMs: 20000, endMs: 26000, text: "and that is the plan" }),
    ]);
    expect(labelled.every((row) => row.speaker === "You")).toBe(true);
  });

  it("keeps the room's other voices separate in an in-person meeting", () => {
    // When the call audio is silent, the mic is carrying a whole room. The person who talks
    // most is the one holding the laptop; everyone else is a real participant to be named.
    const labelled = labelMicEntries([
      entry({ speaker: "Speaker 1", startMs: 0, endMs: 12000, text: "let me walk through it" }),
      entry({ speaker: "Speaker 2", startMs: 12000, endMs: 15000, text: "quick question on that" }),
    ]);
    expect(labelled.map((row) => row.speaker)).toEqual(["You", "Speaker 2"]);
  });

  it("leaves an already-named entry alone", () => {
    const labelled = labelMicEntries([entry({ speaker: "Priya", startMs: 0, endMs: 5000 })]);
    expect(labelled[0].speaker).toBe("Priya");
  });

  it("interleaves the call and the microphone back onto one timeline", () => {
    const system = [
      entry({ speaker: "Speaker 1", startMs: 0, endMs: 4000, text: "morning, shall we start" }),
      entry({ speaker: "Speaker 1", startMs: 9000, endMs: 12000, text: "great, then we ship" }),
    ];
    const mic = [entry({ speaker: "You", startMs: 4000, endMs: 9000, text: "yes, I am ready" })];

    const merged = mergeTranscriptStreams([system, mic]);
    expect(merged.map((row) => row.speaker)).toEqual(["Speaker 1", "You", "Speaker 1"]);
    expect(merged.map((row) => row.startMs)).toEqual([0, 4000, 9000]);
  });

  it("drops empty turns rather than punching holes in the transcript", () => {
    const merged = mergeTranscriptStreams([
      [entry({ speaker: "You", startMs: 0, endMs: 2000, text: "   " })],
      [entry({ speaker: "Speaker 1", startMs: 2000, endMs: 5000, text: "on it" })],
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0].speaker).toBe("Speaker 1");
  });

  it("survives a stream that produced nothing at all", () => {
    const merged = mergeTranscriptStreams([[], [entry({ speaker: "You", startMs: 0, endMs: 3000 })]]);
    expect(merged).toHaveLength(1);
    expect(merged[0].speaker).toBe("You");
  });
});

describe("reading a name out of an introduction", () => {
  it("stops at the word where the name ends", () => {
    // Nobody says just their name. Taking the next three words regardless put
    // people called "Sowmya And I" and "Marcus From" into the notes.
    expect(extractExplicitSpeakerName("hi, my name is Sowmya and I run design")).toBe("Sowmya");
    expect(extractExplicitSpeakerName("I'm Marcus from engineering")).toBe("Marcus");
    expect(extractExplicitSpeakerName("this is Sam speaking")).toBe("Sam");
    expect(extractExplicitSpeakerName("my name is Priya, joining from Bangalore")).toBe("Priya");
  });

  it("keeps a genuine multi-word name whole", () => {
    expect(extractExplicitSpeakerName("my name is Priya Nair")).toBe("Priya Nair");
  });

  it("stays quiet when the sentence is not an introduction", () => {
    expect(extractExplicitSpeakerName("I'm great, thanks for asking")).toBe("");
    expect(extractExplicitSpeakerName("shall we start")).toBe("");
  });
});

describe("the guest list", () => {
  it("prefers the name the invite actually carries", () => {
    expect(attendeeDisplayName({ displayName: "Priya Nair", email: "pn@acme.com" })).toBe("Priya Nair");
  });

  it("reads a name out of an address when that is all there is", () => {
    expect(attendeeDisplayName({ email: "marcus.lee@acme.com" })).toBe("Marcus Lee");
    expect(attendeeDisplayName({ email: "priya_nair@acme.com" })).toBe("Priya Nair");
    expect(attendeeDisplayName("mailto:sowmya@acme.com")).toBe("Sowmya");
  });

  it("refuses mailboxes that are not people", () => {
    // A wrong name in the notes is worse than an honest "Speaker 2".
    expect(attendeeDisplayName({ email: "noreply@acme.com" })).toBe("");
    expect(attendeeDisplayName({ email: "team@acme.com" })).toBe("");
    expect(attendeeDisplayName({ email: "x1@acme.com" })).toBe("");
    expect(attendeeDisplayName({ email: "u2@acme.com" })).toBe("");
  });

  it("builds a deduped roster", () => {
    expect(rosterFromAttendees([
      { displayName: "Priya Nair" },
      { email: "priya.nair@acme.com" },
      { email: "marcus.lee@acme.com" },
      { email: "noreply@acme.com" },
    ])).toEqual(["Priya Nair", "Marcus Lee"]);
  });

  it("tells the transcriber how the names are spelled", () => {
    // A name the transcriber mangles is a name no later layer can recover.
    expect(speakerVocabularyHint(context({ participantNames: ["Sowmya", "Marcus Lee"] })))
      .toBe("The speakers in this meeting are: Sowmya, Marcus Lee.");
    expect(speakerVocabularyHint(context())).toBe("");
  });
});

describe("closing the last gap with the roster", () => {
  it("names the one voice left when one invitee has not spoken", () => {
    const named = assignRemainingFromRoster(
      [
        entry({ speaker: "Priya Nair", startMs: 0, endMs: 5000 }),
        entry({ speaker: "Speaker 2", startMs: 5000, endMs: 9000, text: "agreed" }),
      ],
      context({ participantNames: ["Priya Nair", "Marcus Lee"] }),
    );
    expect(named[1].speaker).toBe("Marcus Lee");
  });

  it("refuses to guess when two voices are unaccounted for", () => {
    // Two unknowns and two names is a coin flip, and a coin flip that puts a
    // name on an action item is worse than leaving the voice anonymous.
    const named = assignRemainingFromRoster(
      [
        entry({ speaker: "Speaker 1", startMs: 0, endMs: 5000 }),
        entry({ speaker: "Speaker 2", startMs: 5000, endMs: 9000, text: "agreed" }),
      ],
      context({ participantNames: ["Priya Nair", "Marcus Lee"] }),
    );
    expect(named.map((row) => row.speaker)).toEqual(["Speaker 1", "Speaker 2"]);
  });

  it("refuses to guess when two invitees are still silent", () => {
    const named = assignRemainingFromRoster(
      [entry({ speaker: "Speaker 1", startMs: 0, endMs: 5000 })],
      context({ participantNames: ["Priya Nair", "Marcus Lee", "Sowmya"] }),
    );
    expect(named[0].speaker).toBe("Speaker 1");
  });

  it("does not count You against the guest list", () => {
    const named = assignRemainingFromRoster(
      [
        entry({ speaker: "You", startMs: 0, endMs: 5000 }),
        entry({ speaker: "Speaker 1", startMs: 5000, endMs: 9000, text: "sure" }),
      ],
      context({ participantNames: ["Marcus Lee"] }),
    );
    expect(named[1].speaker).toBe("Marcus Lee");
  });
});

describe("what the page scraped is not automatically a person", () => {
  it("throws away control labels that look like names", () => {
    const ctx = context({
      participantNames: ["Priya Nair", "Turn on captions", "More options", "Microphone"],
    });
    expect(ctx.participantNames).toEqual(["Priya Nair"]);
  });

  it("folds the meeting's own first person into You", () => {
    expect(context({ currentSpeaker: "You" }).currentSpeaker).toBe("You");
    expect(context({ currentSpeaker: "Priya Nair (you)" }).currentSpeaker).toBe("Priya Nair");
  });
});
