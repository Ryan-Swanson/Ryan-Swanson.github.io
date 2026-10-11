/**
 * Mutable state shared between the HTML layer and the scene. The page writes
 * scroll progress and input here; the render loop reads it every frame, so
 * scrolling never causes a React render of the scene.
 */
export interface WorldStore {
  /** Scroll progress through the gallery section, 0 to 1. */
  progress: number;
  /** Motion preference: when false the camera cuts between stops and the world holds still. */
  motion: boolean;
  /** Mouse position in the stage, -1 to 1, used for a small look-around offset. */
  pointer: { x: number; y: number };
  roam: {
    active: boolean;
    keys: Set<string>;
    /** Accumulated drag since the last frame, in pixels. */
    look: { x: number; y: number };
  };
}

export function createWorldStore(): WorldStore {
  return {
    progress: 0,
    motion: true,
    pointer: { x: 0, y: 0 },
    roam: { active: false, keys: new Set(), look: { x: 0, y: 0 } },
  };
}

export interface WorldProject {
  slug: string;
  title: string;
  texture: { src: string; width: number; height: number };
  textureSmall: string;
}

export type QualityTier = 0 | 1 | 2 | 3;

export interface WorldProps {
  projects: WorldProject[];
  store: WorldStore;
  narrow: boolean;
  active: boolean;
  initialTier: QualityTier;
  onReady: () => void;
  /** Loading progress for the intro screen: screens downloaded, and whether shaders compiled. */
  onProgress: (p: { screens: number; total: number; compiled: boolean }) => void;
  onError: (reason: string) => void;
  onOpen: (slug: string) => void;
  onHover: (slug: string | null) => void;
  /** Called when free roam ends, with the index of the station nearest the camera. */
  onRoamExit: (station: number) => void;
  /** Set by the scene: ends free roam from outside (Escape, exit button). */
  exitRoamRef: { current: (() => void) | null };
}
