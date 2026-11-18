import { ContactShadows, Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';
import { christmasAudioEngine } from '../audio/audioEngine';
import type { AtmosphereMode } from '../i18n/translations';
import { useVillage } from '../state/villageStore';
import { isMobileGpuDevice } from './deviceProfile';

interface AtmospherePreset {
  bg: string;
  fog: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  sunPos: [number, number, number];
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  envIntensity: number;
  auroraOpacity: number;
  starsOpacity: number;
}

const ATMOSPHERE_CONFIG: Record<AtmosphereMode, AtmospherePreset> = {
  night: {
    bg: '#081327',
    fog: '#0b1a34',
    fogDensity: 0.013,
    sunColor: '#cfe2ff',
    sunIntensity: 1.55,
    sunPos: [-15, 22, 15],
    hemiSky: '#436db2',
    hemiGround: '#1a2742',
    hemiIntensity: 0.52,
    envIntensity: 0.65,
    auroraOpacity: 0.86,
    starsOpacity: 0.95,
  },
  twilight: {
    bg: '#1c2447',
    fog: '#242e57',
    fogDensity: 0.011,
    sunColor: '#ffbe8a',
    sunIntensity: 1.85,
    sunPos: [18, 12, 14],
    hemiSky: '#6d7db8',
    hemiGround: '#323a54',
    hemiIntensity: 0.68,
    envIntensity: 0.78,
    auroraOpacity: 0.45,
    starsOpacity: 0.5,
  },
  day: {
    bg: '#b9dcf7',
    fog: '#c9e5fa',
    fogDensity: 0.008,
    sunColor: '#fff3dd',
    sunIntensity: 2.35,
    sunPos: [16, 22, 16],
    hemiSky: '#e8f4ff',
    hemiGround: '#6f87a6',
    hemiIntensity: 0.88,
    envIntensity: 0.95,
    auroraOpacity: 0,
    starsOpacity: 0,
  },
};

const AURORA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AURORA_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uBoost;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    float wave = noise(vec2(vUv.x * 5.0 + uTime * 0.08, vUv.y * 2.5 - uTime * 0.04));
    float curtain = smoothstep(0.28, 0.78, wave) * sin(vUv.y * 3.14159);
    float edgeFade = sin(vUv.x * 3.14159);
    vec3 emerald = vec3(0.18, 0.92, 0.58);
    vec3 violet = vec3(0.45, 0.36, 0.95);
    vec3 col = mix(emerald, violet, smoothstep(0.32, 0.88, vUv.y + wave * 0.25));
    float alpha = curtain * edgeFade * uOpacity * (0.55 + uBoost * 0.35);
    gl_FragColor = vec4(col * (1.35 + uBoost * 0.65), clamp(alpha, 0.0, 0.9));
  }
`;

export function Atmosphere() {
  const { atmosphere, motionPaused, partyMode, isMusicPlaying } = useVillage();
  const cfg = ATMOSPHERE_CONFIG[atmosphere];
  const mobileGpu = useMemo(() => isMobileGpuDevice(), []);

  const auroraMatRef = useRef<THREE.ShaderMaterial>(null);

  const starsGeo = useMemo(() => {
    const count = 420;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = ((i * 137.508) % 360) * (Math.PI / 180);
      const phi = Math.acos(0.15 + ((i * 0.6180339) % 0.84));
      const r = 58 + (i % 7) * 2;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  const auroraUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.86 },
      uBoost: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    const bands = christmasAudioEngine.sampleBands(
      isMusicPlaying,
      partyMode,
      state.clock.elapsedTime,
    );
    if (auroraMatRef.current) {
      if (!motionPaused) {
        auroraMatRef.current.uniforms.uTime.value += delta;
      }
      auroraMatRef.current.uniforms.uOpacity.value = THREE.MathUtils.lerp(
        auroraMatRef.current.uniforms.uOpacity.value,
        cfg.auroraOpacity,
        0.08,
      );
      auroraMatRef.current.uniforms.uBoost.value = partyMode ? bands.energy : 0;
    }
  });

  const activeHdri = atmosphere === 'day' ? POLYHAVEN_PATHS.hdriDay : POLYHAVEN_PATHS.hdriNight;

  return (
    <>
      <color attach="background" args={[cfg.bg]} />
      <fogExp2 attach="fog" args={[cfg.fog, cfg.fogDensity]} />

      <Suspense fallback={null}>
        <Environment files={activeHdri} environmentIntensity={cfg.envIntensity} />
      </Suspense>

      <hemisphereLight args={[cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity]} />

      <directionalLight
        castShadow
        position={cfg.sunPos}
        color={cfg.sunColor}
        intensity={cfg.sunIntensity}
        shadow-mapSize={mobileGpu ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={2}
        shadow-camera-far={72}
        shadow-camera-left={-23}
        shadow-camera-right={23}
        shadow-camera-top={23}
        shadow-camera-bottom={-23}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />

      {/* Cool rim light to separate cabin silhouettes and snow drifts */}
      <directionalLight position={[14, 10, -18]} color="#7db4ff" intensity={0.45} />

      {/* Grounding contact shadows across central plaza (desktop GPUs only) */}
      {!mobileGpu && (
        <ContactShadows
          position={[0, 0.02, 1.5]}
          opacity={0.34}
          scale={34}
          blur={2.1}
          far={5}
          resolution={512}
          frames={1}
          color="#091529"
        />
      )}

      {/* Arctic Stars */}
      {cfg.starsOpacity > 0 && (
        <points geometry={starsGeo} frustumCulled={false}>
          <pointsMaterial
            color="#eef5ff"
            size={0.32}
            transparent
            opacity={cfg.starsOpacity}
            sizeAttenuation
            depthWrite={false}
          />
        </points>
      )}

      {/* Curved Aurora Borealis Sky Curtain */}
      {cfg.auroraOpacity > 0 && (
        <mesh position={[0, 12.2, -25]} rotation={[0.22, 0, 0]} renderOrder={-1}>
          <cylinderGeometry args={[38, 42, 18, 48, 1, true, Math.PI * 0.66, Math.PI * 0.68]} />
          <shaderMaterial
            ref={auroraMatRef}
            vertexShader={AURORA_VERT}
            fragmentShader={AURORA_FRAG}
            uniforms={auroraUniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </>
  );
}
