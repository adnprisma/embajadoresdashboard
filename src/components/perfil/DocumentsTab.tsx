"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { FileText, MoreHorizontal, Trash2, TriangleAlert, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/EmptyState";
import { Illustration } from "@/components/common/Illustration";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import {
  getDocumentSignedUrl,
  useDeleteDocument,
  useProfileDocuments,
  useUploadDocument,
  type DocumentRow,
} from "@/lib/queries/profile";

const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentRowActions({ document }: { document: DocumentRow }) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteDocument = useDeleteDocument();

  const handleOpen = async () => {
    try {
      const url = await getDocumentSignedUrl(document.path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error(copy.perfil.documents.uploadError);
    }
  };

  const handleDelete = () => {
    deleteDocument.mutate(document.path);
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={copy.perfil.documents.moreActionsLabel}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] text-text-muted transition-colors hover:bg-bg-sunken"
          >
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 w-48 rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface p-1 shadow-[var(--shadow-raised)]"
          >
            <DropdownMenu.Item
              onSelect={handleOpen}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-text-primary outline-none data-[highlighted]:bg-bg-sunken"
            >
              <FileText aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {document.name}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => setDeleteDialogOpen(true)}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-state-negative outline-none data-[highlighted]:bg-state-negative-soft"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.perfil.documents.deleteLabel}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

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
                  {copy.perfil.documents.deleteConfirmTitle(document.name)}
                </AlertDialog.Title>
                <AlertDialog.Description className="mt-2 text-sm text-text-secondary">
                  {copy.perfil.documents.deleteConfirmDescription}
                </AlertDialog.Description>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken"
                >
                  {copy.perfil.documents.deleteCancel}
                </button>
              </AlertDialog.Cancel>
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 rounded-[var(--radius-control)] bg-state-negative px-3 py-2 text-sm font-medium text-white transition-colors"
              >
                {copy.perfil.documents.deleteConfirm}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

export function DocumentsTab() {
  const { data, isLoading } = useProfileDocuments();
  const documents = data ?? [];
  const uploadDocument = useUploadDocument();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > DOCUMENT_MAX_BYTES) {
      toast.error(copy.perfil.documents.uploadErrorSize);
      return;
    }

    uploadDocument.mutate(file);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className="text-sm text-text-secondary">{copy.perfil.documents.intro}</p>

      <div>
        <button
          type="button"
          disabled={uploadDocument.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:opacity-60"
        >
          <Upload aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
          {uploadDocument.isPending ? copy.common.loading : copy.perfil.documents.uploadLabel}
        </button>
        <p className="mt-1 text-xs text-text-muted">{copy.perfil.documents.uploadHint}</p>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          illustration={<Illustration name="crear" size="sm" />}
          title={copy.perfil.documents.emptyTitle}
          description={copy.perfil.documents.emptyDescription}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle rounded-[var(--radius-card)] border border-border-subtle bg-bg-surface">
          {documents.map((document) => (
            <li key={document.path} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden="true" className="h-4 w-4 shrink-0 text-text-muted" strokeWidth={1.5} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-text-primary">{document.name}</p>
                  <p className="text-xs text-text-muted">
                    {formatSize(document.size)}
                    {document.createdAt ? ` · ${format(parseISO(document.createdAt), "d MMM yyyy", { locale: es })}` : ""}
                  </p>
                </div>
              </div>
              <DocumentRowActions document={document} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
