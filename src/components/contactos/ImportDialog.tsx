"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload, Download, FileText, Upload, X } from "lucide-react";
import Papa from "papaparse";
import type { ChangeEvent, DragEvent, ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Stepper } from "@/components/common/Stepper";
import { copy } from "@/config/copy";
import { contactsKeys, useImportContacts, type ContactInput } from "@/lib/queries/contacts";
import { useProfile, useTeamProfiles } from "@/lib/queries/profile";
import { normalizeText } from "@/lib/utils/normalize-text";

type DestField = "business_name" | "contact_name" | "phone" | "email" | "industry" | "tags" | "notes";

const DEST_FIELDS: DestField[] = [
  "business_name",
  "contact_name",
  "phone",
  "email",
  "industry",
  "tags",
  "notes",
];

const FIELD_LABEL: Record<DestField, string> = {
  business_name: copy.contactos.fields.business,
  contact_name: copy.contactos.fields.contact,
  phone: copy.contactos.fields.phone,
  email: copy.contactos.fields.email,
  industry: copy.contactos.fields.industry,
  tags: copy.contactos.fields.tags,
  notes: copy.contactos.fields.notes,
};

// Autodetección por nombre de columna, comparando normalizado (sin
// acentos/mayúsculas) contra unas cuantas variantes conocidas por campo.
const FIELD_KEYWORDS: Record<DestField, string[]> = {
  business_name: ["negocio", "empresa", "business", "company"],
  contact_name: ["contacto", "nombre", "name"],
  phone: ["telefono", "phone", "celular", "movil"],
  email: ["correo", "email", "mail"],
  industry: ["giro", "industria", "industry", "sector", "rubro"],
  tags: ["etiqueta", "tag", "categoria"],
  notes: ["nota", "note", "comentario", "observacion"],
};

function autoDetectColumn(csvColumns: string[], field: DestField): string {
  const normalized = csvColumns.map((column) => ({ original: column, normalized: normalizeText(column) }));
  for (const keyword of FIELD_KEYWORDS[field]) {
    const match = normalized.find((column) => column.normalized.includes(keyword));
    if (match) return match.original;
  }
  return "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function rowToInput(row: Record<string, string>, mapping: Record<DestField, string>): ContactInput | null {
  const businessName = (mapping.business_name ? row[mapping.business_name] : "")?.trim();
  if (!businessName) return null;

  const email = (mapping.email ? row[mapping.email] : "")?.trim() ?? "";
  if (email && !isValidEmail(email)) return null;

  const tagsRaw = (mapping.tags ? row[mapping.tags] : "")?.trim() ?? "";

  return {
    business_name: businessName,
    contact_name: (mapping.contact_name ? row[mapping.contact_name] : "")?.trim() || null,
    phone: (mapping.phone ? row[mapping.phone] : "")?.trim() || null,
    email: email || null,
    industry: (mapping.industry ? row[mapping.industry] : "")?.trim() || null,
    // "prospecto|" es un prefijo del origen de los leads (identifica el
    // lote/alcaldía en el CSV), no dato del negocio — se quita aquí para
    // que la etiqueta útil sea solo "miguelhidalgo", no
    // "prospecto|miguelhidalgo". Sin este strip, cada lote nuevo
    // reintroduce el prefijo que 12-limpia-prefijo-etiquetas.sql ya limpió
    // de los 187 existentes.
    tags: tagsRaw
      ? tagsRaw
          .split(",")
          .map((tag) => tag.trim().replace(/^prospecto\|/, ""))
          .filter(Boolean)
      : [],
    notes: (mapping.notes ? row[mapping.notes] : "")?.trim() || null,
  };
}

function rowError(row: Record<string, string>, mapping: Record<DestField, string>): string | null {
  const businessName = (mapping.business_name ? row[mapping.business_name] : "")?.trim();
  if (!businessName) return copy.contactos.form.errors.businessRequired;

  const email = (mapping.email ? row[mapping.email] : "")?.trim() ?? "";
  if (email && !isValidEmail(email)) return copy.contactos.form.errors.emailInvalid;

  return null;
}

type ImportError = { rowNumber: number; original: Record<string, string>; message: string };

const SELECT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary";

const BATCH_SIZE = 500;

export function ImportDialog({ trigger, isAdmin = false }: { trigger: ReactNode; isAdmin?: boolean }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importContacts = useImportContacts();

  // useProfile() siempre resuelve "yo" — es el default y también el único
  // owner posible para quien no es admin. useTeamProfiles() solo alimenta
  // el selector, y solo se pinta si isAdmin (ya verificado en servidor):
  // una vendedora nunca ve este campo, ni aunque la llamada corra igual.
  const { data: profile } = useProfile();
  const { data: teamData } = useTeamProfiles();

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<DestField, string>>({
    business_name: "",
    contact_name: "",
    phone: "",
    email: "",
    industry: "",
    tags: "",
    notes: "",
  });
  const [ownerId, setOwnerId] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: ImportError[] } | null>(null);

  const resetState = () => {
    setStep(0);
    setFileName(null);
    setParsedRows([]);
    setCsvColumns([]);
    setMapping({
      business_name: "",
      contact_name: "",
      phone: "",
      email: "",
      industry: "",
      tags: "",
      notes: "",
    });
    setOwnerId("");
    setIsImporting(false);
    setResult(null);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState();
  };

  const parseFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      worker: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        setFileName(file.name);
        setParsedRows(results.data);
        setCsvColumns(fields);
        const detected = {} as Record<DestField, string>;
        for (const field of DEST_FIELDS) detected[field] = autoDetectColumn(fields, field);
        setMapping(detected);
      },
      error: () => {
        toast.error(copy.contactos.import.step1.parseError);
      },
    });
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  const previewRows = useMemo(() => parsedRows.slice(0, 5), [parsedRows]);

  const runImport = async () => {
    const effectiveOwnerId = ownerId || profile?.id;
    if (!effectiveOwnerId) {
      toast.error(copy.common.genericErrorDescription);
      return;
    }

    setIsImporting(true);

    try {
      const prepared: { rowNumber: number; original: Record<string, string>; input: ContactInput }[] = [];
      const errors: ImportError[] = [];

      parsedRows.forEach((row, index) => {
        const rowNumber = index + 2; // fila 1 es el encabezado del CSV
        const message = rowError(row, mapping);
        if (message) {
          errors.push({ rowNumber, original: row, message });
          return;
        }
        const input = rowToInput(row, mapping);
        if (input) prepared.push({ rowNumber, original: row, input });
      });

      let importedCount = 0;

      for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
        const chunk = prepared.slice(i, i + BATCH_SIZE);

        try {
          const count = await importContacts.mutateAsync({
            contacts: chunk.map((item) => item.input),
            owner: effectiveOwnerId,
            reason: copy.contactos.import.assignmentReason,
          });
          importedCount += count;
        } catch (error) {
          const message = error instanceof Error ? error.message : copy.common.genericErrorDescription;
          for (const item of chunk) {
            errors.push({ rowNumber: item.rowNumber, original: item.original, message });
          }
        }
      }

      setResult({ imported: importedCount, errors });
      if (importedCount > 0) {
        queryClient.invalidateQueries({ queryKey: contactsKeys.list() });
      }
    } catch {
      toast.error(copy.common.genericErrorDescription);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrors = () => {
    if (!result || result.errors.length === 0) return;
    const csv = Papa.unparse(
      result.errors.map((item) => ({ ...item.original, Error: item.message })),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "contactos-errores.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const canGoToMapping = parsedRows.length > 0;
  const canGoToReview = mapping.business_name !== "";

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-carbon/40 data-[state=open]:animate-overlay-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-6 shadow-[var(--shadow-raised)]">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text-primary">
              {copy.contactos.import.dialogTitle}
            </Dialog.Title>
            <Dialog.Close
              aria-label={copy.contactos.import.cancel}
              className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            </Dialog.Close>
          </div>

          <Stepper
            steps={[
              copy.contactos.import.steps.file,
              copy.contactos.import.steps.mapping,
              copy.contactos.import.steps.review,
            ]}
            current={step}
            onStepClick={setStep}
          />

          <div className="mt-6">
            {step === 0 ? (
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-border-subtle px-6 py-10 text-center"
              >
                <CloudUpload aria-hidden="true" className="h-8 w-8 text-text-muted" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {copy.contactos.import.step1.dropzoneTitle}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {copy.contactos.import.step1.dropzoneDescription}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  {copy.contactos.import.step1.chooseFile}
                </button>
                {fileName ? (
                  <p className="flex items-center gap-1.5 text-sm text-text-primary">
                    <FileText aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                    {copy.contactos.import.step1.selectedFile(fileName, parsedRows.length)}
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === 1 ? (
              <div className="flex flex-col gap-5">
                <div>
                  <p className="text-sm font-medium text-text-primary">{copy.contactos.import.step2.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {copy.contactos.import.step2.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DEST_FIELDS.map((field) => (
                    <label key={field} className="flex flex-col gap-1.5 text-sm text-text-primary">
                      {FIELD_LABEL[field]}
                      {field === "business_name" ? " *" : ""}
                      <select
                        value={mapping[field]}
                        onChange={(event) =>
                          setMapping((prev) => ({ ...prev, [field]: event.target.value }))
                        }
                        className={SELECT_CLASSES}
                      >
                        <option value="">{copy.contactos.import.step2.notMapped}</option>
                        {csvColumns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-text-muted">
                    {copy.contactos.import.step2.previewTitle}
                  </p>
                  <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-bg-sunken">
                        <tr>
                          {DEST_FIELDS.map((field) => (
                            <th
                              key={field}
                              className="px-3 py-2 text-left text-xs font-medium uppercase tracking-[0.06em] text-text-muted"
                            >
                              {FIELD_LABEL[field]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, index) => (
                          <tr key={index} className="border-t border-border-subtle">
                            {DEST_FIELDS.map((field) => (
                              <td key={field} className="px-3 py-2 text-text-primary">
                                {mapping[field] ? row[mapping[field]] : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex flex-col items-center gap-4 text-center">
                {!result ? (
                  <>
                    <p className="text-sm font-medium text-text-primary">
                      {copy.contactos.import.step3.readyTitle}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {copy.contactos.import.step3.readyDescription(parsedRows.length)}
                    </p>
                    {isAdmin ? (
                      <label className="flex w-full max-w-xs flex-col gap-1.5 text-left text-sm text-text-primary">
                        {copy.contactos.import.assignTo.label}
                        <select
                          value={ownerId || profile?.id || ""}
                          onChange={(event) => setOwnerId(event.target.value)}
                          className={SELECT_CLASSES}
                        >
                          {(teamData ?? []).map((member) => (
                            <option key={member.id} value={member.id}>
                              {member.full_name}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-text-muted">{copy.contactos.import.assignTo.hint}</span>
                      </label>
                    ) : null}
                    <button
                      type="button"
                      onClick={runImport}
                      disabled={isImporting}
                      aria-busy={isImporting}
                      className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-text-on-coral disabled:opacity-60"
                    >
                      <Upload aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                      {isImporting ? copy.contactos.import.step3.importing : copy.contactos.import.step3.startImport}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-text-primary">
                      {copy.contactos.import.step3.summary(result.imported, result.errors.length)}
                    </p>
                    {result.errors.length > 0 ? (
                      <button
                        type="button"
                        onClick={downloadErrors}
                        className="flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                      >
                        <Download aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
                        {copy.contactos.import.step3.downloadErrors}
                      </button>
                    ) : null}
                    <Dialog.Close className="rounded-[var(--radius-control)] bg-accent px-4 py-2 text-sm font-medium text-text-on-coral">
                      {copy.contactos.import.step3.done}
                    </Dialog.Close>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {step < 2 || (step === 2 && !result) ? (
            <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={step === 0}
                className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copy.contactos.import.back}
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  onClick={() => setStep((current) => current + 1)}
                  disabled={step === 0 ? !canGoToMapping : !canGoToReview}
                  className="rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.contactos.import.next}
                </button>
              ) : null}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
