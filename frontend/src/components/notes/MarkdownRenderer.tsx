import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { AiAddSpan, AiAlterSpan } from "@/components/notes/AiMarkupSpans";
import { Callout } from "@/components/notes/Callout";
import { CustomHighlight } from "@/components/notes/CustomHighlight";
import {
  findAdditions,
  findAlterations,
  findHighlights,
  prepareContentForRendering,
  type AlterationAction,
} from "@/lib/aiMarkup";
import { PROSE_CLASSES } from "@/lib/proseClasses";
import { remarkAiMarkup } from "@/lib/remarkAiMarkup";
import { remarkCallouts } from "@/lib/remarkCallouts";
import { remarkHighlightMark } from "@/lib/remarkHighlightMark";
import { remarkNoTest } from "@/lib/remarkNoTest";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** "note" for reading a note; "compact" for assistant answers and side-by-side previews. */
  variant?: "note" | "compact";
  emptyLabel?: string;
  onResolveAlteration?: (index: number, action: AlterationAction, manualText?: string) => void;
  onRemoveAddition?: (index: number) => void;
}

// Standard Markdown (headings, paragraphs, lists, tables, code, math via KaTeX) is
// rendered as-is by the design system's typography (prose) styles below - no element is
// ever auto-colored. Study's own syntax - ==highlight==, <highlight color="...">,
// [!NOTE]-style callouts, and the note-review <aialter>/<aiadd> markers - is the only
// thing that introduces color, and only where the author explicitly asked for it. Text inside
// <notest> tags (kept out of quizzes and tests) gets a faint dotted underline.
export function MarkdownRenderer({
  content,
  className,
  variant = "note",
  emptyLabel = "This note is empty.",
  onResolveAlteration,
  onRemoveAddition,
}: MarkdownRendererProps) {
  if (!content.trim()) {
    return <p className="text-sm text-fg-faint">{emptyLabel}</p>;
  }

  const alterations = findAlterations(content);
  const additions = findAdditions(content);
  const highlights = findHighlights(content);
  const renderableContent = prepareContentForRendering(content);

  return (
    <div className={cn(PROSE_CLASSES, variant === "compact" && "study-prose-compact", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkCallouts, remarkNoTest, remarkAiMarkup, remarkHighlightMark]}
        rehypePlugins={[rehypeKatex]}
        components={
          {
            mark: (props: any) => <CustomHighlight color="blue">{props.children}</CustomHighlight>,
            aiCustomHighlight: (props: any) => {
              const item = highlights[props.index ?? props.node?.properties?.index];
              if (!item) return null;
              return <CustomHighlight color={item.color}>{item.text}</CustomHighlight>;
            },
            aiCallout: (props: any) => {
              const variant = props.variant ?? props.node?.properties?.variant;
              return <Callout variant={variant}>{props.children}</Callout>;
            },
            aiAlter: (props: any) => {
              const item = alterations[props.index ?? props.node?.properties?.index];
              if (!item) return null;
              return (
                <AiAlterSpan
                  original={item.original}
                  corrected={item.corrected}
                  onResolve={
                    onResolveAlteration
                      ? (action, manualText) => onResolveAlteration(item.index, action, manualText)
                      : undefined
                  }
                />
              );
            },
            aiAdd: (props: any) => {
              const item = additions[props.index ?? props.node?.properties?.index];
              if (!item) return null;
              return (
                <AiAddSpan
                  text={item.text}
                  onRemove={onRemoveAddition ? () => onRemoveAddition(item.index) : undefined}
                />
              );
            },
          } as any
        }
      >
        {renderableContent}
      </ReactMarkdown>
    </div>
  );
}
