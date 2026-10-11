/** True when the browser can create a WebGL2 or WebGL context. Call only in the browser. */
export function canUseWebGL(): boolean {
  try {
    const query = new URLSearchParams(window.location.search);
    if (query.has("no3d")) return false;
    // Software rendering is too slow for the scene; "force3d" overrides that for testing.
    const opts = { failIfMajorPerformanceCaveat: !query.has("force3d") };
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2", opts) ?? canvas.getContext("webgl", opts)) as WebGLRenderingContext | null;
    if (!gl) return false;
    // Some browsers still hand out a software renderer despite the caveat flag. The scene would
    // crawl there, so treat it like no WebGL and show the still version instead.
    if (!query.has("force3d")) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) {
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return false;
      }
    }
    // Release the probe context right away.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
