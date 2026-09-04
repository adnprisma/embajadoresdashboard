"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Briefcase,
  Check,
  ChevronDown,
  Copy,
  Gauge,
  History,
  Kanban,
  ListTodo,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Phone,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Panel } from "@/components/common/Panel";
import { Skeleton } from "@/components/common/Skeleton";
import { CapabilityChip, CAPABILITY_ORDER } from "@/components/contactos/CapabilityChip";
import { ContactFormDialog } from "@/components/contactos/ContactFormDialog";
import { OpportunityDialog } from "@/components/pipeline/OpportunityDialog";
import { StatusBadge, STATUS_ICON } from "@/components/contactos/StatusBadge";
import { TagBadge } from "@/components/contactos/TagBadge";
import { TaskDialog } from "@/components/tareas/TaskDialog";
import { TaskRow } from "@/components/tareas/TaskRow";
import { CONTACT_STATUSES } from "@/config/contactStatus";
import { isOperationalTag, OPERATIONAL_TAGS } from "@/config/contactTags";
import { copy } from "@/config/copy";
import { generarMensajeContacto } from "@/config/mensajeContacto";
import { OFERTA_ADICIONAL, ofertaParaCarencias, type OfertaItem } from "@/config/oferta";
import { useContactAssignments } from "@/lib/queries/contactAssignments";
import { useContactInteractions, type InteractionRow } from "@/lib/queries/interactions";
import {
  useChangeContactStatus,
  useContact,
  useContactRelatedCounts,
  useDeleteContact,
  useToggleContactTag,
  type ContactRelatedCounts,
  type ContactRow,
} from "@/lib/queries/contacts";
import { useContactOpportunities, usePipelineStages } from "@/lib/queries/pipeline";
import { useProspectAnalysis, type ProspectAnalysisRow } from "@/lib/queries/prospectAnalysis";
import { useUndoableTaskDelete } from "@/hooks/useUndoableTaskDelete";
import { useContactTasks, useUpdateTaskStatus } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils/cn";

const SECONDARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken";

const PRIMARY_BUTTON_CLASSES =
  "inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90";

const listFormatter = new Intl.ListFormat("es-MX", { style: "long", type: "conjunction" });

function buildDeleteImpact(counts: ContactRelatedCounts) {
  const { deleteDialog } = copy.contactos.detail;

  const cascadeParts: string[] = [];
  if (counts.tasks > 0) cascadeParts.push(deleteDialog.taskUnit(counts.tasks));
  if (counts.interactions > 0) cascadeParts.push(deleteDialog.interactionUnit(counts.interactions));

  const keepParts: string[] = [];
  if (counts.opportunities > 0) keepParts.push(deleteDialog.opportunityUnit(counts.opportunities));
  if (counts.appointments > 0) keepParts.push(deleteDialog.appointmentUnit(counts.appointments));

  return {
    cascadeText:
      cascadeParts.length > 0
        ? deleteDialog.cascadeWarning(listFormatter.format(cascadeParts))
        : deleteDialog.cascadeNone,
    keepText: keepParts.length > 0 ? deleteDialog.keepNotice(listFormatter.format(keepParts)) : null,
  };
}

const TAB_TRIGGER_CLASSES =
  "rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary data-[state=active]:bg-bg-sunken data-[state=active]:text-text-primary";

function formatDate(date: string) {
  return format(parseISO(date), "d 'de' MMMM 'de' yyyy", { locale: es });
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm text-text-primary">{value}</p>
    </div>
  );
}

// Fallback defensivo: el CHECK de la base ya garantiza que from_status/
// to_status solo traigan uno de los 6 valores conocidos, esto es solo para
// no reventar si algún día aparece uno que la UI todavía no conoce.
function statusLabel(status: string): string {
  return (copy.contactos.status.labels as Record<string, string>)[status] ?? status;
}

// call/message/meeting/note (los kinds originales de 0001) no tienen
// mutación de creación en toda la app — nadie los genera todavía, así que
// se quedan mostrando el valor crudo hasta que exista esa pantalla. Este
// mapa es solo para el kind nuevo que sí se genera de verdad.
const INTERACTION_KIND_LABEL: Partial<Record<string, string>> = {
  status_change: "Estado",
};

function TimelineEntry({ interaction }: { interaction: InteractionRow }) {
  if (interaction.kind === "status_change" && interaction.from_status && interaction.to_status) {
    return (
      <p className="mt-1 text-sm text-text-primary">
        {copy.contactos.status.timelineEntry(statusLabel(interaction.from_status), statusLabel(interaction.to_status))}
      </p>
    );
  }
  return interaction.body ? <p className="mt-1 text-sm text-text-primary">{interaction.body}</p> : null;
}

function TimelinePanel({ contactId }: { contactId: string }) {
  const { data, isLoading } = useContactInteractions(contactId);
  const interactions = data ?? [];

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (interactions.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        illustration={<Illustration name="encontrar" size="md" />}
        title={copy.contactos.detail.timeline.emptyTitle}
        description={copy.contactos.detail.timeline.emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {interactions.map((interaction) => (
        <li key={interaction.id} className="py-3">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {INTERACTION_KIND_LABEL[interaction.kind] ?? interaction.kind} · {formatDate(interaction.occurred_at)}
          </p>
          <TimelineEntry interaction={interaction} />
        </li>
      ))}
    </ul>
  );
}

function TasksPanel({ contactId }: { contactId: string }) {
  const { data, isLoading } = useContactTasks(contactId);
  const tasks = data ?? [];
  const updateTaskStatus = useUpdateTaskStatus();
  const { remove: deleteTask } = useUndoableTaskDelete();

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListTodo}
        illustration={<Illustration name="planear" size="md" />}
        title={copy.contactos.detail.tasksTab.emptyTitle}
        description={copy.contactos.detail.tasksTab.emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          onStatusChange={(id, status) => updateTaskStatus.mutate({ id, status })}
          onDelete={deleteTask}
        />
      ))}
    </ul>
  );
}

function OpportunitiesPanel({ contactId }: { contactId: string }) {
  const { data, isLoading, isError, refetch } = useContactOpportunities(contactId);
  const { data: stagesData } = usePipelineStages();
  const opportunities = data ?? [];
  const stageName = (stageId: string) => stagesData?.find((stage) => stage.id === stageId)?.name ?? stageId;
  const stageIsWon = (stageId: string) => stagesData?.find((stage) => stage.id === stageId)?.is_won ?? false;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <TriangleAlert aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
          <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
        >
          {copy.common.retry}
        </button>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <EmptyState
        icon={Kanban}
        illustration={<Illustration name="encontrar" size="md" />}
        title={copy.contactos.detail.opportunitiesTab.emptyTitle}
        description={copy.contactos.detail.opportunitiesTab.emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {opportunities.map((opportunity) => (
        <li key={opportunity.id} className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">{opportunity.business_name}</p>
            <p className="text-xs text-text-muted">{copy.contactos.detail.opportunitiesTab.stageLabel(stageName(opportunity.stage_id))}</p>
          </div>
          <div className="shrink-0 text-right">
            <MoneyValue
              amount={stageIsWon(opportunity.stage_id) ? opportunity.closed_value : opportunity.estimated_value}
              emptyLabel={copy.pipeline.card.noEstimate}
            />
            {opportunity.mrr > 0 ? (
              <p className="text-xs text-text-muted">{copy.pipeline.card.mrrLabel} <MoneyValue amount={opportunity.mrr} /></p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// El único elemento coral de la pestaña además del badge de urgencia — el
// score es "acento, acción, hallazgo" (DESIGN_SYSTEM.md §2), así que aquí
// SÍ se justifica. Todo lo demás (chips, badges de alcance) usa tonos de
// estado, nunca coral, para que el score y la urgencia sigan siendo el
// único foco de la pantalla.
function scoreBandClasses(score: number) {
  if (score >= 9) return "border-accent text-accent bg-accent-soft";
  if (score >= 7) return "border-state-pending text-state-pending bg-state-pending-soft";
  return "border-border-subtle text-text-muted bg-bg-sunken";
}

function ScoreCircle({ score }: { score: number }) {
  return (
    <div
      role="img"
      aria-label={copy.contactos.detail.analysisTab.scoreLabel(score)}
      className={cn(
        "flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border-2 text-base font-extrabold",
        scoreBandClasses(score),
      )}
    >
      {score}
    </div>
  );
}

// Relleno coral con texto CARBÓN a propósito — blanco no pasa 3:1 sobre
// coral (ver --text-on-coral en tokens.css). Es el segundo y último uso de
// coral en esta pestaña: el hallazgo más urgente del análisis.
function UrgentBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wide text-text-on-coral">
      {copy.contactos.detail.analysisTab.urgentBadge}
    </span>
  );
}

function ContactField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <p>
      <span className="font-semibold text-text-muted">{label}: </span>
      {href ? (
        <a href={href} className="text-text-primary hover:underline">
          {value}
        </a>
      ) : (
        <span className="text-text-primary">{value}</span>
      )}
    </p>
  );
}

// Núcleo vs. complemento se distingue por jerarquía tipográfica, superficie
// y borde — NUNCA por color: el coral de esta pantalla ya lo tiene el score
// y el badge de urgencia, y un tercer acento (aunque fuera otro tono)
// diluiría cuál es el foco real. El núcleo lleva más peso a propósito: es
// lo que se vende: encabezado en prosa normal, sin caja. El complemento se
// lee después y más chico, metido en una superficie hundida — "se suma",
// no "se vende".
function OportunidadGroup({
  heading,
  items,
  emphasis,
}: {
  heading: string;
  items: OfertaItem[];
  emphasis: "nucleo" | "complemento";
}) {
  if (items.length === 0) return null;

  const list = (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.carencia} className="flex items-start gap-2 text-sm text-text-primary">
          <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-text-primary" strokeWidth={2} />
          <span>
            <span className="font-semibold">{item.carencia}:</span> {item.propuesta}
          </span>
        </li>
      ))}
    </ul>
  );

  if (emphasis === "nucleo") {
    return (
      <div className="flex flex-col gap-2">
        <h5 className="text-sm font-semibold text-text-primary">{heading}</h5>
        {list}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-control)] border border-border-subtle bg-bg-sunken p-3.5">
      <h5 className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{heading}</h5>
      {list}
    </div>
  );
}

// Los 104 contactos actuales guardan el teléfono como "+52 55 5651 2980" o
// vacío — sin variantes. No hay garantía de que el próximo lote sea igual,
// así que esto contempla los dos casos reales (10 dígitos sin código de
// país, o 12 ya con el 52) y para cualquier otra forma devuelve null: un
// link armado sobre un número que no se pudo confirmar abriría una
// conversación con la persona equivocada, y eso es peor que no ofrecer el
// botón.
function normalizePhoneForWhatsApp(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith("52")) return digits;
  return null;
}

function MensajeSugeridoBlock({
  analysis,
  ownerFullName,
  contactPhone,
  industry,
}: {
  analysis: ProspectAnalysisRow;
  ownerFullName: string | null;
  contactPhone: string | null;
  industry: string | null;
}) {
  const { mensaje } = copy.contactos.detail.analysisTab;
  const texto = useMemo(
    () => generarMensajeContacto({ ...analysis, ownerFullName, industry }),
    [analysis, ownerFullName, industry],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(texto);
    toast.success(mensaje.copiedToast);
  };

  // Mismo texto para copiar y para WhatsApp — una sola fuente
  // (generarMensajeContacto). Si no hay teléfono, el botón ni aparece; si
  // hay teléfono pero no se pudo normalizar con confianza, aparece
  // deshabilitado en vez de ocultarse — para que se note que el dato está
  // raro, no que la función no existe.
  const whatsappNumber = contactPhone ? normalizePhoneForWhatsApp(contactPhone) : null;

  return (
    <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
      <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{mensaje.title}</h4>
      <p className="whitespace-pre-line rounded-[var(--radius-control)] bg-bg-sunken p-3.5 text-sm text-text-primary">
        {texto}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={handleCopy} className={SECONDARY_BUTTON_CLASSES}>
          <Copy aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          {mensaje.copyButton}
        </button>
        {contactPhone ? (
          whatsappNumber ? (
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noopener"
              className={SECONDARY_BUTTON_CLASSES}
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {mensaje.whatsappButton}
            </a>
          ) : (
            <button
              type="button"
              disabled
              title={mensaje.whatsappDisabledHint}
              className={cn(SECONDARY_BUTTON_CLASSES, "cursor-not-allowed opacity-50")}
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {mensaje.whatsappButton}
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

// Parte 1 de la narrativa ("quién es y cómo lo contacto") — sale de
// `current` (prop síncrona, ya la tiene ContactDetailView), nunca del
// análisis: tiene que pintarse de inmediato aunque el análisis tarde o no
// exista. Teléfono/correo arriba y con enlace, porque es lo que se usa al
// vuelo; giro/etiquetas/contacto desde son metadatos, van compactos en una
// sola línea — no como los pares etiqueta/valor de la extinta pestaña Datos.
function ContactInfoBlock({ current }: { current: ContactRow }) {
  const { fields, detail } = copy.contactos;
  const { dataPanel } = detail;

  return (
    <div className="flex flex-col gap-3">
      {current.contact_name ? <p className="text-sm text-text-secondary">{current.contact_name}</p> : null}

      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {current.phone ? (
          <a
            href={`tel:${current.phone}`}
            className="flex min-h-11 items-center gap-2 text-sm font-medium text-text-primary hover:underline"
          >
            <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
            {current.phone}
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-text-muted">
            <Phone aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {dataPanel.noValue}
          </span>
        )}
        {current.email ? (
          <a
            href={`mailto:${current.email}`}
            className="flex min-h-11 items-center gap-2 text-sm font-medium text-text-primary hover:underline"
          >
            <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
            {current.email}
          </a>
        ) : (
          <span className="flex items-center gap-2 text-sm text-text-muted">
            <Mail aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {dataPanel.noValue}
          </span>
        )}
      </div>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>
          {fields.industry}: {current.industry || dataPanel.noValue}
        </span>
        <span>
          {fields.tags}: {current.tags.length > 0 ? current.tags.join(", ") : dataPanel.noValue}
        </span>
        <span>
          {dataPanel.createdAt}: {formatDate(current.created_at)}
        </span>
      </p>

      {current.notes ? <DataRow label={fields.notes} value={current.notes} /> : null}
    </div>
  );
}

// Extensión de la Parte 1 con lo que solo vive en prospect_analysis
// (empieza por la dirección, que no existe en `contacts`). Se muestra
// SIEMPRE que el dato exista, campo por campo — nunca condicionado a que el
// resto del análisis (score, carencias) también esté completo. Hoy da lo
// mismo porque todo sale de la misma fila, pero el día que el análisis
// llegue parcial o se pueda editar, esta regla es la que evita perder la
// dirección solo porque el score quedó en null.
function AnalysisContactFields({ analysis }: { analysis: ProspectAnalysisRow }) {
  const { analysisTab } = copy.contactos.detail;

  const contactFields: { label: string; value: string; href?: string }[] = [];
  if (analysis.address) contactFields.push({ label: analysisTab.contactPanel.address, value: analysis.address });
  if (analysis.phone) contactFields.push({ label: analysisTab.contactPanel.phone, value: analysis.phone, href: `tel:${analysis.phone}` });
  if (analysis.email) contactFields.push({ label: analysisTab.contactPanel.email, value: analysis.email, href: `mailto:${analysis.email}` });
  if (analysis.web_note) contactFields.push({ label: analysisTab.contactPanel.web, value: analysis.web_note });

  if (contactFields.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] bg-bg-sunken p-3.5 text-sm">
      {contactFields.map((field) => (
        <ContactField key={field.label} {...field} />
      ))}
    </div>
  );
}

// Partes 2 a 5: qué tan buena oportunidad, qué le falta, qué le ofrezco, qué
// le digo. Todo detrás de un solo `border-t` que separa esto de la Parte 1
// siempre visible — un único quiebre visual para las cuatro partes que sí
// dependen del análisis.
function AnalysisBody({
  analysis,
  ownerFullName,
  contactPhone,
  industry,
}: {
  analysis: ProspectAnalysisRow;
  ownerFullName: string | null;
  contactPhone: string | null;
  industry: string | null;
}) {
  const { analysisTab } = copy.contactos.detail;

  // OFERTA_ADICIONAL siempre aparece — no depende de ninguna carencia
  // detectada (ver config/oferta.ts). El resto sale de cruzar las
  // capacidades REALES de este prospecto contra el mapa, así que cambia
  // de una ficha a otra.
  const oportunidades = [...ofertaParaCarencias(analysis), ...OFERTA_ADICIONAL];
  const nucleo = oportunidades.filter((item) => item.alcance === "nucleo");
  const complemento = oportunidades.filter((item) => item.alcance === "complemento");
  const gaps = analysis.gaps ?? [];

  return (
    <div className="flex flex-col gap-4 border-t border-border-subtle pt-4">
      {/* Parte 2: qué tan buena oportunidad es */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {analysis.score !== null ? <ScoreCircle score={analysis.score} /> : null}
          {analysis.is_urgent ? <UrgentBadge /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{analysisTab.capabilitiesTitle}</h4>
          <div className="flex flex-wrap gap-2">
            {CAPABILITY_ORDER.map((key) => (
              <CapabilityChip
                key={key}
                capacidad={key}
                value={analysis[key]}
                title={key === "has_web" ? analysis.web_note : undefined}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Parte 3: qué le falta */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-state-negative">
          {analysisTab.gapsTitle(gaps.length)}
        </h4>
        {gaps.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {gaps.map((gap) => (
              <li key={gap} className="flex items-start gap-2 text-sm text-text-primary">
                <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-state-negative" strokeWidth={2} />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">{analysisTab.gapsEmpty}</p>
        )}
        {analysis.note ? <p className="text-sm italic text-text-secondary">{analysis.note}</p> : null}
      </div>

      {/* Parte 4: qué le ofrezco */}
      <div className="flex flex-col gap-4">
        <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-state-positive">
          {analysisTab.opportunitiesTitle}
        </h4>
        <OportunidadGroup heading={analysisTab.scopeNucleo} emphasis="nucleo" items={nucleo} />
        <OportunidadGroup heading={analysisTab.scopeComplemento} emphasis="complemento" items={complemento} />
      </div>

      {/* Parte 5: qué le digo */}
      <MensajeSugeridoBlock analysis={analysis} ownerFullName={ownerFullName} contactPhone={contactPhone} industry={industry} />
    </div>
  );
}

// Estado del contacto — arriba de la Parte 2, antes del score: lo primero
// que hace falta saber al abrir la ficha no es qué tan buena oportunidad
// es, sino si ya se le escribió. Siempre visible, independiente de si hay
// análisis (viene de `contacts`, no de prospect_analysis). El color nunca
// es el único portador — ícono y texto siempre acompañan.
function ContactStatusBlock({ current }: { current: ContactRow }) {
  const changeStatus = useChangeContactStatus(current.id);
  const { data: stagesData } = usePipelineStages();
  const stages = stagesData ?? [];
  const { status: statusCopy } = copy.contactos;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={statusCopy.changeLabel}
            disabled={changeStatus.isPending}
            className="disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StatusBadge status={current.status} className="cursor-pointer py-1.5 pr-2 text-sm transition-colors">
              <ChevronDown aria-hidden="true" className="ml-0.5 h-3.5 w-3.5 shrink-0 opacity-70" strokeWidth={1.75} />
            </StatusBadge>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            className="z-50 w-56 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
          >
            {CONTACT_STATUSES.filter((status) => status !== current.status).map((status) => {
              const OptionIcon = STATUS_ICON[status];
              return (
                <DropdownMenu.Item
                  key={status}
                  onSelect={() => changeStatus.mutate(status)}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken"
                >
                  <OptionIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.75} />
                  {statusCopy.labels[status]}
                </DropdownMenu.Item>
              );
            })}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {current.status === "interesado" ? (
        <OpportunityDialog
          stages={stages}
          lockedContact={{ id: current.id, business_name: current.business_name }}
          trigger={
            <button type="button" className={SECONDARY_BUTTON_CLASSES}>
              <Kanban aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {statusCopy.suggestOpportunity}
            </button>
          }
        />
      ) : null}
    </div>
  );
}

// Orquesta las 5 partes: la 1 se pinta en cuanto hay `current` (prop
// síncrona), sin esperar al análisis — un análisis lento nunca deja la
// pantalla entera en blanco. Las partes 2 a 5 tienen su propio
// loading/error/vacío, con un solo EmptyState cuando no hay análisis en vez
// de cinco huecos separados.
function ContactAnalysisTab({ current }: { current: ContactRow }) {
  const { data, isLoading, isError, refetch } = useProspectAnalysis(current.id, true);
  const { analysisTab } = copy.contactos.detail;

  return (
    <div className="flex flex-col gap-4">
      <ContactInfoBlock current={current} />
      {data ? <AnalysisContactFields analysis={data} /> : null}

      <ContactStatusBlock current={current} />

      {isLoading ? (
        <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 border-t border-border-subtle pt-8 text-center">
          <TriangleAlert aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {copy.common.retry}
          </button>
        </div>
      ) : !data ? (
        <div className="border-t border-border-subtle pt-4">
          <EmptyState
            icon={Gauge}
            illustration={<Illustration name="encontrar" size="md" />}
            title={analysisTab.emptyTitle}
            description={analysisTab.emptyDescription}
          />
        </div>
      ) : (
        <AnalysisBody analysis={data} ownerFullName={current.owner_full_name} contactPhone={current.phone} industry={current.industry} />
      )}
    </div>
  );
}

function AssignmentsPanel({ contactId, enabled }: { contactId: string; enabled: boolean }) {
  const { data, isLoading } = useContactAssignments(contactId, enabled);
  const assignments = data ?? [];
  const { assignmentsTab } = copy.contactos.detail;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={History}
        illustration={<Illustration name="encontrar" size="md" />}
        title={assignmentsTab.emptyTitle}
        description={assignmentsTab.emptyDescription}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border-subtle">
      {assignments.map((assignment) => (
        <li key={assignment.id} className="py-3">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
            {formatDate(assignment.created_at)}
          </p>
          <p className="mt-1 text-sm text-text-primary">
            {assignment.from_owner_name ? assignmentsTab.from(assignment.from_owner_name) : assignmentsTab.fromNone}
            {" → "}
            {assignmentsTab.to(assignment.to_owner_name)}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {assignment.reason ?? assignmentsTab.noReason}
          </p>
          <p className="mt-1 text-xs text-text-muted">{assignmentsTab.authorizedBy(assignment.assigned_by_name)}</p>
        </li>
      ))}
    </ul>
  );
}

export function ContactDetailView({
  contact: initialContact,
  isAdmin = false,
}: {
  contact: ContactRow;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { data: contact } = useContact(initialContact.id, initialContact);
  const current = contact ?? initialContact;
  const { data: stagesData } = usePipelineStages();
  const stages = stagesData ?? [];

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const relatedCounts = useContactRelatedCounts(current.id, deleteDialogOpen);
  const deleteContact = useDeleteContact();
  const toggleTag = useToggleContactTag(current.id);
  const hasNoPhoneOrEmail = !current.phone && !current.email;
  const missingOperationalTags = OPERATIONAL_TAGS.filter((tag) => !current.tags.includes(tag));
  const impact = relatedCounts.data ? buildDeleteImpact(relatedCounts.data) : null;

  const handleDelete = async () => {
    try {
      await deleteContact.mutateAsync(current.id);
      setDeleteDialogOpen(false);
      router.push("/contactos");
    } catch {
      // El toast.error ya lo dispara la mutación (onError); el diálogo se
      // queda abierto para que el usuario pueda reintentar.
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={current.business_name}
        description={[current.contact_name, current.phone, current.email].filter(Boolean).join(" · ") || undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ContactFormDialog
              mode="edit"
              contact={current}
              trigger={
                <button type="button" className={SECONDARY_BUTTON_CLASSES}>
                  <Pencil aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  {copy.contactos.detail.actions.edit}
                </button>
              }
            />
            <OpportunityDialog
              stages={stages}
              lockedContact={{ id: current.id, business_name: current.business_name }}
              trigger={
                <button type="button" className={SECONDARY_BUTTON_CLASSES}>
                  <Kanban aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  {copy.contactos.detail.actions.newOpportunity}
                </button>
              }
            />
            <TaskDialog
              contactId={current.id}
              trigger={
                <button type="button" className={PRIMARY_BUTTON_CLASSES}>
                  <ListTodo aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                  {copy.contactos.detail.actions.newTask}
                </button>
              }
            />

            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  aria-label={copy.contactos.detail.actions.moreActions}
                  className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-border-subtle text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 w-52 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
                >
                  <DropdownMenu.Item
                    onSelect={() => setDeleteDialogOpen(true)}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                    {copy.contactos.detail.actions.delete}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        }
      />

      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-state-negative-soft"
              >
                <TriangleAlert className="h-5 w-5 text-state-negative" strokeWidth={1.5} />
              </span>
              <div className="flex-1">
                <AlertDialog.Title className="text-lg font-semibold text-text-primary">
                  {copy.contactos.detail.deleteDialog.title(current.business_name)}
                </AlertDialog.Title>
                <AlertDialog.Description asChild>
                  <div className="mt-2 flex flex-col gap-2 text-sm text-text-secondary">
                    <p>{copy.contactos.detail.deleteDialog.intro(current.business_name)}</p>
                    {relatedCounts.isLoading ? (
                      <p>{copy.contactos.detail.deleteDialog.loadingImpact}</p>
                    ) : impact ? (
                      <>
                        <p>{impact.cascadeText}</p>
                        {impact.keepText ? <p>{impact.keepText}</p> : null}
                      </>
                    ) : null}
                  </div>
                </AlertDialog.Description>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  {copy.contactos.detail.deleteDialog.cancel}
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteContact.isPending}
                aria-busy={deleteContact.isPending}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-state-negative px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60"
              >
                {deleteContact.isPending
                  ? copy.contactos.detail.deleteDialog.confirming
                  : copy.contactos.detail.deleteDialog.confirm}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {isAdmin ? (
        <p className="text-sm font-medium text-text-secondary">
          {copy.contactos.detail.ownerLabel(current.owner_full_name ?? copy.contactos.reassignDialog.currentOwnerNone)}
        </p>
      ) : null}

      {current.industry || current.tags.length > 0 || missingOperationalTags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {current.industry ? (
            <Badge tone="neutral">
              <Briefcase aria-hidden="true" className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
              {current.industry}
            </Badge>
          ) : null}
          {current.tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1">
              <TagBadge tag={tag} />
              {isOperationalTag(tag) ? (
                <button
                  type="button"
                  onClick={() => toggleTag.mutate({ tag, add: false })}
                  disabled={toggleTag.isPending}
                  aria-label={copy.contactos.detail.tags.removeOperationalTag(tag)}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary disabled:opacity-60"
                >
                  <X aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              ) : null}
            </span>
          ))}
          {missingOperationalTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag.mutate({ tag, add: true })}
              disabled={toggleTag.isPending}
              className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-border-subtle px-2.5 py-0.5 text-xs font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
            >
              + {copy.contactos.detail.tags.addOperationalTag(tag)}
            </button>
          ))}
        </div>
      ) : null}

      {hasNoPhoneOrEmail && !current.tags.includes("visitar") ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-state-pending bg-state-pending-soft px-3 py-2 text-sm text-state-pending">
          <span className="flex items-center gap-2">
            <TriangleAlert aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            {copy.contactos.detail.tags.suggestBanner}
          </span>
          <button
            type="button"
            onClick={() => toggleTag.mutate({ tag: "visitar", add: true })}
            disabled={toggleTag.isPending}
            className="shrink-0 rounded-[var(--radius-control)] border border-state-pending px-2.5 py-1 text-xs font-medium text-state-pending transition-colors hover:bg-state-pending hover:text-white disabled:opacity-60"
          >
            {copy.contactos.detail.tags.suggestAction}
          </button>
        </div>
      ) : null}

      <Tabs.Root defaultValue="analysis">
        <Tabs.List className="flex items-center gap-1 border-b border-border-subtle">
          <Tabs.Trigger value="analysis" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.analysis}
          </Tabs.Trigger>
          <Tabs.Trigger value="timeline" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.timeline}
          </Tabs.Trigger>
          <Tabs.Trigger value="tasks" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.tasks}
          </Tabs.Trigger>
          <Tabs.Trigger value="opportunities" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.opportunities}
          </Tabs.Trigger>
          {isAdmin ? (
            <Tabs.Trigger value="assignments" className={TAB_TRIGGER_CLASSES}>
              {copy.contactos.detail.tabs.assignments}
            </Tabs.Trigger>
          ) : null}
        </Tabs.List>

        {/* Datos + Análisis fusionados: Datos ya no existe como pestaña
            aparte. Una sola narrativa — quién es, qué tan buena
            oportunidad, qué le falta, qué le ofrezco, qué le digo — dentro
            del mismo Panel que usan las demás pestañas. */}
        <Tabs.Content value="analysis" className="pt-5">
          <Panel title={copy.contactos.detail.tabs.analysis}>
            <ContactAnalysisTab current={current} />
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="timeline" className="pt-5">
          <Panel title={copy.contactos.detail.tabs.timeline}>
            <TimelinePanel contactId={current.id} />
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="tasks" className="pt-5">
          <Panel title={copy.contactos.detail.tabs.tasks}>
            <TasksPanel contactId={current.id} />
          </Panel>
        </Tabs.Content>

        <Tabs.Content value="opportunities" className="pt-5">
          <Panel title={copy.contactos.detail.tabs.opportunities}>
            <OpportunitiesPanel contactId={current.id} />
          </Panel>
        </Tabs.Content>

        {isAdmin ? (
          <Tabs.Content value="assignments" className="pt-5">
            <Panel title={copy.contactos.detail.tabs.assignments}>
              <AssignmentsPanel contactId={current.id} enabled={isAdmin} />
            </Panel>
          </Tabs.Content>
        ) : null}
      </Tabs.Root>
    </div>
  );
}
