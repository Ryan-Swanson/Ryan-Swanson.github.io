"use client";

import { setMotion, useMotion } from "./motion";

export function MotionToggle() {
  const motion = useMotion();
  const on = motion === "on";
  return (
    <button
      type="button"
      onClick={() => setMotion(on ? "off" : "on")}
      aria-pressed={on}
      className="label inline-flex min-h-11 items-center gap-2 px-2 text-ink-2 hover:text-ink"
    >
      <span
        aria-hidden="true"
        className={`inline-block size-2.5 rounded-full border border-brass ${on ? "bg-brass" : ""}`}
      />
      Motion {on ? "on" : "off"}
    </button>
  );
}
