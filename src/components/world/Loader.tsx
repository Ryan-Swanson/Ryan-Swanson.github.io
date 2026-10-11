"use client";

import { useEffect, useState } from "react";

export interface LoadProgress {
  code: boolean;
  screens: number;
  total: number;
  compiled: boolean;
}

/** Overall progress: the 3D code, then the six screens, then the graphics. */
function fraction(p: LoadProgress) {
  return (p.code ? 0.3 : 0.05) + 0.5 * (p.total ? p.screens / p.total : 0) + (p.compiled ? 0.2 : 0);
}

function step(p: LoadProgress) {
  if (!p.code) return "Loading the 3D engine";
  if (p.screens < p.total) return `Loading project screens, ${p.screens} of ${p.total}`;
  if (!p.compiled) return "Preparing the graphics";
  return "Ready";
}

/**
 * Full-screen intro shown while the 3D tour loads. It is in the server HTML so it covers the
 * page from the first paint, is hidden by CSS when JavaScript is off, and can always be skipped.
 */
export function Loader({ progress, done, onSkip }: { progress: LoadProgress; done: boolean; onSkip: () => void }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(t);
  }, []);
  // Once faded, leave the page entirely so it can never cover or intercept anything.
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 800);
    return () => clearTimeout(t);
  }, [done]);
  const pct = Math.round(Math.min(1, fraction(progress)) * 100);
  if (gone) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={!done}
      className={`js-only fixed inset-0 z-[80] flex flex-col items-center justify-center bg-wall px-6 text-center transition-opacity duration-700 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_50%_45%,rgba(255,214,150,0.12),transparent_70%)]"
      />
      <div className="relative w-full max-w-[26rem]">
        <p className="font-display text-4xl tracking-tight sm:text-5xl">Ryan Swanson</p>
        <p className="label mt-3 text-ink-2">Building the gallery</p>
        <div className="mt-8 h-px w-full bg-rule">
          <div className="h-px bg-brass transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="label mt-3 flex justify-between text-ink-2">
          <span>{step(progress)}</span>
          <span>{pct}%</span>
        </p>
        <button
          type="button"
          onClick={onSkip}
          className={`label mt-10 inline-flex min-h-11 items-center gap-2 px-4 ${
            slow ? "border border-brass text-ink hover:bg-brass hover:text-placard-ink" : "text-ink-2 underline hover:text-ink"
          }`}
        >
          {slow ? "Continue without waiting" : "Skip to the site"} <span aria-hidden="true">→</span>
        </button>
        {slow && (
          <p className="mt-3 text-[0.9rem] text-ink-2">
            This is taking longer than usual, likely a slow connection. The 3D tour will appear when it finishes.
          </p>
        )}
      </div>
    </div>
  );
}
