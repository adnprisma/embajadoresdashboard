"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tabs from "@radix-ui/react-tabs";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Briefcase,
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
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/common/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { ContactFormDialog } from "@/components/contactos/ContactFormDialog";
import { TaskDialog } from "@/components/tareas/TaskDialog";
import { TaskRow } from "@/components/tareas/TaskRow";
import { copy } from "@/config/copy";
import { CAPABILITY_ORDER, getOpportunities, type CapabilityKey } from "@/config/oferta";
import { useContactAssignments } from "@/lib/queries/contactAssignments";
import { useContactInteractions } from "@/lib/queries/interactions";
import {
  useContact,
  useContactRelatedCounts,
  useDeleteContact,
  type ContactRelatedCounts,
  type ContactRow,
} from "@/lib/queries/contacts";
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

function CapabilityCell({
  capabilityKey,
  value,
  webNote,
}: {
  capabilityKey: CapabilityKey;
  value: boolean | null;
  webNote?: string | null;
}) {
  const { capabilities, capabilityState } = copy.contactos.detail.analysisTab;

  // El color nunca es el único portador de estado (DESIGN_SYSTEM.md §4):
  // cada estado trae su propio ícono y su propia palabra, no solo un tono.
  const { Icon, tone, stateLabel } =
    value === true
      ? { Icon: CheckCircle2, tone: "success" as const, stateLabel: capabilityState.present }
      : value === false
        ? { Icon: XCircle, tone: "danger" as const, stateLabel: capabilityState.absent }
        : { Icon: MinusCircle, tone: "warning" as const, stateLabel: capabilityState.partial };

  const TONE_TEXT: Record<typeof tone, string> = {
    success: "text-state-positive",
    danger: "text-state-negative",
    warning: "text-state-pending",
  };

  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface p-3">
      <div className="flex items-center gap-2">
        <Icon aria-hidden="true" className={cn("h-4 w-4 shrink-0", TONE_TEXT[tone])} strokeWidth={1.5} />
        <span className="text-sm font-medium text-text-primary">{capabilities[capabilityKey]}</span>
      </div>
      <span className={cn("text-xs", TONE_TEXT[tone])}>{stateLabel}</span>
      {webNote ? <span className="text-xs text-text-muted">{copy.contactos.detail.analysisTab.webNote(webNote)}</span> : null}
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ProspectAnalysisRow }) {
  const { analysisTab } = copy.contactos.detail;
  const opportunities = getOpportunities(analysis);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        {analysis.score !== null ? (
          <Badge tone="neutral">
            <Gauge aria-hidden="true" className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
            {analysisTab.scoreLabel(analysis.score)}
          </Badge>
        ) : null}
        {analysis.is_urgent ? (
          <Badge tone="danger">
            <TriangleAlert aria-hidden="true" className="mr-1 inline h-3 w-3" strokeWidth={1.5} />
            {analysisTab.urgentBadge}
          </Badge>
        ) : null}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
          {analysisTab.capabilitiesTitle}
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {CAPABILITY_ORDER.map((key) => (
            <CapabilityCell
              key={key}
              capabilityKey={key}
              value={analysis[key]}
              webNote={key === "has_web" ? analysis.web_note : undefined}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{analysisTab.gapsTitle}</h4>
        {analysis.gaps && analysis.gaps.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {analysis.gaps.map((gap) => (
              <li key={gap} className="text-sm text-text-primary">
                • {gap}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-text-muted">{analysisTab.gapsEmpty}</p>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
          {analysisTab.opportunitiesTitle}
        </h4>
        <ul className="flex flex-col gap-2">
          {opportunities.map((opportunity) => (
            <li key={opportunity.key} className="text-sm text-text-primary">
              <span className="font-medium">{copy.contactos.detail.analysisTab.capabilities[opportunity.key]}:</span>{" "}
              {opportunity.propuesta}
            </li>
          ))}
        </ul>
      </div>

      {analysis.note ? (
        <div className="border-t border-border-subtle pt-4">
          <h4 className="mb-1 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">{analysisTab.noteTitle}</h4>
          <p className="text-sm text-text-secondary">{analysis.note}</p>
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

  const handleComingSoon = () => toast.info(copy.contactos.detail.actions.comingSoon);

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
            <button type="button" onClick={handleComingSoon} className={SECONDARY_BUTTON_CLASSES}>
              <Kanban aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.contactos.detail.actions.newOpportunity}
            </button>
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
          <EmptyState
            icon={Kanban}
            illustration={<Illustration name="encontrar" size="md" />}
            title={copy.contactos.detail.opportunitiesTab.emptyTitle}
            description={copy.contactos.detail.opportunitiesTab.emptyDescription}
          />
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
