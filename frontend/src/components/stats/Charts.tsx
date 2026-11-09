import { useState, type ReactNode } from "react";
import { SubjectSwatch } from "@/components/shared/SubjectSwatch";
import { cn } from "@/lib/utils";

export interface BarDatum {
  key: string;
  /** Short axis label; shown only where `showLabel` allows. */
  label: string;
  /** Full description for the tooltip and screen readers. */
  title: string;
  value: number;
  valueLabel: string;
  highlight?: boolean;
}

/**
 * A single-series vertical bar chart: thin bars with rounded tops anchored to a baseline,
 * a 2px gap between bars, a hover tooltip per bar, and every bar described for screen
 * readers. One hue (the accent); the highlighted bar (e.g. today) is full strength.
 */
// Bars share the chart's width, but one bar never gets more than this: with only a few bars,
// they keep a sensible width instead of filling the page.
const MAX_SLOT_PX = 80;

export function BarChart({
  data,
  height = 112,
  labelEvery = 1,
  emptyLabel = "Nothing recorded yet.",
  className,
}: {
  data: BarDatum[];
  height?: number;
  labelEvery?: number;
  emptyLabel?: string;
  className?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure className={cn("relative", className)}>
      <div className="mb-1 h-5 text-meta text-fg-muted" aria-hidden>
        {active ? (
          <span>
            <span className="text-fg">{active.valueLabel}</span> · {active.title}
          </span>
        ) : max === 0 ? (
          <span className="text-fg-faint">{emptyLabel}</span>
        ) : null}
      </div>
      <div
        className="flex w-full items-end gap-[2px] border-b border-rule-strong"
        style={{ height }}
        role="list"
        onPointerLeave={() => setHover(null)}
      >
        {data.map((d, i) => {
          const h = max > 0 ? (d.value / max) * (height - 4) : 0;
          return (
            <div
              key={d.key}
              role="listitem"
              aria-label={`${d.title}: ${d.valueLabel}`}
              tabIndex={0}
              onPointerEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="group flex h-full min-w-0 flex-1 cursor-default items-end outline-none"
              style={{ maxWidth: MAX_SLOT_PX }}
            >
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-opacity",
                  d.highlight ? "bg-accent" : "bg-accent/55",
                  hover !== null && hover !== i && "opacity-45",
                  "group-focus-visible:outline group-focus-visible:outline-2 group-focus-visible:outline-accent"
                )}
                style={{ height: d.value > 0 ? Math.max(2, h) : 0 }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex w-full gap-[2px]" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center text-[0.6875rem] text-fg-faint tabular" style={{ maxWidth: MAX_SLOT_PX }}>
            {i % labelEvery === 0 ? d.label : ""}
          </span>
        ))}
      </div>
    </figure>
  );
}

export interface RankDatum {
  key: string;
  label: ReactNode;
  value: number;
  valueLabel: string;
  color?: string | null;
  href?: string;
}

/** Ranked horizontal bars with the label and value as text - for "time by subject" etc. */
export function RankBars({ data, emptyLabel = "Nothing recorded yet." }: { data: RankDatum[]; emptyLabel?: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  if (data.length === 0 || max === 0) return <p className="py-3 text-sm text-fg-faint">{emptyLabel}</p>;
  return (
    <ul className="space-y-3 pt-3">
      {data.map((d) => (
        <li key={d.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[0.8125rem]">
            <span className="flex min-w-0 items-center gap-2 text-fg">
              {d.color !== undefined && <SubjectSwatch color={d.color} />}
              <span className="truncate">{d.label}</span>
            </span>
            <span className="shrink-0 text-fg-muted tabular">{d.valueLabel}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-rule/70">
            <div className="h-full rounded-full bg-accent/70" style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** A labelled number in a row of figures, separated by rules rather than boxed as cards. */
export function Figure({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-meta text-fg-faint">{label}</p>
      <p className="mt-0.5 text-xl font-semibold leading-tight text-fg tabular">{value}</p>
      {detail && <p className="mt-0.5 text-meta text-fg-muted">{detail}</p>}
    </div>
  );
}

export function FigureRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-6 gap-y-5 border-y border-rule py-5 @2xl:grid-cols-4", className)}>{children}</div>
  );
}
