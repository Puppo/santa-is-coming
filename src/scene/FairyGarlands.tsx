import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { christmasAudioEngine } from '../audio/audioEngine';
import { useVillage } from '../state/villageStore';
import { PLAZA_LAMP_PLACEMENTS, SLEIGH_LAMP_PLACEMENTS } from './collisionSystem';
import { getGroundHeight } from './terrainMath';

interface StrandDef {
  from: [number, number, number];
  to: [number, number, number];
  sag: number;
  bulbs: number;
}

const lampTop = (x: number, z: number): [number, number, number] => [
  x,
  getGroundHeight(x, z) + 2.66,
  z,
];

const [nwLamp, neLamp, swLamp, seLamp] = PLAZA_LAMP_PLACEMENTS;
const [sleighWestLamp, sleighEastLamp] = SLEIGH_LAMP_PLACEMENTS;

const STRANDS: StrandDef[] = [
  // Elf Workshop porch beam -> Plaza NW Streetlamp
  { from: [-6.65, 2.58, -2.35], to: lampTop(nwLamp[0], nwLamp[1]), sag: 0.38, bulbs: 8 },
  // Santa's Cabin porch beam -> Plaza NE Streetlamp
  { from: [6.45, 2.58, -2.55], to: lampTop(neLamp[0], neLamp[1]), sag: 0.38, bulbs: 8 },
  // Plaza NW Lamp -> Plaza SW Lamp
  { from: lampTop(nwLamp[0], nwLamp[1]), to: lampTop(swLamp[0], swLamp[1]), sag: 0.65, bulbs: 10 },
  // Plaza NE Lamp -> Plaza SE Lamp
  { from: lampTop(neLamp[0], neLamp[1]), to: lampTop(seLamp[0], seLamp[1]), sag: 0.68, bulbs: 10 },
  // Plaza SW Lamp -> Sleigh West Lamp
  {
    from: lampTop(swLamp[0], swLamp[1]),
    to: lampTop(sleighWestLamp[0], sleighWestLamp[1]),
    sag: 0.52,
    bulbs: 9,
  },
  // Plaza SE Lamp -> Sleigh East Lamp
  {
    from: lampTop(seLamp[0], seLamp[1]),
    to: lampTop(sleighEastLamp[0], sleighEastLamp[1]),
    sag: 0.46,
    bulbs: 8,
  },
];

const FESTIVE_PALETTE = [
  new THREE.Color('#ffbe55'),
  new THREE.Color('#ff5757'),
  new THREE.Color('#57e389'),
  new THREE.Color('#66b3ff'),
];

const GRUMP_TINT = new THREE.Color('#47d147');

export function FairyGarlands() {
  const { partyMode, isMusicPlaying, grumpState, motionPaused } = useVillage();

  const { bulbPositions, wireGeometries } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const wires: THREE.TubeGeometry[] = [];

    STRANDS.forEach((strand) => {
      const start = new THREE.Vector3(...strand.from);
      const end = new THREE.Vector3(...strand.to);
      const mid = start.clone().lerp(end, 0.5);
      mid.y -= strand.sag;

      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      wires.push(new THREE.TubeGeometry(curve, 16, 0.02, 6, false));

      for (let i = 1; i <= strand.bulbs; i++) {
        const t = i / (strand.bulbs + 1);
        pts.push(curve.getPointAt(t));
      }
    });

    return { bulbPositions: pts, wireGeometries: wires };
  }, []);

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    const inst = meshRef.current;
    if (!inst) return;

    const t = state.clock.elapsedTime;
    const bands = christmasAudioEngine.bands;
    const grumpDim = grumpState === 'sneaking';

    bulbPositions.forEach((pos, i) => {
      const baseColor = FESTIVE_PALETTE[i % FESTIVE_PALETTE.length];
      let glow = 1.45;

      if (partyMode && !motionPaused) {
        const wave = 0.5 + 0.5 * Math.sin(t * 3.8 + i * 0.7);
        const beat = (isMusicPlaying ? bands.energy : 0.45) * 1.4;
        glow = 1.2 + (wave * 0.7 + beat) * 1.1;
      } else if (!motionPaused) {
        glow = 1.35 + 0.25 * Math.sin(t * 1.6 + i);
      }

      if (grumpDim) {
        tmpColor.copy(baseColor).lerp(GRUMP_TINT, 0.72);
        glow *= 0.62;
      } else {
        tmpColor.copy(baseColor).multiplyScalar(glow);
      }

      dummy.position.copy(pos);
      const s = partyMode ? 1.0 + bands.bass * 0.32 : 1.0;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      inst.setColorAt(i, tmpColor);
    });

    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });

  return (
    <group name="fairy-garlands">
      {wireGeometries.map((geo) => (
        <mesh key={geo.uuid} geometry={geo}>
          <meshStandardMaterial color="#212832" roughness={0.8} />
        </mesh>
      ))}
      <instancedMesh ref={meshRef} args={[undefined, undefined, bulbPositions.length]}>
        <sphereGeometry args={[0.075, 10, 10]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
