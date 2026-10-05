import type { CapabilityOrUnknown } from "@/lib/capabilities";

const PATHS: Record<CapabilityOrUnknown, React.ReactNode> = {
  connects_places: (
    <>
      <path d="M2 18h6M16 18h6" />
      <path d="M8 18c0-7 8-7 8 0" />
    </>
  ),
  carries_someone: (
    <>
      <circle cx="12" cy="6" r="2.5" />
      <path d="M8 18v-4a4 4 0 0 1 8 0v4" />
      <path d="M3 20h18" />
    </>
  ),
  floats: (
    <>
      <path d="M2 18c2-2 4-2 5 0s3 2 5 0 3-2 5 0 3 2 5 0" />
      <path d="M5 13h14l-2.5 3.5h-9z" />
      <path d="M12 13V5l4 5" />
    </>
  ),
  flies: <path d="M2 14c3-8 7-8 10-2 3-6 7-6 10 2-3-2-6-2-10 2-4-4-7-4-10-2z" />,
  rolls: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 6v14M5 13h14" />
    </>
  ),
  pushes_or_pulls: (
    <>
      <path d="M3 12h13M12 7l5 5-5 5" />
      <path d="M21 6v12" />
    </>
  ),
  shelters: <path d="M2 12 12 3l10 9M5 10v10h14V10" />,
  blocks: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9.5h18M3 15h18M9 4v5.5M15 9.5V15M9 15v5" />
    </>
  ),
  anchors: (
    <>
      <circle cx="12" cy="5" r="2.5" />
      <path d="M12 7.5V21M7 11h10M4 15c1 4 4 6 8 6s7-2 8-6" />
    </>
  ),
  supports_weight: (
    <>
      <rect x="9" y="3" width="6" height="5" />
      <path d="M2 11h20M5 11v9M19 11v9" />
    </>
  ),
  lights_area: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" />
    </>
  ),
  signals: (
    <>
      <path d="M6 3v18" />
      <path d="M6 4h12l-3.5 4 3.5 4H6" />
    </>
  ),
  marks_path: (
    <>
      <path d="M3 20c4-14 10 0 18-14" strokeDasharray="1 4" />
      <circle cx="20" cy="5" r="1.5" />
    </>
  ),
  delivers: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="1" />
      <path d="M8 9V6a4 4 0 0 1 8 0v3" />
    </>
  ),
  unknown: (
    <>
      <path d="M9 9a3 3 0 1 1 4.5 2.6c-1 .7-1.5 1.4-1.5 2.4" />
      <path d="M12 18.5v.5" />
    </>
  ),
};

/** Decorative: every use sits next to visible text, so it is hidden from assistive technology. */
export function CapabilityIcon({ id }: { id: CapabilityOrUnknown }) {
  return (
    <svg
      className="cap-icon"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[id]}
    </svg>
  );
}
