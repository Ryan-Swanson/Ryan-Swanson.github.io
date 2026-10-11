/** Shared by every product screen in the world, including the second computers in Props. */

/** Reveal progress from the camera's distance to a screen: dark far away, powered on up close. */
export function revealAt(distance: number) {
  const t = Math.min(1, Math.max(0, (distance - 9) / 12));
  return 1 - t * t * (3 - 2 * t);
}

export const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/* Screens keep their captured colors once revealed. While the camera
   approaches, a scanline front "powers on" the screen from the top. */
export const screenFragment = /* glsl */ `
uniform sampler2D map;
uniform float uReveal;
uniform float uHover;
uniform float uHasMap;
varying vec2 vUv;
void main() {
  float y = 1.0 - vUv.y;
  float front = uReveal * 1.15 - 0.075;
  float shown = smoothstep(front + 0.012, front - 0.012, y);
  float band = exp(-abs(y - front) * 70.0) * step(0.001, uReveal) * step(uReveal, 0.999);
  vec2 off = vec2(band * 0.014, 0.0);
  vec3 c = vec3(texture2D(map, vUv + off).r, texture2D(map, vUv).g, texture2D(map, vUv - off).b) * uHasMap;
  float scan = 0.5 + 0.5 * sin(vUv.y * 700.0);
  vec3 dark = vec3(0.003, 0.006, 0.005) + 0.012 * scan;
  vec3 col = mix(dark, c * 0.97, shown) + band * vec3(1.0, 0.72, 0.4) * 2.4;
  col *= 1.0 + uHover * 0.05;
  gl_FragColor = vec4(col, 1.0);
}
`;

