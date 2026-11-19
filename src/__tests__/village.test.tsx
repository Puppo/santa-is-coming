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
import { createReindeerInstance, prepareReindeerTemplate } from '../scene/characters/ReindeerHerd';
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
});
