/* AffectiveOS, drawn four ways (2026-10-02). Shows the idea only: you speak;
   senses, voice and hands act; memory keeps it; all on the Mac you own. */

const PARTS = [
  { k: "Senses", t: "Sees and hears", p: "The screen you are on, and you." },
  { k: "Voice", t: "Talks back", p: "Out loud. Stops when you cut in." },
  { k: "Hands", t: "Does the work", p: "In the apps you already use." },
];

/* A · Layers: a stack, top to bottom. */
export function AosLayers() {
  return (
    <figure className="osd aff-reveal" aria-label="AffectiveOS as layers.">
      <div className="osd-you"><span className="osd-k">You</span><p>&ldquo;Send John the deck from last week.&rdquo;</p></div>
      <div className="osd-link" aria-hidden="true"><i /></div>
      <div className="osd-row">
        {PARTS.map((d) => (
          <div className="osd-box" key={d.k}><span className="osd-k">{d.k}</span><h3>{d.t}</h3><p>{d.p}</p></div>
        ))}
      </div>
      <div className="osd-link osd-link-3" aria-hidden="true"><i /><i /><i /></div>
      <div className="osd-mem">
        <span className="osd-k">Memory · the continuity layer</span>
        <h3>Everything lands here and stays.</h3>
        <p>What it heard, said and did, kept on your Mac. And nothing is bought, sent, posted or deleted until you say yes.</p>
      </div>
      <div className="osd-base"><span>The Mac you already own</span><span className="osd-apps">WhatsApp · Mail · Chrome · Finder · Calendar · Spotify</span></div>
    </figure>
  );
}

/* B · Orbit: you at the centre, the three around you, memory as the ring
   that holds them, the Mac as the frame. */
export function AosOrbit() {
  const pts = [[300, 100], [500, 404], [100, 404]];
  return (
    <figure className="aod aod-orbit" aria-label="AffectiveOS as an orbit around you.">
      <svg viewBox="0 0 600 520" role="img">
        <rect x="6" y="6" width="588" height="508" className="aod-frame" />
        <text x="24" y="34" className="aod-k">THE MAC YOU ALREADY OWN</text>
        <circle cx="300" cy="300" r="190" className="aod-ring" />
        <circle cx="300" cy="300" r="190" className="aod-ring-run" pathLength="100" />
        <text x="300" y="503" className="aod-k aod-mid aod-blue">MEMORY · THE CONTINUITY LAYER</text>
        {pts.map(([x, y], i) => <line key={i} x1="300" y1="300" x2={x} y2={y} className="aod-spoke" />)}
        <circle cx="300" cy="300" r="62" className="aod-you" />
        <text x="300" y="292" className="aod-k aod-mid aod-light">YOU</text>
        <text x="300" y="318" className="aod-h aod-mid aod-light">Speak</text>
        {PARTS.map((d, i) => {
          const [x, y] = pts[i];
          return (
            <g key={d.k}>
              <circle cx={x} cy={y} r="70" className="aod-node" />
              <text x={x} y={y - 6} className="aod-k aod-mid">{d.k.toUpperCase()}</text>
              <text x={x} y={y + 18} className="aod-h aod-mid">{d.t}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

/* C · Flow: one request, left to right, with memory running under all of it. */
export function AosFlow() {
  const steps = [
    { k: "You", t: "Say it", p: "“Send John the deck.”" },
    { k: "Senses", t: "Understands", p: "Hears you, sees the screen." },
    { k: "Hands", t: "Does it", p: "Finds the file, opens WhatsApp." },
    { k: "Voice", t: "Tells you", p: "“Sent it to John.”" },
  ];
  return (
    <figure className="aod aod-flow" aria-label="AffectiveOS as a flow.">
      <div className="aod-flow-row">
        {steps.map((s, i) => (
          <div className="aod-flow-step" key={s.k}>
            <span className="osd-k">{String(i + 1).padStart(2, "0")} · {s.k}</span>
            <h3>{s.t}</h3>
            <p>{s.p}</p>
            {i < steps.length - 1 && <i className="aod-arrow" aria-hidden="true">→</i>}
          </div>
        ))}
      </div>
      <div className="aod-flow-mem"><span className="osd-k">Memory · the continuity layer</span><p>Every step is kept on your Mac, so next time he already knows which John.</p></div>
    </figure>
  );
}

/* D · Nested: each layer sits inside the one that holds it. */
export function AosNested() {
  return (
    <figure className="aod aod-nest" aria-label="AffectiveOS as nested layers.">
      <div className="aod-n1">
        <span className="osd-k">The Mac you already own</span>
        <div className="aod-n2">
          <span className="osd-k aod-blue">Memory · the continuity layer</span>
          <div className="aod-n3">
            {PARTS.map((d) => (
              <div key={d.k}><span className="osd-k">{d.k}</span><h3>{d.t}</h3><p>{d.p}</p></div>
            ))}
          </div>
          <div className="aod-n4"><span className="osd-k">You</span><p>Just talk.</p></div>
        </div>
      </div>
    </figure>
  );
}

/* E · Mac orbit: a line sketch of a MacBook that draws itself in, and on its
   screen the orbit: you at the centre, senses, voice and hands around you,
   memory as the ring that holds them. Light runs round the ring and down the
   spokes, so the Mac reads as powered by it. */
export function AosMac() {
  const cx = 400, cy = 250;
  const pts: [number, number][] = [[cx, cy - 104], [cx + 112, cy + 70], [cx - 112, cy + 70]];
  return (
    <figure className="aod aod-mac" aria-label="A MacBook, and on its screen AffectiveOS: you at the centre, senses, voice and hands around you, memory holding them.">
      <svg viewBox="0 0 800 560" role="img">
        {/* The Mac, drawn as a sketch. */}
        <g className="mac-body">
          <rect x="110" y="40" width="580" height="400" rx="22" className="mac-line" pathLength="100" />
          <rect x="128" y="58" width="544" height="364" rx="8" className="mac-line mac-thin" pathLength="100" />
          <path d="M360 58 h80 v12 q0 8 -8 8 h-64 q-8 0 -8 -8 z" className="mac-notch" />
          <path d="M60 452 h680 q0 22 -26 26 h-628 q-26 -4 -26 -26 z" className="mac-line" pathLength="100" />
          <path d="M350 452 q0 10 12 10 h76 q12 0 12 -10" className="mac-line mac-thin" pathLength="100" />
          <line x1="96" y1="440" x2="704" y2="440" className="mac-line mac-thin" pathLength="100" />
        </g>
        {/* AffectiveOS on the screen. */}
        <g className="mac-os">
          <circle cx={cx} cy={cy} r="124" className="aod-ring" />
          <circle cx={cx} cy={cy} r="124" className="aod-ring-run" pathLength="100" />
          {pts.map(([x, y], i) => (
            <g key={i}>
              <line x1={cx} y1={cy} x2={x} y2={y} className="aod-spoke" />
              <line x1={cx} y1={cy} x2={x} y2={y} className="mac-spark" pathLength="100" style={{ animationDelay: `${i * 0.5}s` }} />
            </g>
          ))}
          <circle cx={cx} cy={cy} r="44" className="aod-you" />
          <text x={cx} y={cy - 6} className="aod-k aod-mid aod-light">YOU</text>
          <text x={cx} y={cy + 16} className="aod-h aod-mid aod-light">Speak</text>
          {PARTS.map((d, i) => {
            const [x, y] = pts[i];
            return (
              <g key={d.k}>
                <circle cx={x} cy={y} r="46" className="aod-node" />
                <text x={x} y={y - 4} className="aod-k aod-mid">{d.k.toUpperCase()}</text>
                <text x={x} y={y + 16} className="aod-h aod-mid mac-h">{d.t}</text>
              </g>
            );
          })}
          <text x={cx} y={cy + 160} className="aod-k aod-mid aod-blue">MEMORY · THE CONTINUITY LAYER</text>
        </g>
        <text x="400" y="520" className="aod-k aod-mid">THE MAC YOU ALREADY OWN</text>
      </svg>
    </figure>
  );
}

/* F · MacBook Air, with the flow on its screen and the hands at work: the file
   is found in Finder, carried across, and lands in John's WhatsApp chat. A
   line sketch in ink, menu bar included, drawn in when it comes into view. */
export function AosMacFlow() {
  const steps = [
    { k: "01 · You", t: "Say it", p: "“Send John the deck.”" },
    { k: "02 · Senses", t: "Understands", p: "Hears you, reads the screen." },
    { k: "03 · Hands", t: "Does it", p: "Finds the file, sends it." },
    { k: "04 · Voice", t: "Tells you", p: "“Sent it to John.”" },
  ];
  const sx = [168, 340, 512, 684];
  return (
    <figure className="aod aod-air" aria-label="A MacBook Air. On its screen: you say send John the deck; it understands, finds the file in Finder, sends it in WhatsApp, and tells you; memory keeps it.">
      <svg viewBox="0 0 1000 640" role="img">
        {/* Lid */}
        <rect x="128" y="24" width="744" height="498" rx="26" className="mac-line" pathLength="100" />
        <rect x="142" y="38" width="716" height="470" rx="12" className="mac-line mac-thin" pathLength="100" />
        {/* Menu bar */}
        <g className="air-menu">
          <line x1="142" y1="66" x2="858" y2="66" className="air-rule" />
          <path d="M168 47c1.6-.1 3 .8 3.9.8.9 0 2.4-1 4.1-.8.7 0 2.6.3 3.8 2-.1.1-2.3 1.3-2.3 3.9 0 3.1 2.7 4.1 2.7 4.2 0 0-.4 1.5-1.4 2.9-.9 1.2-1.8 2.4-3.2 2.5-1.4 0-1.8-.8-3.4-.8s-2.1.8-3.4.8c-1.3.1-2.4-1.3-3.3-2.5-1.8-2.5-3.2-7.1-1.3-10.2.9-1.6 2.6-2.6 4.4-2.6zM175 42.6c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.7-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" className="air-apple" />
          <text x="192" y="58" className="air-t air-b">Chrome</text>
          {["File", "Edit", "View", "History", "Window"].map((m, i) => (
            <text key={m} x={250 + [0, 34, 70, 108, 160][i]} y="58" className="air-t">{m}</text>
          ))}
          <text x="842" y="58" className="air-t" textAnchor="end">Fri 9:41 AM</text>
          <rect x="738" y="49" width="18" height="9" rx="2.5" className="air-ico" />
          <path d="M714 57.5a6 6 0 0 1 10 0M716.5 55a3 3 0 0 1 5 0" className="air-ico" />
        </g>
        {/* Notch, in the menu bar like the real one */}
        <path d="M466 38h68v14q0 8-8 8h-52q-8 0-8-8z" className="mac-notch" />

        {/* The flow */}
        <g className="mac-os">
          {steps.map((s, i) => (
            <g key={s.k} className="air-step" style={{ animationDelay: `${1.8 + i * 0.35}s` }}>
              <rect x={sx[i]} y="84" width="158" height="84" className="air-box" />
              <text x={sx[i] + 12} y="102" className="air-k">{s.k.toUpperCase()}</text>
              <text x={sx[i] + 12} y="126" className="air-h">{s.t}</text>
              <text x={sx[i] + 12} y="150" className="air-p">{s.p}</text>
              {i < 3 && <text x={sx[i] + 160} y="132" className="air-arrow">→</text>}
            </g>
          ))}

          {/* The hands at work: Finder → WhatsApp */}
          <g className="air-win">
            <rect x="184" y="190" width="300" height="220" rx="8" className="air-box" />
            <line x1="184" y1="214" x2="484" y2="214" className="air-rule" />
            <circle cx="204" cy="202" r="3.5" className="air-dot" /><circle cx="216" cy="202" r="3.5" className="air-dot" /><circle cx="228" cy="202" r="3.5" className="air-dot" />
            <text x="335" y="206" className="air-k" textAnchor="middle">FINDER · DOWNLOADS</text>
            <line x1="270" y1="214" x2="270" y2="410" className="air-rule" />
            {["Recents", "Desktop", "Downloads", "Documents"].map((t, i) => <text key={t} x="204" y={240 + i * 22} className={"air-p" + (i === 2 ? " air-b" : "")}>{t}</text>)}
            {["Notes.txt", "Launch deck v3.pdf", "Invoice March.pdf", "Photo 0412.jpg"].map((t, i) => (
              <g key={t}>
                {i === 1 && <rect x="276" y={226 + i * 26} width="198" height="22" rx="4" className="air-hl" />}
                <text x="286" y={241 + i * 26} className={"air-p" + (i === 1 ? " air-b" : "")}>{t}</text>
              </g>
            ))}
          </g>
          <g className="air-win">
            <rect x="520" y="190" width="290" height="220" rx="8" className="air-box" />
            <line x1="520" y1="214" x2="810" y2="214" className="air-rule" />
            <circle cx="534" cy="202" r="3.5" className="air-dot" /><circle cx="546" cy="202" r="3.5" className="air-dot" /><circle cx="558" cy="202" r="3.5" className="air-dot" />
            <text x="665" y="206" className="air-k" textAnchor="middle">WHATSAPP · JOHN</text>
            <rect x="534" y="232" width="150" height="28" rx="10" className="air-bubble-in" />
            <text x="546" y="250" className="air-p">Got the deck?</text>
            <g className="air-sent">
              <rect x="622" y="350" width="174" height="44" rx="10" className="air-bubble-out" />
              <text x="634" y="368" className="air-p air-b">Launch deck v3.pdf</text>
              <text x="634" y="386" className="air-k">PDF · 2.4 MB</text>
              <text x="784" y="386" className="air-tick" textAnchor="end">✓✓</text>
            </g>
          </g>
          {/* The cursor carrying the file across */}
          <g className="air-cursor">
            <g className="air-carry">
              <rect x="10" y="10" width="112" height="22" rx="4" className="air-ghost" />
              <text x="18" y="25" className="air-p air-b">Launch deck v3.pdf</text>
              <path d="M0 0l0 16 4.5-4.5 3 7 2.6-1.1-3-6.8 6.3 0z" className="air-pointer" />
            </g>
          </g>

          {/* Memory, under all of it */}
          <rect x="168" y="430" width="674" height="62" className="air-mem" />
          <text x="192" y="452" className="air-k air-blue">MEMORY · THE CONTINUITY LAYER</text>
          <text x="192" y="476" className="air-p">Every step is kept on your Mac, so next time he already knows which John, and which deck.</text>
        </g>

        {/* MacBook Air base: a thin wedge with the thumb notch */}
        <path d="M62 524h876q-4 16-30 20H92q-26-4-30-20z" className="mac-line" pathLength="100" />
        <path d="M440 524q0 7 10 7h100q10 0 10-7" className="mac-line mac-thin" pathLength="100" />
        <text x="500" y="590" className="aod-k aod-mid">THE MACBOOK AIR YOU ALREADY OWN</text>
      </svg>
    </figure>
  );
}

/* G · A live task, as an 18 second motion sequence on the MacBook Air.
   1. The flow: say it, understands, does it, tells you.
   2. The notch listens: the sentence types out.
   3. The notch works while the hands do it: Chrome opens the flights, the
      cheapest is picked, WhatsApp opens and it is sent to John.
   4. The notch says it is done, and memory keeps it. Then it loops. */
export function AosMacLive() {
  const flow = [
    { k: "01 · YOU", t: "Say it" },
    { k: "02 · SENSES", t: "Understands" },
    { k: "03 · HANDS", t: "Does it" },
    { k: "04 · VOICE", t: "Tells you" },
  ];
  const fx = [196, 392, 588, 784];
  const work = ["Searched flights for Friday", "Compared 14 fares", "Cheapest: IndiGo 6:10 am, ₹4,820", "Sent it to John on WhatsApp"];
  const flights = [["IndiGo", "6:10 am", "₹4,820"], ["Air India", "8:45 am", "₹5,610"], ["Akasa", "11:20 am", "₹5,940"]];
  return (
    <figure className="aod aod-live" aria-label="An eighteen second sequence: the flow, then the notch hears a request, then Braino finds the cheapest flight in Chrome and sends it to John on WhatsApp, then says it is done.">
      <svg viewBox="0 0 1100 700" role="img">
        <defs>
          <clipPath id="gType"><rect x="380" y="88" height="30" className="g-type" /></clipPath>
          <clipPath id="gType2"><rect x="380" y="118" height="30" className="g-type2" /></clipPath>
        </defs>
        {/* MacBook Air */}
        <rect x="104" y="18" width="892" height="590" rx="30" className="mac-line" pathLength="100" />
        <rect x="120" y="34" width="860" height="558" rx="13" className="mac-line mac-thin" pathLength="100" />
        <path d="M52 610h996q-5 18-34 22H86q-29-4-34-22z" className="mac-line" pathLength="100" />
        <path d="M500 610q0 8 11 8h78q11 0 11-8" className="mac-line mac-thin" pathLength="100" />
        <text x="550" y="672" className="aod-k aod-mid">THE MACBOOK AIR YOU ALREADY OWN</text>

        {/* Menu bar */}
        <g className="air-menu">
          <line x1="120" y1="62" x2="980" y2="62" className="air-rule" />
          <path transform="translate(-24 -4)" d="M168 47c1.6-.1 3 .8 3.9.8.9 0 2.4-1 4.1-.8.7 0 2.6.3 3.8 2-.1.1-2.3 1.3-2.3 3.9 0 3.1 2.7 4.1 2.7 4.2 0 0-.4 1.5-1.4 2.9-.9 1.2-1.8 2.4-3.2 2.5-1.4 0-1.8-.8-3.4-.8s-2.1.8-3.4.8c-1.3.1-2.4-1.3-3.3-2.5-1.8-2.5-3.2-7.1-1.3-10.2.9-1.6 2.6-2.6 4.4-2.6zM175 42.6c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.7-1.3 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z" className="air-apple" />
          <text x="170" y="54" className="air-t air-b">Chrome</text>
          {["File", "Edit", "View", "History", "Window"].map((m, i) => <text key={m} x={232 + i * 46} y="54" className="air-t">{m}</text>)}
          <text x="962" y="54" className="air-t" textAnchor="end">Fri 9:41 AM</text>
        </g>

        {/* 1 · the flow */}
        <g className="g-flow">
          <text x="550" y="230" className="g-title" textAnchor="middle">How one sentence gets done</text>
          {flow.map((f, i) => (
            <g key={f.k} className={`g-step g-step${i + 1}`}>
              <rect x={fx[i]} y="268" width="168" height="96" className="air-box" />
              <text x={fx[i] + 16} y="294" className="air-k">{f.k}</text>
              <text x={fx[i] + 16} y="330" className="g-h">{f.t}</text>
              {i < 3 && <text x={fx[i] + 176} y="322" className="air-arrow">→</text>}
            </g>
          ))}
        </g>

        {/* The notch, always there, small */}
        <path d="M512 34h76v16q0 9-9 9h-58q-9 0-9-9z" className="mac-notch" />

        {/* 2 · listening */}
        <g className="g-listen">
          <path d="M360 34h380v116q0 22-22 22H382q-22 0-22-22z" className="g-sheet g-glow" />
          <text x="384" y="76" className="g-sk"><tspan className="g-dot">●</tspan>  LISTENING</text>
          <text x="384" y="110" className="g-st" clipPath="url(#gType)">&ldquo;Find the cheapest flight to Delhi on</text>
          <text x="384" y="138" className="g-st" clipPath="url(#gType2)">Friday and send it to John.&rdquo;</text>
        </g>

        {/* 3 · working: the notch lists the steps while the hands do them */}
        <g className="g-work">
          <path d="M380 34h340v196q0 22-22 22H402q-22 0-22-22z" className="g-sheet g-glow" />
          <text x="402" y="76" className="g-sk">WORKING ON IT</text>
          {work.map((w, i) => (
            <g key={w} className={`g-tick g-tick${i + 1}`}>
              <circle cx="410" cy={104 + i * 32} r="6" className="g-ring" />
              <path d={`M406.5 ${104 + i * 32}l2.6 2.6 4.6-5`} className="g-check" />
              <text x="426" y={109 + i * 32} className="g-sw">{w}</text>
            </g>
          ))}
        </g>

        {/* Chrome: the flights */}
        <g className="g-chrome">
          <rect x="150" y="276" width="420" height="270" rx="10" className="air-box" />
          <line x1="150" y1="304" x2="570" y2="304" className="air-rule" />
          <circle cx="166" cy="290" r="4" className="air-dot" /><circle cx="180" cy="290" r="4" className="air-dot" /><circle cx="194" cy="290" r="4" className="air-dot" />
          <rect x="216" y="282" width="300" height="16" rx="8" className="g-url" />
          <text x="228" y="294" className="g-small">google.com/travel/flights · BLR → DEL · Fri</text>
          <text x="172" y="334" className="g-h2">Friday flights to Delhi</text>
          {flights.map(([a, t, p], i) => (
            <g key={a} className={`g-row g-row${i + 1}`}>
              <rect x="170" y={350 + i * 56} width="380" height="46" rx="6" className={"g-rowbox" + (i === 0 ? " g-pick" : "")} />
              <text x="186" y={378 + i * 56} className="g-sw2">{a}</text>
              <text x="320" y={378 + i * 56} className="g-sw2">{t}</text>
              <text x="534" y={378 + i * 56} className="g-sw2 g-b" textAnchor="end">{p}</text>
            </g>
          ))}
          <g className="g-cursor1"><path d="M0 0l0 18 5-5 3.4 7.8 3-1.3-3.4-7.6 7-.1z" className="air-pointer" /></g>
        </g>

        {/* WhatsApp: sent to John */}
        <g className="g-wa">
          <rect x="600" y="276" width="350" height="270" rx="10" className="air-box" />
          <line x1="600" y1="304" x2="950" y2="304" className="air-rule" />
          <circle cx="616" cy="290" r="4" className="air-dot" /><circle cx="630" cy="290" r="4" className="air-dot" /><circle cx="644" cy="290" r="4" className="air-dot" />
          <text x="775" y="294" className="air-k" textAnchor="middle">WHATSAPP · JOHN</text>
          <rect x="618" y="324" width="190" height="34" rx="12" className="air-bubble-in" />
          <text x="632" y="346" className="g-sw2">Are we flying Friday?</text>
          <g className="g-sentmsg">
            <rect x="676" y="440" width="256" height="64" rx="12" className="air-bubble-out" />
            <text x="690" y="464" className="g-sw2">Cheapest Friday flight to Delhi:</text>
            <text x="690" y="488" className="g-sw2 g-b">IndiGo 6:10 am, ₹4,820</text>
            <text x="918" y="496" className="air-tick" textAnchor="end">✓✓</text>
          </g>
        </g>

        {/* 4 · done */}
        <g className="g-done">
          <path d="M380 34h340v100q0 22-22 22H402q-22 0-22-22z" className="g-sheet" />
          <text x="402" y="76" className="g-sk">DONE</text>
          <text x="402" y="108" className="g-st2">Sent John the cheapest flight.</text>
          <text x="402" y="132" className="g-sw">IndiGo, 6:10 am, ₹4,820. Want me to book it?</text>
        </g>

        {/* Memory, under everything */}
        <g className="g-mem">
          <rect x="150" y="556" width="800" height="28" className="air-mem" />
          <text x="166" y="574" className="air-k air-blue">MEMORY · KEPT ON YOUR MAC</text>
          <text x="398" y="575" className="g-small">John · Delhi · you fly early on Fridays</text>
        </g>
      </svg>
    </figure>
  );
}
