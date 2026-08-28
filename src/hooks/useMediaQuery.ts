"use client";

import { useEffect, useState } from "react";

// `undefined` mientras no se ha medido (SSR / antes del primer efecto) —
// distinto de `false`, para que quien lo consuma pueda esperar a un valor
// real antes de decidir algo que dependa de él (ver CalendarioView).
export function useMediaQuery(query: string): boolean | undefined {
  const [matches, setMatches] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [query]);

  return matches;
}
