"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Briefcase,
  Check,
  CheckCircle2,
  Gauge,
  History,
  Kanban,
  ListTodo,
  MessageSquare,
  MinusCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { MoneyValue } from "@/components/common/MoneyValue";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { ContactFormDialog } from "@/components/contactos/ContactFormDialog";
import { OpportunityDialog } from "@/components/pipeline/OpportunityDialog";
import { TaskDialog } from "@/components/tareas/TaskDialog";
import { TaskRow } from "@/components/tareas/TaskRow";
import { copy } from "@/config/copy";
import { OFERTA_ADICIONAL, OFERTA_POR_CAPACIDAD, ofertaParaCarencias, type Capacidad, type OfertaItem } from "@/config/oferta";
import { useContactAssignments } from "@/lib/queries/contactAssignments";
import { useContactInteractions } from "@/lib/queries/interactions";
import {
  useContact,
  useContactRelatedCounts,
  useDeleteContact,
  type ContactRelatedCounts,
  type ContactRow,
} from "@/lib/queries/contacts";
import { useContactOpportunities, usePipelineStages } from "@/lib/queries/pipeline";
import { useProspectAnalysis, type ProspectAnalysisRow } from "@/lib/queries/prospectAnalysis";
import { useUndoableTaskDelete } from "@/hooks/useUndoableTaskDelete";
import { useContactTasks, useToggleTask } from "@/lib/queries/tasks";
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
            {interaction.kind} · {formatDate(interaction.occurred_at)}
          </p>
          {interaction.body ? <p className="mt-1 text-sm text-text-primary">{interaction.body}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function TasksPanel({ contactId }: { contactId: string }) {
  const { data, isLoading } = useContactTasks(contactId);
  const tasks = data ?? [];
  const toggleTask = useToggleTask();
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
          onToggle={(id, done) => toggleTask.mutate({ id, done })}
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
            <MoneyValue amount={opportunity.value} />
            {opportunity.mrr > 0 ? (
              <p className="text-xs text-text-muted">{copy.pipeline.card.mrrLabel} <MoneyValue amount={opportunity.mrr} /></p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Orden fijo de la rejilla — el mismo de la tabla comparativa de origen
// (ver copy.contactos.fields / migración 0012), independiente del orden de
// declaración de OFERTA_POR_CAPACIDAD en config/oferta.ts.
const CAPABILITY_ORDER: Capacidad[] = [
  "has_web",
  "has_whatsapp",
  "has_reservas",
  "has_crm",
  "has_chat",
  "has_blog",
  "has_redes",
];

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

const CAPABILITY_TONE_CLASSES = {
  success: "border-state-positive text-state-positive bg-state-positive-soft",
  danger: "border-state-negative text-state-negative bg-state-negative-soft",
  warning: "border-state-pending text-state-pending bg-state-pending-soft",
} as const;

function CapabilityChip({ capacidad, value, title }: { capacidad: Capacidad; value: boolean | null; title?: string | null }) {
  const { capabilityState } = copy.contactos.detail.analysisTab;

  // El ícono ya distingue el estado por forma (check/cruz/guion), no solo
  // por color — el texto de estado sigue existiendo para lectores de
  // pantalla vía aria-label, aunque no se vea en el chip.
  const { Icon, tone, stateLabel } =
    value === true
      ? { Icon: CheckCircle2, tone: "success" as const, stateLabel: capabilityState.present }
      : value === false
        ? { Icon: XCircle, tone: "danger" as const, stateLabel: capabilityState.absent }
        : { Icon: MinusCircle, tone: "warning" as const, stateLabel: capabilityState.partial };

  const label = OFERTA_POR_CAPACIDAD[capacidad].carencia;

  return (
    <span
      title={title ?? undefined}
      aria-label={`${label}: ${stateLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        CAPABILITY_TONE_CLASSES[tone],
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      {label}
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

function OportunidadGroup({ title, tone, items }: { title: string; tone: "success" | "neutral"; items: OfertaItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <Badge tone={tone}>{title}</Badge>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.carencia} className="flex items-start gap-2 text-sm text-text-primary">
            <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-state-positive" strokeWidth={2} />
            <span>
              <span className="font-medium">{item.carencia}:</span> {item.propuesta}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ProspectAnalysisRow }) {
  const { analysisTab } = copy.contactos.detail;

  // OFERTA_ADICIONAL siempre aparece — no depende de ninguna carencia
  // detectada (ver config/oferta.ts). El resto sale de cruzar las
  // capacidades REALES de este prospecto contra el mapa, así que cambia
  // de una ficha a otra.
  const oportunidades = [...ofertaParaCarencias(analysis), ...OFERTA_ADICIONAL];
  const nucleo = oportunidades.filter((item) => item.alcance === "nucleo");
  const complemento = oportunidades.filter((item) => item.alcance === "complemento");
  const gaps = analysis.gaps ?? [];

  const contactFields: { label: string; value: string; href?: string }[] = [];
  if (analysis.address) contactFields.push({ label: analysisTab.contactPanel.address, value: analysis.address });
  if (analysis.phone) contactFields.push({ label: analysisTab.contactPanel.phone, value: analysis.phone, href: `tel:${analysis.phone}` });
  if (analysis.email) contactFields.push({ label: analysisTab.contactPanel.email, value: analysis.email, href: `mailto:${analysis.email}` });
  if (analysis.web_note) contactFields.push({ label: analysisTab.contactPanel.web, value: analysis.web_note });

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-text-primary">{analysis.business_name}</h3>
          {analysis.is_urgent ? <UrgentBadge /> : null}
        </div>
        {analysis.score !== null ? <ScoreCircle score={analysis.score} /> : null}
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

      {contactFields.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-[10px] bg-bg-sunken p-3.5 text-sm">
          {contactFields.map((field) => (
            <ContactField key={field.label} {...field} />
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
        </div>

        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-medium uppercase tracking-[0.06em] text-state-positive">
            {analysisTab.opportunitiesTitle}
          </h4>
          <OportunidadGroup title={analysisTab.scopeNucleo} tone="success" items={nucleo} />
          <OportunidadGroup title={analysisTab.scopeComplemento} tone="neutral" items={complemento} />
        </div>
      </div>

      {analysis.note ? (
        <div className="border-t border-border-subtle pt-3.5">
          <p className="text-sm italic text-text-secondary">{analysis.note}</p>
        </div>
      ) : null}
    </div>
  );
}

function AnalysisTabPanel({ contactId }: { contactId: string }) {
  const { data, isLoading, isError, refetch } = useProspectAnalysis(contactId, true);

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

  if (!data) {
    return (
      <EmptyState
        icon={Gauge}
        illustration={<Illustration name="encontrar" size="md" />}
        title={copy.contactos.detail.analysisTab.emptyTitle}
        description={copy.contactos.detail.analysisTab.emptyDescription}
      />
    );
  }

  return <AnalysisPanel analysis={data} />;
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

      {current.industry || current.tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {current.industry ? (
            <Badge tone="neutral">
              <Briefcase aria-hidden="true" className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
              {current.industry}
            </Badge>
          ) : null}
          {current.tags.map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}

      <Tabs.Root defaultValue="data">
        <Tabs.List className="flex items-center gap-1 border-b border-border-subtle">
          <Tabs.Trigger value="data" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.data}
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
          <Tabs.Trigger value="analysis" className={TAB_TRIGGER_CLASSES}>
            {copy.contactos.detail.tabs.analysis}
          </Tabs.Trigger>
          {isAdmin ? (
            <Tabs.Trigger value="assignments" className={TAB_TRIGGER_CLASSES}>
              {copy.contactos.detail.tabs.assignments}
            </Tabs.Trigger>
          ) : null}
        </Tabs.List>

        <Tabs.Content value="data" className="pt-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DataRow label={copy.contactos.fields.business} value={current.business_name} />
            <DataRow
              label={copy.contactos.fields.contact}
              value={current.contact_name || copy.contactos.detail.dataPanel.noValue}
            />
            <DataRow
              label={copy.contactos.fields.phone}
              value={current.phone || copy.contactos.detail.dataPanel.noValue}
            />
            <DataRow
              label={copy.contactos.fields.email}
              value={current.email || copy.contactos.detail.dataPanel.noValue}
            />
            <DataRow
              label={copy.contactos.fields.industry}
              value={current.industry || copy.contactos.detail.dataPanel.noValue}
            />
            <DataRow
              label={copy.contactos.fields.tags}
              value={current.tags.length > 0 ? current.tags.join(", ") : copy.contactos.detail.dataPanel.noValue}
            />
            <DataRow
              label={copy.contactos.detail.dataPanel.createdAt}
              value={formatDate(current.created_at)}
            />
          </div>
          {current.notes ? (
            <div className="mt-4">
              <DataRow label={copy.contactos.fields.notes} value={current.notes} />
            </div>
          ) : null}
        </Tabs.Content>

        <Tabs.Content value="timeline" className="pt-5">
          <TimelinePanel contactId={current.id} />
        </Tabs.Content>

        <Tabs.Content value="tasks" className="pt-5">
          <TasksPanel contactId={current.id} />
        </Tabs.Content>

        <Tabs.Content value="opportunities" className="pt-5">
          <OpportunitiesPanel contactId={current.id} />
        </Tabs.Content>

        <Tabs.Content value="analysis" className="pt-5">
          <AnalysisTabPanel contactId={current.id} />
        </Tabs.Content>

        {isAdmin ? (
          <Tabs.Content value="assignments" className="pt-5">
            <AssignmentsPanel contactId={current.id} enabled={isAdmin} />
          </Tabs.Content>
        ) : null}
      </Tabs.Root>
    </div>
  );
}
