import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useAsyncGltf } from '../../assets/asyncAssets';
import { enhanceHolidayGltf, smoothMeshNormalsInPlace } from '../../assets/enhanceMaterials';
import { MODEL_PATHS, type ModelKey } from '../../assets/modelRegistry';
import { useSnowPbr, useStonePbr } from '../../assets/pbrMaterials';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { playMagicChime } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';
import { ChimneySmoke } from '../ChimneySmoke';
import { PhotogrammetryBench, VictorianStreetLamp } from '../PolyHavenProp';
import { RealisticGift } from '../RealisticGift';
import { HeroChristmasSpruce } from '../RealisticSpruce';
import { getGroundHeight } from '../terrainMath';

const TRACK_RADIUS = 3.45;
const SLEEPER_COUNT = 34;

function SmoothedTrainCar({ model }: { model: ModelKey }) {
  const gltf = useAsyncGltf(MODEL_PATHS[model]);
  const cloned = useMemo(() => {
    if (!gltf) return null;
    const copy = gltf.scene.clone(true);
    smoothMeshNormalsInPlace(copy, 55);
    enhanceHolidayGltf(copy, { roughness: 0.34, metalness: 0.25, envMapIntensity: 1.35 });
    return copy;
  }, [gltf]);

  if (!cloned) return null;

  return <primitive object={cloned} scale={1.45} rotation={[0, -Math.PI / 2, 0]} />;
}

function HandcraftedSnowman({
  position,
  rotationY = 0,
  onTap,
}: {
  position: [number, number, number];
  rotationY?: number;
  onTap?: () => void;
}) {
  const snow = useSnowPbr(1.5);
  const fabric = useMemo(() => getFabricNormalMap(), []);

  return (
    <group
      position={position}
      rotation={[0, rotationY, 0]}
      onClick={(e) => {
        if (!onTap) return;
        e.stopPropagation();
        onTap();
      }}
      onPointerOver={() => {
        if (onTap) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Packed Snow Spheres */}
      <mesh position={[0, 0.38, 0]} scale={[1.05, 0.92, 1.02]} castShadow receiveShadow>
        <sphereGeometry args={[0.42, 18, 16]} />
        <meshStandardMaterial map={snow.map} normalMap={snow.normalMap} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.88, 0]} scale={[1.02, 0.95, 1.0]} castShadow receiveShadow>
        <sphereGeometry args={[0.3, 18, 16]} />
        <meshStandardMaterial map={snow.map} normalMap={snow.normalMap} roughness={0.86} />
      </mesh>
      <mesh position={[0, 1.28, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.21, 18, 16]} />
        <meshStandardMaterial map={snow.map} normalMap={snow.normalMap} roughness={0.85} />
      </mesh>

      {/* Knitted Scarf */}
      <mesh position={[0, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.18, 0.055, 10, 20]} />
        <meshStandardMaterial color="#a91e2e" normalMap={fabric} roughness={0.92} />
      </mesh>
      <mesh position={[0.14, 0.94, 0.14]} rotation={[0.15, 0, -0.25]} castShadow>
        <boxGeometry args={[0.09, 0.32, 0.04]} />
        <meshStandardMaterial color="#a91e2e" normalMap={fabric} roughness={0.92} />
      </mesh>

      {/* Coal Eyes, Buttons & Carrot Nose */}
      {[-0.075, 0.075].map((ex) => (
        <mesh key={`eye-${ex}`} position={[ex, 1.32, 0.185]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#1d1e22" roughness={0.65} />
        </mesh>
      ))}
      {[0.76, 0.92].map((by) => (
        <mesh key={`btn-${by}`} position={[0, by, 0.29]}>
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshStandardMaterial color="#1d1e22" roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[0, 1.26, 0.26]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <coneGeometry args={[0.036, 0.19, 10]} />
        <meshStandardMaterial color="#e06d24" roughness={0.62} />
      </mesh>

      {/* Natural Twig Arms */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.38, 0.96, 0.04]}
          rotation={[0, 0, side * -0.88]}
          castShadow
        >
          <cylinderGeometry args={[0.018, 0.028, 0.44, 6]} />
          <meshStandardMaterial color="#4a3121" roughness={0.94} />
        </mesh>
      ))}

      {/* Felt Top Hat with Gold Ribbon */}
      <mesh position={[0, 1.46, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.035, 18]} />
        <meshStandardMaterial color="#23252a" normalMap={fabric} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.59, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.24, 18]} />
        <meshStandardMaterial color="#23252a" normalMap={fabric} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.165, 0.165, 0.045, 18]} />
        <meshStandardMaterial color="#a91e2e" roughness={0.65} />
      </mesh>
    </group>
  );
}

export function GreatTreePlaza() {
  const {
    motionPaused,
    partyMode,
    treeBurstActive,
    triggerTreeBurst,
    trainBoostActive,
    triggerTrainBoost,
    announceKey,
  } = useVillage();

  const stone = useStonePbr(2);
  const snow = useSnowPbr(1.5);

  const trainAngleRef = useRef(0);
  const locoRef = useRef<THREE.Group>(null);
  const tenderRef = useRef<THREE.Group>(null);
  const wagon1Ref = useRef<THREE.Group>(null);
  const wagon2Ref = useRef<THREE.Group>(null);
  const sparkleRef = useRef<THREE.InstancedMesh>(null);
  const [snowmanHop, setSnowmanHop] = useState(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const sleepers = useMemo(
    () =>
      Array.from({ length: SLEEPER_COUNT }, (_, i) => {
        const a = (i / SLEEPER_COUNT) * Math.PI * 2;
        return {
          pos: [Math.cos(a) * TRACK_RADIUS, 0.025, Math.sin(a) * TRACK_RADIUS] as [
            number,
            number,
            number,
          ],
          rotY: -a,
        };
      }),
    [],
  );

  const placeTrainCar = (ref: THREE.Group | null, angle: number) => {
    if (!ref) return;
    const x = Math.cos(angle) * TRACK_RADIUS;
    const z = Math.sin(angle) * TRACK_RADIUS;
    ref.position.set(x, 0.05, z);
    ref.rotation.set(0, Math.atan2(-Math.sin(angle), Math.cos(angle)), 0);
  };

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (!motionPaused) {
      const speed = trainBoostActive ? 1.25 : partyMode ? 0.68 : 0.44;
      trainAngleRef.current += delta * speed;
    }
    const baseAngle = trainAngleRef.current;
    placeTrainCar(locoRef.current, baseAngle);
    placeTrainCar(tenderRef.current, baseAngle - 0.22);
    placeTrainCar(wagon1Ref.current, baseAngle - 0.43);
    placeTrainCar(wagon2Ref.current, baseAngle - 0.64);

    if (sparkleRef.current) {
      const active = treeBurstActive || partyMode;
      sparkleRef.current.visible = active && !motionPaused;
      if (active) {
        for (let i = 0; i < 28; i++) {
          const phase = (t * 0.8 + i / 28) % 1;
          const a = phase * Math.PI * 6 + i;
          const r = (1 - phase * 0.7) * 2.15;
          dummy.position.set(Math.cos(a) * r, 0.6 + phase * 5.6, Math.sin(a) * r);
          dummy.scale.setScalar(Math.sin(phase * Math.PI) * 0.11);
          dummy.updateMatrix();
          sparkleRef.current.setMatrixAt(i, dummy.matrix);
        }
        sparkleRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    if (snowmanHop > 0) {
      setSnowmanHop((h) => Math.max(0, h - delta * 2.2));
    }
  });

  const pondSnowmanY = getGroundHeight(2.6, 5.2);
  const benchY = getGroundHeight(-3.8, 2.8);

  return (
    <group name="great-tree-plaza">
      {/* Stone & Snow Pedestal for Great Tree */}
      <mesh position={[0, 0.14, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.68, 1.9, 0.28, 32]} />
        <meshStandardMaterial
          map={stone.map}
          normalMap={stone.normalMap}
          roughnessMap={stone.roughnessMap}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[0, 0.29, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.64, 32]} />
        <meshStandardMaterial map={snow.map} normalMap={snow.normalMap} roughness={0.86} />
      </mesh>

      {/* Botanical Hero Christmas Spruce */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          triggerTreeBurst();
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <HeroChristmasSpruce position={[0, 0.24, 0]} treeBurstActive={treeBurstActive} />

        <pointLight
          position={[0, 3.1, 0]}
          color="#ffbe5c"
          intensity={treeBurstActive ? 14 : 6.5}
          distance={12}
          decay={1.8}
        />

        <instancedMesh ref={sparkleRef} args={[undefined, undefined, 28]} visible={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={[2.5, 2.0, 0.7]} toneMapped={false} />
        </instancedMesh>
      </group>

      {/* Wrapped Satin-Bow Presents Under the Tree */}
      <RealisticGift
        position={[-1.4, 0.02, 1.3]}
        rotation={[0, 0.4, 0]}
        boxColor="#a11d2b"
        ribbonColor="#f2c45a"
        scale={1.15}
      />
      <RealisticGift
        position={[1.45, 0.02, 1.1]}
        rotation={[0, -0.5, 0]}
        boxColor="#1d6e46"
        ribbonColor="#d93848"
        scale={1.2}
      />
      <RealisticGift
        position={[0.45, 0.02, 1.82]}
        rotation={[0, 0.2, 0]}
        size={[0.52, 0.28, 0.38]}
        boxColor="#235789"
        ribbonColor="#f2c45a"
      />
      <RealisticGift
        position={[-0.95, 0.02, -1.6]}
        rotation={[0, 1.1, 0]}
        boxColor="#7a2548"
        ribbonColor="#f2c45a"
      />

      {/* Circular Wooden & Brass Miniature Railway */}
      <group name="toy-train-track">
        <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TRACK_RADIUS - 0.14, 0.024, 6, 72]} />
          <meshStandardMaterial color="#b99252" metalness={0.82} roughness={0.28} />
        </mesh>
        <mesh position={[0, 0.055, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[TRACK_RADIUS + 0.14, 0.024, 6, 72]} />
          <meshStandardMaterial color="#b99252" metalness={0.82} roughness={0.28} />
        </mesh>
        {sleepers.map((s) => (
          <mesh key={`sleeper-${s.rotY}`} position={s.pos} rotation={[0, s.rotY, 0]} receiveShadow>
            <boxGeometry args={[0.48, 0.04, 0.11]} />
            <meshStandardMaterial color="#4e301d" roughness={0.84} />
          </mesh>
        ))}

        <group
          onClick={(e) => {
            e.stopPropagation();
            triggerTrainBoost();
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <group ref={locoRef}>
            <SmoothedTrainCar model="trainLocomotive" />
            <ChimneySmoke
              position={[0, 0.65, 0.18]}
              count={8}
              boosted={trainBoostActive}
              spread={0.18}
              riseHeight={1.2}
            />
          </group>
          <group ref={tenderRef}>
            <SmoothedTrainCar model="trainTender" />
          </group>
          <group ref={wagon1Ref}>
            <SmoothedTrainCar model="trainWagon" />
          </group>
          <group ref={wagon2Ref}>
            <SmoothedTrainCar model="trainWagonLogs" />
          </group>
        </group>
      </group>

      {/* Real Photogrammetry Victorian Streetlamps & Wooden Bench */}
      {[
        [-4.5, -2.5, 0.5],
        [4.5, -2.5, -0.5],
        [-4.3, 3.6, 2.2],
        [3.1, 4.4, -2.1],
      ].map(([lx, lz, rot]) => (
        <VictorianStreetLamp
          key={`lamp-${lx}-${lz}`}
          position={[lx, getGroundHeight(lx, lz), lz]}
          rotation={[0, rot, 0]}
          lightIntensity={2.5}
        />
      ))}

      <PhotogrammetryBench position={[-3.8, benchY, 2.8]} rotation={[0, 0.85, 0]} />

      {/* Organic PBR Hand-Rolled Snowmen Beside the Reflective Pond */}
      <HandcraftedSnowman
        position={[2.6, pondSnowmanY + Math.sin(snowmanHop * Math.PI) * 0.45, 5.2]}
        rotationY={-0.5}
        onTap={() => {
          playMagicChime();
          setSnowmanHop(1);
          announceKey('toasts.snowmanWave');
        }}
      />
      <HandcraftedSnowman position={[8.7, getGroundHeight(8.7, 5.0), 5.0]} rotationY={-2.1} />
    </group>
  );
}
