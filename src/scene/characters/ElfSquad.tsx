import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { playMagicChime } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';
import {
  CARRIER_LOOP_SPEED,
  createCarrierLoopCurve,
  STATIC_ELF_PLACEMENTS,
  villageCollisionWorld,
} from '../collisionSystem';
import { getGroundHeight } from '../terrainMath';
import { RiggedElf } from './RiggedElf';

interface CarrierDef {
  tunicColor: string;
  hatColor: string;
  giftColor: string;
  offset: number;
}

const CARRIERS: CarrierDef[] = [
  { tunicColor: '#1f7a4c', hatColor: '#c92c3c', giftColor: '#9e1c2b', offset: 0.0 },
  { tunicColor: '#b92735', hatColor: '#1f7a4c', giftColor: '#1d6e46', offset: 0.25 },
  { tunicColor: '#1b6d6d', hatColor: '#d49a2a', giftColor: '#235789', offset: 0.5 },
  { tunicColor: '#7a2548', hatColor: '#1f7a4c', giftColor: '#8f2431', offset: 0.75 },
];

export function ElfSquad() {
  const { motionPaused, workshopBoostActive, partyMode, announceKey } = useVillage();
  const carrierRefs = useRef<Array<THREE.Group | null>>([]);
  const progressRefs = useRef<number[]>(CARRIERS.map((c) => c.offset));

  const carrierPath = useMemo(() => createCarrierLoopCurve(), []);
  const smoothedPosRef = useRef<Array<[number, number]>>(
    CARRIERS.map((elf) => {
      const p = carrierPath.getPointAt(elf.offset);
      return [p.x, p.z];
    }),
  );

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    return () => {
      CARRIERS.forEach((_, i) => {
        villageCollisionWorld.removeAgent(`carrier-${i}`);
      });
    };
  }, []);

  useFrame((_, delta) => {
    const clampedDelta = Math.min(delta, 0.1);
    const speedMult = workshopBoostActive ? 1.75 : partyMode ? 1.25 : 1.0;

    CARRIERS.forEach((_, i) => {
      const grp = carrierRefs.current[i];
      if (!grp) return;

      const u = progressRefs.current[i];
      carrierPath.getPointAt(u, tmpPos);
      const shouldYield =
        !motionPaused &&
        villageCollisionWorld.shouldYield(`carrier-${i}`, tmpPos.x, tmpPos.z, 0.3, 40);

      if (!motionPaused && !shouldYield) {
        progressRefs.current[i] = (u + clampedDelta * CARRIER_LOOP_SPEED * speedMult) % 1;
      }

      const activeU = progressRefs.current[i];
      carrierPath.getPointAt(activeU, tmpPos);
      carrierPath.getPointAt((activeU + 0.01) % 1, tmpNext);

      const resolved = villageCollisionWorld.resolveAgent(
        `carrier-${i}`,
        tmpPos.x,
        tmpPos.z,
        0.3,
        40,
      );
      const blend = 1 - Math.exp(-clampedDelta * 12);
      const prev = smoothedPosRef.current[i];
      const renderX = THREE.MathUtils.lerp(prev[0], resolved.x, blend);
      const renderZ = THREE.MathUtils.lerp(prev[1], resolved.z, blend);
      prev[0] = renderX;
      prev[1] = renderZ;

      const lookX = tmpNext.x + (resolved.x - tmpPos.x);
      const lookZ = tmpNext.z + (resolved.z - tmpPos.z);
      const y = getGroundHeight(renderX, renderZ);
      const ny = getGroundHeight(lookX, lookZ);
      grp.position.set(renderX, y, renderZ);
      grp.lookAt(lookX, ny, lookZ);
    });
  });

  const handleElfTap = () => {
    playMagicChime();
    announceKey('toasts.elfWave');
  };

  return (
    <group name="elf-squad">
      {/* 4 Gift-Carrier Elves patrolling Workshop -> Sleigh */}
      {CARRIERS.map((elf, idx) => (
        <group
          key={`carrier-${elf.offset}`}
          ref={(el) => {
            carrierRefs.current[idx] = el;
          }}
        >
          <RiggedElf
            tunicColor={elf.tunicColor}
            hatColor={elf.hatColor}
            activity="carry"
            carryGiftColor={elf.giftColor}
            phase={idx * 1.4}
            onTap={handleElfTap}
          />
        </group>
      ))}

      {/* 2 Tinkerer Elves & 2 Cheerful Plaza Dancers in verified conflict-free spots */}
      {STATIC_ELF_PLACEMENTS.map((elf) => (
        <group
          key={elf.id}
          position={[elf.x, getGroundHeight(elf.x, elf.z), elf.z]}
          rotation={[0, elf.rotY, 0]}
        >
          <RiggedElf
            tunicColor={elf.tunicColor}
            hatColor={elf.hatColor}
            activity={elf.activity}
            phase={elf.phase}
            onTap={handleElfTap}
          />
        </group>
      ))}
    </group>
  );
}
