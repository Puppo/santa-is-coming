import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, type ReactNode, Suspense, useMemo, useState } from 'react';
import * as THREE from 'three';
import { MODEL_PATHS } from '../assets/modelRegistry';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';
import { Atmosphere } from './Atmosphere';
import { CameraRig } from './CameraRig';
import { ElfSquad } from './characters/ElfSquad';
import { HolidayGrump } from './characters/HolidayGrump';
import { RiggedSanta } from './characters/RiggedSanta';
import { isMobileGpuDevice } from './deviceProfile';
import { FairyGarlands } from './FairyGarlands';
import { PostEffects } from './PostEffects';
import { Snowfall } from './Snowfall';
import { ProceduralTerrainFallback, TerrainDiorama } from './TerrainDiorama';
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
  const initialMobile = useMemo(() => isMobileGpuDevice(), []);
  const [dpr, setDpr] = useState<[number, number]>(initialMobile ? [1, 1.5] : [1, 2]);
  const [enablePostFx, setEnablePostFx] = useState(!initialMobile);

  return (
    <SceneErrorBoundary>
      <div className="canvas-layer">
        <Canvas
          shadows
          dpr={dpr}
          camera={{ position: [0.3, 10.4, 24.5], fov: 44, near: 0.2, far: 160 }}
          gl={{
            antialias: !initialMobile,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: initialMobile ? 1.14 : 1.08,
            powerPreference: initialMobile ? 'default' : 'high-performance',
          }}
        >
          <PerformanceMonitor
            onDecline={() => {
              setDpr([1, 1.25]);
              setEnablePostFx(false);
            }}
            onIncline={() => {
              setDpr(initialMobile ? [1, 1.5] : [1, 2]);
              setEnablePostFx(!initialMobile);
            }}
          />

          <Atmosphere />
          <CameraRig />

          {/* Immediate zero-network village motion, snow, garlands & characters */}
          <FairyGarlands />
          <Snowfall count={initialMobile ? 480 : enablePostFx ? 1100 : 550} />
          <ElfSquad />
          <RiggedSanta />
          <HolidayGrump />

          {/* Terrain streams PBR maps progressively over an instant procedural island */}
          <Suspense fallback={<ProceduralTerrainFallback />}>
            <TerrainDiorama mobileGpu={initialMobile} />
          </Suspense>

          {/* Zones stream in independently so no single asset blocks the whole diorama */}
          <Suspense fallback={null}>
            <GreatTreePlaza />
          </Suspense>
          <Suspense fallback={null}>
            <ElfWorkshop />
          </Suspense>
          <Suspense fallback={null}>
            <SantaCabin />
          </Suspense>
          <Suspense fallback={null}>
            <SleighPaddock />
          </Suspense>
          <Suspense fallback={null}>
            <PineWoods />
          </Suspense>

          <Suspense fallback={null}>
            <PostEffects enabled={enablePostFx} />
          </Suspense>
        </Canvas>
      </div>
    </SceneErrorBoundary>
  );
}
