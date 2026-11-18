import { Compass, Gift, Home, Rocket, Sparkles, TreePine } from 'lucide-react';
import type { TranslationDict, ZoneId } from '../i18n/translations';
import { useVillage } from '../state/villageStore';

interface ZoneDockProps {
  t: TranslationDict;
  isCompact?: boolean;
}

const ZONE_ORDER: ZoneId[] = ['overview', 'tree', 'workshop', 'sleigh', 'cabin'];

function ZoneIcon({ zone }: { zone: ZoneId }) {
  switch (zone) {
    case 'overview':
      return <Compass size={15} aria-hidden="true" />;
    case 'tree':
      return <TreePine size={15} aria-hidden="true" />;
    case 'workshop':
      return <Gift size={15} aria-hidden="true" />;
    case 'sleigh':
      return <Rocket size={15} aria-hidden="true" />;
    case 'cabin':
      return <Home size={15} aria-hidden="true" />;
  }
}

export function ZoneDock({ t, isCompact = false }: ZoneDockProps) {
  const {
    activeZone,
    setActiveZone,
    triggerSleighFlight,
    triggerTreeBurst,
    triggerWorkshopBoost,
    triggerMailboxSwirl,
  } = useVillage();

  const handleZoneAction = () => {
    switch (activeZone) {
      case 'overview':
      case 'sleigh':
        triggerSleighFlight();
        break;
      case 'tree':
        triggerTreeBurst();
        break;
      case 'workshop':
        triggerWorkshopBoost();
        break;
      case 'cabin':
        triggerMailboxSwirl();
        break;
    }
  };

  const zoneCopy = t.zones[activeZone];

  return (
    <div className="zone-dock-bar">
      <nav className="zone-nav" aria-label={t.zoneNavLabel}>
        {ZONE_ORDER.map((zone) => {
          const isCurrent = activeZone === zone;
          return (
            <button
              key={zone}
              type="button"
              className="zone-pill"
              aria-current={isCurrent ? 'location' : undefined}
              onClick={() => setActiveZone(zone)}
            >
              <ZoneIcon zone={zone} />
              <span>{t.zones[zone].label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        className="primary-action-btn"
        onClick={handleZoneAction}
        aria-label={zoneCopy.actionLabel}
      >
        <Sparkles size={14} aria-hidden="true" />
        <span>{isCompact ? zoneCopy.shortActionLabel : zoneCopy.actionLabel}</span>
      </button>
    </div>
  );
}
