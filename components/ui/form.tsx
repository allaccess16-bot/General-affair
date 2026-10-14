import { cn } from "@/lib/utils";

export function Field({ label, hint, children, className, required }: { label: string; hint?: React.ReactNode; children: React.ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block text-[13px] font-bold text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

export function FormSection({ step, title, children, tone = "plain" }: { step?: string; title: string; children: React.ReactNode; tone?: "plain" | "brand" }) {
  return (
    <section className={cn("rounded-3xl border p-4 sm:p-5", tone === "brand" ? "border-brand-100 bg-brand-50/60" : "border-line bg-canvas/60")}>
      {step && <p className="text-[11px] font-extrabold tracking-widest text-brand-600">{step}</p>}
      <h3 className="mb-4 mt-0.5 font-bold">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function Notice({ tone = "info", children, className }: { tone?: "info" | "ok" | "warn" | "error"; children: React.ReactNode; className?: string }) {
  const cls = {
    info: "bg-canvas text-ink-2",
    ok: "bg-brand-50 text-brand-700",
    warn: "bg-amber-50 text-amber-800",
    error: "bg-rose-50 text-rose-700",
  }[tone];
  return <div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed", cls, className)}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-3xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-3">{children}</div>;
}

export function Tabs<T extends string>({ value, onChange, items, className }: { value: T; onChange: (v: T) => void; items: { value: T; label: string; badge?: number; locked?: boolean }[]; className?: string }) {
  return (
    <div className={cn("flex gap-1 overflow-x-auto rounded-full border border-line bg-white p-1 shadow-card scrollbar-none", className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition",
            value === it.value ? "bg-ink text-white" : "text-ink-2 hover:bg-canvas",
          )}
        >
          {it.label}
          {it.locked && <span aria-label="관리자 전용">🔒</span>}
          {it.badge ? <span className={cn("rounded-full px-1.5 text-[11px]", value === it.value ? "bg-white/20" : "bg-rose-500 text-white")}>{it.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Pill({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-none", className)} style={style}>
      {children}
    </span>
  );
}
