import type { ZoneId } from '../i18n/translations';

export const ISLAND_RADIUS = 25;

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Deterministic snow heightmap shared by the terrain mesh, buildings, props,
 * and patrolling characters so every object sits grounded on the snow.
 */
export function getGroundHeight(x: number, z: number): number {
  const distCenter = Math.hypot(x, z);

  // Flat central plaza for Great Tree and toy train ring
  const plazaBlend = smoothstep(4.2, 7.2, distCenter);

  // Subtle organic undulation
  let h =
    plazaBlend * (0.18 * Math.sin(x * 0.24) * Math.cos(z * 0.22) + 0.12 * Math.cos((x + z) * 0.16));

  // Workshop terrace (-8.5, -3.8)
  const dWorkshop = Math.hypot(x + 8.5, z + 3.8);
  const workshopFlat = 1 - smoothstep(3.2, 6.2, dWorkshop);
  h = h * (1 - workshopFlat) + 0.32 * workshopFlat;

  // Santa's Cabin terrace (8.2, -4.2)
  const dCabin = Math.hypot(x - 8.2, z + 4.2);
  const cabinFlat = 1 - smoothstep(3.4, 6.4, dCabin);
  h = h * (1 - cabinFlat) + 0.36 * cabinFlat;

  // Sleigh & Reindeer Paddock (-1.2, 9.2)
  const dSleigh = Math.hypot(x + 1.2, z - 9.2);
  const sleighFlat = 1 - smoothstep(3.8, 6.8, dSleigh);
  h = h * (1 - sleighFlat) + 0.08 * sleighFlat;

  // Frozen Skating Pond (5.6, 5.4) recessed smoothly below ice level (-0.16)
  const dPond = Math.hypot(x - 5.6, z - 5.4);
  const pondDip = 1 - smoothstep(2.3, 4.1, dPond);
  h -= 0.42 * pondDip;

  // Scenic Alpine ridge along back edge (z < -9)
  const northRidge = smoothstep(-8.5, -21, z);
  const ridgeContour = 1.0 + 0.35 * Math.sin(x * 0.28 + 0.6);
  h += northRidge * 2.8 * ridgeContour * (1 - Math.max(workshopFlat, cabinFlat) * 0.8);

  // Gentle rim taper near diorama edge so snow wraps over the plinth
  const edgeTaper = smoothstep(ISLAND_RADIUS - 3.5, ISLAND_RADIUS, distCenter);
  h -= edgeTaper * 0.55;

  return h;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export const ZONE_CAMERA_PRESETS: Record<ZoneId, CameraPreset> = {
  overview: {
    position: [0.3, 10.4, 24.5],
    target: [0, 1.9, 0.2],
  },
  tree: {
    position: [5.4, 4.4, 7.6],
    target: [0, 2.4, 0],
  },
  workshop: {
    position: [-2.2, 4.6, 3.8],
    target: [-8.4, 1.6, -3.6],
  },
  sleigh: {
    position: [5.4, 4.2, 16.4],
    target: [1.15, 1.05, 9.5],
  },
  cabin: {
    position: [1.8, 4.5, 3.4],
    target: [8.2, 1.7, -4.0],
  },
};
