import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { Artwork, MediaAsset } from '@shared/schema';
import { prefersReducedMotion } from '@/core/motion';
import { useRevealed } from '@/core/transition';
import styles from './ArtSphere.module.css';

export interface ArtSphereProps {
  artworks: Artwork[];
  /** Called with the artwork slug when a card is clicked or activated with the keyboard. */
  onOpen: (slug: string) => void;
  className?: string;
}

const RADIUS = 2.55;
const CARD_HEIGHT = 0.86;
const MIN_CARDS = 34;
const FOV = 34;
const AUTO_SPIN = 0.07;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const cardVertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Raw sRGB sampling and output, like the hero, so the paintings keep their exact colour.
const cardFragment = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform float uShade;
uniform float uLift;
uniform float uOpacity;
uniform float uLoaded;
varying vec2 vUv;
void main() {
  vec3 c = mix(vec3(0.06, 0.03, 0.025), texture2D(uMap, vUv).rgb, uLoaded);
  float edge = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
  c *= mix(0.6, 1.0, smoothstep(0.0, 0.03, edge));
  c *= uShade * (1.0 + uLift * 0.22);
  gl_FragColor = vec4(c * uOpacity, uOpacity);
}
`;

function smallest(media: MediaAsset, min = 480) {
  return (media.webp.find((v) => v.w >= min) ?? media.webp[media.webp.length - 1]).url;
}

interface Card {
  key: string;
  art: Artwork;
  home: THREE.Vector3;
  from: THREE.Vector3;
  width: number;
  height: number;
  tilt: number;
  delay: number;
}

/**
 * With fewer paintings than cards, paintings repeat. Each card takes the
 * least-used painting whose existing copies are farthest away, so repeats
 * land on opposite sides of the sphere instead of in one column.
 */
function assignArt(points: THREE.Vector3[], artworks: Artwork[]): Artwork[] {
  const uses = new Array(artworks.length).fill(0);
  const placed: THREE.Vector3[][] = artworks.map(() => []);
  return points.map((p) => {
    const fewest = Math.min(...uses);
    let best = 0;
    let bestDistance = -1;
    artworks.forEach((_, k) => {
      if (uses[k] !== fewest) return;
      const d = placed[k].length ? Math.min(...placed[k].map((q) => q.distanceTo(p))) : Infinity;
      if (d > bestDistance) {
        bestDistance = d;
        best = k;
      }
    });
    uses[best]++;
    placed[best].push(p);
    return artworks[best];
  });
}

function buildCards(artworks: Artwork[]): Card[] {
  if (artworks.length === 0) return [];
  const count = Math.max(MIN_CARDS, artworks.length);
  const rand = (i: number, k: number) => {
    const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const points = Array.from({ length: count }, (_, i) => {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = GOLDEN * i;
    return new THREE.Vector3(Math.cos(theta) * r, y * 0.92, Math.sin(theta) * r).multiplyScalar(RADIUS);
  });
  const arts = assignArt(points, artworks);
  return points.map((home, i) => {
    const art = arts[i];
    const aspect = art.image.width / art.image.height;
    const scale = 0.82 + rand(i, 1) * 0.36;
    const height = CARD_HEIGHT * scale * (aspect > 1.4 ? 0.8 : 1);
    return {
      key: `${art.id}-${i}`,
      art,
      home,
      from: home.clone().multiplyScalar(2.2 + rand(i, 2) * 1.6).add(new THREE.Vector3(0, -1.5 - rand(i, 3) * 2, 0)),
      width: height * aspect,
      height,
      tilt: (rand(i, 4) - 0.5) * 0.09,
      delay: rand(i, 5) * 0.7,
    };
  });
}

const ease = (k: number) => 1 - Math.pow(1 - k, 4);

interface SceneProps {
  cards: Card[];
  hovered: string | null;
  setHovered: (key: string | null) => void;
  onOpen: (slug: string) => void;
  drag: React.RefObject<DragState>;
  revealed: boolean;
}

interface DragState {
  active: boolean;
  lastX: number;
  lastY: number;
  /** Pointer movement not yet applied to the rotation (px). */
  dx: number;
  dy: number;
  /** Angular velocity in rad/s, kept for inertia after release. */
  vx: number;
  vy: number;
  moved: number;
}

const YAW_PER_PX = 0.0065;
const PITCH_PER_PX = 0.0065;
const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);

function Scene({ cards, hovered, setHovered, onOpen, drag, revealed }: SceneProps) {
  const group = useRef<THREE.Group>(null!);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const camera = useThree((s) => s.camera as THREE.PerspectiveCamera);
  const size = useThree((s) => s.size);
  const reduced = useMemo(prefersReducedMotion, []);
  const spinQ = useMemo(() => new THREE.Quaternion(), []);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    group.current.rotation.set(-0.1, 0.4, 0);
  }, []);

  // Fit the sphere to the box in both directions.
  useEffect(() => {
    const half = (FOV * Math.PI) / 360;
    const halfH = Math.atan(Math.tan(half) * (size.width / size.height));
    const reach = RADIUS + CARD_HEIGHT * 0.45;
    camera.position.set(0, 0, Math.max(reach / Math.tan(half), reach / Math.tan(halfH)));
    camera.updateProjectionMatrix();
  }, [camera, size]);

  const textures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const map = new Map<string, THREE.Texture>();
    for (const c of cards) {
      if (map.has(c.art.id)) continue;
      const tex = loader.load(smallest(c.art.image), (t) => {
        t.needsUpdate = true;
        for (const m of meshes.current) {
          const mat = m?.material as THREE.ShaderMaterial | undefined;
          if (mat?.uniforms.uMap.value === t) mat.uniforms.uLoaded.value = 1;
        }
      });
      tex.colorSpace = THREE.NoColorSpace;
      tex.anisotropy = 4;
      map.set(c.art.id, tex);
    }
    return map;
  }, [cards]);

  const materials = useMemo(
    () =>
      cards.map((c) => {
        const tex = textures.get(c.art.id)!;
        return new THREE.ShaderMaterial({
          vertexShader: cardVertex,
          fragmentShader: cardFragment,
          uniforms: {
            uMap: { value: tex },
            uShade: { value: 1 },
            uLift: { value: 0 },
            uOpacity: { value: 0 },
            uLoaded: { value: tex.image ? 1 : 0 },
          },
          transparent: true,
          premultipliedAlpha: true,
        });
      }),
    [cards, textures],
  );

  useEffect(
    () => () => {
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
    [materials, textures],
  );

  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const tmpV = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    if (revealed && startedAt.current === null) startedAt.current = t;
    const since = startedAt.current === null ? -1 : t - startedAt.current;

    // Rotation is a quaternion turned about the screen's axes, so it spins freely through a full 360 both ways.
    // Pointer movement is eased in (not applied raw) so the sphere glides instead of stepping with each event.
    const d = drag.current!;
    const follow = 1 - Math.exp(-dt * 16);
    const ax = d.dx * follow;
    const ay = d.dy * follow;
    d.dx -= ax;
    d.dy -= ay;
    let yaw = ax * YAW_PER_PX;
    let pitch = ay * PITCH_PER_PX;
    if (d.active) {
      if (dt > 0) {
        d.vx = THREE.MathUtils.lerp(d.vx, yaw / dt, 0.2);
        d.vy = THREE.MathUtils.lerp(d.vy, pitch / dt, 0.2);
      }
    } else {
      d.vx *= Math.exp(-1.8 * dt);
      d.vy *= Math.exp(-1.8 * dt);
      yaw += (d.vx + (reduced ? 0 : AUTO_SPIN)) * dt;
      pitch += d.vy * dt;
    }
    group.current.quaternion
      .premultiply(spinQ.setFromAxisAngle(AXIS_X, pitch))
      .premultiply(spinQ.setFromAxisAngle(AXIS_Y, yaw))
      .normalize();
    group.current.updateMatrixWorld();

    // Cards face the camera: undo the group's rotation, then match the camera.
    group.current.getWorldQuaternion(tmpQ).invert().multiply(camera.quaternion);

    cards.forEach((c, i) => {
      const mesh = meshes.current[i];
      if (!mesh) return;
      const u = materials[i].uniforms;
      const k = reduced ? 1 : since < 0 ? 0 : Math.min(1, Math.max(0, (since - c.delay) / 1.5));
      mesh.position.lerpVectors(c.from, c.home, ease(k));
      mesh.quaternion.copy(tmpQ);
      mesh.rotateZ(c.tilt);

      mesh.getWorldPosition(tmpV);
      const depth = THREE.MathUtils.smoothstep(tmpV.z, -RADIUS, RADIUS);
      const lifted = hovered === c.key;
      u.uLift.value = THREE.MathUtils.damp(u.uLift.value, lifted ? 1 : 0, 8, dt);
      const dim = hovered && !lifted ? 0.8 : 1;
      u.uShade.value = THREE.MathUtils.damp(u.uShade.value, (0.22 + 0.78 * depth) * dim, 6, dt);
      u.uOpacity.value = THREE.MathUtils.damp(u.uOpacity.value, ease(k), 10, dt);
      const s = 1 + u.uLift.value * 0.16;
      mesh.scale.set(c.width * s, c.height * s, 1);
      mesh.renderOrder = Math.round(depth * 1000);
    });
  });

  const over = (key: string) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!drag.current!.active) setHovered(key);
  };
  const out = (key: string) => () => {
    if (hovered === key) setHovered(null);
  };
  const click = (slug: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (drag.current!.moved < 6) onOpen(slug);
  };

  return (
    <group ref={group}>
      {cards.map((c, i) => (
        <mesh
          key={c.key}
          ref={(m) => {
            meshes.current[i] = m;
          }}
          material={materials[i]}
          onPointerOver={over(c.key)}
          onPointerOut={out(c.key)}
          onClick={click(c.art.slug)}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  );
}

/** A slowly turning sphere of artwork cards (Gallery). Drag to spin, click a card to open it. */
export default function ArtSphere({ artworks, onOpen, className }: ArtSphereProps) {
  const cards = useMemo(() => buildCards(artworks), [artworks]);
  const [hovered, setHovered] = useState<string | null>(null);
  const revealed = useRevealed();
  const drag = useRef<DragState>({ active: false, lastX: 0, lastY: 0, dx: 0, dy: 0, vx: 0, vy: 0, moved: 0 });
  const hoveredArt = cards.find((c) => c.key === hovered)?.art;

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    Object.assign(drag.current, { active: true, lastX: e.clientX, lastY: e.clientY, dx: 0, dy: 0, vx: 0, vy: 0, moved: 0 });
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.lastX;
    const dy = e.clientY - d.lastY;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    d.dx += dx;
    d.dy += dy;
    d.moved += Math.abs(dx) + Math.abs(dy);
    if (d.moved > 6 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setHovered(null);
    }
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hovered]);

  const unique = useMemo(() => artworks.filter((a, i) => artworks.findIndex((b) => b.id === a.id) === i), [artworks]);

  return (
    <div
      className={`${styles.root} ${className ?? ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <Canvas
        flat
        dpr={[1, Math.min(window.devicePixelRatio || 1, 2)]}
        camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, 10] }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        onPointerMissed={() => setHovered(null)}
        aria-hidden="true"
      >
        <Scene
          cards={cards}
          hovered={hovered}
          setHovered={setHovered}
          onOpen={onOpen}
          drag={drag}
          revealed={revealed}
        />
      </Canvas>
      <p className={styles.caption} aria-hidden="true" data-visible={!!hoveredArt}>
        {hoveredArt && (
          <>
            <strong>{hoveredArt.title}</strong>
            {hoveredArt.medium && <em>{hoveredArt.medium}</em>}
          </>
        )}
      </p>
      {/* Keyboard route to the same artworks. Each button is out of sight until it has focus, then it
          appears over the sphere and lights its card. (Not .visually-hidden: that clips the focus ring.) */}
      <ul className={styles.list} aria-label="Artworks">
        {unique.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a.slug)}
              onFocus={() => setHovered(cards.find((c) => c.art.id === a.id)?.key ?? null)}
              onBlur={() => setHovered(null)}
            >
              {a.title}
              {a.medium ? `, ${a.medium}` : ''}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
