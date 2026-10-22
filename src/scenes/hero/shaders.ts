import { FIRE_RAMP, NOISE } from '@/fx/glsl';
import { CAMERA_Z } from './frame';

/**
 * Poster: a sheet folded in thirds across and once down the middle (the
 * creases in the artwork), lit from below by an unseen fire. All lighting is
 * scaled by uLight so that at uLight = 0 the shader returns the texture
 * untouched: the handoff to the video must be pixel-identical.
 * Textures are sampled without colour conversion (NoColorSpace) for the same reason.
 */
export const posterVertex = /* glsl */ `
uniform float uTime;
uniform float uFold;
uniform float uWave;
varying vec2 vUv;
varying vec3 vN;

float zig(float u) {
  // Accordion fold: creases at 1/3 and 2/3.
  float t = u * 3.0;
  return 1.0 - abs(mod(t, 2.0) - 1.0);
}

float height(vec2 uv) {
  float across = zig(uv.x) * 7.0;
  float down = (1.0 - abs(uv.y * 2.0 - 1.0)) * 5.0;
  float wave = sin(uv.x * 3.1 + uTime * 0.7) * sin(uv.y * 2.3 + uTime * 0.53) * 4.0;
  return uFold * (across + down) + uWave * wave;
}

void main() {
  vUv = uv;
  vec3 p = position;
  float h = height(uv);
  p.z += h;
  // Normal from finite differences in uv, scaled to the plane's size.
  float e = 0.004;
  float dx = (height(uv + vec2(e, 0.0)) - height(uv - vec2(e, 0.0))) / (2.0 * e * 1063.0);
  float dy = (height(uv + vec2(0.0, e)) - height(uv - vec2(0.0, e))) / (2.0 * e * 688.0);
  vN = normalize(normalMatrix * normalize(vec3(-dx * 18.0, -dy * 18.0, 1.0)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`;

export const posterFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uTime;
uniform float uLight;
uniform float uReveal;
uniform float uSeed;
uniform float uFlicker;
uniform vec3 uTint;
varying vec2 vUv;
varying vec3 vN;

${NOISE}
${FIRE_RAMP}

void main() {
  vec3 base = texture2D(uMap, vUv).rgb;

  // Fire below and in front: light rises from the bottom edge and flickers.
  float flick = uFlicker;
  vec3 L = normalize(vec3(-0.25, -0.75, 0.62));
  float ndl = clamp(dot(normalize(vN), L), 0.0, 1.0);
  float nearFire = pow(1.0 - vUv.y, 2.2);
  vec3 lit = base * (0.78 + 0.34 * ndl) * mix(0.92, 1.06, flick);
  lit += base * uTint * nearFire * 0.55 * flick;
  lit = mix(lit, lit * vec3(1.04, 0.96, 0.9), 0.5);
  vec3 col = mix(base, lit, uLight);

  // Intro: the poster burns into being, bottom to top.
  if (uReveal < 1.0) {
    float field = vUv.y + fbm(vec3(vUv * vec2(2.6, 1.7), uSeed)) * 0.22 + snoise(vec3(vUv * 14.0, uSeed + uTime * 0.2)) * 0.02;
    float front = mix(-0.14, 1.28, uReveal);
    float d = field - front;
    float shown = 1.0 - smoothstep(-0.006, 0.006, d);
    float heat = d > -0.06 ? exp(-abs(d) * 34.0) : 0.0;
    float f2 = snoise(vec3(vUv * 30.0, uTime * 3.0)) * 0.5 + 0.5;
    vec3 rim = fireRamp(heat * (0.75 + 0.25 * f2)) * heat * 1.4;
    col = col * shown + rim;

    // Flames lick up from the front into the part not yet revealed.
    float tongues = fbm(vec3(vUv.x * 7.0, vUv.y * 2.2 - uTime * 1.8, uSeed + 2.0)) * 0.5 + 0.5;
    float h = max(d, 0.0) / 0.13;
    float body = smoothstep(1.0, 0.0, h + (1.0 - tongues) * 1.0) * step(0.0, d);
    float temp = body * (1.0 - h * 0.6) * (0.8 + 0.2 * f2);
    col += fireRamp(temp) * smoothstep(0.05, 0.5, temp) * (1.0 - smoothstep(0.85, 1.0, uReveal));
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

/** The burning video, drawn as-is over the whole frame. */
export const videoVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const videoFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uMap, vUv).rgb * uOpacity, 1.0);
}
`;

/**
 * Embers: GPU particles. Each particle's whole life is a function of time and
 * its seed, so nothing is simulated on the CPU.
 */
export const emberVertex = /* glsl */ `
uniform float uTime;
uniform float uFlow;
uniform float uSpread;
uniform float uPixel;
attribute vec4 aSeed;
varying float vLife;
varying float vSeed;

void main() {
  // uFlow is time integrated on the CPU with a variable rate, so speeding the
  // embers up never makes them jump.
  float speed = mix(55.0, 150.0, aSeed.y);
  float span = 1150.0;
  float life = fract(aSeed.z + uFlow * speed / span);
  vec3 p;
  float baseX = mix(-640.0, 420.0, aSeed.x) * uSpread;
  p.x = baseX + sin(uTime * (0.5 + aSeed.w) + aSeed.z * 31.0) * (18.0 + 60.0 * life) + life * 40.0 * (aSeed.w - 0.5);
  p.y = -560.0 + life * span;
  p.z = mix(-260.0, 340.0, aSeed.w);
  vLife = life;
  vSeed = aSeed.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float size = mix(3.2, 12.0, aSeed.y * aSeed.y) * (1.0 - life * 0.55);
  gl_PointSize = max(1.6, size * uPixel * (${CAMERA_Z.toFixed(1)} / -mv.z));
}
`;

export const emberFragment = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uIntensity;
uniform vec3 uTint;
varying float vLife;
varying float vSeed;

${FIRE_RAMP}

void main() {
  float r = length(gl_PointCoord - 0.5);
  float core = pow(smoothstep(0.5, 0.0, r), 1.5);
  float fadeIn = smoothstep(0.0, 0.08, vLife);
  float fadeOut = 1.0 - smoothstep(0.55, 1.0, vLife);
  float flick = 0.6 + 0.4 * sin(uTime * (11.0 + vSeed * 9.0) + vSeed * 50.0);
  vec3 col = fireRamp(1.0 - vLife * 0.7) * mix(vec3(1.0), uTint, 0.45);
  gl_FragColor = vec4(col * core * fadeIn * fadeOut * flick * uIntensity, 1.0);
}
`;
