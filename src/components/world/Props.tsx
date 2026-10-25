"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { revealAt, screenFragment, screenVertex } from "./screenShader";

/*
  Hardware around each real screen, built in the screen's local frame:
  x to the right, y up, z out of the screen toward the viewer. The screen
  itself (the real capture) sits at the origin, w by h.

    fr3t-app         monitor standing on a combo amp, single-cut electric on a stand
    inputshare       desk with keyboard and mouse plus a second computer; the
                     mouse moves and its cursor crosses onto the other screen
    learncenter-dev  office desk: keyboard, mouse, mug, plant, lamp
    talkmac          all-in-one with a chin, and a podcast mic on a boom
    protuner         a phone floating in the air
    groovemind       laptop on a desk between two studio monitors that pump
                     on the 3+2+2 accents
*/

export interface PropArgs {
  slug: string;
  w: number;
  h: number;
  /** Seconds of world time; frozen when motion is off. */
  clock: { current: { time: number } };
}

// ---------- shared helpers ------------------------------------------------------

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** A cylinder between two points. */
function Tube({ a, b, r, mat }: { a: [number, number, number]; b: [number, number, number]; r: number; mat: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      pos: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      len: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat} material={mat}>
      <cylinderGeometry args={[r, r, len, 12]} />
    </mesh>
  );
}

/** A soft studio room for metals and clear coats to reflect. */
export function useStudioEnvironment(gl: THREE.WebGLRenderer, scene: THREE.Scene, intensity = 0.55) {
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const prev = scene.environment;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = prev;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
}

type Kit = Record<
  | "black" | "matte" | "alu" | "darkAlu" | "titanium" | "chrome" | "oak" | "walnut" | "ceramic"
  | "leaf" | "leafLight" | "terracotta" | "brass" | "rubber" | "cone" | "cream",
  THREE.MeshStandardMaterial
>;
let kitCache: Kit | null = null;
/** Shared materials: every station uses the same kit, so each shader variant is built once. */
function getKit(): Kit {
  if (kitCache) return kitCache;
  {
    const m: Kit = {
      black: new THREE.MeshStandardMaterial({ color: "#0b0c0d", roughness: 0.45, metalness: 0.4 }),
      matte: new THREE.MeshStandardMaterial({ color: "#16181a", roughness: 0.85 }),
      alu: new THREE.MeshStandardMaterial({ color: "#b9bcc0", roughness: 0.32, metalness: 0.85 }),
      darkAlu: new THREE.MeshStandardMaterial({ color: "#3a3c40", roughness: 0.35, metalness: 0.85 }),
      titanium: new THREE.MeshStandardMaterial({ color: "#5d5a55", roughness: 0.3, metalness: 0.9 }),
      chrome: new THREE.MeshStandardMaterial({ color: "#d8d8d8", roughness: 0.15, metalness: 1 }),
      oak: new THREE.MeshStandardMaterial({ color: "#8a6440", roughness: 0.6 }),
      walnut: new THREE.MeshStandardMaterial({ color: "#4a2f1d", roughness: 0.55 }),
      ceramic: new THREE.MeshStandardMaterial({ color: "#e9e4d8", roughness: 0.35 }),
      leaf: new THREE.MeshStandardMaterial({ color: "#2f6a3a", roughness: 0.6 }),
      leafLight: new THREE.MeshStandardMaterial({ color: "#5d8f4a", roughness: 0.6 }),
      terracotta: new THREE.MeshStandardMaterial({ color: "#a65a3a", roughness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: "#c9a25a", roughness: 0.3, metalness: 0.9 }),
      rubber: new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.95 }),
      // Yellow woven woofer cones, in the style of KRK Rokit monitors. Double-sided: you see the inside.
      cone: new THREE.MeshStandardMaterial({ color: "#f2c20f", roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide }),
      cream: new THREE.MeshStandardMaterial({ color: "#efe6d2", roughness: 0.5 }),
    };
    kitCache = m;
    return m;
  }
}
function useKit(): Kit {
  return useMemo(() => getKit(), []);
}

/** Same speech envelope as the TalkMac field motif. */
function speechEnv(t: number) {
  const ph = (t * 0.36) % 1;
  const word = THREE.MathUtils.smoothstep(ph, 0, 0.06) * (1 - THREE.MathUtils.smoothstep(ph, 0.66, 0.8));
  const syl = Math.pow(0.5 + 0.5 * Math.sin(t * 10.5 + 2 * Math.sin(t * 2.7)), 1.4);
  return word * (0.3 + 0.7 * syl);
}

// ---------- pieces -----------------------------------------------------------------

function MonitorStand({ h, top, k }: { h: number; top: number; k: ReturnType<typeof useKit> }) {
  // Neck from the bottom of the screen down to a foot resting at `top`.
  const neckH = -h / 2 - top;
  return (
    <group>
      <mesh position={[0, -h / 2 - neckH / 2 + 0.05, -0.16]} material={k.darkAlu}>
        <boxGeometry args={[0.32, neckH + 0.1, 0.1]} />
      </mesh>
      <mesh position={[0, top + 0.025, -0.05]} material={k.darkAlu}>
        <boxGeometry args={[1.25, 0.05, 0.75]} />
      </mesh>
    </group>
  );
}

function Desk({ width, depth, top, floor, z = 0.45, mat, legMat }: { width: number; depth: number; top: number; floor: number; z?: number; mat: THREE.Material; legMat: THREE.Material }) {
  const legH = top - floor;
  const xs = [-width / 2 + 0.15, width / 2 - 0.15];
  const zs = [z - depth / 2 + 0.15, z + depth / 2 - 0.15];
  return (
    <group>
      <mesh position={[0, top - 0.06, z]} material={mat}>
        <boxGeometry args={[width, 0.12, depth]} />
      </mesh>
      {xs.flatMap((x) =>
        zs.map((zz) => (
          <mesh key={`${x}${zz}`} position={[x, floor + legH / 2 - 0.06, zz]} material={legMat}>
            <boxGeometry args={[0.09, legH - 0.12, 0.09]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Keyboard({ width, depth, position, tex, k }: { width: number; depth: number; position: [number, number, number]; tex: THREE.Texture; k: ReturnType<typeof useKit> }) {
  return (
    <group position={position}>
      <mesh material={k.darkAlu}>
        <boxGeometry args={[width, 0.06, depth]} />
      </mesh>
      <mesh position={[0, 0.031, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width * 0.96, depth * 0.88]} />
        <meshStandardMaterial map={tex} roughness={0.6} />
      </mesh>
    </group>
  );
}

function Mouse({ k }: { k: ReturnType<typeof useKit> }) {
  return (
    <mesh scale={[0.17, 0.08, 0.27]} material={k.black}>
      <sphereGeometry args={[1, 24, 16]} />
    </mesh>
  );
}

let keyboardCache: THREE.CanvasTexture | null = null;
/** One keyboard texture shared by every desk in the scene. */
function keyboardTexture() {
  if (keyboardCache) return keyboardCache;
  keyboardCache = canvasTexture(512, 160, (g) => {
    g.fillStyle = "#202226";
    g.fillRect(0, 0, 512, 160);
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      const n = 14 - (r === 4 ? 6 : 0);
      for (let i = 0; i < n; i++) {
        const kw = r === 4 && i === 3 ? 160 : 31;
        const x = 8 + i * 35 + (r === 4 && i > 3 ? 130 : 0);
        g.fillStyle = "#3a3d42";
        g.fillRect(x, 8 + r * 30, kw, 25);
        g.fillStyle = "#4a4e54";
        g.fillRect(x + 2, 9 + r * 30, kw - 4, 3);
      }
    }
  });
  return keyboardCache;
}

// ---------- fr3t.app: amp and guitar ------------------------------------------------

/*
  Single-cut electric, proportioned from a reference photo: body 1.64 tall
  (y -0.82 to 0.82), neck as long again, cutaway on the treble side (the
  viewer's right). Units match the rest of the scene.
*/
function lesPaulShape() {
  // Traced from a straight-on photo of a 1959-reissue Les Paul (Wikimedia Commons,
  // "Full front R9 Les Paul.jpg"), scaled so the body is 1.64 units long.
  const treble: [number, number][] = [[0.098, -0.815], [0.208, -0.787], [0.305, -0.738], [0.403, -0.671], [0.477, -0.598], [0.538, -0.5], [0.58, -0.39], [0.605, -0.28], [0.611, -0.194], [0.599, -0.097], [0.574, -0.023], [0.525, 0.062], [0.464, 0.136], [0.397, 0.203], [0.354, 0.258], [0.332, 0.319], [0.336, 0.38], [0.354, 0.441], [0.379, 0.49], [0.403, 0.539], [0.418, 0.588], [0.422, 0.631], [0.409, 0.661], [0.385, 0.671], [0.36, 0.659], [0.336, 0.631], [0.305, 0.598], [0.269, 0.578], [0.22, 0.568], [0.174, 0.569], [0.138, 0.585], [0.116, 0.612], [0.106, 0.655]];
  const bass: [number, number][] = [[-0.104, 0.82], [-0.183, 0.818], [-0.244, 0.808], [-0.293, 0.789], [-0.354, 0.753], [-0.391, 0.71], [-0.415, 0.661], [-0.428, 0.606], [-0.428, 0.539], [-0.418, 0.478], [-0.397, 0.417], [-0.367, 0.356], [-0.345, 0.295], [-0.337, 0.258], [-0.342, 0.221], [-0.367, 0.172], [-0.415, 0.111], [-0.477, 0.05], [-0.538, -0.023], [-0.574, -0.097], [-0.601, -0.194], [-0.611, -0.292], [-0.605, -0.39], [-0.58, -0.488], [-0.538, -0.573], [-0.477, -0.659], [-0.391, -0.732], [-0.293, -0.787], [-0.183, -0.811], [-0.086, -0.82], [0.0, -0.82]];
  const s = new THREE.Shape();
  s.moveTo(0, -0.82);
  s.splineThru(treble.map(([x, y]) => new THREE.Vector2(x, y)));
  // Up the side of the neck heel and across under the neck.
  s.lineTo(0.106, 0.82);
  s.lineTo(-0.104, 0.82);
  s.splineThru(bass.map(([x, y]) => new THREE.Vector2(x, y)));
  return s;
}

/** "Open book" headstock, nut at y = 0: straight flared sides, a gently arched top with a small center notch. */
function headstockShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.085, 0);
  s.lineTo(-0.155, 0.36);
  s.quadraticCurveTo(-0.15, 0.405, -0.07, 0.41);
  s.quadraticCurveTo(-0.025, 0.41, 0, 0.392);
  s.quadraticCurveTo(0.025, 0.41, 0.07, 0.41);
  s.quadraticCurveTo(0.15, 0.405, 0.155, 0.36);
  s.lineTo(0.085, 0);
  s.lineTo(-0.085, 0);
  return s;
}

const NUT_Y = 2.26;
const SCALE_LEN = 2.31;
const fretY = (n: number) => NUT_Y - SCALE_LEN * (1 - Math.pow(2, -n / 12));
const BODY_D = 0.2;

function Guitar({ k }: { k: ReturnType<typeof useKit> }) {
  const parts = useMemo(() => {
    const shape = lesPaulShape();
    const body = new THREE.ExtrudeGeometry(shape, { depth: BODY_D - 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 3, curveSegments: 48 });
    const binding = new THREE.ExtrudeGeometry(shape, { depth: 0.022, bevelEnabled: false, curveSegments: 48 });
    // Cherry sunburst over flamed maple: a warm center fading to cherry, with wavy figure.
    const burst = canvasTexture(512, 640, (g) => {
      const grad = g.createRadialGradient(256, 370, 20, 256, 330, 360);
      grad.addColorStop(0, "#f6c25a");
      grad.addColorStop(0.38, "#eb8f2c");
      grad.addColorStop(0.66, "#c8341c");
      grad.addColorStop(0.86, "#8f1010");
      grad.addColorStop(1, "#4a0606");
      g.fillStyle = grad;
      g.fillRect(0, 0, 512, 640);
      g.globalCompositeOperation = "overlay";
      for (let x = 0; x < 512; x += 2) {
        const v = Math.sin(x * 0.11) * 0.5 + Math.sin(x * 0.037 + 1.3) * 0.5;
        g.strokeStyle = v > 0 ? `rgba(255,236,200,${0.1 * v})` : `rgba(40,10,0,${-0.12 * v})`;
        g.beginPath();
        for (let y = 0; y <= 640; y += 16) g.lineTo(x + Math.sin(y * 0.05 + x * 0.02) * 6, y);
        g.stroke();
      }
    });
    burst.repeat.set(1 / 1.24, 1 / 1.66);
    burst.offset.set(0.62 / 1.24, 0.82 / 1.66);
    const top = new THREE.MeshPhysicalMaterial({ map: burst, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 });
    const sides = new THREE.MeshPhysicalMaterial({ color: "#4a0f0a", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 });
    const cream = new THREE.MeshPhysicalMaterial({ color: "#efe2c2", roughness: 0.35, clearcoat: 0.6 });
    const pearl = new THREE.MeshStandardMaterial({ color: "#e9edf0", roughness: 0.25, metalness: 0.2, emissive: "#3a3f44", emissiveIntensity: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: "#d9b25e", roughness: 0.22, metalness: 0.95 });
    const head = new THREE.ExtrudeGeometry(headstockShape(), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    const frets = [...Array(22).keys()].map((n) => fretY(n + 1));
    const inlays = [3, 5, 7, 9, 12, 15, 17, 19, 21].map((n) => (fretY(n - 1) + fretY(n)) / 2);
    const trapezoid = new THREE.Shape();
    trapezoid.moveTo(-0.05, -0.022);
    trapezoid.lineTo(0.05, -0.022);
    trapezoid.lineTo(0.042, 0.022);
    trapezoid.lineTo(-0.042, 0.022);
    trapezoid.lineTo(-0.05, -0.022);
    const pickguard = new THREE.Shape();
    pickguard.moveTo(0, 0.28);
    pickguard.bezierCurveTo(0.09, 0.26, 0.11, -0.05, 0.08, -0.26);
    pickguard.bezierCurveTo(0.06, -0.33, -0.04, -0.33, -0.05, -0.24);
    pickguard.bezierCurveTo(-0.07, -0.05, -0.06, 0.24, 0, 0.28);
    return {
      body,
      binding,
      bodyMats: [top, sides],
      cream,
      pearl,
      gold,
      head,
      frets,
      inlays,
      trap: new THREE.ShapeGeometry(trapezoid),
      guard: new THREE.ShapeGeometry(pickguard, 24),
    };
  }, []);
  const zf = BODY_D;
  const knobs: [number, number][] = [[0.428, -0.186], [0.277, -0.28], [0.43, -0.414], [0.275, -0.512]];
  const poles = [-0.1, -0.06, -0.02, 0.02, 0.06, 0.1];
  return (
    <group>
      {/* Body: flamed sunburst top, cherry sides, thin cream binding on the top edge */}
      <mesh geometry={parts.body} material={parts.bodyMats} />
      <mesh geometry={parts.binding} material={parts.cream} position={[0, 0, zf - 0.035]} scale={[1.016, 1.011, 1]} />
      {/* Raised cream pickguard on the treble side */}
      <mesh geometry={parts.guard} material={parts.cream} position={[0.245, 0.25, zf + 0.045]} rotation={[0, 0, 0.18]} scale={[0.72, 0.9, 1]} />
      {/* Two humbuckers: cream rings, two black bobbins each with a row of pole pieces */}
      {[0.439, 0.055].map((y) => (
        <group key={y} position={[0, y, zf]}>
          <mesh position={[0, 0, 0.012]} material={parts.cream}>
            <boxGeometry args={[0.334, 0.168, 0.022]} />
          </mesh>
          {[-0.028, 0.028].map((by) => (
            <group key={by} position={[0, by, 0.032]}>
              <mesh material={k.black}>
                <boxGeometry args={[0.27, 0.05, 0.03]} />
              </mesh>
              {poles.map((x) => (
                <mesh key={x} position={[x, 0, 0.016]} rotation={[Math.PI / 2, 0, 0]} material={k.chrome}>
                  <cylinderGeometry args={[0.009, 0.009, 0.004, 10]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      ))}
      {/* Tune-o-matic bridge and stopbar */}
      <mesh position={[0, -0.099, zf + 0.035]} material={k.chrome}>
        <boxGeometry args={[0.34, 0.04, 0.04]} />
      </mesh>
      <mesh position={[0, -0.246, zf + 0.03]} rotation={[0, 0, Math.PI / 2]} material={k.chrome}>
        <cylinderGeometry args={[0.02, 0.02, 0.33, 16]} />
      </mesh>
      {/* Gold top-hat knobs, lower treble bout */}
      {knobs.map(([x, y]) => (
        <group key={`${x}${y}`} position={[x, y, zf]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh position={[0, 0.01, 0]} material={parts.gold}>
            <cylinderGeometry args={[0.058, 0.058, 0.014, 28]} />
          </mesh>
          <mesh position={[0, 0.04, 0]} material={parts.gold}>
            <cylinderGeometry args={[0.036, 0.044, 0.046, 28]} />
          </mesh>
          <mesh position={[0, 0.064, 0]} material={parts.cream}>
            <cylinderGeometry args={[0.03, 0.036, 0.004, 20]} />
          </mesh>
        </group>
      ))}
      {/* Selector toggle on the upper bass bout */}
      <mesh position={[-0.281, 0.612, zf + 0.002]} material={parts.cream}>
        <circleGeometry args={[0.06, 28]} />
      </mesh>
      <Tube a={[-0.281, 0.612, zf]} b={[-0.271, 0.622, zf + 0.12]} r={0.007} mat={k.chrome} />
      <mesh position={[-0.271, 0.622, zf + 0.125]} material={parts.cream}>
        <sphereGeometry args={[0.016, 12, 8]} />
      </mesh>
      {/* Mahogany neck, bound rosewood board, 22 frets, pearloid trapezoid inlays */}
      <mesh position={[0, (NUT_Y + 0.54) / 2, 0.11]} material={k.walnut}>
        <boxGeometry args={[0.19, NUT_Y - 0.54, 0.1]} />
      </mesh>
      <mesh position={[0, (NUT_Y + 0.54) / 2, zf - 0.01]}>
        <boxGeometry args={[0.17, NUT_Y - 0.54, 0.03]} />
        <meshStandardMaterial color="#21140c" roughness={0.65} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * 0.088, (NUT_Y + 0.54) / 2, zf - 0.01]} material={parts.cream}>
          <boxGeometry args={[0.007, NUT_Y - 0.54, 0.031]} />
        </mesh>
      ))}
      {parts.frets.map((y) => (
        <mesh key={y} position={[0, y, zf + 0.007]} material={k.chrome}>
          <boxGeometry args={[0.17, 0.006, 0.006]} />
        </mesh>
      ))}
      {parts.inlays.map((y) => (
        <mesh key={y} geometry={parts.trap} material={parts.pearl} position={[0, y, zf + 0.0062]} />
      ))}
      <mesh position={[0, NUT_Y + 0.008, zf + 0.004]} material={parts.cream}>
        <boxGeometry args={[0.17, 0.016, 0.02]} />
      </mesh>
      {/* Headstock, angled back, with 3+3 tuners and keystone buttons */}
      <group position={[0, NUT_Y + 0.015, 0.13]} rotation={[-0.24, 0, 0]}>
        <mesh geometry={parts.head} position={[0, 0, -0.03]}>
          <meshPhysicalMaterial color="#030303" roughness={0.25} clearcoat={0.6} envMapIntensity={0.35} />
        </mesh>
        {[0.11, 0.2, 0.29].flatMap((y) =>
          [-1, 1].map((sd) => (
            <group key={`${y}${sd}`}>
              <mesh position={[sd * (0.09 + y * 0.12), y, 0.035]} rotation={[Math.PI / 2, 0, 0]} material={k.chrome}>
                <cylinderGeometry args={[0.013, 0.016, 0.03, 10]} />
              </mesh>
              <mesh position={[sd * (0.21 + y * 0.12), y, -0.02]} material={parts.cream}>
                <boxGeometry args={[0.065, 0.045, 0.018]} />
              </mesh>
              <Tube a={[sd * (0.13 + y * 0.12), y, -0.02]} b={[sd * (0.18 + y * 0.12), y, -0.02]} r={0.008} mat={k.chrome} />
            </group>
          )),
        )}
      </group>
      {/* Strings: stopbar, over the bridge to the nut, then each to its own tuner post.
          Bass side (left) takes low E, A, D from the nut outward; treble side takes G, B, high E. */}
      {poles.map((x, i) => {
        const r = 0.0032 + (5 - i) * 0.0007;
        const nut: [number, number, number] = [x * 0.62, NUT_Y, zf + 0.02];
        const row = i < 3 ? [0.11, 0.2, 0.29][i]! : [0.29, 0.2, 0.11][i - 3]!;
        const sd = i < 3 ? -1 : 1;
        // Tuner post top in the headstock frame, then into the guitar frame (tilted back 0.24 rad).
        const px = sd * (0.09 + row * 0.12);
        const py = row;
        const pz = 0.05;
        const c = Math.cos(-0.24);
        const sn = Math.sin(-0.24);
        const post: [number, number, number] = [px, NUT_Y + 0.015 + py * c - pz * sn, 0.13 + py * sn + pz * c];
        return (
          <group key={x}>
            <Tube a={[x * 0.88, -0.246, zf + 0.05]} b={nut} r={r} mat={k.chrome} />
            <Tube a={nut} b={post} r={r} mat={k.chrome} />
          </group>
        );
      })}
    </group>
  );
}

function GuitarStand({ k }: { k: ReturnType<typeof useKit> }) {
  // A-frame stand: cradle under the body, yoke holding the neck.
  return (
    <group>
      <Tube a={[-0.45, 0, 0.35]} b={[-0.25, 0.4, 0.22]} r={0.02} mat={k.black} />
      <Tube a={[0.45, 0, 0.35]} b={[0.25, 0.4, 0.22]} r={0.02} mat={k.black} />
      <Tube a={[0, 0, -0.65]} b={[0, 2.55, -0.06]} r={0.022} mat={k.black} />
      <Tube a={[-0.3, 0.42, 0.27]} b={[0.3, 0.42, 0.27]} r={0.03} mat={k.rubber} />
      <Tube a={[-0.11, 2.55, 0.0]} b={[0.11, 2.55, 0.0]} r={0.025} mat={k.rubber} />
    </group>
  );
}

function Fr3t({ w, h, k }: { w: number; h: number; k: ReturnType<typeof useKit> }) {
  // The fretboard surface is the floor here. The amp stands on its own stand above it.
  const floor = -2.7;
  // A combo amp is roughly three wide to two tall; a low stand keeps it off the board.
  const lift = 0.12;
  const ampTop = -1.2;
  const ampW = 1.95;
  const ampH = ampTop - floor - lift;
  const ampD = 1.15;
  const panelH = 0.3;
  const tex = useMemo(() => {
    // Grille cloth: a light silver-wheat weave, with the 12-inch speaker showing through.
    const grille = canvasTexture(512, 256, (g) => {
      g.fillStyle = "#8f8676";
      g.fillRect(0, 0, 512, 256);
      const sp = g.createRadialGradient(256, 128, 8, 256, 128, 118);
      sp.addColorStop(0, "rgba(20,16,12,0.55)");
      sp.addColorStop(0.18, "rgba(20,16,12,0.25)");
      sp.addColorStop(0.2, "rgba(20,16,12,0.5)");
      sp.addColorStop(0.85, "rgba(20,16,12,0.38)");
      sp.addColorStop(0.92, "rgba(20,16,12,0.6)");
      sp.addColorStop(1, "rgba(20,16,12,0)");
      g.fillStyle = sp;
      g.beginPath();
      g.arc(256, 128, 118, 0, Math.PI * 2);
      g.fill();
      for (let y = 0; y < 256; y += 3) {
        g.fillStyle = y % 6 === 0 ? "rgba(40,34,26,0.35)" : "rgba(255,248,230,0.12)";
        g.fillRect(0, y, 512, 1);
      }
      for (let x = 0; x < 512; x += 3) {
        g.fillStyle = "rgba(30,26,20,0.18)";
        g.fillRect(x, 0, 1, 256);
      }
    });
    // Control panel: labels for the inputs, six knobs, and power.
    // Panel layout is in a 1024-wide coordinate space; the canvas matches the panel's real
    // aspect so the lettering is not stretched.
    const PW = Math.round((118 * (ampW - 0.12)) / panelH);
    const f = PW / 1024;
    const panel = canvasTexture(PW, 118, (g) => {
      const grad = g.createLinearGradient(0, 0, 0, 118);
      grad.addColorStop(0, "#d9d6cf");
      grad.addColorStop(1, "#a9a59c");
      g.fillStyle = grad;
      g.fillRect(0, 0, PW, 118);
      g.fillStyle = "#1b1b1b";
      g.font = "600 13px Helvetica, Arial, sans-serif";
      g.textAlign = "center";
      g.fillText("INPUT", 95 * f, 24);
      g.fillText("1", 60 * f, 110);
      g.fillText("2", 130 * f, 110);
      ["VOLUME", "BASS", "MIDDLE", "TREBLE", "REVERB", "MASTER"].forEach((l, i) => g.fillText(l, (262 + i * 110) * f, 24));
      g.fillText("POWER", 920 * f, 24);
      g.fillText("ON", 900 * f, 110);
      for (let i = 0; i < 6; i++) for (let n = 0; n < 11; n++) {
        const an = -2.4 + (n / 10) * 4.8;
        g.fillRect((262 + i * 110) * f + Math.sin(an) * 30, 68 - Math.cos(an) * 30, 2, 2);
      }
    });
    const logo = canvasTexture(256, 96, (g) => {
      g.fillStyle = "#cfa95a";
      g.fillRect(0, 0, 256, 96);
      g.fillStyle = "#2a1d0c";
      g.font = "italic 700 58px Georgia, serif";
      g.textAlign = "center";
      g.fillText("RS", 128, 70);
    });
    return { grille, panel, logo };
  }, []);
  const tolex = useMemo(() => new THREE.MeshStandardMaterial({ color: "#121212", roughness: 0.92 }), []);
  const jewel = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 0.25, 0.15), toneMapped: false }), []);
  const front = ampD / 2;
  // Panel x positions in amp units, matching the label texture (1024 px across the amp width).
  const px = (pxl: number) => (pxl / 1024 - 0.5) * (ampW - 0.12);
  return (
    <group>
      <MonitorStand h={h} top={ampTop} k={k} />
      {/* Tilt-back amp stand: two A-frames and a cross bar, standing on the fretboard */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <Tube a={[sx * (ampW / 2 - 0.25), floor, 0.25]} b={[sx * (ampW / 2 - 0.25), floor + lift, -0.05]} r={0.025} mat={k.black} />
          <Tube a={[sx * (ampW / 2 - 0.25), floor, -0.75]} b={[sx * (ampW / 2 - 0.25), floor + lift, -0.45]} r={0.025} mat={k.black} />
        </group>
      ))}
      <Tube a={[-(ampW / 2 - 0.25), floor + lift, -0.25]} b={[ampW / 2 - 0.25, floor + lift, -0.25]} r={0.03} mat={k.black} />
      <group position={[0, floor + lift + ampH / 2, -0.25]}>
        <mesh material={tolex}>
          <boxGeometry args={[ampW, ampH, ampD]} />
        </mesh>
        {/* Chrome corner protectors */}
        {[-1, 1].flatMap((sx) =>
          [-1, 1].map((sy) => (
            <mesh key={`${sx}${sy}`} position={[sx * (ampW / 2 - 0.03), sy * (ampH / 2 - 0.03), front - 0.03]} material={k.chrome}>
              <boxGeometry args={[0.1, 0.1, 0.1]} />
            </mesh>
          )),
        )}
        {/* Grille with piping and a logo plate */}
        <mesh position={[0, -panelH / 2, front + 0.002]} material={k.cream}>
          <planeGeometry args={[ampW - 0.22, ampH - panelH - 0.16]} />
        </mesh>
        <mesh position={[0, -panelH / 2, front + 0.004]}>
          <planeGeometry args={[ampW - 0.26, ampH - panelH - 0.2]} />
          <meshStandardMaterial map={tex.grille} roughness={0.95} />
        </mesh>
        <mesh position={[-ampW / 2 + 0.45, ampH / 2 - panelH - 0.2, front + 0.008]}>
          <planeGeometry args={[0.36, 0.13]} />
          <meshStandardMaterial map={tex.logo} roughness={0.3} metalness={0.6} />
        </mesh>
        {/* Control panel across the top front */}
        <mesh position={[0, ampH / 2 - panelH / 2 - 0.03, front + 0.003]}>
          <planeGeometry args={[ampW - 0.12, panelH]} />
          <meshStandardMaterial map={tex.panel} roughness={0.4} metalness={0.5} />
        </mesh>
        <group position={[0, ampH / 2 - panelH / 2 - 0.03, front]}>
          {/* Two input jacks */}
          {[60, 130].map((x) => (
            <group key={x} position={[px(x), -0.02, 0.01]}>
              <mesh material={k.chrome}>
                <torusGeometry args={[0.03, 0.012, 10, 24]} />
              </mesh>
              <mesh position={[0, 0, 0.002]}>
                <circleGeometry args={[0.022, 16]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
            </group>
          ))}
          {/* Six skirted knobs with chrome caps */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <group key={i} position={[px(262 + i * 110), -0.015, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <mesh position={[0, 0.012, 0]} material={k.black}>
                <cylinderGeometry args={[0.06, 0.065, 0.024, 24]} />
              </mesh>
              <mesh position={[0, 0.045, 0]} material={k.black}>
                <cylinderGeometry args={[0.04, 0.045, 0.05, 24]} />
              </mesh>
              <mesh position={[0, 0.072, 0]} material={k.chrome}>
                <cylinderGeometry args={[0.03, 0.03, 0.006, 20]} />
              </mesh>
            </group>
          ))}
          {/* Power toggle and red jewel pilot light */}
          <mesh position={[px(900), -0.02, 0.006]} material={k.chrome}>
            <boxGeometry args={[0.06, 0.09, 0.012]} />
          </mesh>
          <Tube a={[px(900), -0.02, 0.01]} b={[px(900), 0.03, 0.07]} r={0.008} mat={k.chrome} />
          <mesh position={[px(960), -0.02, 0.025]} material={jewel}>
            <sphereGeometry args={[0.028, 16, 10]} />
          </mesh>
          <pointLight position={[px(960), -0.02, 0.15]} color="#ff3020" intensity={0.6} distance={1.2} decay={2} />
        </group>
        {/* Carry handle */}
        <mesh position={[0, ampH / 2 + 0.03, -0.32]} material={k.black}>
          <boxGeometry args={[0.6, 0.05, 0.1]} />
        </mesh>
      </group>
      {/* Single-cut electric on a stand to the right */}
      <group position={[w / 2 + 0.95, floor, 0.75]} rotation={[0, -0.3, 0]} scale={0.74}>
        <GuitarStand k={k} />
        <group position={[0, 0.42 + 0.82, 0.08]} rotation={[-0.12, 0, 0]}>
          <Guitar k={k} />
        </group>
      </group>
    </group>
  );
}

// ---------- InputShare: two computers, one mouse ---------------------------------------

function arrowShape(scale: number) {
  const s = new THREE.Shape();
  const pts: [number, number][] = [[0, 0], [0, -1], [0.27, -0.75], [0.45, -1.1], [0.6, -1.03], [0.43, -0.68], [0.78, -0.68]];
  s.moveTo(0, 0);
  pts.slice(1).forEach(([x, y]) => s.lineTo(x * scale, y * scale));
  s.lineTo(0, 0);
  return s;
}

function InputShare({ w, h, clock, k }: { w: number; h: number; clock: PropArgs["clock"]; k: ReturnType<typeof useKit> }) {
  const deskTop = -h / 2 - 0.62;
  const floor = -2.97;
  // The second computer shows the real Windows desktop with the InputShare host open, at the capture's 16:9 aspect.
  const w2 = 2.3;
  const h2 = w2 / (1024 / 576);
  const keys = useMemo(() => keyboardTexture(), []);
  // Uses the same power-on reveal as the other screens in the world.
  const desktop2 = useMemo(() => {
    const t = new THREE.TextureLoader().load("/media/inputshare/windows-layout-tex.webp");
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    const material = new THREE.ShaderMaterial({
      uniforms: { map: { value: t }, uReveal: { value: 0 }, uHover: { value: 0 }, uHasMap: { value: 1 } },
      vertexShader: screenVertex,
      fragmentShader: screenFragment,
      toneMapped: false,
    });
    return { texture: t, material };
  }, []);
  useEffect(
    () => () => {
      desktop2.texture.dispose();
      desktop2.material.dispose();
    },
    [desktop2],
  );
  const laptopScreenPos = useMemo(() => new THREE.Vector3(), []);
  const arrow = useMemo(() => ({ fill: new THREE.ShapeGeometry(arrowShape(0.22)), edge: new THREE.ShapeGeometry(arrowShape(0.26)) }), []);
  const cursorA = useRef<THREE.Group>(null);
  const cursorB = useRef<THREE.Group>(null);
  const edgeA = useRef<THREE.Mesh>(null);
  const edgeB = useRef<THREE.Mesh>(null);
  const mouse = useRef<THREE.Group>(null);
  // The laptop: its base sits flat on the desk, turned toward the Mac; the lid is hinged at
  // the back of the base and leans back.
  const LAPTOP_D = 1.25;
  const LID_TILT = -0.2;
  const laptopAt = useMemo(() => ({ position: new THREE.Vector3(w / 2 + w2 / 2 + 0.55, deskTop, 0.0), rotY: -0.7 }), [w, deskTop]);

  // Like real input sharing: the pointer lives on one virtual desktop that spans both
  // screens. It slides off this screen's right edge (clipped there, never drawn past the
  // bezel) and in from the laptop's left edge, then glides back the same way.
  const ARROW_W = 0.78 * 0.22;
  const startX = -w * 0.22;
  const runA = w / 2 - startX;
  const runB = 0.55 + ARROW_W;
  const root = useRef<THREE.Group>(null);
  const laptop = useRef<THREE.Group>(null);
  const clip = useMemo(() => ({ a: new THREE.Plane(), b: new THREE.Plane(), v: new THREE.Vector3(), n: new THREE.Vector3(), m: new THREE.Matrix3() }), []);
  const cursorMats = useMemo(() => {
    const make = (color: THREE.ColorRepresentation, plane: THREE.Plane, tm = true) =>
      new THREE.MeshBasicMaterial({ color, clippingPlanes: [plane], toneMapped: tm });
    return {
      aEdge: make("#000000", clip.a),
      aFill: make("#ffffff", clip.a, false),
      bEdge: make("#000000", clip.b),
      bFill: make("#ffffff", clip.b, false),
    };
  }, [clip]);
  useFrame((state) => {
    // Clip planes in world space: keep the side inside each screen.
    const setPlane = (plane: THREE.Plane, obj: THREE.Object3D | null, x: number, dir: number) => {
      if (!obj) return;
      obj.updateWorldMatrix(true, false);
      clip.v.set(x, 0, 0).applyMatrix4(obj.matrixWorld);
      clip.m.getNormalMatrix(obj.matrixWorld);
      clip.n.set(dir, 0, 0).applyMatrix3(clip.m).normalize();
      plane.setFromNormalAndCoplanarPoint(clip.n, clip.v);
    };
    setPlane(clip.a, root.current, w / 2 - 0.005, -1);
    setPlane(clip.b, laptop.current, -w2 / 2 + 0.005, 1);

    if (laptop.current) {
      laptop.current.getWorldPosition(laptopScreenPos);
      const motion = document.documentElement.dataset.motion !== "off";
      desktop2.material.uniforms.uReveal!.value = motion ? revealAt(laptopScreenPos.distanceTo(state.camera.position)) : 1;
    }
    const t = clock.current.time;
    const ph = (t % 7.5) / 7.5;
    const total = runA + runB;
    const X = total * (THREE.MathUtils.smootherstep(ph, 0.06, 0.42) - THREE.MathUtils.smootherstep(ph, 0.56, 0.92));
    if (cursorA.current) cursorA.current.position.set(startX + X, THREE.MathUtils.lerp(0.0, 0.3, Math.min(1, X / runA)), 0.02);
    if (cursorB.current) cursorB.current.position.set(-w2 / 2 + (X - runA) - ARROW_W, 0.3 * (h2 / h) + 0.05, 0.02);
    const near = Math.exp(-Math.pow((X - runA) / 0.22, 2));
    [edgeA.current, edgeB.current].forEach((e) => {
      if (e) (e.material as THREE.MeshBasicMaterial).opacity = near * 0.9;
    });
    if (mouse.current) mouse.current.position.set(1.15 + (X / total) * 0.95, deskTop + 0.06, 1.4);
  });

  return (
    <group ref={root}>
      <group position={[(w2 + 1.4) / 2, 0, 0]}>
        <Desk width={w + w2 + 3.3} depth={3.0} top={deskTop} floor={floor} z={0.55} mat={k.walnut} legMat={k.black} />
      </group>
      <MonitorStand h={h} top={deskTop} k={k} />
      {/* Pointer on this screen, and the edge it hands off from */}
      <group ref={cursorA}>
        <mesh geometry={arrow.edge} position={[-0.015, 0.015, -0.001]} material={cursorMats.aEdge} />
        <mesh geometry={arrow.fill} material={cursorMats.aFill} />
      </group>
      <mesh ref={edgeA} position={[w / 2 - 0.02, 0.15, 0.015]}>
        <planeGeometry args={[0.04, h * 0.8]} />
        <meshBasicMaterial color={new THREE.Color(0.5, 2.2, 1.2)} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* The second computer */}
      <group position={laptopAt.position} rotation={[0, laptopAt.rotY, 0]}>
        {/* Base and keyboard deck, flat on the desk */}
        <mesh position={[0, 0.035, LAPTOP_D / 2]} material={k.alu}>
          <boxGeometry args={[w2 + 0.16, 0.07, LAPTOP_D]} />
        </mesh>
        <mesh position={[0, 0.071, LAPTOP_D * 0.36]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w2 * 0.85, LAPTOP_D * 0.42]} />
          <meshStandardMaterial map={keys} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.071, LAPTOP_D * 0.78]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w2 * 0.32, LAPTOP_D * 0.28]} />
          <meshStandardMaterial color="#a4a7ab" roughness={0.25} metalness={0.7} />
        </mesh>
        {/* Lid on its hinge */}
        <group position={[0, 0.07, 0.02]} rotation={[LID_TILT, 0, 0]}>
          <group ref={laptop} position={[0, h2 / 2 + 0.1, 0.03]}>
            <mesh position={[0, 0, -0.03]} material={k.black}>
              <boxGeometry args={[w2 + 0.14, h2 + 0.16, 0.03]} />
            </mesh>
            <mesh position={[0, 0, -0.005]}>
              <planeGeometry args={[w2, h2]} />
              <primitive object={desktop2.material} attach="material" />
            </mesh>
            <group ref={cursorB}>
              <mesh geometry={arrow.edge} position={[-0.015, 0.015, -0.001]} material={cursorMats.bEdge} />
              <mesh geometry={arrow.fill} material={cursorMats.bFill} />
            </group>
            <mesh ref={edgeB} position={[-w2 / 2 + 0.02, 0.05, 0.015]}>
              <planeGeometry args={[0.04, h2 * 0.8]} />
              <meshBasicMaterial color={new THREE.Color(0.5, 2.2, 1.2)} transparent opacity={0} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0, -0.06]} material={k.alu}>
              <boxGeometry args={[w2 + 0.16, h2 + 0.18, 0.035]} />
            </mesh>
          </group>
        </group>
      </group>
      {/* Keyboard, mouse pad, mouse */}
      <Keyboard width={2.3} depth={0.75} position={[-0.6, deskTop + 0.03, 1.3]} tex={keys} k={k} />
      <mesh position={[1.55, deskTop + 0.004, 1.4]} rotation={[-Math.PI / 2, 0, 0]} material={k.rubber}>
        <planeGeometry args={[1.5, 1.0]} />
      </mesh>
      <group ref={mouse}>
        <Mouse k={k} />
      </group>
    </group>
  );
}

// ---------- learncenter.dev: office desk --------------------------------------------------

function Office({ w, h, k }: { w: number; h: number; k: ReturnType<typeof useKit> }) {
  const deskTop = -h / 2 - 0.62;
  const floor = -2.97;
  const keys = useMemo(() => keyboardTexture(), []);
  return (
    <group>
      <Desk width={w + 3.8} depth={2.6} top={deskTop} floor={floor} z={0.5} mat={k.oak} legMat={k.alu} />
      <MonitorStand h={h} top={deskTop} k={k} />
      <Keyboard width={2.3} depth={0.75} position={[0, deskTop + 0.03, 1.1]} tex={keys} k={k} />
      <group position={[1.65, deskTop + 0.06, 1.1]}>
        <Mouse k={k} />
      </group>
      {/* Mug */}
      <group position={[-w / 2 - 0.75, deskTop, 1.0]}>
        <mesh position={[0, 0.22, 0]} material={k.ceramic}>
          <cylinderGeometry args={[0.18, 0.16, 0.44, 24]} />
        </mesh>
        <mesh position={[0.2, 0.24, 0]} rotation={[0, 0, Math.PI / 2]} material={k.ceramic}>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
        </mesh>
      </group>
      {/* Snake plant: upright leaves growing from the soil, inside the pot */}
      <group position={[w / 2 + 1.1, deskTop, 0.2]}>
        <mesh position={[0, 0.28, 0]} material={k.terracotta}>
          <cylinderGeometry args={[0.32, 0.24, 0.56, 28]} />
        </mesh>
        <mesh position={[0, 0.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 28]} />
          <meshStandardMaterial color="#2b1c12" roughness={1} />
        </mesh>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const a = (i / 7) * Math.PI * 2 + 0.3;
          const r = i === 0 ? 0 : 0.13;
          const hgt = 0.55 + ((i * 37) % 5) * 0.09;
          const lean = i === 0 ? 0 : 0.12;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * r, 0.55 + hgt / 2, Math.sin(a) * r]}
              rotation={[Math.sin(a) * lean, a, -Math.cos(a) * lean]}
              scale={[0.075, hgt / 2, 0.022]}
              material={i % 2 ? k.leaf : k.leafLight}
            >
              <sphereGeometry args={[1, 14, 12]} />
            </mesh>
          );
        })}
      </group>
      {/* Desk lamp */}
      <group position={[-w / 2 - 1.3, deskTop, -0.2]}>
        <mesh position={[0, 0.04, 0]} material={k.black}>
          <cylinderGeometry args={[0.3, 0.32, 0.08, 24]} />
        </mesh>
        <Tube a={[0, 0.08, 0]} b={[0.25, 1.3, 0.1]} r={0.03} mat={k.black} />
        <Tube a={[0.25, 1.3, 0.1]} b={[0.75, 1.6, 0.35]} r={0.03} mat={k.black} />
        <mesh position={[0.82, 1.5, 0.4]} rotation={[0.3, 0, -0.9]} material={k.black}>
          <coneGeometry args={[0.22, 0.4, 24, 1, true]} />
        </mesh>
        <mesh position={[0.9, 1.4, 0.45]}>
          <sphereGeometry args={[0.07, 12, 8]} />
          <meshBasicMaterial color={new THREE.Color(2.2, 1.7, 1.1)} toneMapped={false} />
        </mesh>
        <pointLight position={[0.95, 1.2, 0.5]} color="#ffd9a0" intensity={3} distance={5} decay={2} />
      </group>
    </group>
  );
}

// ---------- TalkMac: all-in-one and a podcast mic ---------------------------------------------

function TalkMac({ w, h, clock, k }: { w: number; h: number; clock: PropArgs["clock"]; k: ReturnType<typeof useKit> }) {
  const deskTop = -h / 2 - 0.5 - 0.75;
  const keys = useMemo(() => keyboardTexture(), []);
  const floor = -2.97;
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.2, 2.2), toneMapped: false }), []);
  const ring = useRef<THREE.Mesh>(null);
  const grille = useMemo(
    () =>
      canvasTexture(128, 128, (g) => {
        g.fillStyle = "#2c2c2e";
        g.fillRect(0, 0, 128, 128);
        g.fillStyle = "#5a5a5e";
        for (let y = 0; y < 128; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < 128; x += 6) g.fillRect(x, y, 3, 3);
      }, [3, 3]),
    [],
  );
  const aio = useMemo(() => {
    const alu = new THREE.MeshPhysicalMaterial({ color: "#c9ced6", roughness: 0.28, metalness: 0.9, clearcoat: 0.3 });
    const shell = new THREE.ExtrudeGeometry(roundedRect(w + 0.24, h + 0.66, 0.09), {
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 4,
      curveSegments: 12,
    });
    // Stand side profile in (z, y): up from the foot, angled back, into the shell.
    const f = deskTop;
    const prof = new THREE.Shape();
    prof.moveTo(-0.12, -0.15);
    prof.lineTo(-0.5, f + 0.12);
    prof.quadraticCurveTo(-0.535, f, -0.42, f);
    prof.lineTo(0.32, f);
    prof.lineTo(0.32, f + 0.035);
    prof.lineTo(-0.4, f + 0.035);
    prof.quadraticCurveTo(-0.48, f + 0.035, -0.462, f + 0.12);
    prof.lineTo(-0.08, -0.15);
    prof.lineTo(-0.12, -0.15);
    const stand = new THREE.ExtrudeGeometry(prof, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
    stand.rotateY(-Math.PI / 2);
    stand.translate(0.45, 0, 0);
    return { alu, shell, stand };
  }, [w, h, deskTop]);
  useEffect(
    () => () => {
      aio.alu.dispose();
      aio.shell.dispose();
      aio.stand.dispose();
    },
    [aio],
  );
  useFrame(() => {
    const e = speechEnv(clock.current.time);
    ringMat.color.setRGB(0.15 + 0.6 * e, 0.4 + 1.4 * e, 0.8 + 2.2 * e);
    if (ring.current) ring.current.scale.setScalar(1 + e * 0.12);
  });
  return (
    <group>
      <Desk width={w + 3.4} depth={2.6} top={deskTop} floor={floor} z={0.35} mat={k.walnut} legMat={k.black} />
      {/* All-in-one: one rounded aluminum shell behind the glass with a chin below it, on a
          bent-sheet stand whose foot rests fully on the desk. */}
      <mesh geometry={aio.shell} material={aio.alu} position={[0, -0.22, -0.13]} />
      <mesh geometry={aio.stand} material={aio.alu} />
      <mesh position={[0, -h / 2 - 0.29, -0.058]}>
        <planeGeometry args={[w * 0.18, 0.012]} />
        <meshStandardMaterial color="#9aa0a8" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* White keyboard and mouse */}
      <Keyboard width={2.3} depth={0.7} position={[-0.2, deskTop + 0.03, 1.0]} tex={keys} k={k} />
      <group position={[1.4, deskTop + 0.05, 1.0]}>
        <mesh scale={[0.16, 0.06, 0.26]} material={k.ceramic}>
          <sphereGeometry args={[1, 24, 16]} />
        </mesh>
      </group>
      {/* A desk mic beside the keyboard, listening */}
      <group position={[w / 2 + 0.5, deskTop, 0.95]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 0.03, 0]} material={k.black}>
          <cylinderGeometry args={[0.28, 0.3, 0.06, 28]} />
        </mesh>
        <Tube a={[0, 0.06, 0]} b={[0, 0.5, 0]} r={0.03} mat={k.black} />
        <group position={[0, 0.72, 0.04]} rotation={[0.45, 0, 0]}>
          <mesh>
            <cylinderGeometry args={[0.13, 0.12, 0.46, 24]} />
            <meshStandardMaterial map={grille} roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.23, 0]} material={k.darkAlu}>
            <sphereGeometry args={[0.13, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={k.black} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.2, 0.018, 8, 32]} />
          </mesh>
          <mesh ref={ring} position={[0, -0.08, 0]} material={ringMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.135, 0.012, 6, 32]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

// ---------- ProTuner: a floating phone ---------------------------------------------------------

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}

function Phone({ w, h, k }: { w: number; h: number; k: ReturnType<typeof useKit> }) {
  const geo = useMemo(() => {
    const bw = w + 0.17;
    const bh = h + 0.17;
    return {
      body: new THREE.ExtrudeGeometry(roundedRect(bw, bh, 0.26), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 16 }),
      glass: new THREE.ShapeGeometry(roundedRect(bw - 0.02, bh - 0.02, 0.24), 16),
      island: new THREE.ShapeGeometry(roundedRect(0.36, 0.11, 0.055), 8),
      bw,
      bh,
    };
  }, [w, h]);
  return (
    <group>
      <mesh geometry={geo.body} material={k.titanium} position={[0, 0, -0.2]} />
      <mesh geometry={geo.glass} position={[0, 0, -0.03]}>
        <meshStandardMaterial color="#020203" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh geometry={geo.island} position={[0, h / 2 - 0.14, 0.004]}>
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Side buttons */}
      <mesh position={[-geo.bw / 2 - 0.03, h * 0.22, -0.12]} material={k.titanium}>
        <boxGeometry args={[0.04, 0.32, 0.06]} />
      </mesh>
      <mesh position={[-geo.bw / 2 - 0.03, h * 0.08, -0.12]} material={k.titanium}>
        <boxGeometry args={[0.04, 0.2, 0.06]} />
      </mesh>
      <mesh position={[geo.bw / 2 + 0.03, h * 0.16, -0.12]} material={k.titanium}>
        <boxGeometry args={[0.04, 0.42, 0.06]} />
      </mesh>
      {/* Camera island on the back */}
      <mesh position={[-geo.bw / 2 + 0.42, geo.bh / 2 - 0.42, -0.26]} material={k.titanium}>
        <boxGeometry args={[0.6, 0.6, 0.05]} />
      </mesh>
    </group>
  );
}

// ---------- GrooveMind: laptop and studio monitors -------------------------------------------------

function Speaker({ k }: { k: ReturnType<typeof useKit> }) {
  const ledMat = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 2.4), toneMapped: false }), []);
  return (
    <group>
      <mesh position={[0, 0.78, 0]} material={k.matte}>
        <boxGeometry args={[0.95, 1.56, 0.95]} />
      </mesh>
      <mesh position={[0, 0.78, 0.478]} material={k.black}>
        <planeGeometry args={[0.87, 1.48]} />
      </mesh>
      {/* Woofer: rubber surround, yellow cone, black dust cap */}
      <mesh position={[0, 0.52, 0.49]} material={k.rubber}>
        <torusGeometry args={[0.31, 0.04, 12, 40]} />
      </mesh>
      <group position={[0, 0.52, 0.47]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={k.cone}>
          <coneGeometry args={[0.3, 0.16, 40, 1, true]} />
        </mesh>
        <mesh position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]} material={k.black}>
          <sphereGeometry args={[0.085, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>
      {/* Tweeter */}
      <mesh position={[0, 1.18, 0.49]} material={k.rubber}>
        <torusGeometry args={[0.12, 0.025, 10, 28]} />
      </mesh>
      <mesh position={[0, 1.18, 0.48]} rotation={[Math.PI / 2, 0, 0]} material={k.darkAlu}>
        <sphereGeometry args={[0.09, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh position={[0, 0.08, 0.485]} material={ledMat}>
        <boxGeometry args={[0.5, 0.02, 0.01]} />
      </mesh>
    </group>
  );
}

function Groove({ w, h, k }: { w: number; h: number; k: ReturnType<typeof useKit> }) {
  const baseY = -h / 2 - 0.12;
  const depth = h * 0.7;
  const floor = -2.85;
  const keys = useMemo(() => keyboardTexture(), []);
  return (
    <group>
      <Desk width={w + 4.2} depth={depth + 1.2} top={baseY - 0.05} floor={floor} z={depth / 2} mat={k.walnut} legMat={k.black} />
      {/* Lid: silver back and hinge */}
      <mesh position={[0, -0.04, -0.09]} material={k.alu}>
        <boxGeometry args={[w + 0.18, h + 0.24, 0.05]} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.1, -0.03]} rotation={[0, 0, Math.PI / 2]} material={k.darkAlu}>
        <cylinderGeometry args={[0.05, 0.05, w * 0.85, 16]} />
      </mesh>
      {/* Base with keyboard and trackpad */}
      <group position={[0, baseY, depth / 2]}>
        <mesh material={k.alu}>
          <boxGeometry args={[w + 0.18, 0.1, depth]} />
        </mesh>
        <mesh position={[0, 0.051, -depth * 0.16]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.82, depth * 0.42]} />
          <meshStandardMaterial map={keys} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.052, depth * 0.27]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w * 0.36, depth * 0.3]} />
          <meshStandardMaterial color="#a4a7ab" roughness={0.25} metalness={0.7} />
        </mesh>
      </group>
      {/* Studio monitors on either side */}
      {[-1, 1].map((sd) => (
        <group key={sd} position={[sd * (w / 2 + 1.15), baseY - 0.05, 0.25]} rotation={[0, -sd * 0.3, 0]}>
          <Speaker k={k} />
        </group>
      ))}
    </group>
  );
}

// ---------- entry ----------------------------------------------------------------------------------

export function ScreenProps({ slug, w, h, clock }: PropArgs) {
  const k = useKit();
  return (
    <group>
      {/* Screen glow on the hardware comes from two shared lights that follow the camera (World.tsx). */}
      {slug === "fr3t-app" && <Fr3t w={w} h={h} k={k} />}
      {slug === "inputshare" && <InputShare w={w} h={h} clock={clock} k={k} />}
      {slug === "learncenter-dev" && <Office w={w} h={h} k={k} />}
      {slug === "talkmac" && <TalkMac w={w} h={h} clock={clock} k={k} />}
      {slug === "protuner" && <Phone w={w} h={h} k={k} />}
      {slug === "groovemind" && <Groove w={w} h={h} k={k} />}
    </group>
  );
}
