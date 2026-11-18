import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const textureLoader = new THREE.TextureLoader();
const gltfLoader = new GLTFLoader();
const hdrLoader = new HDRLoader();

const resolvedTextures = new Map<string, THREE.Texture>();
const pendingTextures = new Map<string, Promise<THREE.Texture | null>>();

const resolvedGltf = new Map<string, GLTF>();
const pendingGltf = new Map<string, Promise<GLTF | null>>();

const resolvedHdri = new Map<string, THREE.DataTexture>();
const pendingHdri = new Map<string, Promise<THREE.DataTexture | null>>();

export function getResolvedTexture(url: string): THREE.Texture | null {
  return resolvedTextures.get(url) ?? null;
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

  const promise = textureLoader
    .loadAsync(url)
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

  const promise = gltfLoader
    .loadAsync(url)
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

export function loadCachedHdri(url: string): Promise<THREE.DataTexture | null> {
  const existing = resolvedHdri.get(url);
  if (existing) {
    return Promise.resolve(existing);
  }
  const inflight = pendingHdri.get(url);
  if (inflight) {
    return inflight;
  }

  const promise = hdrLoader
    .loadAsync(url)
    .then((tex) => {
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
