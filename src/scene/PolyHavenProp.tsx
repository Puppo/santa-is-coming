import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { enhanceHolidayGltf } from '../assets/enhanceMaterials';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';

type GroupProps = ThreeElements['group'];

export function VictorianStreetLamp({
  lightIntensity = 2.6,
  lightColor = '#ffaf54',
  ...props
}: GroupProps & { lightIntensity?: number; lightColor?: string }) {
  const gltf = useGLTF(POLYHAVEN_PATHS.streetLamp);

  const cloned = useMemo(() => {
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
  }, [gltf.scene]);

  return (
    <group {...props}>
      <primitive object={cloned} scale={0.78} />
      {/* Warm tungsten bulb core inside glass lantern housing */}
      <mesh position={[0, 2.74, 0]}>
        <sphereGeometry args={[0.065, 10, 10]} />
        <meshBasicMaterial color={[2.8, 1.9, 0.85]} toneMapped={false} />
      </mesh>
      <pointLight
        position={[0, 2.72, 0]}
        color={lightColor}
        intensity={lightIntensity}
        distance={8.5}
        decay={1.9}
      />
    </group>
  );
}

export function PhotogrammetryBench(props: GroupProps) {
  const gltf = useGLTF(POLYHAVEN_PATHS.woodenBench);

  const cloned = useMemo(() => {
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.15 });
    return copy;
  }, [gltf.scene]);

  return (
    <group {...props}>
      <primitive object={cloned} scale={1.35} />
    </group>
  );
}

export function WarmWoodenLantern({
  lightIntensity = 1.8,
  ...props
}: GroupProps & { lightIntensity?: number }) {
  const gltf = useGLTF(POLYHAVEN_PATHS.woodenLantern);

  const cloned = useMemo(() => {
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.2 });
    return copy;
  }, [gltf.scene]);

  // wooden_lantern_01 bottom is at -0.155 in model space
  return (
    <group {...props}>
      <primitive object={cloned} scale={0.85} position={[0, 0.132, 0]} />
      <mesh position={[0, 0.21, 0]}>
        <sphereGeometry args={[0.032, 8, 8]} />
        <meshBasicMaterial color={[2.8, 1.85, 0.7]} toneMapped={false} />
      </mesh>
      {lightIntensity > 0 && (
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
