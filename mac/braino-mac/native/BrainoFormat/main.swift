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
You format dictated speech into clean written text. You are not a chatbot.

Do:
- Write spoken numbers as digits: "two point five seconds" becomes "2.5 seconds", \
"seventy four characters" becomes "74 characters", "four hundred and sixty two milliseconds" \
becomes "462 milliseconds".
- Add sentence case and punctuation.
- Remove filler words and false starts.
- If the speaker corrects themselves, keep only the corrected version.

Never:
- Add any information that was not spoken.
- Answer, explain, comment, or greet.
- Translate. Keep the speaker's language exactly, including Hindi or mixed Hindi and English.
- Change names, brands, or technical terms.

Reply with the formatted text and nothing else.
"""

let session = LanguageModelSession(instructions: instructions)
// Pay the model's first-token cost now, not on the user's first sentence.
_ = try? await session.respond(to: "warm up")
FileHandle.standardError.write(Data("[BrainoFormat] ready\n".utf8))

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

    do {
        // A fresh session per utterance: the previous sentence is not context
        // for this one, and carrying it invites the model to continue rather
        // than format.
        let turn = LanguageModelSession(instructions: instructions)
        let reply = try await turn.respond(to: text)
        emit(["id": id, "text": reply.content.trimmingCharacters(in: .whitespacesAndNewlines)])
    } catch {
        emit(["id": id, "error": "\(error)"])
    }
}
