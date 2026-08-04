import ClassPage from "@/components/ClassPage";

/* /telos — the agent class, in the Hugo layout. Telos: the end a thing is aimed
   at. The doing class — say the outcome, he drives to get there. The four modes
   ride the bento carousel. */
export default function Telos() {
  return (
    <ClassPage
      accent="ac-blue"
      eyebrow="The agent class"
      desc={<>You don't chat with Telos. You <span className="tone">point it at a goal.</span> Say the outcome; it does the clicking.</>}
      name="Telos"
      face="cls-telos"
      lead={{
        tag: "What it does",
        title: "Say what you want. Watch it happen.",
        body: "Describe the outcome and he drives the browser to get there — clicking, typing, navigating, about a second per step.",
        stat: { n: "IV", label: "modes" },
      }}
      features={[
        { num: "I", title: "Chat with Page", body: "Highlight anything, or just ask. He reads the live DOM, not a screenshot, so the answer is about what's literally in front of you." },
        { num: "II", title: "Record & Capture", body: "One tap turns a two-hour lecture or a messy video into clean, structured notes, headings and all." },
        { num: "III", title: "Meetings", body: "He sits in on the call, captures every word, and writes the recap the moment it ends." },
        { num: "IV", title: "Delegate Tasks", body: "Describe the outcome. He drives the browser to get there, clicking and typing, about a second per step." },
      ]}
      cta={{ label: "Meet Telos", to: "/premium" }}
    />
  );
}
