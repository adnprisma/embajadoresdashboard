// Rangos de la tabla `ranks` — se llenan en el bloque 11 (Ranking),
// mostrados como chips conectados por "→" (context/ROADMAP.md §10.11).
export type Rank = {
  id: string;
  name: string;
  minPoints: number;
  tone: string;
  position: number;
};

// TODO(bloque 11): reemplazar con los rangos reales una vez definida la seed.
export const RANKS: Rank[] = [];
