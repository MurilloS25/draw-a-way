import { z } from "zod";
import { isCandidate, isMissionId, type Round } from "../missions/engine";
import type { MissionId } from "../missions/types";
import { INTERPRET_LIMITS } from "./config";

const RequestSchema = z
  .object({
    missionId: z.string().max(32),
    round: z.union([z.literal(1), z.literal(2)]),
    firstIdeaId: z.string().max(40).optional(),
    imageBase64: z.string().min(16).max(INTERPRET_LIMITS.maxBodyChars),
  })
  .strict();

export interface ValidRequest {
  missionId: MissionId;
  round: Round;
  firstIdeaId?: string;
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
  const { missionId, round, firstIdeaId, imageBase64 } = parsed.data;

  if (!isMissionId(missionId)) return { ok: false, status: 400 };
  if (round === 2 && !isCandidate(missionId, 1, undefined, firstIdeaId)) return { ok: false, status: 400 };
  if (round === 1 && firstIdeaId !== undefined) return { ok: false, status: 400 };
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
  return { ok: true, value: { missionId, round, firstIdeaId, imageBase64 } };
}
