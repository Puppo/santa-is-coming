import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, Suspense, useState } from 'react';
import * as THREE from 'three';
import { MODEL_PATHS } from '../assets/modelRegistry';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';
import { Atmosphere } from './Atmosphere';
import { CameraRig } from './CameraRig';
import { ElfSquad } from './characters/ElfSquad';
import { HolidayGrump } from './characters/HolidayGrump';
import { RiggedSanta } from './characters/RiggedSanta';
import { FairyGarlands } from './FairyGarlands';
import { PostEffects } from './PostEffects';
import { Snowfall } from './Snowfall';
import { TerrainDiorama } from './TerrainDiorama';
import { ElfWorkshop } from './zones/ElfWorkshop';
import { GreatTreePlaza } from './zones/GreatTreePlaza';
import { PineWoods } from './zones/PineWoods';
import { SantaCabin } from './zones/SantaCabin';
import { SleighPaddock } from './zones/SleighPaddock';

// Preload core models so loading progress advances smoothly
useGLTF.preload(MODEL_PATHS.stagRigged);
useGLTF.preload(MODEL_PATHS.trainLocomotive);
useGLTF.preload(POLYHAVEN_PATHS.streetLamp);
useGLTF.preload(POLYHAVEN_PATHS.woodenBench);
useGLTF.preload(POLYHAVEN_PATHS.woodenLantern);

interface BoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            height: '100%',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p>WebGL 3D rendering is unavailable in this browser session.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function VillageCanvas() {
  const [dpr, setDpr] = useState<[number, number]>([1, 2]);
  const [enablePostFx, setEnablePostFx] = useState(true);

  return (
    <SceneErrorBoundary>
      <div className="canvas-layer">
        <Canvas
          shadows
          dpr={dpr}
          camera={{ position: [0.3, 10.4, 24.5], fov: 44, near: 0.2, far: 160 }}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.08,
            powerPreference: 'high-performance',
          }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr([1, 1.25]);
              setEnablePostFx(false);
            }}
            onIncline={() => {
              setDpr([1, 2]);
              setEnablePostFx(true);
            }}
          />

          <Atmosphere />
          <CameraRig />

          <Suspense fallback={null}>
            <TerrainDiorama />
            <FairyGarlands />
            <Snowfall count={enablePostFx ? 1100 : 550} />

            {/* Village Zones */}
            <GreatTreePlaza />
            <ElfWorkshop />
            <SantaCabin />
            <SleighPaddock />
            <PineWoods />

            {/* Animated Characters */}
            <ElfSquad />
            <RiggedSanta />
            <HolidayGrump />

            <PostEffects enabled={enablePostFx} />
          </Suspense>
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
