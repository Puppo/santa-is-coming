import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useVillage } from '../state/villageStore';

function createSnowflakeSprite(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.55, 'rgba(235, 246, 255, 0.72)');
    grad.addColorStop(1, 'rgba(220, 238, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function Snowfall({ count = 1100 }: { count?: number }) {
  const { motionPaused } = useVillage();
  const pointsRef = useRef<THREE.Points>(null);

  const sprite = useMemo(() => createSnowflakeSprite(), []);

  const { geometry, speeds, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sp = new Float32Array(count);
    const ph = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const r = Math.sqrt((i * 0.6180339) % 1) * 27;
      const a = (i * 2.399963) % (Math.PI * 2);
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = ((i * 7.13) % 21) + 0.3;
      positions[i * 3 + 2] = Math.sin(a) * r;
      sp[i] = 1.0 + (i % 9) * 0.19;
      ph[i] = (i * 1.7) % (Math.PI * 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return { geometry: geo, speeds: sp, phases: ph };
  }, [count]);

  useFrame((state, delta) => {
    if (motionPaused || !pointsRef.current) return;
    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const t = state.clock.elapsedTime;
    const step = Math.min(delta, 0.05);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx + 1] -= speeds[i] * step;
      arr[idx] += Math.sin(t * 0.75 + phases[i]) * 0.25 * step;
      arr[idx + 2] += Math.cos(t * 0.6 + phases[i]) * 0.2 * step;

      if (arr[idx + 1] < 0) {
        arr[idx + 1] = 21.3;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        size={0.28}
        transparent
        opacity={0.86}
        depthWrite={false}
        sizeAttenuation
        color="#f7fbff"
      />
    </points>
  );
}
