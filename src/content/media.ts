import generated from "./media.generated.json";
import type { MediaItem } from "./types";

type GeneratedEntry = Omit<MediaItem, "alt" | "caption">;
const table = generated as Record<string, GeneratedEntry>;

/**
 * Look up an optimized screenshot by id (e.g. "fr3t-app/workspace") and attach
 * visitor-facing text. Fails the build if the id has no optimized files.
 */
export function shot(id: string, alt: string, caption?: string): MediaItem {
  const entry = table[id];
  if (!entry) {
    // Allow work-in-progress previews in development; production builds must have every screen.
    if (process.env.NODE_ENV !== "production" || process.env.ALLOW_PENDING_MEDIA === "1") {
      return { src: "/media/pending", widths: [1600], width: 1600, height: 1000, source: "existing", captured: "2026-10", device: "desktop", alt: `${alt} (capture pending)`, caption };
    }
    throw new Error(`Unknown media id "${id}". Run npm run media.`);
  }
  return { ...entry, alt, caption };
}

export function hasShot(id: string): boolean {
  return id in table;
}
