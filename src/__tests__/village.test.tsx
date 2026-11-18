import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MODEL_PATHS } from '../assets/modelRegistry';
import { POLYHAVEN_PATHS } from '../assets/pbrMaterials';
import { CHRISTMAS_TRACKS } from '../audio/tracks';
import { CreditsDialog } from '../components/CreditsDialog';
import { HeaderHud } from '../components/HeaderHud';
import { MusicPlayerBar } from '../components/MusicPlayerBar';
import { ZoneDock } from '../components/ZoneDock';
import { TRANSLATIONS } from '../i18n/translations';
import { VillageProvider } from '../state/villageStore';

const ROOT_DIR = path.resolve(__dirname, '../..');

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
});
