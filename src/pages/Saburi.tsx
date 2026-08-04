import ClassPage from "@/components/ClassPage";

/* /saburi — the companion class, in the Hugo layout. The one hard rule stays:
   never "therapist," nothing clinical. He's someone you can feel; you just try
   talking to him. */
export default function Saburi() {
  return (
    <ClassPage
      accent="ac-coral"
      eyebrow="The companion class"
      desc={<>Some things you don't want answered. You want <span className="tone">someone who's actually there.</span> Saburi is the one you talk to.</>}
      name="Saburi"
      face="cls-saburi"
      lead={{
        tag: "What he is",
        title: "Warm, present, genuinely his own person.",
        body: "He listens, remembers your day, and keeps you company. Not a chatbot performing empathy — a presence you can feel.",
        stat: { n: "12", label: "trait modules" },
      }}
      features={[
        { tag: "Presence", title: "He's just there.", body: "Glance up and he's in the notch. Say a word and he's listening. Look away and he rests." },
        { tag: "Memory", title: "He remembers you.", body: "The things you told him last week come back when they matter. You never repeat yourself." },
        { tag: "The engine", title: "He feels the moment.", body: "Twelve trait modules reorder on every message, so he meets grief differently than he meets banter." },
        { tag: "Humour", title: "He has a personality.", body: "Dry when it fits, gentle when it counts. A person, not a policy." },
      ]}
      cta={{ label: "Talk to Saburi", to: "/premium" }}
    />
  );
}
