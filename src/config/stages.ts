// Etapas del pipeline — se llenan en el bloque 9 (Pipeline), reflejando el
// seed de la tabla `pipeline_stages` (context/ROADMAP.md §4.1).
export type PipelineStage = {
  id: string;
  name: string;
  icon: string;
  accent: string;
  position: number;
  isWon: boolean;
  isLost: boolean;
};

// TODO(bloque 9): reemplazar con las etapas reales una vez definida la seed.
export const PIPELINE_STAGES: PipelineStage[] = [];
