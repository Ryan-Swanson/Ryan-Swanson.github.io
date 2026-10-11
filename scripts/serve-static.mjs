#!/usr/bin/env node
// Serves the static export the way GitHub Pages does, for local preview and tests:
//  - /path/ serves /path/index.html
//  - /path (a directory without a trailing slash) redirects to /path/
//  - /path.html and other files are served as-is
//  - anything else returns 404.html with status 404
//  - text assets are gzip-compressed when the client accepts it, as Pages does
//
// Usage: node scripts/serve-static.mjs [dir=out] [port=4321]
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createGzip } from "node:zlib";

const root = path.resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4321);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

async function isFile(p) {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}
async function isDir(p) {
  try {
    return (await stat(p)).isDirectory();
  } catch {
    return false;
  }
}

const compressible = new Set([".html", ".js", ".css", ".json", ".txt", ".svg", ".xml"]);

function send(req, res, file, status = 200) {
  const headers = {
    "Content-Type": types[path.extname(file)] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
    Vary: "Accept-Encoding",
  };
  const gzip = compressible.has(path.extname(file)) && /\bgzip\b/.test(req.headers["accept-encoding"] ?? "");
  if (gzip) headers["Content-Encoding"] = "gzip";
  res.writeHead(status, headers);
  const stream = createReadStream(file);
  (gzip ? stream.pipe(createGzip()) : stream).pipe(res);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const rel = decodeURIComponent(url.pathname);
    const target = path.join(root, rel);
    if (!target.startsWith(root)) {
      res.writeHead(400).end();
      return;
    }
    if (rel.endsWith("/") && (await isFile(path.join(target, "index.html")))) return send(req, res, path.join(target, "index.html"));
    if (await isFile(target)) return send(req, res, target);
    if (!rel.endsWith("/") && (await isDir(target))) {
      res.writeHead(301, { Location: `${rel}/${url.search}` }).end();
      return;
    }
    send(req, res, path.join(root, "404.html"), 404);
  })
  .listen(port, "127.0.0.1", () => console.log(`Serving ${root} at http://127.0.0.1:${port}/`));
