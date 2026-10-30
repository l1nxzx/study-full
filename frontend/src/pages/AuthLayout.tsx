import type { ReactNode } from "react";

// Sign-in and sign-up share one quiet frame: the name, one sentence, the form.
export function AuthLayout({ title, description, children, footer }: { title: string; description: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-5 py-10 sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-[22rem]">
        <p className="mb-14 text-[0.9375rem] font-semibold tracking-[-0.01em] text-fg sm:mb-10">Study</p>
        <h1 className="page-title">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{description}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-8 border-t border-rule pt-5 text-[0.8125rem] text-fg-muted">{footer}</p>
      </div>
    </div>
  );
}
