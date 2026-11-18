import { useWoodPbr } from '../../assets/pbrMaterials';
import { useVillage } from '../../state/villageStore';
import { KenneyModel } from '../KenneyModel';
import { NordicChalet } from '../NordicChalet';
import { RealisticGift } from '../RealisticGift';
import { getGroundHeight } from '../terrainMath';

export function ElfWorkshop() {
  const { workshopBoostActive, triggerWorkshopBoost } = useVillage();
  const wood = useWoodPbr(1.5);

  const wx = -8.5;
  const wz = -3.8;
  const wy = getGroundHeight(wx, wz);

  return (
    <group
      name="elf-workshop"
      position={[wx, wy, wz]}
      rotation={[0, 0.58, 0]}
      onClick={(e) => {
        e.stopPropagation();
        triggerWorkshopBoost();
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      <NordicChalet
        width={4.6}
        depth={3.5}
        wallHeight={2.15}
        roofHeight={1.75}
        timberTint="#bd8f6a"
        doorColor="#235c3f"
        chimneySide={-1}
        smokeBoosted={workshopBoostActive}
        lightIntensity={workshopBoostActive ? 14 : 8.2}
      >
        {/* Toymaker Porch Props */}
        <KenneyModel model="candyCaneRed" position={[-0.78, 0.3, 2.08]} scale={1.15} />
        <KenneyModel model="candyCaneGreen" position={[0.78, 0.3, 2.08]} scale={1.15} />
        <KenneyModel
          model="nutcracker"
          position={[-1.95, 0.02, 2.35]}
          scale={1.1}
          rotation={[0, 0.15, 0]}
        />
        <KenneyModel
          model="nutcracker"
          position={[1.95, 0.02, 2.35]}
          scale={1.1}
          rotation={[0, -0.15, 0]}
        />

        {/* Outdoor Wrapping Workbench with Real Wood PBR & Satin Gifts */}
        <group position={[3.05, 0, 1.25]} rotation={[0, -0.35, 0]}>
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.65, 0.1, 0.92]} />
            <meshStandardMaterial
              map={wood.map}
              normalMap={wood.normalMap}
              roughnessMap={wood.roughnessMap}
              roughness={0.74}
            />
          </mesh>
          {[
            [-0.68, -0.34],
            [0.68, -0.34],
            [-0.68, 0.34],
            [0.68, 0.34],
          ].map(([lx, lz]) => (
            <mesh key={`leg-${lx}-${lz}`} position={[lx, 0.24, lz]} castShadow>
              <boxGeometry args={[0.1, 0.48, 0.1]} />
              <meshStandardMaterial map={wood.map} color="#583621" roughness={0.82} />
            </mesh>
          ))}
          <RealisticGift
            position={[-0.36, 0.53, 0.05]}
            boxColor="#9e1c2b"
            ribbonColor="#f2c45a"
            scale={0.85}
          />
          <RealisticGift
            position={[0.28, 0.53, -0.06]}
            boxColor="#1d6e46"
            ribbonColor="#e85b6a"
            scale={0.9}
          />
          <RealisticGift
            position={[-0.04, 0.81, 0.02]}
            boxColor="#235789"
            ribbonColor="#f2c45a"
            scale={0.7}
          />
        </group>

        {/* Stacked Presents Ready for Elf Carriers */}
        <RealisticGift
          position={[-2.35, 0.02, 1.45]}
          boxColor="#8f2431"
          ribbonColor="#f2c45a"
          scale={1.05}
        />
        <RealisticGift
          position={[-2.82, 0.02, 0.85]}
          boxColor="#236647"
          ribbonColor="#f2c45a"
          rotation={[0, 0.6, 0]}
          scale={0.95}
        />
        <RealisticGift
          position={[-2.28, 0.36, 1.38]}
          boxColor="#2e5984"
          ribbonColor="#f2c45a"
          scale={0.82}
        />
      </NordicChalet>
    </group>
  );
}
