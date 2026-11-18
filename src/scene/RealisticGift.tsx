import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { getFabricNormalMap } from '../assets/proceduralTextures';

interface RealisticGiftProps extends Omit<ThreeElements['group'], 'scale'> {
  size?: [number, number, number];
  boxColor?: string;
  ribbonColor?: string;
  scale?: number;
}

export function RealisticGift({
  size = [0.42, 0.32, 0.42],
  boxColor = '#9e1c2b',
  ribbonColor = '#e6b84c',
  scale = 1,
  ...groupProps
}: RealisticGiftProps) {
  const [w, h, d] = size;
  const fabricNormal = useMemo(() => getFabricNormalMap(), []);

  return (
    <group {...groupProps} scale={scale}>
      {/* Main Wrapped Box */}
      <mesh position={[0, h * 0.46, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h * 0.92, d]} />
        <meshStandardMaterial
          color={boxColor}
          normalMap={fabricNormal}
          normalScale={new THREE.Vector2(0.18, 0.18)}
          roughness={0.56}
          metalness={0.08}
        />
      </mesh>

      {/* Overhanging Box Lid */}
      <mesh position={[0, h * 0.88, 0]} castShadow receiveShadow>
        <boxGeometry args={[w * 1.05, h * 0.18, d * 1.05]} />
        <meshStandardMaterial
          color={boxColor}
          normalMap={fabricNormal}
          normalScale={new THREE.Vector2(0.18, 0.18)}
          roughness={0.52}
          metalness={0.08}
        />
      </mesh>

      {/* Crossed Satin Ribbons */}
      <mesh position={[0, h * 0.49, 0]} castShadow>
        <boxGeometry args={[w * 1.07, h * 0.98, d * 0.16]} />
        <meshPhysicalMaterial
          color={ribbonColor}
          roughness={0.28}
          metalness={0.45}
          clearcoat={0.65}
        />
      </mesh>
      <mesh position={[0, h * 0.49, 0]} castShadow>
        <boxGeometry args={[w * 0.16, h * 0.98, d * 1.07]} />
        <meshPhysicalMaterial
          color={ribbonColor}
          roughness={0.28}
          metalness={0.45}
          clearcoat={0.65}
        />
      </mesh>

      {/* Sculpted 3D Bow Loops */}
      <group position={[0, h * 0.99, 0]}>
        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang) => (
          <mesh
            key={`loop-${ang}`}
            position={[Math.cos(ang) * w * 0.14, 0.04, Math.sin(ang) * d * 0.14]}
            rotation={[0.35, ang, 0]}
            castShadow
          >
            <torusGeometry args={[w * 0.13, w * 0.032, 6, 12]} />
            <meshPhysicalMaterial
              color={ribbonColor}
              roughness={0.26}
              metalness={0.48}
              clearcoat={0.7}
            />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0]}>
          <sphereGeometry args={[w * 0.065, 8, 8]} />
          <meshPhysicalMaterial color={ribbonColor} roughness={0.26} metalness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
