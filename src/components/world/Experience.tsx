"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WallProject } from "./project";
import { canUseWebGL } from "./webgl";
import { Placard } from "@/components/site/Placard";
import { useMotion } from "@/components/site/motion";
import { createWorldStore, type QualityTier, type WorldProject } from "./store";

const World = dynamic(() => import("./World"), { ssr: false });

/**
 * idle: deciding. manual: 3D available on request (Save-Data). loading/ready:
 * scene mounting or shown. failed: no WebGL or the scene stopped; the page
 * keeps the 2D version of the same scroll story.
 */
type SceneState = "idle" | "manual" | "loading" | "ready" | "failed";

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const KEYMAP: Record<string, string> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  ArrowLeft: "left",
  KeyD: "right",
  ArrowRight: "right",
  KeyE: "up",
  Space: "up",
  KeyQ: "down",
  ShiftLeft: "down",
};

function startTier(narrow: boolean): QualityTier {
  const cores = navigator.hardwareConcurrency ?? 4;
  if (narrow) return cores >= 6 ? 1 : 0;
  return cores >= 8 ? 2 : 1;
}

export function Experience({ projects, intro }: { projects: WallProject[]; intro: ReactNode }) {
  const router = useRouter();
  const motion = useMotion();
  const store = useRef(createWorldStore());
  const exitRoamRef = useRef<(() => void) | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<SceneState>("idle");
  const [active, setActive] = useState(true);
  const [stop, setStop] = useState(0);
  const [narrow, setNarrow] = useState(false);
  const [tier, setTier] = useState<QualityTier>(2);
  const [roam, setRoam] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const stops = projects.length + 1;

  const worldProjects = useMemo<WorldProject[]>(
    () =>
      projects.map((p) => ({
        slug: p.slug,
        title: p.title,
        texture: p.hero.texture ?? { src: `${p.hero.src}-${p.hero.widths.at(-1)}.webp`, width: p.hero.width, height: p.hero.height },
        textureSmall: `${p.hero.src}-${p.hero.widths[0]}.webp`,
      })),
    [projects],
  );

  useEffect(() => {
    store.current.motion = motion === "on";
  }, [motion]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Scroll position drives the camera through the store; React only hears about stop changes.
  useEffect(() => {
    const onScroll = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / span));
      store.current.progress = progress;
      if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
      setStop(Math.round(progress * (stops - 1)));
      setActive(rect.bottom > 0 && rect.top < window.innerHeight && document.visibilityState === "visible");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    document.addEventListener("visibilitychange", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onScroll);
    };
  }, [stops]);

  // Decide on 3D once the page has loaded and gone idle, so it never competes with first paint.
  // Phones and touch devices wait for the first sign of intent (scroll, touch, key) before
  // booting the scene, which keeps the page responsive while it loads.
  useEffect(() => {
    if (scene !== "idle") return;
    let idleId: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const intentEvents = ["scroll", "pointerdown", "touchstart", "keydown", "wheel"] as const;
    const boot = () => {
      intentEvents.forEach((ev) => window.removeEventListener(ev, boot));
      setScene("loading");
    };
    const decide = () => {
      if (!canUseWebGL()) return setScene("failed");
      const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      const small = window.matchMedia("(max-width: 1023px), (pointer: coarse)").matches;
      setTier(startTier(window.matchMedia("(max-width: 1023px)").matches));
      if (conn?.saveData) return setScene("manual");
      const force = new URLSearchParams(window.location.search).has("force3d");
      if (!small || force || window.scrollY > 0) return setScene("loading");
      intentEvents.forEach((ev) => window.addEventListener(ev, boot, { passive: true, once: true }));
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(decide, { timeout: 1500 });
      else timer = setTimeout(decide, 200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      intentEvents.forEach((ev) => window.removeEventListener(ev, boot));
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [scene]);

  const scrollToStop = useCallback((k: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY + k * window.innerHeight;
    window.scrollTo({ top, behavior: "instant" as ScrollBehavior });
  }, []);

  const enterRoam = useCallback(() => {
    store.current.roam.active = true;
    store.current.roam.keys.clear();
    setRoam(true);
    document.documentElement.style.overflow = "hidden";
    requestAnimationFrame(() => stageRef.current?.focus());
  }, []);

  const onRoamExit = useCallback(
    (station: number) => {
      store.current.roam.active = false;
      store.current.roam.keys.clear();
      setRoam(false);
      document.documentElement.style.overflow = "";
      scrollToStop(station + 1);
    },
    [scrollToStop],
  );

  // Free roam input: keys move, Escape returns to the scroll path.
  useEffect(() => {
    if (!roam) return;
    const keys = store.current.roam.keys;
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        exitRoamRef.current?.();
        return;
      }
      const action = KEYMAP[e.code];
      if (action) {
        e.preventDefault();
        keys.add(action);
      }
    };
    const up = (e: KeyboardEvent) => {
      const action = KEYMAP[e.code];
      if (action) keys.delete(action);
    };
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.documentElement.style.overflow = "";
    };
  }, [roam]);

  const drag = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (!roam) return;
    drag.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = stageRef.current;
    if (!el) return;
    if (roam && drag.current) {
      store.current.roam.look.x += e.clientX - drag.current.x;
      store.current.roam.look.y += e.clientY - drag.current.y;
      drag.current = { x: e.clientX, y: e.clientY };
    } else if (e.pointerType === "mouse") {
      const r = el.getBoundingClientRect();
      store.current.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      store.current.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const hold = (action: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.stopPropagation();
      store.current.roam.keys.add(action);
    },
    onPointerUp: () => store.current.roam.keys.delete(action),
    onPointerLeave: () => store.current.roam.keys.delete(action),
    onPointerCancel: () => store.current.roam.keys.delete(action),
  });

  const onReady = useCallback(() => setScene("ready"), []);
  const onError = useCallback(() => {
    store.current.roam.active = false;
    setRoam(false);
    setScene("failed");
  }, []);
  const onOpen = useCallback((slug: string) => router.push(`/work/${slug}/`), [router]);

  const showCanvas = scene === "loading" || scene === "ready";
  const current = stop > 0 ? projects[stop - 1] : undefined;
  const posterIndex = Math.max(0, stop - 1);

  return (
    <section
      ref={sectionRef}
      aria-label="Project gallery"
      data-scene={scene}
      className="relative flow-root"
      style={{ height: `${stops * 100}svh` }}
    >
      {/* Pinned stage: poster images, then the 3D world on top once it is ready. */}
      <div
        ref={stageRef}
        tabIndex={-1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`${roam ? "fixed inset-0 z-[60] touch-none" : "sticky top-0 h-[100svh]"} overflow-hidden bg-wall outline-none`}
      >
        <div aria-hidden={scene === "ready"} className={`absolute inset-0 transition-opacity duration-700 ${scene === "ready" ? "opacity-0" : "opacity-100"}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_62%_40%,rgba(255,214,150,0.14),transparent_70%),linear-gradient(to_bottom,#18211d_0%,#131a17_62%,#0e1311_100%)]" />
          {projects.map((p, i) =>
            Math.abs(i - posterIndex) <= 1 ? (
              <div
                key={p.slug}
                className={`absolute left-1/2 top-[12%] w-[80%] -translate-x-1/2 transition-opacity duration-500 lg:top-1/2 lg:w-[50%] lg:-translate-y-1/2 lg:translate-x-0 ${
                  stop === 0 ? "lg:left-[46%]" : "lg:left-[6%]"
                } ${
                  i === posterIndex ? "opacity-100" : "opacity-0"
                } ${p.hero.device === "phone" ? "max-w-[15rem] lg:max-w-[17rem]" : ""}`}
              >
                <div className={`border-[6px] border-[#0c100e] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.85)] ${stop === 0 ? "opacity-60" : ""}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${p.hero.src}-${p.hero.widths.at(-1)}.webp`}
                    srcSet={p.hero.widths.map((w) => `${p.hero.src}-${w}.webp ${w}w`).join(", ")}
                    sizes="(min-width: 1024px) 50vw, 80vw"
                    width={p.hero.width}
                    height={p.hero.height}
                    alt={p.hero.alt}
                    fetchPriority={i === 0 ? "high" : "auto"}
                    className="block h-auto w-full"
                  />
                </div>
              </div>
            ) : null,
          )}
        </div>

        {showCanvas && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${scene === "ready" ? "opacity-100" : "opacity-0"} ${hovered ? "cursor-pointer" : ""}`}>
            <SceneBoundary onError={onError}>
              <World
                projects={worldProjects}
                store={store.current}
                narrow={narrow}
                active={active || roam}
                initialTier={tier}
                onReady={onReady}
                onError={onError}
                onOpen={onOpen}
                onHover={setHovered}
                onRoamExit={onRoamExit}
                exitRoamRef={exitRoamRef}
              />
            </SceneBoundary>
          </div>
        )}

        {/* Legibility gradients over the world. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(14,19,17,0.85)_0%,transparent_26%)] lg:bg-[linear-gradient(to_right,rgba(19,26,23,0.75)_0%,transparent_40%),linear-gradient(to_top,rgba(14,19,17,0.85)_0%,transparent_22%)]"
        />

        {!roam && (
          <>
            <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-8 sm:top-6">
              {scene === "manual" && (
                <button
                  type="button"
                  onClick={() => setScene("loading")}
                  className="label inline-flex min-h-11 items-center gap-2 border border-brass/70 bg-wall/70 px-4 text-ink backdrop-blur-sm hover:bg-brass hover:text-placard-ink"
                >
                  Load the 3D world
                </button>
              )}
              {scene === "ready" && (
                <button
                  type="button"
                  onClick={enterRoam}
                  className="label inline-flex min-h-11 items-center gap-2 border border-ink-2/50 bg-wall/60 px-4 text-ink backdrop-blur-sm hover:border-brass hover:text-brass"
                >
                  <span aria-hidden="true" className="inline-block size-2 rounded-full bg-brass" />
                  Free roam
                </button>
              )}
            </div>

            <nav aria-label="Flight stops" className="absolute inset-x-0 bottom-0 px-4 pb-4 sm:px-8 lg:pb-6">
              <div className="mx-auto max-w-[90rem]">
                <div className="relative h-px w-full bg-rule">
                  <div ref={barRef} className="absolute inset-0 origin-left scale-x-0 bg-brass" />
                </div>
                <ol className="mt-2 hidden grid-cols-6 gap-4 lg:grid">
                  {projects.map((p, i) => (
                    <li key={p.slug}>
                      <a
                        href={`#${p.slug}`}
                        aria-current={stop === i + 1 ? "step" : undefined}
                        className={`block min-h-11 py-1 no-underline transition-colors ${stop === i + 1 ? "text-ink" : "text-ink-2 hover:text-ink"}`}
                      >
                        <span className="block font-display text-lg leading-tight">{p.title}</span>
                        <span className="label block text-ink-2">{p.kind}</span>
                      </a>
                    </li>
                  ))}
                </ol>
                <p className="label mt-2 flex items-center justify-between text-ink-2 lg:hidden">
                  <span>{current ? `${stop} of ${projects.length}: ${current.title}` : "Scroll to fly through the work"}</span>
                  <a href="#work" className="underline">
                    List view
                  </a>
                </p>
              </div>
            </nav>

            {hovered && (
              <p className="label pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 bg-wall/70 px-3 py-1 text-ink backdrop-blur-sm">
                Click to open the case study
              </p>
            )}
          </>
        )}

        {roam && (
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[30rem] bg-wall/60 p-4 backdrop-blur-sm">
                <h2 className="font-display text-2xl">Free roam</h2>
                <p className="mt-1 text-[0.95rem] text-ink-2">
                  Drag to look. Move with W A S D or the arrow keys, Q and E for down and up. Click a screen to open its case study. Esc returns
                  you to the tour at the nearest stop.
                </p>
              </div>
              <button
                type="button"
                onClick={() => exitRoamRef.current?.()}
                className="label pointer-events-auto inline-flex min-h-11 items-center border border-brass bg-wall/70 px-4 text-ink hover:bg-brass hover:text-placard-ink"
              >
                Exit free roam
              </button>
            </div>
            <div className="pointer-events-auto grid w-fit grid-cols-3 gap-2 self-center lg:hidden" aria-label="Movement controls">
              <span />
              <button type="button" aria-label="Move forward" className="size-14 border border-ink-2/50 bg-wall/70 text-xl" {...hold("forward")}>
                ↑
              </button>
              <span />
              <button type="button" aria-label="Move left" className="size-14 border border-ink-2/50 bg-wall/70 text-xl" {...hold("left")}>
                ←
              </button>
              <button type="button" aria-label="Move back" className="size-14 border border-ink-2/50 bg-wall/70 text-xl" {...hold("back")}>
                ↓
              </button>
              <button type="button" aria-label="Move right" className="size-14 border border-ink-2/50 bg-wall/70 text-xl" {...hold("right")}>
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* The scrolling story: real HTML that the camera follows. */}
      <div className={`pointer-events-none relative -mt-[100svh] ${roam ? "invisible" : ""}`}>
        <div className="flex h-[100svh] flex-col justify-center px-4 pb-24 sm:px-8">
          <div className="mx-auto w-full max-w-[90rem]">
            <div className="pointer-events-auto max-w-[36rem] [text-shadow:0_1px_14px_rgba(8,12,10,0.95),0_0_2px_rgba(8,12,10,0.8)]">{intro}</div>
          </div>
        </div>
        {projects.map((p) => (
          <article
            key={p.slug}
            id={p.slug}
            aria-label={p.title}
            className="flex h-[100svh] items-end px-4 pb-28 sm:px-8 lg:items-center lg:pb-0"
          >
            <div className="mx-auto flex w-full max-w-[90rem] justify-center lg:justify-end">
              <Placard project={p} as="h2" className="pointer-events-auto w-full max-w-[26rem] lg:w-[24rem]" />
            </div>
          </article>
        ))}
      </div>
      <span className="sr-only" aria-live="polite">
        {current ? `${current.title}, ${current.status.label}` : ""}
      </span>
    </section>
  );
}
