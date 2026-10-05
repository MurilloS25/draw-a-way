import type { CapabilityOrUnknown } from "@/lib/capabilities";
import { HERO_START } from "@/lib/drawing/layers";
import type { SceneIndex } from "@/lib/missions/engine";
import type { Level, MissionId, Mood } from "@/lib/missions/types";

export type MotionStyle = "steady" | "bouncy" | "float" | "swing";

/** How the character moves, chosen from what the child confirmed. Decoration only. */
export function motionFor(caps: readonly CapabilityOrUnknown[]): MotionStyle {
  if (caps.includes("floats") || caps.includes("carries_someone")) return "float";
  if (caps.includes("flies")) return "swing";
  if (caps.includes("rolls") || caps.includes("pushes_or_pulls")) return "bouncy";
  return "steady";
}

/** Full travel of the hero (and of a friend, when the scene has one) in logical units. */
const HERO_MOVE: Record<MissionId, [[number, number], [number, number], [number, number]]> = {
  river: [
    [640, 0],
    [-560, 0],
    [290, 50],
  ],
  sprout: [
    [0, 0],
    [530, -70],
    [0, 0],
  ],
  fog: [
    [700, -150],
    [560, -200],
    [-120, 0],
  ],
};
const FRIEND_START: Partial<Record<MissionId, Record<number, [number, number]>>> = {
  river: { 2: [450, 520] },
  fog: { 2: [210, 470] },
};
const FRIEND_MOVE: Partial<Record<MissionId, Record<number, [number, number]>>> = {
  river: { 2: [-300, -50] },
  fog: { 2: [560, 70] },
};

interface Props {
  missionId: MissionId;
  scene: SceneIndex;
  /** "result" plays the consequence; "idle" shows the starting situation. */
  mode: "idle" | "result";
  level?: Level;
  mood: Mood;
  motion?: MotionStyle;
  /** Changes when the animation should replay. */
  playKey?: string;
}

const END_WEATHER: Record<Level, number> = { full: 0.1, partial: 0.45, neutral: 0.7 };

/**
 * Original flat SVG scenes in the same 1000x700 space as the drawing. The
 * scene never depicts the child's idea; the child's own strokes sit on top and
 * the character, friend, and weather react to what the child confirmed.
 */
export function Backdrop({ missionId, scene, mode, level = "neutral", mood, motion = "steady", playKey }: Props) {
  const start = HERO_START[missionId][scene];
  const frac = level === "full" ? 1 : level === "partial" ? 0.6 : 0.3;
  const [mx, my] = HERO_MOVE[missionId][scene];
  const fs = FRIEND_START[missionId]?.[scene];
  const [fx, fy] = FRIEND_MOVE[missionId]?.[scene] ?? [0, 0];
  const style = {
    "--dx": `${Math.round(mx * frac)}px`,
    "--dy": `${Math.round(my * frac)}px`,
    "--fx": `${Math.round(fx * frac)}px`,
    "--fy": `${Math.round(fy * frac)}px`,
    "--weather-end": String(END_WEATHER[level]),
  } as React.CSSProperties;
  const flip = missionId === "river" && scene === 1;

  return (
    <svg
      key={playKey}
      className={`scene scene-${missionId} chapter-${scene} ${mode === "result" ? "is-result" : ""} motion-${motion} level-${level}`}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      {missionId === "river" && <RiverWorld scene={scene} />}
      {missionId === "sprout" && <SproutWorld scene={scene} />}
      {missionId === "fog" && <FogWorld scene={scene} />}
      {fs && (
        <g transform={`translate(${fs[0]} ${fs[1]})`}>
          <g className="friend">{missionId === "river" ? <Pip /> : <Rue />}</g>
        </g>
      )}
      <g transform={`translate(${start.x} ${start.y})`}>
        <g className="hero">
          <g className="hero-body">
            <g transform={flip ? "scale(-1 1)" : undefined}>
              {missionId === "river" && <Mossy mood={mood} berry={scene === 1} />}
              {missionId === "sprout" && <Sprig mood={mood} />}
              {missionId === "fog" && <Bix mood={mood} />}
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

const MOUTH: Record<Mood, string> = {
  hopeful: "M-8 0 q8 6 16 0",
  happy: "M-10 -1 q10 12 20 0",
  unsure: "M-9 3 q4.5 -5 9 0 t9 0",
  curious: "M-3 1 a3 3 0 1 0 6 0 a3 3 0 1 0 -6 0",
};

function Face({ mood, x, y }: { mood: Mood; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="-9" cy="-9" r="3.6" fill="#1f2a5c" />
      <circle cx="9" cy="-9" r="3.6" fill="#1f2a5c" />
      {mood === "unsure" && <path d="M-14 -17 l9 3 M14 -17 l-9 3" stroke="#1f2a5c" strokeWidth="2.5" strokeLinecap="round" />}
      <path
        d={MOUTH[mood]}
        fill={mood === "curious" ? "#1f2a5c" : "none"}
        stroke="#1f2a5c"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Mossy the snail, facing right, origin at the foot. */
function Mossy({ mood, berry }: { mood: Mood; berry: boolean }) {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="64" ry="15" fill="#d8b98a" />
      <circle cx="-18" cy="-38" r="38" fill="#e8a800" />
      <path
        d="M-18 -38 m-4 0 a10 10 0 1 1 10 10 a20 20 0 1 1 -22 -24 a30 30 0 1 1 46 34"
        fill="none"
        stroke="#8a5a14"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M44 -6 q14 -6 14 -30" fill="none" stroke="#d8b98a" strokeWidth="14" strokeLinecap="round" />
      <path
        d={mood === "unsure" ? "M44 -34 q-8 -22 4 -36" : "M44 -34 q-2 -22 6 -38"}
        fill="none"
        stroke="#d8b98a"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <circle cx={mood === "unsure" ? 48 : 50} cy="-72" r="6" fill="#1f2a5c" />
      <g transform="translate(52 -26) scale(0.55)">
        <path
          d={MOUTH[mood]}
          fill={mood === "curious" ? "#1f2a5c" : "none"}
          stroke="#1f2a5c"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      {berry && <circle cx="-30" cy="-62" r="10" fill="#b3264f" />}
    </g>
  );
}

/** Sprig the sprout, origin at the soil. */
function Sprig({ mood }: { mood: Mood }) {
  const droop = mood === "unsure";
  return (
    <g>
      <ellipse cx="0" cy="6" rx="50" ry="12" fill="#7a5a3a" />
      <path d="M0 0 q-3 -50 0 -100" fill="none" stroke="#3f7a34" strokeWidth="12" strokeLinecap="round" />
      <g transform={droop ? "rotate(18 0 -70)" : undefined}>
        <path d="M0 -70 q-70 -34 -92 -88 q64 -6 92 88z" fill="#5fa04f" />
      </g>
      <g transform={droop ? "rotate(-18 0 -70)" : undefined}>
        <path d="M0 -80 q60 -40 90 -96 q-70 0 -90 96z" fill="#79ad66" />
      </g>
      <circle cx="0" cy="-104" r="20" fill="#8cc070" />
      <Face mood={mood} x={0} y={-102} />
    </g>
  );
}

/** Bix the traveler, origin at the feet. */
function Bix({ mood }: { mood: Mood }) {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="38" ry="9" fill="#00000022" />
      <path d="M-30 -2 q30 -92 60 0z" fill="#2478b8" />
      <circle cx="0" cy="-82" r="25" fill="#f0d2a8" />
      <path d="M-27 -90 q27 -46 54 0z" fill="#b3264f" />
      <Face mood={mood} x={0} y={-76} />
    </g>
  );
}

function Pip() {
  return (
    <g>
      <ellipse cx="0" cy="-14" rx="24" ry="17" fill="#f2cf3a" />
      <circle cx="16" cy="-34" r="13" fill="#f2cf3a" />
      <path d="M26 -34 l14 4 l-14 5z" fill="#e07a2f" />
      <circle cx="19" cy="-37" r="2.6" fill="#1f2a5c" />
    </g>
  );
}

function Rue() {
  return (
    <g>
      <ellipse cx="0" cy="-20" rx="34" ry="22" fill="#8a6a4a" />
      <path
        d="M-30 -30 l-8 -10 M-18 -40 l-4 -12 M-4 -44 l0 -12 M10 -42 l4 -12 M22 -34 l8 -10"
        stroke="#5c4330"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <ellipse cx="32" cy="-14" rx="12" ry="9" fill="#e6cba5" />
      <circle cx="38" cy="-17" r="2.6" fill="#1f2a5c" />
    </g>
  );
}

function RiverWorld({ scene }: { scene: SceneIndex }) {
  const stormy = scene === 1;
  const evening = scene === 2;
  return (
    <>
      <rect width="1000" height="700" fill={stormy ? "#c9d7d8" : evening ? "#f1dfbd" : "#dcebe8"} />
      <path d="M0 330 Q180 250 340 320 T700 300 T1000 310 V700 H0Z" fill={evening ? "#d9d3a8" : "#bcd9c1"} />
      <path d="M0 380 H340 Q310 520 345 700 H0Z" fill="#a8cf8f" />
      <path d="M1000 380 H665 Q690 520 655 700 H1000Z" fill="#a8cf8f" />
      <path d="M340 380 Q300 520 345 700 H655 Q690 520 665 380Z" fill={stormy ? "#6aa3a8" : "#7cc0c3"} />
      <g className="ripples" fill="none" stroke="#f2fafa" strokeWidth="5" strokeLinecap="round">
        <path d="M385 450 q25 -14 50 0 t50 0" />
        <path d="M470 600 q25 -14 50 0 t50 0" />
        <path d="M395 650 q25 -14 50 0 t50 0" />
        {stormy && (
          <g strokeWidth="6">
            <path d="M390 420 l30 10 l-30 10" />
            <path d="M560 480 l30 10 l-30 10" />
            <path d="M420 560 l30 10 l-30 10" />
          </g>
        )}
      </g>
      {stormy && (
        <g className="weather" fill="none" stroke="#f4f8f8" strokeWidth="6" strokeLinecap="round">
          <path d="M60 140 q60 -30 120 0 t110 -6" />
          <path d="M560 110 q70 -34 130 0 t120 -8" />
          <path d="M300 220 q50 -22 100 0" />
        </g>
      )}
      {evening && <circle cx="860" cy="130" r="46" fill="#f2b632" opacity=".85" />}
      {evening && <ellipse cx="450" cy="545" rx="60" ry="22" fill="#9a9a94" />}
      <g>
        <circle cx="860" cy="360" r="62" fill="#6a9e58" />
        <circle cx="810" cy="395" r="48" fill="#79ad66" />
        <circle cx="905" cy="395" r="46" fill="#79ad66" />
        <g fill="#b3264f">
          <circle cx="840" cy="350" r="9" />
          <circle cx="885" cy="375" r="9" />
          <circle cx="815" cy="400" r="9" />
          <circle cx="900" cy="410" r="9" />
          <circle cx="862" cy="322" r="9" />
        </g>
      </g>
    </>
  );
}

function SproutWorld({ scene }: { scene: SceneIndex }) {
  const stormy = scene === 0;
  const dusk = scene === 2;
  return (
    <>
      <rect width="1000" height="700" fill={stormy ? "#cdd8df" : dusk ? "#7d8fb5" : "#dbe9ef"} />
      {dusk && (
        <g fill="#fff6d0">
          <circle cx="140" cy="90" r="4" />
          <circle cx="330" cy="150" r="3" />
          <circle cx="620" cy="70" r="4" />
          <circle cx="860" cy="130" r="3" />
          <circle cx="480" cy="190" r="3" />
        </g>
      )}
      {scene === 1 && <circle cx="860" cy="110" r="56" fill="#f2c94c" />}
      {(stormy || scene === 1) && (
        <g className="clouds" fill={stormy ? "#9fb2c0" : "#eef3f6"}>
          <ellipse cx="220" cy="120" rx="130" ry="46" />
          <ellipse cx="320" cy="96" rx="90" ry="44" />
          {stormy && <ellipse cx="720" cy="150" rx="150" ry="50" />}
          {stormy && <ellipse cx="820" cy="118" rx="90" ry="42" />}
        </g>
      )}
      {stormy && (
        <>
          <g className="weather" fill="none" stroke="#f2f6f8" strokeWidth="6" strokeLinecap="round">
            <path d="M80 280 q60 -30 120 0 t110 -6" />
            <path d="M600 250 q70 -34 130 0 t120 -8" />
            <path d="M120 360 q50 -22 100 0" />
          </g>
          <g className="rain" stroke="#6f90b4" strokeWidth="4" strokeLinecap="round">
            {[150, 230, 310, 390, 470, 560, 640, 720, 800, 880].map((x, i) => (
              <path key={x} d={`M${x} ${200 + (i % 3) * 40} l-12 34`} />
            ))}
          </g>
        </>
      )}
      <path d="M-40 560 Q260 380 520 430 T1040 400 V700 H-40Z" fill={dusk ? "#6f9a78" : "#a8cf8f"} />
      <path d="M-40 640 Q300 520 560 560 T1040 540 V700 H-40Z" fill={dusk ? "#5b8764" : "#8bbf78"} />
      {scene === 1 && (
        <>
          <path d="M360 600 Q470 560 560 600 Q640 640 560 690 L380 690Z" fill="#8a6a4a" />
          <g stroke="#6b5036" strokeWidth="5" strokeLinecap="round" fill="none">
            <path d="M420 630 q20 -12 40 0" />
            <path d="M500 650 q20 -12 40 0" />
          </g>
          <path d="M700 520 q60 -40 160 -20 q60 30 20 70 L700 590Z" fill="#c4de9b" />
        </>
      )}
      {dusk && (
        <g stroke="#456a52" strokeWidth="5" strokeLinecap="round" fill="none">
          <path d="M620 560 l50 14 M700 590 l50 14 M560 600 l40 12" />
        </g>
      )}
    </>
  );
}

function FogWorld({ scene }: { scene: SceneIndex }) {
  const heavy = scene === 0;
  return (
    <>
      <rect width="1000" height="700" fill={scene === 2 ? "#e9dfce" : "#e4ebe8"} />
      <path d="M0 360 Q200 290 420 350 T1000 330 V700 H0Z" fill="#c4d9c6" />
      <path d="M0 450 Q260 390 520 450 T1000 430 V700 H0Z" fill="#a8cf8f" />
      {scene === 0 && (
        <>
          <path
            d="M-20 620 C200 560 300 540 420 520 C520 505 560 470 650 440 S850 420 1020 430"
            fill="none"
            stroke="#efe0b0"
            strokeWidth="58"
            strokeLinecap="round"
          />
          <path d="M420 520 C470 560 560 590 700 570" fill="none" stroke="#efe0b0" strokeWidth="40" strokeLinecap="round" />
        </>
      )}
      {scene === 1 && (
        <>
          <path d="M-20 640 C150 620 260 590 400 540" fill="none" stroke="#efe0b0" strokeWidth="56" strokeLinecap="round" />
          <path d="M400 540 C520 500 640 430 760 390" fill="none" stroke="#efe0b0" strokeWidth="46" strokeLinecap="round" />
          <path d="M400 540 C520 580 640 590 780 600" fill="none" stroke="#efe0b0" strokeWidth="46" strokeLinecap="round" />
          <path d="M600 470 q20 30 14 70" fill="none" stroke="#7cc0c3" strokeWidth="26" strokeLinecap="round" />
          <path d="M590 462 l40 -6 M606 538 l40 -4" stroke="#e4ebe8" strokeWidth="14" />
        </>
      )}
      {scene === 2 && (
        <>
          <path
            d="M120 690 C240 640 340 600 470 600 C620 600 720 570 840 560"
            fill="none"
            stroke="#efe0b0"
            strokeWidth="56"
            strokeLinecap="round"
          />
          <ellipse cx="210" cy="480" rx="70" ry="48" fill="#9a9a94" />
          <path d="M740 380 h160 v-40" fill="none" stroke="#8a5a46" strokeWidth="10" />
        </>
      )}
      <g>
        <rect x="820" y="330" width="70" height="60" fill="#c98b6b" />
        <path d="M810 332 L855 290 L900 332Z" fill="#8a5a46" />
        <rect x="840" y="352" width="18" height="22" fill="#e8a800" />
        <rect x="905" y="350" width="60" height="50" fill="#d6a483" />
        <path d="M897 352 L935 316 L973 352Z" fill="#8a5a46" />
        <rect x="925" y="368" width="16" height="20" fill="#e8a800" />
      </g>
      <g className="fog" fill="#ffffff" opacity={heavy ? 0.75 : scene === 1 ? 0.5 : 0.25}>
        <ellipse cx="260" cy="470" rx="260" ry="46" />
        <ellipse cx="700" cy="560" rx="300" ry="50" />
        <ellipse cx="520" cy="400" rx="280" ry="40" />
        <ellipse cx="160" cy="620" rx="200" ry="36" />
      </g>
    </>
  );
}
