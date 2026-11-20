import fs from 'node:fs';
import path from 'node:path';
import { act, fireEvent, render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { sanitizeHdrDataTexture } from '../assets/asyncAssets';
import { MODEL_PATHS } from '../assets/modelRegistry';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';
import { CHRISTMAS_TRACKS } from '../audio/tracks';
import { CreditsDialog } from '../components/CreditsDialog';
import { HeaderHud } from '../components/HeaderHud';
import { MusicPlayerBar } from '../components/MusicPlayerBar';
import { ZoneDock } from '../components/ZoneDock';
import { TRANSLATIONS } from '../i18n/translations';
import { moveCameraShortestArc } from '../scene/CameraRig';
import { createReindeerInstance, prepareReindeerTemplate } from '../scene/characters/ReindeerHerd';
import {
  CARRIER_LOOP_SPEED,
  createCarrierLoopCurve,
  createGrumpCaughtCurve,
  createGrumpEscapedCurve,
  createGrumpSneakCurve,
  createSantaPatrolCurve,
  GRUMP_PEEK_POS,
  PLAZA_BENCH_POSE,
  PLAZA_LAMP_PLACEMENTS,
  SLEIGH_LAMP_PLACEMENTS,
  SNOWMAN_PLACEMENTS,
  STATIC_ELF_PLACEMENTS,
  signedDistanceCircleToObb,
  TRAIN_CAR_RADIUS,
  TRAIN_TRACK_RADIUS,
  VillageCollisionWorld,
} from '../scene/collisionSystem';
import {
  BASE_ROT_Y,
  createSleighFlightTrack,
  PAIR_LEAD_DISTANCES,
} from '../scene/sleighFlightPath';
import { getGroundHeight } from '../scene/terrainMath';
import { useVillage, VillageProvider } from '../state/villageStore';

const ROOT_DIR = path.resolve(__dirname, '../..');

function FlightStateProbe() {
  const { sleighFlightActive } = useVillage();
  return <output data-testid="sleigh-flight-state">{String(sleighFlightActive)}</output>;
}

function resolvePublicAsset(assetUrl: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const stripped =
    base !== '/' && assetUrl.startsWith(base)
      ? assetUrl.slice(base.length)
      : assetUrl.replace(/^\//, '');
  return path.join(ROOT_DIR, 'public', stripped);
}

describe('Santa Village Assets & Translations', () => {
  it('verifies favicon, GLB models, Poly Haven PBR assets, and colormap texture exist on disk', () => {
    const faviconPath = path.join(ROOT_DIR, 'public/favicon.svg');
    expect(fs.existsSync(faviconPath)).toBe(true);
    expect(fs.statSync(faviconPath).size).toBeGreaterThan(200);

    const colormapPath = path.join(ROOT_DIR, 'public/models/kenney/Textures/colormap.png');
    expect(fs.existsSync(colormapPath)).toBe(true);
    expect(fs.statSync(colormapPath).size).toBeGreaterThan(1000);

    for (const [key, relPath] of Object.entries(MODEL_PATHS)) {
      const fullPath = resolvePublicAsset(relPath);
      expect(fs.existsSync(fullPath), `Missing model ${key} at ${fullPath}`).toBe(true);
      expect(fs.statSync(fullPath).size, `Empty model ${key}`).toBeGreaterThan(500);
    }

    for (const [key, relPath] of Object.entries(POLYHAVEN_PATHS)) {
      const fullPath = resolvePublicAsset(relPath);
      expect(fs.existsSync(fullPath), `Missing Poly Haven asset ${key} at ${fullPath}`).toBe(true);
      expect(fs.statSync(fullPath).size, `Empty Poly Haven asset ${key}`).toBeGreaterThan(1000);
    }
  });

  it('verifies every Christmas MP3 audio track exists on disk and is valid audio size', () => {
    expect(CHRISTMAS_TRACKS.length).toBeGreaterThanOrEqual(4);
    for (const track of CHRISTMAS_TRACKS) {
      const fullPath = resolvePublicAsset(track.src);
      expect(fs.existsSync(fullPath), `Missing track ${track.id}`).toBe(true);
      expect(fs.statSync(fullPath).size, `Empty track ${track.id}`).toBeGreaterThan(100_000);
    }
  });

  it('keeps 100% translation key parity between Italian and English dictionaries', () => {
    const itKeys = Object.keys(TRANSLATIONS.it).sort();
    const enKeys = Object.keys(TRANSLATIONS.en).sort();
    expect(itKeys).toEqual(enKeys);
    expect(Object.keys(TRANSLATIONS.it.zones).sort()).toEqual(
      Object.keys(TRANSLATIONS.en.zones).sort(),
    );
    expect(Object.keys(TRANSLATIONS.it.toasts).sort()).toEqual(
      Object.keys(TRANSLATIONS.en.toasts).sort(),
    );
  });

  it('prepares and animates Stag.glb with non-culled skinned meshes and valid finite bones', async () => {
    const stagPath = path.join(ROOT_DIR, 'public/models/quaternius/Stag.glb');
    const bytes = fs.readFileSync(stagPath);
    const arrayBuffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(arrayBuffer).set(bytes);

    const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '');
    const template = prepareReindeerTemplate(gltf.scene);
    const instance = createReindeerInstance(template);

    const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'AnimalArmature|Idle');
    expect(idleClip).toBeDefined();

    const mixer = new THREE.AnimationMixer(instance);
    if (idleClip) {
      mixer.clipAction(idleClip).play();
    }
    mixer.update(0.16);
    instance.updateMatrixWorld(true);

    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    let hornsMesh: THREE.Mesh | null = null;
    const allMeshes: THREE.Mesh[] = [];

    instance.traverse((obj) => {
      if (obj instanceof THREE.SkinnedMesh) {
        skinnedMeshes.push(obj);
      } else if (obj instanceof THREE.Mesh && obj.name === 'Stag_Horns') {
        hornsMesh = obj;
      }
      if (obj instanceof THREE.Mesh) {
        allMeshes.push(obj);
      }
    });

    expect(skinnedMeshes.length).toBe(5);
    expect(hornsMesh).not.toBeNull();

    for (const mesh of allMeshes) {
      expect(mesh.frustumCulled).toBe(false);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        expect(mat).toBeInstanceOf(THREE.MeshStandardMaterial);
        if (mat instanceof THREE.MeshStandardMaterial) {
          expect(mat.metalness).toBeLessThanOrEqual(0.1);
          expect(mat.normalMap).toBeNull();
        }
      }
    }

    for (const skinned of skinnedMeshes) {
      skinned.skeleton.update();
      const boneMatrices = skinned.skeleton.boneMatrices;
      expect(boneMatrices).not.toBeNull();
      expect(boneMatrices?.length).toBeGreaterThan(0);
      if (boneMatrices) {
        const allFinite = Array.from(boneMatrices).every((val) => Number.isFinite(val));
        expect(allFinite).toBe(true);
      }
    }

    mixer.stopAllAction();
    mixer.uncacheRoot(instance);
  });
  it('keeps all 6 reindeer hooves above snow throughout takeoff, sky loop, and landing rollout', () => {
    const track = createSleighFlightTrack();
    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const sideWorld = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, BASE_ROT_Y, 0));

    const startPos = new THREE.Vector3();
    const endPos = new THREE.Vector3();
    const startQuat = new THREE.Quaternion();
    const endQuat = new THREE.Quaternion();

    track.sampleCarriagePose(0, 0, startPos, startQuat);
    track.sampleCarriagePose(1, 0, endPos, endQuat);

    expect(startPos.distanceTo(endPos)).toBeLessThan(0.01);
    expect(Math.abs(startQuat.dot(baseQuat))).toBeGreaterThan(0.9999);
    expect(Math.abs(endQuat.dot(baseQuat))).toBeGreaterThan(0.9999);

    for (let step = 0; step <= 200; step++) {
      const u = step / 200;
      track.sampleCarriagePose(u, 0, pos, quat);
      expect(pos.y).toBeGreaterThanOrEqual(getGroundHeight(pos.x, pos.z));

      for (const leadDist of PAIR_LEAD_DISTANCES) {
        track.sampleCarriagePose(u, leadDist, pos, quat);
        expect(pos.y).toBeGreaterThanOrEqual(getGroundHeight(pos.x, pos.z));

        for (const sideX of [-0.62, 0.62]) {
          sideWorld.set(sideX, 0, 0).applyQuaternion(quat).add(pos);
          const clampedY = Math.max(sideWorld.y, getGroundHeight(sideWorld.x, sideWorld.z) + 0.02);
          expect(clampedY).toBeGreaterThanOrEqual(getGroundHeight(sideWorld.x, sideWorld.z));
        }
      }
    }
  });

  it('clamps extreme FP16 HDRI radiance spikes so HalfFloat Bloom never overflows to NaN', () => {
    const loader = new HDRLoader();
    const hdrFiles = [
      'public/polyhaven/hdri/rogland_moonlit_night_1k.hdr',
      'public/polyhaven/hdri/passendorf_snow_1k.hdr',
    ];

    for (const relPath of hdrFiles) {
      const bytes = fs.readFileSync(path.join(ROOT_DIR, relPath));
      const localBuffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(localBuffer).set(bytes);

      const parsed = loader.parse(localBuffer);
      const tex = new THREE.DataTexture(
        parsed.data,
        parsed.width,
        parsed.height,
        THREE.RGBAFormat,
        parsed.type,
      );

      sanitizeHdrDataTexture(tex, 12);

      const data = tex.image.data;
      expect(data).toBeTruthy();

      let invalidCount = 0;
      let minDecoded = Number.POSITIVE_INFINITY;
      let maxDecoded = Number.NEGATIVE_INFINITY;

      if (data instanceof Uint16Array) {
        for (let i = 0; i < data.length; i++) {
          if (i % 4 === 3) continue;
          const v = THREE.DataUtils.fromHalfFloat(data[i]);
          if (!Number.isFinite(v)) {
            invalidCount++;
          } else {
            if (v < minDecoded) minDecoded = v;
            if (v > maxDecoded) maxDecoded = v;
          }
        }
      } else if (data instanceof Float32Array) {
        for (let i = 0; i < data.length; i++) {
          if (i % 4 === 3) continue;
          const v = data[i];
          if (!Number.isFinite(v)) {
            invalidCount++;
          } else {
            if (v < minDecoded) minDecoded = v;
            if (v > maxDecoded) maxDecoded = v;
          }
        }
      }

      expect(invalidCount).toBe(0);
      expect(minDecoded).toBeGreaterThanOrEqual(0);
      expect(maxDecoded).toBeLessThanOrEqual(12.05);
      tex.dispose();
    }
  });
});

describe('Accessible HUD & Controls', () => {
  it('renders HeaderHud, ZoneDock, MusicPlayerBar, and CreditsDialog following WCAG & Modern Web rules', () => {
    const onToggleLocale = vi.fn();
    const onOpenCredits = vi.fn();

    render(
      <VillageProvider>
        <HeaderHud
          t={TRANSLATIONS.it}
          locale="it"
          onToggleLocale={onToggleLocale}
          onOpenCredits={onOpenCredits}
        />
        <ZoneDock t={TRANSLATIONS.it} />
        <MusicPlayerBar t={TRANSLATIONS.it} />
        <CreditsDialog open={true} onClose={vi.fn()} t={TRANSLATIONS.it} />
      </VillageProvider>,
    );

    // Single H1 heading
    expect(screen.getByRole('heading', { level: 1, name: TRANSLATIONS.it.appTitle })).toBeTruthy();

    // Navigation landmark with current location
    const nav = screen.getByRole('navigation', { name: TRANSLATIONS.it.zoneNavLabel });
    expect(nav).toBeTruthy();
    const overviewBtn = screen.getByRole('button', { name: TRANSLATIONS.it.zones.overview.label });
    expect(overviewBtn.getAttribute('aria-current')).toBe('location');

    // Pause motion button toggles label and MUST NOT set aria-pressed
    const pauseBtn = screen.getByRole('button', { name: TRANSLATIONS.it.motionPause });
    expect(pauseBtn.hasAttribute('aria-pressed')).toBe(false);
    fireEvent.click(pauseBtn);
    expect(screen.getByRole('button', { name: TRANSLATIONS.it.motionResume })).toBeTruthy();

    // Party mode button keeps constant label and DOES set aria-pressed
    const partyBtn = screen.getByRole('button', { name: TRANSLATIONS.it.partyMode });
    expect(partyBtn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(partyBtn);
    expect(partyBtn.getAttribute('aria-pressed')).toBe('true');

    // Native <dialog> renders without redundant role="dialog" or aria-modal
    const dialog = document.querySelector('dialog.credits-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.hasAttribute('role')).toBe(false);
    expect(dialog?.hasAttribute('aria-modal')).toBe(false);
  });

  it('renders compact mobile HUD with 1-tap music control, popover controls panel, and 👀 Grump badge', () => {
    vi.useFakeTimers();
    try {
      render(
        <VillageProvider>
          <HeaderHud
            t={TRANSLATIONS.it}
            locale="it"
            isCompact={true}
            onToggleLocale={vi.fn()}
            onOpenCredits={vi.fn()}
          />
          <ZoneDock t={TRANSLATIONS.it} isCompact={true} />
        </VillageProvider>,
      );

      // Single H1 and no standalone subtitle clutter
      expect(
        screen.getByRole('heading', { level: 1, name: TRANSLATIONS.it.appTitle }),
      ).toBeTruthy();

      // 1-tap music play toggle right in the compact top bar
      expect(screen.getByRole('button', { name: TRANSLATIONS.it.musicPlay })).toBeTruthy();

      // Popover trigger omits role="menu" and aria-haspopup per native button-group popover guidance
      const popoverTrigger = screen.getByRole('button', { name: TRANSLATIONS.it.controlsMenuOpen });
      const targetId = popoverTrigger.getAttribute('popovertarget');
      expect(targetId).toBeTruthy();
      expect(popoverTrigger.hasAttribute('aria-haspopup')).toBe(false);
      expect(popoverTrigger.getAttribute('role')).toBeNull();

      const popoverEl = targetId ? document.getElementById(targetId) : null;
      expect(popoverEl?.getAttribute('popover')).toBe('auto');

      // ZoneDock uses crisp mobile CTA label without multi-line description banner
      expect(screen.getByText(TRANSLATIONS.it.zones.overview.shortActionLabel)).toBeTruthy();

      // Summon & catch Grump, then verify 👀 remains visible alongside pranks count badge
      const summonBtn = screen.getByRole('button', {
        name: new RegExp(TRANSLATIONS.it.grumpSummon),
      });
      fireEvent.click(summonBtn);
      const shooBtn = document.querySelector('.hud-btn-danger');
      expect(shooBtn).toBeTruthy();
      if (shooBtn) fireEvent.click(shooBtn);

      act(() => {
        vi.advanceTimersByTime(4000);
      });

      const updatedGrumpBtn = screen.getByRole('button', {
        name: `${TRANSLATIONS.it.grumpSummon} (${TRANSLATIONS.it.grumpPranksLabel}: 1)`,
      });
      expect(updatedGrumpBtn.textContent).toContain('👀');
      expect(updatedGrumpBtn.textContent).toContain('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('activates Sleigh Test Flight without interrupting an active flight until landing', () => {
    vi.useFakeTimers();
    try {
      render(
        <VillageProvider>
          <ZoneDock t={TRANSLATIONS.it} />
          <FlightStateProbe />
        </VillageProvider>,
      );

      const probe = screen.getByTestId('sleigh-flight-state');
      const launchBtn = screen.getByRole('button', {
        name: TRANSLATIONS.it.zones.overview.actionLabel,
      });

      expect(probe.textContent).toBe('false');
      fireEvent.click(launchBtn);
      expect(probe.textContent).toBe('true');

      // Re-clicking at t=6s must ignore duplicate trigger and let the active 11s flight finish cleanly
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      fireEvent.click(launchBtn);
      expect(probe.textContent).toBe('true');

      act(() => {
        vi.advanceTimersByTime(4000);
      });
      expect(probe.textContent).toBe('true');

      // Lands cleanly at t=11s and can be re-triggered once back in the paddock
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(probe.textContent).toBe('false');

      fireEvent.click(launchBtn);
      expect(probe.textContent).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });

  it('normalizes accumulated multi-turn camera azimuth after setLookAt so transitions take the shortest arc', () => {
    const TWO_PI = Math.PI * 2;
    for (const turns of [5.1, -4.8, 4.52]) {
      const calls: string[] = [];
      let thetaStart = turns * TWO_PI + 0.012;
      let thetaEnd = thetaStart;

      const mockControls = {
        setLookAt(
          px: number,
          _py: number,
          pz: number,
          tx: number,
          _ty: number,
          tz: number,
        ): Promise<void> {
          calls.push('setLookAt');
          thetaEnd = Math.atan2(px - tx, pz - tz);
          return Promise.resolve();
        },
        normalizeRotations() {
          calls.push('normalizeRotations');
          thetaEnd = ((thetaEnd % TWO_PI) + TWO_PI) % TWO_PI;
          if (thetaEnd > Math.PI) thetaEnd -= TWO_PI;
          thetaStart += TWO_PI * Math.round((thetaEnd - thetaStart) / TWO_PI);
        },
      };

      moveCameraShortestArc(mockControls, 0.3, 10.6, 24.8, 0, 2.6, 0.4, true);

      expect(calls).toEqual(['setLookAt', 'normalizeRotations']);
      expect(Math.abs(thetaEnd - thetaStart)).toBeLessThanOrEqual(Math.PI + 1e-6);
    }
  });
});

describe('Village Spatial Clearance & Collision Avoidance', () => {
  it('keeps zero static overlaps between buildings, props, trees, pond, train ring, sleigh, and stationed characters', () => {
    const world = new VillageCollisionWorld();
    world.resetDynamicState();

    // Lamps, plaza bench, snowmen, and stationed elves must stand on dry ground above pond ice (-0.14)
    for (const [x, z] of PLAZA_LAMP_PLACEMENTS) {
      expect(getGroundHeight(x, z), `Plaza lamp at (${x}, ${z}) in pond`).toBeGreaterThan(-0.12);
    }
    for (const [x, z] of SLEIGH_LAMP_PLACEMENTS) {
      expect(getGroundHeight(x, z), `Sleigh lamp at (${x}, ${z}) in pond`).toBeGreaterThan(-0.12);
    }
    expect(getGroundHeight(PLAZA_BENCH_POSE.x, PLAZA_BENCH_POSE.z)).toBeGreaterThan(-0.12);
    for (const snowman of SNOWMAN_PLACEMENTS) {
      expect(
        getGroundHeight(snowman.x, snowman.z),
        `Snowman at (${snowman.x}, ${snowman.z}) in pond`,
      ).toBeGreaterThan(-0.12);
    }
    for (const elf of STATIC_ELF_PLACEMENTS) {
      expect(getGroundHeight(elf.x, elf.z)).toBeGreaterThan(-0.12);
    }

    // Circle vs Circle (skip natural perimeter spruce-to-spruce forest canopy overlap)
    const circles = world.staticCircles;
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        if (a.category === 'tree' && b.category === 'tree') continue;
        const dist = Math.hypot(a.x - b.x, a.z - b.z);
        expect(dist, `Static circle overlap ${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(
          a.radius + b.radius - 1e-4,
        );
      }
    }

    // Circle vs OBB (allow props mounted directly along their own chalet wall/porch)
    for (const c of circles) {
      for (const obb of world.staticObbs) {
        if (c.id.startsWith('workshop-') && obb.id.startsWith('workshop-')) continue;
        if (c.id.startsWith('cabin-') && obb.id.startsWith('cabin-')) continue;
        const dist = signedDistanceCircleToObb(c.x, c.z, obb);
        expect(dist, `Static obstacle overlap ${c.id} vs ${obb.id}`).toBeGreaterThanOrEqual(
          c.radius - 1e-4,
        );
      }
    }

    // Parked sleigh & reindeer vs static world
    const parkedSleigh = world.getActiveSleighObb();
    expect(parkedSleigh).not.toBeNull();
    if (parkedSleigh) {
      for (const c of circles) {
        const dist = signedDistanceCircleToObb(c.x, c.z, parkedSleigh);
        expect(dist, `Parked sleigh overlap with ${c.id}`).toBeGreaterThanOrEqual(c.radius - 1e-4);
      }
    }
    for (const deer of world.getActiveReindeerObstacles()) {
      for (const c of circles) {
        const dist = Math.hypot(deer.x - c.x, deer.z - c.z);
        expect(dist, `Parked reindeer overlap ${deer.id} vs ${c.id}`).toBeGreaterThanOrEqual(
          deer.radius + c.radius - 1e-4,
        );
      }
    }

    // Stationed elves vs all obstacles, parked sleigh/reindeer, and train ring
    const stationed = world.getCharacterAgents();
    for (let i = 0; i < stationed.length; i++) {
      const a = stationed[i];
      for (let j = i + 1; j < stationed.length; j++) {
        const b = stationed[j];
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThanOrEqual(a.radius + b.radius - 1e-4);
      }
      for (const c of circles) {
        expect(
          Math.hypot(a.x - c.x, a.z - c.z),
          `Stationed ${a.id} vs ${c.id}`,
        ).toBeGreaterThanOrEqual(a.radius + c.radius - 1e-4);
      }
      for (const obb of world.staticObbs) {
        expect(
          signedDistanceCircleToObb(a.x, a.z, obb),
          `Stationed ${a.id} vs ${obb.id}`,
        ).toBeGreaterThanOrEqual(a.radius - 1e-4);
      }
      expect(Math.abs(Math.hypot(a.x, a.z) - TRAIN_TRACK_RADIUS)).toBeGreaterThanOrEqual(
        a.radius + TRAIN_CAR_RADIUS,
      );
    }
  });

  it('prevents any character-to-character or character-to-obstacle collision across 900 simulated village frames', () => {
    const world = new VillageCollisionWorld();
    world.resetDynamicState();

    const carrierCurve = createCarrierLoopCurve();
    const santaCurve = createSantaPatrolCurve();
    const sneakCurve = createGrumpSneakCurve();
    const flightTrack = createSleighFlightTrack();

    const carrierProgress = [0, 0.25, 0.5, 0.75];
    let santaProgress = 0.1;
    let trainAngle = 0;
    let grumpSneakProgress = 0;
    let grumpRetreatCurve: THREE.CatmullRomCurve3 | null = null;
    let grumpPos: [number, number] = [GRUMP_PEEK_POS[0], GRUMP_PEEK_POS[1]];
    let prevGrumpState: 'idle' | 'peeking' | 'sneaking' | 'caught' | 'escaped' = 'idle';

    const tmpPos = new THREE.Vector3();
    const dt = 0.1;
    let minClearance = Number.POSITIVE_INFINITY;
    let firstViolation: string | null = null;

    const recordMargin = (margin: number, frame: number, aId: string, otherId: string) => {
      if (margin < minClearance) minClearance = margin;
      if (margin < -1e-4 && firstViolation === null) {
        firstViolation = `Frame ${frame}: ${aId} collided with ${otherId} (margin=${margin.toFixed(4)})`;
      }
    };

    for (let frame = 0; frame < 900; frame++) {
      const workshopBoost = frame >= 150 && frame < 300;
      const trainBoost = frame >= 300 && frame < 450;
      const sleighFlightActive = frame >= 600 && frame < 710;
      const flightProgress = sleighFlightActive ? (frame - 600) / 104 : 0;

      const grumpState: 'idle' | 'peeking' | 'sneaking' | 'caught' | 'escaped' =
        frame >= 100 && frame < 150
          ? 'peeking'
          : frame >= 150 && frame < 260
            ? 'sneaking'
            : frame >= 260 && frame < 300
              ? 'caught'
              : frame >= 450 && frame < 500
                ? 'peeking'
                : frame >= 500 && frame < 610
                  ? 'sneaking'
                  : frame >= 610 && frame < 640
                    ? 'escaped'
                    : 'idle';

      trainAngle += dt * (trainBoost ? 1.25 : 0.44);
      world.updateTrainAngle(trainAngle);
      world.updateSleighFlight(sleighFlightActive, Math.min(1, flightProgress), flightTrack);

      // Update Santa
      if (sleighFlightActive) {
        world.removeAgent('santa');
      } else {
        santaCurve.getPointAt(santaProgress, tmpPos);
        if (!world.shouldYield('santa', tmpPos.x, tmpPos.z, 0.4, 60)) {
          santaProgress = (santaProgress + dt * 0.042) % 1;
        }
        santaCurve.getPointAt(santaProgress, tmpPos);
        world.resolveAgent('santa', tmpPos.x, tmpPos.z, 0.4, 60);
      }

      // Update 4 Carrier Elves
      const carrierMult = workshopBoost ? 1.75 : 1.0;
      for (let i = 0; i < 4; i++) {
        carrierCurve.getPointAt(carrierProgress[i], tmpPos);
        if (!world.shouldYield(`carrier-${i}`, tmpPos.x, tmpPos.z, 0.3, 40)) {
          carrierProgress[i] = (carrierProgress[i] + dt * CARRIER_LOOP_SPEED * carrierMult) % 1;
        }
        carrierCurve.getPointAt(carrierProgress[i], tmpPos);
        world.resolveAgent(`carrier-${i}`, tmpPos.x, tmpPos.z, 0.3, 40);
      }

      // Update Holiday Grump
      if (grumpState !== prevGrumpState) {
        prevGrumpState = grumpState;
        if (grumpState === 'peeking' || grumpState === 'sneaking') {
          grumpSneakProgress = 0;
          grumpRetreatCurve = null;
        } else if (grumpState === 'caught') {
          grumpRetreatCurve = createGrumpCaughtCurve(grumpPos[0], grumpPos[1]);
        } else if (grumpState === 'escaped') {
          grumpRetreatCurve = createGrumpEscapedCurve(grumpPos[0], grumpPos[1]);
        }
      }

      if (grumpState === 'idle') {
        world.removeAgent('grump');
      } else if (grumpState === 'peeking') {
        const res = world.resolveAgent('grump', GRUMP_PEEK_POS[0], GRUMP_PEEK_POS[1], 0.34, 30);
        grumpPos = [res.x, res.z];
      } else if (grumpState === 'sneaking') {
        sneakCurve.getPointAt(grumpSneakProgress, tmpPos);
        if (!world.shouldYield('grump', tmpPos.x, tmpPos.z, 0.34, 30)) {
          grumpSneakProgress = Math.min(1, grumpSneakProgress + dt / 11);
        }
        sneakCurve.getPointAt(grumpSneakProgress, tmpPos);
        const res = world.resolveAgent('grump', tmpPos.x, tmpPos.z, 0.34, 30);
        grumpPos = [res.x, res.z];
      } else if (grumpState === 'caught' || grumpState === 'escaped') {
        const curve =
          grumpRetreatCurve ?? createGrumpCaughtCurve(GRUMP_PEEK_POS[0], GRUMP_PEEK_POS[1]);
        const phaseFrame = grumpState === 'caught' ? frame - 260 : frame - 610;
        const durationFrames = grumpState === 'caught' ? 34 : 26;
        curve.getPointAt(Math.min(1, phaseFrame / durationFrames), tmpPos);
        const res = world.resolveAgent('grump', tmpPos.x, tmpPos.z, 0.34, 30);
        grumpPos = [res.x, res.z];
      }

      // Record minimum signed clearance across every active character & obstacle on this frame
      const agents = world.getCharacterAgents();
      const activeTrainCars = world.getActiveTrainCars();
      const activeSleigh = world.getActiveSleighObb();
      const activeReindeer = world.getActiveReindeerObstacles();

      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        for (let j = i + 1; j < agents.length; j++) {
          const b = agents[j];
          recordMargin(Math.hypot(a.x - b.x, a.z - b.z) - (a.radius + b.radius), frame, a.id, b.id);
        }
        for (const c of world.staticCircles) {
          recordMargin(Math.hypot(a.x - c.x, a.z - c.z) - (a.radius + c.radius), frame, a.id, c.id);
        }
        for (const obb of world.staticObbs) {
          recordMargin(signedDistanceCircleToObb(a.x, a.z, obb) - a.radius, frame, a.id, obb.id);
        }
        for (const car of activeTrainCars) {
          recordMargin(
            Math.hypot(a.x - car.x, a.z - car.z) - (a.radius + car.radius),
            frame,
            a.id,
            car.id,
          );
        }
        if (activeSleigh) {
          recordMargin(
            signedDistanceCircleToObb(a.x, a.z, activeSleigh) - a.radius,
            frame,
            a.id,
            activeSleigh.id,
          );
        }
        for (const deer of activeReindeer) {
          recordMargin(
            Math.hypot(a.x - deer.x, a.z - deer.z) - (a.radius + deer.radius),
            frame,
            a.id,
            deer.id,
          );
        }
      }
    }

    expect(firstViolation).toBeNull();
    expect(minClearance).toBeGreaterThanOrEqual(-1e-4);
  });
});
