import { useEffect, useState } from 'react';

const COMPACT_MEDIA_QUERY = '(max-width: 768px)';

function readCompactMatch(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches;
}

export function useCompactViewport(): boolean {
  const [isCompact, setIsCompact] = useState(readCompactMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia(COMPACT_MEDIA_QUERY);
    const onChange = () => setIsCompact(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isCompact;
}
