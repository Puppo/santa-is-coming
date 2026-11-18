import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import { enhanceHolidayGltf } from '../assets/enhanceMaterials';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';

type GroupProps = ThreeElements['group'];

function StreetLampMesh() {
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

  return <primitive object={cloned} scale={0.78} />;
}

export function VictorianStreetLamp({
  lightIntensity = 0,
  lightColor = '#ffaf54',
  enablePointLight = false,
  ...props
}: GroupProps & { lightIntensity?: number; lightColor?: string; enablePointLight?: boolean }) {
  return (
    <group {...props}>
      <Suspense fallback={null}>
        <StreetLampMesh />
      </Suspense>
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

function BenchMesh() {
  const gltf = useGLTF(POLYHAVEN_PATHS.woodenBench);

  const cloned = useMemo(() => {
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.15 });
    return copy;
  }, [gltf.scene]);

  return <primitive object={cloned} scale={1.35} />;
}

export function PhotogrammetryBench(props: GroupProps) {
  return (
    <group {...props}>
      <Suspense fallback={null}>
        <BenchMesh />
      </Suspense>
    </group>
  );
}

function WoodenLanternMesh() {
  const gltf = useGLTF(POLYHAVEN_PATHS.woodenLantern);

  const cloned = useMemo(() => {
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, { envMapIntensity: 1.2 });
    return copy;
  }, [gltf.scene]);

  return <primitive object={cloned} scale={0.85} position={[0, 0.132, 0]} />;
}

export function WarmWoodenLantern({
  lightIntensity = 0,
  enablePointLight = false,
  ...props
}: GroupProps & { lightIntensity?: number; enablePointLight?: boolean }) {
  // wooden_lantern_01 bottom is at -0.155 in model space
  return (
    <group {...props}>
      <Suspense fallback={null}>
        <WoodenLanternMesh />
      </Suspense>
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
