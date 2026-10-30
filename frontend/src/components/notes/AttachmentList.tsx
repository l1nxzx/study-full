import { FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Section } from "@/components/layout/PageHeader";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { InlineError } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { useDeleteAttachment, useUploadAttachment } from "@/hooks/useNotes";
import type { Attachment } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// The original photos or PDFs a note was transcribed from - kept next to it for reference.
export function AttachmentList({ noteId, attachments }: { noteId: string; attachments: Attachment[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await uploadAttachment.mutateAsync({ noteId, file });
    } catch (err) {
      setError(getErrorMessage(err, "Could not upload the file"));
    } finally {
      e.target.value = "";
    }
  }

  return (
    <Section
      title="Source files"
      description="The original photos or PDFs this note was made from."
      action={
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending} className="-mr-2.5">
          <Upload /> {uploadAttachment.isPending ? "Uploading..." : "Upload"}
        </Button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <InlineError className="pt-3">{error}</InlineError>

      {attachments.length === 0 ? (
        <p className="py-4 text-sm text-fg-faint">No files yet.</p>
      ) : (
        <ul className="divide-y divide-rule">
          {attachments.map((attachment) => {
            const isImage = attachment.fileType.startsWith("image/");
            const Icon = isImage ? ImageIcon : FileText;
            return (
              <li key={attachment.id} className="group flex items-center gap-3 py-2">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3 py-1 text-sm text-fg transition-colors hover:text-accent"
                >
                  <Icon className="size-4 shrink-0 text-fg-faint" strokeWidth={1.75} />
                  <span className="truncate">{attachment.fileName}</span>
                  <span className="shrink-0 text-meta text-fg-faint tabular">{formatFileSize(attachment.fileSize)}</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(attachment.id)}
                  aria-label={`Delete ${attachment.fileName}`}
                  title="Delete file"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-bad/10 hover:text-bad lg:opacity-0 lg:focus-visible:opacity-100 lg:group-hover:opacity-100"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete this file?"
        description="The file will be permanently removed. The note itself is not affected."
        confirmLabel="Delete file"
        isLoading={deleteAttachment.isPending}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          await deleteAttachment.mutateAsync({ noteId, attachmentId: pendingDeleteId });
          setPendingDeleteId(null);
        }}
      />
    </Section>
  );
}
