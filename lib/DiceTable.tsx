import { forwardRef, useLayoutEffect, type CSSProperties } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { MathUtils, type PerspectiveCamera } from 'three';
import { DiceScene, type DiceSceneHandle, type DiceSceneProps } from './DiceScene';

function CameraRig({ width, height, margin }: { width: number; height: number; margin: number }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const t = Math.tan(MathUtils.degToRad(camera.fov) / 2);
    const dist = Math.max(height / 2 / t, width / 2 / (t * aspect)) * margin;
    camera.up.set(0, 0, -1);
    camera.position.set(0, dist, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, size.width, size.height, width, height, margin, invalidate]);

  return null;
}

export interface DiceTableProps extends DiceSceneProps {
  className?: string;
  style?: CSSProperties;
  fov?: number;
  margin?: number;
  dpr?: number | [number, number];
}

export const DiceTable = forwardRef<DiceSceneHandle, DiceTableProps>(function DiceTable(
  { className, style, fov = 28, margin = 1.04, dpr = [1, 2], ...scene },
  ref,
) {
  const w = (scene.tableWidth ?? 9) + 0.5;
  const h = (scene.tableHeight ?? 5.6) + 0.5;
  return (
    <Canvas
      className={className}
      style={{ width: '100%', height: '100%', ...style }}
      flat
      dpr={dpr}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      camera={{ fov, near: 0.1, far: 100, position: [0, 12, 0] }}
    >
      <CameraRig width={w} height={h} margin={margin} />
      <DiceScene ref={ref} {...scene} />
    </Canvas>
  );
});
