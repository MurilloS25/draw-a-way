import type { Decision, SceneIndex } from "../missions/engine";
import { persistentKinds } from "../missions/engine";
import type { MissionId } from "../missions/types";
import { CANVAS_H, CANVAS_W, clamp, type Stroke } from "./model";

/**
 * Canvas layers, bottom to top:
 *   1. scene backdrop (SVG, never edited, never stored)
 *   2. persistent layer: earlier scenes' strokes that stay in the story
 *   3. the child's current strokes (canvas)
 *   4. interface (cursor, controls; never in any raster)
 */
export interface Point {
  x: number;
  y: number;
}

/** Where the hero stands at the start of each scene (logical units). */
export const HERO_START: Record<MissionId, [Point, Point, Point]> = {
  river: [
    { x: 150, y: 470 },
    { x: 760, y: 470 },
    { x: 150, y: 470 },
  ],
  sprout: [
    { x: 500, y: 520 },
    { x: 250, y: 540 },
    { x: 780, y: 470 },
  ],
  fog: [
    { x: 130, y: 600 },
    { x: 200, y: 610 },
    { x: 800, y: 540 },
  ],
};

export const COMPANION_SCALE = 0.28;

/** Top-left of the miniature drawing that travels with the hero. */
export function companionAt(missionId: MissionId, scene: SceneIndex): { x: number; y: number; scale: number } {
  const h = HERO_START[missionId][scene];
  return {
    x: clamp(h.x - (CANVAS_W * COMPANION_SCALE) / 2, 10, CANVAS_W - CANVAS_W * COMPANION_SCALE - 10),
    y: clamp(h.y - 270, 10, CANVAS_H - CANVAS_H * COMPANION_SCALE - 10),
    scale: COMPANION_SCALE,
  };
}

export interface PersistentLayers {
  structure: Stroke[];
  /** One group of strokes per companion idea, oldest first. */
  companions: Stroke[][];
}

/** Where the nth companion goes: beside the previous one, never on top of it. */
export function companionSlot(base: { x: number; y: number; scale: number }, index: number) {
  const step = CANVAS_W * base.scale + 12;
  const x = clamp(base.x - index * step, 10, CANVAS_W - CANVAS_W * base.scale - 10);
  return {
    x: x === 10 && index > 0 ? clamp(base.x + index * step, 10, CANVAS_W - CANVAS_W * base.scale - 10) : x,
    y: base.y,
    scale: base.scale,
  };
}

/** Earlier strokes that remain visible in this scene, split by how they persist. */
export function persistentLayers(
  missionId: MissionId,
  decisions: readonly Decision[],
  strokes: readonly Stroke[],
  scene: number,
): PersistentLayers {
  const layers: PersistentLayers = { structure: [], companions: [] };
  for (const k of persistentKinds(missionId, decisions, scene)) {
    const mine = strokes.filter((s) => s.s === k.scene);
    if (k.kind === "structure") layers.structure.push(...mine);
    else layers.companions.push(mine);
  }
  return layers;
}
