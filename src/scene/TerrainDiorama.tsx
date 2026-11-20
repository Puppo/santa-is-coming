import { MeshReflectorMaterial } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useCobblePbr, useSnowPbr, useWoodPbr } from '../assets/pbrMaterials';
import { getGroundHeight, ISLAND_RADIUS } from './terrainMath';

const PATH_CURVES = [
  [
    new THREE.Vector3(-6.4, 0, -2.1),
    new THREE.Vector3(-3.8, 0, -1.5),
    new THREE.Vector3(-1.95, 0, -1.1),
  ],
  [
    new THREE.Vector3(6.2, 0, -2.2),
    new THREE.Vector3(3.8, 0, -1.5),
    new THREE.Vector3(1.95, 0, -1.1),
  ],
  [
    new THREE.Vector3(-0.3, 0, 2.15),
    new THREE.Vector3(-1.2, 0, 4.8),
    new THREE.Vector3(-2.3, 0, 7.4),
  ],
  [
    new THREE.Vector3(-6.8, 0, -0.8),
    new THREE.Vector3(-7.0, 0, 3.3),
    new THREE.Vector3(-5.8, 0, 7.6),
    new THREE.Vector3(-3.6, 0, 9.5),
  ],
];

function buildSnowIslandGeometry(): THREE.BufferGeometry {
  const disc = new THREE.PlaneGeometry(ISLAND_RADIUS * 2, ISLAND_RADIUS * 2, 128, 128);
  disc.rotateX(-Math.PI / 2);
  const pos = disc.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const colA = new THREE.Color('#ffffff');
  const colB = new THREE.Color('#dde8f6');
  const tmpCol = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r > ISLAND_RADIUS) {
      const scale = ISLAND_RADIUS / r;
      x *= scale;
      z *= scale;
      pos.setX(i, x);
      pos.setZ(i, z);
    }
    const h = getGroundHeight(x, z);
    pos.setY(i, h);

    const shade = Math.max(0, Math.min(1, (h + 0.35) / 2.2));
    tmpCol.copy(colB).lerp(colA, shade);
    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }

  disc.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  disc.computeVertexNormals();
  return disc;
}

export function TerrainDiorama({ mobileGpu = false }: { mobileGpu?: boolean }) {
  const snowPbr = useSnowPbr(12);
  const woodPbr = useWoodPbr(6, 1);
  const cobblePbr = useCobblePbr(4);
  const stonePathPbr = useCobblePbr(1.2);

  const snowGeometry = useMemo(() => buildSnowIslandGeometry(), []);

  const steppingStones = useMemo(() => {
    const stones: Array<{
      pos: [number, number, number];
      rotY: number;
      scale: [number, number, number];
    }> = [];

    PATH_CURVES.forEach((pts, curveIdx) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const steps = Math.round(curve.getLength() * 1.45);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        const jitter = (((i * 7 + curveIdx * 13) % 5) - 2) * 0.05;
        const x = p.x + jitter;
        const z = p.z - jitter * 0.7;
        const y = getGroundHeight(x, z) + 0.015;
        stones.push({
          pos: [x, y, z],
          rotY: Math.atan2(tangent.x, tangent.z) + jitter * 2,
          scale: [0.58 + (i % 3) * 0.08, 0.075, 0.44 + ((i + 1) % 3) * 0.07],
        });
      }
    });

    return stones;
  }, []);

  return (
    <group name="terrain-diorama">
      {/* Main Scanned PBR Snow Terrain */}
      <mesh geometry={snowGeometry} receiveShadow>
        <meshStandardMaterial
          map={snowPbr.map}
          normalMap={snowPbr.normalMap}
          normalScale={new THREE.Vector2(0.55, 0.55)}
          roughnessMap={snowPbr.roughnessMap}
          aoMap={snowPbr.aoMap}
          roughness={0.88}
          metalness={0.02}
          vertexColors
        />
      </mesh>

      {/* Handcrafted Walnut Timber & Brass Architectural Plinth */}
      <mesh position={[0, -1.72, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS + 0.15, ISLAND_RADIUS + 0.55, 2.2, 72]} />
        <meshStandardMaterial
          map={woodPbr.map}
          normalMap={woodPbr.normalMap}
          roughnessMap={woodPbr.roughnessMap}
          color="#633f28"
          roughness={0.62}
          metalness={0.06}
        />
      </mesh>
      <mesh position={[0, -0.66, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ISLAND_RADIUS + 0.16, 0.11, 12, 96]} />
        <meshStandardMaterial color="#b48a46" roughness={0.28} metalness={0.85} />
      </mesh>

      {/* Scanned Cobblestone Central Plaza */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.65, 5.25, 56]} />
        <meshStandardMaterial
          map={cobblePbr.map}
          normalMap={cobblePbr.normalMap}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughnessMap={cobblePbr.roughnessMap}
          aoMap={cobblePbr.aoMap}
          color="#cbd4df"
          roughness={0.82}
          metalness={0.05}
        />
      </mesh>

      {/* Real-Time Reflective Frozen Skating Pond (glossy ice fallback on mobile GPUs) */}
      <mesh position={[5.6, -0.14, 5.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.35, 56]} />
        {mobileGpu ? (
          <meshStandardMaterial
            color="#82b4cf"
            roughness={0.14}
            metalness={0.22}
            normalMap={snowPbr.normalMap}
            normalScale={new THREE.Vector2(0.08, 0.08)}
          />
        ) : (
          <MeshReflectorMaterial
            resolution={512}
            blur={[240, 80]}
            mixBlur={0.75}
            mixStrength={1.35}
            mirror={0.58}
            roughness={0.2}
            depthScale={0.4}
            minDepthThreshold={0.5}
            maxDepthThreshold={1.2}
            color="#7faec9"
            metalness={0.18}
            normalMap={snowPbr.normalMap}
            normalScale={new THREE.Vector2(0.08, 0.08)}
          />
        )}
      </mesh>

      {/* Snow-Dusted Cobblestone Path Stones */}
      {steppingStones.map((stone) => (
        <mesh
          key={`stone-${stone.pos[0]}-${stone.pos[2]}`}
          position={stone.pos}
          rotation={[0, stone.rotY, 0]}
          scale={stone.scale}
          receiveShadow
          castShadow
        >
          <cylinderGeometry args={[0.9, 1.0, 1.0, 9]} />
          <meshStandardMaterial
            map={stonePathPbr.map}
            normalMap={stonePathPbr.normalMap}
            roughnessMap={stonePathPbr.roughnessMap}
            color="#b4becb"
            roughness={0.86}
          />
        </mesh>
      ))}
    </group>
  );
}
