# ryan-swanson.github.io

Personal portfolio for Ryan Swanson: six product case studies, introduced by a scroll-driven flight through a generative three.js world where the real product screens float. Everything essential is plain HTML and works without WebGL or JavaScript.

This replaces the 2024 single-page site (`index.html`, `styles.css`). That version is preserved in Git history at commit `ac7a1bc`.

## Stack

- Next.js 16 App Router with `output: "export"` (fully static, no server)
- React 19, TypeScript, Tailwind CSS 4
- three.js with @react-three/fiber, a custom raymarching shader, and postprocessing for the world
- Playwright for browser tests against the built output

## Commands

```bash
npm ci                 # install exact versions from the lockfile
npm run dev            # dev server at http://localhost:4320
npm run build          # static export into out/
npm run preview        # serve out/ like GitHub Pages at http://127.0.0.1:4321
npm run lint
npm run typecheck
npm run test:e2e       # Playwright against out/ (run build first)
npm run check          # all of the above, in order
```

Useful query flags on the home page: `?no3d` shows the static fallback; `?force3d` loads the scene immediately even on phones and software-rendered browsers (used by the tests).

## How it is organized

```
src/content/        typed content: projects.ts, profile.ts, media lookup
src/app/            routes: /, /work/, /work/[slug]/, /about/, 404
src/components/site shared UI: header, footer, wall label (Placard), screenshots (Shot)
src/components/world
  Experience.tsx    pinned stage, scrolling wall labels, stop index, free roam, fallback
  Loader.tsx        loading screen shown while the 3D tour starts (always skippable)
  ThreeCanvas.tsx   R3F root that registers only the three.js classes the scene uses
  World.tsx         the scene: field pass, depth composite, screens, dust, camera, post, quality tiers
  Props.tsx         hardware around each screen (amp and guitar, desks, all-in-one, phone, laptop)
  fieldShader.ts    raymarched world (one motif per project) and the composite shader
  path.ts           flight path, screen placement, camera keyframes
  store.ts          shared per-frame state between the page and the scene
public/media/       optimized screenshots (WebP, two widths plus a scene texture)
public/*.html       redirect pages for links from the old site
scripts/            media optimizer, Pages-like static server, post-build 3D preload injector
tests/              Playwright tests
```

Content is separate from the scene. Every project, its status, links, and case-study text live in `src/content/projects.ts`; the gallery reads only the fields it needs.

### The world

The home page section is a tall scroll container. A stage is pinned to the viewport while each project's wall label (real HTML) scrolls past; scroll progress drives the camera along a flight path, dwelling at each project. `#slug` links jump straight to a stop.

The world itself is a signed-distance field raymarched into a low-resolution half-float target, then composited under the rasterized screens with correct depth, so geometry and screens sort against each other. Each project has a motif built from its own logic:

- fr3t.app: a fretboard with equal-tempered frets; a C major run climbs the neck and comes back down
- InputShare: two computers; an arch of light forms between them and carries packets and the cursor
- learncenter.dev: a growth chart whose padlocks unlock as the bars rise
- TalkMac: a speaking head in profile; its waveform travels into a computer that types the words
- ProTuner: waveform rings that beat out of tune far away and settle near the station
- GrooveMind: a 7/8 piano roll accented 3+2+2, a keyboard riding the playhead, and LED spectrum walls

Screens light the world in their own average color and "power on" with a scanline front as the camera approaches. Bloom, chromatic aberration, grain, and vignette run through `postprocessing`. Screen colors are not tone-mapped, so captures stay accurate.

Free roam (button in the stage) switches to a full-screen view: drag to look, W A S D or arrow keys to move, Q and E for down and up, Esc to return to the nearest stop. Touch devices get on-screen movement buttons.

### Loading and quality

A loading screen (in the server HTML, hidden without JavaScript, always skippable) covers the tour while the 3D starts. With Save-Data the world waits for a button press instead, and without usable GPU WebGL the page shows still screens.

What keeps the start fast, especially on phones:

- The 3D chunk is preloaded from the HTML by `scripts/preload-world.mjs` (it runs after `next build`), and the first two screens' textures are preloaded too. On phones the poster image and the texture are the same file, fetched once.
- `ThreeCanvas` registers only the elements the scene uses, so the bundler drops the rest of three.js.
- The tour opens once the first two screens are in and everything is compiled; the other screens stream in behind it.
- Each station's hardware is built one per frame, and shaders compile in steps with a frame between each, so no single task freezes the page. Average screen colors are computed with `createImageBitmap`, off the main thread.
- Materials, the keyboard texture, and two glow lights are shared across stations.

To profile, build with `SOURCEMAPS=1 npm run build` so stack traces map back to the source.

The tour layout follows the viewport's shape: portrait screens put the screen above its label, while desktops and landscape tablets and phones put it beside the label (the `wide` variant in `globals.css`). Short viewports get compact labels (`short`).

Four quality tiers set the field resolution, raymarch steps, pixel ratio, particle count, and effects. The scene starts at a tier chosen for the device and moves up or down every 1.5 s based on measured frame rate. Rendering stops when the section is off screen or the tab is hidden, and GPU resources are disposed on unmount. If WebGL is missing, fails, or loses its context, the stage shows still screens that crossfade with the same scroll story.

With motion off (the header toggle, which defaults to `prefers-reduced-motion`), the camera cuts between stops with a short fade and the world stops animating.

## Media

Screenshots are real captures. Each one carries a provenance label on the page (live site, installed app, simulator, or local build with authored sample data) and a capture month.

To add or refresh screenshots:

1. Capture raw PNGs outside this repository, from a clean or synthetic state with no personal data.
2. List them in a media map JSON (also outside the repository), one entry per image:
   ```json
   { "id": "fr3t-app/workspace", "file": "/abs/path/raw.png", "source": "live-site",
     "captured": "2026-10", "device": "desktop", "texture": true }
   ```
   `source` is one of `live-site`, `native-app`, `simulator`, `local-fixture`, `existing`. `device` is `desktop`, `phone`, `watch`, or `window`. Optional: `crop` (`left`, `top`, `width`, `height` in source pixels) and `widths`.
3. Run `npm run media -- /abs/path/media-map.json`. It writes WebP files to `public/media/` and regenerates `src/content/media.generated.json`.
4. Reference the image in `projects.ts` with `shot("id", "alt text", "optional caption")`.

A production build fails if a referenced screenshot is missing. `ALLOW_PENDING_MEDIA=1` permits a placeholder for local previews only.

## Deployment

`.github/workflows/pages.yml` lints, type-checks, builds, runs the browser tests, and deploys `out/` with the official Pages actions on pushes to `main`. Pull requests run the same checks without deploying.

Before the first deploy, the repository's Pages source must be switched from "Deploy from a branch" to "GitHub Actions" (Settings > Pages). The site is served at the domain root, so no `basePath` is needed. `public/.nojekyll` keeps Pages from ignoring the `_next/` directory.
