import { Link } from "react-router-dom";
import SiteFooter from "@/components/SiteFooter";
import IomiNotch from "@/components/IomiNotch";
import "./home-os.css";
import "./journal.css";

export default function YapModeJournal() {
  return (
    <div className="hos jr">
      <IomiNotch />
      <article className="jr-article">
        <header className="jr-art-head">
          <div className="eyebrow">Itish's journal · founder note · July 2026</div>
          <h1 className="jr-title">I loved Wispr Flow, so I built BrainoHERA<span className="fork-dot">.</span></h1>
          <p className="jr-dek">This is not a rivalry post. It is the story of a tool I loved enough to want inside the thing I am building.</p>
        </header>

        <h2>Let me say the obvious part out loud</h2>
        <p>Yes, BrainoHERA is the thing I love Wispr Flow for. I love that product. I have used it enough that pretending I arrived here untouched by it would be bullshit.</p>
        <p>When something helps me that much, my first instinct is not to make a comparison table. It is to ask a much more personal question: why should Braino not be able to help me like this too?</p>

        <blockquote className="jr-pullquote">
          Use Wispr Flow or use BrainoHERA. Truly, it is your wish. The point is to use the thing that helps you get the thought out.
        </blockquote>

        <h2>Why it belongs in Braino</h2>
        <p>Braino already listens. He already lives in the notch. He is already there while I write, build, reply, and change my mind. Making me leave that flow, open a separate place, and then bring the words back would miss the whole point of him.</p>
        <p>So I gave him one very clear lane. Double Option wakes BrainoHERA. I speak. He turns it into readable text at the cursor. Double Option stops him again. He does not answer, perform, or try to be clever in the middle.</p>

        <h2>The part that is special to me</h2>
        <p>I can now use Braino to speak the prompts, notes, and corrections that build the next version of Braino. The thing I spent all this time making can help me make itself. I know that sounds a little circular. I love that it is circular.</p>
        <p>That is why this deserved more than a line in a changelog. Wispr Flow showed me how freeing this kind of interaction can feel. BrainoHERA is me bringing that feeling home, into Braino, in the way that makes sense for what he is becoming.</p>

        <div className="jr-next">
          <Link to="/journal/yap-mode-update" className="qa-link">Braino's note: how BrainoHERA works</Link>
          <Link to="/journal" className="qa-link">Back to the Journal</Link>
        </div>
      </article>
      <SiteFooter />
    </div>
  );
}
