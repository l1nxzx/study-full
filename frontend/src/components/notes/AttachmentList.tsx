import { FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { type ChangeEvent, useRef, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useDeleteAttachment, useUploadAttachment } from "@/hooks/useNotes";
import type { Attachment } from "@/types";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadAttachment.isPending}>
          <Upload /> {uploadAttachment.isPending ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet. Upload the original photo or PDF.</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => {
            const isImage = attachment.fileType.startsWith("image/");
            return (
              <li
                key={attachment.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-sm hover:underline"
                >
                  {isImage ? (
                    <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{attachment.fileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(attachment.fileSize)}</span>
                </a>
                <button
                  onClick={() => setPendingDeleteId(attachment.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => !open && setPendingDeleteId(null)}
        title="Delete attachment?"
        description="This file will be permanently removed."
        confirmLabel="Delete"
        isLoading={deleteAttachment.isPending}
        onConfirm={async () => {
          if (!pendingDeleteId) return;
          await deleteAttachment.mutateAsync({ noteId, attachmentId: pendingDeleteId });
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
