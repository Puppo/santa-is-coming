import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { isMobileGpuDevice } from '../scene/deviceProfile';
import { getResolvedTexture, loadCachedTexture } from './asyncAssets';
import { withBase } from './baseUrl';
import {
  getFabricNormalMap,
  getFirFoliageFallback,
  getSnowTextures,
  getStoneCobbleTextures,
  getTimberTextures,
  type PbrTextureSet,
} from './proceduralTextures';

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

function readCachedTriplet(
  diffUrl: string,
  norUrl: string,
  armUrl: string,
): [THREE.Texture, THREE.Texture, THREE.Texture] | null {
  const d = getResolvedTexture(diffUrl);
  const n = getResolvedTexture(norUrl);
  const a = getResolvedTexture(armUrl);
  return d && n && a ? [d, n, a] : null;
}

function useProgressiveTriplet(
  diffUrl: string,
  norUrl: string,
  armUrl: string,
  getFallback: () => PbrTextureSet,
  repeatX: number,
  repeatY = repeatX,
): ScannedPbrMaps {
  const [loaded, setLoaded] = useState<[THREE.Texture, THREE.Texture, THREE.Texture] | null>(() =>
    readCachedTriplet(diffUrl, norUrl, armUrl),
  );

  useEffect(() => {
    const cached = readCachedTriplet(diffUrl, norUrl, armUrl);
    if (cached) {
      setLoaded(cached);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all([
        loadCachedTexture(diffUrl),
        loadCachedTexture(norUrl),
        loadCachedTexture(armUrl),
      ]).then(([d, n, a]) => {
        if (!cancelled && d && n && a) {
          setLoaded([d, n, a]);
        }
      });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [diffUrl, norUrl, armUrl]);

  return useMemo(() => {
    if (loaded) {
      const [diff, nor, arm] = loaded;
      const map = configureMap(diff, repeatX, repeatY, true);
      const normalMap = configureMap(nor, repeatX, repeatY, false);
      const armMap = configureMap(arm, repeatX, repeatY, false);
      return {
        map,
        normalMap,
        roughnessMap: armMap,
        aoMap: armMap,
      };
    }

    const fb = getFallback();
    const normalFallback = getFabricNormalMap();
    return {
      map: configureMap(fb.map, repeatX, repeatY, true),
      normalMap: configureMap(normalFallback, repeatX, repeatY, false),
      roughnessMap: configureMap(fb.roughnessMap, repeatX, repeatY, false),
      aoMap: configureMap(fb.roughnessMap, repeatX, repeatY, false),
    };
  }, [loaded, getFallback, repeatX, repeatY]);
}

export function useSnowPbr(repeatX = 12, repeatY = repeatX): ScannedPbrMaps {
  return useProgressiveTriplet(
    POLYHAVEN_PATHS.snowDiff,
    POLYHAVEN_PATHS.snowNor,
    POLYHAVEN_PATHS.snowArm,
    getSnowTextures,
    repeatX,
    repeatY,
  );
}

export function useWoodPbr(repeatX = 2, repeatY = repeatX): ScannedPbrMaps {
  return useProgressiveTriplet(
    POLYHAVEN_PATHS.woodDiff,
    POLYHAVEN_PATHS.woodNor,
    POLYHAVEN_PATHS.woodArm,
    getTimberTextures,
    repeatX,
    repeatY,
  );
}

export function useStonePbr(repeatX = 2, repeatY = repeatX): ScannedPbrMaps {
  return useProgressiveTriplet(
    POLYHAVEN_PATHS.stoneDiff,
    POLYHAVEN_PATHS.stoneNor,
    POLYHAVEN_PATHS.stoneArm,
    getStoneCobbleTextures,
    repeatX,
    repeatY,
  );
}

export function useCobblePbr(repeatX = 4, repeatY = repeatX): ScannedPbrMaps {
  return useProgressiveTriplet(
    POLYHAVEN_PATHS.cobbleDiff,
    POLYHAVEN_PATHS.cobbleNor,
    POLYHAVEN_PATHS.cobbleArm,
    getStoneCobbleTextures,
    repeatX,
    repeatY,
  );
}

type FirMaps = [THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture, THREE.Texture];

function readCachedFir(): FirMaps | null {
  const td = getResolvedTexture(POLYHAVEN_PATHS.firTwigDiff);
  const ta = getResolvedTexture(POLYHAVEN_PATHS.firTwigAlpha);
  const tn = getResolvedTexture(POLYHAVEN_PATHS.firTwigNor);
  const bd = getResolvedTexture(POLYHAVEN_PATHS.firBarkDiff);
  const bn = getResolvedTexture(POLYHAVEN_PATHS.firBarkNor);
  return td && ta && tn && bd && bn ? [td, ta, tn, bd, bn] : null;
}

export function useFirFoliagePbr() {
  const [loaded, setLoaded] = useState<FirMaps | null>(readCachedFir);

  useEffect(() => {
    const cached = readCachedFir();
    if (cached) {
      setLoaded(cached);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void Promise.all([
        loadCachedTexture(POLYHAVEN_PATHS.firTwigDiff),
        loadCachedTexture(POLYHAVEN_PATHS.firTwigAlpha),
        loadCachedTexture(POLYHAVEN_PATHS.firTwigNor),
        loadCachedTexture(POLYHAVEN_PATHS.firBarkDiff),
        loadCachedTexture(POLYHAVEN_PATHS.firBarkNor),
      ]).then(([td, ta, tn, bd, bn]) => {
        if (!cancelled && td && ta && tn && bd && bn) {
          setLoaded([td, ta, tn, bd, bn]);
        }
      });
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  return useMemo(() => {
    if (loaded) {
      const [twigDiff, twigAlpha, twigNor, barkDiff, barkNor] = loaded;
      return {
        twigMap: configureSingleMap(twigDiff, true),
        twigAlphaMap: configureSingleMap(twigAlpha, false),
        twigNormalMap: configureSingleMap(twigNor, false),
        barkMap: configureMap(barkDiff, 2, 4, true),
        barkNormalMap: configureMap(barkNor, 2, 4, false),
      };
    }

    const fbTwig = getFirFoliageFallback();
    const fbBark = getTimberTextures();
    return {
      twigMap: fbTwig.twigMap,
      twigAlphaMap: fbTwig.twigAlphaMap,
      twigNormalMap: fbTwig.twigNormalMap,
      barkMap: configureMap(fbBark.map, 2, 4, true),
      barkNormalMap: configureMap(getFabricNormalMap(), 2, 4, false),
    };
  }, [loaded]);
}
