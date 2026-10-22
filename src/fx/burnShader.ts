import { FIRE_RAMP, NOISE, SPARKS } from './glsl';

/**
 * Full-screen page-transition shader. Output is premultiplied alpha.
 *
 * uMode 0  burn cover:  a ragged front rises from the bottom; below it the page
 *          is char, at it a glowing rim, above it scorch and flame tongues.
 * uMode 1  burn reveal: a burn hole opens from uOrigin; inside is transparent
 *          (the new page), its rim glows, outside is still char.
 * uMode 2  veil cover / 3 veil reveal: the same fronts without fire, in uChar
 *          (paper on Design, black elsewhere) for moves inside one world.
 */
export const burnFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uProgress;
uniform float uMode;
uniform float uAspect;
uniform float uSeed;
uniform vec2 uOrigin;
uniform vec3 uChar;

${NOISE}
${FIRE_RAMP}
${SPARKS}

void main() {
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * uAspect, uv.y);
  float t = uTime;
  vec3 col = vec3(0.0);
  float a = 0.0;

  float grain = snoise(vec3(p * 55.0, uSeed)) * 0.5 + 0.5;
  vec3 charCol = uChar * (0.75 + 0.5 * grain);

  if (uMode < 0.5) {
    // ---- burn cover
    float field = uv.y + fbm(vec3(p * 1.5, uSeed)) * 0.24 + snoise(vec3(p * 9.0, uSeed + t * 0.2)) * 0.022;
    float front = mix(-0.42, 1.32, uProgress);
    float d = field - front;

    float burned = 1.0 - smoothstep(-0.004, 0.004, d);
    col = charCol * burned;
    a = burned;

    // Embers creep through the char just behind the front.
    float flick = snoise(vec3(p * 26.0, t * 3.0)) * 0.5 + 0.5;
    float heat = d < 0.0 ? exp(d * 38.0) : 0.0;
    float veins = smoothstep(0.35, 0.9, snoise(vec3(p * 14.0, uSeed + 4.0)) * 0.5 + 0.5);
    float rim = heat * (0.75 + 0.25 * flick) + heat * veins * 0.35;
    col += fireRamp(rim) * rim * burned * 1.25;

    // Scorch: the paper browns just ahead of the flames.
    float scorch = d > 0.0 ? (1.0 - smoothstep(0.0, 0.09, d)) : 0.0;
    float sa = scorch * 0.72;
    col = vec3(0.16, 0.07, 0.025) * sa + col * (1.0 - sa);
    a = sa + a * (1.0 - sa);

    // Flame tongues licking upward from the front.
    float tongues = fbm(vec3(p.x * 5.0, p.y * 1.45 - t * 1.9, t * 0.35 + uSeed)) * 0.5 + 0.5;
    float h = max(d, 0.0) / 0.3;
    float body = smoothstep(1.0, 0.0, h + (1.0 - tongues) * 1.05) * step(0.0, d);
    float temp = body * (1.0 - h * 0.6) * (0.85 + 0.15 * flick);
    float fa = smoothstep(0.04, 0.5, temp);
    col = fireRamp(temp) * fa + col * (1.0 - fa);
    a = fa + a * (1.0 - fa);

    float sp = sparks(p, t, smoothstep(0.3, 0.0, abs(d - 0.1)));
    col += vec3(1.0, 0.72, 0.32) * sp;
    a = max(a, clamp(sp, 0.0, 1.0));
  } else if (uMode < 1.5) {
    // ---- burn reveal: a hole burns open from uOrigin
    vec2 o = vec2(uOrigin.x * uAspect, uOrigin.y);
    float maxR = length(vec2(max(o.x, uAspect - o.x), max(o.y, 1.0 - o.y))) + 0.35;
    float field = length(p - o) + fbm(vec3(p * 2.1, uSeed + 7.0)) * 0.2 + snoise(vec3(p * 11.0, t * 0.3)) * 0.015;
    float front = mix(-0.25, maxR, uProgress);
    float d = field - front; // < 0 inside the hole

    float charA = smoothstep(-0.003, 0.004, d);
    col = charCol * charA;
    a = charA;

    float flick = snoise(vec3(p * 24.0, t * 3.5)) * 0.5 + 0.5;
    float heat = d > 0.0 ? exp(-d * 32.0) : 0.0;
    float rim = heat * (0.7 + 0.3 * flick);
    col += fireRamp(rim) * rim * charA * 1.3;

    // A thin lick of flame along the rim, fading as the hole grows.
    float tongues = fbm(vec3(p * 5.0 - vec2(0.0, t * 1.2), t * 0.4)) * 0.5 + 0.5;
    float lick = (d > -0.03 && d < 0.0) ? (1.0 - abs(d + 0.015) / 0.015) : 0.0;
    float temp = lick * tongues * (1.0 - uProgress * 0.6);
    float fa = smoothstep(0.1, 0.6, temp);
    col = fireRamp(temp) * fa + col * (1.0 - fa);
    a = fa + a * (1.0 - fa);

    float sp = sparks(p, t, smoothstep(0.2, 0.0, abs(d - 0.04)) * (1.0 - uProgress * 0.7));
    col += vec3(1.0, 0.7, 0.3) * sp;
    a = max(a, clamp(sp, 0.0, 1.0));
  } else {
    // ---- veil (no fire)
    float n = fbm(vec3(p * 1.3, uSeed)) * 0.18;
    float field = uMode < 2.5 ? uv.y + n : (1.0 - uv.y) + n;
    float front = mix(-0.25, 1.22, uProgress);
    float d = field - front;
    float cover = uMode < 2.5 ? 1.0 - smoothstep(-0.08, 0.0, d) : smoothstep(-0.06, 0.06, d);
    col = uChar * cover;
    a = cover;
  }

  gl_FragColor = vec4(col, a);
}
`;
