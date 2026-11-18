import { useTexture } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { isMobileGpuDevice } from '../scene/deviceProfile';
import { withBase } from './baseUrl';

export const POLYHAVEN_PATHS = {
  hdriNight: withBase('/polyhaven/hdri/rogland_moonlit_night_1k.hdr'),
  hdriDay: withBase('/polyhaven/hdri/passendorf_snow_1k.hdr'),
  snowDiff: withBase('/polyhaven/textures/snow_diff.jpg'),
  snowNor: withBase('/polyhaven/textures/snow_nor.jpg'),
  snowArm: withBase('/polyhaven/textures/snow_arm.jpg'),
  woodDiff: withBase('/polyhaven/textures/wood_diff.jpg'),
  woodNor: withBase('/polyhaven/textures/wood_nor.jpg'),
  woodArm: withBase('/polyhaven/textures/wood_arm.jpg'),
  stoneDiff: withBase('/polyhaven/textures/stone_diff.jpg'),
  stoneNor: withBase('/polyhaven/textures/stone_nor.jpg'),
  stoneArm: withBase('/polyhaven/textures/stone_arm.jpg'),
  cobbleDiff: withBase('/polyhaven/textures/cobble_diff.jpg'),
  cobbleNor: withBase('/polyhaven/textures/cobble_nor.jpg'),
  cobbleArm: withBase('/polyhaven/textures/cobble_arm.jpg'),
  firTwigDiff: withBase('/polyhaven/textures/fir_twig_diff.jpg'),
  firTwigAlpha: withBase('/polyhaven/textures/fir_twig_alpha.jpg'),
  firTwigNor: withBase('/polyhaven/textures/fir_twig_nor.jpg'),
  firBarkDiff: withBase('/polyhaven/textures/fir_bark_diff.jpg'),
  firBarkNor: withBase('/polyhaven/textures/fir_bark_nor.jpg'),
  streetLamp: withBase('/polyhaven/models/street_lamp_01/street_lamp_01.gltf'),
  woodenBench: withBase('/polyhaven/models/painted_wooden_bench/painted_wooden_bench.gltf'),
  woodenLantern: withBase('/polyhaven/models/wooden_lantern_01/wooden_lantern_01.gltf'),
} as const;

export interface ScannedPbrMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
}

const configuredTextureCache = new Map<string, THREE.Texture>();

function configureMap(
  source: THREE.Texture,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
): THREE.Texture {
  const key = `${source.uuid}:${repeatX}:${repeatY}:${isColor ? 1 : 0}`;
  const cached = configuredTextureCache.get(key);
  if (cached) {
    return cached;
  }

  const tex = source.clone();
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = isMobileGpuDevice() ? 4 : 8;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  configuredTextureCache.set(key, tex);
  return tex;
}

function configureSingleMap(source: THREE.Texture, isColor: boolean): THREE.Texture {
  const key = `single:${source.uuid}:${isColor ? 1 : 0}`;
  const cached = configuredTextureCache.get(key);
  if (cached) {
    return cached;
  }

  const tex = source.clone();
  tex.anisotropy = isMobileGpuDevice() ? 4 : 8;
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  configuredTextureCache.set(key, tex);
  return tex;
}

function useScannedTriplet(
  diffUrl: string,
  norUrl: string,
  armUrl: string,
  repeatX: number,
  repeatY = repeatX,
): ScannedPbrMaps {
  const [diff, nor, arm] = useTexture([diffUrl, norUrl, armUrl]);

  return useMemo(() => {
    const map = configureMap(diff, repeatX, repeatY, true);
    const normalMap = configureMap(nor, repeatX, repeatY, false);
    const armMap = configureMap(arm, repeatX, repeatY, false);
    return {
      map,
      normalMap,
      roughnessMap: armMap,
      aoMap: armMap,
    };
  }, [diff, nor, arm, repeatX, repeatY]);
}

export function useSnowPbr(repeatX = 12, repeatY = repeatX): ScannedPbrMaps {
  return useScannedTriplet(
    POLYHAVEN_PATHS.snowDiff,
    POLYHAVEN_PATHS.snowNor,
    POLYHAVEN_PATHS.snowArm,
    repeatX,
    repeatY,
  );
}

export function useWoodPbr(repeatX = 2, repeatY = repeatX): ScannedPbrMaps {
  return useScannedTriplet(
    POLYHAVEN_PATHS.woodDiff,
    POLYHAVEN_PATHS.woodNor,
    POLYHAVEN_PATHS.woodArm,
    repeatX,
    repeatY,
  );
}

export function useStonePbr(repeatX = 2, repeatY = repeatX): ScannedPbrMaps {
  return useScannedTriplet(
    POLYHAVEN_PATHS.stoneDiff,
    POLYHAVEN_PATHS.stoneNor,
    POLYHAVEN_PATHS.stoneArm,
    repeatX,
    repeatY,
  );
}

export function useCobblePbr(repeatX = 4, repeatY = repeatX): ScannedPbrMaps {
  return useScannedTriplet(
    POLYHAVEN_PATHS.cobbleDiff,
    POLYHAVEN_PATHS.cobbleNor,
    POLYHAVEN_PATHS.cobbleArm,
    repeatX,
    repeatY,
  );
}

export function useFirFoliagePbr() {
  const [twigDiff, twigAlpha, twigNor, barkDiff, barkNor] = useTexture([
    POLYHAVEN_PATHS.firTwigDiff,
    POLYHAVEN_PATHS.firTwigAlpha,
    POLYHAVEN_PATHS.firTwigNor,
    POLYHAVEN_PATHS.firBarkDiff,
    POLYHAVEN_PATHS.firBarkNor,
  ]);

  return useMemo(() => {
    const td = configureSingleMap(twigDiff, true);
    const ta = configureSingleMap(twigAlpha, false);
    const tn = configureSingleMap(twigNor, false);
    const bd = configureMap(barkDiff, 2, 4, true);
    const bn = configureMap(barkNor, 2, 4, false);

    return {
      twigMap: td,
      twigAlphaMap: ta,
      twigNormalMap: tn,
      barkMap: bd,
      barkNormalMap: bn,
    };
  }, [twigDiff, twigAlpha, twigNor, barkDiff, barkNor]);
}
