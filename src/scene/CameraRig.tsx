import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { type ComponentRef, useEffect, useRef } from 'react';
import { useVillage } from '../state/villageStore';
import { ZONE_CAMERA_PRESETS } from './terrainMath';

export function CameraRig() {
  const controlsRef = useRef<ComponentRef<typeof CameraControls>>(null);
  const { activeZone, motionPaused } = useVillage();
  const size = useThree((s) => s.size);
  const isFirstMount = useRef(true);

  const isPortrait = size.width < size.height;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const preset = ZONE_CAMERA_PRESETS[activeZone];
    const animate = !isFirstMount.current && !motionPaused;
    isFirstMount.current = false;

    const zoomOut = isPortrait ? (activeZone === 'overview' ? 1.32 : 1.22) : 1.0;

    void controls.setLookAt(
      preset.position[0] * zoomOut,
      preset.position[1] * (isPortrait && activeZone === 'overview' ? 1.18 : 1.0),
      preset.position[2] * zoomOut,
      preset.target[0],
      preset.target[1],
      preset.target[2],
      animate,
    );
  }, [activeZone, motionPaused, isPortrait]);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minDistance={5.5}
      maxDistance={36}
      minPolarAngle={0.22}
      maxPolarAngle={Math.PI * 0.455}
      smoothTime={0.65}
      draggingSmoothTime={0.18}
      dollySpeed={0.8}
      truckSpeed={0.8}
    />
  );
}
