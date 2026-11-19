import { useFrame } from '@react-three/fiber';
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useAsyncGltf } from '../../assets/asyncAssets';
import { enhanceHolidayGltf, smoothMeshNormalsInPlace } from '../../assets/enhanceMaterials';
import { MODEL_PATHS } from '../../assets/modelRegistry';
import { playSleighBells } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';
import { BASE_ROT_Y, PAIR_LEAD_DISTANCES, type SleighFlightTrack } from '../sleighFlightPath';
import { getGroundHeight } from '../terrainMath';

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

const SIDE_X_OFFSETS = [-0.62, 0.62] as const;
const TRACE_SIDE_X = [-0.45, 0.45] as const;
const UP_AXIS = new THREE.Vector3(0, 1, 0);

interface ReindeerPairRuntimeState {
  airborne: boolean;
  trotting: boolean;
}

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
  pairIndex: number;
  pairStatesRef: RefObject<ReindeerPairRuntimeState[]>;
  prancing: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
}

function RiggedReindeerModel({
  template,
  animations,
  pairIndex,
  pairStatesRef,
  prancing,
  motionPaused,
  partyMode,
  delayPhase,
}: RiggedReindeerModelProps) {
  const clonedScene = useMemo(() => createReindeerInstance(template), [template]);
  const mixer = useMemo(() => new THREE.AnimationMixer(clonedScene), [clonedScene]);
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const activeClipNameRef = useRef<string | null>(null);
  const lastDesiredClipRef = useRef<string | null>(null);

  useEffect(() => {
    if (animations.length === 0) return undefined;
    const idleName = delayPhase % 2 === 0 ? 'AnimalArmature|Idle' : 'AnimalArmature|Idle_2';
    const initialClip =
      THREE.AnimationClip.findByName(animations, idleName) ??
      THREE.AnimationClip.findByName(animations, 'AnimalArmature|Idle') ??
      animations[0];
    if (!initialClip) return undefined;

    const action = mixer.clipAction(initialClip);
    action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    action.time = (delayPhase * 0.4) % Math.max(0.1, initialClip.duration);
    mixer.update(0);
    clonedScene.updateMatrixWorld(true);

    activeActionRef.current = action;
    activeClipNameRef.current = initialClip.name;
    lastDesiredClipRef.current = idleName;

    return () => {
      activeActionRef.current = null;
      activeClipNameRef.current = null;
      lastDesiredClipRef.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(clonedScene);
    };
  }, [mixer, clonedScene, animations, delayPhase]);

  useFrame((_, delta) => {
    if (animations.length > 0) {
      const pairState = pairStatesRef.current[pairIndex];
      const desiredClip = pairState?.airborne
        ? 'AnimalArmature|Gallop'
        : prancing
          ? 'AnimalArmature|Jump_toIdle'
          : pairState?.trotting || partyMode
            ? 'AnimalArmature|Walk'
            : delayPhase % 2 === 0
              ? 'AnimalArmature|Idle'
              : 'AnimalArmature|Idle_2';

      if (desiredClip !== lastDesiredClipRef.current) {
        lastDesiredClipRef.current = desiredClip;
        const nextClip =
          THREE.AnimationClip.findByName(animations, desiredClip) ??
          THREE.AnimationClip.findByName(animations, 'AnimalArmature|Idle') ??
          animations[0];
        if (nextClip && nextClip.name !== activeClipNameRef.current) {
          const nextAction = mixer.clipAction(nextClip);
          activeActionRef.current?.fadeOut(0.28);
          nextAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.28).play();
          nextAction.time = (delayPhase * 0.35) % Math.max(0.1, nextClip.duration);
          activeActionRef.current = nextAction;
          activeClipNameRef.current = nextClip.name;
        }
      }
    }

    if (!motionPaused) {
      mixer.update(Math.min(delta, 0.1));
    }
  });

  return <primitive object={clonedScene} scale={0.34} />;
}

interface FallbackReindeerModelProps {
  pairIndex: number;
  pairStatesRef: RefObject<ReindeerPairRuntimeState[]>;
  prancing: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
}

function FallbackReindeerUnit({
  pairIndex,
  pairStatesRef,
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
    const pairState = pairStatesRef.current[pairIndex];
    const airborne = Boolean(pairState?.airborne);
    const trotting = Boolean(pairState?.trotting);
    const speed = airborne ? 12 : prancing ? 9 : trotting || partyMode ? 6.5 : 1.6;
    const swing = airborne ? 0.55 : prancing ? 0.42 : trotting || partyMode ? 0.28 : 0.04;

    FALLBACK_LEGS.forEach((leg, i) => {
      const grp = legRefs.current[i];
      if (grp) {
        grp.rotation.x = Math.sin(t * speed + delayPhase + leg.phase) * swing;
      }
    });

    if (headRef.current) {
      headRef.current.rotation.x = Math.sin(t * 2.1 + delayPhase) * (airborne ? 0.1 : 0.05);
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
  sideRef: (el: THREE.Group | null) => void;
  sideX: number;
  pairIndex: number;
  pairStatesRef: RefObject<ReindeerPairRuntimeState[]>;
  isRudolph?: boolean;
  motionPaused: boolean;
  partyMode: boolean;
  delayPhase: number;
  onPrance: () => void;
}

function ReindeerUnit({
  preparedTemplate,
  animations,
  sideRef,
  sideX,
  pairIndex,
  pairStatesRef,
  isRudolph = false,
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
    } else {
      const airborne = Boolean(pairStatesRef.current[pairIndex]?.airborne);
      const targetY =
        airborne && !motionPaused ? Math.sin(state.clock.elapsedTime * 7 + delayPhase) * 0.12 : 0;
      grp.position.y = THREE.MathUtils.lerp(grp.position.y, targetY, 0.18);
    }
  });

  return (
    <group
      ref={sideRef}
      position={[sideX, 0, 0]}
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
            pairIndex={pairIndex}
            pairStatesRef={pairStatesRef}
            prancing={prancing}
            motionPaused={motionPaused}
            partyMode={partyMode}
            delayPhase={delayPhase}
          />
        ) : (
          <FallbackReindeerUnit
            pairIndex={pairIndex}
            pairStatesRef={pairStatesRef}
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

export interface ReindeerHerdProps {
  sleighFlightActive: boolean;
  flightProgressRef: RefObject<number>;
  flightTrack: SleighFlightTrack;
  sleighRigRef: RefObject<THREE.Group | null>;
}

export function ReindeerHerd({
  sleighFlightActive,
  flightProgressRef,
  flightTrack,
  sleighRigRef,
}: ReindeerHerdProps) {
  const gltf = useAsyncGltf(MODEL_PATHS.stagRigged);
  const { motionPaused, partyMode, announceKey } = useVillage();

  const pairGroupRefs = useRef<Array<THREE.Group | null>>([]);
  const reindeerSideRefs = useRef<Array<THREE.Group | null>>([]);
  const traceRefs = useRef<Array<THREE.Mesh | null>>([]);
  const pairStatesRef = useRef<ReindeerPairRuntimeState[]>(
    PAIR_LEAD_DISTANCES.map(() => ({ airborne: false, trotting: false })),
  );

  const tmpSleighPos = useMemo(() => new THREE.Vector3(), []);
  const tmpSleighQuat = useMemo(() => new THREE.Quaternion(), []);
  const tmpSideWorld = useMemo(() => new THREE.Vector3(), []);
  const tmpDir = useMemo(() => new THREE.Vector3(), []);
  const anchorPoints = useMemo(
    () =>
      TRACE_SIDE_X.map(() => [
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
    [],
  );

  const initialPairPositions = useMemo(() => {
    const quat = new THREE.Quaternion();
    return PAIR_LEAD_DISTANCES.map((leadDist) => {
      const pos = new THREE.Vector3();
      flightTrack.sampleCarriagePose(0, leadDist, pos, quat);
      return [pos.x, pos.y, pos.z] as [number, number, number];
    });
  }, [flightTrack]);

  const preparedTemplate = useMemo(
    () => (gltf ? prepareReindeerTemplate(gltf.scene) : null),
    [gltf],
  );

  useFrame(() => {
    const progress = sleighFlightActive ? flightProgressRef.current : 0;

    sleighRigRef.current?.updateMatrixWorld();
    flightTrack.sampleCarriagePose(progress, 0, tmpSleighPos, tmpSleighQuat);

    TRACE_SIDE_X.forEach((traceX, traceSideIdx) => {
      anchorPoints[traceSideIdx][0]
        .set(traceX, 0.56, 1.18)
        .applyQuaternion(tmpSleighQuat)
        .add(tmpSleighPos);
    });

    PAIR_LEAD_DISTANCES.forEach((leadDist, pairIdx) => {
      const pairGroup = pairGroupRefs.current[pairIdx];
      if (!pairGroup) return;

      const sample = flightTrack.sampleCarriagePose(
        progress,
        leadDist,
        pairGroup.position,
        pairGroup.quaternion,
      );
      pairGroup.updateMatrixWorld(true);

      const pairState = pairStatesRef.current[pairIdx];
      pairState.airborne = sleighFlightActive && sample.heightAboveGround > 0.18;
      pairState.trotting =
        sleighFlightActive && sample.heightAboveGround <= 0.18 && sample.speedFactor > 0.08;

      let pairLift = 0;
      SIDE_X_OFFSETS.forEach((sideX, sideIdx) => {
        const sideGroup = reindeerSideRefs.current[pairIdx * 2 + sideIdx];
        if (!sideGroup) return;
        tmpSideWorld.set(sideX, 0, 0).applyQuaternion(pairGroup.quaternion).add(pairGroup.position);
        const minGround = getGroundHeight(tmpSideWorld.x, tmpSideWorld.z) + 0.02;
        const clampY = Math.max(0, minGround - tmpSideWorld.y);
        sideGroup.position.y = clampY;
        pairLift = Math.max(pairLift, clampY);
      });

      TRACE_SIDE_X.forEach((traceX, traceSideIdx) => {
        anchorPoints[traceSideIdx][pairIdx + 1]
          .set(traceX, 0.56 + pairLift, 0.15)
          .applyQuaternion(pairGroup.quaternion)
          .add(pairGroup.position);
      });
    });

    TRACE_SIDE_X.forEach((_, traceSideIdx) => {
      for (let segIdx = 0; segIdx < 3; segIdx++) {
        const mesh = traceRefs.current[traceSideIdx * 3 + segIdx];
        if (!mesh) continue;
        const pA = anchorPoints[traceSideIdx][segIdx];
        const pB = anchorPoints[traceSideIdx][segIdx + 1];
        mesh.position.lerpVectors(pA, pB, 0.5);
        tmpDir.subVectors(pB, pA);
        const len = tmpDir.length();
        if (len > 1e-4) {
          tmpDir.divideScalar(len);
          mesh.quaternion.setFromUnitVectors(UP_AXIS, tmpDir);
          mesh.scale.set(1, len, 1);
        }
      }
    });
  });

  const handlePrance = () => {
    playSleighBells();
    announceKey('toasts.reindeerPrance');
  };

  return (
    <group name="reindeer-herd">
      {/* Segmented flexible leather traces linking sleigh bow through each reindeer pair */}
      {TRACE_SIDE_X.map((traceX, traceSideIdx) =>
        [0, 1, 2].map((segIdx) => (
          <mesh
            key={`trace-${traceX}-${segIdx}`}
            ref={(el) => {
              traceRefs.current[traceSideIdx * 3 + segIdx] = el;
            }}
          >
            <cylinderGeometry args={[0.017, 0.017, 1, 6]} />
            <meshStandardMaterial color="#583018" roughness={0.72} />
          </mesh>
        )),
      )}

      <group name="reindeer-herd-models">
        {PAIR_LEAD_DISTANCES.map((leadDist, pairIdx) => (
          <group
            key={`pair-${leadDist}`}
            ref={(el) => {
              pairGroupRefs.current[pairIdx] = el;
            }}
            position={initialPairPositions[pairIdx]}
            rotation={[0, BASE_ROT_Y, 0]}
          >
            {SIDE_X_OFFSETS.map((sideX, sideIdx) => {
              const unitIndex = pairIdx * 2 + sideIdx;
              return (
                <ReindeerUnit
                  key={`reindeer-${leadDist}-${sideX}`}
                  preparedTemplate={preparedTemplate}
                  animations={gltf?.animations ?? []}
                  sideRef={(el) => {
                    reindeerSideRefs.current[unitIndex] = el;
                  }}
                  sideX={sideX}
                  pairIndex={pairIdx}
                  pairStatesRef={pairStatesRef}
                  isRudolph={pairIdx === 2 && sideIdx === 1}
                  motionPaused={motionPaused}
                  partyMode={partyMode}
                  delayPhase={unitIndex * 0.7}
                  onPrance={handlePrance}
                />
              );
            })}
          </group>
        ))}
      </group>
    </group>
  );
}
