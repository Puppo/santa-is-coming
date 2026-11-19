import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const hdrLoader = new HDRLoader();

const MAX_CONCURRENT_TEXTURES = 4;
let activeTextureLoads = 0;
const textureQueue: Array<() => void> = [];

function acquireTextureSlot(): Promise<void> {
  if (activeTextureLoads < MAX_CONCURRENT_TEXTURES) {
    activeTextureLoads++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    textureQueue.push(() => {
      activeTextureLoads++;
      resolve();
    });
  });
}

function releaseTextureSlot(): void {
  activeTextureLoads = Math.max(0, activeTextureLoads - 1);
  const next = textureQueue.shift();
  if (next) next();
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 500): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries) {
        throw err;
      }
      const delay = baseDelayMs * (attempt + 1) + attempt * 200;
      attempt++;
      await new Promise<void>((resolve) => {
        setTimeout(resolve, delay);
      });
    }
  }
}

const resolvedTextures = new Map<string, THREE.Texture>();
const pendingTextures = new Map<string, Promise<THREE.Texture | null>>();

const resolvedGltf = new Map<string, GLTF>();
const pendingGltf = new Map<string, Promise<GLTF | null>>();

const resolvedHdri = new Map<string, THREE.DataTexture>();
const pendingHdri = new Map<string, Promise<THREE.DataTexture | null>>();

export function getResolvedTexture(url: string): THREE.Texture | null {
  return resolvedTextures.get(url) ?? null;
}

export function getResolvedHdri(url: string): THREE.DataTexture | null {
  return resolvedHdri.get(url) ?? null;
}

export function loadCachedTexture(url: string): Promise<THREE.Texture | null> {
  const existing = resolvedTextures.get(url);
  if (existing) {
    return Promise.resolve(existing);
  }
  const inflight = pendingTextures.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = acquireTextureSlot()
    .then(() =>
      withRetry(() => textureLoader.loadAsync(url), 2, 500).finally(() => {
        releaseTextureSlot();
      }),
    )
    .then((tex) => {
      resolvedTextures.set(url, tex);
      pendingTextures.delete(url);
      return tex;
    })
    .catch((err: unknown) => {
      console.warn(`Failed to load texture ${url}:`, err);
      pendingTextures.delete(url);
      return null;
    });

  pendingTextures.set(url, promise);
  return promise;
}

export function preloadGltf(url: string): Promise<GLTF | null> {
  const existing = resolvedGltf.get(url);
  if (existing) {
    return Promise.resolve(existing);
  }
  const inflight = pendingGltf.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = withRetry(() => gltfLoader.loadAsync(url), 2, 500)
    .then((gltf) => {
      resolvedGltf.set(url, gltf);
      pendingGltf.delete(url);
      return gltf;
    })
    .catch((err: unknown) => {
      console.warn(`Failed to load glTF ${url}:`, err);
      pendingGltf.delete(url);
      return null;
    });

  pendingGltf.set(url, promise);
  return promise;
}

export function useAsyncGltf(url: string): GLTF | null {
  const [gltf, setGltf] = useState<GLTF | null>(() => resolvedGltf.get(url) ?? null);

  useEffect(() => {
    const cached = resolvedGltf.get(url);
    if (cached) {
      setGltf(cached);
      return undefined;
    }

    let cancelled = false;
    void preloadGltf(url).then((res) => {
      if (!cancelled && res) {
        setGltf(res);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return gltf;
}

/**
 * Clamps extreme radiance texels and sanitizes non-finite/negative samples in loaded HDRI
 * textures so HalfFloat post-processing targets never overflow to Infinity/NaN.
 */
export function sanitizeHdrDataTexture(
  tex: THREE.DataTexture,
  maxRadiance = 12,
): THREE.DataTexture {
  const rawData = tex.image?.data;
  if (rawData instanceof Uint16Array) {
    const clampedMaxHalf = THREE.DataUtils.toHalfFloat(maxRadiance);
    for (let i = 0; i < rawData.length; i++) {
      if (i % 4 === 3) continue;
      const v = THREE.DataUtils.fromHalfFloat(rawData[i]);
      if (!Number.isFinite(v) || v < 0) {
        rawData[i] = 0;
      } else if (v > maxRadiance) {
        rawData[i] = clampedMaxHalf;
      }
    }
  } else if (rawData instanceof Float32Array) {
    for (let i = 0; i < rawData.length; i++) {
      if (i % 4 === 3) continue;
      const v = rawData[i];
      if (!Number.isFinite(v) || v < 0) {
        rawData[i] = 0;
      } else if (v > maxRadiance) {
        rawData[i] = maxRadiance;
      }
    }
  }
  tex.needsUpdate = true;
  return tex;
}

export function loadCachedHdri(url: string): Promise<THREE.DataTexture | null> {
  const existing = resolvedHdri.get(url);
  if (existing) {
    return Promise.resolve(existing);
  }
  const inflight = pendingHdri.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = withRetry(() => hdrLoader.loadAsync(url), 2, 500)
    .then((tex) => {
      sanitizeHdrDataTexture(tex, 12);
      tex.mapping = THREE.EquirectangularReflectionMapping;
      resolvedHdri.set(url, tex);
      pendingHdri.delete(url);
      return tex;
    })
    .catch((err: unknown) => {
      console.warn(`Failed to load HDRI ${url}:`, err);
      pendingHdri.delete(url);
      return null;
    });

  pendingHdri.set(url, promise);
  return promise;
}
