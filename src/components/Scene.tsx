import type { MissionId, Motion } from "@/lib/missions/types";

interface SceneProps {
  missionId: MissionId;
  /** "result" plays the consequence; "idle" shows the starting situation. */
  mode: "idle" | "result";
  motion?: Motion;
  /** Bump to replay the animation (e.g. round 1 -> round 2). */
  playKey?: string;
}

/**
 * Original, flat SVG scenes in the same 1000x700 space as the drawing. The
 * scene never depicts the child's idea; the child's own strokes sit on top and
 * only the characters and weather react.
 */
export function Scene({ missionId, mode, motion = "steady", playKey }: SceneProps) {
  return (
    <svg
      className={`scene scene-${missionId} ${mode === "result" ? "is-result" : ""} motion-${motion}`}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      key={playKey}
    >
      {missionId === "river" && <RiverScene />}
      {missionId === "sprout" && <SproutScene />}
      {missionId === "fog" && <FogScene />}
    </svg>
  );
}

function RiverScene() {
  return (
    <>
      <rect width="1000" height="700" fill="#dcebe8" />
      <path d="M0 330 Q180 250 340 320 T700 300 T1000 310 V700 H0Z" fill="#bcd9c1" />
      <path d="M0 380 H340 Q310 520 345 700 H0Z" fill="#a8cf8f" />
      <path d="M1000 380 H665 Q690 520 655 700 H1000Z" fill="#a8cf8f" />
      <path d="M340 380 Q300 520 345 700 H655 Q690 520 665 380Z" fill="#7cc0c3" />
      <g className="ripples" fill="none" stroke="#f2fafa" strokeWidth="5" strokeLinecap="round">
        <path d="M385 450 q25 -14 50 0 t50 0" />
        <path d="M470 560 q25 -14 50 0 t50 0" />
        <path d="M395 640 q25 -14 50 0 t50 0" />
        <path d="M520 400 q20 -12 40 0 t40 0" />
      </g>
      {/* berry bush */}
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
      {/* snail */}
      <g className="hero">
        <g className="hero-body">
          <g transform="translate(300 0) scale(-1 1)">
          <ellipse cx="150" cy="470" rx="62" ry="15" fill="#d8b98a" />
          <circle cx="170" cy="432" r="38" fill="#e8a800" />
          <path d="M170 432 m-4 0 a10 10 0 1 1 10 10 a20 20 0 1 1 -22 -24 a30 30 0 1 1 46 34" fill="none" stroke="#8a5a14" strokeWidth="5" strokeLinecap="round" />
          <path d="M96 462 q-12 -34 -4 -56" fill="none" stroke="#d8b98a" strokeWidth="9" strokeLinecap="round" />
          <circle cx="92" cy="404" r="6" fill="#1f2a5c" />
          <path d="M108 460 q-8 -30 6 -48" fill="none" stroke="#d8b98a" strokeWidth="9" strokeLinecap="round" />
          <circle cx="114" cy="410" r="6" fill="#1f2a5c" />
          </g>
        </g>
      </g>
    </>
  );
}

function SproutScene() {
  return (
    <>
      <rect width="1000" height="700" fill="#cdd8df" />
      <g className="clouds" fill="#9fb2c0">
        <ellipse cx="220" cy="120" rx="130" ry="46" />
        <ellipse cx="320" cy="96" rx="90" ry="44" />
        <ellipse cx="720" cy="150" rx="150" ry="50" />
        <ellipse cx="820" cy="118" rx="90" ry="42" />
      </g>
      <g className="wind" fill="none" stroke="#f2f6f8" strokeWidth="6" strokeLinecap="round">
        <path d="M80 280 q60 -30 120 0 t110 -6" />
        <path d="M600 250 q70 -34 130 0 t120 -8" />
        <path d="M120 360 q50 -22 100 0" />
      </g>
      <g className="rain" stroke="#6f90b4" strokeWidth="4" strokeLinecap="round">
        {[150, 230, 310, 390, 470, 560, 640, 720, 800, 880].map((x, i) => (
          <path key={x} d={`M${x} ${200 + (i % 3) * 40} l-12 34`} />
        ))}
      </g>
      <path d="M-40 560 Q260 380 520 430 T1040 400 V700 H-40Z" fill="#a8cf8f" />
      <path d="M-40 640 Q300 520 560 560 T1040 540 V700 H-40Z" fill="#8bbf78" />
      <g className="hero">
        <g className="hero-body">
          <path d="M500 520 q-4 -60 0 -120" fill="none" stroke="#3f7a34" strokeWidth="12" strokeLinecap="round" />
          <path d="M500 430 q-70 -34 -92 -88 q64 -6 92 88Z" fill="#5fa04f" />
          <path d="M500 410 q60 -40 90 -96 q-70 0 -90 96Z" fill="#79ad66" />
          <ellipse cx="500" cy="526" rx="50" ry="12" fill="#7a5a3a" />
        </g>
      </g>
    </>
  );
}

function FogScene() {
  return (
    <>
      <rect width="1000" height="700" fill="#e4ebe8" />
      <path d="M0 360 Q200 290 420 350 T1000 330 V700 H0Z" fill="#c4d9c6" />
      <path d="M0 450 Q260 390 520 450 T1000 430 V700 H0Z" fill="#a8cf8f" />
      <path d="M-20 620 C200 560 300 540 420 520 C520 505 560 470 650 440 S850 420 1020 430" fill="none" stroke="#efe0b0" strokeWidth="58" strokeLinecap="round" />
      <path d="M420 520 C470 560 560 590 700 570" fill="none" stroke="#efe0b0" strokeWidth="40" strokeLinecap="round" />
      {/* village */}
      <g>
        <rect x="820" y="330" width="70" height="60" fill="#c98b6b" />
        <path d="M810 332 L855 290 L900 332Z" fill="#8a5a46" />
        <rect x="840" y="352" width="18" height="22" fill="#e8a800" />
        <rect x="905" y="350" width="60" height="50" fill="#d6a483" />
        <path d="M897 352 L935 316 L973 352Z" fill="#8a5a46" />
        <rect x="925" y="368" width="16" height="20" fill="#e8a800" />
      </g>
      {/* Bix */}
      <g className="hero">
        <g className="hero-body">
          <ellipse cx="130" cy="600" rx="38" ry="9" fill="#00000022" />
          <path d="M100 590 q30 -90 60 0Z" fill="#2478b8" />
          <circle cx="130" cy="520" r="24" fill="#f0d2a8" />
          <path d="M104 512 q26 -44 52 0Z" fill="#b3264f" />
          <circle cx="122" cy="522" r="3.5" fill="#1f2a5c" />
          <circle cx="139" cy="522" r="3.5" fill="#1f2a5c" />
        </g>
      </g>
      <g className="fog" fill="#ffffff">
        <ellipse cx="260" cy="470" rx="260" ry="46" opacity=".75" />
        <ellipse cx="700" cy="560" rx="300" ry="50" opacity=".7" />
        <ellipse cx="520" cy="400" rx="280" ry="40" opacity=".65" />
        <ellipse cx="160" cy="620" rx="200" ry="36" opacity=".7" />
      </g>
    </>
  );
}
