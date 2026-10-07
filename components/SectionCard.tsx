import type { ReactNode } from "react";

export function SectionCard({
  id,
  step,
  title,
  subtitle,
  children,
  emphasis = false,
}: {
  id?: string;
  step: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-6 rounded-3xl border bg-[#fffdf9] p-4 shadow-[0_12px_40px_rgba(36,32,24,0.05)] sm:p-6 ${
        emphasis ? "border-[#0f6e6b]/30" : "border-[#e6ddd2]"
      }`}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1c2430] text-xs font-bold text-white">
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight text-[#1c2430] sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-[#5e6874]">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
