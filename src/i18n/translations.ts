export type Locale = 'it' | 'en';

export type ZoneId = 'overview' | 'tree' | 'workshop' | 'sleigh' | 'cabin';

export type AtmosphereMode = 'night' | 'twilight' | 'day';

export interface ZoneCopy {
  label: string;
  title: string;
  description: string;
  actionLabel: string;
}

export interface TranslationDict {
  pageTitle: string;
  skipToControls: string;
  appTitle: string;
  appSubtitle: string;
  countdownLabel: string;
  countdownDays: string;
  countdownChristmasDay: string;
  loadingTitle: string;
  loadingSubtitle: string;
  atmosphereLabel: string;
  atmosphereModes: Record<AtmosphereMode, string>;
  motionPause: string;
  motionResume: string;
  languageSwitchLabel: string;
  creditsOpen: string;
  creditsTitle: string;
  creditsClose: string;
  creditsControlsTitle: string;
  creditsControlsItems: string[];
  creditsModelsTitle: string;
  creditsModelsDesc: string;
  creditsAudioTitle: string;
  zoneNavLabel: string;
  zones: Record<ZoneId, ZoneCopy>;
  musicRegionLabel: string;
  musicPlay: string;
  musicPause: string;
  musicPrev: string;
  musicNext: string;
  musicTrackSelect: string;
  musicNowPlaying: string;
  partyMode: string;
  sfxOn: string;
  sfxOff: string;
  grumpName: string;
  grumpSummon: string;
  grumpShoo: string;
  grumpPeekingBanner: string;
  grumpSneakingBanner: string;
  grumpCaughtToast: string;
  grumpEscapedToast: string;
  grumpPranksLabel: string;
  toasts: {
    sleighFlight: string;
    treeBurst: string;
    workshopBoost: string;
    mailboxSwirl: string;
    santaWave: string;
    elfWave: string;
    reindeerPrance: string;
    trainWhistle: string;
    snowmanWave: string;
    partyEnabled: string;
    partyDisabled: string;
  };
  hints: {
    explore: string;
    tapAnything: string;
  };
}

export const TRANSLATIONS: Record<Locale, TranslationDict> = {
  it: {
    pageTitle: 'Villaggio di Babbo Natale 3D | Santa Is Coming',
    skipToControls: 'Salta ai controlli del villaggio',
    appTitle: 'Villaggio di Babbo Natale',
    appSubtitle: 'Polo Nord • Diorama 3D',
    countdownLabel: 'A Natale',
    countdownDays: 'gg',
    countdownChristmasDay: 'Buon Natale! La slitta è in viaggio!',
    loadingTitle: 'Preparando la neve e le lucine…',
    loadingSubtitle: 'Gli elfi stanno lucidando la slitta',
    atmosphereLabel: 'Luce del cielo',
    atmosphereModes: {
      night: 'Notte & Aurora',
      twilight: 'Crepuscolo Artico',
      day: 'Mattina di Neve',
    },
    motionPause: 'Metti in pausa le animazioni',
    motionResume: 'Riprendi le animazioni',
    languageSwitchLabel: 'Passa a English',
    creditsOpen: 'Info & Crediti',
    creditsTitle: 'Guida al Villaggio & Crediti Open Source',
    creditsClose: 'Chiudi',
    creditsControlsTitle: 'Come esplorare',
    creditsControlsItems: [
      'Trascina con il dito o il mouse per ruotare attorno al villaggio.',
      'Pizzica o usa la rotella per avvicinarti ai dettagli di elfi, slitta e casette.',
      'Tocca qualsiasi personaggio, trenino, cassetta delle lettere o la slitta per scatenare magie e suoni!',
      'Attiva la Modalità Festa mentre ascolti una canzone per far ballare luci e personaggi a tempo di musica.',
    ],
    creditsModelsTitle: 'Modelli 3D, Materiali PBR & Ambiente (CC0)',
    creditsModelsDesc:
      'Texture PBR fotogrammetriche, lampioni, lanterne, panchine, alberi botanici e HDRI invernali di Poly Haven (CC0), insieme a renne animate Quaternius (CC0) e dettagli festivi Kenney (CC0).',
    creditsAudioTitle: 'Canzoni di Natale (Pubblico Dominio / CC)',
    zoneNavLabel: 'Zone del villaggio',
    zones: {
      overview: {
        label: 'Villaggio',
        title: 'Panoramica del Villaggio',
        description: 'Ammira tutto il diorama tra aurora boreale, luci calde e neve fresca.',
        actionLabel: 'Prova di volo Slitta',
      },
      tree: {
        label: 'Grande Albero',
        title: 'Piazza del Grande Albero',
        description: 'Il cuore della festa con il trenino giocattolo e i pupazzi di neve.',
        actionLabel: 'Accendi la Stella',
      },
      workshop: {
        label: 'Laboratorio',
        title: 'Laboratorio degli Elfi',
        description: 'Qui gli elfi impacchettano i regali prima di portarli alla slitta.',
        actionLabel: 'Turbo Giocattoli',
      },
      sleigh: {
        label: 'Slitta & Renne',
        title: 'Stalla delle Renne e Slitta',
        description: 'Le renne scalpitano pronte a sollevare la slitta carica di doni.',
        actionLabel: 'Fai volare la Slitta!',
      },
      cabin: {
        label: 'Casa di Babbo',
        title: 'Chalet di Babbo Natale',
        description: 'Camino acceso, biscotti sul tavolo e la cassetta delle letterine.',
        actionLabel: 'Spedisci Letterina',
      },
    },
    musicRegionLabel: 'Lettore musicale natalizio',
    musicPlay: 'Avvia canzone di Natale',
    musicPause: 'Metti in pausa la canzone',
    musicPrev: 'Brano precedente',
    musicNext: 'Brano successivo',
    musicTrackSelect: 'Seleziona canzone natalizia',
    musicNowPlaying: 'In riproduzione',
    partyMode: 'Modalità Festa',
    sfxOn: 'Effetti sonori attivi',
    sfxOff: 'Effetti sonori disattivati',
    grumpName: 'Il Guastafeste',
    grumpSummon: 'Chiama il Guastafeste',
    grumpShoo: 'Scaccia il Guastafeste!',
    grumpPeekingBanner: 'Psst… qualcosa di verde sbuca dietro i pini!',
    grumpSneakingBanner: 'Attenzione! Il Guastafeste sta rubando i regali e spegnendo le luci!',
    grumpCaughtToast: 'Preso! Il Guastafeste ha lasciato cadere i regali ed è scappato nella neve!',
    grumpEscapedToast: 'Il Guastafeste è sgattaiolato via ridacchiando, ma le luci si riaccendono!',
    grumpPranksLabel: 'Scherzi sventati',
    toasts: {
      sleighFlight: 'Viaaa! Babbo Natale e le renne decollano per un giro di prova!',
      treeBurst: 'Pioggia di stelle sul Grande Albero!',
      workshopBoost: 'Il Laboratorio degli Elfi va a tutta velocità!',
      mailboxSwirl: 'Letterina spedita! Le buste dorate volano verso il camino!',
      santaWave: 'Oh oh oh! Babbo Natale ti saluta con affetto!',
      elfWave: 'Un elfo ti fa l’occhiolino tra un pacchetto e l’altro!',
      reindeerPrance: 'Campanelli in festa! Le renne si preparano al volo!',
      trainWhistle: 'Ciuf ciuf! Il trenino accelera intorno all’albero!',
      snowmanWave: 'Il pupazzo di neve agita la sciarpa felice!',
      partyEnabled: 'Modalità Festa attiva: luci e personaggi ballano con la musica!',
      partyDisabled: 'Modalità Festa disattivata: torna la quiete del Polo Nord.',
    },
    hints: {
      explore: 'Trascina per esplorare • Tocca slitta, case o elfi',
      tapAnything: 'Tocca il villaggio per scoprire animazioni',
    },
  },
  en: {
    pageTitle: "Santa's 3D Village | Santa Is Coming",
    skipToControls: 'Skip to village controls',
    appTitle: "Santa's Village",
    appSubtitle: 'North Pole • 3D Diorama',
    countdownLabel: 'To Christmas',
    countdownDays: 'd',
    countdownChristmasDay: 'Merry Christmas! The sleigh is flying!',
    loadingTitle: 'Sprinkling snow and fairy lights…',
    loadingSubtitle: 'The elves are polishing the sleigh',
    atmosphereLabel: 'Sky lighting',
    atmosphereModes: {
      night: 'Aurora Night',
      twilight: 'Arctic Twilight',
      day: 'Crisp Snow Day',
    },
    motionPause: 'Pause animations',
    motionResume: 'Resume animations',
    languageSwitchLabel: 'Passa a Italiano',
    creditsOpen: 'Info & Credits',
    creditsTitle: 'Village Guide & Open Source Credits',
    creditsClose: 'Close',
    creditsControlsTitle: 'How to explore',
    creditsControlsItems: [
      'Drag with finger or mouse to orbit smoothly around the diorama.',
      'Pinch or scroll to zoom into the Elf Workshop, Sleigh, and cozy cabins.',
      'Tap characters, the toy train, the mailbox, or the sleigh for animations and chimes!',
      'Turn on Party Mode while playing a carol to sync village lights and dancing to the beat.',
    ],
    creditsModelsTitle: '3D Models, PBR Materials & Environment (CC0)',
    creditsModelsDesc:
      'Photogrammetry PBR textures, Victorian streetlamps, lanterns, benches, botanical fir maps, and winter HDRIs by Poly Haven (CC0), paired with rigged Quaternius reindeer (CC0) and Kenney festive props (CC0).',
    creditsAudioTitle: 'Christmas Carols (Public Domain / CC)',
    zoneNavLabel: 'Village zones',
    zones: {
      overview: {
        label: 'Village',
        title: 'Village Panorama',
        description: 'Take in the entire North Pole diorama under the aurora borealis.',
        actionLabel: 'Sleigh Test Flight',
      },
      tree: {
        label: 'Great Tree',
        title: 'Great Tree Plaza',
        description: 'Heart of the village with the chugging toy train and jolly snowmen.',
        actionLabel: 'Sparkle Tree Star',
      },
      workshop: {
        label: 'Workshop',
        title: "Elves' Toy Workshop",
        description: 'Elves craft, wrap, and carry presents straight toward the sleigh.',
        actionLabel: 'Boost Workshop',
      },
      sleigh: {
        label: 'Sleigh',
        title: 'Reindeer Paddock & Sleigh',
        description: 'Ready for liftoff with glowing harness bells and gift sacks.',
        actionLabel: 'Launch Sleigh Flight!',
      },
      cabin: {
        label: "Santa's Cabin",
        title: "Santa's Cozy Chalet",
        description: 'Crackling hearth, warm timber glow, and the North Pole mailbox.',
        actionLabel: 'Send Wish Letter',
      },
    },
    musicRegionLabel: 'Christmas music player',
    musicPlay: 'Play Christmas song',
    musicPause: 'Pause Christmas song',
    musicPrev: 'Previous track',
    musicNext: 'Next track',
    musicTrackSelect: 'Select Christmas song',
    musicNowPlaying: 'Now playing',
    partyMode: 'Party Mode',
    sfxOn: 'Sound effects on',
    sfxOff: 'Sound effects muted',
    grumpName: 'The Holiday Grump',
    grumpSummon: 'Summon the Grump',
    grumpShoo: 'Catch the Grump!',
    grumpPeekingBanner: 'Psst… a grumpy green shadow is peeking behind the pines!',
    grumpSneakingBanner: 'Watch out! The Holiday Grump is sneaking presents and dimming lights!',
    grumpCaughtToast: 'Busted! The Holiday Grump dropped the gifts and bolted back into the snow!',
    grumpEscapedToast:
      'The Holiday Grump tiptoed away chuckling, and the fairy lights warm back up!',
    grumpPranksLabel: 'Pranks foiled',
    toasts: {
      sleighFlight: 'Up, up, and away! Santa and the reindeer take a joyful test flight!',
      treeBurst: 'Golden stardust sparkles across the Great Tree!',
      workshopBoost: 'Toy Workshop goes into cheerful overdrive!',
      mailboxSwirl: 'Wish letter posted! Golden envelopes swirl toward the chimney!',
      santaWave: 'Ho ho ho! Santa sends you a warm wave!',
      elfWave: 'A cheerful elf tips their bell hat at you!',
      reindeerPrance: 'Jingle bells ring! The reindeer prance excitedly!',
      trainWhistle: 'Choo-choo! The miniature train speeds up around the plaza!',
      snowmanWave: 'The snowman waves its knitted scarf happily!',
      partyEnabled: 'Party Mode on: lights and characters groove to the music!',
      partyDisabled: 'Party Mode off: peaceful Arctic glow restored.',
    },
    hints: {
      explore: 'Drag to orbit • Tap sleigh, cabins, or elves',
      tapAnything: 'Tap the village for playful surprises',
    },
  },
};
