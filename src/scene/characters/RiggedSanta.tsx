import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { christmasAudioEngine } from '../../audio/audioEngine';
import { playSleighBells } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';
import { getGroundHeight } from '../terrainMath';

interface SantaFigureProps {
  showContactShadow?: boolean;
  leftArmRef?: RefObject<THREE.Group | null>;
  rightArmRef?: RefObject<THREE.Group | null>;
  leftLegRef?: RefObject<THREE.Group | null>;
  rightLegRef?: RefObject<THREE.Group | null>;
  headRef?: RefObject<THREE.Group | null>;
}

/**
 * Shared articulated Santa geometry used both on the village plaza patrol and seated in the sleigh.
 */
function SantaFigure({
  showContactShadow = true,
  leftArmRef,
  rightArmRef,
  leftLegRef,
  rightLegRef,
  headRef,
}: SantaFigureProps) {
  const fabricNormal = useMemo(() => getFabricNormalMap(), []);
  const coatGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.36, 0),
      new THREE.Vector2(0.34, 0.2),
      new THREE.Vector2(0.31, 0.4),
      new THREE.Vector2(0.24, 0.56),
      new THREE.Vector2(0.11, 0.64),
    ];
    return new THREE.LatheGeometry(pts, 22);
  }, []);

  return (
    <>
      {showContactShadow && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.38, 18]} />
          <meshBasicMaterial color="#0b172c" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {/* Sturdy Winter Boots */}
      {[-0.13, 0.13].map((lx, i) => (
        <group key={`boot-${lx}`} ref={i === 0 ? leftLegRef : rightLegRef} position={[lx, 0.36, 0]}>
          <mesh position={[0, -0.14, 0]} castShadow>
            <capsuleGeometry args={[0.078, 0.16, 6, 10]} />
            <meshStandardMaterial color="#b41c2c" roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.28, 0.05]} castShadow>
            <capsuleGeometry args={[0.082, 0.1, 6, 10]} />
            <meshStandardMaterial color="#1f1713" roughness={0.48} />
          </mesh>
        </group>
      ))}

      {/* Jolly Velvet Coat & Shearling Trim */}
      <mesh geometry={coatGeo} position={[0, 0.38, 0]} castShadow receiveShadow>
        <meshStandardMaterial
          color="#9e1726"
          normalMap={fabricNormal}
          normalScale={new THREE.Vector2(0.4, 0.4)}
          roughness={0.86}
        />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.34, 0.062, 12, 24]} />
        <meshStandardMaterial color="#f5f8fd" normalMap={fabricNormal} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.68, 0.28]}>
        <boxGeometry args={[0.09, 0.42, 0.06]} />
        <meshStandardMaterial color="#f5f8fd" normalMap={fabricNormal} roughness={0.95} />
      </mesh>

      {/* Black Leather Belt + Gold Buckle */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.335, 0.335, 0.09, 20]} />
        <meshStandardMaterial color="#1f1713" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.62, 0.33]}>
        <boxGeometry args={[0.13, 0.12, 0.04]} />
        <meshStandardMaterial color="#f5c451" metalness={0.86} roughness={0.22} />
      </mesh>

      {/* Arms & Mittens */}
      <group ref={leftArmRef} position={[-0.31, 0.84, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.18, 6, 10]} />
          <meshStandardMaterial color="#b91c2c" roughness={0.84} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.072, 10, 10]} />
          <meshStandardMaterial color="#f5f8fd" roughness={0.92} />
        </mesh>
      </group>
      <group ref={rightArmRef} position={[0.31, 0.84, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.068, 0.18, 6, 10]} />
          <meshStandardMaterial color="#b91c2c" roughness={0.84} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.072, 10, 10]} />
          <meshStandardMaterial color="#f5f8fd" roughness={0.92} />
        </mesh>
      </group>

      {/* Head, Beard, Mustache, Glasses & Santa Hat */}
      <group ref={headRef} position={[0, 1.09, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.19, 16, 16]} />
          <meshStandardMaterial color="#f4c5a4" roughness={0.72} />
        </mesh>
        {/* Full Layered White Beard */}
        <mesh position={[0, -0.11, 0.13]} castShadow>
          <sphereGeometry args={[0.155, 14, 14]} />
          <meshStandardMaterial color="#f7f9fe" roughness={0.94} />
        </mesh>
        <mesh position={[0, -0.22, 0.1]} scale={[0.8, 1.15, 0.65]}>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#f7f9fe" roughness={0.94} />
        </mesh>
        {/* Mustache & Rosy Nose */}
        {[-0.055, 0.055].map((mx, i) => (
          <mesh
            key={`mustache-${mx}`}
            position={[mx, -0.03, 0.19]}
            rotation={[0, 0, i === 0 ? 0.25 : -0.25]}
            scale={[1.3, 0.7, 0.7]}
          >
            <sphereGeometry args={[0.046, 10, 10]} />
            <meshStandardMaterial color="#ffffff" roughness={0.92} />
          </mesh>
        ))}
        <mesh position={[0, 0.01, 0.2]}>
          <sphereGeometry args={[0.036, 10, 10]} />
          <meshStandardMaterial color="#e67e7e" roughness={0.65} />
        </mesh>
        {/* Spectacles & Eyes */}
        {[-0.062, 0.062].map((ex) => (
          <group key={`eye-${ex}`} position={[ex, 0.055, 0.165]}>
            <mesh>
              <sphereGeometry args={[0.022, 8, 8]} />
              <meshStandardMaterial color="#1d222e" roughness={0.25} />
            </mesh>
            <mesh position={[0, 0, 0.015]}>
              <torusGeometry args={[0.035, 0.006, 6, 14]} />
              <meshStandardMaterial color="#eab343" metalness={0.8} roughness={0.25} />
            </mesh>
          </group>
        ))}
        {/* Fur-Trimmed Santa Hat */}
        <mesh position={[0, 0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.175, 0.052, 8, 18]} />
          <meshStandardMaterial color="#f7f9fe" roughness={0.95} />
        </mesh>
        <mesh position={[0, 0.27, -0.05]} rotation={[-0.28, 0, 0]} castShadow>
          <coneGeometry args={[0.165, 0.36, 16]} />
          <meshStandardMaterial color="#b91c2c" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.42, -0.14]}>
          <sphereGeometry args={[0.052, 10, 10]} />
          <meshStandardMaterial color="#f7f9fe" roughness={0.95} />
        </mesh>
      </group>
    </>
  );
}

/**
 * Seated Santa holding leather reins and waving from the flying sleigh during test flights.
 */
export function SleighSanta() {
  const { sleighFlightActive, motionPaused } = useVillage();
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);

  const reinGeometries = useMemo(
    () =>
      [-1, 1].map((side) => {
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.28, 0.94, 0.62),
          new THREE.Vector3(side * 0.22, 0.88, 1.12),
          new THREE.Vector3(side * 0.45, 0.58, 2.05),
        ]);
        return new THREE.TubeGeometry(curve, 14, 0.014, 6, false);
      }),
    [],
  );

  useFrame((state) => {
    if (!sleighFlightActive) return;
    const t = state.clock.elapsedTime;
    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = -1.08;
      rightLegRef.current.rotation.x = -1.08;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = -0.98 + (motionPaused ? 0 : Math.sin(t * 7) * 0.08);
      leftArmRef.current.rotation.z = 0.16;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.z = -2.28 + (motionPaused ? 0 : Math.sin(t * 9.5) * 0.34);
      rightArmRef.current.rotation.x = -0.32;
    }
    if (headRef.current) {
      headRef.current.rotation.y = motionPaused ? 0 : Math.sin(t * 2.4) * 0.24;
      headRef.current.rotation.x = -0.06;
    }
  });

  return (
    <group name="sleigh-santa" visible={sleighFlightActive}>
      <group position={[0, 0.29, 0.36]} scale={1.06}>
        <SantaFigure
          showContactShadow={false}
          leftArmRef={leftArmRef}
          rightArmRef={rightArmRef}
          leftLegRef={leftLegRef}
          rightLegRef={rightLegRef}
          headRef={headRef}
        />
      </group>
      {reinGeometries.map((geo, idx) => (
        <mesh key={`rein-${idx === 0 ? 'left' : 'right'}`} geometry={geo}>
          <meshStandardMaterial color="#4a2612" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function RiggedSanta() {
  const { motionPaused, partyMode, sleighFlightActive, announceKey } = useVillage();

  const rootRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0.1);
  const waveBurstRef = useRef(0);

  const patrolCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(5.6, 0, -2.0),
          new THREE.Vector3(2.8, 0, -1.0),
          new THREE.Vector3(2.2, 0, 2.2),
          new THREE.Vector3(0.4, 0, 6.4),
          new THREE.Vector3(2.4, 0, 3.6),
          new THREE.Vector3(4.2, 0, -0.6),
        ],
        true,
      ),
    [],
  );

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;

    if (waveBurstRef.current > 0) {
      waveBurstRef.current = Math.max(0, waveBurstRef.current - delta * 0.7);
    }

    // Hide ground Santa while he rides in the Sleigh Test Flight
    root.visible = !sleighFlightActive;
    if (sleighFlightActive) return;

    if (!motionPaused) {
      progressRef.current = (progressRef.current + delta * 0.026) % 1;
    }

    const u = progressRef.current;
    patrolCurve.getPointAt(u, tmpPos);
    patrolCurve.getPointAt((u + 0.012) % 1, tmpNext);

    const t = state.clock.elapsedTime;
    const stride = motionPaused ? 0 : Math.sin(t * 5.2);
    const groundY = getGroundHeight(tmpPos.x, tmpPos.z);
    const nextY = getGroundHeight(tmpNext.x, tmpNext.z);

    const bounce =
      partyMode && !motionPaused ? Math.abs(Math.sin(t * 4.5)) * 0.14 : Math.abs(stride) * 0.04;
    root.position.set(tmpPos.x, groundY + bounce, tmpPos.z);
    root.lookAt(tmpNext.x, nextY, tmpNext.z);

    if (leftLegRef.current && rightLegRef.current) {
      leftLegRef.current.rotation.x = stride * 0.42;
      rightLegRef.current.rotation.x = -stride * 0.42;
    }
    if (leftArmRef.current && rightArmRef.current) {
      const bands = christmasAudioEngine.bands;
      if (waveBurstRef.current > 0) {
        rightArmRef.current.rotation.z = -2.2 + Math.sin(t * 14) * 0.35;
        leftArmRef.current.rotation.x = -stride * 0.3;
      } else if (partyMode && !motionPaused) {
        rightArmRef.current.rotation.z = -1.1 - bands.mid * 0.6;
        leftArmRef.current.rotation.z = 1.1 + bands.mid * 0.6;
      } else {
        rightArmRef.current.rotation.z = -0.15;
        leftArmRef.current.rotation.z = 0.15;
        rightArmRef.current.rotation.x = stride * 0.38;
        leftArmRef.current.rotation.x = -stride * 0.38;
      }
    }
  });

  return (
    <group
      ref={rootRef}
      name="rigged-santa"
      onClick={(e) => {
        e.stopPropagation();
        waveBurstRef.current = 1;
        playSleighBells();
        announceKey('toasts.santaWave');
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <SantaFigure
        showContactShadow
        leftArmRef={leftArmRef}
        rightArmRef={rightArmRef}
        leftLegRef={leftLegRef}
        rightLegRef={rightLegRef}
      />
    </group>
  );
}
