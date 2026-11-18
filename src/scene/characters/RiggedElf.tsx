import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { christmasAudioEngine } from '../../audio/audioEngine';
import { useVillage } from '../../state/villageStore';
import { RealisticGift } from '../RealisticGift';

export type ElfActivity = 'walk' | 'carry' | 'tinker' | 'dance';

interface RiggedElfProps {
  tunicColor?: string;
  hatColor?: string;
  activity?: ElfActivity;
  carryGiftColor?: string;
  phase?: number;
  onTap?: () => void;
}

export function RiggedElf({
  tunicColor = '#1f7a4c',
  hatColor = '#c92c3c',
  activity = 'walk',
  carryGiftColor,
  phase = 0,
  onTap,
}: RiggedElfProps) {
  const { motionPaused, partyMode } = useVillage();

  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  const joySpinRef = useRef(0);
  const fabricNormal = useMemo(() => getFabricNormalMap(), []);
  const tunicGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.22, 0),
      new THREE.Vector2(0.19, 0.14),
      new THREE.Vector2(0.155, 0.28),
      new THREE.Vector2(0.13, 0.44),
      new THREE.Vector2(0.06, 0.48),
    ];
    return new THREE.LatheGeometry(pts, 18);
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + phase;
    const bands = christmasAudioEngine.bands;

    if (joySpinRef.current > 0) {
      joySpinRef.current = Math.max(0, joySpinRef.current - delta * 2.2);
    }

    if (
      !bodyRef.current ||
      !leftArmRef.current ||
      !rightArmRef.current ||
      !leftLegRef.current ||
      !rightLegRef.current ||
      !headRef.current
    ) {
      return;
    }

    if (motionPaused && joySpinRef.current === 0) return;

    const spinJump = Math.sin(joySpinRef.current * Math.PI);
    const grooveBoost = partyMode ? 1 + bands.energy * 0.7 : 1;

    if (activity === 'walk' || activity === 'carry') {
      const stride = Math.sin(t * 7.5);
      bodyRef.current.position.y = Math.abs(stride) * 0.05 + spinJump * 0.45;
      bodyRef.current.rotation.y = joySpinRef.current * Math.PI * 2;
      bodyRef.current.rotation.z = Math.cos(t * 7.5) * 0.04;

      leftLegRef.current.rotation.x = stride * 0.58;
      rightLegRef.current.rotation.x = -stride * 0.58;

      if (activity === 'carry') {
        leftArmRef.current.rotation.x = -0.95;
        rightArmRef.current.rotation.x = -0.95;
      } else {
        leftArmRef.current.rotation.x = -stride * 0.52;
        rightArmRef.current.rotation.x = stride * 0.52;
      }
      headRef.current.rotation.y = Math.sin(t * 1.8) * 0.14;
    } else if (activity === 'tinker') {
      const tap = Math.sin(t * 9.0);
      bodyRef.current.position.y = spinJump * 0.45;
      bodyRef.current.rotation.y = joySpinRef.current * Math.PI * 2;
      leftLegRef.current.rotation.x = 0;
      rightLegRef.current.rotation.x = 0;
      rightArmRef.current.rotation.x = -0.75 + tap * 0.55;
      leftArmRef.current.rotation.x = -0.55;
      headRef.current.rotation.x = 0.14 + Math.abs(tap) * 0.08;
    } else {
      // Dance / Cheer
      const bounce = Math.abs(Math.sin(t * 5.2 * grooveBoost));
      bodyRef.current.position.y = bounce * (partyMode ? 0.16 : 0.08) + spinJump * 0.48;
      bodyRef.current.rotation.y = joySpinRef.current * Math.PI * 2 + Math.sin(t * 2.5) * 0.22;
      leftArmRef.current.rotation.z = 0.45 + Math.sin(t * 5.2) * 0.4;
      rightArmRef.current.rotation.z = -0.45 - Math.sin(t * 5.2) * 0.4;
      leftArmRef.current.rotation.x = -0.6;
      rightArmRef.current.rotation.x = -0.6;
      leftLegRef.current.rotation.x = Math.sin(t * 5.2) * 0.22;
      rightLegRef.current.rotation.x = -Math.sin(t * 5.2) * 0.22;
    }
  });

  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        joySpinRef.current = 1;
        onTap?.();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {/* Grounded Contact Shadow */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial color="#0b172c" transparent opacity={0.28} depthWrite={false} />
      </mesh>

      <group ref={bodyRef}>
        {/* Legs & Curled Boots */}
        {[-0.085, 0.085].map((lx, idx) => (
          <group
            key={`leg-${lx}`}
            ref={idx === 0 ? leftLegRef : rightLegRef}
            position={[lx, 0.28, 0]}
          >
            <mesh position={[0, -0.12, 0]} castShadow>
              <capsuleGeometry args={[0.048, 0.12, 6, 10]} />
              <meshStandardMaterial color="#b92735" roughness={0.82} />
            </mesh>
            <mesh position={[0, -0.24, 0.04]} castShadow>
              <capsuleGeometry args={[0.056, 0.08, 6, 10]} />
              <meshStandardMaterial color="#3c2214" roughness={0.55} />
            </mesh>
          </group>
        ))}

        {/* Flared Wool Tunic & Leather Belt */}
        <mesh geometry={tunicGeo} position={[0, 0.25, 0]} castShadow receiveShadow>
          <meshStandardMaterial
            color={tunicColor}
            normalMap={fabricNormal}
            normalScale={new THREE.Vector2(0.35, 0.35)}
            roughness={0.86}
          />
        </mesh>
        <mesh position={[0, 0.39, 0]}>
          <cylinderGeometry args={[0.165, 0.175, 0.06, 16]} />
          <meshStandardMaterial color="#2a1911" roughness={0.44} />
        </mesh>
        <mesh position={[0, 0.39, 0.165]}>
          <boxGeometry args={[0.08, 0.075, 0.025]} />
          <meshStandardMaterial color="#f5c451" metalness={0.88} roughness={0.22} />
        </mesh>
        {/* Fluffy Fur Collar */}
        <mesh position={[0, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.12, 0.045, 10, 18]} />
          <meshStandardMaterial color="#f5f7fc" normalMap={fabricNormal} roughness={0.94} />
        </mesh>

        {/* Articulated Arms */}
        <group ref={leftArmRef} position={[-0.17, 0.62, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.042, 0.14, 6, 10]} />
            <meshStandardMaterial color={tunicColor} normalMap={fabricNormal} roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f2c4a2" roughness={0.6} />
          </mesh>
        </group>
        <group ref={rightArmRef} position={[0.17, 0.62, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow>
            <capsuleGeometry args={[0.042, 0.14, 6, 10]} />
            <meshStandardMaterial color={tunicColor} normalMap={fabricNormal} roughness={0.86} />
          </mesh>
          <mesh position={[0, -0.22, 0]}>
            <sphereGeometry args={[0.045, 10, 10]} />
            <meshStandardMaterial color="#f2c4a2" roughness={0.6} />
          </mesh>
        </group>

        {/* Carried Satin-Wrapped Gift Box */}
        {activity === 'carry' && carryGiftColor && (
          <RealisticGift
            position={[0, 0.42, 0.25]}
            scale={0.68}
            boxColor={carryGiftColor}
            ribbonColor="#f2c45a"
          />
        )}

        {/* Expressive Head + Ears + Floppy Hat */}
        <group ref={headRef} position={[0, 0.82, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.155, 16, 16]} />
            <meshStandardMaterial color="#f4c5a4" roughness={0.74} />
          </mesh>
          {/* Pointy Ears */}
          {[-0.16, 0.16].map((ex, i) => (
            <mesh
              key={`ear-${ex}`}
              position={[ex, 0.01, -0.01]}
              rotation={[0, 0, i === 0 ? 0.95 : -0.95]}
            >
              <coneGeometry args={[0.042, 0.11, 8]} />
              <meshStandardMaterial color="#f2bf9b" roughness={0.74} />
            </mesh>
          ))}
          {/* Eyes & Rosy Cheeks */}
          {[-0.055, 0.055].map((ex) => (
            <group key={`eye-${ex}`}>
              <mesh position={[ex, 0.03, 0.135]}>
                <sphereGeometry args={[0.022, 8, 8]} />
                <meshStandardMaterial color="#1d222e" roughness={0.3} />
              </mesh>
              <mesh position={[ex * 1.45, -0.025, 0.122]}>
                <sphereGeometry args={[0.026, 8, 8]} />
                <meshStandardMaterial color="#e67e85" roughness={0.8} />
              </mesh>
            </group>
          ))}
          {/* Nose */}
          <mesh position={[0, 0.005, 0.158]}>
            <sphereGeometry args={[0.026, 8, 8]} />
            <meshStandardMaterial color="#ebaa8c" roughness={0.7} />
          </mesh>
          {/* Pointed Hat & Golden Bell */}
          <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.14, 0.042, 8, 18]} />
            <meshStandardMaterial color="#f5f7fc" roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.25, -0.03]} rotation={[-0.2, 0, 0]} castShadow>
            <coneGeometry args={[0.135, 0.34, 14]} />
            <meshStandardMaterial color={hatColor} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.41, -0.07]}>
            <sphereGeometry args={[0.038, 10, 10]} />
            <meshStandardMaterial color="#f5c451" metalness={0.82} roughness={0.24} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
