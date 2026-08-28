"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";
import type { ContactRow } from "@/lib/queries/contacts";
import type { OpportunityRow, PipelineStage } from "@/lib/queries/pipeline";
import { groupBy } from "@/lib/utils/group-by";
import { KanbanCard } from "./KanbanCard";
import { KanbanColumn } from "./KanbanColumn";

export function KanbanBoard({
  stages,
  opportunities,
  contactsById,
  onMoveToStage,
}: {
  stages: PipelineStage[];
  opportunities: OpportunityRow[];
  contactsById: Map<string, ContactRow>;
  onMoveToStage: (opportunity: OpportunityRow, stage: PipelineStage) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const grouped = useMemo(() => groupBy(opportunities, "stage_id"), [opportunities]);
  const activeOpportunity = useMemo(
    () => opportunities.find((opportunity) => opportunity.id === activeId),
    [opportunities, activeId],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // closestCorners mide esquinas: en columnas anchas, la esquina de la
  // columna vecina puede quedar más cerca que la de la columna sobre la que
  // realmente estás soltando. pointerWithin (¿bajo qué droppable está el
  // puntero, literalmente?) es la estrategia que dnd-kit recomienda para
  // multi-contenedor; rectIntersection es el respaldo para cuando no hay
  // coordenadas de puntero reales (KeyboardSensor) o el puntero salió de
  // toda área droppable a media arrastrada.
  const collisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const opportunity = opportunities.find((item) => item.id === active.id);
    const targetStage = stages.find((stage) => stage.id === over.id);
    if (!opportunity || !targetStage || targetStage.id === opportunity.stage_id) return;

    onMoveToStage(opportunity, targetStage);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex snap-x snap-proximity gap-4 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            opportunities={grouped[stage.id] ?? []}
            contactsById={contactsById}
            onMoveToStage={onMoveToStage}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOpportunity ? (
          <KanbanCard
            opportunity={activeOpportunity}
            contact={activeOpportunity.contact_id ? contactsById.get(activeOpportunity.contact_id) : undefined}
            stages={stages}
            onMoveToStage={() => {}}
            dragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
