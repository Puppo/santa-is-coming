import { useMemo } from 'react';
import { useSnowPbr, useStonePbr } from '../../assets/pbrMaterials';
import {
  BOULDER_PLACEMENTS,
  buildPineSprucePlacements,
  SNOWDRIFT_PLACEMENTS,
} from '../collisionSystem';
import { InstancedSpruceForest } from '../RealisticSpruce';
import { getGroundHeight } from '../terrainMath';

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
  const spruces = useMemo(() => buildPineSprucePlacements(), []);

  return (
    <group name="pine-woods">
      <InstancedSpruceForest placements={spruces} />

      {BOULDER_PLACEMENTS.map(([x, z, sc], i) => (
        <SnowCappedBoulder
          key={`rock-${x}-${z}`}
          position={[x, getGroundHeight(x, z) - 0.04, z]}
          scale={sc}
          rotationY={i * 1.2}
        />
      ))}

      {/* Natural Snowdrifts Beside Paths */}
      {SNOWDRIFT_PLACEMENTS.map(([sx, sz, sc]) => (
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
