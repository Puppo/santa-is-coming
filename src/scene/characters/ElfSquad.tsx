import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { playMagicChime } from '../../audio/soundEffects';
import { useVillage } from '../../state/villageStore';
import { getGroundHeight } from '../terrainMath';
import { RiggedElf } from './RiggedElf';

interface CarrierDef {
  tunicColor: string;
  hatColor: string;
  giftColor: string;
  offset: number;
  speed: number;
}

const CARRIERS: CarrierDef[] = [
  { tunicColor: '#1f7a4c', hatColor: '#c92c3c', giftColor: '#9e1c2b', offset: 0.0, speed: 0.055 },
  { tunicColor: '#b92735', hatColor: '#1f7a4c', giftColor: '#1d6e46', offset: 0.25, speed: 0.052 },
  { tunicColor: '#1b6d6d', hatColor: '#d49a2a', giftColor: '#235789', offset: 0.5, speed: 0.058 },
  { tunicColor: '#7a2548', hatColor: '#1f7a4c', giftColor: '#8f2431', offset: 0.75, speed: 0.05 },
];

export function ElfSquad() {
  const { motionPaused, workshopBoostActive, partyMode, announceKey } = useVillage();
  const carrierRefs = useRef<Array<THREE.Group | null>>([]);
  const progressRefs = useRef<number[]>(CARRIERS.map((c) => c.offset));

  // Stone path loop between Elf Workshop door and Sleigh Paddock
  const carrierPath = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-6.7, 0, -1.6),
          new THREE.Vector3(-6.9, 0, 3.2),
          new THREE.Vector3(-4.4, 0, 7.6),
          new THREE.Vector3(-2.3, 0, 8.6),
          new THREE.Vector3(-4.0, 0, 6.4),
          new THREE.Vector3(-5.8, 0, 2.2),
        ],
        true,
      ),
    [],
  );

  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const speedMult = workshopBoostActive ? 1.75 : partyMode ? 1.25 : 1.0;

    CARRIERS.forEach((elf, i) => {
      const grp = carrierRefs.current[i];
      if (!grp) return;
      if (!motionPaused) {
        progressRefs.current[i] = (progressRefs.current[i] + delta * elf.speed * speedMult) % 1;
      }
      const u = progressRefs.current[i];
      carrierPath.getPointAt(u, tmpPos);
      carrierPath.getPointAt((u + 0.01) % 1, tmpNext);

      const y = getGroundHeight(tmpPos.x, tmpPos.z);
      const ny = getGroundHeight(tmpNext.x, tmpNext.z);
      grp.position.set(tmpPos.x, y, tmpPos.z);
      grp.lookAt(tmpNext.x, ny, tmpNext.z);
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

      {/* 2 Tinkerer Elves outside Workshop Workbench */}
      <group position={[-5.4, getGroundHeight(-5.4, -4.4), -4.4]} rotation={[0, 2.2, 0]}>
        <RiggedElf
          tunicColor="#1f7a4c"
          hatColor="#d49a2a"
          activity="tinker"
          phase={0.5}
          onTap={handleElfTap}
        />
      </group>
      <group position={[-6.0, getGroundHeight(-6.0, -5.2), -5.2]} rotation={[0, 1.3, 0]}>
        <RiggedElf
          tunicColor="#1b6d6d"
          hatColor="#c92c3c"
          activity="tinker"
          phase={2.1}
          onTap={handleElfTap}
        />
      </group>

      {/* 2 Cheerful Plaza & Pond Elves */}
      <group position={[2.2, getGroundHeight(2.2, 1.9), 1.9]} rotation={[0, -0.7, 0]}>
        <RiggedElf
          tunicColor="#b92735"
          hatColor="#1f7a4c"
          activity="dance"
          phase={0.8}
          onTap={handleElfTap}
        />
      </group>
      <group position={[-1.9, getGroundHeight(-1.9, 2.2), 2.2]} rotation={[0, 0.7, 0]}>
        <RiggedElf
          tunicColor="#1f7a4c"
          hatColor="#c92c3c"
          activity="dance"
          phase={3.1}
          onTap={handleElfTap}
        />
      </group>
    </group>
  );
}
