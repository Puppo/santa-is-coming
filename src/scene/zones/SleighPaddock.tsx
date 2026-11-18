import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useWoodPbr } from '../../assets/pbrMaterials';
import { getFabricNormalMap } from '../../assets/proceduralTextures';
import { useVillage } from '../../state/villageStore';
import { ReindeerHerd } from '../characters/ReindeerHerd';
import { VictorianStreetLamp, WarmWoodenLantern } from '../PolyHavenProp';
import { RealisticGift } from '../RealisticGift';
import { getGroundHeight } from '../terrainMath';

const PADDOCK_X = -1.2;
const PADDOCK_Z = 9.2;
const BASE_ROT_Y = Math.PI * 0.46;

function TimberPaddockFence({ position }: { position: [number, number, number] }) {
  const wood = useWoodPbr(1.5);
  return (
    <group position={position}>
      {[-0.85, 0.85].map((px) => (
        <mesh key={`post-${px}`} position={[px, 0.38, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.055, 0.065, 0.82, 8]} />
          <meshStandardMaterial
            map={wood.map}
            normalMap={wood.normalMap}
            color="#704a30"
            roughness={0.86}
          />
        </mesh>
      ))}
      {[0.28, 0.56].map((ry) => (
        <mesh key={`rail-${ry}`} position={[0, ry, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.036, 0.036, 1.9, 8]} />
          <meshStandardMaterial
            map={wood.map}
            normalMap={wood.normalMap}
            color="#785035"
            roughness={0.86}
          />
        </mesh>
      ))}
    </group>
  );
}

export function SleighPaddock() {
  const { sleighFlightActive, triggerSleighFlight, motionPaused } = useVillage();
  const rigRef = useRef<THREE.Group>(null);
  const flightProgressRef = useRef(0);
  const trailRef = useRef<THREE.InstancedMesh>(null);

  const fabricNormal = useMemo(() => getFabricNormalMap(), []);
  const paddockY = getGroundHeight(PADDOCK_X, PADDOCK_Z);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpNext = useMemo(() => new THREE.Vector3(), []);

  // Sculpted Victorian Sleigh Side Curve
  const { sidePanelGeo, runnerCurveGeo } = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.12, 0.28);
    s.bezierCurveTo(-1.26, 0.65, -1.22, 1.05, -0.96, 1.18);
    s.bezierCurveTo(-0.72, 1.24, -0.58, 0.85, -0.35, 0.72);
    s.lineTo(0.45, 0.68);
    s.bezierCurveTo(0.85, 0.66, 1.08, 0.96, 1.22, 0.92);
    s.bezierCurveTo(1.32, 0.88, 1.24, 0.42, 0.96, 0.28);
    s.closePath();

    const pGeo = new THREE.ExtrudeGeometry(s, {
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 2,
    });
    // Shape X runs back(-1.12) -> front(+1.22); rotate so local +Z is forward!
    pGeo.rotateY(-Math.PI / 2);
    pGeo.computeVertexNormals();

    const rCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.26, -1.25),
      new THREE.Vector3(0, 0.1, -0.95),
      new THREE.Vector3(0, 0.08, 0.85),
      new THREE.Vector3(0, 0.22, 1.28),
      new THREE.Vector3(0, 0.48, 1.48),
      new THREE.Vector3(0, 0.56, 1.24),
    ]);
    const rGeo = new THREE.TubeGeometry(rCurve, 28, 0.036, 8, false);
    return { sidePanelGeo: pGeo, runnerCurveGeo: rGeo };
  }, []);

  const flightCurve = useMemo(() => {
    const start = new THREE.Vector3(PADDOCK_X, paddockY + 0.05, PADDOCK_Z);
    return new THREE.CatmullRomCurve3(
      [
        start.clone(),
        new THREE.Vector3(6.8, 2.2, 8.8),
        new THREE.Vector3(10.5, 6.2, 0.5),
        new THREE.Vector3(3.2, 8.4, -7.8),
        new THREE.Vector3(-8.5, 7.2, -5.0),
        new THREE.Vector3(-10.8, 5.2, 4.6),
        new THREE.Vector3(-6.2, 2.1, 8.8),
        start.clone(),
      ],
      true,
    );
  }, [paddockY]);

  useFrame((state, delta) => {
    const rig = rigRef.current;
    if (!rig) return;

    if (sleighFlightActive) {
      if (!motionPaused) {
        flightProgressRef.current = Math.min(1, flightProgressRef.current + delta / 10.2);
      }
      const u = flightProgressRef.current;
      flightCurve.getPointAt(u, tmpPos);
      flightCurve.getPointAt((u + 0.015) % 1, tmpNext);

      rig.position.copy(tmpPos);
      rig.lookAt(tmpNext);
      rig.rotateZ(Math.sin(u * Math.PI * 4) * 0.14);
    } else {
      flightProgressRef.current = 0;
      rig.position.lerp(new THREE.Vector3(PADDOCK_X, paddockY + 0.03, PADDOCK_Z), 0.12);
      const targetQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BASE_ROT_Y, 0));
      rig.quaternion.slerp(targetQuat, 0.12);
    }

    if (trailRef.current) {
      trailRef.current.visible = sleighFlightActive && !motionPaused;
      if (sleighFlightActive) {
        const t = state.clock.elapsedTime;
        for (let i = 0; i < 24; i++) {
          const lag = (t * 1.6 + i / 24) % 1;
          const u = Math.max(0, (flightProgressRef.current - lag * 0.14 + 1) % 1);
          flightCurve.getPointAt(u, tmpPos);
          dummy.position.set(
            tmpPos.x + Math.sin(i * 3.1 + t * 4) * 0.38,
            tmpPos.y + 0.35 + Math.cos(i * 2.4) * 0.25,
            tmpPos.z + Math.cos(i * 1.9 + t * 4) * 0.38,
          );
          dummy.scale.setScalar((1 - lag) * 0.14);
          dummy.updateMatrix();
          trailRef.current.setMatrixAt(i, dummy.matrix);
        }
        trailRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group name="sleigh-paddock">
      {/* Paddock Timber Fence & Real Victorian Streetlamps */}
      {[-2.8, -0.9, 1.0].map((fx) => (
        <TimberPaddockFence
          key={`fence-${fx}`}
          position={[PADDOCK_X + fx, getGroundHeight(PADDOCK_X + fx, 11.6), 11.6]}
        />
      ))}
      <VictorianStreetLamp
        position={[-4.2, getGroundHeight(-4.2, 8.2), 8.2]}
        lightIntensity={2.8}
      />
      <VictorianStreetLamp position={[2.4, getGroundHeight(2.4, 8.0), 8.0]} lightIntensity={2.8} />

      {/* Shared warm paddock illumination for the sleigh & reindeer team */}
      <pointLight
        position={[-1.0, 2.8, 8.8]}
        color="#ffaf54"
        intensity={6.5}
        distance={12}
        decay={1.8}
      />

      {/* Wrapped Satin Presents on the Snow Waiting to be Loaded */}
      <RealisticGift
        position={[-3.3, getGroundHeight(-3.3, 9.1), 9.1]}
        boxColor="#9e1c2b"
        ribbonColor="#f2c45a"
        scale={1.1}
      />
      <RealisticGift
        position={[-3.85, getGroundHeight(-3.85, 9.8), 9.8]}
        boxColor="#1d6e46"
        ribbonColor="#f2c45a"
        rotation={[0, 0.5, 0]}
        scale={0.95}
      />

      {/* Sculpted Victorian Swan-Neck Sleigh + 6 Animated Reindeer */}
      <group
        ref={rigRef}
        position={[PADDOCK_X, paddockY + 0.03, PADDOCK_Z]}
        rotation={[0, BASE_ROT_Y, 0]}
      >
        <group
          name="santas-sleigh"
          onClick={(e) => {
            e.stopPropagation();
            triggerSleighFlight();
          }}
          onPointerOver={() => {
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            document.body.style.cursor = 'auto';
          }}
        >
          {/* Wrought-Brass Curved Runners & Struts */}
          {[-0.6, 0.6].map((rx) => (
            <group key={`runner-${rx}`} position={[rx, 0, 0]}>
              <mesh geometry={runnerCurveGeo} castShadow>
                <meshStandardMaterial color="#dfb049" metalness={0.86} roughness={0.22} />
              </mesh>
              {[-0.68, 0.05, 0.72].map((sz) => (
                <mesh key={`strut-${sz}`} position={[0, 0.22, sz]} castShadow>
                  <cylinderGeometry args={[0.025, 0.025, 0.28, 8]} />
                  <meshStandardMaterial color="#dfb049" metalness={0.84} roughness={0.26} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Sculpted Lacquered Crimson Side Panels */}
          {[-0.68, 0.6].map((px) => (
            <mesh
              key={`panel-${px}`}
              geometry={sidePanelGeo}
              position={[px, 0.02, 0]}
              castShadow
              receiveShadow
            >
              <meshPhysicalMaterial
                color="#961624"
                roughness={0.26}
                metalness={0.14}
                clearcoat={0.78}
                clearcoatRoughness={0.18}
              />
            </mesh>
          ))}

          {/* Sleigh Floorboard, Curved Front Dashboard & High Backrest */}
          <mesh position={[0, 0.34, 0.02]} castShadow receiveShadow>
            <boxGeometry args={[1.28, 0.1, 2.05]} />
            <meshStandardMaterial color="#4e2919" roughness={0.68} />
          </mesh>
          <mesh position={[0, 0.74, -1.04]} rotation={[-0.24, 0, 0]} castShadow>
            <boxGeometry args={[1.32, 0.84, 0.14]} />
            <meshPhysicalMaterial color="#851420" roughness={0.3} clearcoat={0.7} />
          </mesh>
          <mesh position={[0, 0.64, 1.08]} rotation={[0.38, 0, 0]} castShadow>
            <boxGeometry args={[1.32, 0.56, 0.12]} />
            <meshPhysicalMaterial color="#851420" roughness={0.3} clearcoat={0.7} />
          </mesh>

          {/* Tufted Velvet Seat Cushion */}
          <mesh position={[0, 0.52, 0.28]} castShadow>
            <boxGeometry args={[1.18, 0.22, 0.68]} />
            <meshStandardMaterial color="#4f111a" normalMap={fabricNormal} roughness={0.86} />
          </mesh>

          {/* Overflowing Burlap & Velvet Toy Sack + Satin Gifts */}
          <mesh position={[0, 0.84, -0.52]} scale={[1.18, 0.96, 0.88]} castShadow>
            <dodecahedronGeometry args={[0.48, 2]} />
            <meshStandardMaterial color="#781b25" normalMap={fabricNormal} roughness={0.9} />
          </mesh>
          <RealisticGift
            position={[-0.28, 0.54, -0.14]}
            boxColor="#1d6e46"
            ribbonColor="#f2c45a"
            scale={0.78}
            rotation={[0.1, 0.4, 0]}
          />
          <RealisticGift
            position={[0.26, 0.54, -0.22]}
            boxColor="#235789"
            ribbonColor="#f2c45a"
            scale={0.8}
          />
          <RealisticGift
            position={[0.02, 0.82, -0.24]}
            boxColor="#b52232"
            ribbonColor="#f2c45a"
            scale={0.72}
            rotation={[0, -0.5, 0.12]}
          />

          {/* Real Wooden Lantern Mounted on Sleigh Bow */}
          <WarmWoodenLantern position={[0.66, 0.88, 1.02]} lightIntensity={2.2} />
        </group>

        <ReindeerHerd isFlying={sleighFlightActive} />
      </group>

      {/* Golden Stardust Flight Trail */}
      <instancedMesh
        ref={trailRef}
        args={[undefined, undefined, 24]}
        visible={false}
        frustumCulled={false}
      >
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={[2.8, 2.2, 0.8]} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
