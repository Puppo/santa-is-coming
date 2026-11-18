import { useGLTF } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import { type EnhanceOptions, enhanceHolidayGltf } from '../assets/enhanceMaterials';
import { MODEL_PATHS, type ModelKey } from '../assets/modelRegistry';

type GroupProps = ThreeElements['group'];

interface KenneyModelProps extends GroupProps {
  model: ModelKey;
  enhance?: EnhanceOptions;
}

export function KenneyModel({ model, enhance, ...groupProps }: KenneyModelProps) {
  const path = MODEL_PATHS[model];
  const gltf = useGLTF(path);

  const cloned = useMemo(() => {
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, enhance);
    return copy;
  }, [gltf.scene, enhance]);

  return (
    <group {...groupProps}>
      <primitive object={cloned} />
    </group>
  );
}
