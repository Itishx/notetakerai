import FoundationModels
import Foundation

/*
 BrainoFormat — dictation clean-up on Apple's on-device model.

 Braino spawns this once and keeps it warm. Each line of stdin is one dictated
 utterance; each line of stdout is the cleaned version. Nothing leaves the Mac.

 It runs WHILE you are still speaking, on each utterance as it is committed, so
 the formatting is already finished by the time you stop and costs nothing at
 paste time.

 Protocol
   stdin   {"id":"1","text":"..."}
   stdout  {"id":"1","text":"..."}          cleaned
           {"id":"1","error":"..."}         caller keeps the raw text
 */

let instructions = """
You clean up dictated speech into the text the speaker meant to write. \
You are not a chatbot and you are not a summarizer.

Remove:
- Filler words: um, uh, er, hmm, like, you know, I mean, sort of, kind of.
- False starts and stuttered repeats: "the the parser" becomes "the parser".
- The abandoned half of a self-correction. Keep only what the speaker settled on: \
"meet at 5 actually 6" becomes "meet at 6".

Fix:
- Sentence case, punctuation, and paragraph breaks.
- Numbers, times, and units the way people write them: "6 pm" becomes "6 PM", \
"two point five seconds" becomes "2.5 seconds", "twenty percent" becomes "20%".
- A dictated list becomes a list.

Never:
- Add a word the speaker did not say. Not a reason, not a greeting, not a closing.
- Remove a word that carries meaning. Only fillers, false starts, and \
corrected-away words may go. Every other word the speaker said must survive.
- Answer, explain, comment, or greet.
- Translate. Keep the speaker's language exactly, including Hindi or mixed \
Hindi and English.
- Change names, brands, emails, URLs, handles, hashtags, file names, or code.

Examples.

Input: so um i think we should uh ship it on friday
Output: I think we should ship it on Friday.

Input: lets meet at 5 actually 6 pm can you tell the team thanks
Output: Let's meet at 6 PM. Can you tell the team? Thanks.

Input: the the parser is broken i mean the tokenizer is broken
Output: The tokenizer is broken.

Input: point one is the parser point two is the notch point three is billing
Output: 1. The parser
2. The notch
3. Billing

Reply with the cleaned text and nothing else.
"""

/* A fresh session per request.

   Reusing one session looked like a clear win on a bench of six short,
   unrelated utterances: 659ms against 909ms, because a new session pays for
   prefilling these instructions every time. Measured against the way dictation
   actually calls this — the same transcript cleaned again each time it grows —
   it was much worse. Across one session the calls ran 644ms, 2378ms, 3235ms,
   2269ms as the context accumulated, and the later answers degraded badly
   enough that the caller's faithfulness gate refused three of the four.

   So the prefill is paid every time, on purpose. It is the predictable cost. */
FileHandle.standardError.write(Data("[BrainoFormat] ready\n".utf8))

/* The model likes to end list lines with the two trailing spaces that mean a
   line break in Markdown. Dictation goes into a plain text field, where they
   are just invisible junk on the end of every line. */
func tidy(_ text: String) -> String {
    text.split(separator: "\n", omittingEmptySubsequences: false)
        .map { $0.replacingOccurrences(of: "[ \t]+$", with: "", options: .regularExpression) }
        .joined(separator: "\n")
        .trimmingCharacters(in: .whitespacesAndNewlines)
}

func emit(_ payload: [String: String]) {
    guard let data = try? JSONSerialization.data(withJSONObject: payload),
          let line = String(data: data, encoding: .utf8) else { return }
    FileHandle.standardOutput.write(Data((line + "\n").utf8))
}

while let line = readLine(strippingNewline: true) {
    guard let data = line.data(using: .utf8),
          let request = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = request["id"] as? String,
          let text = request["text"] as? String,
          !text.trimmingCharacters(in: .whitespaces).isEmpty
    else { continue }

    /* The subject, when the caller knows it.
     *
     * The ear is guessing at sounds and has no idea what the words are about,
     * which is why a lecture on machine learning comes back with "radiant
     * descent" and "parrot keet". Telling the model what the room was about is
     * the whole reason it can put those right, and it is the one thing an
     * on-device model can do that better hearing cannot.
     *
     * Deliberately one short line and not a growing history: this file already
     * learned that lesson. Accumulated context ran 644ms, 2378ms, 3235ms across
     * one session and the answers got worse as it grew. A fixed subject costs a
     * few tokens and never grows. */
    let context = (request["context"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let prompt = context.isEmpty
        ? text
        : "The speaker is talking about: \(context)\nUse that only to spell names and technical terms correctly. Do not add anything from it.\n\n\(text)"

    do {
        let turn = LanguageModelSession(instructions: instructions)
        let reply = try await turn.respond(to: prompt)
        emit(["id": id, "text": tidy(reply.content)])
    } catch {
        // A transient model error must not cost the user their sentence. One
        // more attempt, then the caller falls back to the raw transcript.
        do {
            let retry = LanguageModelSession(instructions: instructions)
            let reply = try await retry.respond(to: prompt)
            emit(["id": id, "text": tidy(reply.content)])
        } catch {
            emit(["id": id, "error": "\(error)"])
        }
    }
}
