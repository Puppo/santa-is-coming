import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { enhanceHolidayGltf, smoothMeshNormalsInPlace } from '../../assets/enhanceMaterials';
import { MODEL_PATHS } from '../../assets/modelRegistry';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { playSleighBells } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';

interface ReindeerUnitProps {
  position: [number, number, number];
  isRudolph?: boolean;
  isFlying: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
  onPrance: () => void;
}

function ReindeerUnit({
  position,
  isRudolph = false,
  isFlying,
  motionPaused,
  partyMode,
  delayPhase,
  onPrance,
}: ReindeerUnitProps) {
  const gltf = useGLTF(MODEL_PATHS.stagRigged);
  const animRootRef = useRef<THREE.Group>(null);
  const hopRef = useRef(0);
  const [prancing, setPrancing] = useState(false);

  const clonedScene = useMemo(() => {
    const cloned = cloneSkinned(gltf.scene);
    smoothMeshNormalsInPlace(cloned, 74);
    enhanceHolidayGltf(cloned, { envMapIntensity: 1.25 });

    const furNormal = getFabricNormalMap();
    cloned.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat) => {
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        const n = mat.name.toLowerCase();
        if (n.includes('011')) {
          // Glossy wet eye highlight
          mat.roughness = 0.08;
          mat.metalness = 0.1;
        } else if (n.includes('010')) {
          // Dark muzzle/hooves
          mat.roughness = 0.42;
        } else if (n.includes('001')) {
          // Warm ivory antlers / pale belly
          mat.roughness = 0.56;
        } else {
          // Soft buckskin/chestnut fur coat
          mat.normalMap = furNormal;
          mat.normalScale = new THREE.Vector2(0.28, 0.28);
          mat.roughness = 0.84;
        }
        mat.needsUpdate = true;
      });
    });

    return cloned;
  }, [gltf.scene]);

  const { actions } = useAnimations(gltf.animations, animRootRef);

  useEffect(() => {
    if (!actions) return;
    const clipName = isFlying
      ? 'AnimalArmature|Gallop'
      : prancing
        ? 'AnimalArmature|Jump_toIdle'
        : partyMode
          ? 'AnimalArmature|Walk'
          : delayPhase % 2 === 0
            ? 'AnimalArmature|Idle'
            : 'AnimalArmature|Idle_2';

    const action = actions[clipName] ?? actions['AnimalArmature|Idle'];
    if (!action) return;

    action.reset().fadeIn(0.28).play();
    action.time = delayPhase * 0.4;
    return () => {
      action.fadeOut(0.24);
    };
  }, [actions, isFlying, prancing, partyMode, delayPhase]);

  useEffect(() => {
    Object.values(actions).forEach((action) => {
      if (action) action.paused = motionPaused;
    });
  }, [actions, motionPaused]);

  useFrame((state, delta) => {
    const grp = animRootRef.current;
    if (!grp) return;

    if (prancing) {
      hopRef.current = Math.min(1, hopRef.current + delta * 1.4);
      grp.position.y = Math.sin(hopRef.current * Math.PI) * 0.52;
      if (hopRef.current >= 1) {
        hopRef.current = 0;
        grp.position.y = 0;
        setPrancing(false);
      }
    } else if (isFlying && !motionPaused) {
      grp.position.y = Math.sin(state.clock.elapsedTime * 7 + delayPhase) * 0.14;
    } else {
      grp.position.y = 0;
    }
  });

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        setPrancing(true);
        hopRef.current = 0;
        onPrance();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <group ref={animRootRef}>
        <primitive object={clonedScene} scale={0.34} />

        {/* Stitched Leather Harness Collar & Brass Jingle Bell */}
        <mesh position={[0, 0.74, 0.36]} rotation={[0.52, 0, 0]} castShadow>
          <torusGeometry args={[0.16, 0.032, 10, 22]} />
          <meshStandardMaterial color="#8f1824" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.62, 0.48]}>
          <sphereGeometry args={[0.048, 12, 12]} />
          <meshStandardMaterial color="#f5c451" metalness={0.88} roughness={0.2} />
        </mesh>

        {/* Rudolph's Glowing Ruby Nose */}
        {isRudolph && (
          <group position={[0, 1.13, 0.96]}>
            <mesh>
              <sphereGeometry args={[0.068, 14, 14]} />
              <meshBasicMaterial color={[3.4, 0.35, 0.35]} toneMapped={false} />
            </mesh>
            <pointLight color="#ff3b3b" intensity={2.4} distance={4.5} decay={2} />
          </group>
        )}
      </group>
    </group>
  );
}

const TEAM_OFFSETS: Array<{ pos: [number, number, number]; isRudolph?: boolean }> = [
  { pos: [-0.62, 0, 2.05] },
  { pos: [0.62, 0, 2.05] },
  { pos: [-0.62, 0, 3.65] },
  { pos: [0.62, 0, 3.65] },
  { pos: [-0.62, 0, 5.25] },
  { pos: [0.62, 0, 5.25], isRudolph: true },
];

export function ReindeerHerd({ isFlying }: { isFlying: boolean }) {
  const { motionPaused, partyMode, announceKey } = useVillage();

  const handlePrance = () => {
    playSleighBells();
    announceKey('toasts.reindeerPrance');
  };

  return (
    <group name="reindeer-herd">
      {[-0.45, 0.45].map((x) => (
        <mesh key={`trace-${x}`} position={[x, 0.56, 3.1]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 4.4, 6]} />
          <meshStandardMaterial color="#583018" roughness={0.72} />
        </mesh>
      ))}

      {TEAM_OFFSETS.map((unit, idx) => (
        <ReindeerUnit
          key={`reindeer-${unit.pos[0]}-${unit.pos[2]}`}
          position={unit.pos}
          isRudolph={unit.isRudolph}
          isFlying={isFlying}
          motionPaused={motionPaused}
          partyMode={partyMode}
          delayPhase={idx * 0.7}
          onPrance={handlePrance}
        />
      ))}
    </group>
  );
}
