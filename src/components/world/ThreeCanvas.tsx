"use client";

import { createRoot, events, extend, type ReconcilerRoot, type RenderProps } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  SphereGeometry,
  TorusGeometry,
} from "three";

/*
  R3F's <Canvas> registers the entire three.js namespace so any JSX element works,
  which keeps every class in the bundle. This canvas registers only the elements the
  scene uses, so the bundler can drop the rest of three.js. Add a class here before
  using its lowercase JSX element.
*/
extend({
  AmbientLight,
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  Points,
  SphereGeometry,
  TorusGeometry,
});

type Props = Omit<RenderProps<HTMLCanvasElement>, "size" | "events"> & {
  children: ReactNode;
  className?: string;
};

export function ThreeCanvas({ children, className, ...config }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<ReconcilerRoot<HTMLCanvasElement> | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, top: 0, left: 0 });
  const latest = useRef({ children, config });
  latest.current = { children, config };

  const render = () => {
    const root = rootRef.current;
    const { width, height } = sizeRef.current;
    if (!root || width === 0 || height === 0) return;
    const { children: c, config: cfg } = latest.current;
    void root.configure({ ...cfg, events, size: sizeRef.current }).then(() => root.render(c));
  };

  // One root for the lifetime of the canvas; sized by a ResizeObserver on the wrapper.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const root = createRoot(canvas);
    rootRef.current = root;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height, top: 0, left: 0 };
      render();
    });
    ro.observe(wrap);
    return () => {
      ro.disconnect();
      root.unmount();
      rootRef.current = null;
    };
    // The root is created once; later renders reconfigure it below.
  }, []);

  // Re-render the scene whenever props change.
  useEffect(() => {
    render();
  });

  return (
    <div ref={wrapRef} className={className} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} aria-hidden="true" tabIndex={-1} />
    </div>
  );
}
