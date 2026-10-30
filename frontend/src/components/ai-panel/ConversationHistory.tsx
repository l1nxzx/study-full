import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { ArrowLeft, Trash2 } from "lucide-react";
import * as conversationsApi from "@/api/conversations";
import { getErrorMessage } from "@/api/client";
import { InlineError } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { useAiPanel } from "@/hooks/useAiPanel";
import { cn } from "@/lib/utils";

// Earlier conversations in the same place: about this note, or the general chat.
export function ConversationHistory({ onClose }: { onClose: () => void }) {
  const { activeNote, conversationId, loadConversation, clearMessages } = useAiPanel();
  const queryClient = useQueryClient();
  const filters = activeNote ? { noteId: activeNote.id } : { scope: "general" as const };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => conversationsApi.listConversations(filters),
  });

  const open = useMutation({
    mutationFn: conversationsApi.getConversation,
    onSuccess: (conversation) => {
      loadConversation(conversation);
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: conversationsApi.deleteConversation,
    onSuccess: (_r, id) => {
      if (id === conversationId) clearMessages();
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  return (
    <div className="flex-1 overflow-y-auto overscroll-y-contain px-5 py-4">
      <button
        type="button"
        onClick={onClose}
        className="-ml-1.5 mb-3 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-[0.8125rem] text-fg-muted hover:bg-tint hover:text-fg"
      >
        <ArrowLeft className="size-3.5" /> Back to the conversation
      </button>
      <p className="group-label border-b border-rule pb-2">{activeNote ? "Earlier conversations about this note" : "Earlier conversations"}</p>

      {isLoading && (
        <div className="space-y-4 py-4">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      )}
      {isError && <InlineError className="py-3">Couldn't load your conversations.</InlineError>}
      {open.isError && <InlineError className="py-3">{getErrorMessage(open.error, "Couldn't open that conversation.")}</InlineError>}
      {data?.length === 0 && <p className="py-4 text-sm text-fg-faint">Nothing yet. Conversations are saved here automatically.</p>}

      <ul className="divide-y divide-rule">
        {data?.map((c) => (
          <li key={c.id} className="group flex items-start gap-2">
            <button
              type="button"
              onClick={() => open.mutate(c.id)}
              disabled={open.isPending}
              className="min-w-0 flex-1 py-2.5 text-left"
            >
              <span className={cn("block truncate text-sm text-fg group-hover:text-accent", c.id === conversationId && "font-medium")}>
                {c.title}
              </span>
              <span className="mt-0.5 block text-meta text-fg-faint">
                {c.questionCount} {c.questionCount === 1 ? "question" : "questions"} · {formatDistanceToNow(parseISO(c.updatedAt), { addSuffix: true })}
                {c.id === conversationId && " · open now"}
              </span>
            </button>
            <button
              type="button"
              onClick={() => remove.mutate(c.id)}
              aria-label={`Delete "${c.title}"`}
              title="Delete conversation"
              className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-md text-fg-faint transition-colors hover:bg-bad/10 hover:text-bad lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
