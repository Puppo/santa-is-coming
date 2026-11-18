import { Compass, Gift, Home, Rocket, Sparkles, TreePine } from 'lucide-react';
import type { TranslationDict, ZoneId } from '../i18n/translations';
import { useVillage } from '../state/villageStore';

interface ZoneDockProps {
  t: TranslationDict;
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

export function ZoneDock({ t }: ZoneDockProps) {
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
    <div className="dock-row">
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

      <section className="zone-action-card" aria-label={zoneCopy.title}>
        <div className="zone-action-copy">
          <h2 className="zone-action-title">{zoneCopy.title}</h2>
          <p className="zone-action-desc">{zoneCopy.description}</p>
        </div>
        <button type="button" className="primary-action-btn" onClick={handleZoneAction}>
          <Sparkles size={15} aria-hidden="true" />
          <span>{zoneCopy.actionLabel}</span>
        </button>
      </section>
    </div>
  );
}
