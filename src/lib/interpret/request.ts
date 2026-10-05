import { z } from "zod";
import { CapabilitySchema, type Capability } from "../capabilities";
import { isMissionId, isSceneIndex, type SceneIndex } from "../missions/engine";
import type { MissionId } from "../missions/types";
import { INTERPRET_LIMITS } from "./config";

const RequestSchema = z
  .object({
    missionId: z.string().max(32),
    scene: z.number().int().min(0).max(2),
    priorCaps: z.array(CapabilitySchema).max(6).optional(),
    imageBase64: z.string().min(16).max(INTERPRET_LIMITS.maxBodyChars),
  })
  .strict();

export interface ValidRequest {
  missionId: MissionId;
  scene: SceneIndex;
  priorCaps: Capability[];
  imageBase64: string;
}

export type RequestCheck =
  | { ok: true; value: ValidRequest }
  | { ok: false; status: 400 | 413 };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Reads width/height from a PNG header without decoding pixels. */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 33) return null;
  for (let i = 0; i < 8; i++) if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  // First chunk must be IHDR (length 13).
  const type = String.fromCharCode(bytes[12]!, bytes[13]!, bytes[14]!, bytes[15]!);
  if (type !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export function validateRequest(rawText: string): RequestCheck {
  if (rawText.length > INTERPRET_LIMITS.maxBodyChars) return { ok: false, status: 413 };
  let json: unknown;
  try {
    json = JSON.parse(rawText);
  } catch {
    return { ok: false, status: 400 };
  }
  const parsed = RequestSchema.safeParse(json);
  if (!parsed.success) return { ok: false, status: 400 };
  const { missionId, scene, priorCaps = [], imageBase64 } = parsed.data;

  if (!isMissionId(missionId) || !isSceneIndex(scene)) return { ok: false, status: 400 };
  if (new Set(priorCaps).size !== priorCaps.length) return { ok: false, status: 400 };
  if (scene === 0 && priorCaps.length > 0) return { ok: false, status: 400 };
  if (imageBase64.length % 4 !== 0 || !BASE64.test(imageBase64)) return { ok: false, status: 400 };

  const approxBytes = Math.floor((imageBase64.length * 3) / 4);
  if (approxBytes > INTERPRET_LIMITS.maxImageBytes) return { ok: false, status: 413 };

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(Buffer.from(imageBase64, "base64"));
  } catch {
    return { ok: false, status: 400 };
  }
  const size = readPngSize(bytes);
  if (!size) return { ok: false, status: 400 };
  const { minImageSide: lo, maxImageSide: hi } = INTERPRET_LIMITS;
  if (size.width < lo || size.height < lo || size.width > hi || size.height > hi) {
    return { ok: false, status: 400 };
  }
  return { ok: true, value: { missionId, scene, priorCaps, imageBase64 } };
}
