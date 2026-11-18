import type { ThreeElements } from '@react-three/fiber';
import { useMemo } from 'react';
import { useAsyncGltf } from '../assets/asyncAssets';
import { type EnhanceOptions, enhanceHolidayGltf } from '../assets/enhanceMaterials';
import { MODEL_PATHS, type ModelKey } from '../assets/modelRegistry';

type GroupProps = ThreeElements['group'];

interface KenneyModelProps extends GroupProps {
  model: ModelKey;
  enhance?: EnhanceOptions;
}

export function KenneyModel({ model, enhance, ...groupProps }: KenneyModelProps) {
  const gltf = useAsyncGltf(MODEL_PATHS[model]);

  const cloned = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    enhanceHolidayGltf(copy, enhance);
    return copy;
  }, [gltf, enhance]);

  if (!cloned) return null;

  return (
    <group {...groupProps}>
      <primitive object={cloned} />
    </group>
  );
}
