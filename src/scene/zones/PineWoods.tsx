import { useMemo } from 'react';
import { useSnowPbr, useStonePbr } from '../../assets/pbrMaterials';
import { InstancedSpruceForest, type SprucePlacement } from '../RealisticSpruce';
import { getGroundHeight, ISLAND_RADIUS } from '../terrainMath';

function SnowCappedBoulder({
  position,
  scale = 1,
  rotationY = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotationY?: number;
}) {
  const stone = useStonePbr(1.5);
  const snow = useSnowPbr(1.5);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      scale={[scale * 1.15, scale * 0.72, scale]}
    >
      <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.55, 2]} />
        <meshStandardMaterial
          map={stone.map}
          normalMap={stone.normalMap}
          roughnessMap={stone.roughnessMap}
          color="#8f97a3"
          roughness={0.92}
        />
      </mesh>
      <mesh position={[0, 0.44, 0]} scale={[0.92, 0.55, 0.92]} receiveShadow>
        <dodecahedronGeometry args={[0.5, 2]} />
        <meshStandardMaterial
          map={snow.map}
          normalMap={snow.normalMap}
          roughness={0.86}
          color="#eef5ff"
        />
      </mesh>
    </group>
  );
}

export function PineWoods() {
  const snow = useSnowPbr(1.5);

  const spruces = useMemo<SprucePlacement[]>(() => {
    const placements: SprucePlacement[] = [];

    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2 + ((i % 3) - 1) * 0.05;
      const isNorth = Math.sin(a) < -0.12;
      const baseR = isNorth ? 12.6 + (i % 4) * 2.4 : 15.6 + (i % 3) * 2.3;
      const r = Math.min(ISLAND_RADIUS - 2.2, baseR);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      if (z > 6.5 && Math.abs(x) < 10.5) continue;

      placements.push({
        pos: [x, getGroundHeight(x, z) - 0.05, z],
        scale: 0.95 + (i % 5) * 0.22,
        rotY: (i * 1.17) % (Math.PI * 2),
      });
    }

    const backdropCoords: Array<[number, number, number]> = [
      [-13.5, -10.5, 1.35],
      [-11.2, -13.2, 1.55],
      [-7.2, -11.8, 1.28],
      [-2.5, -11.4, 1.5],
      [2.8, -11.2, 1.42],
      [7.4, -12.0, 1.55],
      [11.5, -13.0, 1.35],
      [14.2, -9.8, 1.25],
    ];
    backdropCoords.forEach(([x, z, sc], idx) => {
      placements.push({
        pos: [x, getGroundHeight(x, z) - 0.05, z],
        scale: sc,
        rotY: idx * 0.9,
      });
    });

    return placements;
  }, []);

  const rockCoords: Array<[number, number, number]> = [
    [-12.4, 2.2, 1.15],
    [12.2, 1.8, 1.05],
    [9.8, 7.6, 0.95],
    [-9.2, 11.4, 1.2],
    [-4.8, -8.5, 1.1],
    [4.6, -8.6, 1.1],
  ];

  return (
    <group name="pine-woods">
      <InstancedSpruceForest placements={spruces} />

      {rockCoords.map(([x, z, sc], i) => (
        <SnowCappedBoulder
          key={`rock-${x}-${z}`}
          position={[x, getGroundHeight(x, z) - 0.04, z]}
          scale={sc}
          rotationY={i * 1.2}
        />
      ))}

      {/* Natural Snowdrifts Along Paths */}
      {[
        [-5.4, 3.8, 1.2],
        [4.2, 1.8, 1.05],
      ].map(([sx, sz, sc]) => (
        <mesh
          key={`drift-${sx}-${sz}`}
          position={[sx, getGroundHeight(sx, sz) - 0.08, sz]}
          scale={[sc * 1.4, sc * 0.35, sc]}
          receiveShadow
        >
          <sphereGeometry args={[0.75, 16, 12]} />
          <meshStandardMaterial
            map={snow.map}
            normalMap={snow.normalMap}
            roughness={0.86}
            color="#eef5ff"
          />
        </mesh>
      ))}
    </group>
  );
}
