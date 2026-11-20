import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { useVillage } from '../../state/villageStore';
import {
  createGrumpCaughtCurve,
  createGrumpEscapedCurve,
  createGrumpSneakCurve,
  GRUMP_PEEK_POS,
  villageCollisionWorld,
} from '../collisionSystem';
import { RealisticGift } from '../RealisticGift';
import { getGroundHeight } from '../terrainMath';

export function HolidayGrump() {
  const { grumpState, catchGrump, motionPaused } = useVillage();
  const furNormal = useMemo(() => getFabricNormalMap(), []);

  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);

  const sneakCurve = useMemo(() => createGrumpSneakCurve(), []);
  const retreatCurveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const currentPosRef = useRef<[number, number]>([GRUMP_PEEK_POS[0], GRUMP_PEEK_POS[1]]);
  const phaseStartRef = useRef(0);
  const sneakProgressRef = useRef(0);
  const lastStateRef = useRef(grumpState);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    return () => {
      villageCollisionWorld.removeAgent('grump');
    };
  }, []);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;

    const clampedDelta = Math.min(delta, 0.1);
    const t = state.clock.elapsedTime;

    if (lastStateRef.current !== grumpState) {
      lastStateRef.current = grumpState;
      phaseStartRef.current = t;
      if (grumpState === 'sneaking' || grumpState === 'peeking') {
        sneakProgressRef.current = 0;
        retreatCurveRef.current = null;
      } else if (grumpState === 'caught') {
        retreatCurveRef.current = createGrumpCaughtCurve(
          currentPosRef.current[0],
          currentPosRef.current[1],
        );
      } else if (grumpState === 'escaped') {
        retreatCurveRef.current = createGrumpEscapedCurve(
          currentPosRef.current[0],
          currentPosRef.current[1],
        );
      }
    }

    if (grumpState === 'idle') {
      root.visible = false;
      villageCollisionWorld.removeAgent('grump');
      return;
    }

    root.visible = true;
    const elapsed = t - phaseStartRef.current;

    if (grumpState === 'peeking') {
      const [px, pz] = GRUMP_PEEK_POS;
      const pop = Math.min(1, elapsed * 1.4);
      const resolved = villageCollisionWorld.resolveAgent(
        'grump',
        px + (1 - pop) * -0.45,
        pz,
        0.34,
        30,
      );
      currentPosRef.current = [resolved.x, resolved.z];
      root.position.set(resolved.x, getGroundHeight(resolved.x, resolved.z), resolved.z);
      root.lookAt(0, 0.5, 0);
      if (bodyRef.current) {
        bodyRef.current.rotation.y = Math.sin(t * 2.5) * 0.35;
        bodyRef.current.position.y = 0;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -0.5;
        rightArmRef.current.rotation.x = -0.5;
      }
    } else if (grumpState === 'sneaking') {
      sneakCurve.getPointAt(Math.min(1, sneakProgressRef.current), tmpPos);
      const shouldYield =
        !motionPaused && villageCollisionWorld.shouldYield('grump', tmpPos.x, tmpPos.z, 0.34, 30);
      if (!motionPaused && !shouldYield) {
        sneakProgressRef.current = Math.min(1, sneakProgressRef.current + clampedDelta / 11);
      }

      const u = motionPaused ? 0.5 : sneakProgressRef.current;
      sneakCurve.getPointAt(u, tmpPos);
      sneakCurve.getPointAt(Math.min(1, u + 0.02), tmpNext);
      const resolved = villageCollisionWorld.resolveAgent('grump', tmpPos.x, tmpPos.z, 0.34, 30);
      const blend = 1 - Math.exp(-clampedDelta * 12);
      const renderX = THREE.MathUtils.lerp(currentPosRef.current[0], resolved.x, blend);
      const renderZ = THREE.MathUtils.lerp(currentPosRef.current[1], resolved.z, blend);
      currentPosRef.current = [renderX, renderZ];

      const lookX = tmpNext.x + (resolved.x - tmpPos.x);
      const lookZ = tmpNext.z + (resolved.z - tmpPos.z);
      root.position.set(renderX, getGroundHeight(renderX, renderZ), renderZ);
      root.lookAt(lookX, getGroundHeight(lookX, lookZ), lookZ);

      // Exaggerated sneaky tiptoe cycle
      const step = motionPaused || shouldYield ? 0 : Math.sin(t * 6.8);
      if (bodyRef.current) {
        bodyRef.current.position.y = Math.abs(step) * 0.08;
        bodyRef.current.rotation.x = 0.22; // hunched sneak posture
      }
      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = step * 0.72;
        rightLegRef.current.rotation.x = -step * 0.72;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.x = -1.05;
        rightArmRef.current.rotation.x = -1.05;
      }
    } else if (grumpState === 'caught') {
      const k = Math.min(1, elapsed / 3.4);
      const curve = retreatCurveRef.current ?? createGrumpCaughtCurve(0.55, -4.35);
      curve.getPointAt(k, tmpPos);
      curve.getPointAt(Math.min(1, k + 0.03), tmpNext);
      const resolved = villageCollisionWorld.resolveAgent('grump', tmpPos.x, tmpPos.z, 0.34, 30);
      currentPosRef.current = [resolved.x, resolved.z];

      const jumpArc =
        k < 0.28 ? Math.sin((k / 0.28) * Math.PI) * 1.45 : Math.abs(Math.sin(t * 13)) * 0.16;

      root.position.set(resolved.x, getGroundHeight(resolved.x, resolved.z) + jumpArc, resolved.z);
      root.lookAt(tmpNext.x, 0.5, tmpNext.z);
      if (bodyRef.current) {
        bodyRef.current.rotation.x = 0;
        bodyRef.current.rotation.y = k < 0.35 ? k * Math.PI * 8 : 0;
      }
      if (leftArmRef.current && rightArmRef.current) {
        leftArmRef.current.rotation.z = 1.9;
        rightArmRef.current.rotation.z = -1.9;
      }
      if (leftLegRef.current && rightLegRef.current) {
        const sprint = Math.sin(t * 18);
        leftLegRef.current.rotation.x = sprint * 0.85;
        rightLegRef.current.rotation.x = -sprint * 0.85;
      }
    } else if (grumpState === 'escaped') {
      const k = Math.min(1, elapsed / 2.6);
      const curve = retreatCurveRef.current ?? createGrumpEscapedCurve(0.55, -4.35);
      curve.getPointAt(k, tmpPos);
      curve.getPointAt(Math.min(1, k + 0.03), tmpNext);
      const resolved = villageCollisionWorld.resolveAgent('grump', tmpPos.x, tmpPos.z, 0.34, 30);
      currentPosRef.current = [resolved.x, resolved.z];

      root.position.set(resolved.x, getGroundHeight(resolved.x, resolved.z), resolved.z);
      root.lookAt(tmpNext.x, 0.5, tmpNext.z);
      if (bodyRef.current) {
        bodyRef.current.rotation.y = 0;
        bodyRef.current.rotation.x = 0.1;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      name="holiday-grump"
      visible={false}
      onClick={(e) => {
        e.stopPropagation();
        catchGrump();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Contact shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.32, 16]} />
        <meshBasicMaterial color="#0b172c" transparent opacity={0.32} depthWrite={false} />
      </mesh>

      <group ref={bodyRef}>
        {/* Fuzzy Green Legs & Boots */}
        {[-0.11, 0.11].map((lx, idx) => (
          <group
            key={`leg-${lx}`}
            ref={idx === 0 ? leftLegRef : rightLegRef}
            position={[lx, 0.36, 0]}
          >
            <mesh position={[0, -0.15, 0]} castShadow>
              <capsuleGeometry args={[0.058, 0.18, 6, 10]} />
              <meshStandardMaterial color="#3c9e42" roughness={0.92} />
            </mesh>
            <mesh position={[0, -0.3, 0.06]} castShadow>
              <capsuleGeometry args={[0.06, 0.12, 6, 10]} />
              <meshStandardMaterial color="#7a1c28" roughness={0.75} />
            </mesh>
          </group>
        ))}

        {/* Pear-Shaped Fuzzy Forest Gremlin Torso */}
        <mesh position={[0, 0.62, 0]} scale={[1.05, 1.28, 0.92]} castShadow receiveShadow>
          <sphereGeometry args={[0.24, 18, 18]} />
          <meshStandardMaterial
            color="#3e9d44"
            normalMap={furNormal}
            normalScale={new THREE.Vector2(0.55, 0.55)}
            roughness={0.92}
          />
        </mesh>

        {/* Crooked Cranberry & Gold Scarf */}
        <mesh position={[0, 0.88, 0]} rotation={[Math.PI / 2 + 0.1, 0, 0.1]}>
          <torusGeometry args={[0.15, 0.055, 10, 20]} />
          <meshStandardMaterial color="#a61c2b" normalMap={furNormal} roughness={0.88} />
        </mesh>
        <mesh position={[0.12, 0.72, 0.14]} rotation={[0.15, 0, -0.25]}>
          <boxGeometry args={[0.09, 0.28, 0.04]} />
          <meshStandardMaterial color="#eab343" normalMap={furNormal} roughness={0.86} />
        </mesh>

        {/* Sneaky Arms */}
        <group ref={leftArmRef} position={[-0.22, 0.8, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.18, 6, 10]} />
            <meshStandardMaterial color="#3e9d44" normalMap={furNormal} roughness={0.92} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.22, 0.8, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.048, 0.18, 6, 10]} />
            <meshStandardMaterial color="#3e9d44" normalMap={furNormal} roughness={0.92} />
          </mesh>
        </group>

        {/* Stolen Present while Sneaking */}
        {grumpState === 'sneaking' && (
          <RealisticGift
            position={[0, 0.58, 0.34]}
            scale={0.82}
            rotation={[0.2, 0.5, 0.1]}
            boxColor="#9e1c2b"
            ribbonColor="#f2c45a"
          />
        )}

        {/* Mischievous Head, Tufted Crest, Pointy Ears & Glowing Amber Eyes */}
        <group position={[0, 1.07, 0.02]}>
          <mesh scale={[0.96, 1.12, 0.96]} castShadow>
            <sphereGeometry args={[0.18, 16, 16]} />
            <meshStandardMaterial color="#4bbf51" roughness={0.9} />
          </mesh>
          {/* Scruffy Hair Tuft */}
          <mesh position={[0, 0.21, -0.02]} rotation={[-0.2, 0, 0.15]}>
            <coneGeometry args={[0.065, 0.14, 8]} />
            <meshStandardMaterial color="#2c8432" roughness={0.92} />
          </mesh>
          {/* Pointy Ears */}
          {[-0.19, 0.19].map((ex, i) => (
            <mesh
              key={`ear-${ex}`}
              position={[ex, 0.02, -0.02]}
              rotation={[0, 0, i === 0 ? 1.15 : -1.15]}
            >
              <coneGeometry args={[0.045, 0.14, 8]} />
              <meshStandardMaterial color="#43ad49" roughness={0.92} />
            </mesh>
          ))}
          {/* Glowing Mischievous Yellow Eyes & Slanted Brows */}
          {[-0.065, 0.065].map((ex, i) => (
            <group key={`eye-${ex}`} position={[ex, 0.035, 0.155]}>
              <mesh>
                <sphereGeometry args={[0.032, 10, 10]} />
                <meshBasicMaterial color={[2.2, 1.9, 0.3]} toneMapped={false} />
              </mesh>
              <mesh position={[0, 0, 0.022]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial color="#111" roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.042, 0.01]} rotation={[0, 0, i === 0 ? -0.38 : 0.38]}>
                <boxGeometry args={[0.075, 0.018, 0.02]} />
                <meshStandardMaterial color="#1c5421" roughness={0.88} />
              </mesh>
            </group>
          ))}
          {/* Cheeky Grin */}
          <mesh position={[0, -0.055, 0.16]} rotation={[0.1, 0, Math.PI]}>
            <torusGeometry args={[0.065, 0.012, 6, 12, Math.PI]} />
            <meshStandardMaterial color="#1b3d1e" roughness={0.7} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
