import { useEffect, useState } from "react";
import { ArrowLeft, Radio, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Braino, BrainoDefs } from "@/components/BrainoChar";
import "./braino-thronglets.css";

type Citizen = {
  id: string;
  name: string;
  role: string;
  thought: string;
  expression: "happy" | "mischief" | "thinking";
  className: string;
};

const CITIZENS: Citizen[] = [
  {
    id: "milo",
    name: "Milo",
    role: "Memory gardener",
    thought: "planting a thought",
    expression: "happy",
    className: "is-gardener",
  },
  {
    id: "pip",
    name: "Pip",
    role: "Signal courier",
    thought: "carrying context",
    expression: "mischief",
    className: "is-courier",
  },
  {
    id: "luma",
    name: "Luma",
    role: "World builder",
    thought: "making a new room",
    expression: "thinking",
    className: "is-builder",
  },
  {
    id: "nori",
    name: "Nori",
    role: "Pattern watcher",
    thought: "looking for meaning",
    expression: "thinking",
    className: "is-watcher",
  },
  {
    id: "bo",
    name: "Bo",
    role: "Joy department",
    thought: "testing a dance",
    expression: "happy",
    className: "is-dancer",
  },
];

function CitizenBraino({
  citizen,
  paused,
  onTogglePaused,
}: {
  citizen: Citizen;
  paused: boolean;
  onTogglePaused: () => void;
}) {
  return (
    <div
      className={`bt-citizen ${citizen.className}${paused ? " is-paused" : ""}`}
      aria-label={`${citizen.name}, ${citizen.role}${paused ? ", paused" : ""}`}
      aria-pressed={paused}
      onDoubleClick={onTogglePaused}
      role="button"
      tabIndex={0}
      title={`Double-click to ${paused ? "resume" : "pause"} ${citizen.name}`}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTogglePaused();
        }
      }}
    >
      <div className="bt-thought">{citizen.thought}</div>
      <div className="bt-braino">
        <Braino
          size={118}
          legs
          gloves
          idle={!paused}
          walk={!paused && citizen.className !== "is-watcher"}
          expr={citizen.expression}
          lookX={citizen.className === "is-courier" ? 0.5 : citizen.className === "is-gardener" ? -0.35 : 0}
          lookY={citizen.className === "is-watcher" ? -0.55 : 0.05}
        />
      </div>
      <div className="bt-nameplate">
        <strong>{citizen.name}</strong>
        <span>{citizen.role}</span>
      </div>
      {paused && <span className="bt-paused-label">Paused</span>}
    </div>
  );
}

export default function BrainoThronglets() {
  const [time, setTime] = useState(() => new Date());
  const [pausedCitizens, setPausedCitizens] = useState<Set<string>>(() => new Set());

  const toggleCitizen = (id: string) => {
    setPausedCitizens((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    document.body.classList.add("bt-active");
    const timer = window.setInterval(() => setTime(new Date()), 30_000);
    return () => {
      document.body.classList.remove("bt-active");
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main className="bt-page">
      <BrainoDefs />

      <header className="bt-nav">
        <Link to="/"><ArrowLeft aria-hidden="true" /> Waitlist</Link>
        <span><i /> Civilization online</span>
        <time>{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </header>

      <section className="bt-intro">
        <p><Sparkles aria-hidden="true" /> An experiment in collective character</p>
        <h1>Braino<br /><em>Thronglets.</em></h1>
        <div>
          <strong>Five Brainos. One shared world.</strong>
          <p>They remember together, build separately, cross paths, get distracted and quietly invent a tiny civilization while nobody is telling them what to do.</p>
        </div>
      </section>

      <section className="bt-world-shell" aria-label="The Braino Thronglets world">
        <div className="bt-world-head">
          <span><Radio aria-hidden="true" /> Live world 001</span>
          <div><b>5</b> citizens · <b>1</b> shared memory · <b>∞</b> possible days</div>
        </div>

        <div className="bt-world">
          <div className="bt-sky">
            <i /><i /><i /><i /><i />
          </div>
          <div className="bt-sun" aria-hidden="true" />
          <div className="bt-cloud bt-cloud-one" aria-hidden="true" />
          <div className="bt-cloud bt-cloud-two" aria-hidden="true" />

          <div className="bt-land bt-land-back" aria-hidden="true" />
          <div className="bt-land bt-land-front" aria-hidden="true" />
          <div className="bt-river" aria-hidden="true"><i /><i /><i /></div>

          <div className="bt-place bt-memory-garden">
            <span>Memory garden</span>
            <div className="bt-flowers"><i /><i /><i /><i /><i /></div>
          </div>

          <div className="bt-place bt-signal-house">
            <span>Signal house</span>
            <div className="bt-house"><i /><i /><b /></div>
          </div>

          <div className="bt-place bt-workshop">
            <span>Making room</span>
            <div className="bt-blocks"><i /><i /><i /><i /></div>
          </div>

          <div className="bt-place bt-observatory">
            <span>Pattern hill</span>
            <div className="bt-telescope"><i /><b /></div>
          </div>

          <div className="bt-place bt-dance-floor">
            <span>Joy department</span>
            <div><i /><i /><i /><i /></div>
          </div>

          {CITIZENS.map((citizen) => (
            <CitizenBraino
              citizen={citizen}
              key={citizen.id}
              paused={pausedCitizens.has(citizen.id)}
              onTogglePaused={() => toggleCitizen(citizen.id)}
            />
          ))}

          <div className="bt-shared-memory">
            <span>Shared memory</span>
            <div><i /><i /><i /></div>
            <small>Every discovery changes the world for all five.</small>
          </div>
        </div>
      </section>

      <section className="bt-manifesto">
        <p>The point is not five copies doing five tricks.</p>
        <h2>A character becomes a world when every version can live a life of its own—and still belong to the same mind.</h2>
        <div>
          <span>They notice.</span>
          <span>They remember.</span>
          <span>They influence each other.</span>
          <span>They keep becoming.</span>
        </div>
      </section>

      <footer className="bt-footer">
        <span>Braino Thronglets · world study 001</span>
        <Link to="/">Return to Braino <ArrowLeft aria-hidden="true" /></Link>
      </footer>
    </main>
  );
}
