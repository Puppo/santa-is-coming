import { withBase } from '../assets/baseUrl';

export interface ChristmasTrack {
  id: string;
  title: string;
  performer: string;
  src: string;
  license: string;
  sourceUrl: string;
}

export const CHRISTMAS_TRACKS: ChristmasTrack[] = [
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    performer: 'Kevin MacLeod (incompetech.com)',
    src: withBase('/audio/jingle-bells.mp3'),
    license: 'CC BY 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jingle_Bells_(ISRC_USUAN1100187).mp3',
  },
  {
    id: 'carol-of-the-bells',
    title: 'Carol of the Bells (Shchedryk)',
    performer: 'U.S. Air Force Heritage of America Band',
    src: withBase('/audio/carol-of-the-bells.mp3'),
    license: 'Public Domain',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Carol_of_the_Bells,_Ukrainian_-_Concert_Band_-_United_States_Air_Force_Heritage_of_America_Band.mp3',
  },
  {
    id: 'deck-the-halls',
    title: 'Deck the Halls',
    performer: 'Kevin MacLeod (incompetech.com)',
    src: withBase('/audio/deck-the-halls.mp3'),
    license: 'CC BY 2.0',
    sourceUrl:
      'https://commons.wikimedia.org/wiki/File:Deck_the_Halls_A_(Kevin_MacLeod)_(ISRC_USUAN1100263).oga',
  },
  {
    id: 'o-tannenbaum',
    title: 'O Tannenbaum (O Christmas Tree)',
    performer: 'U.S. Army Band "Pershing\'s Own"',
    src: withBase('/audio/o-tannenbaum.mp3'),
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:U.S._Army_Band_-_O_Tannenbaum.ogg',
  },
  {
    id: 'silent-night',
    title: 'Silent Night',
    performer: 'U.S. Army Chorus',
    src: withBase('/audio/silent-night.mp3'),
    license: 'Public Domain',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Silent_Night_(choral).ogg',
  },
];
