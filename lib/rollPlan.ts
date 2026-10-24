import { Matrix4, Quaternion, Vector3 } from 'three';
import type { DieValue } from './types';
import { restQuaternion } from './faceBasis';
import type { Rng } from './rng';

export type Range = [number, number];

export interface RollOptions {
  seed?: number;
  entry?: 'edge' | 'above';
  bounces?: Range;
  restitution?: Range;
  throwHeight?: Range;
  spinTurns?: Range;
  gravity?: number;
  settle?: number;
  stagger?: number;
  pickup?: boolean;
  face?: 'upright' | 'free';
  maxTilt?: number;
}
export type ResolvedRollOptions = Required<Omit<RollOptions, 'seed'>> & { seed?: number };

export const DEFAULT_ROLL_OPTIONS: ResolvedRollOptions = {
  entry: 'edge',
  bounces: [2, 4],
  restitution: [0.42, 0.58],
  throwHeight: [2.4, 3.8],
  spinTurns: [1.5, 3],
  gravity: 22,
  settle: 0.25,
  stagger: 0.08,
  pickup: true,
  face: 'upright',
  maxTilt: 0.5,
};

export const resolveRollOptions = (...layers: (RollOptions | undefined)[]): ResolvedRollOptions =>
  Object.assign({}, DEFAULT_ROLL_OPTIONS, ...layers.map((l) => l ?? {})) as ResolvedRollOptions;

export interface RollPlan {
  duration: number;
  startX: number;
  startZ: number;
  endX: number;
  endZ: number;
  throwHeight: number;
  fallTime: number;
  arcs: { t0: number; t1: number; peak: number }[];
  axis1: Vector3;
  theta1: number;
  axis2: Vector3;
  theta2: number;
  target: Quaternion;
  size: number;
  radius: number;
}

export interface PlanParams {
  value: DieValue;
  size: number;
  cornerRadius: number;
  start: { x: number; z: number };
  end: { x: number; z: number };
  options: ResolvedRollOptions;
  rng: Rng;
}

const TAU = Math.PI * 2;
const pick = (rng: Rng, [a, b]: Range) => a + (b - a) * rng();

export function assertDieValue(n: unknown): DieValue {
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 6) {
    throw new RangeError(`Valor de d6 inválido: ${String(n)} (esperado inteiro de 1 a 6)`);
  }
  return n as DieValue;
}

export function createRollPlan({ value, size, cornerRadius, start, end, options: o, rng }: PlanParams): RollPlan {
  const G = o.gravity;
  const throwHeight = pick(rng, o.throwHeight) * (o.entry === 'above' ? 1.5 : 1);
  const fallTime = Math.sqrt((2 * throwHeight) / G);

  const arcs: RollPlan['arcs'] = [];
  const bounces = Math.round(pick(rng, o.bounces));
  let v = G * fallTime;
  let t = fallTime;
  for (let i = 0; i < bounces; i++) {
    v *= pick(rng, o.restitution);
    const dur = (2 * v) / G;
    arcs.push({ t0: t, t1: t + dur, peak: (v * v) / (2 * G) });
    t += dur;
  }
  const duration = t + o.settle;

  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const ang = Math.atan2(-dx, dz) + (rng() * 2 - 1) * 0.7;
  const axis1 = new Vector3(Math.cos(ang), 0, Math.sin(ang));
  const theta1 = -TAU * pick(rng, o.spinTurns);
  const axis2 = new Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
  const theta2 = (rng() < 0.5 ? -1 : 1) * TAU * (0.6 + rng() * 1.2);

  const yaw = o.face === 'upright' ? (rng() * 2 - 1) * o.maxTilt : rng() * TAU;
  const target = restQuaternion(value, yaw, o.face === 'upright');

  return {
    duration, startX: start.x, startZ: start.z, endX: end.x, endZ: end.z,
    throwHeight, fallTime, arcs, axis1, theta1, axis2, theta2, target, size, radius: cornerRadius,
  };
}

export interface PoseOut {
  x: number;
  y: number;
  z: number;
  quaternion: Quaternion;
  lift: number;
}

const _q1 = new Quaternion();
const _q2 = new Quaternion();
const _m = new Matrix4();

export function sampleRollPlan(plan: RollPlan, time: number, out: PoseOut): PoseOut {
  const u = Math.min(Math.max(time / plan.duration, 0), 1);

  const ph = 1 - Math.pow(1 - u, 2.4);
  out.x = plan.startX + (plan.endX - plan.startX) * ph;
  out.z = plan.startZ + (plan.endZ - plan.startZ) * ph;

  _q1.setFromAxisAngle(plan.axis1, plan.theta1 * Math.pow(1 - u, 2));
  _q2.setFromAxisAngle(plan.axis2, plan.theta2 * Math.pow(1 - u, 3));
  out.quaternion.copy(_q1).multiply(_q2).multiply(plan.target);

  let lift = 0;
  const t = Math.max(time, 0);
  if (t < plan.fallTime) {
    const k = t / plan.fallTime;
    lift = plan.throwHeight * (1 - k * k);
  } else {
    for (const a of plan.arcs) {
      if (t < a.t1) {
        const k = (t - a.t0) / (a.t1 - a.t0);
        lift = 4 * a.peak * k * (1 - k);
        break;
      }
    }
  }

  _m.makeRotationFromQuaternion(out.quaternion);
  const e = _m.elements;
  const s = Math.abs(e[1]) + Math.abs(e[5]) + Math.abs(e[9]);
  const support = (0.5 - plan.radius) * s + plan.radius;
  out.y = support * plan.size + lift;
  out.lift = lift;
  return out;
}
