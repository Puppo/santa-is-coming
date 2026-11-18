import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useAsyncGltf } from '../assets/asyncAssets';
import { enhanceHolidayGltf } from '../assets/enhanceMaterials';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';

type GroupProps = ThreeElements['group'];

export function VictorianStreetLamp({
  lightIntensity = 0,
  lightColor = '#ffaf54',
  enablePointLight = false,
  ...props
}: GroupProps & { lightIntensity?: number; lightColor?: string; enablePointLight?: boolean }) {
  const gltf = useAsyncGltf(POLYHAVEN_PATHS.streetLamp);

  const cloned = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.3 });
    copy.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mat = obj.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        if (mat.name.toLowerCase().includes('glass') || mat.transparent || mat.opacity < 0.95) {
          mat.emissive = new THREE.Color('#ffbd66');
          mat.emissiveIntensity = 1.6;
        }
      }
    });
    return copy;
  }, [gltf]);

  return (
    <group {...props}>
      {cloned ? (
        <primitive object={cloned} scale={0.78} />
      ) : (
        <mesh position={[0, 1.34, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.075, 2.68, 10]} />
          <meshStandardMaterial color="#1d2228" roughness={0.6} metalness={0.65} />
        </mesh>
      )}
      {/* Warm HDR tungsten bulb core & translucent warm halo (avoids per-pixel pointLight overhead) */}
      <mesh position={[0, 2.74, 0]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial color={[3.1, 2.05, 0.9]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.74, 0]}>
        <sphereGeometry args={[0.24, 10, 10]} />
        <meshBasicMaterial color={lightColor} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      {enablePointLight && lightIntensity > 0 && (
        <pointLight
          position={[0, 2.72, 0]}
          color={lightColor}
          intensity={lightIntensity}
          distance={8.5}
          decay={1.9}
        />
      )}
    </group>
  );
}

export function PhotogrammetryBench(props: GroupProps) {
  const gltf = useAsyncGltf(POLYHAVEN_PATHS.woodenBench);

  const cloned = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.15 });
    return copy;
  }, [gltf]);

  if (!cloned) return null;

  return (
    <group {...props}>
      <primitive object={cloned} scale={1.35} />
    </group>
  );
}

export function WarmWoodenLantern({
  lightIntensity = 0,
  enablePointLight = false,
  ...props
}: GroupProps & { lightIntensity?: number; enablePointLight?: boolean }) {
  const gltf = useAsyncGltf(POLYHAVEN_PATHS.woodenLantern);

  const cloned = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.2 });
    return copy;
  }, [gltf]);

  // wooden_lantern_01 bottom is at -0.155 in model space
  return (
    <group {...props}>
      {cloned && <primitive object={cloned} scale={0.85} position={[0, 0.132, 0]} />}
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color={[3.1, 2.0, 0.78]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshBasicMaterial color="#ffb155" transparent opacity={0.16} depthWrite={false} />
      </mesh>
      {enablePointLight && lightIntensity > 0 && (
        <pointLight
          position={[0, 0.25, 0]}
          color="#ffb155"
          intensity={lightIntensity}
          distance={4.5}
          decay={2}
        />
      )}
    </group>
  );
}
