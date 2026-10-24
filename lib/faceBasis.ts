import { Matrix4, Quaternion, Vector3 } from 'three';
import type { DieValue } from './types';

export const DIE_VALUES: DieValue[] = [1, 2, 3, 4, 5, 6];

const v = (x: number, y: number, z: number) => new Vector3(x, y, z);

export const FACE_BASIS: Record<DieValue, { normal: Vector3; up: Vector3 }> = {
  1: { normal: v(0, 1, 0), up: v(0, 0, -1) },
  6: { normal: v(0, -1, 0), up: v(0, 0, 1) },
  2: { normal: v(0, 0, 1), up: v(0, 1, 0) },
  5: { normal: v(0, 0, -1), up: v(0, 1, 0) },
  3: { normal: v(1, 0, 0), up: v(0, 1, 0) },
  4: { normal: v(-1, 0, 0), up: v(0, 1, 0) },
};

const Y = v(0, 1, 0);
const SCREEN_UP = v(0, 0, -1);

export function decalTransform(value: DieValue, offset: number) {
  const { normal, up } = FACE_BASIS[value];
  const right = new Vector3().crossVectors(up, normal);
  const q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, up, normal));
  return { position: normal.clone().multiplyScalar(offset), quaternion: q };
}

export function restQuaternion(value: DieValue, yaw: number, upright: boolean): Quaternion {
  const { normal, up } = FACE_BASIS[value];
  const q0 = new Quaternion().setFromUnitVectors(normal, Y);
  let total = yaw;
  if (upright) {
    const u = up.clone().applyQuaternion(q0);
    u.y = 0;
    u.normalize();
    const cross = new Vector3().crossVectors(u, SCREEN_UP);
    total += Math.atan2(cross.y, u.dot(SCREEN_UP));
  }
  return new Quaternion().setFromAxisAngle(Y, total).multiply(q0);
}
