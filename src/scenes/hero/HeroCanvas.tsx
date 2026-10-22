import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { prefersReducedMotion } from '@/core/motion';
import { CAMERA_Z, FOV, FRAME, MEDIA, POSTER, POSTER_CENTER } from './frame';
import { useHero, type HeroPhase, type HeroTint } from './heroStore';
import {
  emberFragment,
  emberVertex,
  posterFragment,
  posterVertex,
  videoFragment,
  videoVertex,
} from './shaders';

const TINTS: Record<HeroTint, THREE.Color> = {
  neutral: new THREE.Color(1.0, 0.5, 0.2),
  art: new THREE.Color(1.0, 0.2, 0.1),
  design: new THREE.Color(1.0, 0.72, 0.3),
};

const EMBER_LEVEL: Record<HeroPhase, number> = {
  loading: 0,
  intro: 2.0,
  idle: 1.05,
  handoff: 1.4,
  burning: 2.6,
  ended: 0,
};

const { damp } = THREE.MathUtils;
/** Catches quickly, slows as it reaches the top. */
const ignite = (k: number) => 1 - Math.pow(1 - k, 1.7);

function Poster() {
  const texture = useLoader(THREE.TextureLoader, MEDIA.poster);
  const gl = useThree((s) => s.gl);
  const reduced = useMemo(prefersReducedMotion, []);

  const material = useMemo(() => {
    // Sampled raw (no colour conversion) so the shader at rest returns the file's exact pixels.
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.needsUpdate = true;
    return new THREE.ShaderMaterial({
      vertexShader: posterVertex,
      fragmentShader: posterFragment,
      uniforms: {
        uMap: { value: texture },
        uTime: { value: 0 },
        uLight: { value: 0 },
        uReveal: { value: 0 },
        uSeed: { value: Math.random() * 10 },
        uFlicker: { value: 1 },
        uTint: { value: TINTS.neutral.clone() },
        uFold: { value: 0 },
        uWave: { value: 0 },
      },
    });
  }, [texture, gl]);
  useEffect(() => () => material.dispose(), [material]);

  const group = useRef<THREE.Group>(null!);
  const introStart = useRef<number | null>(null);

  useFrame((state, dt) => {
    const s = useHero.getState();
    const u = material.uniforms;
    const t = state.clock.elapsedTime;
    u.uTime.value = t;
    // Firelight flicker: a few incommensurate sines read as irregular, and cost nothing per pixel.
    u.uFlicker.value =
      0.9 + 0.06 * Math.sin(t * 2.1) * Math.sin(t * 3.7 + 1.3) + 0.04 * Math.sin(t * 11.3 + Math.sin(t * 5.1));
    if (!s.ready) useHero.setState({ ready: true });

    if (s.phase === 'loading') {
      u.uReveal.value = 0;
      introStart.current = null;
    } else if (s.phase === 'intro') {
      introStart.current ??= t;
      const k = reduced ? 1 : Math.min(1, (t - introStart.current) / s.introSeconds);
      u.uReveal.value = ignite(k);
      if (k >= 1) s.setPhase('idle');
    } else {
      u.uReveal.value = 1;
    }

    const g = group.current;
    const atRest = s.phase === 'handoff' || s.phase === 'burning' || s.phase === 'ended';
    if (s.snap) {
      g.rotation.set(0, 0, 0);
      g.position.z = 0;
      u.uLight.value = 0;
      u.uFold.value = 0;
      u.uWave.value = 0;
    } else {
      const lambda = atRest ? 9 : 2.4;
      const still = atRest || reduced;
      g.rotation.x = damp(g.rotation.x, still ? 0 : -s.pointer.y * 0.075, lambda, dt);
      g.rotation.y = damp(g.rotation.y, still ? 0 : s.pointer.x * 0.1, lambda, dt);
      g.position.z = damp(g.position.z, still ? 0 : 16 + Math.sin(t * 0.6) * 6, lambda, dt);
      const lightOn = s.phase === 'intro' || s.phase === 'idle';
      u.uLight.value = damp(u.uLight.value, lightOn ? 1 : 0, atRest ? 8 : 1.4, dt);
      u.uFold.value = damp(u.uFold.value, atRest ? 0 : 1, lambda, dt);
      u.uWave.value = damp(u.uWave.value, still ? 0 : 1, lambda, dt);
    }
    (u.uTint.value as THREE.Color).lerp(TINTS[s.tint], 1 - Math.exp(-4 * dt));
    g.visible = !s.showVideo;
  });

  return (
    <group ref={group} position={[POSTER_CENTER.x, POSTER_CENTER.y, 0]}>
      <mesh material={material}>
        <planeGeometry args={[POSTER.w, POSTER.h, 96, 64]} />
      </mesh>
    </group>
  );
}

function VideoPlane({ video }: { video: HTMLVideoElement }) {
  const material = useMemo(() => {
    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.NoColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return new THREE.ShaderMaterial({
      vertexShader: videoVertex,
      fragmentShader: videoFragment,
      uniforms: { uMap: { value: texture }, uOpacity: { value: 1 } },
      depthWrite: false,
    });
  }, [video]);
  useEffect(
    () => () => {
      (material.uniforms.uMap.value as THREE.Texture).dispose();
      material.dispose();
    },
    [material],
  );

  const mesh = useRef<THREE.Mesh>(null!);
  useFrame(() => {
    mesh.current.visible = useHero.getState().showVideo;
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={-1} visible={false}>
      <planeGeometry args={[FRAME.w, FRAME.h]} />
    </mesh>
  );
}

function Embers({ count }: { count: number }) {
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: emberVertex,
        fragmentShader: emberFragment,
        uniforms: {
          uTime: { value: 0 },
          uFlow: { value: 0 },
          uSpread: { value: 1 },
          uPixel: { value: 1 },
          uIntensity: { value: 0 },
          uTint: { value: TINTS.neutral.clone() },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const rate = useRef(1);
  useFrame((state, dt) => {
    const s = useHero.getState();
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    rate.current = damp(rate.current, s.phase === 'burning' ? 1.8 : 1, 1.6, dt);
    u.uFlow.value += dt * rate.current;
    u.uPixel.value = gl.getPixelRatio() * (size.width / FRAME.w);
    u.uIntensity.value = damp(u.uIntensity.value, EMBER_LEVEL[s.phase], s.phase === 'intro' ? 3 : 1.6, dt);
    u.uSpread.value = damp(u.uSpread.value, s.phase === 'burning' ? 1.15 : 1, 1, dt);
    (u.uTint.value as THREE.Color).lerp(TINTS[s.tint], 1 - Math.exp(-3 * dt));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

export interface HeroCanvasProps {
  video: HTMLVideoElement | null;
  compact?: boolean;
}

/**
 * The Home stage in WebGL. The canvas must be sized to the 16:9 video frame:
 * the camera maps world units 1:1 onto frame pixels at z = 0.
 */
export default function HeroCanvas({ video, compact = false }: HeroCanvasProps) {
  const dpr = useMemo(() => Math.min(window.devicePixelRatio || 1, 1.75), []);
  return (
    <Canvas
      flat
      dpr={[1, dpr]}
      camera={{ fov: FOV, near: 50, far: 6000, position: [0, 0, CAMERA_Z] }}
      gl={{ antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 1)}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <Poster />
      </Suspense>
      {video && <VideoPlane video={video} />}
      <Embers count={compact ? 150 : 280} />
    </Canvas>
  );
}
