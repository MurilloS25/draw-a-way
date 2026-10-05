"use client";

import {
  CAPABILITY_GROUPS,
  CAPABILITY_META,
  MAX_CAPABILITIES,
  UNKNOWN,
  describeCapabilities,
  type CapabilityOrUnknown,
} from "@/lib/capabilities";
import { CapabilityIcon } from "./icons";

interface Props {
  selected: CapabilityOrUnknown[];
  onChange: (next: CapabilityOrUnknown[]) => void;
  disabled?: boolean;
}

/**
 * The child says what the idea helps the character do: up to two capabilities,
 * or "something else". Native checkboxes keep keyboard and screen reader use
 * ordinary; every option has an icon and text, never color alone.
 */
export function CapabilityPicker({ selected, onChange, disabled }: Props) {
  const full = selected.filter((c) => c !== UNKNOWN).length >= MAX_CAPABILITIES;
  const toggle = (id: CapabilityOrUnknown) => {
    if (id === UNKNOWN) {
      onChange(selected.includes(UNKNOWN) ? [] : [UNKNOWN]);
      return;
    }
    const base = selected.filter((c) => c !== UNKNOWN);
    onChange(base.includes(id) ? base.filter((c) => c !== id) : [...base, id].slice(0, MAX_CAPABILITIES));
  };

  const option = (id: CapabilityOrUnknown) => {
    const checked = selected.includes(id);
    const blocked = !checked && id !== UNKNOWN && full;
    return (
      <label key={id} className={`cap ${checked ? "is-on" : ""} ${blocked ? "is-blocked" : ""}`}>
        <input type="checkbox" checked={checked} disabled={disabled || blocked} onChange={() => toggle(id)} />
        <CapabilityIcon id={id} />
        <span className="cap-text">
          <span className="cap-label">{CAPABILITY_META[id].label}</span>
          <span className="cap-hint">{CAPABILITY_META[id].hint}</span>
        </span>
      </label>
    );
  };

  return (
    <div className="picker-caps">
      {CAPABILITY_GROUPS.map((g) => (
        <fieldset key={g.title} className="cap-group">
          <legend>{g.title}</legend>
          <div className="cap-list">{g.items.map(option)}</div>
        </fieldset>
      ))}
      <fieldset className="cap-group">
        <legend>Not sure?</legend>
        <div className="cap-list">{option(UNKNOWN)}</div>
      </fieldset>
      <p className="fine cap-status" role="status">
        {selected.length === 0
          ? "Pick one or two things your idea can do."
          : `Your idea can ${describeCapabilities(selected)}.${full ? " That is two. Unpick one to change." : ""}`}
      </p>
    </div>
  );
}
