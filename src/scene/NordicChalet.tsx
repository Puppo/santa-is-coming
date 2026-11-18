import { type ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import { useSnowPbr, useStonePbr, useWoodPbr } from '../assets/pbrMaterials';
import { ChimneySmoke } from './ChimneySmoke';
import { KenneyModel } from './KenneyModel';
import { WarmWoodenLantern } from './PolyHavenProp';

interface NordicChaletProps {
  width: number;
  depth: number;
  wallHeight?: number;
  roofHeight?: number;
  timberTint?: string;
  doorColor?: string;
  chimneySide?: -1 | 1;
  smokeBoosted?: boolean;
  lightIntensity?: number;
  children?: ReactNode;
}

function MullionedWindow({
  position,
  rotationY = 0,
  width = 0.88,
  height = 0.92,
  frameColor = '#3f2618',
}: {
  position: [number, number, number];
  rotationY?: number;
  width?: number;
  height?: number;
  frameColor?: string;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Warm Cozy Lit Room Interior Backplane */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[width - 0.08, height - 0.08]} />
        <meshBasicMaterial color={[2.25, 1.48, 0.68]} toneMapped={false} />
      </mesh>
      {/* Reflective Frosted Glass Pane */}
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width - 0.06, height - 0.06]} />
        <meshPhysicalMaterial
          color="#ffe2b0"
          roughness={0.1}
          metalness={0.05}
          transparent
          opacity={0.38}
          clearcoat={1}
        />
      </mesh>
      {/* Outer Timber Casing */}
      {[
        [0, height * 0.5, width + 0.08, 0.08],
        [0, -height * 0.5, width + 0.14, 0.1],
      ].map(([x, y, w, h]) => (
        <mesh key={`h-${y}`} position={[x, y, 0.04]} castShadow>
          <boxGeometry args={[w, h, 0.12]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} />
        </mesh>
      ))}
      {[-width * 0.5, width * 0.5].map((x) => (
        <mesh key={`v-${x}`} position={[x, 0, 0.04]} castShadow>
          <boxGeometry args={[0.08, height + 0.08, 0.12]} />
          <meshStandardMaterial color={frameColor} roughness={0.78} />
        </mesh>
      ))}
      {/* Inner Muntin Crossbars */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[width - 0.04, 0.045, 0.05]} />
        <meshStandardMaterial color={frameColor} roughness={0.75} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[0.045, height - 0.04, 0.05]} />
        <meshStandardMaterial color={frameColor} roughness={0.75} />
      </mesh>
      {/* Snow on Window Sill */}
      <mesh position={[0, -height * 0.5 + 0.06, 0.06]}>
        <boxGeometry args={[width + 0.12, 0.05, 0.08]} />
        <meshStandardMaterial color="#eef5ff" roughness={0.86} />
      </mesh>
    </group>
  );
}

/**
 * True stacked-log and river-stone Nordic chalet with gabled snow-draped A-frame roof,
 * icicles, recessed mullioned windows, timber porch, and smoking stone chimney.
 */
export function NordicChalet({
  width,
  depth,
  wallHeight = 2.05,
  roofHeight = 1.65,
  timberTint = '#b88c68',
  doorColor = '#6e2128',
  chimneySide = -1,
  smokeBoosted = false,
  lightIntensity = 8,
  children,
}: NordicChaletProps) {
  const wood = useWoodPbr(2.5, 1.5);
  const stone = useStonePbr(2.5, 1.2);
  const snow = useSnowPbr(3, 2);

  // Triangular gable roof prism extruded along depth
  const { gableGeo, snowCapGeo, icicles } = useMemo(() => {
    const overhangX = width * 0.5 + 0.52;
    const overhangZ = depth + 0.85;

    const gableShape = new THREE.Shape();
    gableShape.moveTo(-overhangX, 0);
    gableShape.lineTo(0, roofHeight);
    gableShape.lineTo(overhangX, 0);
    gableShape.closePath();

    const gGeo = new THREE.ExtrudeGeometry(gableShape, {
      depth: overhangZ,
      bevelEnabled: false,
    });
    gGeo.translate(0, 0, -overhangZ * 0.5);
    gGeo.computeVertexNormals();

    // Thick undulating snow slab draped atop both roof slopes
    const capThickness = 0.19;
    const capShape = new THREE.Shape();
    capShape.moveTo(-overhangX - 0.08, -0.02);
    capShape.lineTo(0, roofHeight + 0.02);
    capShape.lineTo(overhangX + 0.08, -0.02);
    capShape.lineTo(overhangX + 0.08, capThickness);
    capShape.lineTo(0, roofHeight + capThickness + 0.08);
    capShape.lineTo(-overhangX - 0.08, capThickness);
    capShape.closePath();

    const sGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: overhangZ + 0.1,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 2,
    });
    sGeo.translate(0, 0, -(overhangZ + 0.1) * 0.5);
    sGeo.computeVertexNormals();

    const icicleList: Array<[number, number, number, number]> = [];
    for (let i = 0; i < 14; i++) {
      const z = THREE.MathUtils.lerp(-overhangZ * 0.44, overhangZ * 0.44, i / 13);
      const len = 0.16 + ((i * 7) % 4) * 0.06;
      icicleList.push([-overhangX, wallHeight + 0.36 - len * 0.5, z, len]);
      icicleList.push([overhangX, wallHeight + 0.36 - len * 0.5, z, len]);
    }

    return { gableGeo: gGeo, snowCapGeo: sGeo, icicles: icicleList };
  }, [width, depth, roofHeight, wallHeight]);

  // Stacked cylindrical timber logs along front/back & side walls
  const logRows = useMemo(() => {
    const rows = 8;
    const step = wallHeight / rows;
    return Array.from({ length: rows }, (_, i) => 0.46 + i * step);
  }, [wallHeight]);

  const frontZ = depth * 0.5;
  const sideX = width * 0.5;
  const chimneyX = chimneySide * (width * 0.31);

  return (
    <group>
      {/* River-Stone Foundation & Front Porch Steps */}
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.36, 0.44, depth + 0.36]} />
        <meshStandardMaterial
          map={stone.map}
          normalMap={stone.normalMap}
          roughnessMap={stone.roughnessMap}
          aoMap={stone.aoMap}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, 0.15, frontZ + 0.55]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.3, 1.1]} />
        <meshStandardMaterial
          map={stone.map}
          normalMap={stone.normalMap}
          roughnessMap={stone.roughnessMap}
          roughness={0.88}
        />
      </mesh>

      {/* Core Timber Wall Block */}
      <mesh position={[0, 0.44 + wallHeight * 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[width - 0.04, wallHeight, depth - 0.04]} />
        <meshStandardMaterial
          map={wood.map}
          normalMap={wood.normalMap}
          roughnessMap={wood.roughnessMap}
          color={timberTint}
          roughness={0.78}
        />
      </mesh>

      {/* Real Round-Log Courses with Cross-Notched Protruding Ends */}
      {logRows.map((ly) => (
        <group key={`row-${ly}`}>
          {/* Front & Back full-width logs */}
          {[-frontZ, frontZ].map((lz) => (
            <mesh
              key={`fb-${lz}`}
              position={[0, ly, lz]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.135, 0.135, width + 0.44, 10]} />
              <meshStandardMaterial
                map={wood.map}
                normalMap={wood.normalMap}
                color={timberTint}
                roughness={0.76}
              />
            </mesh>
          ))}
          {/* Left & Right full-depth logs */}
          {[-sideX, sideX].map((lx) => (
            <mesh
              key={`lr-${lx}`}
              position={[lx, ly + 0.06, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry args={[0.135, 0.135, depth + 0.44, 10]} />
              <meshStandardMaterial
                map={wood.map}
                normalMap={wood.normalMap}
                color={timberTint}
                roughness={0.76}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Triangular Gable Timber Body & Snow-Laden Roof Overhang */}
      <group position={[0, 0.44 + wallHeight - 0.06, 0]}>
        <mesh geometry={gableGeo} castShadow receiveShadow>
          <meshStandardMaterial
            map={wood.map}
            normalMap={wood.normalMap}
            color="#5b3421"
            roughness={0.76}
          />
        </mesh>
        <mesh geometry={snowCapGeo} castShadow receiveShadow>
          <meshStandardMaterial
            map={snow.map}
            normalMap={snow.normalMap}
            roughnessMap={snow.roughnessMap}
            color="#f2f7ff"
            roughness={0.85}
          />
        </mesh>
      </group>

      {/* Translucent Eave Icicles */}
      {icicles.map(([ix, iy, iz, len]) => (
        <mesh key={`icicle-${ix}-${iz}`} position={[ix, iy, iz]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.028, len, 6]} />
          <meshPhysicalMaterial
            color="#d8f0ff"
            roughness={0.12}
            metalness={0.05}
            transparent
            opacity={0.78}
            clearcoat={1}
          />
        </mesh>
      ))}

      {/* Porch Timber Columns & Overhang Beam */}
      {[-1.18, 1.18].map((px) => (
        <mesh key={`col-${px}`} position={[px, 1.25, frontZ + 0.92]} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 1.9, 10]} />
          <meshStandardMaterial map={wood.map} color="#583621" roughness={0.75} />
        </mesh>
      ))}
      <mesh position={[0, 2.25, frontZ + 0.56]} castShadow receiveShadow>
        <boxGeometry args={[2.9, 0.16, 1.05]} />
        <meshStandardMaterial map={wood.map} color="#54331f" roughness={0.76} />
      </mesh>
      <mesh position={[0, 2.38, frontZ + 0.56]} receiveShadow>
        <boxGeometry args={[3.0, 0.12, 1.12]} />
        <meshStandardMaterial map={snow.map} color="#f2f7ff" roughness={0.86} />
      </mesh>

      {/* Carved Plank Door + Brass Knob + Wreath */}
      <mesh position={[0, 1.14, frontZ + 0.1]} castShadow>
        <boxGeometry args={[0.92, 1.46, 0.1]} />
        <meshStandardMaterial map={wood.map} color={doorColor} roughness={0.68} />
      </mesh>
      <mesh position={[0.32, 1.08, frontZ + 0.17]}>
        <sphereGeometry args={[0.045, 10, 10]} />
        <meshStandardMaterial color="#eab343" metalness={0.86} roughness={0.22} />
      </mesh>
      <KenneyModel model="wreathDecorated" position={[0, 1.44, frontZ + 0.2]} scale={1.08} />

      {/* Warm Recessed Mullioned Windows (Front & Both Sides + Gable Attic Window) */}
      <MullionedWindow position={[-width * 0.3, 1.48, frontZ + 0.12]} />
      <MullionedWindow position={[width * 0.3, 1.48, frontZ + 0.12]} />
      <MullionedWindow position={[sideX + 0.12, 1.48, 0]} rotationY={Math.PI / 2} width={1.08} />
      <MullionedWindow position={[-sideX - 0.12, 1.48, 0]} rotationY={-Math.PI / 2} width={1.08} />
      <MullionedWindow
        position={[0, 0.44 + wallHeight + roofHeight * 0.42, frontZ + 0.42]}
        width={0.58}
        height={0.58}
      />

      {/* Real Photogrammetry Wooden Lantern on Porch */}
      <WarmWoodenLantern position={[0.82, 0.3, frontZ + 0.72]} lightIntensity={2.1} />

      {/* Main Warm Porch & Window Illumination */}
      <pointLight
        position={[0, 1.9, frontZ + 1.45]}
        color="#ffa447"
        intensity={lightIntensity}
        distance={11.5}
        decay={1.8}
      />

      {/* Tapered River-Stone Chimney & Smoke */}
      <mesh
        position={[chimneyX, 0.44 + wallHeight + roofHeight * 0.52, -depth * 0.16]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.72, roofHeight + 0.95, 0.72]} />
        <meshStandardMaterial
          map={stone.map}
          normalMap={stone.normalMap}
          roughnessMap={stone.roughnessMap}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[chimneyX, 0.44 + wallHeight + roofHeight + 0.38, -depth * 0.16]} castShadow>
        <boxGeometry args={[0.88, 0.14, 0.88]} />
        <meshStandardMaterial map={stone.map} color="#9aa4b4" roughness={0.88} />
      </mesh>
      <ChimneySmoke
        position={[chimneyX, 0.44 + wallHeight + roofHeight + 0.55, -depth * 0.16]}
        count={16}
        boosted={smokeBoosted}
        color={smokeBoosted ? '#ffe7c4' : '#edf4ff'}
      />

      {children}
    </group>
  );
}
