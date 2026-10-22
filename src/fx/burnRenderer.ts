/**
 * Minimal WebGL renderer for the full-screen burn shader: one triangle, one
 * program, no three.js (so pages without 3D stay light). GLSL ES 1.00 runs on
 * both WebGL2 and WebGL1.
 *
 * If the GPU context is lost (driver reset, too many contexts) calls become no-ops;
 * the owner of the canvas listens for webglcontextlost/restored (FxOverlay), falls
 * back to a plain fade meanwhile and calls createBurnRenderer again on restore.
 */
import { burnFragment } from './burnShader';

const VERTEX = /* glsl */ `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export interface BurnUniforms {
  time: number;
  progress: number;
  mode: number;
  seed: number;
  origin: [number, number];
  char: [number, number, number];
}

export interface BurnRenderer {
  resize(width: number, height: number, pixelRatio: number): void;
  render(u: BurnUniforms): void;
  clear(): void;
  dispose(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Burn shader failed to compile: ${log}`);
  }
  return shader;
}

export function createBurnRenderer(canvas: HTMLCanvasElement, preserve = false): BurnRenderer | null {
  const attrs: WebGLContextAttributes = {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: preserve,
  };
  const gl = (canvas.getContext('webgl2', attrs) ?? canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
  if (!gl) return null;

  let program: WebGLProgram;
  try {
    program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, burnFragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');
  } catch (err) {
    console.error(err);
    return null;
  }

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(program, 'aPos');

  const loc = (name: string) => gl.getUniformLocation(program, name);
  const L = {
    time: loc('uTime'),
    progress: loc('uProgress'),
    mode: loc('uMode'),
    aspect: loc('uAspect'),
    seed: loc('uSeed'),
    origin: loc('uOrigin'),
    char: loc('uChar'),
  };
  let aspect = 1;

  return {
    resize(width, height, pixelRatio) {
      canvas.width = Math.max(1, Math.round(width * pixelRatio));
      canvas.height = Math.max(1, Math.round(height * pixelRatio));
      aspect = width / Math.max(1, height);
    },
    render(u) {
      if (gl.isContextLost()) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(L.time, u.time);
      gl.uniform1f(L.progress, u.progress);
      gl.uniform1f(L.mode, u.mode);
      gl.uniform1f(L.aspect, aspect);
      gl.uniform1f(L.seed, u.seed);
      gl.uniform2f(L.origin, u.origin[0], u.origin[1]);
      gl.uniform3f(L.char, u.char[0], u.char[1], u.char[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() {
      if (gl.isContextLost()) return;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      if (gl.isContextLost()) return;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    },
  };
}
