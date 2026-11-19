import * as THREE from 'three';
import { getGroundHeight } from './terrainMath';

export const PADDOCK_X = -1.2;
export const PADDOCK_Z = 9.2;
export const BASE_ROT_Y = Math.PI * 0.46;
export const PAIR_LEAD_DISTANCES = [2.05, 3.65, 5.25] as const;
export const MAX_REINDEER_LEAD = 5.25;

const EASE_ACCEL_END = 0.08;
const EASE_DECEL_START = 0.9;
const CRUISE_RATE = 2 / (1 + EASE_DECEL_START - EASE_ACCEL_END);

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Maps linear flight progress [0, 1] to C1-smooth runway acceleration, cruise, and deceleration.
 */
export function easeFlightProgress(u: number): number {
  const t = Math.max(0, Math.min(1, u));
  if (t < EASE_ACCEL_END) {
    return 0.5 * (CRUISE_RATE / EASE_ACCEL_END) * t * t;
  }
  if (t <= EASE_DECEL_START) {
    return 0.5 * CRUISE_RATE * EASE_ACCEL_END + CRUISE_RATE * (t - EASE_ACCEL_END);
  }
  const rem = 1 - t;
  return 1 - 0.5 * (CRUISE_RATE / (1 - EASE_DECEL_START)) * rem * rem;
}

function flightSpeedFactor(u: number): number {
  const t = Math.max(0, Math.min(1, u));
  if (t < EASE_ACCEL_END) {
    return t / EASE_ACCEL_END;
  }
  if (t <= EASE_DECEL_START) {
    return 1;
  }
  return (1 - t) / (1 - EASE_DECEL_START);
}

export interface CarriageSample {
  heightAboveGround: number;
  speedFactor: number;
}

export interface SleighFlightTrack {
  readonly curve: THREE.CatmullRomCurve3;
  readonly totalLength: number;
  readonly travelLength: number;
  sampleCarriagePose: (
    flightProgress: number,
    leadOffset: number,
    outPos: THREE.Vector3,
    outQuat: THREE.Quaternion,
  ) => CarriageSample;
}

/**
 * Builds the articulated paddock runway + sky loop curve shared by the sleigh and reindeer pairs.
 */
export function createSleighFlightTrack(): SleighFlightTrack {
  const forward = new THREE.Vector3(Math.sin(BASE_ROT_Y), 0, Math.cos(BASE_ROT_Y));
  const runwayPoint = (dist: number): THREE.Vector3 => {
    const x = PADDOCK_X + forward.x * dist;
    const z = PADDOCK_Z + forward.z * dist;
    return new THREE.Vector3(x, getGroundHeight(x, z) + 0.03, z);
  };

  const pts = [
    runwayPoint(0),
    runwayPoint(2.6),
    runwayPoint(5.25),
    new THREE.Vector3(6.0, 1.35, 9.1),
    new THREE.Vector3(5.6, 4.6, 2.2),
    new THREE.Vector3(1.8, 7.0, -5.6),
    new THREE.Vector3(-4.8, 6.2, -4.0),
    new THREE.Vector3(-5.6, 3.8, 3.2),
    new THREE.Vector3(-4.9, 1.15, 7.9),
    runwayPoint(-2.4),
    runwayPoint(0),
    runwayPoint(2.6),
    runwayPoint(5.25),
  ];

  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.5);
  curve.arcLengthDivisions = 600;
  const totalLength = curve.getLength();
  const travelLength = totalLength - MAX_REINDEER_LEAD;

  const tmpTan = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  const dummyObj = new THREE.Object3D();

  return {
    curve,
    totalLength,
    travelLength,
    sampleCarriagePose(
      flightProgress: number,
      leadOffset: number,
      outPos: THREE.Vector3,
      outQuat: THREE.Quaternion,
    ): CarriageSample {
      const clampedProgress = Math.max(0, Math.min(1, flightProgress));
      const eased = easeFlightProgress(clampedProgress);
      const dist = THREE.MathUtils.clamp(eased * travelLength + leadOffset, 0, totalLength);
      const uCurve = dist / totalLength;

      curve.getPointAt(uCurve, outPos);
      const groundFloor = getGroundHeight(outPos.x, outPos.z) + 0.03;
      if (outPos.y < groundFloor) {
        outPos.y = groundFloor;
      }

      const heightAboveGround = Math.max(0, outPos.y - groundFloor);
      curve.getTangentAt(uCurve, tmpTan);
      tmpTan.y *= smoothstep(0.02, 0.35, heightAboveGround);
      tmpTan.normalize();

      const roll = Math.sin(eased * Math.PI * 4) * 0.12 * smoothstep(0.08, 0.7, heightAboveGround);

      dummyObj.position.copy(outPos);
      dummyObj.up.set(0, 1, 0);
      dummyObj.lookAt(tmpTarget.copy(outPos).add(tmpTan));
      dummyObj.rotateZ(roll);
      outQuat.copy(dummyObj.quaternion);

      return {
        heightAboveGround,
        speedFactor: flightSpeedFactor(clampedProgress),
      };
    },
  };
}
