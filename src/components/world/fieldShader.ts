/*
  The generative world: a raymarched signed-distance field rendered into a
  low-resolution target, then composited under the real screens with correct
  depth. One motif per project, each built from the product's own idea:

    0 fr3t.app        a fretboard with real equal-tempered spacing; a C major
                      run climbs the neck diagonally and comes back down, one
                      note at a time, and only the plucked string vibrates
    1 InputShare      two computers face each other across the path; a light
                      arch forms from both ends as you approach, then packets
                      and the cursor travel between them; circuit walls pulse
    2 learncenter.dev a growth chart rises bar by bar with a trend line, and a
                      row of locked doors unlocks in sequence
    3 TalkMac         a head in profile speaks; a blue bar waveform carries the
                      voice from the mouth into the real TalkMac screen
    4 ProTuner        rings are oscilloscope traces: detuned waves beat in
                      amber far away and lock into a steady green wave near
                      the station, with a scope trace along the floor
    5 GrooveMind      a piano roll in 7/8 (chord tones on the 3+2+2 accents),
                      a playhead with a keyboard that presses as notes pass,
                      and LED spectrum walls that pump with the accents

  Only the two motifs nearest the camera are evaluated, blended along z.
  The alpha channel carries linear view depth for the composite pass.
*/

export const fieldVertex = /* glsl */ `
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const fieldFragment = /* glsl */ `
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform float uTime;
uniform mat4 uCamWorld;
uniform mat4 uProjInv;
uniform mat4 uView;
uniform vec3 uCamPos;
uniform int uSteps;
uniform float uMotifA;
uniform float uMotifB;
uniform float uBandA;
uniform float uBandB;
uniform vec3 uScreenPos[2];
uniform vec3 uScreenCol[2];
uniform vec3 uAccentA;
uniform vec3 uAccentB;
uniform float uAccentMix;
// fr3t run: faint shape (up to four frets per string, -1 = none), played notes (string, fret, envelope), string amplitudes
uniform vec4 uShape[6];
uniform vec3 uPlay[4];
uniform float uStrAmp[6];
uniform float uRefl;

// A loop bound the compiler cannot prove is zero, so it keeps loops as loops instead of
// pasting their bodies in. map() is large, and every inlined copy adds compile time.
#define ZERO (min(uSteps, 0))

const float FP = 18.0;
const float PI = 3.14159265;
const float OPEN[6] = float[6](40.0, 45.0, 50.0, 55.0, 59.0, 64.0);

vec2 pathXY(float z) {
  return vec2(sin(z * 0.045) * 5.0 + sin(z * 0.013 + 1.3) * 3.0, cos(z * 0.031) * 1.4);
}

float hash11(float n) { return fract(sin(n * 127.1) * 43758.5453); }
float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}
float sdBox2(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}
float sdRoundBox(vec3 p, vec3 b, float r) { return sdBox(p, b - r) - r; }
float sdSeg(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p = rot(0.5) * p * 2.03 + 7.1; a *= 0.5; }
  return v;
}

/* Approach progress for a station: 0 far away, 1 when the camera is there. */
float proximity(float band) { return 1.0 - clamp((uCamPos.z - band - 5.0) / 26.0, 0.0, 1.0); }
float bandOf(float m) { return abs(uMotifA - m) < 0.5 ? uBandA : uBandB; }

/* Geometry that should not be carved by the flight-path clearing (set by motifs). */
vec3 gExtra;

// ---- 0: fretboard and a C major run -------------------------------------------
float wireZ(float n) { return -(floor(n / 12.0) * FP + 2.0 * FP * (1.0 - exp2(-mod(n, 12.0) / 12.0))); }
float noteZ(float f) { return f < 0.5 ? 0.6 : mix(wireZ(f - 1.0), wireZ(f), 0.62); }

vec3 mFret(vec3 q) {
  // Rosewood board on a rounded maple neck, bound on both edges.
  vec3 res = vec3(sdRoundBox(q - vec3(0.0, -2.52, 0.0), vec3(3.25, 0.17, 1e4), 0.04), 1.0, 0.0);
  float neck = max((length(vec2(q.x / 3.3, (q.y + 2.66) / 1.15)) - 1.0) * 1.1, q.y + 2.6);
  if (neck < res.x) res = vec3(neck, 27.0, 0.0);
  float bind = sdBox(vec3(abs(q.x) - 3.27, q.y + 2.52, 0.0), vec3(0.06, 0.18, 1e4));
  if (bind < res.x) res = vec3(bind, 22.0, 0.0);

  float zz = mod(-q.z, FP);
  float nf = -12.0 * log2(max(1e-4, 1.0 - zz / (2.0 * FP)));
  float nr = clamp(floor(nf + 0.5), 0.0, 12.0);
  float fz = 2.0 * FP * (1.0 - exp2(-nr / 12.0));
  // Rounded nickel fret wire.
  float fret = max(length(vec2(q.y + 2.33, zz - fz)) - 0.075, abs(q.x) - 3.25);
  if (fret < res.x) res = vec3(fret, 2.0, 0.0);

  // Pearl inlays at 3, 5, 7, 9 (single) and 12 (double) of each octave.
  float c = floor(nf) + 1.0;
  if (c == 3.0 || c == 5.0 || c == 7.0 || c == 9.0 || c == 12.0) {
    float zc = 2.0 * FP * (1.0 - exp2(-(c - 0.5) / 12.0));
    vec2 d = vec2(c == 12.0 ? abs(q.x) - 1.1 : q.x, zz - zc);
    float inl = max(length(d) - 0.3, abs(q.y + 2.35) - 0.015);
    if (inl < res.x) res = vec3(inl, 5.0, 0.0);
  }

  float si = clamp(floor(q.x + 3.0), 0.0, 5.0);
  int s = int(si);
  float sx = -2.5 + si;
  float amp = uStrAmp[s];
  float vib = amp * 0.1 * sin(uTime * (46.0 + si * 9.0)) * sin(zz / FP * PI * 2.0);
  float str = length(vec2(q.x - sx - vib * 0.4, q.y + 2.12 - vib)) - (0.08 - si * 0.009);
  if (str < res.x) res = vec3(str, 3.0, amp);

  // The run's path, faint: this is the shape a guitarist recognizes.
  vec4 sh = uShape[s];
  for (int j = 0; j < 4; j++) {
    float f = sh[j];
    if (f < -0.5) continue;
    float d = length(vec3(q.x - sx, q.y + 2.12, q.z - noteZ(f))) - 0.15;
    if (d < res.x) res = vec3(d, 4.0, mod(OPEN[s] + f, 12.0) + 0.1);
  }
  // Notes being played, brightest first, with a short trail.
  for (int k = 0; k < 4; k++) {
    vec3 n = uPlay[k];
    if (n.z < 0.02 || abs(n.x - si) > 0.5) continue;
    vec3 d = vec3(q.x - sx, q.y + 2.12, q.z - noteZ(n.y));
    float note = length(d) - (0.15 + 0.2 * n.z);
    if (note < res.x) res = vec3(note, 4.0, mod(OPEN[s] + n.y, 12.0) + min(n.z, 0.999));
    // A ripple across the board under a fresh pluck.
    float rr = 0.25 + (1.0 - n.z) * 1.4;
    float ring = length(vec2(length(d.xz) - rr, q.y + 2.33)) - 0.022;
    if (n.z > 0.35 && ring < res.x) res = vec3(ring, 12.0, (n.z - 0.35) * 1.5);
  }
  return res;
}

// ---- 1: two computers linking ------------------------------------------------
vec3 mLink(vec3 q, float band) {
  float prox = proximity(band);
  float pz = band - 5.0;
  vec3 res = vec3(q.y + 2.62, 13.0, 0.0);

  // Circuit walls on both sides; traces and pulses are drawn in the material.
  float wall = 7.4 - abs(q.x);
  if (wall < res.x) res = vec3(wall, 19.0, 0.0);

  // A computer on each side, screens turned toward each other across the path.
  vec3 c = vec3(abs(q.x) - 3.9, q.y, q.z - pz);
  float mon = sdRoundBox(c - vec3(0.06, 0.35, 0.0), vec3(0.09, 1.0, 1.55), 0.05);
  float stand = sdBox(c - vec3(0.3, -0.95, 0.0), vec3(0.08, 0.36, 0.14));
  float base = sdBox(c - vec3(0.3, -1.3, 0.0), vec3(0.32, 0.03, 0.45));
  float desk = sdBox(c - vec3(-0.15, -1.38, 0.0), vec3(1.0, 0.05, 2.3));
  float kb = sdRoundBox(c - vec3(-0.75, -1.29, 0.0), vec3(0.3, 0.035, 0.95), 0.02);
  float comp = min(min(mon, stand), min(min(desk, kb), base));
  if (comp < res.x) res = vec3(comp, 7.0, 0.0);
  float face = sdBox(c - vec3(-0.04, 0.35, 0.0), vec3(0.005, 0.9, 1.44));
  if (face < res.x) res = vec3(face, 17.0, q.x < 0.0 ? -1.0 : 1.0);

  // The link: an arch over the path that grows from both ends and meets in the middle.
  vec2 cc = vec2(0.0, -0.15);
  float R = 3.9;
  vec2 rel = q.xy - cc;
  float u = rel.y >= 0.0 ? clamp(atan(rel.y, rel.x) / PI, 0.0, 1.0) : (rel.x > 0.0 ? 0.0 : 1.0);
  float formed = smoothstep(0.05, 0.75, prox);
  for (int l = 0; l < 2; l++) {
    float lane = l == 0 ? -1.0 : 1.0;
    float zl = pz + lane * 0.2;
    float ua = min(u, 0.5) < formed * 0.5 || max(u, 0.5) > 1.0 - formed * 0.5 ? u : (u < 0.5 ? formed * 0.5 : 1.0 - formed * 0.5);
    vec2 on = cc + R * vec2(cos(ua * PI), sin(ua * PI));
    float beam = length(vec3(q.xy - on, q.z - zl)) - 0.026;
    if (beam < gExtra.x) gExtra = vec3(beam, 19.0, 2.0 + prox);
    // Packets stream both ways once the link is up.
    if (formed > 0.98) {
      float N = 8.0;
      float off = fract(uTime * (lane > 0.0 ? 0.32 : 0.26));
      float uu = lane > 0.0 ? u : 1.0 - u;
      float j = floor(uu * N - off + 0.5);
      float uj = clamp((j + off) / N, 0.0, 1.0);
      float up = lane > 0.0 ? uj : 1.0 - uj;
      vec2 pp = cc + R * vec2(cos(up * PI), sin(up * PI));
      float pk = length(vec3(q.xy - pp, q.z - zl)) - 0.075;
      if (pk < gExtra.x) gExtra = vec3(pk, 6.0, lane);
    }
  }
  // The cursor: leaves the right screen, rides the arch, lands on the left one.
  float cyc = fract(uTime / 4.0);
  if (formed > 0.98 && cyc > 0.35 && cyc < 0.65) {
    float cu = (cyc - 0.35) / 0.3;
    vec2 cp = cc + R * vec2(cos(cu * PI), sin(cu * PI));
    float cur = length(vec3(q.xy - cp, q.z - pz)) - 0.14;
    if (cur < gExtra.x) gExtra = vec3(cur, 6.0, 3.0);
  }
  return res;
}

// ---- 2: growth and unlocking ---------------------------------------------------
float barH(float k) { return 0.5 + 8.0 * pow(k / 13.0, 2.2); }
float barGrow(float k, float prox) { return smoothstep(0.0, 1.0, prox * 2.0 - k * 0.07); }
// Fourteen bars standing behind the screen, rising in sequence as you arrive.
vec3 barTop(float k, float zc, float prox) { return vec3(-6.0 + k * 0.95, -2.62 + barH(k) * barGrow(k, prox) + 0.3, zc); }

vec3 mGrowth(vec3 q, float band) {
  float prox = proximity(band);
  vec3 res = vec3(q.y + 2.62, 13.0, 0.0);

  float zc = band - 8.5;
  float k = clamp(floor((q.x + 6.0) / 0.95 + 0.5), 0.0, 13.0);
  float h = max(barH(k) * barGrow(k, prox), 0.03);
  float xk = -6.0 + k * 0.95;
  float bar = sdRoundBox(vec3(q.x - xk, q.y + 2.62 - h * 0.5, q.z - zc), vec3(0.38, h * 0.5 + 0.02, 0.38), 0.05);
  if (bar < res.x) res = vec3(bar, 7.0, 0.0);
  float cap = sdBox(vec3(q.x - xk, q.y + 2.62 - h, q.z - zc), vec3(0.4, 0.05, 0.4));
  if (cap < res.x) res = vec3(cap, 8.0, 0.5 + 0.5 * k / 13.0);
  for (int j = -1; j < 1; j++) {
    float a = clamp(k + float(j), 0.0, 12.0);
    float tl = sdSeg(q, barTop(a, zc, prox), barTop(a + 1.0, zc, prox), 0.055);
    if (tl < gExtra.x) gExtra = vec3(tl, 23.0, barGrow(a + 1.0, prox));
  }

  // A padlock rides each bar and unlocks (red to green, shackle up) as the bar finishes rising.
  float grown = barGrow(k, prox);
  float open = smoothstep(0.85, 1.0, grown);
  vec3 lp = vec3(q.x - xk, q.y + 2.62 - h - 0.62, q.z - zc);
  float body = sdRoundBox(lp, vec3(0.2, 0.17, 0.1), 0.04);
  vec3 ls = lp - vec3(0.0, 0.17 + open * 0.2, 0.0);
  float shackle = max(length(vec2(length(ls.xy) - 0.13, ls.z)) - 0.03, -ls.y);
  shackle = min(shackle, max(length(vec2(abs(ls.x) - 0.13, ls.z)) - 0.03, abs(ls.y + 0.07) - 0.07));
  float lock = min(body, shackle);
  if (lock < res.x) res = vec3(lock, 24.0, open);
  return res;
}

// ---- 3: a voice becoming text ------------------------------------------------------
float speechEnv(float t) {
  float ph = fract(t * 0.36);
  float word = smoothstep(0.0, 0.06, ph) * smoothstep(0.8, 0.66, ph);
  float syl = pow(0.5 + 0.5 * sin(t * 10.5 + 2.0 * sin(t * 2.7)), 1.4);
  return word * (0.3 + 0.7 * syl);
}

/* Profile of a head and shoulders, facing +x, about 5.4 units tall. Points 10 to 16
   (lower lip to under the jaw) swing around a pivot to open the mouth. */
const vec2 HEAD[31] = vec2[31](
  vec2(-0.2, 2.0), vec2(0.5, 1.9), vec2(1.0, 1.65), vec2(1.25, 1.2), vec2(1.33, 0.85),
  vec2(1.22, 0.6), vec2(1.36, 0.32), vec2(1.64, -0.06), vec2(1.42, -0.2), vec2(1.3, -0.26),
  vec2(1.37, -0.42), vec2(1.27, -0.52), vec2(1.34, -0.63), vec2(1.19, -0.79), vec2(1.27, -1.0),
  vec2(1.13, -1.22), vec2(0.7, -1.34), vec2(0.45, -1.48), vec2(0.55, -2.35), vec2(0.95, -2.8),
  vec2(1.7, -3.05), vec2(1.75, -3.45), vec2(-2.5, -3.45), vec2(-2.5, -3.1), vec2(-1.35, -2.62),
  vec2(-0.8, -2.15), vec2(-0.92, -1.38), vec2(-1.62, -0.6), vec2(-1.88, 0.3), vec2(-1.62, 1.3),
  vec2(-1.0, 1.85)
);
vec2 headPt(int i, float jaw) {
  vec2 v = HEAD[i];
  if (i >= 12 && i <= 16) v = rot(jaw * 0.22) * (v - vec2(0.05, -0.4)) + vec2(0.05, -0.4);
  return v;
}
float sdHead(vec2 p, float jaw) {
  vec2 v0 = headPt(0, jaw);
  float d = dot(p - v0, p - v0);
  float s = 1.0;
  for (int i = 0, j = 30; i < 31; j = i, i++) {
    vec2 vi = headPt(i, jaw);
    vec2 vj = headPt(j, jaw);
    vec2 e = vj - vi;
    vec2 w = p - vi;
    vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
    d = min(d, dot(b, b));
    bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
    if (all(c) || all(not(c))) s = -s;
  }
  return s * sqrt(d);
}
/* Head frame: x toward the nose (world -x), y up, z across. */
vec3 headLocal(vec3 q, float hz) { return vec3(-(q.x - 5.6), q.y - 0.55, q.z - hz); }


vec3 mVoice(vec3 q, float band) {
  float prox = proximity(band);
  float hz = band - 12.0;
  vec3 res = vec3(q.y + 2.62, 13.0, 0.0);
  float env = speechEnv(uTime);

  // A human head and shoulders in profile on the right, facing the path, drawn as a
  // slab with a glowing contour (see material 25). The jaw opens with the voice.
  vec3 h = headLocal(q, hz);
  float d2 = sdHead(h.xy, env);
  vec2 w = vec2(d2, abs(h.z) - 0.32);
  float head = min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - 0.04;
  if (head < res.x) res = vec3(head, 25.0, env);

  // The voice: a bar waveform that leaves the mouth and runs into the right edge of the
  // real TalkMac screen, each bar following the speech as it travels. Drawn in blue.
  vec3 A = vec3(5.6 - 1.32, 0.03, hz);
  vec3 B = vec3(-0.95, 0.3, band - 0.95);
  vec3 dirAB = B - A;
  float L = length(dirAB);
  dirAB /= L;
  vec3 side = normalize(cross(dirAB, vec3(0.0, 1.0, 0.0)));
  float rawAlong = dot(q - A, dirAB);
  {
    // Always measure to the nearest real bar (clamped to the first and last), so the
    // distance stays continuous past the ends. A gated range made the march misfire.
    float bw = 0.15;
    float j = clamp(floor(rawAlong / bw), 1.0, floor((L - 0.05) / bw) - 1.0);
    float aj = (j + 0.5) * bw;
    vec3 base = A + dirAB * aj;
    float amp = speechEnv(uTime - aj * 0.16) * (0.55 + 0.45 * hash11(j * 3.1 + floor(uTime * 14.0)));
    amp *= smoothstep(0.1, 0.6, prox) * smoothstep(0.0, 0.8, aj) * smoothstep(0.0, 0.8, L - aj);
    float hh = 0.03 + 1.05 * amp;
    vec3 lp = vec3(rawAlong - aj, q.y - base.y, dot(q - base, side));
    float bar = sdBox(lp, vec3(bw * 0.3, hh, 0.06));
    if (bar < gExtra.x) gExtra = vec3(bar, 31.0, 1.0 + min(amp, 0.999));
  }
  return res;
}

// ---- 4: waveforms coming into tune ---------------------------------------------
vec3 mScope(vec3 q, float band) {
  float prox = proximity(band);
  float sp = 2.6;
  float id = floor(q.z / sp);
  float zr = mod(q.z, sp) - sp * 0.5;
  float zc = (id + 0.5) * sp;
  float tune = 1.0 - clamp(abs(zc - band - 7.0) / 30.0, 0.0, 1.0);
  tune = smoothstep(0.35, 0.95, tune);
  float detune = 1.0 - tune;
  float ang = atan(q.y, q.x);
  float kk = 5.0 + mod(id, 3.0);
  // Two waves; the detuned one drifts against the other and they beat.
  float w = 0.5 * (sin(kk * ang + 3.0 * uTime + id) + sin(kk * ang + (3.0 + 2.2 * detune) * uTime + id * 1.7));
  float fuzz = sin(ang * 46.0 + uTime * 9.0) * 0.05 * detune;
  float R = 4.35 + 0.34 * w + fuzz;
  float ring = length(vec2(length(q.xy) - R, zr)) - 0.03 - 0.02 * tune;
  vec3 res = vec3(ring * 0.55, 11.0, tune);

  // Three-trace scope along the floor, settling into phase near the station.
  float tx = clamp(floor(q.x / 1.5 + 0.5), -1.0, 1.0) * 1.5;
  float ph = tx * (1.0 - prox) * 1.7;
  float yw = -2.15 + 0.42 * sin(q.z * 1.25 + uTime * 4.0 + ph) * (0.7 + 0.3 * sin(q.z * 0.11 * (1.0 - prox) + uTime));
  float trace = (length(vec2(q.x - tx, q.y - yw)) - 0.03) * 0.6;
  if (trace < res.x) res = vec3(trace, 11.0, prox);
  float floorD = q.y + 2.62;
  if (floorD < res.x) res = vec3(floorD, 13.0, 0.0);
  return res;
}

// ---- 5: piano roll, keyboard, spectrum -------------------------------------------
const float SPS = 4.5;
bool isAccent(float s) { return s < 0.5 || abs(s - 3.0) < 0.5 || abs(s - 5.0) < 0.5; }

/*
  GrooveMind's piano roll, laid out like a DAW turned onto the floor: an 88-key piano runs
  along the path (pitch rises as you fly forward), notes extend across the floor from it in
  time, and a playhead sweeps across. Two bars of 7/8 per pass; the chords move on each pass.
*/
// The roll starts a little before the station so the whole keyboard sits inside
// GrooveMind's own stretch of the world, clear of the blend with ProTuner's.
const float ROLL_Z0 = 10.0;
const float LANE = 0.45;
const float TSTEP = 0.45;
const float KX0 = -4.3;
const float KX1 = -1.75;
const float GX0 = -1.6;
bool blackPc(float pc) { return pc == 1.0 || pc == 3.0 || pc == 6.0 || pc == 8.0 || pc == 10.0; }
float rollPitch(float z, float band) { return floor((band + ROLL_Z0 - z) / LANE); }
float laneZ(float pitch, float band) { return band + ROLL_Z0 - (pitch + 0.5) * LANE; }

// Length in steps of a note starting at (pitch, step) within the current pass, or 0.
float rollNote(float pitch, float stp, float pass) {
  if (stp < 0.0 || stp > 13.0 || pitch < 0.0 || pitch > 87.0) return 0.0;
  float bar = pass * 2.0 + floor(stp / 7.0);
  float s = mod(stp, 7.0);
  float rb = mod(bar, 4.0);
  float root = rb < 0.5 ? 0.0 : rb < 1.5 ? 5.0 : rb < 2.5 ? 9.0 : 7.0;
  bool minor = rb > 1.5 && rb < 2.5;
  float oc = floor(pitch / 12.0);
  float pc = mod(pitch, 12.0);
  if (isAccent(s)) {
    float len = s < 0.5 ? 3.0 : 2.0;
    if (oc == 1.0 && pc == root) return len;
    float third = mod(root + (minor ? 3.0 : 4.0), 12.0);
    float fifth = mod(root + 7.0, 12.0);
    if (oc == 3.0 && (pc == root || pc == third || pc == fifth)) return len;
    return 0.0;
  }
  float pick = floor(hash21(vec2(bar, s)) * 5.0);
  float deg = pick < 0.5 ? 0.0 : pick < 1.5 ? 2.0 : pick < 2.5 ? 4.0 : pick < 3.5 ? 7.0 : 9.0;
  float mo = hash21(vec2(s, bar + 3.0)) > 0.55 ? 5.0 : 4.0;
  return (oc == mo && pc == mod(root + deg, 12.0)) ? 1.0 : 0.0;
}

vec3 mGroove(vec3 q, float band) {
  float tt = uTime * SPS;
  float pass = floor(tt / 14.0);
  float pstep = mod(tt, 14.0);
  float play = GX0 + pstep * TSTEP;
  float zLo = band + ROLL_Z0;
  float zHi = band + ROLL_Z0 - 88.0 * LANE;
  bool inLanes = q.z < zLo && q.z > zHi;
  float pitch = clamp(rollPitch(q.z, band), 0.0, 87.0);

  // Floor: the roll's grid where it exists, the plain floor elsewhere.
  vec3 res = vec3(q.y + 2.5, (inLanes && q.x > GX0 && q.x < GX0 + 14.0 * TSTEP) ? 32.0 : 13.0, pitch);

  if (inLanes) {
    // Notes, extending from the keyboard in time.
    if (q.x > GX0 - 0.2 && q.x < GX0 + 14.0 * TSTEP + 0.2) {
      float stp = floor((q.x - GX0) / TSTEP);
      for (int b = 0; b < 3; b++) {
        float s0 = stp - float(b);
        float dur = rollNote(pitch, s0, pass);
        if (dur < 0.5 || stp >= s0 + dur) continue;
        float xa = GX0 + s0 * TSTEP;
        float xb = GX0 + min(s0 + dur, 14.0) * TSTEP;
        bool on = play >= xa && play <= xb;
        float nb = sdRoundBox(vec3(q.x - 0.5 * (xa + xb), q.y + 2.4, q.z - laneZ(pitch, band)), vec3(0.5 * (xb - xa) - 0.03, 0.07, LANE * 0.5 - 0.04), 0.035);
        if (nb < res.x) res = vec3(nb, 14.0, on ? 1.0 : 0.14 + 0.06 * hash11(pitch));
      }
    }
    // The piano: white keys full length and widened on the roll side, black keys raised,
    // shorter, from the outer edge. Keys sink and light while their note plays.
    if (q.x > KX0 - 0.3 && q.x < KX1 + 0.3) {
      float ps = floor(pstep);
      float kb = sdBox(vec3(q.x - 0.5 * (KX0 + KX1), q.y + 2.46, q.z - 0.5 * (zLo + zHi)), vec3(0.5 * (KX1 - KX0) + 0.08, 0.05, 0.5 * (zLo - zHi) + 0.1));
      if (kb < res.x) res = vec3(kb, 16.0, 0.0);
      float rail = sdBox(vec3(q.x - (KX0 - 0.1), q.y + 2.28, q.z - 0.5 * (zLo + zHi)), vec3(0.08, 0.2, 0.5 * (zLo - zHi) + 0.1));
      if (rail < res.x) res = vec3(rail, 16.0, 0.35);
      for (int n = -1; n <= 1; n++) {
        float P = pitch + float(n);
        if (P < 0.0 || P > 87.0) continue;
        float zc = laneZ(P, band);
        bool pressed = false;
        for (int b = 0; b < 3; b++) {
          float s0 = ps - float(b);
          float dur = rollNote(P, s0, pass);
          if (dur > 0.5 && ps < s0 + dur) pressed = true;
        }
        float press = pressed ? 0.045 : 0.0;
        float pc = mod(P, 12.0);
        float k;
        if (blackPc(pc)) {
          k = sdRoundBox(vec3(q.x - (KX0 + 0.78), q.y + 2.22 + press, q.z - zc), vec3(0.78, 0.1, LANE * 0.36), 0.025);
        } else {
          bool lo = P > 0.0 && blackPc(mod(P - 1.0, 12.0));
          bool hi = P < 87.0 && blackPc(mod(P + 1.0, 12.0));
          float back = sdRoundBox(vec3(q.x - 0.5 * (KX0 + KX1), q.y + 2.33 + press, q.z - zc), vec3(0.5 * (KX1 - KX0), 0.07, LANE * 0.5 - 0.012), 0.015);
          float z0 = zc + LANE * 0.5 + (lo ? LANE * 0.5 : 0.0);
          float z1 = zc - LANE * 0.5 - (hi ? LANE * 0.5 : 0.0);
          float front = sdRoundBox(vec3(q.x - (KX1 - 0.48), q.y + 2.33 + press, q.z - 0.5 * (z0 + z1)), vec3(0.48, 0.07, 0.5 * (z0 - z1) - 0.012), 0.015);
          k = min(back, front);
        }
        if (k < res.x) res = vec3(k, blackPc(pc) ? 16.0 : 15.0, pressed ? 1.0 : 0.0);
      }
      // Only the nearest three lanes are measured, so cap the step there.
      if (q.y < -1.9) res.x = min(res.x, LANE * 0.6);
    }
  }
  // Playhead: a laser line across all lanes, with a post at each end.
  float ph = sdBox(vec3(q.x - play, q.y + 2.25, q.z - 0.5 * (zLo + zHi)), vec3(0.018, 0.018, 0.5 * (zLo - zHi)));
  ph = min(ph, sdBox(vec3(q.x - play, q.y + 1.9, abs(q.z - 0.5 * (zLo + zHi)) - 0.5 * (zLo - zHi)), vec3(0.025, 0.4, 0.025)));
  if (ph < gExtra.x) gExtra = vec3(ph, 26.0, 0.0);

  // Spectrum walls: low bands kick on the 3+2+2 accents, highs follow the melody.
  float sideX = abs(q.x) - 5.3;
  float j = floor(q.z / 0.55);
  float zl = mod(q.z, 0.55) - 0.275;
  float f = mod(j, 24.0) / 23.0;
  float pos = mod(uTime * SPS, 7.0);
  float kick = exp(-fract(pos) * 5.0) * (isAccent(floor(pos)) ? 1.0 : 0.3);
  float e = kick * (1.0 - f) * 1.3 + 0.45 * (0.5 + 0.5 * sin(uTime * 7.3 + j * 1.9)) * f + 0.18 * hash11(j + floor(uTime * 9.0));
  float hgt = 0.2 + 3.2 * clamp(e, 0.0, 1.0);
  float eq = sdBox(vec3(sideX, q.y + 2.5 - hgt * 0.5, zl), vec3(0.12, hgt * 0.5, 0.2));
  if (eq < res.x) res = vec3(eq, 21.0, hgt);
  return res;
}

vec3 motif(float m, vec3 q, float band) {
  if (m < 0.5) return mFret(q);
  if (m < 1.5) return mLink(q, band);
  if (m < 2.5) return mGrowth(q, band);
  if (m < 3.5) return mVoice(q, band);
  if (m < 4.5) return mScope(q, band);
  return mGroove(q, band);
}

vec3 map(vec3 p) {
  gExtra = vec3(1e5, 0.0, 0.0);
  vec3 q = vec3(p.xy - pathXY(p.z), p.z);
  float w = smoothstep(0.35, 0.65, clamp((uBandA - p.z) / max(uBandA - uBandB, 1.0), 0.0, 1.0));
  // One motif call site, run once or twice. In the blend zone each motif sinks away as the
  // other takes over (an erosion blend); averaging two unrelated fields makes phantom walls.
  bool single = uMotifA == uMotifB || w < 0.002 || w > 0.998;
  bool onlyB = uMotifA != uMotifB && w > 0.998;
  vec3 res = vec3(1e5, 0.0, 0.0);
  for (int side = ZERO; side < 2; side++) {
    if (single && side > 0) break;
    bool useB = single ? onlyB : side == 1;
    vec3 r = motif(useB ? uMotifB : uMotifA, q, useB ? uBandB : uBandA);
    float d = r.x + (single ? 0.0 : (useB ? 1.0 - w : w) * 7.0);
    if (d < res.x) res = vec3(d, r.yz);
  }
  // Keep the flight path and the space around each nearby screen clear.
  res.x = max(res.x, 2.0 - length(q.xy));
  // Squashed vertically so floor-level pieces under a screen (keys, notes) are not
  // sliced into ramps by the clearing. Dividing by the scale keeps it a safe bound.
  res.x = max(res.x, (2.7 - length((p - uScreenPos[0]) * vec3(1.0, 1.45, 1.0))) / 1.45);
  res.x = max(res.x, (2.7 - length((p - uScreenPos[1]) * vec3(1.0, 1.45, 1.0))) / 1.45);
  // Light structures (beams, waveforms, the playhead) may cross the path.
  if (gExtra.x < res.x) res = gExtra;
  return res;
}

vec3 calcNormal(vec3 p) {
  // Tetrahedral normal, written as a loop so map() is compiled once here, not four times.
  vec3 n = vec3(0.0);
  for (int i = ZERO; i < 4; i++) {
    vec3 e = 0.5773 * (2.0 * vec3(float(((i + 3) >> 1) & 1), float((i >> 1) & 1), float(i & 1)) - 1.0);
    n += e * map(p + 0.002 * e).x;
  }
  return normalize(n);
}

float calcAO(vec3 p, vec3 n) {
  float occ = 0.0, sca = 1.0;
  for (int i = ZERO; i < 4; i++) {
    float h = 0.05 + 0.18 * float(i);
    occ += (h - map(p + n * h).x) * sca;
    sca *= 0.7;
  }
  return clamp(1.0 - 1.6 * occ, 0.0, 1.0);
}

vec3 noteColor(float pc) {
  // Pitch-class hues, close to fr3t.app's note colors.
  return 0.55 + 0.45 * cos(2.0 * PI * (pc / 12.0 + vec3(0.0, 0.33, 0.67)));
}

/* Screen UI for the two InputShare computers: a window, a layout of displays, and the cursor. */
vec3 linkScreen(vec3 q) {
  float pz = bandOf(1.0) - 5.0;
  float side = q.x < 0.0 ? -1.0 : 1.0;
  vec2 uv = vec2((q.z - pz) / 1.44 * -side, (q.y - 0.35) / 0.9);
  vec3 col = vec3(0.02, 0.05, 0.07);
  col += vec3(0.06, 0.12, 0.16) * step(0.82, uv.y);
  vec2 g = abs(fract(uv * vec2(4.0, 3.0)) - 0.5);
  col += vec3(0.05, 0.25, 0.2) * smoothstep(0.47, 0.5, max(g.x, g.y)) * 0.6;
  // Display rectangles, as in InputShare's layout view.
  float r1 = sdBox2(uv - vec2(-0.35, 0.05), vec2(0.38, 0.28));
  float r2 = sdBox2(uv - vec2(0.42, 0.0), vec2(0.3, 0.22));
  col += vec3(0.15, 0.4, 0.9) * (1.0 - smoothstep(0.0, 0.015, r1)) * 0.5;
  col += vec3(0.25, 0.75, 0.45) * (1.0 - smoothstep(0.0, 0.015, r2)) * 0.5;
  // Cursor: drifts to the edge on the right screen, then appears on the left.
  float cyc = fract(uTime / 4.0);
  vec2 cp = side > 0.0 ? vec2(mix(-0.2, 1.0, smoothstep(0.0, 0.35, cyc)), 0.1) : vec2(mix(-1.0, -0.1, smoothstep(0.65, 1.0, cyc)), 0.1);
  bool vis = side > 0.0 ? cyc < 0.35 : cyc > 0.65;
  if (vis) col += vec3(2.4) * (1.0 - smoothstep(0.03, 0.05, length(uv - cp)));
  return col * 1.6;
}


void material(float m, float prm, vec3 p, vec3 q, out vec3 albedo, out vec3 emis) {
  albedo = vec3(0.05);
  emis = vec3(0.0);
  if (m < 1.5) {
    // Rosewood with grain running along the neck.
    float grain = fbm(vec2(q.x * 2.6, q.z * 0.28)) * 0.7 + 0.3 * vnoise(vec2(q.x * 14.0, q.z * 0.9));
    albedo = vec3(0.11, 0.06, 0.035) * (0.45 + 0.9 * grain);
  }
  else if (m < 2.5) albedo = vec3(0.72, 0.72, 0.7);
  else if (m < 3.5) {
    // Wound bass strings get a fine winding pattern.
    float sIdx = clamp(floor(q.x + 3.0), 0.0, 5.0);
    float wind = sIdx < 3.5 ? 0.75 + 0.25 * sin(q.z * 140.0) : 1.0;
    albedo = vec3(0.68, 0.64, 0.56) * wind;
    emis = vec3(1.0, 0.82, 0.55) * (0.05 + 0.9 * prm); }
  else if (m < 4.5) emis = noteColor(floor(prm)) * (0.3 + 3.4 * fract(prm));
  else if (m < 5.5) {
    // Mother-of-pearl: a faint shifting iridescence.
    albedo = vec3(0.8, 0.8, 0.76);
    emis = (0.55 + 0.45 * cos(6.2831 * (fbm(q.xz * 3.0) * 1.5 + vec3(0.0, 0.33, 0.67)))) * 0.12;
  }
  else if (m < 6.5) emis = (prm > 2.5 ? vec3(1.0, 0.97, 0.9) * 3.4 : prm > 0.0 ? vec3(0.4, 1.0, 0.6) * 2.4 : vec3(0.35, 0.6, 1.0) * 2.4);
  else if (m < 7.5) albedo = vec3(0.06, 0.065, 0.075);
  else if (m < 8.5) { albedo = vec3(0.05); emis = vec3(0.3, 0.48, 1.0) * 1.4 * prm; }
  else if (m < 10.5) emis = vec3(1.0, 0.72, 0.42) * (0.35 + 1.9 * prm);
  else if (m < 11.5) emis = mix(vec3(1.0, 0.45, 0.08) * 1.5, vec3(0.45, 1.0, 0.55) * 1.7, prm);
  else if (m < 12.5) emis = vec3(1.0, 0.9, 0.7) * prm * 1.4;
  else if (m < 13.5) {
    albedo = vec3(0.04, 0.045, 0.05);
    // Faint floor grid so the space reads as a room.
    vec2 g = abs(fract(q.xz * 0.5) - 0.5);
    emis = vec3(0.04, 0.06, 0.06) * smoothstep(0.47, 0.5, max(g.x, g.y));
  }
  else if (m < 14.5) emis = vec3(0.45, 0.4, 1.0) * (0.35 + 2.2 * prm);
  else if (m < 15.5) { albedo = vec3(0.86, 0.84, 0.8); emis = vec3(0.07, 0.07, 0.065) + vec3(0.45, 0.4, 1.0) * 1.8 * prm; }
  else if (m < 16.5) { albedo = vec3(0.02); emis = vec3(0.45, 0.4, 1.0) * 1.6 * prm; }
  else if (m < 17.5) emis = linkScreen(q);
  else if (m < 19.5) {
    if (prm > 1.5) { emis = vec3(0.35, 0.9, 0.6) * (0.6 + 1.6 * (prm - 2.0)); }
    else {
      // Circuit traces with pulses of traffic.
      albedo = vec3(0.025, 0.035, 0.03);
      vec2 c = vec2(q.y, q.z) / vec2(1.3, 1.7);
      vec2 id = floor(c);
      vec2 f = fract(c) - 0.5;
      float trace = hash21(id) > 0.45 ? abs(f.x) : abs(f.y);
      float line = 1.0 - smoothstep(0.02, 0.05, trace);
      float pulse = smoothstep(0.92, 1.0, fract(q.z * 0.12 + uTime * 0.6 + hash21(id) * 5.0));
      emis = vec3(0.2, 0.75, 0.5) * line * (0.08 + 1.6 * pulse);
    }
  }
  else if (m < 20.5) emis = mix(vec3(0.3, 0.48, 1.0), vec3(0.85, 0.9, 1.0), 0.35) * (0.03 + 0.8 * prm);
  else if (m < 21.5) {
    // LED meter: segmented, green to amber to red with height.
    float y = q.y + 2.5;
    float seg = step(0.25, fract(y * 3.2));
    vec3 c = y < 1.6 ? vec3(0.3, 1.0, 0.45) : y < 2.6 ? vec3(1.0, 0.75, 0.2) : vec3(1.0, 0.3, 0.2);
    emis = c * seg * 1.5;
  }
  else if (m < 22.5) albedo = vec3(0.8, 0.76, 0.66);
  else if (m < 23.5) emis = vec3(1.0, 0.78, 0.45) * (0.3 + 2.0 * prm);
  else if (m < 24.5) { albedo = vec3(0.4, 0.36, 0.3); emis = mix(vec3(1.0, 0.18, 0.12), vec3(0.3, 1.0, 0.5), smoothstep(0.6, 0.95, prm)) * 1.3; }
  else if (m < 25.5) {
    // The speaker: dark glass with a glowing blue contour that brightens with the voice.
    vec3 h = headLocal(q, bandOf(3.0) - 12.0);
    float d2 = sdHead(h.xy, prm);
    albedo = vec3(0.012, 0.012, 0.016);
    float edge = exp(-abs(d2) * 28.0);
    float inner = smoothstep(0.0, -1.2, d2) * 0.05;
    emis = vec3(0.35, 0.72, 1.0) * (edge * (1.1 + 1.6 * prm) + inner);
  }
  else if (m < 26.5) emis = vec3(0.45, 0.42, 1.0) * 1.3;
  else if (m > 30.5 && m < 31.5) {
    // Voice bars: blue, brighter and more cyan as the voice gets louder.
    float a = fract(prm);
    emis = mix(vec3(0.22, 0.42, 1.0), vec3(0.4, 0.9, 1.0), a) * (0.45 + 1.9 * a);
  }
  else if (m > 31.5 && m < 32.5) {
    // Piano-roll floor: black-key lanes darker, a line per step, brighter lines per bar.
    float pc = mod(prm, 12.0);
    albedo = blackPc(pc) ? vec3(0.03, 0.03, 0.05) : vec3(0.06, 0.06, 0.09);
    float sx = (q.x - GX0) / TSTEP;
    float stepLine = 1.0 - smoothstep(0.0, 0.05, abs(fract(sx) - 0.5) - 0.45);
    float barLine = 1.0 - smoothstep(0.0, 0.08, abs(fract(sx / 7.0) - 0.5) - 0.48);
    float laneLine = 1.0 - smoothstep(0.0, 0.03, abs(fract((bandOf(5.0) + ROLL_Z0 - q.z) / LANE) - 0.5) - 0.47);
    emis = vec3(0.3, 0.28, 0.7) * (0.05 * stepLine + 0.22 * barLine + 0.04 * laneLine);
  }
  else albedo = vec3(0.34, 0.21, 0.11);
}

bool glowy(float m) {
  return (m > 2.5 && m < 4.5) || (m > 5.5 && m < 6.5) || (m > 7.5 && m < 8.5) || (m > 9.5 && m < 12.5) ||
         (m > 13.5 && m < 14.5) || (m > 19.5 && m < 21.5) || (m > 22.5 && m < 23.5) || (m > 25.5 && m < 26.5) ||
         (m > 30.5 && m < 31.5);
}

vec3 stars(vec3 rd) {
  vec3 r = rd * 160.0;
  vec3 id = floor(r);
  vec3 f = fract(r) - 0.5;
  float h = hash21(id.xy + id.z * 7.13);
  float star = smoothstep(0.1, 0.0, length(f)) * step(0.982, h);
  float tw = 0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 60.0);
  return mix(vec3(1.0, 0.85, 0.7), vec3(0.75, 0.85, 1.0), fract(h * 13.0)) * star * tw * 1.4;
}

/* A vast ring hanging over the horizon ahead: the destination the path flies toward. */
vec3 halo(vec3 rd, vec3 accent) {
  vec3 D = normalize(vec3(0.18, 0.2, -1.0));
  float a = acos(clamp(dot(rd, D), -1.0, 1.0));
  vec3 X = normalize(cross(D, vec3(0.0, 1.0, 0.0)));
  vec3 Y = cross(X, D);
  float az = atan(dot(rd, Y), dot(rd, X));
  float r0 = 0.3;
  float thin = exp(-abs(a - r0) * 220.0);
  float soft = exp(-abs(a - r0) * 18.0) * 0.18;
  float var = 0.55 + 0.45 * sin(az * 3.0 + uTime * 0.25) * sin(az * 7.0 - uTime * 0.4);
  return mix(vec3(0.95, 0.75, 0.45), accent, 0.55) * (thin * 1.6 + soft) * var;
}

vec3 sky(vec3 rd) {
  float y = rd.y;
  vec3 accent = mix(uAccentA, uAccentB, uAccentMix);
  vec3 col = mix(vec3(0.005, 0.008, 0.007), vec3(0.015, 0.022, 0.02), smoothstep(-0.2, 0.6, y));
  col += accent * 0.035 * exp(-abs(y + 0.02) * 12.0);
  // Nebula: two layers of domain-warped noise.
  vec2 uv = rd.xz / (abs(y) + 0.35) * 0.55;
  vec2 w = vec2(fbm(uv + uTime * 0.02), fbm(uv + vec2(5.2, 1.3) - uTime * 0.015));
  float f = fbm(uv + 2.2 * w);
  vec3 neb = mix(vec3(0.84, 0.66, 0.36), accent, w.x) * pow(f, 3.6) * 0.95;
  // Aurora curtains: vertical folds that drift.
  float az = atan(rd.x, -rd.z);
  float cur = fbm(vec2(az * 3.2 + uTime * 0.03, 1.7) + w * 0.7);
  float band = smoothstep(0.04, 0.28, y) * smoothstep(0.8, 0.32, y);
  float folds = 0.55 + 0.45 * sin(y * 36.0 + az * 9.0 + uTime * 0.6 + cur * 6.0);
  vec3 aur = mix(accent, vec3(0.5, 1.0, 0.75), 0.25) * pow(cur, 2.8) * band * folds * 0.75;
  col += (neb + aur) * smoothstep(-0.25, 0.7, y);
  col += stars(rd) * smoothstep(-0.05, 0.3, y);
  col += halo(rd, accent);
  return col;
}

void main() {
  vec2 ndc = vUv * 2.0 - 1.0;
  vec4 v = uProjInv * vec4(ndc, 1.0, 1.0);
  vec3 rdView = normalize(v.xyz / v.w);
  vec3 rd = normalize((uCamWorld * vec4(rdView, 0.0)).xyz);
  vec3 ro = uCamPos;

  float t = 0.05;
  vec3 hit = vec3(-1.0);
  vec3 glow = vec3(0.0);
  const float tMax = 70.0;
  for (int i = 0; i < 160; i++) {
    if (i >= uSteps) break;
    vec3 p = ro + rd * t;
    vec3 h = map(p);
    if (glowy(h.y)) {
      vec3 a, e;
      material(h.y, h.z, p, vec3(p.xy - pathXY(p.z), p.z), a, e);
      glow += e * 0.00035 / (0.006 + h.x * h.x);
    }
    if (h.x < 0.0015 * t) { hit = vec3(t, h.y, h.z); break; }
    t += h.x * 0.8;
    if (t > tMax) break;
  }

  vec3 bg = sky(rd);
  vec3 col = bg;
  float viewDepth = 1e4;
  if (hit.x > 0.0) {
    vec3 p = ro + rd * hit.x;
    vec3 q = vec3(p.xy - pathXY(p.z), p.z);
    vec3 n = calcNormal(p);
    vec3 albedo, emis;
    material(hit.y, hit.z, p, q, albedo, emis);
    vec3 L = normalize(vec3(0.35, 0.85, 0.4));
    float dif = max(dot(n, L), 0.0);
    float hemi = 0.5 + 0.5 * n.y;
    float ao = calcAO(p, n);
    vec3 lit = albedo * (vec3(0.05, 0.065, 0.06) * hemi + vec3(1.0, 0.92, 0.8) * dif * 0.55) * ao;
    for (int j = 0; j < 2; j++) {
      vec3 lv = uScreenPos[j] - p;
      float ld = length(lv);
      lit += albedo * uScreenCol[j] * max(dot(n, lv / ld), 0.0) * 1.6 / (1.0 + ld * ld * 0.15);
    }
    // Rim light gives dark forms a readable edge; the speaking head is lit almost only by it.
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    vec3 accent = mix(uAccentA, uAccentB, uAccentMix);
    lit += mix(vec3(0.9, 0.7, 0.45), accent, 0.5) * fres * (hit.y > 24.5 && hit.y < 25.5 ? 1.6 : 0.12) * ao;
    bool metal = hit.y > 1.5 && hit.y < 3.5;
    float spec = pow(max(dot(reflect(rd, n), L), 0.0), metal ? 60.0 : 24.0) * (metal ? 1.2 : 0.25);
    col = lit + spec * ao + emis;

    // Glossy floors reflect the glowing structures around them.
    if (uRefl > 0.5 && ((hit.y > 12.5 && hit.y < 13.5) || (hit.y > 31.5 && hit.y < 32.5))) {
      vec3 rr = reflect(rd, n);
      float tr = 0.05;
      vec3 rc = sky(rr);
      for (int i = 0; i < 40; i++) {
        vec3 rp = p + n * 0.02 + rr * tr;
        vec3 rh = map(rp);
        if (rh.x < 0.002 * tr) {
          vec3 ra, re;
          material(rh.y, rh.z, rp, vec3(rp.xy - pathXY(rp.z), rp.z), ra, re);
          rc = re + ra * 0.08;
          break;
        }
        tr += rh.x * 0.9;
        if (tr > 30.0) break;
      }
      float fres = 0.12 + 0.6 * pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
      col += rc * fres * 0.7;
    }

    col = mix(col, bg, 1.0 - exp(-hit.x * 0.03));
    // Low mist that pools near the floor and takes the accent color.
    float mist = exp(-max(q.y + 2.62, 0.0) * 1.1) * (1.0 - exp(-hit.x * 0.05));
    col = mix(col, vec3(0.015, 0.022, 0.02) + accent * 0.04, mist * 0.28);
    viewDepth = -(uView * vec4(p, 1.0)).z;
  }
  col += min(glow, vec3(1.5));
  outColor = vec4(max(col, 0.0), viewDepth);
}
`;

/** Draws the low-resolution field to the screen and writes its depth so real screens sort against it. */
export const compositeFragment = /* glsl */ `
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uField;
uniform mat4 uProj;
uniform float uFade;
void main() {
  vec4 f = texture(uField, vUv);
  float z = -f.a;
  vec4 clip = uProj * vec4(0.0, 0.0, z, 1.0);
  float ndc = clip.z / clip.w;
  gl_FragDepth = f.a > 9000.0 ? 1.0 : clamp(ndc * 0.5 + 0.5, 0.0, 1.0);
  outColor = vec4(f.rgb * (1.0 - uFade), 1.0);
}
`;
