import type { ReactNode } from "react";

/** One settings group: what it is on the left, the controls on the right (stacked on phones). */
export function SettingsSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-x-12 gap-y-4 border-t border-rule py-8 @3xl:grid-cols-[14rem_minmax(0,1fr)]">
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="mt-1 text-[0.8125rem] leading-relaxed text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0 max-w-md">{children}</div>
    </section>
  );
}
