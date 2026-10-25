import * as THREE from "three";

/*
  The flight path. The camera travels toward -z along a gently winding line;
  each project has a station where its screen floats beside the path.
  pathXY must match the GLSL version in fieldShader.ts exactly.
*/

export const STATION_SPACING = 30;
export const INTRO_Z = 9;
export const CLEAR_RADIUS = 2.0;

export function pathXY(z: number): [number, number] {
  return [Math.sin(z * 0.045) * 5.0 + Math.sin(z * 0.013 + 1.3) * 3.0, Math.cos(z * 0.031) * 1.4];
}

export function pathPoint(z: number, lift = 0): THREE.Vector3 {
  const [x, y] = pathXY(z);
  return new THREE.Vector3(x, y + lift, z);
}

export function stationZ(i: number): number {
  return -(i + 1) * STATION_SPACING;
}

export interface ScreenPlacement {
  center: THREE.Vector3;
  normal: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  height: number;
  side: number;
  /** Extra width of hardware to the screen's right that the camera should keep in view. */
  extraRight?: number;
}

/** Where screen i floats: beside the path, alternating sides, angled toward the approaching camera. */
export function placeScreen(i: number, aspect: number): ScreenPlacement {
  const z = stationZ(i);
  const side = i % 2 === 0 ? 1 : -1;
  const portrait = aspect < 1;
  const height = portrait ? 2.9 : 2.2;
  const width = height * aspect;
  const [px, py] = pathXY(z);
  const center = new THREE.Vector3(px + side * (portrait ? 1.6 : 2.5), py + 0.35, z);
  const normal = new THREE.Vector3(-side * 0.62, 0, 1).normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize();
  return { center, normal, right, width, height, side };
}

export interface Rig {
  position: THREE.CatmullRomCurve3;
  target: THREE.CatmullRomCurve3;
  stops: number;
}

/**
 * Camera keyframes: an intro stop, then one stop per screen, with a mid-flight
 * point between stops so the camera swings along the path instead of cutting
 * straight across. With getPoint (uniform in point index), stop k sits at
 * parameter k / (stops - 1).
 */
export function buildRig(screens: ScreenPlacement[], viewAspect: number, fovDeg: number, narrow: boolean): Rig {
  const vfov = THREE.MathUtils.degToRad(fovDeg);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * viewAspect);
  const pos: THREE.Vector3[] = [];
  const tgt: THREE.Vector3[] = [];

  const firstZ = stationZ(0);
  pos.push(pathPoint(INTRO_Z, 0.9));
  tgt.push(pathPoint(firstZ + 4, -0.2));

  screens.forEach((s, i) => {
    const prevZ = i === 0 ? INTRO_Z : stationZ(i - 1);
    const midZ = (prevZ + s.center.z) / 2;
    pos.push(pathPoint(midZ, 0.55));
    tgt.push(pathPoint(midZ - 14, 0.1));

    // Phones in landscape (very wide, short views) get a looser fit so the hardware around the
    // screen stays clear of the wall label on the right.
    const veryWide = !narrow && viewAspect > 1.9;
    const fillW = narrow ? 0.9 : veryWide ? 0.38 : 0.44;
    const fillH = narrow ? 0.34 : veryWide ? 0.44 : 0.52;
    const extra = narrow ? 0 : (s.extraRight ?? 0);
    // Hardware beside the screen widens the shot a little and pans it, rather than pulling the
    // camera far back (which would put it behind the motif's walls).
    const dW = (s.width + extra * 0.45) / fillW / 2 / Math.tan(hfov / 2);
    const dH = s.height / fillH / 2 / Math.tan(vfov / 2);
    const d = Math.max(dW, dH);
    // Wide screens: frame the screen left of center to leave room for the HTML label.
    // Narrow screens: put its center about 30% from the top, above the label.
    const look = s.center.clone();
    if (narrow) look.y -= 0.4 * d * Math.tan(vfov / 2);
    else look.addScaledVector(s.right, s.width * 0.42 + extra * 0.42).add(new THREE.Vector3(0, -s.height * 0.28, 0));
    pos.push(look.clone().addScaledVector(s.normal, d).add(new THREE.Vector3(0, 0.12, 0)));
    tgt.push(look);
  });

  return {
    position: new THREE.CatmullRomCurve3(pos, false, "centripetal"),
    target: new THREE.CatmullRomCurve3(tgt, false, "centripetal"),
    stops: screens.length + 1,
  };
}

/** Map scroll progress (0..1) to a rig parameter that dwells at each stop. */
export function dwell(progress: number, stops: number, snap: boolean): number {
  const segs = stops - 1;
  const f = THREE.MathUtils.clamp(progress, 0, 1) * segs;
  if (snap) return Math.round(f) / segs;
  const k = Math.min(Math.floor(f), segs - 1);
  const x = f - k;
  const e = THREE.MathUtils.smootherstep(x, 0.16, 0.84);
  return (k + e) / segs;
}
