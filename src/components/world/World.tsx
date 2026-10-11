"use client";

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  BlendFunction,
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  VignetteEffect,
} from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { compositeFragment, fieldFragment, fieldVertex } from "./fieldShader";
import { buildRig, dwell, INTRO_Z, pathXY, placeScreen, STATION_SPACING, stationZ, type ScreenPlacement } from "./path";
import { ScreenProps, useStudioEnvironment } from "./Props";
import { revealAt, screenFragment, screenVertex } from "./screenShader";
import type { QualityTier, WorldProps, WorldProject } from "./store";

/* Quality tiers. The scene starts at a tier chosen for the device and moves
   up or down based on measured frame rate. */
const TIERS = [
  { scale: 0.3, steps: 56, dpr: 1, dust: 600, fx: false, msaa: 0 },
  { scale: 0.42, steps: 76, dpr: 1.25, dust: 1500, fx: false, msaa: 0 },
  { scale: 0.56, steps: 100, dpr: 1.5, dust: 3000, fx: true, msaa: 4 },
  { scale: 0.7, steps: 128, dpr: 1.75, dust: 4800, fx: true, msaa: 4 },
] as const;
const MAX_DUST = 4800;

const MOTIF: Record<string, number> = { "fr3t-app": 0, inputshare: 1, "learncenter-dev": 2, talkmac: 3, protuner: 4, groovemind: 5 };
const ACCENT: Record<string, [number, number, number]> = {
  "fr3t-app": [0.16, 0.42, 1.0],
  inputshare: [0.3, 0.85, 0.45],
  "learncenter-dev": [0.25, 0.4, 1.0],
  talkmac: [0.3, 0.6, 1.0],
  protuner: [1.0, 0.45, 0.08],
  groovemind: [0.42, 0.36, 1.0],
};

/*
  fr3t.app's run: C major climbing the neck four notes per string, shifting
  position on each string change, then back down the same path.
  Strings are numbered from the low E (0) to the high E (5).
*/
const RUN_UP: [number, number][] = [
  [1, 3], [1, 5], [1, 7], [1, 8],
  [2, 5], [2, 7], [2, 9], [2, 10],
  [3, 7], [3, 9], [3, 10], [3, 12],
  [4, 10], [4, 12], [4, 13], [4, 15],
  [5, 12], [5, 13], [5, 15], [5, 17],
];
const RUN_SHAPE: number[][] = [0, 1, 2, 3, 4, 5].map((s) => {
  const frets = RUN_UP.filter(([str]) => str === s).map(([, f]) => f);
  return [0, 1, 2, 3].map((i) => frets[i] ?? -1);
});
const NOTE_GAP = 0.16;
const RUN_EVENTS = (() => {
  const ev: { t: number; s: number; f: number }[] = [];
  let t = 0;
  RUN_UP.forEach(([s, f]) => {
    ev.push({ t, s, f });
    t += NOTE_GAP;
  });
  t += 0.45; // hold the top note
  for (let i = RUN_UP.length - 2; i >= 0; i--) {
    const [s, f] = RUN_UP[i]!;
    ev.push({ t, s, f });
    t += NOTE_GAP;
  }
  return { ev, length: t + 0.9 };
})();

const dustVertex = /* glsl */ `
uniform float uTime;
uniform float uPix;
attribute float aSeed;
varying float vA;
vec2 pathXY(float z) {
  return vec2(sin(z * 0.045) * 5.0 + sin(z * 0.013 + 1.3) * 3.0, cos(z * 0.031) * 1.4);
}
void main() {
  vec3 p = position;
  p.y += mod(uTime * 0.09 * (0.4 + aSeed) + aSeed * 13.0, 6.0) - 3.0;
  p.x += sin(uTime * 0.27 + aSeed * 31.0) * 0.25;
  p.xy += pathXY(p.z);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp((0.5 + aSeed * 1.8) * uPix * (7.0 / -mv.z), 0.5, 9.0);
  vA = smoothstep(55.0, 6.0, -mv.z) * smoothstep(0.3, 1.5, -mv.z) * (0.25 + 0.75 * aSeed);
}
`;
const dustFragment = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vA;
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.55) * 1.6 * a, a);
}
`;

/** Small deterministic PRNG so the dust layout is the same on every visit. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface LoadedScreen {
  texture: THREE.Texture;
  color: THREE.Color;
}

/** Average a texture's image into one color for the light it casts on the world. */
function averageColor(image: CanvasImageSource): THREE.Color {
  const c = document.createElement("canvas");
  c.width = c.height = 8;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return new THREE.Color(0.3, 0.3, 0.3);
  g.drawImage(image, 0, 0, 8, 8);
  const d = g.getImageData(0, 0, 8, 8).data;
  let r = 0,
    gr = 0,
    b = 0;
  for (let i = 0; i < d.length; i += 4) {
    r += d[i]!;
    gr += d[i + 1]!;
    b += d[i + 2]!;
  }
  const n = d.length / 4;
  const col = new THREE.Color().setRGB(r / n / 255, gr / n / 255, b / n / 255, THREE.SRGBColorSpace);
  // Screens are mostly dark UI; lift the hue so the cast light reads.
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  return col.setHSL(hsl.h, Math.min(1, hsl.s * 1.6 + 0.15), 0.42);
}

function useScreens(projects: WorldProject[], narrow: boolean, onFirst: () => void, onError: (r: string) => void) {
  const [loaded, setLoaded] = useState<(LoadedScreen | null)[]>(() => projects.map(() => null));
  const gl = useThree((s) => s.gl);
  const firstRef = useRef(false);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const textures: THREE.Texture[] = [];
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    (async () => {
      for (let i = 0; i < projects.length; i++) {
        const p = projects[i]!;
        try {
          const tex = await loader.loadAsync(narrow ? p.textureSmall : p.texture.src);
          if (cancelled) {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = aniso;
          textures.push(tex);
          const color = averageColor(tex.image as CanvasImageSource);
          setLoaded((prev) => prev.map((s, k) => (k === i ? { texture: tex, color } : s)));
          if (!firstRef.current) {
            firstRef.current = true;
            onFirst();
          }
        } catch {
          if (i === 0) onError("texture");
        }
      }
    })();
    return () => {
      cancelled = true;
      textures.forEach((t) => t.dispose());
    };
    // Reload only when the set of screens or the size class changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, narrow]);

  return loaded;
}

function Screen({
  slug,
  placement,
  loaded,
  material,
  clock,
  onOpen,
  onHover,
}: {
  slug: string;
  placement: ScreenPlacement;
  loaded: LoadedScreen | null;
  material: THREE.ShaderMaterial;
  clock: { current: { time: number } };
  onOpen: (slug: string) => void;
  onHover: (slug: string | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const rimColor = useMemo(() => (loaded ? loaded.color.clone().multiplyScalar(2.1) : new THREE.Color(0.2, 0.2, 0.2)), [loaded]);
  const glow = useMemo(() => (loaded ? loaded.color.clone() : new THREE.Color(0.3, 0.3, 0.3)), [loaded]);
  const floating = slug === "protuner";
  // Monitors get a glowing rim; the phone, the laptop, and the all-in-one have their own housings.
  const monitor = !floating && slug !== "groovemind" && slug !== "talkmac";

  useEffect(() => {
    material.uniforms.map!.value = loaded?.texture ?? null;
    material.uniforms.uHasMap!.value = loaded ? 1 : 0;
  }, [loaded, material]);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(placement.center);
    g.lookAt(placement.center.clone().add(placement.normal));
  }, [placement]);

  useFrame(() => {
    const g = group.current;
    if (!g || !floating) return;
    const t = clock.current.time;
    g.position.copy(placement.center);
    g.position.y += Math.sin(t * 1.1) * 0.09;
    g.lookAt(placement.center.clone().add(placement.normal));
    g.rotateY(Math.sin(t * 0.55) * 0.09);
    g.rotateZ(Math.sin(t * 0.8 + 1.0) * 0.025);
  });

  const { width: w, height: h } = placement;
  return (
    <group ref={group}>
      {!floating && (
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[w + 0.16, h + 0.16, 0.06]} />
          <meshStandardMaterial color="#07090a" roughness={0.3} metalness={0.7} />
        </mesh>
      )}
      {monitor && (
        <mesh position={[0, 0, -0.012]}>
          <planeGeometry args={[w + 0.07, h + 0.07]} />
          <meshBasicMaterial color={rimColor} toneMapped={false} />
        </mesh>
      )}
      <mesh
        material={material}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          if (e.delta < 6) onOpen(slug);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(slug);
        }}
        onPointerOut={() => onHover(null)}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
      <ScreenProps slug={slug} w={w} h={h} clock={clock} glow={glow} />
    </group>
  );
}

function Scene(props: WorldProps) {
  const { projects, store, narrow, onReady, onError, onOpen, onHover, onRoamExit, exitRoamRef, initialTier } = props;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);

  const tierRef = useRef<QualityTier>(initialTier);
  // Reflections for the props' metal and lacquer. The raymarched field does its own lighting.
  useStudioEnvironment(gl, scene);
  const [hovered, setHovered] = useState<string | null>(null);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const loaded = useScreens(projects, narrow, () => setFirstLoaded(true), onError);

  const placements = useMemo(
    () =>
      projects.map((p, i) => {
        const placement = placeScreen(i, p.texture.width / p.texture.height);
        // InputShare's Windows laptop sits to the right of the Mac screen; keep both in frame.
        if (p.slug === "inputshare") placement.extraRight = 2.6;
        return placement;
      }),
    [projects],
  );
  const rig = useMemo(
    () => buildRig(placements, size.width / Math.max(1, size.height), camera.fov, narrow),
    [placements, size.width, size.height, camera.fov, narrow],
  );

  const screenMaterials = useMemo(
    () =>
      projects.map(
        () =>
          new THREE.ShaderMaterial({
            uniforms: { map: { value: null }, uReveal: { value: 0 }, uHover: { value: 0 }, uHasMap: { value: 0 } },
            vertexShader: screenVertex,
            fragmentShader: screenFragment,
            toneMapped: false,
          }),
      ),
    [projects],
  );

  // Field pass: its own scene, quad, and low-resolution target.
  const field = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    const quad = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fieldVertex,
      fragmentShader: fieldFragment,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCamWorld: { value: new THREE.Matrix4() },
        uProjInv: { value: new THREE.Matrix4() },
        uView: { value: new THREE.Matrix4() },
        uCamPos: { value: new THREE.Vector3() },
        uSteps: { value: TIERS[initialTier].steps },
        uMotifA: { value: 0 },
        uMotifB: { value: 1 },
        uBandA: { value: stationZ(0) },
        uBandB: { value: stationZ(1) },
        uScreenPos: { value: [new THREE.Vector3(0, 0, -999), new THREE.Vector3(0, 0, -999)] },
        uScreenCol: { value: [new THREE.Vector3(), new THREE.Vector3()] },
        uAccentA: { value: new THREE.Vector3(...ACCENT["fr3t-app"]!) },
        uAccentB: { value: new THREE.Vector3(...ACCENT["fr3t-app"]!) },
        uAccentMix: { value: 0 },
        uShape: { value: RUN_SHAPE.map((f) => new THREE.Vector4(f[0], f[1], f[2], f[3])) },
        uPlay: { value: [0, 1, 2, 3].map(() => new THREE.Vector3(0, 0, 0)) },
        uStrAmp: { value: [0, 0, 0, 0, 0, 0] },
        uRefl: { value: TIERS[initialTier].fx ? 1 : 0 },
      },
    });
    const mesh = new THREE.Mesh(quad, material);
    mesh.frustumCulled = false;
    const fieldScene = new THREE.Scene();
    fieldScene.add(mesh);
    const composite = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: fieldVertex,
      fragmentShader: compositeFragment,
      depthTest: true,
      depthWrite: true,
      depthFunc: THREE.AlwaysDepth,
      uniforms: { uField: { value: target.texture }, uProj: { value: new THREE.Matrix4() }, uFade: { value: 0 } },
    });
    return { target, quad, material, scene: fieldScene, cam: new THREE.OrthographicCamera(), composite };
  }, [initialTier]);

  const dust = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX_DUST * 3);
    const seed = new Float32Array(MAX_DUST);
    const zMin = stationZ(projects.length - 1) - 25;
    const rand = mulberry32(1995);
    for (let i = 0; i < MAX_DUST; i++) {
      const a = rand() * Math.PI * 2;
      const r = 0.4 + Math.sqrt(rand()) * 2.8;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = Math.sin(a) * r;
      pos[i * 3 + 2] = INTRO_Z + 6 + rand() * (zMin - INTRO_Z - 6);
      seed[i] = rand();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    geo.setDrawRange(0, TIERS[initialTier].dust);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPix: { value: 1 } },
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    return { geo, mat };
  }, [projects.length, initialTier]);

  const post = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: TIERS[initialTier].msaa });
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new BloomEffect({ mipmapBlur: true, luminanceThreshold: 1.05, luminanceSmoothing: 0.25, intensity: 0.85, radius: 0.68 });
    const aberration = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0007, 0.0005), radialModulation: true, modulationOffset: 0.35 });
    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN });
    noise.blendMode.opacity.value = 0.22;
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.7 });
    composer.addPass(new EffectPass(camera, bloom, aberration, noise, vignette));
    return { composer, aberration, noise };
  }, [gl, scene, camera, initialTier]);

  // Dispose GPU resources on unmount.
  useEffect(
    () => () => {
      post.composer.dispose();
      field.target.dispose();
      field.quad.dispose();
      field.material.dispose();
      field.composite.dispose();
      dust.geo.dispose();
      dust.mat.dispose();
      screenMaterials.forEach((m) => m.dispose());
    },
    [post, field, dust, screenMaterials],
  );

  const applyTier = (t: QualityTier) => {
    const tier = TIERS[t];
    tierRef.current = t;
    // The pixel ratio stays at its starting value: changing it resizes the canvas and flashes a blank frame.
    field.material.uniforms.uSteps!.value = tier.steps;
    field.material.uniforms.uRefl!.value = tier.fx ? 1 : 0;
    dust.geo.setDrawRange(0, tier.dust);
    post.aberration.blendMode.opacity.value = tier.fx ? 1 : 0;
    post.noise.blendMode.opacity.value = tier.fx ? 0.22 : 0.1;
    post.composer.multisampling = tier.msaa;
  };

  // Size the composer and the field target to the drawing buffer.
  const dpr = useThree((s) => s.viewport.dpr);
  useEffect(() => {
    post.composer.setSize(size.width, size.height);
    const s = TIERS[tierRef.current].scale;
    field.target.setSize(Math.max(2, Math.floor(size.width * dpr * s)), Math.max(2, Math.floor(size.height * dpr * s)));
    dust.mat.uniforms.uPix!.value = dpr;
  }, [size.width, size.height, dpr, post, field, dust]);

  // Compile every shader before revealing the canvas, so the first frames do not stall.
  useEffect(() => {
    if (!firstLoaded) return;
    let cancelled = false;
    Promise.all([gl.compileAsync(field.scene, field.cam), gl.compileAsync(scene, camera)])
      .catch(() => undefined)
      .then(() => {
        if (!cancelled) onReady();
      });
    return () => {
      cancelled = true;
    };
  }, [firstLoaded, gl, field, scene, camera, onReady]);

  // A lost GPU context ends the 3D view; the page falls back to the static stage.
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      onError("context-lost");
    };
    el.addEventListener("webglcontextlost", lost);
    return () => el.removeEventListener("webglcontextlost", lost);
  }, [gl, onError]);

  // Frame state kept outside React.
  const st = useRef({
    time: 0,
    look: new THREE.Vector3(),
    first: true,
    stop: -1,
    fade: 0,
    roamInit: false,
    yaw: 0,
    pitch: 0,
    frames: 0,
    frameTime: 0,
    goodWindows: 0,
  });

  useEffect(() => {
    exitRoamRef.current = () => {
      const z = camera.position.z;
      const i = THREE.MathUtils.clamp(Math.round(-z / STATION_SPACING - 1), 0, projects.length - 1);
      st.current.roamInit = false;
      onRoamExit(i);
    };
    return () => {
      exitRoamRef.current = null;
    };
  }, [camera, exitRoamRef, onRoamExit, projects.length]);

  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), tgt: new THREE.Vector3(), fwd: new THREE.Vector3(), right: new THREE.Vector3(), euler: new THREE.Euler(0, 0, 0, "YXZ") }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = st.current;
    const motion = store.motion;
    if (motion) s.time += dt;

    // --- Camera -------------------------------------------------------------
    if (store.roam.active) {
      if (!s.roamInit) {
        // Start inside the cleared path, facing along it, so "forward" flies the route.
        s.roamInit = true;
        const z = camera.position.z;
        const [px, py] = pathXY(z);
        camera.position.set(px, py + 0.4, z);
        const [ax, ay] = pathXY(z - 12);
        camera.lookAt(ax, ay + 0.2, z - 12);
        tmp.euler.setFromQuaternion(camera.quaternion, "YXZ");
        s.yaw = tmp.euler.y;
        s.pitch = tmp.euler.x;
      }
      s.yaw -= store.roam.look.x * 0.0028;
      s.pitch = THREE.MathUtils.clamp(s.pitch - store.roam.look.y * 0.0028, -1.2, 1.2);
      store.roam.look.x = store.roam.look.y = 0;
      tmp.euler.set(s.pitch, s.yaw, 0, "YXZ");
      camera.quaternion.setFromEuler(tmp.euler);
      const k = store.roam.keys;
      tmp.fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
      tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
      const speed = 7 * dt;
      if (k.has("forward")) camera.position.addScaledVector(tmp.fwd, speed);
      if (k.has("back")) camera.position.addScaledVector(tmp.fwd, -speed);
      if (k.has("right")) camera.position.addScaledVector(tmp.right, speed);
      if (k.has("left")) camera.position.addScaledVector(tmp.right, -speed);
      if (k.has("up")) camera.position.y += speed;
      if (k.has("down")) camera.position.y -= speed;
      // Stay inside the cleared tunnel around the path.
      const zMin = stationZ(projects.length - 1) - 12;
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, zMin, INTRO_Z + 4);
      const [px, py] = pathXY(camera.position.z);
      const dx = camera.position.x - px;
      const dy = camera.position.y - py;
      const r = Math.hypot(dx, dy);
      if (r > 1.75) {
        camera.position.x = px + (dx / r) * 1.75;
        camera.position.y = py + (dy / r) * 1.75;
      }
      tmp.fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
      s.look.copy(camera.position).add(tmp.fwd);
    } else {
      const param = dwell(store.progress, rig.stops, !motion);
      rig.position.getPoint(param, tmp.pos);
      rig.target.getPoint(param, tmp.tgt);
      if (motion && !narrow) {
        tmp.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
        tmp.tgt.addScaledVector(tmp.right, store.pointer.x * 0.55);
        tmp.tgt.y += store.pointer.y * 0.3;
      }
      const stop = Math.round(param * (rig.stops - 1));
      if (s.first || !motion) {
        if (!motion && stop !== s.stop && !s.first) s.fade = 1;
        camera.position.copy(tmp.pos);
        s.look.copy(tmp.tgt);
        s.first = false;
      } else {
        const k = 1 - Math.exp(-dt * 4.5);
        camera.position.lerp(tmp.pos, k);
        s.look.lerp(tmp.tgt, k);
      }
      s.stop = stop;
      camera.lookAt(s.look);
    }
    camera.updateMatrixWorld();
    s.fade = Math.max(0, s.fade - dt * 3.5);

    // --- Field uniforms ---------------------------------------------------------
    const u = field.material.uniforms;
    u.uTime!.value = s.time;
    (u.uCamWorld!.value as THREE.Matrix4).copy(camera.matrixWorld);
    (u.uProjInv!.value as THREE.Matrix4).copy(camera.projectionMatrixInverse);
    (u.uView!.value as THREE.Matrix4).copy(camera.matrixWorldInverse);
    (u.uCamPos!.value as THREE.Vector3).copy(camera.position);
    const f = THREE.MathUtils.clamp(-camera.position.z / STATION_SPACING - 1, 0, projects.length - 1);
    const a = Math.floor(f);
    const b = Math.min(a + 1, projects.length - 1);
    const slugA = projects[a]!.slug;
    const slugB = projects[b]!.slug;
    u.uMotifA!.value = MOTIF[slugA] ?? 0;
    u.uMotifB!.value = MOTIF[slugB] ?? 0;
    u.uBandA!.value = stationZ(a);
    u.uBandB!.value = stationZ(b);
    (u.uAccentA!.value as THREE.Vector3).set(...(ACCENT[slugA] ?? [1, 1, 1]));
    (u.uAccentB!.value as THREE.Vector3).set(...(ACCENT[slugB] ?? [1, 1, 1]));
    u.uAccentMix!.value = f - a;

    // fr3t run: the latest four notes ring and fade; only their strings vibrate.
    {
      const T = s.time % RUN_EVENTS.length;
      const play = u.uPlay!.value as THREE.Vector3[];
      const amp = u.uStrAmp!.value as number[];
      amp.fill(0);
      play.forEach((v) => v.set(0, 0, 0));
      let k = 0;
      for (let i = RUN_EVENTS.ev.length - 1; i >= 0 && k < 4; i--) {
        const e = RUN_EVENTS.ev[i]!;
        const age = T - e.t;
        if (age < 0) continue;
        const env = Math.exp(-age * 3.4);
        play[k++]!.set(e.s, e.f, env);
        amp[e.s] = Math.max(amp[e.s]!, env);
      }
    }

    // Two nearest screens light the world and clear space around themselves.
    const order = placements
      .map((p, i) => [i, p.center.distanceToSquared(camera.position)] as const)
      .sort((x, y) => x[1] - y[1]);
    for (let j = 0; j < 2; j++) {
      const i = order[j]?.[0] ?? 0;
      (u.uScreenPos!.value as THREE.Vector3[])[j]!.copy(placements[i]!.center);
      const c = loaded[i]?.color;
      (u.uScreenCol!.value as THREE.Vector3[])[j]!.set(c?.r ?? 0, c?.g ?? 0, c?.b ?? 0);
    }

    // Screens power on as the camera approaches.
    placements.forEach((p, i) => {
      const m = screenMaterials[i]!;
      const dist = p.center.distanceTo(camera.position);
      m.uniforms.uReveal!.value = motion ? revealAt(dist) : 1;
      const target = hovered === projects[i]!.slug ? 1 : 0;
      m.uniforms.uHover!.value += (target - m.uniforms.uHover!.value) * Math.min(1, dt * 10);
    });

    dust.mat.uniforms.uTime!.value = s.time;
    (field.composite.uniforms.uProj!.value as THREE.Matrix4).copy(camera.projectionMatrix);
    field.composite.uniforms.uFade!.value = s.fade;

    // --- Render -------------------------------------------------------------------
    gl.setRenderTarget(field.target);
    gl.render(field.scene, field.cam);
    gl.setRenderTarget(null);
    post.composer.render(dt);

    // --- Adaptive quality ------------------------------------------------------------
    s.frames++;
    s.frameTime += rawDt;
    if (s.frameTime > 1.5) {
      const fps = s.frames / s.frameTime;
      s.frames = 0;
      s.frameTime = 0;
      const t = tierRef.current;
      const cap: QualityTier = narrow ? 2 : 3;
      if (fps < 50 && t > 0) {
        s.goodWindows = 0;
        applyTier((t - 1) as QualityTier);
      } else if (fps > 57) {
        s.goodWindows++;
        if (s.goodWindows >= 3 && t < cap) {
          s.goodWindows = 0;
          applyTier((t + 1) as QualityTier);
        }
      } else s.goodWindows = 0;
      // Resize the field target to the tier's scale.
      const sc = TIERS[tierRef.current].scale;
      const w = Math.max(2, Math.floor(state.size.width * state.viewport.dpr * sc));
      const h = Math.max(2, Math.floor(state.size.height * state.viewport.dpr * sc));
      if (field.target.width !== w || field.target.height !== h) field.target.setSize(w, h);
    }
  }, 1);

  const hover = (slug: string | null) => {
    setHovered(slug);
    onHover(slug);
  };

  return (
    <>
      <mesh geometry={field.quad} material={field.composite} frustumCulled={false} renderOrder={-1000} />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#cdd8f0", "#1a140e", 0.55]} />
      <directionalLight position={[3, 8, 6]} intensity={1.1} color="#fff1dc" />
      <directionalLight position={[-6, 3, -4]} intensity={0.5} color="#9fb4ff" />
      {placements.map((p, i) => (
        <Screen
          key={projects[i]!.slug}
          slug={projects[i]!.slug}
          placement={p}
          loaded={loaded[i] ?? null}
          material={screenMaterials[i]!}
          clock={st}
          onOpen={onOpen}
          onHover={hover}
        />
      ))}
      <points geometry={dust.geo} material={dust.mat} frustumCulled={false} />
    </>
  );
}

export default function World(props: WorldProps) {
  return (
    <Canvas
      flat
      frameloop={props.active ? "always" : "never"}
      dpr={TIERS[props.initialTier].dpr}
      camera={{ fov: props.narrow ? 52 : 40, near: 0.1, far: 140, position: [0, 1, INTRO_Z] }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: true }}
      onCreated={({ gl }) => {
        // The InputShare pointer is clipped at each screen's edge.
        gl.localClippingEnabled = true;
      }}
      aria-hidden="true"
      tabIndex={-1}
    >
      <Scene {...props} />
    </Canvas>
  );
}
