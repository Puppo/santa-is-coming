import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { CHRISTMAS_TRACKS } from '../audio/tracks';
import type { TranslationDict } from '../i18n/translations';

interface CreditsDialogProps {
  open: boolean;
  onClose: () => void;
  t: TranslationDict;
}

export function CreditsDialog({ open, onClose, t }: CreditsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Safari fallback for <dialog closedby="any">: test pointer coordinates against dialog box
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return undefined;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="credits-dialog"
      closedby="any"
      aria-labelledby="credits-dialog-title"
      onClose={() => {
        if (dialogRef.current) {
          dialogRef.current.returnValue = '';
        }
        onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id="credits-dialog-title">{t.creditsTitle}</h2>
        <form method="dialog">
          <button type="submit" className="icon-btn" aria-label={t.creditsClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </form>
      </div>

      <section>
        <h3 className="dialog-section-title">{t.creditsControlsTitle}</h3>
        <ul className="credits-list">
          {t.creditsControlsItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="dialog-section-title">{t.creditsModelsTitle}</h3>
        <p
          style={{
            margin: 0,
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {t.creditsModelsDesc}
        </p>
      </section>

      <section>
        <h3 className="dialog-section-title">{t.creditsAudioTitle}</h3>
        {/* biome-ignore lint/a11y/noRedundantRoles: restores Safari VoiceOver list semantics when list-style: none + flex are applied */}
        <ul className="credits-track-list" role="list">
          {CHRISTMAS_TRACKS.map((track) => (
            <li key={track.id} className="credits-track-item">
              <strong>{track.title}</strong> — {track.performer} ({track.license}){' '}
              <a href={track.sourceUrl} target="_blank" rel="noreferrer">
                Wikimedia
              </a>
            </li>
          ))}
        </ul>
      </section>
    </dialog>
  );
}
