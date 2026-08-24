/* The shape of Braino OS.
 *
 * Braino OS is four systems that never stop talking to each other: the mind
 * that reasons, the heart that feels, the ears that listen, the memory that
 * keeps. This file builds that as an actual graph in 3D so the renderer can
 * turn it, look into it, and light it up. Nothing here draws anything.
 *
 * The mass is deliberately irregular. A neat sphere reads as a diagram; what
 * we want is something that reads as alive, so the core is a noisy shell, the
 * four systems hang off it as lobes, and a handful of long struts run through
 * the whole thing the way they do in the reference plates.
 */

export type SubsystemId = "mind" | "heart" | "ears" | "memory";

export type Subsystem = {
  id: SubsystemId;
  label: string;
  role: string;
  /* What you find when you go inside it. Real parts of Braino, not decoration. */
  parts: string[];
  color: [number, number, number];
  at: [number, number, number];
};

export const SUBSYSTEMS: Subsystem[] = [
  {
    id: "mind",
    label: "THE MIND",
    role: "Reasons, routes, decides",
    parts: ["reasoning", "router", "planner", "delegate", "tools"],
    color: [168, 232, 255],
    at: [0.02, -0.6, 0.1],
  },
  {
    id: "heart",
    label: "THE HEART",
    role: "Feels, and colours everything else",
    parts: ["traits", "moments", "tone", "restraint", "warmth"],
    color: [255, 138, 176],
    at: [-0.62, 0.28, -0.16],
  },
  {
    id: "ears",
    label: "THE EARS",
    role: "Hears, always, before anything happens",
    parts: ["wake", "capture", "transcribe", "silence", "intent"],
    color: [122, 255, 214],
    at: [0.64, 0.25, 0.14],
  },
  {
    id: "memory",
    label: "THE MEMORY",
    role: "Keeps what matters, forgets what does not",
    parts: ["capture", "recall", "people", "places", "decay"],
    color: [186, 158, 255],
    at: [-0.04, 0.66, -0.06],
  },
];

export type Node = {
  x: number;
  y: number;
  z: number;
  /* Which system owns this node, or null for the shared core. */
  owner: SubsystemId | null;
  /* 0..1. Bright nodes are the ones that read as lights in the filaments. */
  lum: number;
  /* Each node breathes on its own clock so the mass never pulses as one slab. */
  phase: number;
  rate: number;
};

export type Edge = {
  a: number;
  b: number;
  /* Long struts are drawn fainter and straighter; they are the scaffolding. */
  strut: boolean;
  owner: SubsystemId | null;
  len: number;
};

export type Graph = {
  nodes: Node[];
  edges: Edge[];
  /* Adjacency, so a firing pulse can walk the filaments instead of teleporting
     across the gap between two dots. */
  adjacency: number[][];
  /* One representative node per system, used as a pulse source and as the
     anchor the camera flies to. */
  hubs: Record<SubsystemId, number>;
};

/* Deterministic, so the shape of Braino OS is the same every time you open it.
   A cloud that rearranges itself on reload reads as noise, not as anatomy. */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function distance(a: Node, b: Node) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function buildGraph(seed = 20260824): Graph {
  const rand = mulberry32(seed);
  const nodes: Node[] = [];

  const push = (x: number, y: number, z: number, owner: SubsystemId | null, lum: number) => {
    nodes.push({
      x,
      y,
      z,
      owner,
      lum,
      phase: rand() * Math.PI * 2,
      rate: 0.6 + rand() * 1.5,
    });
    return nodes.length - 1;
  };

  /* The outline.
     Trigonometric lumps gave a radially symmetric mass that read as a snowflake.
     Real tissue is not periodic, so the radius is pushed out by a handful of
     randomly placed swellings instead: each one bulges the surface around its
     own direction and nothing repeats. */
  const SWELLS = Array.from({ length: 9 }, () => {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    return {
      x: Math.sin(phi) * Math.cos(theta),
      y: Math.sin(phi) * Math.sin(theta),
      z: Math.cos(phi),
      weight: 0.22 + rand() * 0.5,
      tightness: 1.6 + rand() * 3.4,
    };
  });
  // A slight squash as well, so it is never a ball from any angle.
  const SQUASH = { x: 1.06, y: 0.88, z: 0.97 };

  const surfaceRadius = (ux: number, uy: number, uz: number) => {
    let r = 1;
    for (const swell of SWELLS) {
      const dot = ux * swell.x + uy * swell.y + uz * swell.z;
      r += swell.weight * Math.exp(-(1 - dot) * swell.tightness);
    }
    return r;
  };

  /* The core: a shell rather than a ball, so light from the far side still
     reads through the near side and it looks like something with an inside. */
  const CORE = 1900;
  for (let i = 0; i < CORE; i += 1) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const ux = Math.sin(phi) * Math.cos(theta);
    const uy = Math.sin(phi) * Math.sin(theta);
    const uz = Math.cos(phi);
    const r = 0.36 * surfaceRadius(ux, uy, uz) * (1 + gaussian(rand) * 0.09);
    push(
      ux * r * SQUASH.x,
      uy * r * SQUASH.y,
      uz * r * SQUASH.z,
      null,
      rand() < 0.14 ? 0.85 + rand() * 0.15 : 0.25 + rand() * 0.4,
    );
  }

  /* A denser knot right at the middle. This is what makes the centre burn
     white in the plates instead of being a hole. */
  for (let i = 0; i < 700; i += 1) {
    const r = 0.24 * Math.cbrt(rand());
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      null,
      0.7 + rand() * 0.3,
    );
  }

  const hubs = {} as Record<SubsystemId, number>;

  for (const system of SUBSYSTEMS) {
    const [cx, cy, cz] = system.at;
    hubs[system.id] = push(cx, cy, cz, system.id, 1);
    /* Each system is a cluster with a tail that trails back toward the core,
       so it hangs off the mass rather than floating beside it. */
    const COUNT = 500;
    for (let i = 0; i < COUNT; i += 1) {
      const pull = Math.pow(rand(), 1.7); // most nodes near the hub, some strung out
      const spread = 0.4;
      const x = cx * (1 - pull * 0.85) + gaussian(rand) * spread;
      const y = cy * (1 - pull * 0.85) + gaussian(rand) * spread;
      const z = cz * (1 - pull * 0.85) + gaussian(rand) * spread * 0.8;
      push(x, y, z, system.id, rand() < 0.12 ? 0.9 + rand() * 0.1 : 0.2 + rand() * 0.45);
    }
  }

  /* Filaments: nearest-neighbour wiring. Short links only, which is what makes
     the surface look woven instead of hairy. */
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const link = (a: number, b: number, strut: boolean) => {
    if (a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    const owner =
      nodes[a].owner && nodes[a].owner === nodes[b].owner ? nodes[a].owner : null;
    edges.push({ a, b, strut, owner, len: distance(nodes[a], nodes[b]) });
  };

  /* A coarse spatial hash keeps this from being 700k distance checks. */
  const CELL = 0.125;
  const buckets = new Map<string, number[]>();
  const keyOf = (n: Node) =>
    `${Math.floor(n.x / CELL)},${Math.floor(n.y / CELL)},${Math.floor(n.z / CELL)}`;
  nodes.forEach((n, i) => {
    const key = keyOf(n);
    const list = buckets.get(key);
    if (list) list.push(i);
    else buckets.set(key, [i]);
  });

  nodes.forEach((node, i) => {
    const bx = Math.floor(node.x / CELL);
    const by = Math.floor(node.y / CELL);
    const bz = Math.floor(node.z / CELL);
    const near: { j: number; d: number }[] = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          const list = buckets.get(`${bx + dx},${by + dy},${bz + dz}`);
          if (!list) continue;
          for (const j of list) {
            if (j === i) continue;
            near.push({ j, d: distance(node, nodes[j]) });
          }
        }
      }
    }
    near.sort((p, q) => p.d - q.d);
    const wanted = node.owner ? 5 : 4;
    for (let k = 0; k < Math.min(wanted, near.length); k += 1) {
      if (near[k].d > CELL * 1.35) break;
      link(i, near[k].j, false);
    }
  });

  /* The long straight runs across the whole mass. Sparse on purpose: a few of
     these give the sense of scale, many of them turn it into a ball of wool. */
  for (let i = 0; i < 26; i += 1) {
    const a = Math.floor(rand() * nodes.length);
    const b = Math.floor(rand() * nodes.length);
    const d = distance(nodes[a], nodes[b]);
    if (d < 0.5 || d > 1.05) continue;
    link(a, b, true);
  }
  /* And spokes tying every system back into the core, because the whole point
     is that they are one thing. */
  for (const system of SUBSYSTEMS) {
    const hub = hubs[system.id];
    for (let i = 0; i < 14; i += 1) {
      link(hub, Math.floor(rand() * CORE), true);
    }
  }

  /* Wisps trailing off the surface. The mass in the reference is not a clean
     ball: it has arms, and they are most of what makes it look grown rather
     than generated. */
  for (let i = 0; i < 34; i += 1) {
    let from = Math.floor(rand() * CORE);
    const dir = {
      x: nodes[from].x + gaussian(rand) * 0.12,
      y: nodes[from].y + gaussian(rand) * 0.12,
      z: nodes[from].z + gaussian(rand) * 0.12,
    };
    const steps = 2 + Math.floor(rand() * 4);
    for (let step = 0; step < steps; step += 1) {
      const reach = 0.09 + rand() * 0.08;
      const next = push(
        nodes[from].x + dir.x * reach + gaussian(rand) * 0.05,
        nodes[from].y + dir.y * reach + gaussian(rand) * 0.05,
        nodes[from].z + dir.z * reach + gaussian(rand) * 0.05,
        null,
        0.3 + rand() * 0.5,
      );
      link(from, next, false);
      from = next;
    }
  }

  const adjacency: number[][] = nodes.map(() => []);
  edges.forEach((edge) => {
    adjacency[edge.a].push(edge.b);
    adjacency[edge.b].push(edge.a);
  });

  return { nodes, edges, adjacency, hubs };
}

/* A firing path: a walk along real filaments from one system toward another.
 * Walking the graph is what makes it read as a signal travelling through
 * something, rather than a dot sliding down a straight line.
 */
export function tracePath(graph: Graph, from: number, toward: number, maxSteps: number): number[] {
  const target = graph.nodes[toward];
  const path = [from];
  const visited = new Set<number>([from]);
  let current = from;
  for (let step = 0; step < maxSteps; step += 1) {
    const neighbours = graph.adjacency[current];
    if (!neighbours || !neighbours.length) break;
    let best = -1;
    let bestScore = Infinity;
    for (const n of neighbours) {
      if (visited.has(n)) continue;
      const node = graph.nodes[n];
      const dx = node.x - target.x;
      const dy = node.y - target.y;
      const dz = node.z - target.z;
      // Mostly toward the target, with enough noise to wander like a real path.
      const score = dx * dx + dy * dy + dz * dz + Math.random() * 0.35;
      if (score < bestScore) {
        bestScore = score;
        best = n;
      }
    }
    if (best < 0) break;
    visited.add(best);
    path.push(best);
    current = best;
    if (current === toward) break;
  }
  return path;
}
