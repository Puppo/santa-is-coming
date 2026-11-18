import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFirFoliagePbr, useSnowPbr } from '../assets/pbrMaterials';
import { christmasAudioEngine } from '../audio/audioEngine';
import { useVillage } from '../state/villageStore';

interface UvSlice {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
}

// Verified exact botanical frond rectangles inside Poly Haven fir_twig_diff / fir_twig_alpha
const FROND_SLICES: UvSlice[] = [
  { uMin: 0.29, uMax: 0.64, vMin: 0.21, vMax: 0.61 }, // Lush lower-left frond
  { uMin: 0.63, uMax: 0.97, vMin: 0.16, vMax: 0.55 }, // Lower-right frond
  { uMin: 0.64, uMax: 0.96, vMin: 0.62, vMax: 0.96 }, // Upper-right frond
];

/** Builds a curved, drooping 3D fir bough card whose stem originates at local z = 0. */
function buildBoughCardGeometry(
  length: number,
  width: number,
  slice: UvSlice,
  droop: number,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(width, length, 3, 4);
  // Rotate so length goes along +Z (from 0 to +length) and width spans X
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, length * 0.5);

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const t = Math.max(0, Math.min(1, z / length));
    const lat = Math.abs(x) / (width * 0.5);

    // Parabolic natural bough arch + slight upward needle cup along edges
    const yOffset = -droop * (t * t) + lat * 0.06 * length + Math.sin(t * Math.PI) * 0.08 * length;
    pos.setY(i, yOffset);

    // Original PlaneGeometry uv.y goes 0 (near z=0) -> 1 (at z=length)
    const uOrig = uv.getX(i);
    const vOrig = uv.getY(i);
    uv.setXY(
      i,
      THREE.MathUtils.lerp(slice.uMin, slice.uMax, uOrig),
      THREE.MathUtils.lerp(slice.vMin, slice.vMax, vOrig),
    );
  }

  geo.computeVertexNormals();
  return geo;
}

interface SpruceGeometries {
  trunkGeo: THREE.BufferGeometry;
  foliageGeo: THREE.BufferGeometry;
  snowGeo: THREE.BufferGeometry;
}

function buildSprucePrototype(
  height: number,
  baseRadius: number,
  tiers: number,
  boughsPerTierBase: number,
): SpruceGeometries {
  const trunk = new THREE.CylinderGeometry(baseRadius * 0.05, baseRadius * 0.14, height * 0.88, 8);
  trunk.translate(0, height * 0.44, 0);

  const boughParts: THREE.BufferGeometry[] = [];
  const snowParts: THREE.BufferGeometry[] = [];

  for (let tier = 0; tier < tiers; tier++) {
    const frac = tier / Math.max(1, tiers - 1);
    const tierY = height * (0.18 + frac * 0.76);
    const boughLen = baseRadius * (1.05 - frac * 0.74);
    const boughWidth = boughLen * 0.88;
    const count = Math.max(4, Math.round(boughsPerTierBase * (1 - frac * 0.48)));
    const pitchDown = 0.28 + (1 - frac) * 0.22;

    for (let b = 0; b < count; b++) {
      const yaw = (b / count) * Math.PI * 2 + tier * 0.65;
      const slice = FROND_SLICES[(tier + b) % FROND_SLICES.length];
      const card = buildBoughCardGeometry(boughLen, boughWidth, slice, boughLen * 0.24);
      card.rotateX(pitchDown);
      card.rotateZ(((b % 3) - 1) * 0.12);
      card.rotateY(yaw);
      card.translate(0, tierY, 0);
      boughParts.push(card);

      // Soft snow cushion resting atop lower & middle boughs
      if (tier % 2 === 0 || frac < 0.65) {
        const snowPatch = new THREE.SphereGeometry(boughLen * 0.22, 6, 5);
        snowPatch.scale(1.0, 0.28, 1.65);
        snowPatch.rotateX(pitchDown * 0.75);
        snowPatch.rotateY(yaw);
        const rOff = boughLen * 0.45;
        snowPatch.translate(Math.sin(yaw) * rOff, tierY - boughLen * 0.08, Math.cos(yaw) * rOff);
        snowParts.push(snowPatch);
      }
    }
  }

  // Crown tip tuft
  for (let i = 0; i < 3; i++) {
    const tip = buildBoughCardGeometry(
      baseRadius * 0.34,
      baseRadius * 0.28,
      FROND_SLICES[i % 3],
      0.04,
    );
    tip.rotateX(-1.12);
    tip.rotateY((i / 3) * Math.PI * 2);
    tip.translate(0, height * 0.86, 0);
    boughParts.push(tip);
  }

  const foliageGeo = mergeGeometries(boughParts, false);
  const snowGeo = mergeGeometries(snowParts, false);
  for (const g of boughParts) g.dispose();
  for (const g of snowParts) g.dispose();

  return { trunkGeo: trunk, foliageGeo, snowGeo };
}

export interface SprucePlacement {
  pos: [number, number, number];
  scale: number;
  rotY: number;
}

export function InstancedSpruceForest({ placements }: { placements: SprucePlacement[] }) {
  const fir = useFirFoliagePbr();
  const snow = useSnowPbr(2);

  const { trunkGeo, foliageGeo, snowGeo } = useMemo(
    () => buildSprucePrototype(3.4, 1.32, 7, 7),
    [],
  );

  const depthMat = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaMap: fir.twigAlphaMap,
        alphaTest: 0.36,
      }),
    [fir.twigAlphaMap],
  );

  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const snowRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    placements.forEach((p, idx) => {
      dummy.position.set(...p.pos);
      dummy.rotation.set(0, p.rotY, 0);
      dummy.scale.set(p.scale, p.scale * (0.94 + (idx % 3) * 0.06), p.scale);
      dummy.updateMatrix();
      trunkRef.current?.setMatrixAt(idx, dummy.matrix);
      foliageRef.current?.setMatrixAt(idx, dummy.matrix);
      snowRef.current?.setMatrixAt(idx, dummy.matrix);
    });
    if (trunkRef.current) trunkRef.current.instanceMatrix.needsUpdate = true;
    if (foliageRef.current) foliageRef.current.instanceMatrix.needsUpdate = true;
    if (snowRef.current) snowRef.current.instanceMatrix.needsUpdate = true;
  }, [placements]);

  return (
    <group name="realistic-spruce-forest">
      <instancedMesh
        ref={trunkRef}
        args={[trunkGeo, undefined, placements.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial map={fir.barkMap} normalMap={fir.barkNormalMap} roughness={0.92} />
      </instancedMesh>

      <instancedMesh
        ref={foliageRef}
        args={[foliageGeo, undefined, placements.length]}
        castShadow
        receiveShadow
        customDepthMaterial={depthMat}
      >
        <meshStandardMaterial
          map={fir.twigMap}
          alphaMap={fir.twigAlphaMap}
          normalMap={fir.twigNormalMap}
          alphaTest={0.36}
          side={THREE.DoubleSide}
          roughness={0.78}
          color="#d5e5d8"
        />
      </instancedMesh>

      <instancedMesh
        ref={snowRef}
        args={[snowGeo, undefined, placements.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          map={snow.map}
          normalMap={snow.normalMap}
          roughness={0.86}
          color="#eef5ff"
        />
      </instancedMesh>
    </group>
  );
}

const BAUBLE_COUNT = 38;
const GARLAND_BULB_COUNT = 54;

export function HeroChristmasSpruce({
  position = [0, 0.25, 0],
  treeBurstActive = false,
}: {
  position?: [number, number, number];
  treeBurstActive?: boolean;
}) {
  const { motionPaused, partyMode } = useVillage();
  const fir = useFirFoliagePbr();
  const snow = useSnowPbr(2);

  const { trunkGeo, foliageGeo, snowGeo } = useMemo(
    () => buildSprucePrototype(5.8, 2.05, 11, 9),
    [],
  );

  const depthMat = useMemo(
    () =>
      new THREE.MeshDepthMaterial({
        depthPacking: THREE.RGBADepthPacking,
        alphaMap: fir.twigAlphaMap,
        alphaTest: 0.36,
      }),
    [fir.twigAlphaMap],
  );

  const baubles = useMemo(
    () =>
      Array.from({ length: BAUBLE_COUNT }, (_, i) => {
        const t = i / BAUBLE_COUNT;
        const angle = t * Math.PI * 10.5;
        const y = 1.05 + t * 4.15;
        const r = 1.65 * (1 - t * 0.78);
        return {
          pos: [Math.cos(angle) * r, y, Math.sin(angle) * r] as [number, number, number],
          color: ['#c92434', '#f4c04e', '#1c7c54', '#2e78c7'][i % 4],
          size: 0.085 + (i % 3) * 0.015,
        };
      }),
    [],
  );

  const garlandSpiral = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < GARLAND_BULB_COUNT; i++) {
      const t = i / (GARLAND_BULB_COUNT - 1);
      const a = t * Math.PI * 12;
      const r = 1.72 * (1 - t * 0.8);
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.95 + t * 4.45, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return {
      wireGeo: new THREE.TubeGeometry(curve, 120, 0.014, 5, false),
      bulbs: pts,
    };
  }, []);

  const bulbInstRef = useRef<THREE.InstancedMesh>(null);
  const starRef = useRef<THREE.Group>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const bands = christmasAudioEngine.bands;

    if (starRef.current && !motionPaused) {
      starRef.current.rotation.y = t * (treeBurstActive ? 2.1 : 0.45);
      const pulse =
        1 + (treeBurstActive ? 0.22 : partyMode ? bands.bass * 0.22 : 0.05 * Math.sin(t * 2));
      starRef.current.scale.setScalar(pulse);
    }

    const bulbInst = bulbInstRef.current;
    if (bulbInst) {
      garlandSpiral.bulbs.forEach((p, idx) => {
        dummy.position.copy(p);
        const s = partyMode ? 1 + bands.mid * 0.35 : 1;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        bulbInst.setMatrixAt(idx, dummy.matrix);

        const baseHex = ['#ffd27d', '#ff7066', '#ffe7a6', '#7ad7ff'][idx % 4];
        tmpColor.set(baseHex);
        const glow = treeBurstActive
          ? 2.6
          : partyMode
            ? 1.4 + bands.energy * 1.5
            : 1.55 + 0.25 * Math.sin(t * 2.2 + idx * 0.6);
        tmpColor.multiplyScalar(glow);
        bulbInst.setColorAt(idx, tmpColor);
      });
      bulbInst.instanceMatrix.needsUpdate = true;
      if (bulbInst.instanceColor) {
        bulbInst.instanceColor.needsUpdate = true;
      }
    }
  });

  return (
    <group name="hero-christmas-spruce" position={position}>
      <mesh geometry={trunkGeo} castShadow receiveShadow>
        <meshStandardMaterial map={fir.barkMap} normalMap={fir.barkNormalMap} roughness={0.92} />
      </mesh>
      <mesh geometry={foliageGeo} castShadow receiveShadow customDepthMaterial={depthMat}>
        <meshStandardMaterial
          map={fir.twigMap}
          alphaMap={fir.twigAlphaMap}
          normalMap={fir.twigNormalMap}
          alphaTest={0.36}
          side={THREE.DoubleSide}
          roughness={0.74}
          color="#d9ebdc"
        />
      </mesh>
      <mesh geometry={snowGeo} castShadow receiveShadow>
        <meshStandardMaterial
          map={snow.map}
          normalMap={snow.normalMap}
          roughness={0.85}
          color="#eff5ff"
        />
      </mesh>

      {/* Reflective Glass & Brass Ornaments */}
      {baubles.map((b) => (
        <mesh key={`bauble-${b.pos[0]}-${b.pos[1]}-${b.pos[2]}`} position={b.pos} castShadow>
          <sphereGeometry args={[b.size, 14, 14]} />
          <meshPhysicalMaterial
            color={b.color}
            metalness={0.82}
            roughness={0.14}
            clearcoat={1}
            clearcoatRoughness={0.08}
          />
        </mesh>
      ))}

      {/* Draped Filament Garland Wire & Bulbs */}
      <mesh geometry={garlandSpiral.wireGeo}>
        <meshStandardMaterial color="#1f2a22" roughness={0.85} />
      </mesh>
      <instancedMesh ref={bulbInstRef} args={[undefined, undefined, garlandSpiral.bulbs.length]}>
        <sphereGeometry args={[0.048, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {/* Sculpted Brass & Glowing Crystal Bethlehem Crown Star */}
      <group ref={starRef} position={[0, 5.75, 0]}>
        <mesh>
          <octahedronGeometry args={[0.26, 0]} />
          <meshBasicMaterial color={[2.8, 2.2, 0.85]} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
          <octahedronGeometry args={[0.21, 0]} />
          <meshStandardMaterial color="#f5c451" metalness={0.9} roughness={0.18} />
        </mesh>
        <pointLight color="#ffd670" intensity={5.2} distance={9} decay={1.8} />
      </group>
    </group>
  );
}
