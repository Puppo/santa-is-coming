import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useVillage } from '../state/villageStore';

interface ChimneySmokeProps {
  position: [number, number, number];
  count?: number;
  boosted?: boolean;
  color?: string;
  spread?: number;
  riseHeight?: number;
}

export function ChimneySmoke({
  position,
  count = 14,
  boosted = false,
  color = '#edf4ff',
  spread = 0.45,
  riseHeight = 2.8,
}: ChimneySmokeProps) {
  const { motionPaused } = useVillage();
  const instRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const inst = instRef.current;
    if (!inst) return;
    const speed = boosted ? 1.8 : 0.72;
    const t = motionPaused ? 1.4 : state.clock.elapsedTime * speed;

    for (let i = 0; i < count; i++) {
      const life = (t * 0.38 + i / count) % 1;
      const driftX = Math.sin(life * 5 + i) * spread * life;
      const driftZ = Math.cos(life * 4 + i * 1.3) * spread * 0.7 * life;
      const y = life * riseHeight;
      const puffScale = Math.sin(life * Math.PI) * (0.14 + life * 0.24) * (boosted ? 1.25 : 1);

      dummy.position.set(driftX, y, driftZ);
      dummy.scale.setScalar(Math.max(0.001, puffScale));
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={position}>
      <instancedMesh ref={instRef} args={[undefined, undefined, count]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.48}
          roughness={1}
          depthWrite={false}
        />
      </instancedMesh>
    </group>
  );
}
