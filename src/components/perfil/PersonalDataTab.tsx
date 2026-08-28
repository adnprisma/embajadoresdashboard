"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Skeleton } from "@/components/common/Skeleton";
import { copy } from "@/config/copy";
import {
  useAvatarUrl,
  useProfile,
  useRemoveAvatar,
  useUpdatePersonalData,
  useUploadAvatar,
} from "@/lib/queries/profile";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_OUTPUT_SIZE = 512;

// Recorte cuadrado al centro + reescalado, vía canvas — sin librería nueva.
// No es un cropper interactivo (el usuario no elige qué parte recortar):
// el centro de la imagen es una decisión razonable para una foto de perfil,
// y evita meter una dependencia de arrastre/zoom para esto.
async function cropToSquareBlob(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("No se pudo leer la imagen."));
      el.src = imageUrl;
    });

    const side = Math.min(image.width, image.height);
    const sx = (image.width - side) / 2;
    const sy = (image.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_OUTPUT_SIZE;
    canvas.height = AVATAR_OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, 0.9));
    if (!blob) throw new Error("No se pudo procesar la imagen.");
    return blob;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

const formSchema = z.object({
  full_name: z.string().min(1, copy.perfil.personal.fullNameRequired),
});

type FormValues = z.infer<typeof formSchema>;

const INPUT_CLASSES =
  "w-full rounded-[var(--radius-control)] border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted";

function AvatarEditor({ avatarUrl, avatarPath, initial }: { avatarUrl: string | null; avatarPath: string | null; initial: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      toast.error(copy.perfil.personal.avatarErrorType);
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error(copy.perfil.personal.avatarErrorSize);
      return;
    }

    const blob = await cropToSquareBlob(file);
    uploadAvatar.mutate(blob);
  };

  const busy = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <div className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-lg font-semibold text-text-primary"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada de Storage, no un asset estático de next/image.
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </span>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-sunken disabled:opacity-60"
          >
            <Camera aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            {copy.perfil.personal.avatarChange}
          </button>
          {avatarPath ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => removeAvatar.mutate(avatarPath)}
              className="inline-flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-1.5 text-sm font-medium text-state-negative transition-colors hover:bg-state-negative-soft disabled:opacity-60"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
              {copy.perfil.personal.avatarRemove}
            </button>
          ) : null}
        </div>
        <p className="text-xs text-text-muted">{copy.perfil.personal.avatarHint}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_ALLOWED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

export function PersonalDataTab() {
  const router = useRouter();
  const { data: profile, isLoading } = useProfile();
  const avatarQuery = useAvatarUrl(profile?.avatar_url ?? null);
  const updatePersonalData = useUpdatePersonalData();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { full_name: "" },
  });

  useEffect(() => {
    if (profile) reset({ full_name: profile.full_name });
  }, [profile, reset]);

  const onSubmit = async (values: FormValues) => {
    try {
      await updatePersonalData.mutateAsync(values);
      router.refresh();
    } catch {
      // El toast.error ya lo dispara la mutación (onError).
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full max-w-sm" />
        <Skeleton className="h-10 w-full max-w-sm" />
      </div>
    );
  }

  const initial = (profile.full_name || profile.email || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-medium text-text-primary">{copy.perfil.personal.avatarLabel}</p>
        <AvatarEditor avatarUrl={avatarQuery.data ?? null} avatarPath={profile.avatar_url} initial={initial} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="full_name" className="text-sm font-medium text-text-primary">
            {copy.perfil.personal.fullNameLabel}
          </label>
          <input
            id="full_name"
            placeholder={copy.perfil.personal.fullNamePlaceholder}
            aria-invalid={errors.full_name ? "true" : "false"}
            aria-describedby={errors.full_name ? "full_name-error" : undefined}
            className={INPUT_CLASSES}
            {...register("full_name")}
          />
          {errors.full_name ? (
            <p id="full_name-error" className="text-sm text-state-negative">
              {errors.full_name.message}
            </p>
          ) : null}
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="flex items-center gap-2 rounded-[var(--radius-control)] bg-accent px-3 py-2 text-sm font-medium text-text-on-coral transition-colors disabled:opacity-60"
          >
            {isSubmitting ? copy.perfil.personal.submitLoading : copy.perfil.personal.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
