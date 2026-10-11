/** True when the browser can create a WebGL2 or WebGL context. Call only in the browser. */
export function canUseWebGL(): boolean {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has("no3d")) return false;
    // Software rendering is too slow for the scene; "force3d" overrides that for testing.
    const opts = { failIfMajorPerformanceCaveat: !query.has("force3d") };
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", opts) ?? canvas.getContext("webgl", opts);
    if (!gl) return false;
    // Release the probe context right away.
    (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
