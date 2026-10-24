import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BackSide, Group, Mesh, MeshBasicMaterial, MeshToonMaterial, PlaneGeometry, Quaternion,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { DiceSkin, DieValue, FaceContent, FaceStyle } from './types';
import { DIE_VALUES, decalTransform } from './faceBasis';
import { useFaceTextures } from './useFaceTextures';
import { getShadowTexture, getToonGradient } from './toon';
import { sampleRollPlan, type PoseOut, type RollPlan } from './rollPlan';

const PICKUP_TIME = 0.16;
const DECAL_OFFSET = 0.503;
const DECALS = Object.fromEntries(DIE_VALUES.map((v) => [v, decalTransform(v, DECAL_OFFSET)])) as Record<
  DieValue,
  ReturnType<typeof decalTransform>
>;

export interface DieHandle {
  play(plan: RollPlan, opts?: { delay?: number; pickup?: boolean }): Promise<void>;
}

export interface DieProps {
  /** Full skin (overrides everything). */
  skin?: DiceSkin;
  /** Body color, passed as parameter to skin. */
  bodyColor?: string;
  /** Face content type: 'pips' | 'text' | 'emoji' | 'image' | 'svg'. */
  faceType?: FaceContent['type'];
  /** Size of the die. */
  size: number;
  /** Initial position + orientation. */
  initial: { x: number; y: number; z: number; quaternion: Quaternion };
}

interface Anim {
  plan: RollPlan;
  t: number;
  delay: number;
  pickup: number;
  fromY: number;
  resolve: () => void;
}

// Helper: build a default skin from bodyColor + faceType
const buildSkin = (bodyColor?: string, faceType?: FaceContent['type']): DiceSkin => {
  const faceContent = faceType ?? 'pips';
  const faces = {} as Record<DieValue, FaceStyle>;

  for (const v of DIE_VALUES) {
    switch (faceContent) {
      case 'text':
        faces[v] = { content: { type: 'text', text: String(v) } };
        break;
      case 'emoji':
        faces[v] = { content: { type: 'emoji', emoji: '🎲' } }; // mesmo símbolo
        break;
      case 'image':
        faces[v] = { content: { type: 'image', src: 'dice.png', fit: 'cover' } };
        break;
      case 'svg':
        faces[v] = { content: { type: 'svg', svg: '<circle cx="12" cy="12" r="10"/>' } };
        break;
      case 'pips':
      default:
        // Pontos corretos por valor — adaptado ao dado
        faces[v] = { content: { type: 'pips' } };
        break;
    }
  }

  return {
    bodyColor: bodyColor ?? '#FFFBF2',
    outlineColor: '#2A2438',
    outlineWidth: 0.06,
    cornerRadius: 0.14,
    textureSize: 512,
    faceDefaults: {
      color: '#2A2438',
      fontFamily: '"Fredoka","Baloo 2","Arial Rounded MT Bold",system-ui,sans-serif',
      fontWeight: 700,
    },
    faces,
    fonts: [],
  };
};

export const Die = forwardRef<DieHandle, DieProps>(function Die({ skin, bodyColor, faceType, size, initial }, ref) {
  const invalidate = useThree((s) => s.invalidate);
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const anim = useRef<Anim | null>(null);
  const pose = useRef<PoseOut>({ x: 0, y: 0, z: 0, quaternion: new Quaternion(), lift: 0 }).current;

  // Resolve skin: use passed skin, or build from bodyColor + faceType
  const resolvedSkin = skin ?? buildSkin(bodyColor, faceType);

  const textures = useFaceTextures(resolvedSkin);
  const r = resolvedSkin.cornerRadius;
  const flat = 1 - 2 * r;

  const geometry = useMemo(() => new RoundedBoxGeometry(1, 1, 1, 6, r), [r]);
  const decalGeometry = useMemo(() => new PlaneGeometry(flat, flat), [flat]);
  const unitPlane = useMemo(() => new PlaneGeometry(1, 1), []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => decalGeometry.dispose(), [decalGeometry]);
  useEffect(() => () => unitPlane.dispose(), [unitPlane]);

  const bodyMat = useMemo(
    () => new MeshToonMaterial({ color: resolvedSkin.bodyColor, gradientMap: getToonGradient() }),
    [resolvedSkin.bodyColor],
  );
  const outlineMat = useMemo(
    () => new MeshBasicMaterial({ color: resolvedSkin.outlineColor, side: BackSide }),
    [resolvedSkin.outlineColor],
  );
  const shadowMat = useMemo(
    () => new MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false }),
    [],
  );
  const faceMats = useMemo(() => {
    if (!textures) return null;
    return Object.fromEntries(
      DIE_VALUES.map((v) => [
        v,
        new MeshToonMaterial({
          map: textures[v],
          gradientMap: getToonGradient(),
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      ]),
    ) as Record<DieValue, MeshToonMaterial>;
  }, [textures]);

  // Helper for index signature when using buildSkin
    return resolvedSkin[key] as DiceSkin[K];
  };
  useEffect(() => () => bodyMat.dispose(), [bodyMat]);
  useEffect(() => () => outlineMat.dispose(), [outlineMat]);
  useEffect(() => () => shadowMat.dispose(), [shadowMat]);
  useEffect(() => () => faceMats && Object.values(faceMats).forEach((m) => m.dispose()), [faceMats]);

  const setShadow = (lift: number, fade = 1) => {
    shadow.current?.scale.setScalar(size * 1.3 * (1 + lift * 0.18));
    shadowMat.opacity = (0.34 / (1 + lift * 0.9)) * fade;
  };

  useLayoutEffect(() => {
    root.current!.position.set(initial.x, 0, initial.z);
    body.current!.position.y = initial.y;
    body.current!.quaternion.copy(initial.quaternion);
    setShadow(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => anim.current?.resolve(), []);

  useImperativeHandle(
    ref,
    () => ({
      play(plan, { delay = 0, pickup = true } = {}) {
        return new Promise<void>((resolve) => {
          anim.current?.resolve();
          anim.current = {
            plan, t: 0, delay, resolve,
            pickup: pickup ? PICKUP_TIME : 0,
            fromY: body.current!.position.y,
          };
          invalidate();
        });
      },
    }),
    [invalidate],
  );

  useFrame((state, delta) => {
    const a = anim.current;
    if (!a) return;
    state.invalidate();
    a.t += Math.min(delta, 0.05);
    const rt = root.current!;
    const b = body.current!;

    if (a.t < a.pickup) {
      const e = (a.t / a.pickup) ** 2;
      b.scale.setScalar(1 - e);
      b.position.y = a.fromY + e * 0.6;
      setShadow(e * 0.6, 1 - e);
      return;
    }
    const tp = a.t - a.pickup - a.delay;
    if (tp < 0) {
      rt.visible = false;
      return;
    }
    rt.visible = true;
    b.scale.setScalar(1);

    const done = tp >= a.plan.duration;
    sampleRollPlan(a.plan, Math.min(tp, a.plan.duration), pose);
    rt.position.set(pose.x, 0, pose.z);
    b.position.y = pose.y;
    b.quaternion.copy(pose.quaternion);
    setShadow(pose.lift);

    if (done) {
      anim.current = null;
      a.resolve();
    }
  });

  return (
    <group ref={root}>
      <mesh
        ref={shadow}
        geometry={unitPlane}
        material={shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.02, 0]}
        renderOrder={1}
      />
      <group ref={body}>
        <group scale={size}>
          <mesh geometry={geometry} material={bodyMat} />
          <mesh geometry={geometry} material={outlineMat} scale={1 + resolvedSkin.outlineWidth} />
          {faceMats &&
            DIE_VALUES.map((v) => (
              <mesh
                key={v}
                geometry={decalGeometry}
                material={faceMats[v]}
                position={DECALS[v].position}
                quaternion={DECALS[v].quaternion}
              />
            ))}
        </group>
      </group>
    </group>
  );
});
