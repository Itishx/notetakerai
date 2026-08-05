import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from "lucide-react";
import { BRAINO_WALKER_SVG } from "./brainoWalkerSvg";

type Phase = "running" | "over";
type Direction = "left" | "right";

type CourseObject = {
  el: HTMLSpanElement;
  segment: number;
  x: number;
  width: number;
  height: number;
  bottom: number;
  lethalSide: boolean;
  pipe: boolean;
};

type CourseCoin = {
  el: HTMLSpanElement;
  segment: number;
  x: number;
  bottom: number;
  collected: boolean;
};

type CourseSegment = {
  el: HTMLDivElement;
  id: number;
  start: number;
};

const GROUND_HEIGHT = 50;
const PLAYER_WIDTH = 64;
const PLAYER_HEIGHT = 70;
const STORAGE_KEY = "braino-footer-best-v1";

const FOOTER_BRAINO_SVG = BRAINO_WALKER_SVG
  .replace(/__sbwk_/g, "__bfg_")
  .replace(/sbwk-/g, "bfg-")
  .replace(/sbb-/g, "bfg-");

function endLine(score: number) {
  if (score < 100) return "That pipe had excellent timing.";
  if (score < 250) return "Okay. The next run is personal.";
  if (score < 500) return "You made the footer feel enormous.";
  if (score < 900) return "I could have kept going all day.";
  return "That was not a footer. That was a journey.";
}

function readBestScore() {
  if (typeof window === "undefined") return 0;
  const stored = Number(window.localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(stored) ? stored : 0;
}

export default function BrainoFooterGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef({ jump: () => {}, restart: () => {} });
  const inputRef = useRef({ left: false, right: false });
  const phaseRef = useRef<Phase>("running");
  const [phase, setPhase] = useState<Phase>("running");
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [best, setBest] = useState(readBestScore);
  const [brainoLine, setBrainoLine] = useState("");

  useEffect(() => {
    const game = gameRef.current;
    const world = worldRef.current;
    const ground = groundRef.current;
    const player = playerRef.current;
    if (!game || !world || !ground || !player) return;

    const root = player.querySelector("#__bfg_root__");
    const leftLeg = player.querySelector("#__bfg_ll__");
    const rightLeg = player.querySelector("#__bfg_rl__");
    const segmentWidth = Math.max(1900, game.clientWidth * 1.55);
    let segments: CourseSegment[] = [];
    let objects: CourseObject[] = [];
    let courseCoins: CourseCoin[] = [];
    let nextSegmentStart = 0;
    let nextSegmentId = 0;
    let worldOffset = 0;
    let playerX = Math.max(52, game.clientWidth * 0.16);
    let playerY = 0;
    let velocityY = 0;
    let grounded = true;
    let lastGroundedAt = performance.now();
    let jumpQueuedUntil = 0;
    let coinCount = 0;
    let pipeDive: {
      elapsed: number;
      startY: number;
      startX: number;
      targetX: number;
      warped: boolean;
    } | null = null;
    let inView = false;
    let raf = 0;
    let lastTime = performance.now();
    let lastScore = -1;

    const addDecoration = (
      segment: HTMLDivElement,
      className: string,
      left: number,
      styles: Partial<CSSStyleDeclaration> = {},
    ) => {
      const el = document.createElement("span");
      el.className = className;
      el.style.left = `${left}px`;
      Object.assign(el.style, styles);
      segment.appendChild(el);
      return el;
    };

    const addObject = (
      segment: CourseSegment,
      className: string,
      left: number,
      width: number,
      height: number,
      bottom: number,
      lethalSide = false,
      pipe = false,
      text = "",
    ) => {
      const el = document.createElement("span");
      el.className = className;
      el.style.left = `${left}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.bottom = `${GROUND_HEIGHT + bottom}px`;
      if (text) el.textContent = text;
      segment.el.appendChild(el);
      objects.push({
        el,
        segment: segment.id,
        x: segment.start + left,
        width,
        height,
        bottom,
        lethalSide,
        pipe,
      });
    };

    const addCoin = (segment: CourseSegment, left: number, bottom: number) => {
      const el = document.createElement("span");
      el.className = "bf-coin-pixel";
      el.style.left = `${left}px`;
      el.style.bottom = `${GROUND_HEIGHT + bottom}px`;
      segment.el.appendChild(el);
      courseCoins.push({
        el,
        segment: segment.id,
        x: segment.start + left,
        bottom,
        collected: false,
      });
    };

    const createSegment = (isFirst = false) => {
      const id = nextSegmentId++;
      const start = nextSegmentStart;
      const el = document.createElement("div");
      el.className = "bf-course-segment";
      el.style.left = `${start}px`;
      el.style.width = `${segmentWidth}px`;
      world.appendChild(el);
      const segment = { el, id, start };
      segments.push(segment);

      addDecoration(el, "bf-cloudy", segmentWidth * 0.1, { top: "28px" });
      addDecoration(el, "bf-cloudy", segmentWidth * 0.42, { top: "62px", transform: "scale(.82)" });
      addDecoration(el, "bf-cloudy", segmentWidth * 0.71, { top: "24px", transform: "scale(1.15)" });
      addDecoration(el, "bf-hill", segmentWidth * 0.03, { width: "132px", height: "70px" });
      addDecoration(el, "bf-hill", segmentWidth * 0.48, { width: "106px", height: "56px" });
      addDecoration(el, "bf-hill", segmentWidth * 0.78, { width: "126px", height: "66px" });

      const base = isFirst ? Math.max(760, game.clientWidth * 0.78) : 100;
      const lift = id % 2 === 0 ? 0 : 10;
      addObject(segment, "bf-qblock", base, 38, 38, 26, false, false, "?");
      addObject(segment, "bf-pipe", base + 190, 58, 66 + lift, 0, true, true);
      addObject(segment, "bf-bricks", base + 360, 182, 34, 32);
      addObject(segment, "bf-qblock", base + 430, 38, 38, 92, false, false, "?");
      addObject(segment, "bf-bricks", base + 650, 220, 34, 56 + lift);
      addObject(segment, "bf-qblock", base + 730, 38, 38, 114 + lift, false, false, "?");
      addObject(segment, "bf-pipe", base + 970, 58, 84, 0, true, true);

      addCoin(segment, base + 386, 88);
      addCoin(segment, base + 426, 112);
      addCoin(segment, base + 466, 122);
      addCoin(segment, base + 506, 112);
      addCoin(segment, base + 546, 88);
      addCoin(segment, base + 682, 126 + lift);
      addCoin(segment, base + 730, 150 + lift);
      addCoin(segment, base + 778, 126 + lift);

      const castle = addDecoration(el, "bf-castle", segmentWidth - 180, {
        right: "auto",
        bottom: `${GROUND_HEIGHT}px`,
      });
      castle.classList.add("bf-castle-scenery");
      nextSegmentStart += segmentWidth;
    };

    const resetCourse = () => {
      world.replaceChildren();
      segments = [];
      objects = [];
      courseCoins = [];
      nextSegmentStart = 0;
      nextSegmentId = 0;
      worldOffset = 0;
      playerX = Math.max(52, game.clientWidth * 0.16);
      playerY = 0;
      velocityY = 0;
      grounded = true;
      lastGroundedAt = performance.now();
      jumpQueuedUntil = 0;
      coinCount = 0;
      pipeDive = null;
      game.classList.remove("is-pipe-diving");
      inputRef.current.left = false;
      inputRef.current.right = false;
      createSegment(true);
      createSegment();
      world.style.transform = "translate3d(0, 0, 0)";
      ground.style.backgroundPositionX = "0px";
      player.style.transform = `translate3d(${playerX}px, 0, 0)`;
      setScore(0);
      setCoins(0);
      setBrainoLine("");
      lastScore = -1;
    };

    const finishRun = () => {
      if (phaseRef.current === "over") return;
      phaseRef.current = "over";
      setPhase("over");
      const finalScore = Math.max(0, Math.floor(worldOffset / 11) + coinCount * 25);
      setScore(finalScore);
      setBrainoLine(endLine(finalScore));
      setBest((currentBest) => {
        const nextBest = Math.max(currentBest, finalScore);
        try { window.localStorage.setItem(STORAGE_KEY, String(nextBest)); } catch { /* storage blocked */ }
        return nextBest;
      });
    };

    const restart = () => {
      resetCourse();
      phaseRef.current = "running";
      setPhase("running");
      lastTime = performance.now();
    };

    const jump = () => {
      if (phaseRef.current !== "running") return;
      const now = performance.now();
      jumpQueuedUntil = now + 180;
      if (!grounded && now - lastGroundedAt > 150) return;
      grounded = false;
      velocityY = 760;
      jumpQueuedUntil = 0;
    };

    actionRef.current = { jump, restart };
    resetCourse();

    const onKeyDown = (event: KeyboardEvent) => {
      if (!inView) return;
      if (event.key === "ArrowLeft") inputRef.current.left = true;
      else if (event.key === "ArrowRight") inputRef.current.right = true;
      else if (event.key === "ArrowUp" || event.key === " ") jump();
      else return;
      event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") inputRef.current.left = false;
      if (event.key === "ArrowRight") inputRef.current.right = false;
    };
    const onGamePointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest(".bf-game-controls")) return;
      jump();
    };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    game.addEventListener("pointerdown", onGamePointerDown);

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting && entry.intersectionRatio > 0.15;
        document.documentElement.classList.toggle("bf-footer-game-visible", inView);
        lastTime = performance.now();
      },
      { threshold: [0, 0.15, 0.5] },
    );
    observer.observe(game);

    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - lastTime) / 1000);
      lastTime = now;

      if (inView && phaseRef.current === "running") {
        const currentScore = Math.floor(worldOffset / 11) + coinCount * 25;
        const speed = 205 + Math.min(145, currentScore * 0.16);

        if (pipeDive) {
          pipeDive.elapsed += dt;
          const sinkProgress = Math.min(1, pipeDive.elapsed / 0.62);
          playerX = pipeDive.startX + (pipeDive.targetX - pipeDive.startX) * sinkProgress;
          playerY = pipeDive.startY - (pipeDive.startY + PLAYER_HEIGHT + 8) * sinkProgress;

          if (sinkProgress >= 1 && !pipeDive.warped) {
            pipeDive.warped = true;
            worldOffset += 780;
            coinCount += 3;
            setCoins(coinCount);
          }
          if (pipeDive.elapsed >= 0.92) {
            playerY = 180;
            velocityY = -40;
            grounded = false;
            pipeDive = null;
            game.classList.remove("is-pipe-diving");
          }
        } else {
          worldOffset += speed * dt;

          const horizontal =
            (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
          playerX += horizontal * 230 * dt;
          playerX = Math.max(20, Math.min(game.clientWidth - PLAYER_WIDTH - 20, playerX));

          const previousY = playerY;
          velocityY -= 1650 * dt;
          playerY += velocityY * dt;

          const playerLeft = playerX + 9;
          const playerRight = playerX + PLAYER_WIDTH - 9;
          let landingSurface = 0;
          let hitPipe = false;

          for (const object of objects) {
            const screenX = object.x - worldOffset;
            if (screenX > game.clientWidth + 120 || screenX + object.width < -120) continue;
            const overlapsX = playerRight > screenX + 4 && playerLeft < screenX + object.width - 4;
            if (!overlapsX) continue;

            const objectTop = object.bottom + object.height;
            if (velocityY <= 0 && previousY >= objectTop - 5 && playerY <= objectTop + 7) {
              landingSurface = Math.max(landingSurface, objectTop);
              continue;
            }

            const playerTop = playerY + PLAYER_HEIGHT;
            const overlapsY = playerTop > object.bottom + 7 && playerY < objectTop - 7;
            if (
              object.lethalSide && overlapsY && playerY < objectTop - 18
              && playerRight > screenX + 14 && playerLeft < screenX + object.width - 14
            ) hitPipe = true;
          }

          if (landingSurface > 0 && velocityY <= 0) {
            playerY = landingSurface;
            velocityY = 0;
            grounded = true;
            lastGroundedAt = now;
          } else if (playerY <= 0) {
            playerY = 0;
            velocityY = 0;
            grounded = true;
            lastGroundedAt = now;
          } else {
            grounded = false;
          }

          if (jumpQueuedUntil >= now && grounded) {
            grounded = false;
            velocityY = 760;
            jumpQueuedUntil = 0;
          }

          for (const coin of courseCoins) {
            if (coin.collected) continue;
            const coinX = coin.x - worldOffset;
            const overlapsX = playerRight > coinX && playerLeft < coinX + 20;
            const overlapsY = playerY + PLAYER_HEIGHT > coin.bottom && playerY < coin.bottom + 24;
            if (!overlapsX || !overlapsY) continue;
            coin.collected = true;
            coin.el.classList.add("collected");
            coinCount += 1;
            setCoins(coinCount);
          }

          // Pipes are obstacles, not instant deaths. A late jump gets a small
          // forgiving bounce so the course stays playful on touch screens.
          if (hitPipe && playerY < 24) {
            grounded = false;
            velocityY = Math.max(velocityY, 640);
            playerY = Math.max(playerY, 8);
          }
        }

        while (nextSegmentStart - worldOffset < game.clientWidth * 2.2) createSegment();
        if (segments.length && segments[0].start + segmentWidth < worldOffset - 160) {
          const expired = segments.shift();
          if (expired) {
            expired.el.remove();
            objects = objects.filter((object) => object.segment !== expired.id);
            courseCoins = courseCoins.filter((coin) => coin.segment !== expired.id);
          }
        }

        world.style.transform = `translate3d(${-worldOffset}px, 0, 0)`;
        ground.style.backgroundPositionX = `${-worldOffset}px`;
        player.style.transform = `translate3d(${playerX}px, ${-playerY}px, 0)`;

        const stride = Math.sin(worldOffset / 18);
        leftLeg?.setAttribute("transform", `translate(0 ${Math.max(0, stride) * -6}) rotate(${stride * 9} 44 74)`);
        rightLeg?.setAttribute("transform", `translate(0 ${Math.max(0, -stride) * -6}) rotate(${-stride * 9} 56 74)`);
        root?.setAttribute("transform", `rotate(${stride * 1.8} 50 54)`);

        if (currentScore !== lastScore) {
          lastScore = currentScore;
          setScore(currentScore);
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.documentElement.classList.remove("bf-footer-game-visible");
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      game.removeEventListener("pointerdown", onGamePointerDown);
    };
  }, []);

  const pressDirection = (direction: Direction) => (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    inputRef.current[direction] = true;
    gameRef.current?.focus();
  };

  const releaseDirection = (direction: Direction) => (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    inputRef.current[direction] = false;
  };

  const pressJump = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    gameRef.current?.focus();
    actionRef.current.jump();
  };

  return (
    <div
      className={`bf-playstrip is-${phase}`}
      ref={gameRef}
      role="region"
      tabIndex={0}
      aria-label="Endless Braino platform game"
    >
      <div className="bf-game-hud">
        <span>POINTS {String(score).padStart(5, "0")}</span>
        <span className="bf-game-coin-count"><i aria-hidden="true" /> x {String(coins).padStart(2, "0")}</span>
        <span>BEST {String(best).padStart(5, "0")}</span>
      </div>

      <div className="bf-course-world" ref={worldRef} />
      <div className="bf-ground2" ref={groundRef} />

      <div className="bf-game-braino" ref={playerRef}>
        {phase === "over" ? (
          <div className="bf-braino-says" role="status">
            <strong>Braino says</strong>
            <span>{brainoLine}</span>
            <small>{score} points</small>
          </div>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: FOOTER_BRAINO_SVG }} />
      </div>

      <div className="bf-game-controls" aria-label="Game controls">
        <button
          type="button"
          aria-label="Move Braino left"
          onPointerDown={pressDirection("left")}
          onPointerUp={releaseDirection("left")}
          onPointerCancel={releaseDirection("left")}
        >
          <ArrowLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Jump"
          onPointerDown={pressJump}
        >
          <ArrowUp aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Move Braino right"
          onPointerDown={pressDirection("right")}
          onPointerUp={releaseDirection("right")}
          onPointerCancel={releaseDirection("right")}
        >
          <ArrowRight aria-hidden="true" />
        </button>
        {phase === "over" ? (
          <button
            type="button"
            className="bf-game-restart"
            aria-label="Restart the game"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => actionRef.current.restart()}
          >
            <RotateCcw aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
