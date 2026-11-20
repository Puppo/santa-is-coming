import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useVillage } from '../state/villageStore';
import { ZONE_CAMERA_PRESETS } from './terrainMath';

export interface ShortestArcControls {
  setLookAt: (
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean,
  ) => Promise<void>;
  normalizeRotations: () => unknown;
}

/**
 * Transitions CameraControls to a lookAt pose and normalizes accumulated
 * multi-turn azimuth angles so the camera always takes the <=180° shortest arc.
 */
export function moveCameraShortestArc(
  controls: ShortestArcControls,
  positionX: number,
  positionY: number,
  positionZ: number,
  targetX: number,
  targetY: number,
  targetZ: number,
  enableTransition: boolean,
): void {
  void controls.setLookAt(
    positionX,
    positionY,
    positionZ,
    targetX,
    targetY,
    targetZ,
    enableTransition,
  );
  controls.normalizeRotations();
}

export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof CameraControls>>(null);
  const { activeZone, motionPaused, sleighFlightActive } = useVillage();
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const isFirstMount = useRef(true);

  const isPortrait = size.width > 0 && size.height > 0 && size.width < size.height;

  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov = isPortrait ? 54 : 44;
      if (camera.fov !== targetFov) {
        camera.fov = targetFov;
        camera.updateProjectionMatrix();
      }
    }

    const controls = controlsRef.current;
    if (!controls) return;
    const preset = ZONE_CAMERA_PRESETS[activeZone];
    const animate = !isFirstMount.current && !motionPaused;
    isFirstMount.current = false;

    if (sleighFlightActive) {
      if (isPortrait) {
        moveCameraShortestArc(controls, 0.5, 12.6, 30.2, 0.1, 2.6, 1.0, animate);
      } else {
        moveCameraShortestArc(controls, 0.3, 10.6, 24.8, 0, 2.6, 0.4, animate);
      }
      return;
    }

    if (isPortrait && activeZone === 'overview') {
      moveCameraShortestArc(controls, 0.65, 12.0, 28.6, 0.35, 1.35, 1.2, animate);
      return;
    }

    if (isPortrait && activeZone === 'sleigh') {
      moveCameraShortestArc(controls, 8.8, 5.6, 22.0, 1.9, 1.0, 9.4, animate);
      return;
    }

    const zoomOut = isPortrait ? 1.14 : 1.0;

    moveCameraShortestArc(
      controls,
      preset.position[0] * zoomOut,
      preset.position[1],
      preset.position[2] * zoomOut,
      preset.target[0],
      preset.target[1],
      preset.target[2],
      animate,
    );
  }, [activeZone, motionPaused, sleighFlightActive, isPortrait, camera, size.width, size.height]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={5.5}
      maxDistance={40}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI * 0.455}
      smoothTime={0.65}
      draggingSmoothTime={0.18}
      dollySpeed={0.8}
      truckSpeed={0.8}
      onEnd={() => {
        controlsRef.current?.normalizeRotations();
      }}
    />
  );
}
