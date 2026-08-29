"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { TriangleAlert, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import type { ContactRow } from "@/lib/queries/contacts";
import { useReassignContacts } from "@/lib/queries/contactAssignments";
import type { TeamProfileRow } from "@/lib/queries/profile";

const formSchema = z.object({
  to_owner: z.string().min(1, " "),
  reason: z.string().min(1, copy.contactos.reassignDialog.reasonRequired),
});

type FormValues = z.infer<typeof formSchema>;

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function ReassignDialog({
  open,
  onOpenChange,
  contacts,
  sellers,
  onReassigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: ContactRow[];
  sellers: TeamProfileRow[];
  onReassigned: () => void;
}) {
  const reassignContacts = useReassignContacts();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { to_owner: "", reason: "" },
  });

  useEffect(() => {
    if (open) reset({ to_owner: "", reason: "" });
  }, [open, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await reassignContacts.mutateAsync({
        contactIds: contacts.map((contact) => contact.id),
        toOwner: values.to_owner,
        reason: values.reason.trim(),
      });
      onOpenChange(false);
      onReassigned();
    } catch {
      // El toast.error ya lo dispara la mutación (onError); el diálogo se
      // queda abierto para reintentar.
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {copy.contactos.reassignDialog.title}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.contactos.reassignDialog.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-sm text-text-secondary">{copy.contactos.reassignDialog.description(contacts.length)}</p>
              <ul className="max-h-32 flex-col gap-1 overflow-y-auto rounded-[var(--radius-control)] border border-border-subtle bg-bg-sunken p-2 text-sm text-text-primary">
                {contacts.map((contact) => (
                  <li key={contact.id} className="truncate">
                    {contact.business_name}{" "}
                    <span className="text-text-muted">
                      (
                      {contact.owner_full_name
                        ? copy.contactos.reassignDialog.currentOwner(contact.owner_full_name)
                        : copy.contactos.reassignDialog.currentOwnerNone}
                      )
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="to_owner" className="text-sm font-medium text-text-primary">
                {copy.contactos.reassignDialog.toLabel}
              </label>
              <select
                id="to_owner"
                defaultValue=""
                aria-invalid={errors.to_owner ? "true" : "false"}
                className={INPUT_CLASSES}
                {...register("to_owner")}
              >
                <option value="" disabled>
                  {copy.contactos.reassignDialog.toPlaceholder}
                </option>
                {sellers.map((seller) => (
                  <option key={seller.id} value={seller.id}>
                    {seller.full_name || seller.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reason" className="text-sm font-medium text-text-primary">
                {copy.contactos.reassignDialog.reasonLabel}
              </label>
              <textarea
                id="reason"
                rows={2}
                placeholder={copy.contactos.reassignDialog.reasonPlaceholder}
                aria-invalid={errors.reason ? "true" : "false"}
                aria-describedby={errors.reason ? "reason-error" : undefined}
                className={INPUT_CLASSES}
                {...register("reason")}
              />
              {errors.reason ? (
                <p id="reason-error" className="text-sm text-state-negative">
                  {errors.reason.message}
                </p>
              ) : null}
            </div>

            <div className="flex items-start gap-2 rounded-[var(--radius-control)] bg-state-pending-soft p-3 text-sm text-state-pending">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
              <p>{copy.contactos.reassignDialog.historyWarning}</p>
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.contactos.reassignDialog.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting ? copy.contactos.reassignDialog.confirming : copy.contactos.reassignDialog.confirm}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
