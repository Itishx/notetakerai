import ClassPage from "@/components/ClassPage";

/* /iomi — the OS class, in the Hugo layout. Braino stops being an app you open
   and becomes the layer you talk to, named the way an OS names itself. IOMI is
   not an acronym we're unpacking. */
export default function Iomi() {
  return (
    <ClassPage
      accent="ac-amber"
      eyebrow="The OS class"
      desc={<>Braino stops being an app you open and becomes <span className="tone">the layer you talk to.</span> Named the way an operating system names itself.</>}
      name="Iomi"
      face="cls-iomi"
      lead={{
        tag: "What it is",
        title: "The operating system you drive by speaking.",
        body: "On your Mac, in your browser, in the notch. Always one glance away, never in the way. Say it, and watch it happen.",
        stat: { n: "1", label: "glance away" },
      }}
      features={[
        { tag: "Your machine", title: "Runs your Mac.", body: "Organize the desktop, create and move folders, find any file, open anything — and undo every action he takes." },
        { tag: "Your apps", title: "Lives in your apps.", body: "Opens and closes any app by name, writes to Apple Notes, drafts and sends mail, resolving your contacts." },
        { tag: "Your web", title: "Rides your browser.", body: "Reads the live page, pulls what matters, and acts on it — not a screenshot, the real DOM in front of you." },
        { tag: "Voice-first", title: "You just talk.", body: "Hands-free. Say the outcome and he answers in his own voice, then goes and does it." },
      ]}
      cta={{ label: "Meet Iomi", to: "/premium" }}
    />
  );
}
