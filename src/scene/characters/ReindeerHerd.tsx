import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useAsyncGltf } from '../../assets/asyncAssets';
import { enhanceHolidayGltf, smoothMeshNormalsInPlace } from '../../assets/enhanceMaterials';
import { MODEL_PATHS } from '../../assets/modelRegistry';
import { playSleighBells } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';

const REINDEER_MATERIAL_RULES: Array<{ match: string; roughness: number; metalness: number }> = [
  { match: '011', roughness: 0.08, metalness: 0.08 },
  { match: '010', roughness: 0.42, metalness: 0.02 },
  { match: '001', roughness: 0.54, metalness: 0.02 },
];

const FALLBACK_LEGS: Array<{ x: number; z: number; phase: number }> = [
  { x: -0.12, z: 0.3, phase: 0 },
  { x: 0.12, z: 0.3, phase: Math.PI },
  { x: -0.12, z: -0.28, phase: Math.PI },
  { x: 0.12, z: -0.28, phase: 0 },
];

/**
 * Prepares a single normalized reindeer template from the source glTF scene so
 * vertex-normal smoothing and skeleton binding run once instead of per instance.
 */
export function prepareReindeerTemplate(sourceScene: THREE.Object3D): THREE.Object3D {
  sourceScene.updateMatrixWorld(true);
  const template = cloneSkinned(sourceScene);
  smoothMeshNormalsInPlace(template, 74);
  template.updateMatrixWorld(true);
  template.traverse((obj) => {
    if (obj instanceof THREE.SkinnedMesh) {
      obj.bind(obj.skeleton, obj.bindMatrix);
    }
  });
  return template;
}

/**
 * Instantiates an animated reindeer clone with UV-safe PBR materials and
 * frustum-culling disabled on skinned submeshes to avoid premature culling.
 */
export function createReindeerInstance(template: THREE.Object3D): THREE.Object3D {
  const cloned = cloneSkinned(template);
  enhanceHolidayGltf(cloned, { envMapIntensity: 1.25, metalness: 0.02 });

  cloned.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.frustumCulled = false;
    obj.castShadow = true;
    obj.receiveShadow = true;

    const hasUv = Boolean(obj.geometry?.attributes.uv);
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((mat) => {
      if (!(mat instanceof THREE.MeshStandardMaterial)) return;
      if (!hasUv && mat.normalMap) {
        mat.normalMap = null;
      }
      const lowerName = mat.name.toLowerCase();
      const rule = REINDEER_MATERIAL_RULES.find((entry) => lowerName.includes(entry.match));
      mat.roughness = rule ? rule.roughness : 0.8;
      mat.metalness = rule ? rule.metalness : 0.02;
      mat.needsUpdate = true;
    });
  });

  cloned.updateMatrixWorld(true);
  return cloned;
}

interface RiggedReindeerModelProps {
  template: THREE.Object3D;
  animations: THREE.AnimationClip[];
  isFlying: boolean;
  prancing: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
}

function RiggedReindeerModel({
  template,
  animations,
  isFlying,
  prancing,
  motionPaused,
  partyMode,
  delayPhase,
}: RiggedReindeerModelProps) {
  const clonedScene = useMemo(() => createReindeerInstance(template), [template]);
  const mixer = useMemo(() => new THREE.AnimationMixer(clonedScene), [clonedScene]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(clonedScene);
    };
  }, [mixer, clonedScene]);

  useEffect(() => {
    if (animations.length === 0) return undefined;
    const clipName = isFlying
      ? 'AnimalArmature|Gallop'
      : prancing
        ? 'AnimalArmature|Jump_toIdle'
        : partyMode
          ? 'AnimalArmature|Walk'
          : delayPhase % 2 === 0
            ? 'AnimalArmature|Idle'
            : 'AnimalArmature|Idle_2';

    const clip =
      THREE.AnimationClip.findByName(animations, clipName) ??
      THREE.AnimationClip.findByName(animations, 'AnimalArmature|Idle') ??
      animations[0];
    if (!clip) return undefined;

    const action = mixer.clipAction(clip);
    action.reset().fadeIn(0.25).play();
    action.time = delayPhase * 0.4;
    mixer.update(0);
    clonedScene.updateMatrixWorld(true);

    return () => {
      action.fadeOut(0.2);
    };
  }, [mixer, clonedScene, animations, isFlying, prancing, partyMode, delayPhase]);

  useFrame((_, delta) => {
    if (!motionPaused) {
      mixer.update(Math.min(delta, 0.1));
    }
  });

  return <primitive object={clonedScene} scale={0.34} />;
}

interface FallbackReindeerModelProps {
  isFlying: boolean;
  prancing: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
}

function FallbackReindeerUnit({
  isFlying,
  prancing,
  motionPaused,
  partyMode,
  delayPhase,
}: FallbackReindeerModelProps) {
  const legRefs = useRef<Array<THREE.Group | null>>([]);
  const headRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (motionPaused) return;
    const t = state.clock.elapsedTime;
    const speed = isFlying ? 12 : prancing ? 9 : partyMode ? 6.5 : 1.6;
    const swing = isFlying ? 0.55 : prancing ? 0.42 : partyMode ? 0.28 : 0.04;

    FALLBACK_LEGS.forEach((leg, i) => {
      const grp = legRefs.current[i];
      if (grp) {
        grp.rotation.x = Math.sin(t * speed + delayPhase + leg.phase) * swing;
      }
    });

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 2.1 + delayPhase) * (isFlying ? 0.1 : 0.05);
    }
  });

  return (
    <group name="reindeer-fallback-body">
      {/* Chestnut torso */}
      <mesh position={[0, 0.8, 0.04]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.19, 0.54, 8, 12]} />
        <meshStandardMaterial color="#795e3d" roughness={0.82} metalness={0.02} />
      </mesh>

      {/* Pale cream winter chest */}
      <mesh position={[0, 0.82, 0.34]} scale={[0.88, 1.05, 0.92]} castShadow>
        <sphereGeometry args={[0.2, 12, 10]} />
        <meshStandardMaterial color="#a69985" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Short white tail */}
      <mesh position={[0, 0.9, -0.44]} rotation={[-0.5, 0, 0]} castShadow>
        <coneGeometry args={[0.055, 0.16, 8]} />
        <meshStandardMaterial color="#a69985" roughness={0.85} metalness={0.02} />
      </mesh>

      {/* Neck, Head, Glossy Eyes & Branching Antlers */}
      <group ref={headRef} position={[0, 0.96, 0.4]}>
        <mesh position={[0, 0.14, 0.04]} rotation={[0.42, 0, 0]} castShadow>
          <capsuleGeometry args={[0.11, 0.28, 6, 10]} />
          <meshStandardMaterial color="#795e3d" roughness={0.82} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.28, 0.24]} scale={[0.88, 0.92, 1.24]} castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
          <meshStandardMaterial color="#795e3d" roughness={0.8} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.22, 0.42]} rotation={[1.36, 0, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.12, 6, 8]} />
          <meshStandardMaterial color="#4b3a25" roughness={0.45} metalness={0.02} />
        </mesh>

        {[-1, 1].map((side) => (
          <group key={`head-side-${side}`}>
            <mesh position={[side * 0.12, 0.34, 0.17]} rotation={[0.2, side * 0.3, side * -0.8]}>
              <coneGeometry args={[0.04, 0.12, 6]} />
              <meshStandardMaterial color="#795e3d" roughness={0.82} metalness={0.02} />
            </mesh>
            <mesh position={[side * 0.095, 0.32, 0.32]}>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#141414" roughness={0.08} metalness={0.08} />
            </mesh>
            <group position={[side * 0.075, 0.38, 0.18]} rotation={[-0.25, 0, side * -0.28]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.014, 0.024, 0.42, 6]} />
                <meshStandardMaterial color="#2f281e" roughness={0.54} metalness={0.02} />
              </mesh>
              <mesh
                position={[side * 0.05, 0.22, 0.08]}
                rotation={[0.6, 0, side * -0.5]}
                castShadow
              >
                <cylinderGeometry args={[0.01, 0.016, 0.22, 6]} />
                <meshStandardMaterial color="#2f281e" roughness={0.54} metalness={0.02} />
              </mesh>
              <mesh
                position={[side * -0.02, 0.36, -0.05]}
                rotation={[-0.5, 0, side * -0.45]}
                castShadow
              >
                <cylinderGeometry args={[0.009, 0.014, 0.2, 6]} />
                <meshStandardMaterial color="#2f281e" roughness={0.54} metalness={0.02} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* Four articulated legs */}
      {FALLBACK_LEGS.map((leg, idx) => (
        <group
          key={`leg-${leg.x}-${leg.z}`}
          ref={(el) => {
            legRefs.current[idx] = el;
          }}
          position={[leg.x, 0.68, leg.z]}
        >
          <mesh position={[0, -0.16, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.042, 0.34, 8]} />
            <meshStandardMaterial color="#795e3d" roughness={0.82} metalness={0.02} />
          </mesh>
          <mesh position={[0, -0.44, 0]} castShadow>
            <cylinderGeometry args={[0.036, 0.028, 0.32, 8]} />
            <meshStandardMaterial color="#8c704e" roughness={0.82} metalness={0.02} />
          </mesh>
          <mesh position={[0, -0.62, 0.01]} castShadow>
            <cylinderGeometry args={[0.034, 0.04, 0.08, 8]} />
            <meshStandardMaterial color="#3b2d1c" roughness={0.44} metalness={0.02} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

interface ReindeerUnitProps {
  preparedTemplate: THREE.Object3D | null;
  animations: THREE.AnimationClip[];
  position: [number, number, number];
  isRudolph?: boolean;
  isFlying: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
  onPrance: () => void;
}

function ReindeerUnit({
  preparedTemplate,
  animations,
  position,
  isRudolph = false,
  isFlying,
  motionPaused,
  partyMode,
  delayPhase,
  onPrance,
}: ReindeerUnitProps) {
  const animRootRef = useRef<THREE.Group>(null);
  const hopRef = useRef(0);
  const [prancing, setPrancing] = useState(false);

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
        {preparedTemplate ? (
          <RiggedReindeerModel
            template={preparedTemplate}
            animations={animations}
            isFlying={isFlying}
            prancing={prancing}
            motionPaused={motionPaused}
            partyMode={partyMode}
            delayPhase={delayPhase}
          />
        ) : (
          <FallbackReindeerUnit
            isFlying={isFlying}
            prancing={prancing}
            motionPaused={motionPaused}
            partyMode={partyMode}
            delayPhase={delayPhase}
          />
        )}

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
              <sphereGeometry args={[0.072, 14, 14]} />
              <meshBasicMaterial color={[3.6, 0.35, 0.35]} toneMapped={false} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.16, 10, 10]} />
              <meshBasicMaterial color="#ff3b3b" transparent opacity={0.22} depthWrite={false} />
            </mesh>
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
  const gltf = useAsyncGltf(MODEL_PATHS.stagRigged);
  const { motionPaused, partyMode, announceKey } = useVillage();

  const preparedTemplate = useMemo(
    () => (gltf ? prepareReindeerTemplate(gltf.scene) : null),
    [gltf],
  );

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
      <group name="reindeer-herd-models">
        {TEAM_OFFSETS.map((unit, idx) => (
          <ReindeerUnit
            key={`reindeer-${unit.pos[0]}-${unit.pos[2]}`}
            preparedTemplate={preparedTemplate}
            animations={gltf?.animations ?? []}
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
    </group>
  );
}
