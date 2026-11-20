import * as THREE from 'three';
import type { SprucePlacement } from './RealisticSpruce';
import {
  BASE_ROT_Y,
  PADDOCK_X,
  PADDOCK_Z,
  PAIR_LEAD_DISTANCES,
  type SleighFlightTrack,
} from './sleighFlightPath';
import { getGroundHeight, ISLAND_RADIUS } from './terrainMath';

export interface CircleObstacle {
  id: string;
  x: number;
  z: number;
  radius: number;
  category: 'building' | 'prop' | 'water' | 'tree' | 'vehicle';
}

export interface ObbObstacle {
  id: string;
  x: number;
  z: number;
  rotY: number;
  halfW: number;
  halfD: number;
  category: 'building' | 'prop' | 'vehicle';
}

export interface DynamicAgent {
  id: string;
  x: number;
  z: number;
  radius: number;
  priority: number;
  kind: 'character' | 'static-character' | 'train' | 'vehicle';
}

export interface PlacementPose {
  x: number;
  z: number;
  rotY: number;
}

export interface SnowmanPlacement extends PlacementPose {
  interactive?: boolean;
}

/**
 * Converts local coordinates in a group rotated by `rotY` around Y into world 2D `(x, z)`.
 */
export function localToWorld2D(
  originX: number,
  originZ: number,
  rotY: number,
  localX: number,
  localZ: number,
): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [originX + localX * c + localZ * s, originZ - localX * s + localZ * c];
}

// ============================================================================
// Canonical Scene Layout & Safe Prop Placements
// ============================================================================

export const TRAIN_TRACK_RADIUS = 3.45;
export const TRAIN_RING_HALF_WIDTH = 0.28;
export const TRAIN_CAR_OFFSETS = [0, -0.22, -0.43, -0.64] as const;
export const TRAIN_CAR_RADIUS = 0.44;
export const CARRIER_LOOP_SPEED = 0.054;
export const REINDEER_SIDE_X = [-0.62, 0.62] as const;

export const POND_CENTER_X = 5.6;
export const POND_CENTER_Z = 5.4;
export const POND_COLLISION_RADIUS = 3.42;

export const PLAZA_LAMP_PLACEMENTS: ReadonlyArray<[number, number, number]> = [
  [-4.5, -2.5, 0.5],
  [4.5, -2.5, -0.5],
  [-4.3, 3.6, 2.2],
  [1.6, 4.2, -2.1],
];

export const SLEIGH_LAMP_PLACEMENTS: ReadonlyArray<[number, number]> = [
  [-4.6, 7.2],
  [2.4, 7.6],
];

export const PLAZA_BENCH_POSE: PlacementPose = {
  x: -3.95,
  z: 2.05,
  rotY: 1.05,
};

export const SNOWMAN_PLACEMENTS: ReadonlyArray<SnowmanPlacement> = [
  { x: 1.35, z: 5.85, rotY: -0.5, interactive: true },
  { x: 10.1, z: 4.4, rotY: -2.1, interactive: false },
];

export const SNOWDRIFT_PLACEMENTS: ReadonlyArray<[number, number, number]> = [
  [-9.2, 4.8, 1.2],
  [9.8, -0.2, 1.05],
];

export const BOULDER_PLACEMENTS: ReadonlyArray<[number, number, number]> = [
  [-12.4, 2.2, 1.15],
  [12.2, 1.8, 1.05],
  [9.8, 7.6, 0.95],
  [-9.2, 11.4, 1.2],
  [-4.8, -8.5, 1.1],
  [4.6, -8.6, 1.1],
];

/**
 * Stationed Tinkerer and Dancing Plaza Elves placed cleanly outside all workbenches,
 * lamps, train tracks, and moving patrol lanes.
 */
export const STATIC_ELF_PLACEMENTS: ReadonlyArray<{
  id: string;
  x: number;
  z: number;
  rotY: number;
  tunicColor: string;
  hatColor: string;
  activity: 'tinker' | 'dance';
  phase: number;
}> = [
  {
    id: 'tinkerer-0',
    x: -4.85,
    z: -3.45,
    rotY: 2.85,
    tunicColor: '#1f7a4c',
    hatColor: '#d49a2a',
    activity: 'tinker',
    phase: 0.5,
  },
  {
    id: 'tinkerer-1',
    x: -4.05,
    z: -4.35,
    rotY: 1.95,
    tunicColor: '#1b6d6d',
    hatColor: '#c92c3c',
    activity: 'tinker',
    phase: 2.1,
  },
  {
    id: 'dancer-0',
    x: -2.85,
    z: 3.35,
    rotY: 0.65,
    tunicColor: '#b92735',
    hatColor: '#1f7a4c',
    activity: 'dance',
    phase: 0.8,
  },
  {
    id: 'dancer-1',
    x: -2.85,
    z: -3.45,
    rotY: 2.35,
    tunicColor: '#1f7a4c',
    hatColor: '#c92c3c',
    activity: 'dance',
    phase: 3.1,
  },
];

/**
 * Generates deterministic peripheral and northern backdrop spruce placements while
 * clearing both the south runway approach and chalet foundations.
 */
export function buildPineSprucePlacements(): SprucePlacement[] {
  const placements: SprucePlacement[] = [];

  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2 + ((i % 3) - 1) * 0.05;
    const isNorth = Math.sin(a) < -0.12;
    const baseR = isNorth ? 12.6 + (i % 4) * 2.4 : 15.6 + (i % 3) * 2.3;
    const r = Math.min(ISLAND_RADIUS - 2.2, baseR);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (z > 6.5 && Math.abs(x) < 10.5) continue;
    // Keep clear of Elf Workshop (-8.5, -3.8) and Santa's Cabin (8.2, -4.2) foundations
    if (Math.hypot(x + 8.5, z + 3.8) < 5.0 || Math.hypot(x - 8.2, z + 4.2) < 4.8) continue;

    placements.push({
      pos: [x, getGroundHeight(x, z) - 0.05, z],
      scale: 0.95 + (i % 5) * 0.22,
      rotY: (i * 1.17) % (Math.PI * 2),
    });
  }

  const backdropCoords: Array<[number, number, number]> = [
    [-13.5, -10.5, 1.35],
    [-11.2, -13.2, 1.55],
    [-7.2, -11.8, 1.28],
    [-2.5, -11.4, 1.5],
    [2.8, -11.2, 1.42],
    [7.4, -12.0, 1.55],
    [11.5, -13.0, 1.35],
    [14.2, -9.8, 1.25],
  ];
  backdropCoords.forEach(([x, z, sc], idx) => {
    placements.push({
      pos: [x, getGroundHeight(x, z) - 0.05, z],
      scale: sc,
      rotY: idx * 0.9,
    });
  });

  return placements;
}

// ============================================================================
// Nominal Character Navigation Splines
// ============================================================================

export function createCarrierLoopCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-6.85, 0, -0.75),
      new THREE.Vector3(-7.45, 0, 3.35),
      new THREE.Vector3(-6.15, 0, 7.75),
      new THREE.Vector3(-3.65, 0, 9.65),
      new THREE.Vector3(-3.35, 0, 7.15),
      new THREE.Vector3(-5.75, 0, 3.35),
      new THREE.Vector3(-5.85, 0, -0.65),
    ],
    true,
    'centripetal',
    0.5,
  );
}

export function createSantaPatrolCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(5.65, 0, -1.15),
      new THREE.Vector3(4.45, 0, -0.25),
      new THREE.Vector3(4.45, 0, 1.05),
      new THREE.Vector3(6.35, 0, 1.05),
      new THREE.Vector3(7.65, 0, 0.65),
      new THREE.Vector3(6.75, 0, -0.35),
    ],
    true,
    'centripetal',
    0.5,
  );
}

export const GRUMP_PEEK_POS: readonly [number, number] = [-2.6, -7.2];

export function createGrumpSneakCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-2.6, 0, -7.2),
      new THREE.Vector3(-1.6, 0, -5.2),
      new THREE.Vector3(-0.6, 0, -4.45),
      new THREE.Vector3(0.55, 0, -4.35),
    ],
    false,
    'centripetal',
    0.5,
  );
}

export function createGrumpCaughtCurve(startX: number, startZ: number): THREE.CatmullRomCurve3 {
  const midX = THREE.MathUtils.clamp(startX * 0.45, -1.4, 0.8);
  const midZ = Math.min(-6.6, startZ - 1.2);
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(startX, 0, startZ),
      new THREE.Vector3(midX, 0, midZ),
      new THREE.Vector3(0.85, 0, -10.2),
      new THREE.Vector3(0.95, 0, -12.6),
    ],
    false,
    'centripetal',
    0.5,
  );
}

export function createGrumpEscapedCurve(startX: number, startZ: number): THREE.CatmullRomCurve3 {
  const midX = THREE.MathUtils.clamp((startX - 0.85) * 0.5, -2.0, 0.6);
  const midZ = Math.min(-6.5, startZ - 1.1);
  return new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(startX, 0, startZ),
      new THREE.Vector3(midX, 0, midZ),
      new THREE.Vector3(-2.6, 0, -8.8),
    ],
    false,
    'centripetal',
    0.5,
  );
}

// ============================================================================
// Geometry Distance Helpers
// ============================================================================

/**
 * Signed 2D distance from a point `(px, pz)` to an oriented bounding box centered at
 * `(obb.x, obb.z)` with Y-rotation `obb.rotY` and half-extents `(halfW, halfD)`.
 * Negative values indicate interior penetration depth.
 */
export function signedDistanceCircleToObb(
  px: number,
  pz: number,
  obb: Pick<ObbObstacle, 'x' | 'z' | 'rotY' | 'halfW' | 'halfD'>,
): number {
  const dx = px - obb.x;
  const dz = pz - obb.z;
  const c = Math.cos(obb.rotY);
  const s = Math.sin(obb.rotY);
  const lx = dx * c - dz * s;
  const lz = dx * s + dz * c;

  const insideX = Math.abs(lx) <= obb.halfW;
  const insideZ = Math.abs(lz) <= obb.halfD;
  if (insideX && insideZ) {
    return -Math.min(obb.halfW - Math.abs(lx), obb.halfD - Math.abs(lz));
  }

  const qx = Math.max(-obb.halfW, Math.min(obb.halfW, lx));
  const qz = Math.max(-obb.halfD, Math.min(obb.halfD, lz));
  return Math.hypot(lx - qx, lz - qz);
}

function pushOutOfObb(
  pos: { x: number; z: number },
  radius: number,
  obb: ObbObstacle,
  margin: number,
): void {
  const dx = pos.x - obb.x;
  const dz = pos.z - obb.z;
  const c = Math.cos(obb.rotY);
  const s = Math.sin(obb.rotY);
  let lx = dx * c - dz * s;
  let lz = dx * s + dz * c;
  const minDist = radius + margin;

  const qx = Math.max(-obb.halfW, Math.min(obb.halfW, lx));
  const qz = Math.max(-obb.halfD, Math.min(obb.halfD, lz));
  const ex = lx - qx;
  const ez = lz - qz;
  const dist = Math.hypot(ex, ez);

  if (Math.abs(lx) <= obb.halfW && Math.abs(lz) <= obb.halfD) {
    const penX = obb.halfW - Math.abs(lx);
    const penZ = obb.halfD - Math.abs(lz);
    if (penX < penZ) {
      lx = (lx >= 0 ? 1 : -1) * (obb.halfW + minDist);
    } else {
      lz = (lz >= 0 ? 1 : -1) * (obb.halfD + minDist);
    }
  } else if (dist < minDist) {
    const nx = dist > 1e-6 ? ex / dist : 0;
    const nz = dist > 1e-6 ? ez / dist : 1;
    lx = qx + nx * minDist;
    lz = qz + nz * minDist;
  } else {
    return;
  }

  pos.x = obb.x + lx * c + lz * s;
  pos.z = obb.z - lx * s + lz * c;
}

function pushOutOfCircle(
  pos: { x: number; z: number },
  radius: number,
  cx: number,
  cz: number,
  otherRadius: number,
  margin: number,
  fallbackAngleSeed = 0,
): void {
  const minDist = radius + otherRadius + margin;
  const dx = pos.x - cx;
  const dz = pos.z - cz;
  const dist = Math.hypot(dx, dz);
  if (dist >= minDist) return;

  let nx: number;
  let nz: number;
  if (dist > 1e-5) {
    nx = dx / dist;
    nz = dz / dist;
  } else {
    nx = Math.cos(fallbackAngleSeed);
    nz = Math.sin(fallbackAngleSeed);
  }
  pos.x = cx + nx * minDist;
  pos.z = cz + nz * minDist;
}

// ============================================================================
// Centralized Collision World & Real-Time Steering Solver
// ============================================================================

export class VillageCollisionWorld {
  readonly staticCircles: CircleObstacle[] = [];
  readonly staticObbs: ObbObstacle[] = [];

  private readonly agents = new Map<string, DynamicAgent>();
  private readonly trainCars: DynamicAgent[] = TRAIN_CAR_OFFSETS.map((offset, idx) => ({
    id: `train-${idx}`,
    x: Math.cos(offset) * TRAIN_TRACK_RADIUS,
    z: Math.sin(offset) * TRAIN_TRACK_RADIUS,
    radius: TRAIN_CAR_RADIUS,
    priority: 200,
    kind: 'train',
  }));

  private sleighGrounded = true;
  private readonly parkedSleighObb: ObbObstacle;
  private readonly parkedReindeer: CircleObstacle[] = [];
  private readonly activeFlightReindeer: CircleObstacle[] = [];
  private activeSleighPos = new THREE.Vector3();
  private activeSleighQuat = new THREE.Quaternion();
  private activeSleighObb: ObbObstacle;

  private readonly tmpPairPos = new THREE.Vector3();
  private readonly tmpPairQuat = new THREE.Quaternion();
  private readonly tmpSideWorld = new THREE.Vector3();

  constructor() {
    this.parkedSleighObb = VillageCollisionWorld.createSleighObb(
      PADDOCK_X,
      PADDOCK_Z,
      BASE_ROT_Y,
      'parked-sleigh',
    );
    this.activeSleighObb = { ...this.parkedSleighObb, id: 'active-sleigh' };

    this.buildStaticWorld();
    this.registerStationedElves();
  }

  private static createSleighObb(
    originX: number,
    originZ: number,
    rotY: number,
    id: string,
  ): ObbObstacle {
    const [cx, cz] = localToWorld2D(originX, originZ, rotY, 0, 0.115);
    return {
      id,
      x: cx,
      z: cz,
      rotY,
      halfW: 0.72,
      halfD: 1.38,
      category: 'vehicle',
    };
  }

  private buildStaticWorld(): void {
    // Structures & porches
    this.staticObbs.push(
      {
        id: 'workshop-body',
        x: -8.5,
        z: -3.8,
        rotY: 0.58,
        halfW: 2.52,
        halfD: 1.97,
        category: 'building',
      },
      {
        id: 'workshop-porch',
        ...(() => {
          const [x, z] = localToWorld2D(-8.5, -3.8, 0.58, 0, 2.3);
          return { x, z };
        })(),
        rotY: 0.58,
        halfW: 1.45,
        halfD: 0.58,
        category: 'building',
      },
      {
        id: 'workshop-workbench',
        ...(() => {
          const [x, z] = localToWorld2D(-8.5, -3.8, 0.58, 3.05, 1.25);
          return { x, z };
        })(),
        rotY: 0.23,
        halfW: 0.83,
        halfD: 0.46,
        category: 'prop',
      },
      {
        id: 'cabin-body',
        x: 8.2,
        z: -4.2,
        rotY: -0.62,
        halfW: 2.27,
        halfD: 1.87,
        category: 'building',
      },
      {
        id: 'cabin-porch',
        ...(() => {
          const [x, z] = localToWorld2D(8.2, -4.2, -0.62, 0, 2.2);
          return { x, z };
        })(),
        rotY: -0.62,
        halfW: 1.45,
        halfD: 0.58,
        category: 'building',
      },
      {
        id: 'plaza-bench',
        x: PLAZA_BENCH_POSE.x,
        z: PLAZA_BENCH_POSE.z,
        rotY: PLAZA_BENCH_POSE.rotY,
        halfW: 0.8,
        halfD: 0.36,
        category: 'prop',
      },
      {
        id: 'paddock-fence',
        x: PADDOCK_X - 0.9,
        z: 11.6,
        rotY: 0,
        halfW: 2.88,
        halfD: 0.14,
        category: 'prop',
      },
    );

    // Great Tree Pedestal & Pond
    this.staticCircles.push(
      { id: 'great-tree-pedestal', x: 0, z: 0, radius: 1.92, category: 'prop' },
      {
        id: 'frozen-pond',
        x: POND_CENTER_X,
        z: POND_CENTER_Z,
        radius: POND_COLLISION_RADIUS,
        category: 'water',
      },
    );

    // Plaza & Sleigh streetlamps
    PLAZA_LAMP_PLACEMENTS.forEach(([x, z], idx) => {
      this.staticCircles.push({ id: `lamp-plaza-${idx}`, x, z, radius: 0.28, category: 'prop' });
    });
    SLEIGH_LAMP_PLACEMENTS.forEach(([x, z], idx) => {
      this.staticCircles.push({ id: `lamp-sleigh-${idx}`, x, z, radius: 0.28, category: 'prop' });
    });

    // Snowmen & Waiting paddock gifts
    SNOWMAN_PLACEMENTS.forEach((s, idx) => {
      this.staticCircles.push({
        id: `snowman-${idx}`,
        x: s.x,
        z: s.z,
        radius: 0.46,
        category: 'prop',
      });
    });
    this.staticCircles.push(
      { id: 'paddock-gift-0', x: -2.4, z: 10.65, radius: 0.33, category: 'prop' },
      { id: 'paddock-gift-1', x: -3.05, z: 10.95, radius: 0.29, category: 'prop' },
    );

    // Workshop outdoor props
    const wsProps: Array<[string, number, number, number]> = [
      ['workshop-nutcracker-l', -1.95, 2.35, 0.28],
      ['workshop-nutcracker-r', 1.95, 2.35, 0.28],
      ['workshop-gift-0', -2.35, 1.45, 0.32],
      ['workshop-gift-1', -2.82, 0.85, 0.29],
    ];
    for (const [id, lx, lz, radius] of wsProps) {
      const [x, z] = localToWorld2D(-8.5, -3.8, 0.58, lx, lz);
      this.staticCircles.push({ id, x, z, radius, category: 'prop' });
    }

    // Cabin outdoor props
    const cabinProps: Array<[string, number, number, number]> = [
      ['cabin-mailbox', -2.25, 2.55, 0.32],
      ['cabin-gingerbread', 2.25, 2.05, 0.24],
    ];
    for (const [id, lx, lz, radius] of cabinProps) {
      const [x, z] = localToWorld2D(8.2, -4.2, -0.62, lx, lz);
      this.staticCircles.push({ id, x, z, radius, category: 'prop' });
    }

    // Boulders & Snowdrifts
    BOULDER_PLACEMENTS.forEach(([x, z, sc], idx) => {
      this.staticCircles.push({ id: `boulder-${idx}`, x, z, radius: 0.58 * sc, category: 'prop' });
    });
    SNOWDRIFT_PLACEMENTS.forEach(([x, z, sc], idx) => {
      this.staticCircles.push({
        id: `snowdrift-${idx}`,
        x,
        z,
        radius: 0.78 * sc,
        category: 'prop',
      });
    });

    // Pine Forest Spruces
    buildPineSprucePlacements().forEach((spruce, idx) => {
      this.staticCircles.push({
        id: `spruce-${idx}`,
        x: spruce.pos[0],
        z: spruce.pos[2],
        radius: 0.95 * spruce.scale,
        category: 'tree',
      });
    });

    // Parked 6 Reindeer Team
    PAIR_LEAD_DISTANCES.forEach((leadDist, pairIdx) => {
      REINDEER_SIDE_X.forEach((sideX, sideIdx) => {
        const [rx, rz] = localToWorld2D(PADDOCK_X, PADDOCK_Z, BASE_ROT_Y, sideX, leadDist);
        const unit: CircleObstacle = {
          id: `reindeer-${pairIdx}-${sideIdx}`,
          x: rx,
          z: rz,
          radius: 0.42,
          category: 'vehicle',
        };
        this.parkedReindeer.push(unit);
        this.activeFlightReindeer.push({ ...unit });
      });
    });
  }

  private registerStationedElves(): void {
    for (const elf of STATIC_ELF_PLACEMENTS) {
      this.agents.set(elf.id, {
        id: elf.id,
        x: elf.x,
        z: elf.z,
        radius: 0.3,
        priority: 100,
        kind: 'static-character',
      });
    }
  }

  /** Resets all transient agents while preserving static world & stationed elves (useful for deterministic tests). */
  resetDynamicState(): void {
    for (const key of Array.from(this.agents.keys())) {
      const agent = this.agents.get(key);
      if (agent && agent.kind !== 'static-character') {
        this.agents.delete(key);
      }
    }
    this.registerStationedElves();
    this.updateTrainAngle(0);
    this.sleighGrounded = true;
    this.activeSleighObb = { ...this.parkedSleighObb, id: 'active-sleigh' };
    this.parkedReindeer.forEach((p, idx) => {
      this.activeFlightReindeer[idx].x = p.x;
      this.activeFlightReindeer[idx].z = p.z;
    });
  }

  updateTrainAngle(baseAngle: number): void {
    TRAIN_CAR_OFFSETS.forEach((offset, idx) => {
      const a = baseAngle + offset;
      this.trainCars[idx].x = Math.cos(a) * TRAIN_TRACK_RADIUS;
      this.trainCars[idx].z = Math.sin(a) * TRAIN_TRACK_RADIUS;
    });
  }

  updateSleighFlight(
    sleighFlightActive: boolean,
    flightProgress: number,
    flightTrack?: SleighFlightTrack,
  ): void {
    if (!sleighFlightActive || !flightTrack) {
      this.sleighGrounded = true;
      this.activeSleighObb = { ...this.parkedSleighObb, id: 'active-sleigh' };
      this.parkedReindeer.forEach((p, idx) => {
        this.activeFlightReindeer[idx].x = p.x;
        this.activeFlightReindeer[idx].z = p.z;
      });
      return;
    }

    const sample = flightTrack.sampleCarriagePose(
      flightProgress,
      0,
      this.activeSleighPos,
      this.activeSleighQuat,
    );
    const groundClear = sample.heightAboveGround < 1.35;
    this.sleighGrounded = groundClear;

    if (!groundClear) return;

    const euler = new THREE.Euler().setFromQuaternion(this.activeSleighQuat, 'YXZ');
    this.activeSleighObb = VillageCollisionWorld.createSleighObb(
      this.activeSleighPos.x,
      this.activeSleighPos.z,
      euler.y,
      'active-sleigh',
    );

    PAIR_LEAD_DISTANCES.forEach((leadDist, pairIdx) => {
      flightTrack.sampleCarriagePose(flightProgress, leadDist, this.tmpPairPos, this.tmpPairQuat);
      REINDEER_SIDE_X.forEach((sideX, sideIdx) => {
        this.tmpSideWorld.set(sideX, 0, 0).applyQuaternion(this.tmpPairQuat).add(this.tmpPairPos);
        const unit = this.activeFlightReindeer[pairIdx * 2 + sideIdx];
        unit.x = this.tmpSideWorld.x;
        unit.z = this.tmpSideWorld.z;
      });
    });
  }

  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  getActiveTrainCars(): ReadonlyArray<DynamicAgent> {
    return this.trainCars;
  }

  getActiveSleighObb(): ObbObstacle | null {
    return this.sleighGrounded ? this.activeSleighObb : null;
  }

  getActiveReindeerObstacles(): ReadonlyArray<CircleObstacle> {
    return this.sleighGrounded ? this.activeFlightReindeer : [];
  }

  getCharacterAgents(): DynamicAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Returns true if stepping onto `(nextX, nextZ)` would cross an occupied railway zone
   * or cut closely in front of a higher-priority dynamic character.
   */
  shouldYield(
    agentId: string,
    nextX: number,
    nextZ: number,
    radius: number,
    priority: number,
  ): boolean {
    const rCenter = Math.hypot(nextX, nextZ);
    if (Math.abs(rCenter - TRAIN_TRACK_RADIUS) < TRAIN_RING_HALF_WIDTH + radius + 0.16) {
      for (const car of this.trainCars) {
        if (Math.hypot(nextX - car.x, nextZ - car.z) < car.radius + radius + 1.15) {
          return true;
        }
      }
    }

    for (const other of this.agents.values()) {
      if (other.id === agentId) continue;
      if (other.priority > priority) {
        if (Math.hypot(nextX - other.x, nextZ - other.z) < radius + other.radius + 0.24) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Resolves desired `(desiredX, desiredZ)` against all static OBBs, static circles,
   * active train cars, grounded sleigh/reindeer, and all peer characters, storing the
   * conflict-free position in the live agent registry.
   */
  resolveAgent(
    agentId: string,
    desiredX: number,
    desiredZ: number,
    radius: number,
    priority: number,
  ): { x: number; z: number } {
    const pos = { x: desiredX, z: desiredZ };
    const staticMargin = 0.03;
    const charMargin = 0.06;

    for (let iter = 0; iter < 4; iter++) {
      for (const other of this.agents.values()) {
        if (other.id === agentId) continue;
        const minDist = radius + other.radius + charMargin;
        const dx = pos.x - other.x;
        const dz = pos.z - other.z;
        const dist = Math.hypot(dx, dz);
        if (dist < minDist) {
          let nx: number;
          let nz: number;
          if (dist > 1e-5) {
            nx = dx / dist;
            nz = dz / dist;
          } else {
            const seed = agentId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) * 0.73;
            nx = Math.cos(seed);
            nz = Math.sin(seed);
          }

          const overlap = minDist - dist;
          const tx = -nz;
          const tz = nx;
          const side = agentId < other.id ? 0.22 : -0.22;
          // Push completely outside peer radius so no pair can overlap at end of frame,
          // adding a small consistent lateral sidestep for smooth passing arcs.
          pos.x += nx * overlap + tx * (overlap * side);
          pos.z += nz * overlap + tz * (overlap * side);
        }
      }

      for (const obb of this.staticObbs) {
        pushOutOfObb(pos, radius, obb, staticMargin);
      }

      if (this.sleighGrounded) {
        pushOutOfObb(pos, radius, this.activeSleighObb, staticMargin);
        for (const deer of this.activeFlightReindeer) {
          pushOutOfCircle(pos, radius, deer.x, deer.z, deer.radius, staticMargin, 0.7);
        }
      }

      for (const c of this.staticCircles) {
        pushOutOfCircle(pos, radius, c.x, c.z, c.radius, staticMargin, 1.1);
      }

      for (const car of this.trainCars) {
        pushOutOfCircle(pos, radius, car.x, car.z, car.radius, 0.05, 0.4);
      }

      const maxIslandR = ISLAND_RADIUS - 1.5;
      const distCenter = Math.hypot(pos.x, pos.z);
      if (distCenter > maxIslandR) {
        const s = maxIslandR / distCenter;
        pos.x *= s;
        pos.z *= s;
      }
    }

    this.agents.set(agentId, {
      id: agentId,
      x: pos.x,
      z: pos.z,
      radius,
      priority,
      kind: 'character',
    });

    return pos;
  }
}

export const villageCollisionWorld = new VillageCollisionWorld();
