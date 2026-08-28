"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { copy } from "@/config/copy";
import { type ContactInput, type ContactRow, useCreateContact, useUpdateContact } from "@/lib/queries/contacts";

const formSchema = z.object({
  business_name: z.string().min(1, copy.contactos.form.errors.businessRequired),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  email: z.union([z.string().email(copy.contactos.form.errors.emailInvalid), z.literal("")]).optional(),
  industry: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function contactToFormValues(contact?: ContactRow): FormValues {
  return {
    business_name: contact?.business_name ?? "",
    contact_name: contact?.contact_name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    industry: contact?.industry ?? "",
    tags: contact?.tags?.join(", ") ?? "",
    notes: contact?.notes ?? "",
  };
}

function formValuesToInput(values: FormValues): ContactInput {
  return {
    business_name: values.business_name.trim(),
    contact_name: values.contact_name?.trim() || null,
    phone: values.phone?.trim() || null,
    email: values.email?.trim() || null,
    industry: values.industry?.trim() || null,
    tags: values.tags
      ? values.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    notes: values.notes?.trim() || null,
  };
}

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

export function ContactFormDialog({
  mode,
  contact,
  trigger,
}: {
  mode: "create" | "edit";
  contact?: ContactRow;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createContact = useCreateContact();
  const updateContact = useUpdateContact(contact?.id ?? "");
  const mutation = mode === "create" ? createContact : updateContact;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: contactToFormValues(contact),
  });

  // Al abrir, siempre parte de los datos actuales del contacto (o vacío en
  // modo crear) — evita que quede el borrador de un envío anterior.
  useEffect(() => {
    if (open) reset(contactToFormValues(contact));
  }, [open, contact, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await mutation.mutateAsync(formValuesToInput(values));
      setOpen(false);
    } catch {
      // El toast.error ya lo dispara la mutación (onError); aquí solo se
      // evita que el dialog se cierre como si hubiera funcionado.
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {mode === "create" ? copy.contactos.form.createTitle : copy.contactos.form.editTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.contactos.form.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="business_name" className="text-sm font-medium text-text-primary">
                {copy.contactos.fields.business}
              </label>
              <input
                id="business_name"
                placeholder={copy.contactos.form.businessPlaceholder}
                aria-invalid={errors.business_name ? "true" : "false"}
                aria-describedby={errors.business_name ? "business_name-error" : undefined}
                className={INPUT_CLASSES}
                {...register("business_name")}
              />
              {errors.business_name ? (
                <p id="business_name-error" className="text-sm text-state-negative">
                  {errors.business_name.message}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="contact_name" className="text-sm font-medium text-text-primary">
                  {copy.contactos.fields.contact}
                </label>
                <input
                  id="contact_name"
                  placeholder={copy.contactos.form.contactPlaceholder}
                  className={INPUT_CLASSES}
                  {...register("contact_name")}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-text-primary">
                  {copy.contactos.fields.phone}
                </label>
                <input
                  id="phone"
                  type="tel"
                  placeholder={copy.contactos.form.phonePlaceholder}
                  className={INPUT_CLASSES}
                  {...register("phone")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-text-primary">
                  {copy.contactos.fields.email}
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder={copy.contactos.form.emailPlaceholder}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className={INPUT_CLASSES}
                  {...register("email")}
                />
                {errors.email ? (
                  <p id="email-error" className="text-sm text-state-negative">
                    {errors.email.message}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="industry" className="text-sm font-medium text-text-primary">
                  {copy.contactos.fields.industry}
                </label>
                <input
                  id="industry"
                  placeholder={copy.contactos.form.industryPlaceholder}
                  className={INPUT_CLASSES}
                  {...register("industry")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tags" className="text-sm font-medium text-text-primary">
                {copy.contactos.fields.tags}
              </label>
              <input
                id="tags"
                placeholder={copy.contactos.form.tagsPlaceholder}
                aria-describedby="tags-hint"
                className={INPUT_CLASSES}
                {...register("tags")}
              />
              <p id="tags-hint" className="text-xs text-text-muted">
                {copy.contactos.form.tagsHint}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="notes" className="text-sm font-medium text-text-primary">
                {copy.contactos.fields.notes}
              </label>
              <textarea
                id="notes"
                rows={3}
                placeholder={copy.contactos.form.notesPlaceholder}
                className={INPUT_CLASSES}
                {...register("notes")}
              />
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <Dialog.Close
                type="button"
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
              >
                {copy.contactos.form.cancel}
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
              >
                {isSubmitting
                  ? copy.contactos.form.submitLoading
                  : mode === "create"
                    ? copy.contactos.form.submitCreate
                    : copy.contactos.form.submitEdit}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
