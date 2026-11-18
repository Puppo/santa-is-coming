import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWoodPbr } from '../../assets/pbrMaterials';
import { useVillage } from '../../state/villageStore';
import { KenneyModel } from '../KenneyModel';
import { NordicChalet } from '../NordicChalet';
import { RealisticGift } from '../RealisticGift';
import { getGroundHeight } from '../terrainMath';

export function SantaCabin() {
  const { mailboxSwirlActive, triggerMailboxSwirl, motionPaused } = useVillage();
  const wood = useWoodPbr(1.5);
  const lettersRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const cx = 8.2;
  const cz = -4.2;
  const cy = getGroundHeight(cx, cz);

  useFrame((state) => {
    const inst = lettersRef.current;
    if (!inst) return;
    inst.visible = mailboxSwirlActive;
    if (!mailboxSwirlActive) return;

    const t = motionPaused ? 0.5 : state.clock.elapsedTime;
    for (let i = 0; i < 14; i++) {
      const life = (t * 0.65 + i / 14) % 1;
      const a = life * Math.PI * 4 + i * 0.8;
      const r = 0.35 + life * 1.1;
      dummy.position.set(-2.25 + Math.cos(a) * r, 0.95 + life * 2.8, 2.55 + Math.sin(a) * r);
      dummy.rotation.set(life * 4, a, life * 2);
      dummy.scale.setScalar(Math.sin(life * Math.PI) * 0.22);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <group name="santa-cabin" position={[cx, cy, cz]} rotation={[0, -0.62, 0]}>
      <NordicChalet
        width={4.1}
        depth={3.3}
        wallHeight={2.02}
        roofHeight={1.6}
        timberTint="#a97553"
        doorColor="#8b202b"
        chimneySide={1}
        lightIntensity={8.6}
      >
        {/* Stacked Firewood Rack Along Side Wall */}
        <group position={[2.32, 0.34, 0.2]}>
          {[0, 0.16, 0.32].map((yOff) =>
            [-0.28, 0, 0.28].map((zOff) => (
              <mesh
                key={`log-${yOff}-${zOff}`}
                position={[0, yOff, zOff]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry args={[0.08, 0.08, 0.45, 8]} />
                <meshStandardMaterial map={wood.map} color="#6b442a" roughness={0.86} />
              </mesh>
            )),
          )}
        </group>

        {/* Interactive North Pole Brass & Cast-Iron Mailbox */}
        <group
          position={[-2.25, 0, 2.55]}
          onClick={(e) => {
            e.stopPropagation();
            triggerMailboxSwirl();
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          <mesh position={[0, 0.48, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.095, 0.96, 12]} />
            <meshStandardMaterial map={wood.map} color="#462b1b" roughness={0.82} />
          </mesh>
          <mesh position={[0, 0.98, 0]} castShadow>
            <boxGeometry args={[0.42, 0.34, 0.56]} />
            <meshStandardMaterial color="#a91c2b" roughness={0.42} metalness={0.28} />
          </mesh>
          <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.21, 0.21, 0.56, 14, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#eef5ff" roughness={0.85} />
          </mesh>
          <mesh position={[0.22, 1.1, -0.1]} rotation={[0, 0, mailboxSwirlActive ? -0.2 : -0.85]}>
            <boxGeometry args={[0.04, 0.28, 0.04]} />
            <meshStandardMaterial color="#f5c451" metalness={0.75} roughness={0.28} />
          </mesh>
        </group>

        {/* Swirling Golden Wish Letters */}
        <instancedMesh ref={lettersRef} args={[undefined, undefined, 14]} visible={false}>
          <boxGeometry args={[1, 0.68, 0.12]} />
          <meshBasicMaterial color={[2.4, 1.85, 0.65]} toneMapped={false} />
        </instancedMesh>

        <KenneyModel
          model="gingerbreadMan"
          position={[2.25, 0.02, 2.05]}
          scale={1.12}
          rotation={[0, -0.4, 0]}
        />
        <RealisticGift
          position={[1.38, 0.28, 2.18]}
          boxColor="#9e1c2b"
          ribbonColor="#f2c45a"
          scale={0.92}
        />
      </NordicChalet>
    </group>
  );
}
