#!/usr/bin/env node
// After `next build`, find the chunk that holds the 3D world (it contains the field shader)
// and preload it from the home page HTML, so phones start downloading it in parallel with
// the page instead of after hydration. The chunk name is content-hashed, hence a post-build step.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(import.meta.dirname, "../out");
const dir = path.join(out, "_next/static/chunks");
const marker = "uMotifA"; // a uniform that only the field shader declares
let world = null;
for (const f of await readdir(dir)) {
  if (!f.endsWith(".js")) continue;
  const code = await readFile(path.join(dir, f), "utf8");
  if (code.includes(marker)) {
    world = f;
    break;
  }
}
if (!world) {
  console.error("preload-world: no chunk contains the field shader; nothing injected");
  process.exit(1);
}
const page = path.join(out, "index.html");
let html = await readFile(page, "utf8");
const href = `/_next/static/chunks/${world}`;
if (!html.includes(`rel="preload" as="script" href="${href}"`)) {
  html = html.replace("</head>", `<link rel="preload" as="script" href="${href}" fetchpriority="low"/></head>`);
  await writeFile(page, html);
}
console.log(`preload-world: ${href}`);
