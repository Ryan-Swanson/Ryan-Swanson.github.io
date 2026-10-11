"use client";

import { useSyncExternalStore } from "react";

export type MotionPref = "on" | "off";
const KEY = "rs-motion";

/** Inline script that sets <html data-motion> before first paint. */
export const motionBootScript = `(function(){try{var v=localStorage.getItem("${KEY}");}catch(e){}if(v!=="on"&&v!=="off"){v=window.matchMedia("(prefers-reduced-motion: reduce)").matches?"off":"on";}document.documentElement.dataset.motion=v;document.documentElement.dataset.js="1";})();`;

const listeners = new Set<() => void>();

function read(): MotionPref {
  return document.documentElement.dataset.motion === "off" ? "off" : "on";
}

export function setMotion(value: MotionPref) {
  document.documentElement.dataset.motion = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // Storage can be unavailable (private mode). The attribute still applies for this visit.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Current motion preference. Server render assumes "on"; the boot script corrects it before paint. */
export function useMotion(): MotionPref {
  return useSyncExternalStore(subscribe, read, () => "on");
}
