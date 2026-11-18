import { useEffect, useState } from 'react';
import { type Locale, TRANSLATIONS } from './translations';

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'it';
  try {
    const saved = window.localStorage.getItem('santa-village-locale');
    if (saved === 'it' || saved === 'en') return saved;
  } catch {
    // Ignore storage access errors in restricted modes
  }
  const navLang = (navigator.language || 'it').toLowerCase();
  return navLang.startsWith('en') ? 'en' : 'it';
}

export function useLocale() {
  const [locale, setLocale] = useState<Locale>(detectInitialLocale);

  useEffect(() => {
    const dict = TRANSLATIONS[locale];
    document.documentElement.lang = locale;
    document.title = dict.pageTitle;
    try {
      window.localStorage.setItem('santa-village-locale', locale);
    } catch {
      // Ignore storage access errors
    }
  }, [locale]);

  const toggleLocale = () => {
    setLocale((prev) => (prev === 'it' ? 'en' : 'it'));
  };

  return {
    locale,
    setLocale,
    toggleLocale,
    t: TRANSLATIONS[locale],
  };
}
