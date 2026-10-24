import { forwardRef, useImperativeHandle, useMemo, useRef, type ReactNode } from 'react';
import type { Quaternion } from 'three';
import type { DiceSkin, DieValue } from './types';
import { Die, type DieHandle } from './Die';
import { DEFAULT_SKIN } from './skins';
import { restQuaternion } from './faceBasis';
import { makeRng, randomSeed } from './rng';
import { sampleLandings, sampleStart, type Point } from './layout';
import { assertDieValue, createRollPlan, resolveRollOptions, type RollOptions } from './rollPlan';

export interface DiceDef {
  id: string;
  skin?: DiceSkin;
}
export type RollInput = number[] | Record<string, number>;

export interface DiceSceneProps {
  dice: DiceDef[];
  skin?: DiceSkin;
  tableWidth?: number;
  tableHeight?: number;
  dieSize?: number;
  initialValues?: RollInput;
  showTable?: boolean;
  tableColor?: string;
  tableBorderColor?: string;
  rollDefaults?: RollOptions;
  children?: ReactNode;
}

export interface DiceSceneHandle {
  roll(values: RollInput, options?: RollOptions): Promise<Record<string, DieValue>>;
}

const pickValue = (input: RollInput | undefined, id: string, i: number): number | undefined =>
  !input ? undefined : Array.isArray(input) ? input[i] : input[id];

export const DiceScene = forwardRef<DiceSceneHandle, DiceSceneProps>(function DiceScene(
  {
    dice, skin = DEFAULT_SKIN, tableWidth = 9, tableHeight = 5.6, dieSize = 1.3, initialValues,
    showTable = true, tableColor = '#3FA796', tableBorderColor = '#2A2438', rollDefaults, children,
  },
  ref,
) {
  const dieRefs = useRef(new Map<string, DieHandle>());
  const rest = useRef(new Map<string, Point>());

  const halfW = Math.max(0, tableWidth / 2 - dieSize * 0.9);
  const halfH = Math.max(0, tableHeight / 2 - dieSize * 0.9);
  const skinOf = (d: DiceDef) => d.skin ?? skin;

  const ids = dice.map((d) => d.id).join('|');
  const initial = useMemo(() => {
    const rng = makeRng(randomSeed());
    const pts = sampleLandings(dice.length, halfW, halfH, dieSize * 1.5, [], rng);
    return dice.map((d, i) => {
      const value = assertDieValue(pickValue(initialValues, d.id, i) ?? 1);
      const q: Quaternion = restQuaternion(value, (rng() * 2 - 1) * 0.5, true);
      return { id: d.id, x: pts[i].x, z: pts[i].z, y: dieSize * 0.5, quaternion: q };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, halfW, halfH, dieSize]);

  useImperativeHandle(
    ref,
    () => ({
      async roll(input, options) {
        const o = resolveRollOptions(rollDefaults, options);
        const rng = makeRng(o.seed ?? randomSeed());

        const entries = dice.map((d, i) => ({ d, value: pickValue(input, d.id, i) }));
        const rolling = entries.filter((e) => e.value != null);
        const fixed = entries
          .filter((e) => e.value == null)
          .map((e) => rest.current.get(e.d.id) ?? initial.find((p) => p.id === e.d.id))
          .filter((p): p is Point => !!p);

        const landings = sampleLandings(rolling.length, halfW, halfH, dieSize * 1.5, fixed, rng);
        const result: Record<string, DieValue> = {};

        await Promise.all(
          rolling.map((e, k) => {
            const value = assertDieValue(e.value);
            result[e.d.id] = value;
            const handle = dieRefs.current.get(e.d.id);
            if (!handle) return Promise.resolve();
            const end = landings[k];
            const start = sampleStart(end, tableWidth / 2, tableHeight / 2, dieSize, o.entry, rng);
            const plan = createRollPlan({
              value, size: dieSize, cornerRadius: skinOf(e.d).cornerRadius, start, end, options: o, rng,
            });
            rest.current.set(e.d.id, end);
            return handle.play(plan, { delay: k * o.stagger + rng() * o.stagger, pickup: o.pickup });
          }),
        );
        return result;
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dice, skin, tableWidth, tableHeight, dieSize, rollDefaults, initial, halfW, halfH],
  );

  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[-4, 10, 5]} intensity={1.3} />

      {showTable && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[tableWidth + 0.5, tableHeight + 0.5]} />
            <meshBasicMaterial color={tableBorderColor} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[tableWidth, tableHeight]} />
            <meshBasicMaterial color={tableColor} />
          </mesh>
        </>
      )}

      {children}

      {dice.map((d) => {
        const init = initial.find((p) => p.id === d.id);
        if (!init) return null;
        return (
          <Die
            key={d.id}
            ref={(h) => {
              if (h) dieRefs.current.set(d.id, h);
              else dieRefs.current.delete(d.id);
            }}
            skin={skinOf(d)}
            size={dieSize}
            initial={init}
          />
        );
      })}
    </>
  );
});
