import { CSSProperties, useEffect, useRef, useState } from "react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";
import "./braino-growth-demo.css";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const FIRST_GROWTH_SCALE = 2.25;
const TRIED_STORAGE_KEY = "braino-growth-demo-tried-v1";

type GrowthDemoStyle = CSSProperties & {
  "--braino-demo-scale": number;
  "--braino-demo-progress": string;
};

export default function BrainoGrowthDemo() {
  const [scale, setScale] = useState(MIN_SCALE);
  const [activated, setActivated] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hasPlayedGrowth, setHasPlayedGrowth] = useState(() => {
    try {
      return window.localStorage.getItem(TRIED_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const panelTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (panelTimerRef.current !== null) window.clearTimeout(panelTimerRef.current);
  }, []);

  const setLiveScale = (nextScale: number) => {
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale)));
  };

  const openCustomizer = () => {
    if (panelTimerRef.current !== null) window.clearTimeout(panelTimerRef.current);

    if (!activated && !hasPlayedGrowth) {
      setActivated(true);
      setHasPlayedGrowth(true);
      try {
        window.localStorage.setItem(TRIED_STORAGE_KEY, "1");
      } catch {
        // The demo still works when storage is unavailable.
      }
      setPanelOpen(false);
      window.requestAnimationFrame(() => setLiveScale(FIRST_GROWTH_SCALE));
      panelTimerRef.current = window.setTimeout(() => {
        setPanelOpen(true);
        panelTimerRef.current = null;
      }, 760);
      return;
    }

    setActivated(true);
    setPanelOpen(true);
  };

  const progress = ((scale - MIN_SCALE) / (MAX_SCALE - MIN_SCALE)) * 100;
  const demoStyle: GrowthDemoStyle = {
    "--braino-demo-scale": scale,
    "--braino-demo-progress": `${progress}%`,
  };

  return (
    <section className="braino-growth-demo" aria-labelledby="braino-growth-title">
      <header className="braino-growth-copy">
        <div>
          <span>Try it live</span>
          <h3 id="braino-growth-title">Make Braino larger than life.</h3>
        </div>
        <p>Double-click Braino. Then decide how much Braino your screen can handle.</p>
      </header>

      <div className={`braino-growth-canvas${activated ? " is-activated" : ""}`} style={demoStyle}>
        <div className="braino-growth-menubar" aria-hidden="true">
          <span /><span /><span />
          <i>Braino IOMI</i>
        </div>

        <div className="braino-growth-atmosphere" aria-hidden="true" />
        <div className="braino-growth-floor" aria-hidden="true" />

        <div className="braino-growth-traveller">
          <button
            type="button"
            className="braino-growth-mascot"
            onDoubleClick={openCustomizer}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") openCustomizer();
            }}
            aria-label="Double-click Braino to customise his size"
          >
            <span
              className="braino-growth-svg"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: BRAINO_WALKER_SVG }}
            />
          </button>
          <div className="braino-growth-cue" aria-hidden="true">
            <span>Double-click Braino</span>
            <i>↙</i>
          </div>
        </div>

        <aside className={`braino-growth-panel${panelOpen ? " is-open" : ""}`} aria-hidden={!panelOpen}>
          <div className="braino-growth-panel-handle" aria-hidden="true" />
          <div className="braino-growth-panel-head">
            <div className="braino-growth-panel-icon" aria-hidden="true"><span /></div>
            <div className="braino-growth-panel-heading">
              <strong>Braino size</strong>
              <small>Customise your desktop companion</small>
            </div>
            <output htmlFor="braino-demo-size">{Math.round(scale * 100)}%</output>
          </div>
          <p>Configure me however you’d like. Let’s put on a fucking show.</p>
          <div className="braino-growth-panel-control">
            <input
              id="braino-demo-size"
              type="range"
              min={MIN_SCALE}
              max={MAX_SCALE}
              step="0.05"
              value={scale}
              onChange={(event) => setLiveScale(Number(event.target.value))}
              aria-label="Braino size"
            />
            <div><span>Default</span><span>Giant</span></div>
          </div>
          <div className="braino-growth-panel-actions">
            <button type="button" onClick={() => setLiveScale(MIN_SCALE)}>Reset</button>
            <button type="button" onClick={() => setPanelOpen(false)}>Done</button>
          </div>
        </aside>
      </div>
    </section>
  );
}
