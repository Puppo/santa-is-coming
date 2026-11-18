import * as THREE from 'three';

export interface EnhanceOptions {
  castShadow?: boolean;
  receiveShadow?: boolean;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  emissiveTint?: string;
  emissiveIntensity?: number;
}

/**
 * Averages vertex normals across split vertices sharing identical positions within
 * creaseAngleDeg, eliminating faceted low-poly edges without modifying UVs or skin weights.
 */
export function smoothMeshNormalsInPlace(root: THREE.Object3D, creaseAngleDeg = 72): void {
  const cosThreshold = Math.cos((creaseAngleDeg * Math.PI) / 180);

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geom = obj.geometry;
    if (!geom?.attributes.position) return;

    const cloned = geom.clone();
    cloned.computeVertexNormals();
    const pos = cloned.attributes.position;
    const norm = cloned.attributes.normal;
    if (!norm) {
      obj.geometry = cloned;
      return;
    }

    const buckets = new Map<string, number[]>();
    for (let i = 0; i < pos.count; i++) {
      const key = `${Math.round(pos.getX(i) * 1e4)}_${Math.round(pos.getY(i) * 1e4)}_${Math.round(pos.getZ(i) * 1e4)}`;
      let list = buckets.get(key);
      if (!list) {
        list = [];
        buckets.set(key, list);
      }
      list.push(i);
    }

    const smoothed = new Float32Array(norm.count * 3);
    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const sum = new THREE.Vector3();

    for (const indices of buckets.values()) {
      if (indices.length === 1) {
        const i = indices[0];
        smoothed[i * 3] = norm.getX(i);
        smoothed[i * 3 + 1] = norm.getY(i);
        smoothed[i * 3 + 2] = norm.getZ(i);
        continue;
      }

      for (const i of indices) {
        vA.fromBufferAttribute(norm, i).normalize();
        sum.copy(vA);
        for (const j of indices) {
          if (i === j) continue;
          vB.fromBufferAttribute(norm, j).normalize();
          if (vA.dot(vB) >= cosThreshold) {
            sum.add(vB);
          }
        }
        sum.normalize();
        smoothed[i * 3] = sum.x;
        smoothed[i * 3 + 1] = sum.y;
        smoothed[i * 3 + 2] = sum.z;
      }
    }

    cloned.setAttribute('normal', new THREE.BufferAttribute(smoothed, 3));
    obj.geometry = cloned;
  });
}

/**
 * Traverses a loaded GLTF scene and refines its materials for tactile PBR lighting,
 * sharp texture sampling, and proper shadow casting/receiving.
 */
export function enhanceHolidayGltf(
  root: THREE.Object3D,
  options: EnhanceOptions = {},
): THREE.Object3D {
  const {
    castShadow = true,
    receiveShadow = true,
    roughness,
    metalness,
    envMapIntensity = 1.2,
    emissiveTint,
    emissiveIntensity = 0,
  } = options;

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = castShadow;
    obj.receiveShadow = receiveShadow;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const clonedMats = mats.map((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return mat;
      const m = mat.clone();
      if (m.map) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.anisotropy = 8;
        m.map.needsUpdate = true;
      }
      if (m.normalMap) {
        m.normalMap.anisotropy = 8;
      }
      m.roughness = roughness ?? Math.min(0.88, Math.max(0.35, m.roughness || 0.72));
      m.metalness = metalness ?? (m.metalness || 0.04);
      m.envMapIntensity = envMapIntensity;
      if (emissiveTint && emissiveIntensity > 0) {
        m.emissive = new THREE.Color(emissiveTint);
        m.emissiveIntensity = emissiveIntensity;
      }
      m.needsUpdate = true;
      return m;
    });

    obj.material = Array.isArray(obj.material) ? clonedMats : clonedMats[0];
  });

  return root;
}
