import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useVillage } from '../state/villageStore';

export function PostEffects({ enabled }: { enabled: boolean }) {
  const { partyMode } = useVillage();
  if (!enabled) return null;

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        mipmapBlur
        levels={5}
        radius={0.62}
        luminanceThreshold={1.15}
        luminanceSmoothing={0.25}
        intensity={partyMode ? 0.72 : 0.48}
      />
      <Vignette eskil={false} offset={0.28} darkness={0.34} />
    </EffectComposer>
  );
}
