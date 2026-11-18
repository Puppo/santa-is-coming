import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useVillage } from '../state/villageStore';

export function PostEffects({ enabled }: { enabled: boolean }) {
  const { partyMode } = useVillage();
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        luminanceThreshold={1.06}
        luminanceSmoothing={0.28}
        intensity={partyMode ? 0.85 : 0.58}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.34} />
    </EffectComposer>
  );
}
