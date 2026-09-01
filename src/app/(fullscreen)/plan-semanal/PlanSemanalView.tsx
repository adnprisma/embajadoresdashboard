"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AlertTriangle, Flame, ListChecks, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import { useContacts } from "@/lib/queries/contacts";
import { useOwnOpportunityContactIds } from "@/lib/queries/pipeline";
import { useProfile } from "@/lib/queries/profile";
import { useAllProspectAnalysis } from "@/lib/queries/prospectAnalysis";
import { useGenerateWeeklyPlan, useOwnOpenTaskContactIds } from "@/lib/queries/tasks";
import {
  buildWeeklyPlanCandidates,
  distributeIntoDays,
  remainingBusinessDays,
  timeForSlot,
  type WeeklyPlanCandidate,
  type WeeklyPlanDay,
} from "@/lib/weeklyPlan";

function UrgentMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-state-pending bg-state-pending-soft px-2 py-0.5 text-xs font-semibold text-state-pending">
      <Flame aria-hidden="true" className="h-3 w-3 shrink-0" strokeWidth={1.75} />
      {copy.contactos.detail.analysisTab.urgentBadge}
    </span>
  );
}

function CandidateRow({ candidate, onRemove }: { candidate: WeeklyPlanCandidate; onRemove: () => void }) {
  return (
    <li className="flex items-start justify-between gap-2 border-t border-border-subtle py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{candidate.businessName}</p>
        <p className="truncate text-xs text-text-secondary">{candidate.colonia ?? copy.contactos.detail.dataPanel.noValue}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-text-primary">
            {candidate.score !== null ? candidate.score : copy.contactos.comparativa.scoreNone}
          </span>
          {candidate.isUrgent ? <UrgentMark /> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={copy.tareas.weeklyPlan.removeRowLabel(candidate.businessName)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken hover:text-text-primary"
      >
        <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </li>
  );
}

function DayColumn({ day, dayIndex, onRemove }: { day: WeeklyPlanDay; dayIndex: number; onRemove: (dayIndex: number, contactId: string) => void }) {
  return (
    <div className="flex w-[280px] shrink-0 flex-col rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2 border-b border-border-subtle pb-2.5">
        <h3 className="text-sm font-semibold capitalize text-text-primary">{format(day.date, "EEEE d MMM", { locale: es })}</h3>
        <span className="shrink-0 text-xs text-text-muted">{copy.tareas.weeklyPlan.dayTaskCount(day.candidates.length)}</span>
      </div>
      {day.candidates.length === 0 ? (
        <p className="py-4 text-center text-xs text-text-muted">{copy.tareas.weeklyPlan.dayEmpty}</p>
      ) : (
        <ul className="flex flex-col">
          {day.candidates.map((candidate) => (
            <CandidateRow
              key={candidate.contactId}
              candidate={candidate}
              onRemove={() => onRemove(dayIndex, candidate.contactId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export function PlanSemanalView() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const ownerId = profile?.id;

  const contactsQuery = useContacts();
  const analysisQuery = useAllProspectAnalysis(true);
  const openTaskQuery = useOwnOpenTaskContactIds(ownerId, Boolean(ownerId));
  const opportunityQuery = useOwnOpportunityContactIds(ownerId, Boolean(ownerId));
  const generatePlan = useGenerateWeeklyPlan();

  // No basta con el `isLoading` de cada query: mientras `ownerId` todavía no
  // existe, openTaskQuery/opportunityQuery están `enabled: false` y su
  // `isLoading` es `false` sin haber traído nada — hay que esperar también
  // a que sus `data` existan de verdad antes de generar el plan, o se
  // generaría con conjuntos de exclusión vacíos.
  const isReady = Boolean(ownerId && contactsQuery.data && analysisQuery.data && openTaskQuery.data && opportunityQuery.data);
  const isError = contactsQuery.isError || analysisQuery.isError || openTaskQuery.isError || opportunityQuery.isError;

  // Filtro explícito por owner_id propio: desde que un admin puede ver todo
  // el equipo vía RLS (0010_rls_admin.sql), useContacts() ya no garantiza
  // "solo mis contactos" para un admin. El plan se genera SOLO sobre los
  // leads de quien lo pide, sin excepción.
  const myContacts = useMemo(
    () => (contactsQuery.data ?? []).filter((contact) => contact.owner_id === ownerId),
    [contactsQuery.data, ownerId],
  );

  const myContactsWithAnalysisCount = useMemo(() => {
    const analysisMap = analysisQuery.data;
    if (!analysisMap) return 0;
    return myContacts.filter((contact) => analysisMap.has(contact.id)).length;
  }, [myContacts, analysisQuery.data]);

  const [planDays, setPlanDays] = useState<WeeklyPlanDay[] | null>(null);

  // Se genera UNA sola vez cuando todo lo necesario ya cargó — si algo se
  // vuelve a pedir de fondo (refetch), no se regenera y se pierden los
  // renglones que la vendedora ya quitó.
  const analysisMap = analysisQuery.data;

  useEffect(() => {
    if (planDays !== null) return;
    if (!isReady || isError || !analysisMap) return;

    const candidates = buildWeeklyPlanCandidates(myContacts, analysisMap, openTaskQuery.data ?? new Set(), opportunityQuery.data ?? new Set());
    const days = remainingBusinessDays(new Date());
    setPlanDays(distributeIntoDays(candidates, days));
  }, [planDays, isReady, isError, myContacts, analysisMap, openTaskQuery.data, opportunityQuery.data]);

  const totalCount = useMemo(() => planDays?.reduce((sum, day) => sum + day.candidates.length, 0) ?? 0, [planDays]);

  const removeCandidate = (dayIndex: number, contactId: string) => {
    setPlanDays((prev) =>
      prev
        ? prev.map((day, index) =>
            index === dayIndex ? { ...day, candidates: day.candidates.filter((c) => c.contactId !== contactId) } : day,
          )
        : prev,
    );
  };

  const handleConfirm = () => {
    if (!planDays) return;
    const items = planDays.flatMap((day) =>
      day.candidates.map((candidate, index) => ({
        contact_id: candidate.contactId,
        title: copy.tareas.weeklyPlan.taskTitle(candidate.businessName),
        due_at: timeForSlot(day.date, index).toISOString(),
      })),
    );
    generatePlan.mutate(items, {
      onSuccess: () => router.replace("/tareas"),
    });
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader title={copy.tareas.weeklyPlan.pageTitle} description={copy.tareas.weeklyPlan.step1Description} />

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-10 text-center">
          <AlertTriangle aria-hidden="true" className="h-8 w-8 text-state-negative" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text-primary">{copy.common.genericErrorTitle}</p>
            <p className="mt-1 text-sm text-text-secondary">{copy.common.genericErrorDescription}</p>
          </div>
        </div>
      ) : !isReady || planDays === null ? (
        <div className="flex gap-4 overflow-x-auto">
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
          <Skeleton className="h-64 w-[280px] shrink-0" />
        </div>
      ) : totalCount === 0 && myContactsWithAnalysisCount === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={copy.tareas.weeklyPlan.emptyNoAnalysisTitle}
          description={copy.tareas.weeklyPlan.emptyNoAnalysisDescription}
          cta={{ label: copy.shell.nav.contacts, href: "/contactos" }}
        />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={copy.tareas.weeklyPlan.emptyAllWorkedTitle}
          description={copy.tareas.weeklyPlan.emptyAllWorkedDescription}
          cta={{ label: copy.shell.nav.contacts, href: "/contactos" }}
        />
      ) : (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {planDays.map((day, index) => (
              <DayColumn key={day.date.toISOString()} day={day} dayIndex={index} onRemove={removeCandidate} />
            ))}
          </div>

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border-subtle bg-bg-surface px-4 py-3 shadow-[var(--shadow-raised)] lg:px-8">
            <div className="mx-auto flex w-full max-w-[var(--content-max-width)] items-center justify-between gap-4">
              <p className="text-sm font-medium text-text-primary">{copy.tareas.weeklyPlan.totalCount(totalCount)}</p>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={totalCount === 0 || generatePlan.isPending}
                className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-text-on-coral transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatePlan.isPending ? copy.tareas.weeklyPlan.confirming : copy.tareas.weeklyPlan.confirmButton(totalCount)}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
