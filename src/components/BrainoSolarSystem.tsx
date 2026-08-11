import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import "./braino-solar-system.css";

/* The Braino family drawn as a solar system. Braino OS is the sun; every product
   and named part orbits it, because the whole positioning argument is that they
   are one character wearing different surfaces.

   Clicking a planet zooms into it: the system scales up and dissolves, and the
   chosen planet arrives at the centre, lit from inside, with its name and what
   it actually does underneath. Escape or the back control returns to the system.

   Each planet owns its colour. HERA is green because that is BrainoHERA's colour
   everywhere else on the site, and Foundry is sea blue. */

type Planet = {
  id: string;
  number: string;
  name: string;
  place: string;
  line: string;
  features: string[];
  to: string;
  /** Orbit ring, 1 is innermost. Drives the planet's distance from the sun. */
  ring: 1 | 2 | 3 | 4;
  /** Position on the ring, in degrees clockwise from twelve o'clock. */
  angle: number;
};

/* Seconds per revolution. Outer orbits are slower, so the system reads as a
   system rather than four things spinning at one speed. */
const ORBIT_SECONDS: Record<Planet["ring"], number> = { 1: 5.5, 2: 8, 3: 11.5, 4: 15.5 };

/* A deterministic star field. Three depth layers: 1 is far and slow, 3 is near
   and fast, which is what gives the black actual distance instead of a flat
   backdrop. Generated from a fixed seed so the layout never shifts between
   renders or between builds. */
const STARS = (() => {
  let seed = 20260809;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 90 }, () => {
    const depth = (random() < 0.5 ? 1 : random() < 0.6 ? 2 : 3) as 1 | 2 | 3;
    return {
      x: random() * 100,
      y: random() * 100,
      size: depth === 1 ? 1.2 : depth === 2 ? 1.8 : 2.6,
      depth,
      delay: -random() * 6,
    };
  });
})();

const FAMILY: Planet[] = [
  {
    id: "browser", number: "01", name: "Braino", place: "Browser", ring: 1, angle: 318,
    line: "Free in Chrome. He reads the page you are on, searches, takes notes and talks back.",
    features: ["Chat with any page", "Web search, built in", "Lectures become clean notes"],
    to: "/braino",
  },
  {
    id: "foundry", number: "02", name: "Braino Foundry", place: "macOS", ring: 2, angle: 52,
    line: "The co-founder. He sees your screen, hears your voice, does the work and manages the agents.",
    features: ["Screen awareness and voice", "Files, admin, notes and execution", "Agent orchestration when it lands"],
    to: "/braino?view=foundry",
  },
  {
    id: "hera", number: "03", name: "BrainoHERA", place: "Voice", ring: 3, angle: 210,
    line: "System-wide dictation. Speak into any Mac text field and the words land at your cursor.",
    features: ["Double Option to wake", "On-device, no connection needed", "Lands at the caret, in any app"],
    to: "/brainohera",
  },
  {
    id: "studio", number: "04", name: "BrainoStudio", place: "Identity", ring: 4, angle: 138,
    line: "The dressing room. Change his face, wardrobe, movement, palette and how he enters a room.",
    features: ["Face and expression", "Wardrobe and palette", "The way he arrives"],
    to: "/build-braino",
  },
];

export default function BrainoSolarSystem({ planets = FAMILY }: { planets?: Planet[] }) {
  const [focused, setFocused] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const labelRefs = useRef(new Map<string, HTMLElement>());
  const stageRef = useRef<HTMLDivElement>(null);

  /* The zoom is a camera move, not a cross-fade. Both layers share one origin —
     the exact spot the clicked planet occupied — so the system rushes past the
     viewer while that planet's world opens out of the same point. Without this
     the focus view just appeared in the middle and the two animations read as
     unrelated. */
  const zoomInto = (id: string, orb: HTMLElement | null) => {
    const stage = stageRef.current;
    if (stage && orb) {
      const stageRect = stage.getBoundingClientRect();
      const orbRect = orb.getBoundingClientRect();
      const x = ((orbRect.left + orbRect.width / 2 - stageRect.left) / stageRect.width) * 100;
      const y = ((orbRect.top + orbRect.height / 2 - stageRect.top) / stageRect.height) * 100;
      sectionRef.current?.style.setProperty("--zoom-x", `${x}%`);
      sectionRef.current?.style.setProperty("--zoom-y", `${y}%`);
    }
    setFocused(id);
  };
  const focusedPlanet = planets.find((planet) => planet.id === focused) ?? null;

  // Scroll parallax: the rings, the sun and the planets each drift at their own
  // rate, so the system has depth instead of sitting flat on the page.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, (window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight));
      section.style.setProperty("--bss-far", `${progress * 46}px`);
      section.style.setProperty("--bss-mid", `${progress * 24}px`);
      section.style.setProperty("--bss-near", `${progress * -20}px`);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* Planets on neighbouring rings pass each other, and when they do their names
     collide. Geometry alone cannot prevent it — at closest approach the orbs are
     nearly touching, so there is no room for two labels between them. So the
     labels are measured while they move, and whenever two overlap the inner
     one yields to the outer one, which has more space around it.

     Muting is opacity only, never layout, so a hidden label keeps its box and
     the comparison stays stable instead of oscillating. */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      frame = requestAnimationFrame(tick);
      if (time - last < 90) return;
      last = time;
      const entries = Array.from(labelRefs.current.entries())
        .filter(([, element]) => element.isConnected)
        .map(([id, element]) => ({
          id,
          element,
          ring: Number(element.dataset.ring) || 0,
          rect: element.getBoundingClientRect(),
        }));
      const muted = new Set<string>();
      for (let i = 0; i < entries.length; i += 1) {
        for (let j = i + 1; j < entries.length; j += 1) {
          const a = entries[i];
          const b = entries[j];
          const overlaps =
            a.rect.left < b.rect.right &&
            b.rect.left < a.rect.right &&
            a.rect.top < b.rect.bottom &&
            b.rect.top < a.rect.bottom;
          if (overlaps) muted.add(a.ring < b.ring ? a.id : b.id);
        }
      }
      entries.forEach(({ id, element }) => element.classList.toggle("is-muted", muted.has(id)));
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Escape returns to the system, and focus moves somewhere real on zoom in.
  useEffect(() => {
    if (!focused) return;
    backRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focused]);

  return (
    <section
      ref={sectionRef}
      className={`bss${focused ? " is-zoomed" : ""}`}
      id="family"
      aria-labelledby="bss-title"
    >
      <div className="bss-head apple-reveal">
        <p className="bss-eyebrow">The Braino family</p>
        <h2 id="bss-title">One Braino.<br /><span>Many places to meet him.</span></h2>
        <p className="bss-sub">
          Braino OS is the centre. Everything else orbits it and stays the same character.
          Tap a planet to look at it properly.
        </p>
      </div>

      <div className="bss-stage" ref={stageRef}>
        <div className="bss-space" aria-hidden="true">
          <i className="bss-glow" />
          <i className="bss-nebula n1" />
          <i className="bss-nebula n2" />
          {STARS.map((star, index) => (
            <span
              className={`bss-star depth-${star.depth}`}
              key={index}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s, ${star.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ── The system ── */}
        <div className="bss-system">
         <div className="bss-travel">
          <div className="bss-rings" aria-hidden="true">
            <i className="r1" /><i className="r2" /><i className="r3" /><i className="r4" />
          </div>

          <div className="bss-sun">
            <Link to="/human-intelligence" className="bss-sun-core" aria-label="Braino OS, the mind and the heart">
              <span className="bss-corona" aria-hidden="true" />
              <span className="bss-flare" aria-hidden="true" />
              <span className="bss-sun-body" aria-hidden="true">
                <i className="bss-eye left" />
                <i className="bss-eye right" />
              </span>
            </Link>
            <div className="bss-sun-label">
              <strong>Braino OS</strong>
              <small>the mind and the heart</small>
            </div>
          </div>

          <ul className="bss-planets">
            {planets.map((planet) => {
              // Outer orbits take longer, the way real ones do. The starting
              // angle becomes a negative delay so each planet enters its orbit
              // already in position instead of all four leaving twelve o'clock
              // together.
              const duration = ORBIT_SECONDS[planet.ring];
              const spin = {
                animationDuration: `${duration}s`,
                animationDelay: `${-(planet.angle / 360) * duration}s`,
              };
              return (
                <li className={`bss-orbit bss-ring-${planet.ring} is-${planet.id}`} key={planet.id}>
                  <span className="bss-orbit-spin" style={spin}>
                    <button
                      type="button"
                      className="bss-planet"
                      onClick={(event) => zoomInto(planet.id, event.currentTarget.querySelector(".bss-orb"))}
                      aria-label={`Zoom into ${planet.name}`}
                    >
                      <span className="bss-planet-upright" style={spin}>
                        <span className="bss-orb" aria-hidden="true"><i /></span>
                        <span
                          className="bss-planet-label"
                          data-ring={planet.ring}
                          ref={(element) => {
                            if (element) labelRefs.current.set(planet.id, element);
                            else labelRefs.current.delete(planet.id);
                          }}
                        >
                          <b>{planet.name}</b>
                          <small>{planet.place}</small>
                        </span>
                      </span>
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
         </div>
        </div>

        {/* ── One planet, zoomed ── */}
        <div className={`bss-focus is-${focusedPlanet?.id ?? "none"}`} aria-hidden={!focusedPlanet}>
          {focusedPlanet && (
            <>
              <button
                ref={backRef}
                type="button"
                className="bss-back"
                onClick={() => setFocused(null)}
              >
                ← Back to the system
              </button>
              <div className="bss-focus-orb" aria-hidden="true">
                <i className="bss-focus-glow" />
                <i className="bss-focus-body" />
                <i className="bss-focus-sheen" />
              </div>
              <div className="bss-focus-copy">
                <span className="bss-focus-number">{focusedPlanet.number} / {focusedPlanet.place}</span>
                <h3>{focusedPlanet.name}</h3>
                <p>{focusedPlanet.line}</p>
                <ul>
                  {focusedPlanet.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <Link to={focusedPlanet.to} className="bss-focus-cta">
                  Explore {focusedPlanet.name} <ArrowUpRight />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
